import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Sparkles, FolderOpen } from 'lucide-react'
import type { Lecture, TranscriptSegment, Snapshot, Note } from '@shared/types'
import { useAppStore } from '../state/store'
import Timeline from '../components/Timeline'
import TranscriptPane from '../components/TranscriptPane'
import NotesPane from '../components/NotesPane'

export default function LecturePage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { view, setView } = useAppStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [showNoteOptions, setShowNoteOptions] = useState(false)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      window.api.getLecture(id),
      window.api.getSegments(id),
      window.api.getSnapshots(id),
      window.api.getNotes(id),
      window.api.getAudioPath(id)
    ]).then(([lecture, segments, snapshots, notes, audioPath]) => {
      setView({
        lecture: lecture as Lecture,
        segments: segments as TranscriptSegment[],
        snapshots: snapshots as Snapshot[],
        notes: notes as Note[],
        selectedSnapshotTMs: (snapshots as Snapshot[])[0]?.tMs ?? null,
        isGeneratingNotes: false
      })
      setAudioSrc(audioPath)
    })
  }, [id])

  useEffect(() => {
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc
    }
  }, [audioSrc])

  async function handleExport(): Promise<void> {
    const filePath = await window.api.showSaveDialog({
      defaultPath: `${view.lecture?.title ?? 'lecture'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (!filePath || !id) return
    await window.api.exportMarkdown(id, filePath)
  }

  async function handleGenerateNotes(model: 'claude' | 'ollama'): Promise<void> {
    if (!id) return
    setView({ isGeneratingNotes: true })
    setShowNoteOptions(false)
    try {
      await window.api.generateNotes(id, model)
      const notes = await window.api.getNotes(id)
      setView({ notes: notes as Note[], isGeneratingNotes: false })
    } catch (err) {
      alert(`Failed to generate notes: ${(err as Error).message}`)
      setView({ isGeneratingNotes: false })
    }
  }

  const { lecture, segments, snapshots, notes, selectedSnapshotTMs, isGeneratingNotes } = view

  if (!lecture) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{lecture.title}</h1>
          <p className="text-xs text-gray-500">
            {new Date(lecture.startedAt).toLocaleString()}
            {lecture.durationMs && ` · ${formatDuration(lecture.durationMs)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.api.openLectureFolder(lecture.id)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
            title="Open folder"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNoteOptions(!showNoteOptions)}
              disabled={isGeneratingNotes || lecture.status !== 'ready'}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Generate Notes
            </button>
            {showNoteOptions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                <button
                  onClick={() => handleGenerateNotes('claude')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 rounded-t-lg"
                >
                  Claude API
                </button>
                <button
                  onClick={() => handleGenerateNotes('ollama')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 rounded-b-lg border-t border-gray-700"
                >
                  Local (Ollama)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export MD
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-3 border-b border-gray-800">
        <Timeline
          lectureId={lecture.id}
          snapshots={snapshots}
          segments={segments}
          durationMs={lecture.durationMs}
          selectedSnapshotTMs={selectedSnapshotTMs}
          onSelectSnapshot={(tMs) => setView({ selectedSnapshotTMs: tMs })}
        />
      </div>

      {/* Audio player */}
      {audioSrc && (
        <div className="px-6 py-2 border-b border-gray-800">
          <audio
            ref={audioRef}
            src={audioSrc}
            controls
            className="w-full h-8"
          />
        </div>
      )}

      {/* Transcript + Notes */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-gray-800 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Transcript
            </h2>
            {segments.length > 0 && (
              <span className="text-xs text-gray-600">{segments.length} segments</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptPane
              segments={segments}
              snapshots={snapshots}
              selectedSnapshotTMs={selectedSnapshotTMs}
              audioRef={audioRef}
            />
          </div>
        </div>
        <div className="w-1/2 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <NotesPane
              notes={notes}
              selectedSnapshotTMs={selectedSnapshotTMs}
              isGenerating={isGeneratingNotes}
            />
          </div>
        </div>
      </div>
    </div>
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
