export type AudioSource = 'mic' | 'loopback' | 'mixed'
export type SnapshotTrigger = 'auto' | 'interval' | 'manual'
export type SnapshotMode = 'auto' | 'interval' | 'manual' | 'all'
export type LectureStatus = 'recording' | 'transcribing' | 'ready' | 'failed'
export type NoteKind = 'summary' | 'bullets' | 'keyterms' | 'qa'
export type SummarizeModel = 'claude' | 'ollama' | 'openrouter'

// Discriminated union for the visual capture source selected in the Recorder.
// The renderer uses this to start the correct capture; main only needs to know
// whether visual capture is active at all (for snapshot scheduling).
export type VisualSource =
  | { kind: 'desktop'; sourceId: string; name: string; thumbnailDataUrl: string }
  | { kind: 'camera'; deviceId: string; label: string }
  | { kind: 'none' }

export interface Lecture {
  id: string
  title: string
  startedAt: number
  durationMs: number | null
  audioSource: AudioSource | null
  status: LectureStatus
}

export interface TranscriptSegment {
  lectureId: string
  startMs: number
  endMs: number
  text: string
}

export interface Snapshot {
  lectureId: string
  tMs: number
  filename: string
  trigger: SnapshotTrigger
  phash: string | null
}

export interface Note {
  lectureId: string
  snapshotTMs: number | null
  kind: NoteKind
  body: string
  model: string
  generatedAt: number
}

export interface RecordingConfig {
  title: string
  audioSource: AudioSource
  snapshotMode: SnapshotMode
  intervalMs: number
  // null when visual capture is disabled (audio-only)
  sourceId: string | null
  // non-null when a camera device was selected instead of a screen source
  cameraDeviceId: string | null
}

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export interface ScreenSource {
  id: string
  name: string
  thumbnailDataUrl: string
}

export interface CameraDevice {
  deviceId: string
  label: string
}

export interface RecordingState {
  lectureId: string
  startedAt: number
  isPaused: boolean
}

export interface SearchResult {
  lectureId: string
  title: string
  startedAt: number
  snippet: string
}

export interface WhisperStatus {
  binReady: boolean
  modelReady: boolean
  modelName: string
}

export interface AppSettings {
  claudeApiKey: string
  ollamaEndpoint: string
  ollamaModel: string
  openrouterApiKey: string
  openrouterModel: string
  defaultAudioSource: AudioSource
  defaultSnapshotMode: SnapshotMode
  intervalMs: number
  autoDetectThreshold: number
  whisperModel: 'tiny' | 'base' | 'small' | 'medium'
}
