import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Mic, Monitor, Square, Circle } from 'lucide-react'
import type { ScreenSource, RecordingConfig, AudioSource, SnapshotMode } from '@shared/types'
import { AudioCapture } from '../lib/audio-capture'
import { ScreenCapture } from '../lib/screen-capture'
import { setActiveCapture } from '../lib/screen-capture-manager'
import LevelMeter from '../components/LevelMeter'
import WhisperSetup from '../components/WhisperSetup'
import { useAppStore } from '../state/store'

export default function RecorderPage(): JSX.Element {
  const navigate = useNavigate()
  const { recording, setRecording } = useAppStore()

  const [title, setTitle] = useState(`Lecture ${new Date().toLocaleDateString()}`)
  const [screenSources, setScreenSources] = useState<ScreenSource[]>([])
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null)
  const [audioSource, setAudioSource] = useState<AudioSource>('mic')
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>('manual')
  const [intervalSec, setIntervalSec] = useState(30)
  const [elapsed, setElapsed] = useState(0)

  const audioCap = useRef<AudioCapture | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    window.api.getScreenSources().then((sources) => {
      setScreenSources(sources)
      if (sources.length > 0) setSelectedSource(sources[0])
    })
  }, [])

  useEffect(() => {
    if (recording.isRecording && recording.startedAt) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - recording.startedAt!)
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recording.isRecording, recording.startedAt])

  async function handleStart(): Promise<void> {
    if (!selectedSource) {
      alert('Please select a screen source.')
      return
    }

    const sc = new ScreenCapture()
    try {
      await sc.start(selectedSource.id)
      setActiveCapture(sc)
    } catch (err) {
      alert(`Screen capture failed: ${(err as Error).message}`)
      return
    }

    audioCap.current = new AudioCapture()
    try {
      await audioCap.current.start(null)
    } catch (err) {
      sc.stop()
      alert(`Microphone access failed: ${(err as Error).message}`)
      return
    }

    const config: RecordingConfig = {
      title,
      audioSource,
      snapshotMode,
      intervalMs: intervalSec * 1000,
      sourceId: selectedSource.id
    }

    const { lectureId, startedAt } = await window.api.startRecording(config)
    setRecording({ lectureId, startedAt, isRecording: true })
  }

  async function handleStop(): Promise<void> {
    if (!recording.lectureId) return
    audioCap.current?.stop()
    audioCap.current = null
    await window.api.stopRecording(recording.lectureId)
    navigate(`/lecture/${recording.lectureId}`)
  }

  async function handleSnapshot(): Promise<void> {
    if (recording.lectureId) {
      await window.api.takeSnapshot(recording.lectureId)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">New Recording</span>
        {recording.isRecording && (
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-red-400 text-sm font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatElapsed(elapsed)}
            </span>
            <LevelMeter level={recording.audioLevel} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Whisper setup banner */}
        <WhisperSetup />

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Lecture Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={recording.isRecording}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            placeholder="Enter lecture title…"
          />
        </div>

        {/* Screen Source */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Screen Source
          </label>
          <div className="grid grid-cols-2 gap-2">
            {screenSources.map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src)}
                disabled={recording.isRecording}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all disabled:opacity-50 ${
                  selectedSource?.id === src.id
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 hover:border-gray-500 bg-gray-900'
                }`}
              >
                {src.thumbnailDataUrl && (
                  <img
                    src={src.thumbnailDataUrl}
                    alt={src.name}
                    className="w-16 h-10 object-cover rounded"
                  />
                )}
                <span className="text-sm truncate">{src.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Source */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Mic className="w-4 h-4" /> Audio Source
          </label>
          <div className="flex gap-2">
            {(['mic', 'loopback', 'mixed'] as AudioSource[]).map((src) => (
              <button
                key={src}
                onClick={() => setAudioSource(src)}
                disabled={recording.isRecording}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                  audioSource === src
                    ? 'border-indigo-500 bg-indigo-900/30 text-indigo-200'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {src === 'mic' ? 'Microphone' : src === 'loopback' ? 'System Audio' : 'Mixed'}
              </button>
            ))}
          </div>
        </div>

        {/* Snapshot Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Snapshot Mode
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['manual', 'interval', 'auto', 'all'] as SnapshotMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSnapshotMode(mode)}
                disabled={recording.isRecording}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-50 ${
                  snapshotMode === mode
                    ? 'border-indigo-500 bg-indigo-900/30 text-indigo-200'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {mode === 'all' ? 'All modes' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          {(snapshotMode === 'interval' || snapshotMode === 'all') && (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm text-gray-400">Every</label>
              <input
                type="number"
                value={intervalSec}
                onChange={(e) => setIntervalSec(Math.max(5, Number(e.target.value)))}
                disabled={recording.isRecording}
                className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm disabled:opacity-50"
                min={5}
              />
              <span className="text-sm text-gray-400">seconds</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1.5">
            Manual hotkey: <kbd className="bg-gray-800 px-1.5 py-0.5 rounded font-mono">Ctrl+Shift+S</kbd> is always available.
          </p>
        </div>

        {/* Active snapshot list preview */}
        {recording.isRecording && (
          <div className="text-sm text-gray-400">
            Recording in progress… Press{' '}
            <kbd className="bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs">Ctrl+Shift+S</kbd>{' '}
            to take a snapshot.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-800 flex items-center gap-3">
        {!recording.isRecording ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Circle className="w-4 h-4 fill-current" />
            Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Recording
            </button>
            <button
              onClick={handleSnapshot}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-600 hover:border-gray-400 rounded-lg text-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              Snapshot
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
