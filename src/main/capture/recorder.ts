import { BrowserWindow, globalShortcut } from 'electron'
import { ulid } from 'ulid'
import { WavWriter } from './wav-writer'
import { snapshotPath, snapshotFilename } from '../store/paths'
import {
  createLecture,
  finalizeLecture,
  insertSnapshot,
  insertSegment,
  getSettings
} from '../store/lectures'
import { IPC } from '@shared/ipc-contract'
import type { RecordingConfig, Snapshot } from '@shared/types'
import { chunker } from '../transcribe/chunker'
import { isDuplicateSnapshot } from '../snapshot/detector'
import fs from 'fs'

export interface ActiveSession {
  lectureId: string
  startedAt: number
  config: RecordingConfig
}

let session: ActiveSession | null = null
let wavWriter: WavWriter | null = null
let intervalTimer: ReturnType<typeof setInterval> | null = null

export function getActiveSession(): ActiveSession | null {
  return session
}

export function startSession(win: BrowserWindow, config: RecordingConfig): ActiveSession {
  if (session) throw new Error('Session already active')

  const id = ulid()
  createLecture(id, config.title, config.audioSource)

  session = { lectureId: id, startedAt: Date.now(), config }

  wavWriter = new WavWriter()
  wavWriter.open(id)

  const settings = getSettings()
  chunker.start(id, settings.whisperModel)

  chunker.on('segment', (seg) => {
    insertSegment(seg)
    win.webContents.send(IPC.TRANSCRIPT_APPENDED, seg)
  })

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    captureSnapshot(win, id, 'manual')
  })

  if (config.snapshotMode === 'interval' || config.snapshotMode === 'all') {
    intervalTimer = setInterval(() => {
      captureSnapshot(win, id, 'interval')
    }, config.intervalMs || 30000)
  }

  return session
}

export function stopSession(win: BrowserWindow): void {
  if (!session) return

  globalShortcut.unregister('CommandOrControl+Shift+S')

  if (intervalTimer) {
    clearInterval(intervalTimer)
    intervalTimer = null
  }

  wavWriter?.close()
  wavWriter = null

  chunker.stop()
  chunker.removeAllListeners('segment')

  const durationMs = Date.now() - session.startedAt
  finalizeLecture(session.lectureId, durationMs)

  win.webContents.send(IPC.RECORDING_STOPPED, { lectureId: session.lectureId })

  session = null
}

export function receiveAudioChunk(int16Buffer: Buffer): void {
  wavWriter?.write(int16Buffer)
  chunker.push(int16Buffer)
}

export function captureSnapshot(
  win: BrowserWindow,
  lectureId: string,
  trigger: 'auto' | 'interval' | 'manual'
): void {
  if (!session || session.lectureId !== lectureId) return
  const tMs = Date.now() - session.startedAt
  win.webContents.send('snapshot:request-frame', { lectureId, tMs, trigger })
}

export function saveSnapshotFrame(
  win: BrowserWindow,
  lectureId: string,
  tMs: number,
  trigger: 'auto' | 'interval' | 'manual',
  pngBase64: string,
  dhash?: string
): void {
  // Deduplicate: skip if this hash is too close to a recent snapshot
  if (dhash && isDuplicateSnapshot(lectureId, dhash)) return

  const filename = snapshotFilename(tMs)
  const filePath = snapshotPath(lectureId, tMs)
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'))

  const snap: Snapshot = { lectureId, tMs, filename, trigger, phash: dhash ?? null }
  insertSnapshot(snap)
  win.webContents.send(IPC.SNAPSHOT_ADDED, snap)
}
