import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Mic, Settings, Trash2, FolderOpen, Search, X } from 'lucide-react'
import type { Lecture, SearchResult } from '@shared/types'

export default function Library(): JSX.Element {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await window.api.search(query)
      setSearchResults(results)
      setSearching(false)
    }, 250)
    return (): void => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query])

  async function load(): Promise<void> {
    setLectures(await window.api.listLectures())
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this lecture and all its files?')) return
    await window.api.deleteLecture(id)
    setLectures((prev) => prev.filter((l) => l.id !== id))
    if (searchResults) setSearchResults((prev) => prev?.filter((r) => r.lectureId !== id) ?? null)
  }

  const isSearching = query.trim().length > 0

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

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcripts and titles..."
            className="w-full pl-9 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isSearching ? (
          searching ? (
            <p className="text-gray-500 text-sm">Searching...</p>
          ) : searchResults && searchResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No results for "{query}"</p>
          ) : (
            <div className="space-y-2">
              {searchResults?.map((r) => (
                <SearchResultRow
                  key={r.lectureId}
                  result={r}
                  onOpen={() => navigate(`/lecture/${r.lectureId}`)}
                  onDelete={() => handleDelete(r.lectureId)}
                  onOpenFolder={() => window.api.openLectureFolder(r.lectureId)}
                />
              ))}
            </div>
          )
        ) : lectures.length === 0 ? (
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
              <LectureRow
                key={l.id}
                lecture={l}
                onOpen={() => navigate(`/lecture/${l.id}`)}
                onDelete={() => handleDelete(l.id)}
                onOpenFolder={() => window.api.openLectureFolder(l.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LectureRow({
  lecture: l,
  onOpen,
  onDelete,
  onOpenFolder
}: {
  lecture: Lecture
  onOpen: () => void
  onDelete: () => void
  onOpenFolder: () => void
}): JSX.Element {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 group transition-colors cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{l.title}</p>
          <StatusBadge status={l.status} />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(l.startedAt).toLocaleString()}
          {l.durationMs != null && ` · ${formatDuration(l.durationMs)}`}
        </p>
      </div>
      <RowActions onOpenFolder={onOpenFolder} onDelete={onDelete} />
    </div>
  )
}

function SearchResultRow({
  result: r,
  onOpen,
  onDelete,
  onOpenFolder
}: {
  result: SearchResult
  onOpen: () => void
  onDelete: () => void
  onOpenFolder: () => void
}): JSX.Element {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 group transition-colors cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{r.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{new Date(r.startedAt).toLocaleString()}</p>
        {r.snippet && (
          <p
            className="text-xs text-gray-400 mt-1 italic line-clamp-2"
            dangerouslySetInnerHTML={{ __html: escapeSnippet(r.snippet) }}
          />
        )}
      </div>
      <RowActions onOpenFolder={onOpenFolder} onDelete={onDelete} />
    </div>
  )
}

function RowActions({
  onOpenFolder,
  onDelete
}: {
  onOpenFolder: () => void
  onDelete: () => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onOpenFolder() }}
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="p-2 rounded-lg hover:bg-red-900/50 text-gray-400 hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// Highlight [match] markers from FTS snippet without allowing arbitrary HTML
function escapeSnippet(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[(.+?)\]/g, '<mark class="bg-indigo-900/60 text-indigo-200 not-italic rounded px-0.5">$1</mark>')
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const map: Record<string, { label: string; cls: string }> = {
    recording: { label: 'Recording', cls: 'bg-red-900/60 text-red-300' },
    transcribing: { label: 'Transcribing', cls: 'bg-yellow-900/60 text-yellow-300' },
    ready: { label: 'Ready', cls: 'bg-green-900/60 text-green-300' },
    failed: { label: 'Failed', cls: 'bg-gray-800 text-gray-500' }
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-800 text-gray-400' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
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
