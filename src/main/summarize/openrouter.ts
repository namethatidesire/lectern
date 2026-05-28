import { SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, buildSlidePrompt, buildSummaryPrompt } from './prompts'
import { getSegments, getSnapshots, insertNote } from '../store/lectures'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function generateWithOpenRouter(
  lectureId: string,
  apiKey: string,
  model: string
): Promise<void> {
  const segments = getSegments(lectureId)
  const snapshots = getSnapshots(lectureId)
  const now = Date.now()
  const modelId = `openrouter:${model}`
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

    const parsed = await chat(apiKey, model, SYSTEM_PROMPT, buildSlidePrompt(i, transcript))
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
    const summaryParsed = await chat(
      apiKey,
      model,
      SUMMARY_SYSTEM_PROMPT,
      buildSummaryPrompt(slideNotes)
    )
    insertNote({
      lectureId,
      snapshotTMs: null,
      kind: 'summary',
      body: summaryParsed?.summary ?? '',
      model: modelId,
      generatedAt: now
    })
  }
}

async function chat(
  apiKey: string,
  model: string,
  system: string,
  userMsg: string
): Promise<Record<string, string> | null> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/lectern-app',
      'X-Title': 'Lectern'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg }
      ]
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content ?? ''

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]) as Record<string, string>
  } catch {
    return null
  }
}
