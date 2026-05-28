import { getDb } from './db'
import { lectureDir } from './paths'
import type {
  Lecture,
  TranscriptSegment,
  Snapshot,
  Note,
  LectureStatus,
  AppSettings,
  AudioSource
} from '@shared/types'
import fs from 'fs'
import path from 'path'

interface LectureRow {
  id: string
  title: string
  started_at: number
  duration_ms: number | null
  audio_source: string | null
  status: string
}

interface SegmentRow {
  lecture_id: string
  start_ms: number
  end_ms: number
  text: string
}

interface SnapshotRow {
  lecture_id: string
  t_ms: number
  filename: string
  trigger: string
  phash: string | null
}

interface NoteRow {
  lecture_id: string
  snapshot_t_ms: number | null
  kind: string
  body: string
  model: string
  generated_at: number
}

function rowToLecture(r: LectureRow): Lecture {
  return {
    id: r.id,
    title: r.title,
    startedAt: r.started_at,
    durationMs: r.duration_ms,
    audioSource: r.audio_source as AudioSource | null,
    status: r.status as LectureStatus
  }
}

export function createLecture(
  id: string,
  title: string,
  audioSource: AudioSource
): Lecture {
  const db = getDb()
  const now = Date.now()
  db.prepare(
    `INSERT INTO lectures (id, title, started_at, audio_source, status) VALUES (?, ?, ?, ?, 'recording')`
  ).run(id, title, now, audioSource)
  return rowToLecture(
    db.prepare('SELECT * FROM lectures WHERE id = ?').get(id) as LectureRow
  )
}

export function getLecture(id: string): Lecture | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM lectures WHERE id = ?').get(id) as LectureRow | undefined
  return row ? rowToLecture(row) : null
}

export function listLectures(): Lecture[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM lectures ORDER BY started_at DESC')
    .all() as LectureRow[]
  return rows.map(rowToLecture)
}

export function updateLectureStatus(id: string, status: LectureStatus): void {
  getDb().prepare('UPDATE lectures SET status = ? WHERE id = ?').run(status, id)
}

export function finalizeLecture(id: string, durationMs: number): void {
  getDb()
    .prepare("UPDATE lectures SET duration_ms = ?, status = 'ready' WHERE id = ?")
    .run(durationMs, id)
}

export function deleteLecture(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM lectures WHERE id = ?').run(id)
  const dir = lectureDir(id)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true })
  }
}

export function insertSegment(seg: Omit<TranscriptSegment, never>): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO transcript_segments (lecture_id, start_ms, end_ms, text) VALUES (?, ?, ?, ?)`
    )
    .run(seg.lectureId, seg.startMs, seg.endMs, seg.text)
}

export function getSegments(lectureId: string): TranscriptSegment[] {
  const rows = getDb()
    .prepare('SELECT * FROM transcript_segments WHERE lecture_id = ? ORDER BY start_ms')
    .all(lectureId) as SegmentRow[]
  return rows.map((r) => ({
    lectureId: r.lecture_id,
    startMs: r.start_ms,
    endMs: r.end_ms,
    text: r.text
  }))
}

export function insertSnapshot(snap: Snapshot): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO snapshots (lecture_id, t_ms, filename, trigger, phash) VALUES (?, ?, ?, ?, ?)`
    )
    .run(snap.lectureId, snap.tMs, snap.filename, snap.trigger, snap.phash)
}

export function getSnapshots(lectureId: string): Snapshot[] {
  const rows = getDb()
    .prepare('SELECT * FROM snapshots WHERE lecture_id = ? ORDER BY t_ms')
    .all(lectureId) as SnapshotRow[]
  return rows.map((r) => ({
    lectureId: r.lecture_id,
    tMs: r.t_ms,
    filename: r.filename,
    trigger: r.trigger as 'auto' | 'interval' | 'manual',
    phash: r.phash
  }))
}

export function insertNote(note: Note): void {
  getDb()
    .prepare(
      `INSERT INTO notes (lecture_id, snapshot_t_ms, kind, body, model, generated_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      note.lectureId,
      note.snapshotTMs,
      note.kind,
      note.body,
      note.model,
      note.generatedAt
    )
}

export function getNotes(lectureId: string): Note[] {
  const rows = getDb()
    .prepare('SELECT * FROM notes WHERE lecture_id = ? ORDER BY snapshot_t_ms, generated_at')
    .all(lectureId) as NoteRow[]
  return rows.map((r) => ({
    lectureId: r.lecture_id,
    snapshotTMs: r.snapshot_t_ms,
    kind: r.kind as Note['kind'],
    body: r.body,
    model: r.model,
    generatedAt: r.generated_at
  }))
}

const DEFAULT_SETTINGS: AppSettings = {
  claudeApiKey: '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-3.5-haiku',
  defaultAudioSource: 'mic',
  defaultSnapshotMode: 'manual',
  intervalMs: 30000,
  autoDetectThreshold: 10,
  whisperModel: 'small'
}

export function getSettings(): AppSettings {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as {
    key: string
    value: string
  }[]
  const saved: Record<string, string> = {}
  for (const r of rows) saved[r.key] = r.value
  const settings = { ...DEFAULT_SETTINGS }
  for (const [k, v] of Object.entries(saved)) {
    try {
      ;(settings as Record<string, unknown>)[k] = JSON.parse(v)
    } catch {
      ;(settings as Record<string, unknown>)[k] = v
    }
  }
  return settings
}

export function setSettings(settings: Partial<AppSettings>): void {
  const db = getDb()
  const upsert = db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )
  db.transaction(() => {
    for (const [k, v] of Object.entries(settings)) {
      upsert.run(k, JSON.stringify(v))
    }
  })()
}

export function getLectureFolderPath(lectureId: string): string {
  return path.resolve(lectureDir(lectureId))
}

export interface SearchResult {
  lectureId: string
  title: string
  startedAt: number
  snippet: string
}

export function searchTranscripts(query: string): SearchResult[] {
  if (!query.trim()) return []
  const db = getDb()
  const seen = new Set<string>()
  const results: SearchResult[] = []

  // FTS full-text search across transcripts; one result row per lecture
  try {
    const ftsRows = db
      .prepare(
        `SELECT l.id AS lecture_id, l.title, l.started_at,
                snippet(transcript_fts, 0, '[', ']', '...', 30) AS snippet
         FROM transcript_fts
         JOIN transcript_segments ts ON transcript_fts.rowid = ts.rowid
         JOIN lectures l ON ts.lecture_id = l.id
         WHERE transcript_fts MATCH ?
         GROUP BY l.id
         ORDER BY rank
         LIMIT 50`
      )
      .all(query) as { lecture_id: string; title: string; started_at: number; snippet: string }[]

    for (const r of ftsRows) {
      seen.add(r.lecture_id)
      results.push({ lectureId: r.lecture_id, title: r.title, startedAt: r.started_at, snippet: r.snippet })
    }
  } catch {
    // FTS MATCH syntax errors throw; silently skip FTS results
  }

  // Also match lecture titles
  const titleRows = db
    .prepare(`SELECT id, title, started_at FROM lectures WHERE title LIKE ? LIMIT 20`)
    .all(`%${query}%`) as { id: string; title: string; started_at: number }[]

  for (const r of titleRows) {
    if (!seen.has(r.id)) {
      results.push({ lectureId: r.id, title: r.title, startedAt: r.started_at, snippet: '' })
    }
  }

  return results
}
