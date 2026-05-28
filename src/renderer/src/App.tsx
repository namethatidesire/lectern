import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Library from './routes/Library'
import RecorderPage from './routes/Recorder'
import LecturePage from './routes/Lecture'
import SettingsPage from './routes/Settings'
import { useAppStore } from './state/store'
import type { Snapshot, TranscriptSegment } from '@shared/types'
import {
  getActiveCapture,
  setActiveCapture,
  startAutoDetect,
  stopAutoDetect
} from './lib/screen-capture-manager'

export default function App(): JSX.Element {
  const { appendSnapshot, appendSegment, setRecording, recording } = useAppStore()

  useEffect(() => {
    const unsubSnapshot = window.api.onSnapshotAdded((snap: Snapshot) => {
      appendSnapshot(snap)
    })
    const unsubTranscript = window.api.onTranscriptAppended((seg: TranscriptSegment) => {
      appendSegment(seg)
    })
    const unsubLevel = window.api.onAudioLevel(({ rms }) => {
      setRecording({ audioLevel: rms })
    })
    const unsubStopped = window.api.onRecordingStopped(() => {
      stopAutoDetect()
      setActiveCapture(null)
      setRecording({ isRecording: false, lectureId: null })
    })
    const unsubFrameReq = window.api.onSnapshotRequestFrame(
      async ({ lectureId, tMs, trigger }) => {
        const sc = getActiveCapture()
        if (!sc) return
        const result = await sc.captureFrameWithHash()
        if (!result) return
        window.api.sendSnapshotFrame(lectureId, tMs, trigger, result.pngBase64, result.dhash)
      }
    )

    return (): void => {
      unsubSnapshot()
      unsubTranscript()
      unsubLevel()
      unsubStopped()
      unsubFrameReq()
    }
  }, [])

  // Start auto-detector when recording with auto/all mode
  useEffect(() => {
    if (!recording.isRecording) {
      stopAutoDetect()
      return
    }
    const { snapshotMode, lectureId, startedAt } = recording
    if (snapshotMode !== 'auto' && snapshotMode !== 'all') return
    if (!lectureId || !startedAt) return

    window.api.getSettings().then((settings) => {
      startAutoDetect(settings.autoDetectThreshold, 1000, (pngBase64, dhash) => {
        const tMs = Date.now() - startedAt
        window.api.sendSnapshotFrame(lectureId, tMs, 'auto', pngBase64, dhash)
      })
    })

    return (): void => { stopAutoDetect() }
  }, [recording.isRecording, recording.snapshotMode])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/record" element={<RecorderPage />} />
        <Route path="/lecture/:id" element={<LecturePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  )
}
