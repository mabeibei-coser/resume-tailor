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
  fs.mkdirSync(path.join(DATA_DIR, "resumes"), { recursive: true });
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
      resume_storage_path TEXT,
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
  // 增量迁移：老库补 resume_storage_path 列（原始简历文件的绝对路径）
  const cols = _db.prepare("PRAGMA table_info(reports)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "resume_storage_path")) {
    _db.exec("ALTER TABLE reports ADD COLUMN resume_storage_path TEXT");
  }
  return _db;
}
