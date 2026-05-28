import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Library from './routes/Library'
import RecorderPage from './routes/Recorder'
import LecturePage from './routes/Lecture'
import SettingsPage from './routes/Settings'
import { useAppStore } from './state/store'
import type { Snapshot, TranscriptSegment } from '@shared/types'
import { getActiveCapture, setActiveCapture } from './lib/screen-capture-manager'

export default function App(): JSX.Element {
  const { appendSnapshot, appendSegment, setRecording } = useAppStore()

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
      setRecording({ isRecording: false, lectureId: null })
      setActiveCapture(null)
    })
    const unsubFrameReq = window.api.onSnapshotRequestFrame(
      async ({ lectureId, tMs, trigger }) => {
        const sc = getActiveCapture()
        if (!sc) return
        const pngBase64 = await sc.captureFrame()
        if (pngBase64) {
          window.api.sendSnapshotFrame(lectureId, tMs, trigger, pngBase64)
        }
      }
    )

    return () => {
      unsubSnapshot()
      unsubTranscript()
      unsubLevel()
      unsubStopped()
      unsubFrameReq()
    }
  }, [])

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
