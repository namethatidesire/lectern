import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export function lecternDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'lectern')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function dbPath(): string {
  return path.join(lecternDataDir(), 'lectern.db')
}

export function lectureDir(lectureId: string): string {
  const dir = path.join(lecternDataDir(), 'lectures', lectureId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function snapshotsDir(lectureId: string): string {
  const dir = path.join(lectureDir(lectureId), 'snapshots')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function audioPath(lectureId: string): string {
  return path.join(lectureDir(lectureId), 'audio.wav')
}

export function snapshotPath(lectureId: string, tMs: number): string {
  const filename = String(tMs).padStart(10, '0') + '.png'
  return path.join(snapshotsDir(lectureId), filename)
}

export function snapshotFilename(tMs: number): string {
  return String(tMs).padStart(10, '0') + '.png'
}
