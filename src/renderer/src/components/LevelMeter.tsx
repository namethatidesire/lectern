interface Props {
  level: number // 0..1 RMS
}

export default function LevelMeter({ level }: Props): JSX.Element {
  const bars = 20
  const active = Math.round(level * bars * 6) // scale up since RMS is typically small

  return (
    <div className="flex items-end gap-px h-6">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm transition-all duration-75 ${
            i < active
              ? i < bars * 0.6
                ? 'bg-green-400'
                : i < bars * 0.85
                  ? 'bg-yellow-400'
                  : 'bg-red-500'
              : 'bg-gray-700'
          }`}
          style={{ height: `${50 + (i / bars) * 50}%` }}
        />
      ))}
    </div>
  )
}
