import Anthropic from '@anthropic-ai/sdk'
import {
  SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildSlidePrompt,
  buildSummaryPrompt
} from './prompts'
import { getSegments, getSnapshots, insertNote } from '../store/lectures'

export async function generateWithClaude(
  lectureId: string,
  apiKey: string
): Promise<void> {
  const client = new Anthropic({ apiKey })
  const segments = getSegments(lectureId)
  const snapshots = getSnapshots(lectureId)

  const now = Date.now()
  const modelId = 'claude-sonnet-4-6'
  const slideNotes: { index: number; bullets: string }[] = []

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]
    const nextTMs = snapshots[i + 1]?.tMs ?? Infinity
    const transcript = segments
      .filter((s) => s.startMs >= snap.tMs && s.startMs < nextTMs)
      .map((s) => s.text)
      .join(' ')
      .trim()

    if (!transcript) continue

    const response = await client.beta.promptCaching.messages.create({
      model: modelId,
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: buildSlidePrompt(i, transcript) }]
    })

    const text = response.content.find((c) => c.type === 'text')?.text ?? ''
    const parsed = safeParseJson(text)
    if (!parsed) continue

    insertNote({
      lectureId,
      snapshotTMs: snap.tMs,
      kind: 'bullets',
      body: parsed.bullets ?? text,
      model: modelId,
      generatedAt: now
    })

    if (parsed.keyterms) {
      insertNote({
        lectureId,
        snapshotTMs: snap.tMs,
        kind: 'keyterms',
        body: parsed.keyterms,
        model: modelId,
        generatedAt: now
      })
    }

    slideNotes.push({ index: i, bullets: parsed.bullets ?? text })
  }

  if (slideNotes.length > 0) {
    const summaryResponse = await client.beta.promptCaching.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SUMMARY_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: buildSummaryPrompt(slideNotes) }]
    })

    const summaryText = summaryResponse.content.find((c) => c.type === 'text')?.text ?? ''
    const summaryParsed = safeParseJson(summaryText)
    insertNote({
      lectureId,
      snapshotTMs: null,
      kind: 'summary',
      body: summaryParsed?.summary ?? summaryText,
      model: modelId,
      generatedAt: now
    })
  }
}

function safeParseJson(text: string): Record<string, string> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]) as Record<string, string>
  } catch {
    return null
  }
}
