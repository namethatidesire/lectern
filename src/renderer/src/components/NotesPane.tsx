import type { Note } from '@shared/types'

interface Props {
  notes: Note[]
  selectedSnapshotTMs: number | null
  isGenerating: boolean
}

export default function NotesPane({
  notes,
  selectedSnapshotTMs,
  isGenerating
}: Props): JSX.Element {
  const overallSummary = notes.find((n) => n.snapshotTMs === null && n.kind === 'summary')
  const slideNotes =
    selectedSnapshotTMs !== null ? notes.filter((n) => n.snapshotTMs === selectedSnapshotTMs) : []
  const bullets = slideNotes.find((n) => n.kind === 'bullets')
  const keyterms = slideNotes.find((n) => n.kind === 'keyterms')

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {isGenerating && (
        <div className="flex items-center gap-2 text-indigo-400 text-sm">
          <span className="animate-spin">⟳</span> Generating notes…
        </div>
      )}

      {selectedSnapshotTMs !== null ? (
        <>
          {bullets ? (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Notes
              </h3>
              <div
                className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: mdToHtml(bullets.body) }}
              />
            </div>
          ) : (
            !isGenerating && (
              <p className="text-gray-500 text-sm italic">
                No notes for this slide. Click "Generate Notes" to create them.
              </p>
            )
          )}
          {keyterms && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Key Terms
              </h3>
              <p className="text-sm text-indigo-300">{keyterms.body}</p>
            </div>
          )}
        </>
      ) : overallSummary ? (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Lecture Summary
          </h3>
          <div
            className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: mdToHtml(overallSummary.body) }}
          />
        </div>
      ) : (
        !isGenerating && (
          <p className="text-gray-500 text-sm italic">
            Select a slide to see notes, or generate notes for the full lecture.
          </p>
        )
      )}
    </div>
  )
}

function mdToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n/g, '<br>')
}
