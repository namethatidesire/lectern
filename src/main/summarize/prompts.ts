export const SYSTEM_PROMPT = `You are a lecture note-taking assistant. Given a transcript excerpt from a lecture slide or section, produce concise, structured study notes.

Respond in JSON with:
{
  "bullets": "markdown bullet points of key concepts",
  "keyterms": "comma-separated list of key terms"
}

Be concise. Use plain language. Focus on concepts the student should remember.`

export const SUMMARY_SYSTEM_PROMPT = `You are a lecture summarizer. Given per-slide bullet notes from a lecture, produce an overall summary.

Respond in JSON with:
{
  "summary": "2-4 paragraph markdown summary of the full lecture"
}

Focus on the main themes, key takeaways, and how the slides connect.`

export function buildSlidePrompt(slideIndex: number, transcript: string): string {
  return `Slide ${slideIndex + 1} transcript:

${transcript}`
}

export function buildSummaryPrompt(slideNotes: { index: number; bullets: string }[]): string {
  return slideNotes
    .map((s) => `## Slide ${s.index + 1}\n${s.bullets}`)
    .join('\n\n')
}
