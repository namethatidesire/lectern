import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  RecordingConfig,
  Lecture,
  TranscriptSegment,
  Snapshot,
  Note,
  ScreenSource,
  AppSettings,
  WhisperStatus
} from '@shared/types'

const api = {
  getScreenSources: (): Promise<ScreenSource[]> =>
    ipcRenderer.invoke(IPC.GET_SCREEN_SOURCES),

  startRecording: (config: RecordingConfig): Promise<{ lectureId: string; startedAt: number }> =>
    ipcRenderer.invoke(IPC.START_RECORDING, config),

  stopRecording: (lectureId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.STOP_RECORDING, { lectureId }),

  takeSnapshot: (lectureId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.TAKE_SNAPSHOT, { lectureId }),

  listLectures: (): Promise<Lecture[]> =>
    ipcRenderer.invoke(IPC.LIST_LECTURES),

  getLecture: (lectureId: string): Promise<Lecture | null> =>
    ipcRenderer.invoke(IPC.GET_LECTURE, { lectureId }),

  deleteLecture: (lectureId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_LECTURE, { lectureId }),

  getSegments: (lectureId: string): Promise<TranscriptSegment[]> =>
    ipcRenderer.invoke(IPC.GET_SEGMENTS, { lectureId }),

  getSnapshots: (lectureId: string): Promise<Snapshot[]> =>
    ipcRenderer.invoke(IPC.GET_SNAPSHOTS, { lectureId }),

  getNotes: (lectureId: string): Promise<Note[]> =>
    ipcRenderer.invoke(IPC.GET_NOTES, { lectureId }),

  getSnapshotImage: (lectureId: string, tMs: number): Promise<string | null> =>
    ipcRenderer.invoke(IPC.GET_SNAPSHOT_IMAGE, { lectureId, tMs }),

  exportMarkdown: (lectureId: string, outputPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.EXPORT_MARKDOWN, { lectureId, outputPath }),

  generateNotes: (
    lectureId: string,
    model: 'claude' | 'ollama',
    ollamaModel?: string
  ): Promise<void> =>
    ipcRenderer.invoke(IPC.GENERATE_NOTES, { lectureId, model, ollamaModel }),

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  setSettings: (partial: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SETTINGS, partial),

  openLectureFolder: (lectureId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_LECTURE_FOLDER, { lectureId }),

  showSaveDialog: (options: {
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }): Promise<string | null> => ipcRenderer.invoke(IPC.SHOW_SAVE_DIALOG, options),

  getWhisperStatus: (): Promise<WhisperStatus> =>
    ipcRenderer.invoke(IPC.WHISPER_STATUS),

  downloadWhisper: (what: 'bin' | 'model'): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_WHISPER, { what }),

  getAudioPath: (lectureId: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.GET_AUDIO_PATH, { lectureId }),

  onWhisperDownloadProgress: (cb: (data: { what: 'bin' | 'model'; pct: number }) => void) => {
    ipcRenderer.on(IPC.WHISPER_DOWNLOAD_PROGRESS, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.WHISPER_DOWNLOAD_PROGRESS)
  },

  // Renderer → Main streaming (fire-and-forget)
  sendAudioChunk: (buffer: Buffer): void =>
    ipcRenderer.send('audio:chunk', { buffer }),

  sendAudioLevel: (rms: number): void =>
    ipcRenderer.send('audio:level', { rms }),

  sendSnapshotFrame: (
    lectureId: string,
    tMs: number,
    trigger: 'auto' | 'interval' | 'manual',
    pngBase64: string
  ): void =>
    ipcRenderer.send('snapshot:frame-data', { lectureId, tMs, trigger, pngBase64 }),

  // Main → Renderer event subscriptions
  onSnapshotAdded: (cb: (snap: Snapshot) => void) => {
    ipcRenderer.on(IPC.SNAPSHOT_ADDED, (_e, snap) => cb(snap))
    return () => ipcRenderer.removeAllListeners(IPC.SNAPSHOT_ADDED)
  },

  onTranscriptAppended: (cb: (seg: TranscriptSegment) => void) => {
    ipcRenderer.on(IPC.TRANSCRIPT_APPENDED, (_e, seg) => cb(seg))
    return () => ipcRenderer.removeAllListeners(IPC.TRANSCRIPT_APPENDED)
  },

  onRecordingStopped: (cb: (data: { lectureId: string }) => void) => {
    ipcRenderer.on(IPC.RECORDING_STOPPED, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.RECORDING_STOPPED)
  },

  onAudioLevel: (cb: (data: { rms: number }) => void) => {
    ipcRenderer.on(IPC.AUDIO_LEVEL, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.AUDIO_LEVEL)
  },

  onSnapshotRequestFrame: (
    cb: (data: { lectureId: string; tMs: number; trigger: 'auto' | 'interval' | 'manual' }) => void
  ) => {
    ipcRenderer.on('snapshot:request-frame', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('snapshot:request-frame')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
