import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Mic, Settings, Trash2, FolderOpen } from 'lucide-react'
import type { Lecture } from '@shared/types'

export default function Library(): JSX.Element {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    const list = await window.api.listLectures()
    setLectures(list)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this lecture and all its files?')) return
    await window.api.deleteLecture(id)
    setLectures((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-lg">Lectern</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/record')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Mic className="w-4 h-4" />
            New Recording
          </button>
        </div>
      </div>

      {/* Lecture list */}
      <div className="flex-1 overflow-y-auto p-6">
        {lectures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
            <BookOpen className="w-12 h-12" />
            <p className="text-lg">No lectures yet.</p>
            <button
              onClick={() => navigate('/record')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm transition-colors"
            >
              Start your first recording
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lectures.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 group transition-colors cursor-pointer"
                onClick={() => navigate(`/lecture/${l.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{l.title}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(l.startedAt).toLocaleString()}
                    {l.durationMs && ` · ${formatDuration(l.durationMs)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api.openLectureFolder(l.id)
                    }}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(l.id)
                    }}
                    className="p-2 rounded-lg hover:bg-red-900/50 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const map: Record<string, { label: string; cls: string }> = {
    recording: { label: 'Recording', cls: 'bg-red-900/60 text-red-300' },
    transcribing: { label: 'Transcribing', cls: 'bg-yellow-900/60 text-yellow-300' },
    ready: { label: 'Ready', cls: 'bg-green-900/60 text-green-300' },
    failed: { label: 'Failed', cls: 'bg-gray-800 text-gray-500' }
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-800 text-gray-400' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  )
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
