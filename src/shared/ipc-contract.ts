export const IPC = {
  // Renderer → Main (invoke)
  GET_SCREEN_SOURCES: 'capture:get-screen-sources',
  GET_AUDIO_DEVICES: 'capture:get-audio-devices',
  START_RECORDING: 'recording:start',
  STOP_RECORDING: 'recording:stop',
  TAKE_SNAPSHOT: 'snapshot:take',
  LIST_LECTURES: 'store:list-lectures',
  GET_LECTURE: 'store:get-lecture',
  DELETE_LECTURE: 'store:delete-lecture',
  GET_SEGMENTS: 'store:get-segments',
  GET_SNAPSHOTS: 'store:get-snapshots',
  GET_NOTES: 'store:get-notes',
  GENERATE_NOTES: 'summarize:generate',
  EXPORT_MARKDOWN: 'export:markdown',
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  GET_SNAPSHOT_IMAGE: 'snapshot:get-image',
  OPEN_LECTURE_FOLDER: 'store:open-folder',

  SHOW_SAVE_DIALOG: 'dialog:show-save',
  SEARCH: 'store:search',
  WHISPER_STATUS: 'whisper:status',
  DOWNLOAD_WHISPER: 'whisper:download',
  GET_AUDIO_PATH: 'store:get-audio-path',

  // Main → Renderer (on)
  SNAPSHOT_ADDED: 'snapshot:added',
  TRANSCRIPT_APPENDED: 'transcript:appended',
  RECORDING_STOPPED: 'recording:stopped',
  NOTE_GENERATED: 'note:generated',
  AUDIO_LEVEL: 'audio:level',
  WHISPER_DOWNLOAD_PROGRESS: 'whisper:download-progress',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
