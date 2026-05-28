// Audio capture runs in the renderer process via Web Audio API.
// See src/renderer/src/lib/audio-capture.ts
// PCM chunks are sent to main via IPC 'audio:chunk' and written by WavWriter.
export {}
