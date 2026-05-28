import type { Snapshot, TranscriptSegment } from '@shared/types'
import SnapshotCard from './SnapshotCard'

interface Props {
  lectureId: string
  snapshots: Snapshot[]
  segments: TranscriptSegment[]
  durationMs: number | null
  selectedSnapshotTMs: number | null
  onSelectSnapshot: (tMs: number) => void
}

export default function Timeline({
  lectureId,
  snapshots,
  segments,
  selectedSnapshotTMs,
  onSelectSnapshot
}: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {/* Snapshot track */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {snapshots.length === 0 && (
          <p className="text-gray-600 text-sm italic">No snapshots yet.</p>
        )}
        {snapshots.map((snap) => (
          <SnapshotCard
            key={snap.tMs}
            lectureId={lectureId}
            tMs={snap.tMs}
            filename={snap.filename}
            isSelected={selectedSnapshotTMs === snap.tMs}
            onClick={() => onSelectSnapshot(snap.tMs)}
          />
        ))}
      </div>

      {/* Transcript chips track */}
      {segments.length > 0 && (
        <div className="flex flex-wrap gap-1 overflow-y-auto max-h-16">
          {segments.map((seg) => {
            const inSlide =
              selectedSnapshotTMs !== null
                ? (() => {
                    const idx = snapshots.findIndex((s) => s.tMs === selectedSnapshotTMs)
                    const nextTMs = snapshots[idx + 1]?.tMs ?? Infinity
                    return seg.startMs >= selectedSnapshotTMs && seg.startMs < nextTMs
                  })()
                : false

            return (
              <span
                key={`${seg.lectureId}-${seg.startMs}`}
                className={`text-xs rounded px-1.5 py-0.5 font-mono ${
                  inSlide
                    ? 'bg-indigo-900/60 text-indigo-200'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {msToMin(seg.startMs)}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function msToMin(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
