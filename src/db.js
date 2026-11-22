const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  // Railway persistent volume convention: mount a volume at /data
  if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
    return '/data/nfl17.db';
  }
  return path.join(__dirname, '..', 'data', 'nfl17.db');
}

const DB_PATH = resolveDbPath();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Production SQLite pragmas: WAL for concurrency, foreign keys, busy timeout
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL UNIQUE,
    email TEXT,
    email_lower TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    anon_id TEXT,
    display_name TEXT NOT NULL DEFAULT 'Anonymous',
    mode TEXT NOT NULL,           -- 'daily' | 'unlimited' | 'challenge'
    board_date TEXT NOT NULL,     -- YYYY-MM-DD
    scoring TEXT NOT NULL,        -- 'ppr' | 'half' | 'std'
    spins_json TEXT NOT NULL,
    roster_json TEXT NOT NULL,
    grades_json TEXT NOT NULL,
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    avg_ppg REAL NOT NULL,
    base_ppg REAL NOT NULL,
    stack_bonus REAL NOT NULL DEFAULT 0,
    opt_pct REAL NOT NULL,
    weeks_json TEXT NOT NULL,
    challenge_code TEXT,
    hints_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_runs_daily ON runs(mode, board_date, scoring, wins DESC, avg_ppg DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_anon ON runs(anon_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS run_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    board_date TEXT NOT NULL,
    mode TEXT NOT NULL,
    round_idx INTEGER NOT NULL,
    team_id TEXT NOT NULL,
    era_label TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_year INTEGER NOT NULL,
    pos TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_picks_daily_round ON run_picks(mode, board_date, round_idx, player_name, player_year);
  CREATE INDEX IF NOT EXISTS idx_picks_bucket ON run_picks(team_id, era_label, player_name, player_year);

  CREATE TABLE IF NOT EXISTS challenges (
    code TEXT PRIMARY KEY,
    creator_run_id INTEGER NOT NULL,
    spins_json TEXT NOT NULL,
    scoring TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (creator_run_id) REFERENCES runs(id) ON DELETE CASCADE
  );
`);

// Safe migrations for existing Railway SQLite volumes
const runCols = db.prepare(`PRAGMA table_info(runs)`).all().map(c => c.name);
if (!runCols.includes('hints_used')) {
  db.exec(`ALTER TABLE runs ADD COLUMN hints_used INTEGER NOT NULL DEFAULT 0`);
}
const userCols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
if (!userCols.includes('email')) {
  db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
}
if (!userCols.includes('email_lower')) {
  db.exec(`ALTER TABLE users ADD COLUMN email_lower TEXT`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(email_lower) WHERE email_lower IS NOT NULL`);

// Periodic cleanup of expired sessions on startup
db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run();

module.exports = { db, DB_PATH };
