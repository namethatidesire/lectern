import { create } from 'zustand'
import type { Lecture, TranscriptSegment, Snapshot, Note, SnapshotMode } from '@shared/types'

interface RecordingState {
  lectureId: string | null
  startedAt: number | null
  isRecording: boolean
  audioLevel: number
  snapshotMode: SnapshotMode
  sourceId: string | null
}

interface LectureViewState {
  lecture: Lecture | null
  segments: TranscriptSegment[]
  snapshots: Snapshot[]
  notes: Note[]
  selectedSnapshotTMs: number | null
  isGeneratingNotes: boolean
}

interface AppStore {
  recording: RecordingState
  view: LectureViewState
  setRecording: (r: Partial<RecordingState>) => void
  setView: (v: Partial<LectureViewState>) => void
  appendSegment: (seg: TranscriptSegment) => void
  appendSnapshot: (snap: Snapshot) => void
  appendNote: (note: Note) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  recording: {
    lectureId: null,
    startedAt: null,
    isRecording: false,
    audioLevel: 0,
    snapshotMode: 'manual',
    sourceId: null
  },
  view: {
    lecture: null,
    segments: [],
    snapshots: [],
    notes: [],
    selectedSnapshotTMs: null,
    isGeneratingNotes: false
  },
  setRecording: (r) =>
    set((s) => ({ recording: { ...s.recording, ...r } })),
  setView: (v) =>
    set((s) => ({ view: { ...s.view, ...v } })),
  appendSegment: (seg) =>
    set((s) => ({ view: { ...s.view, segments: [...s.view.segments, seg] } })),
  appendSnapshot: (snap) =>
    set((s) => ({
      view: {
        ...s.view,
        snapshots: [...s.view.snapshots, snap].sort((a, b) => a.tMs - b.tMs)
      }
    })),
  appendNote: (note) =>
    set((s) => ({ view: { ...s.view, notes: [...s.view.notes, note] } })),
  reset: () =>
    set({
      recording: {
        lectureId: null,
        startedAt: null,
        isRecording: false,
        audioLevel: 0,
        snapshotMode: 'manual',
        sourceId: null
      }
    })
}))
