import { useEffect, useState } from 'react'

interface Props {
  lectureId: string
  tMs: number
  filename: string
  isSelected?: boolean
  onClick?: () => void
}

export default function SnapshotCard({
  lectureId,
  tMs,
  isSelected,
  onClick
}: Props): JSX.Element {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    window.api.getSnapshotImage(lectureId, tMs).then((data) => {
      if (data) setSrc(data)
    })
  }, [lectureId, tMs])

  const ts = msToTimestamp(tMs)

  return (
    <button
      onClick={onClick}
      className={`flex flex-col rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <div className="w-32 h-20 bg-gray-800 flex items-center justify-center">
        {src ? (
          <img src={src} alt={`Slide at ${ts}`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-600">Loading…</span>
        )}
      </div>
      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-900 font-mono">{ts}</span>
    </button>
  )
}

function msToTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
