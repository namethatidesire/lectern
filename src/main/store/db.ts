import Database from 'better-sqlite3'
import { dbPath } from './paths'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath())
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY
    );
  `)

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
      (r) => r.version
    )
  )

  const migrations: [number, string][] = [
    [1, `
      CREATE TABLE lectures (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        started_at    INTEGER NOT NULL,
        duration_ms   INTEGER,
        audio_source  TEXT,
        status        TEXT NOT NULL DEFAULT 'recording'
      );

      CREATE TABLE transcript_segments (
        lecture_id    TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
        start_ms      INTEGER NOT NULL,
        end_ms        INTEGER NOT NULL,
        text          TEXT NOT NULL,
        PRIMARY KEY (lecture_id, start_ms)
      );

      CREATE TABLE snapshots (
        lecture_id    TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
        t_ms          INTEGER NOT NULL,
        filename      TEXT NOT NULL,
        trigger       TEXT NOT NULL,
        phash         TEXT,
        PRIMARY KEY (lecture_id, t_ms)
      );

      CREATE TABLE notes (
        lecture_id    TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
        snapshot_t_ms INTEGER,
        kind          TEXT NOT NULL,
        body          TEXT NOT NULL,
        model         TEXT NOT NULL,
        generated_at  INTEGER NOT NULL
      );

      CREATE TABLE app_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE transcript_fts USING fts5(
        text,
        content='transcript_segments',
        content_rowid='rowid'
      );
      `
    ],
    [2, `
      CREATE TRIGGER transcript_segments_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO transcript_fts(rowid, text) VALUES (new.rowid, new.text);
      END;

      CREATE TRIGGER transcript_segments_ad AFTER DELETE ON transcript_segments BEGIN
        INSERT INTO transcript_fts(transcript_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
      END;

      CREATE TRIGGER transcript_segments_au AFTER UPDATE ON transcript_segments BEGIN
        INSERT INTO transcript_fts(transcript_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
        INSERT INTO transcript_fts(rowid, text) VALUES (new.rowid, new.text);
      END;
    `]
  ]

  for (const [version, sql] of migrations) {
    if (!applied.has(version)) {
      db.transaction(() => {
        db.exec(sql)
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
      })()
    }
  }
}
