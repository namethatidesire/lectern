import { useRef, useEffect } from 'react'
import type { TranscriptSegment, Snapshot } from '@shared/types'

interface Props {
  segments: TranscriptSegment[]
  snapshots: Snapshot[]
  selectedSnapshotTMs: number | null
  audioRef?: React.RefObject<HTMLAudioElement>
}

export default function TranscriptPane({
  segments,
  snapshots,
  selectedSnapshotTMs,
  audioRef
}: Props): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments.length])

  const visible =
    selectedSnapshotTMs !== null
      ? (() => {
          const idx = snapshots.findIndex((s) => s.tMs === selectedSnapshotTMs)
          const nextTMs = snapshots[idx + 1]?.tMs ?? Infinity
          return segments.filter(
            (s) => s.startMs >= selectedSnapshotTMs && s.startMs < nextTMs
          )
        })()
      : segments

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-1">
      {visible.length === 0 && (
        <p className="text-gray-500 text-sm italic">No transcript yet.</p>
      )}
      {visible.map((seg) => (
        <button
          key={`${seg.lectureId}-${seg.startMs}`}
          onClick={() => {
            if (audioRef?.current) {
              audioRef.current.currentTime = seg.startMs / 1000
            }
          }}
          className="text-left text-sm text-gray-200 hover:text-white hover:bg-gray-800 rounded px-2 py-1 transition-colors"
        >
          <span className="text-gray-500 font-mono text-xs mr-2">
            {msToTimestamp(seg.startMs)}
          </span>
          {seg.text}
        </button>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function msToTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
