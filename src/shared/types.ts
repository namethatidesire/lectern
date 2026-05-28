export type AudioSource = 'mic' | 'loopback' | 'mixed'
export type SnapshotTrigger = 'auto' | 'interval' | 'manual'
export type SnapshotMode = 'auto' | 'interval' | 'manual' | 'all'
export type LectureStatus = 'recording' | 'transcribing' | 'ready' | 'failed'
export type NoteKind = 'summary' | 'bullets' | 'keyterms' | 'qa'
export type SummarizeModel = 'claude' | 'ollama'

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
  sourceId: string | null
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

export interface RecordingState {
  lectureId: string
  startedAt: number
  isPaused: boolean
}

// IPC message payloads
export interface StartRecordingArgs {
  config: RecordingConfig
}

export interface StopRecordingArgs {
  lectureId: string
}

export interface TakeSnapshotArgs {
  lectureId: string
}

export interface GetLectureArgs {
  lectureId: string
}

export interface DeleteLectureArgs {
  lectureId: string
}

export interface ExportMarkdownArgs {
  lectureId: string
  outputPath: string
}

export interface GenerateNotesArgs {
  lectureId: string
  model: SummarizeModel
  ollamaModel?: string
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
  defaultAudioSource: AudioSource
  defaultSnapshotMode: SnapshotMode
  intervalMs: number
  autoDetectThreshold: number
  whisperModel: 'tiny' | 'base' | 'small' | 'medium'
}
