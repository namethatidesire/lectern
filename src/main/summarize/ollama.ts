import {
  SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildSlidePrompt,
  buildSummaryPrompt
} from './prompts'
import { getSegments, getSnapshots, insertNote } from '../store/lectures'

export async function generateWithOllama(
  lectureId: string,
  endpoint: string,
  model: string
): Promise<void> {
  // Validate daemon is running
  try {
    const ping = await fetch(`${endpoint}/api/tags`)
    if (!ping.ok) throw new Error('not ok')
  } catch {
    throw new Error(
      `Ollama is not running at ${endpoint}. Start it with: ollama serve`
    )
  }

  const segments = getSegments(lectureId)
  const snapshots = getSnapshots(lectureId)
  const now = Date.now()
  const modelId = `ollama:${model}`
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

    const parsed = await ollamaChat(endpoint, model, SYSTEM_PROMPT, buildSlidePrompt(i, transcript))
    if (!parsed) continue

    insertNote({
      lectureId,
      snapshotTMs: snap.tMs,
      kind: 'bullets',
      body: parsed.bullets ?? JSON.stringify(parsed),
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

    slideNotes.push({ index: i, bullets: parsed.bullets ?? '' })
  }

  if (slideNotes.length > 0) {
    const summaryParsed = await ollamaChat(
      endpoint,
      model,
      SUMMARY_SYSTEM_PROMPT,
      buildSummaryPrompt(slideNotes)
    )
    insertNote({
      lectureId,
      snapshotTMs: null,
      kind: 'summary',
      body: summaryParsed?.summary ?? JSON.stringify(summaryParsed),
      model: modelId,
      generatedAt: now
    })
  }
}

async function ollamaChat(
  endpoint: string,
  model: string,
  system: string,
  userMsg: string
): Promise<Record<string, string> | null> {
  const res = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg }
      ]
    })
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = (await res.json()) as { message?: { content?: string } }
  const text = data.message?.content ?? ''
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]) as Record<string, string>
  } catch {
    return null
  }
}
