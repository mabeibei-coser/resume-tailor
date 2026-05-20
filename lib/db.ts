import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(process.cwd(), "data");

export const TAILOR_DB_PATH =
  process.env.TAILOR_DB_PATH ?? path.join(DATA_DIR, "resume-tailor.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(TAILOR_DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid            TEXT    NOT NULL UNIQUE,
      created_at      INTEGER NOT NULL,
      job_title       TEXT    NOT NULL,
      mode            TEXT    NOT NULL,
      resume_filename TEXT,
      user_name       TEXT,
      user_phone      TEXT,
      form_data_json  TEXT    NOT NULL,
      report_json     TEXT    NOT NULL,
      fallback        INTEGER DEFAULT 0,
      ip              TEXT,
      duration_ms     INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_uuid ON reports(uuid);
  `);
  return _db;
}
