import { BrowserWindow, globalShortcut } from 'electron'
import { ulid } from 'ulid'
import { WavWriter } from './wav-writer'
import { snapshotPath, snapshotFilename } from '../store/paths'
import {
  createLecture,
  finalizeLecture,
  insertSnapshot
} from '../store/lectures'
import { IPC } from '@shared/ipc-contract'
import type { RecordingConfig, Snapshot } from '@shared/types'
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

  // Register manual snapshot hotkey
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    captureSnapshot(win, id, 'manual')
  })

  // Interval mode
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

  const durationMs = Date.now() - session.startedAt
  finalizeLecture(session.lectureId, durationMs)

  win.webContents.send(IPC.RECORDING_STOPPED, { lectureId: session.lectureId })

  session = null
}

export function receiveAudioChunk(int16Buffer: Buffer): void {
  wavWriter?.write(int16Buffer)
}

export function captureSnapshot(
  win: BrowserWindow,
  lectureId: string,
  trigger: 'auto' | 'interval' | 'manual'
): void {
  if (!session || session.lectureId !== lectureId) return

  const tMs = Date.now() - session.startedAt

  // Ask renderer to send us the current frame
  win.webContents.send('snapshot:request-frame', { lectureId, tMs, trigger })
}

export function saveSnapshotFrame(
  win: BrowserWindow,
  lectureId: string,
  tMs: number,
  trigger: 'auto' | 'interval' | 'manual',
  pngBase64: string
): void {
  const filename = snapshotFilename(tMs)
  const filePath = snapshotPath(lectureId, tMs)
  const data = Buffer.from(pngBase64, 'base64')
  fs.writeFileSync(filePath, data)

  const snap: Snapshot = {
    lectureId,
    tMs,
    filename,
    trigger,
    phash: null
  }
  insertSnapshot(snap)

  win.webContents.send(IPC.SNAPSHOT_ADDED, snap)
}
