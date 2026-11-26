const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { db, DB_PATH } = require('./db');
const {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  attachIdentity,
  rateLimit,
} = require('./auth');
const { createEditorialPages } = require('./pages');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Trust Railway's reverse proxy for req.ip and Secure cookies
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(attachIdentity);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PLAYERS_PATH = path.join(__dirname, '..', 'data', 'players_multi.json');
const PLAYERS_RAW = fs.readFileSync(PLAYERS_PATH, 'utf8');
const PLAYERS_COUNT = JSON.parse(PLAYERS_RAW).length;
const INDEX_TEMPLATE = () => fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

function shortCode(len = 7) {
  return crypto.randomBytes(6).toString('base64url').slice(0, len);
}

function escapeAttr(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function hydrateRun(row) {
  if (!row) return null;
  const pickRows = db.prepare(`
    SELECT round_idx, team_id, era_label, player_name, player_year, pos
    FROM run_picks
    WHERE run_id = ?
    ORDER BY round_idx ASC
  `).all(row.id);

  return {
    shortCode: row.short_code,
    displayName: row.display_name,
    isAccount: !!row.user_id,
    mode: row.mode,
    boardDate: row.board_date,
    scoring: row.scoring,
    spins: JSON.parse(row.spins_json),
    roster: JSON.parse(row.roster_json),
    grades: JSON.parse(row.grades_json),
    picksByRound: pickRows.map(p => ({
      roundIdx: p.round_idx,
      teamId: p.team_id,
      eraLabel: p.era_label,
      playerName: p.player_name,
      playerYear: p.player_year,
      pos: p.pos,
    })),
    wins: row.wins,
    losses: row.losses,
    avgPPG: row.avg_ppg,
    basePPG: row.base_ppg,
    stackBonus: row.stack_bonus,
    optPct: row.opt_pct,
    weeks: JSON.parse(row.weeks_json),
    challengeCode: row.challenge_code || null,
    hintsUsed: row.hints_used || 0,
    difficulty: row.difficulty || 'pro',
    createdAt: row.created_at,
  };
}

function computeCrowdStats(runRow) {
  const roster = JSON.parse(runRow.roster_json);
  const spins = JSON.parse(runRow.spins_json);
  const isDaily = runRow.mode === 'daily';

  // Pick-rate percentages per round
  const pickRates = [];
  const picksRows = db.prepare(`SELECT * FROM run_picks WHERE run_id = ? ORDER BY round_idx ASC`).all(runRow.id);

  for (let i = 0; i < picksRows.length; i++) {
    const pk = picksRows[i];
    let totalBucket, exactCount, playerCount;

    if (isDaily) {
      totalBucket = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE mode = 'daily' AND board_date = ? AND round_idx = ?`
      ).get(runRow.board_date, pk.round_idx).c;
      exactCount = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE mode = 'daily' AND board_date = ? AND round_idx = ? AND player_name = ? AND player_year = ?`
      ).get(runRow.board_date, pk.round_idx, pk.player_name, pk.player_year).c;
      playerCount = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE mode = 'daily' AND board_date = ? AND round_idx = ? AND player_name = ?`
      ).get(runRow.board_date, pk.round_idx, pk.player_name).c;
    } else {
      totalBucket = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE team_id = ? AND era_label = ?`
      ).get(pk.team_id, pk.era_label).c;
      exactCount = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE team_id = ? AND era_label = ? AND player_name = ? AND player_year = ?`
      ).get(pk.team_id, pk.era_label, pk.player_name, pk.player_year).c;
      playerCount = db.prepare(
        `SELECT COUNT(*) AS c FROM run_picks WHERE team_id = ? AND era_label = ? AND player_name = ?`
      ).get(pk.team_id, pk.era_label, pk.player_name).c;
    }

    const denom = Math.max(1, totalBucket);
    const exactPct = Math.round((exactCount / denom) * 1000) / 10;
    const playerPct = Math.round((playerCount / denom) * 1000) / 10;
    pickRates.push({
      roundIdx: pk.round_idx,
      playerName: pk.player_name,
      playerYear: pk.player_year,
      exactPct,
      playerPct,
      sampleSize: totalBucket,
    });
  }

  // Daily percentile & win histogram
  let dailySummary = null;
  if (isDaily) {
    const allDaily = db.prepare(
      `SELECT wins, avg_ppg FROM runs WHERE mode = 'daily' AND board_date = ? AND scoring = ?`
    ).all(runRow.board_date, runRow.scoring);
    const total = allDaily.length;
    const beaten = allDaily.filter(r =>
      r.wins < runRow.wins || (r.wins === runRow.wins && r.avg_ppg < runRow.avg_ppg)
    ).length;
    const topPct = total <= 1 ? 1 : Math.max(1, Math.round(((total - beaten) / total) * 100));
    const histogram = new Array(18).fill(0);
    for (const r of allDaily) {
      if (r.wins >= 0 && r.wins <= 17) histogram[r.wins]++;
    }
    dailySummary = { totalPlayers: total, topPct, histogram };
  }

  return { pickRates, dailySummary, spinsCount: spins.length, rosterCount: roster.length };
}

function getIdentityStats(req) {
  const where = req.user ? `user_id = ?` : `anon_id = ?`;
  const param = req.user ? req.user.id : req.anonId;

  const agg = db.prepare(`
    SELECT
      COUNT(*) AS totalRuns,
      SUM(CASE WHEN wins = 17 THEN 1 ELSE 0 END) AS perfects,
      MAX(wins) AS bestWins,
      MAX(avg_ppg) AS highPPG
    FROM runs
    WHERE ${where}
  `).get(param);

  // Daily streak (consecutive UTC dates played in daily mode)
  const dailyDates = db.prepare(`
    SELECT DISTINCT board_date FROM runs
    WHERE ${where} AND mode = 'daily'
    ORDER BY board_date DESC
    LIMIT 60
  `).all(param).map(r => r.board_date);

  let streak = 0;
  if (dailyDates.length) {
    const today = getTodayUTC();
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dailyDates[0] === today || dailyDates[0] === yest) {
      streak = 1;
      for (let i = 1; i < dailyDates.length; i++) {
        const prev = new Date(dailyDates[i - 1] + 'T00:00:00Z');
        const cur = new Date(dailyDates[i] + 'T00:00:00Z');
        if (Math.round((prev - cur) / 86400000) === 1) streak++;
        else break;
      }
    }
  }

  return {
    totalRuns: agg.totalRuns || 0,
    perfects: agg.perfects || 0,
    bestWins: agg.bestWins ?? -1,
    highPPG: agg.highPPG ? Math.round(agg.highPPG * 10) / 10 : 0,
    streak,
  };
}

// ==================== API ROUTES ====================

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, players: PLAYERS_COUNT, dbPath: path.basename(DB_PATH) });
});

app.get('/api/players', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(PLAYERS_RAW);
});

app.get('/api/me', (req, res) => {
  const stats = getIdentityStats(req);
  const today = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : getTodayUTC();
  const scoring = ['ppr', 'half', 'std'].includes(req.query.scoring) ? req.query.scoring : 'half';
  const where = req.user ? `user_id = ?` : `anon_id = ?`;
  const param = req.user ? req.user.id : req.anonId;

  const dailyRow = db.prepare(`
    SELECT * FROM runs
    WHERE ${where} AND mode = 'daily' AND board_date = ? AND scoring = ?
    ORDER BY created_at ASC LIMIT 1
  `).get(param, today, scoring);

  res.json({
    user: req.user,
    stats,
    todayDaily: dailyRow ? { run: hydrateRun(dailyRow), crowd: computeCrowdStats(dailyRow) } : null,
  });
});

// ==================== OPTIONAL AUTH ROUTES ====================
const authLimiter = rateLimit({ windowMs: 60000, max: 15 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–20 letters, numbers, or underscores.' });
    }
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const emailLower = email.toLowerCase();
    const existingUser = db.prepare(`SELECT id FROM users WHERE username_lower = ?`).get(username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email_lower = ?`).get(emailLower);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const pwHash = await hashPassword(password);
    const info = db.prepare(
      `INSERT INTO users (username, username_lower, email, email_lower, password_hash) VALUES (?, ?, ?, ?, ?)`
    ).run(username, username.toLowerCase(), email, emailLower, pwHash);
    const userId = Number(info.lastInsertRowid);

    // Seamlessly claim any prior anonymous runs from this browser!
    if (req.anonId) {
      db.prepare(`UPDATE runs SET user_id = ?, display_name = ? WHERE anon_id = ? AND user_id IS NULL`)
        .run(userId, username, req.anonId);
    }

    createSession(res, userId);
    req.user = { id: userId, username, email };
    res.status(201).json({ user: req.user, stats: getIdentityStats(req) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = db.prepare(
      `SELECT id, username, email, password_hash FROM users WHERE username_lower = ? OR email_lower = ?`
    ).get(identifier, identifier);

    // Always run scrypt verification even if user not found to prevent timing-based user enumeration
    const fakeHash = 'scrypt$16384$8$1$00000000000000000000000000000000$' + '0'.repeat(128);
    const ok = await verifyPassword(password, user ? user.password_hash : fakeHash);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    if (req.anonId) {
      db.prepare(`UPDATE runs SET user_id = ?, display_name = ? WHERE anon_id = ? AND user_id IS NULL`)
        .run(user.id, user.username, req.anonId);
    }

    createSession(res, user.id);
    req.user = { id: user.id, username: user.username, email: user.email || null };
    res.json({ user: req.user, stats: getIdentityStats(req) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

app.post('/api/auth/email', authLimiter, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in required.' });
  const email = String(req.body?.email || '').trim();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const emailLower = email.toLowerCase();
  const conflict = db.prepare(`SELECT id FROM users WHERE email_lower = ? AND id != ?`).get(emailLower, req.user.id);
  if (conflict) {
    return res.status(409).json({ error: 'That email is already in use.' });
  }
  db.prepare(`UPDATE users SET email = ?, email_lower = ? WHERE id = ?`).run(email, emailLower, req.user.id);
  req.user.email = email;
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

// ==================== RUNS, CROWD PICKS & LEADERBOARD ====================
const runLimiter = rateLimit({ windowMs: 60000, max: 30 });

app.post('/api/runs', runLimiter, (req, res) => {
  try {
    const b = req.body || {};
    const mode = ['daily', 'unlimited', 'challenge'].includes(b.mode) ? b.mode : 'unlimited';
    const scoring = ['ppr', 'half', 'std'].includes(b.scoring) ? b.scoring : 'half';
    const boardDate = /^\d{4}-\d{2}-\d{2}$/.test(b.boardDate) ? b.boardDate : getTodayUTC();

    if (!Array.isArray(b.roster) || b.roster.length !== 7 || !Array.isArray(b.spins) || b.spins.length !== 7) {
      return res.status(400).json({ error: 'Invalid lineup payload.' });
    }
    const wins = Math.max(0, Math.min(17, Math.round(Number(b.wins) || 0)));
    const losses = 17 - wins;
    const avgPPG = Math.round((Number(b.avgPPG) || 0) * 100) / 100;
    const basePPG = Math.round((Number(b.basePPG) || 0) * 100) / 100;
    const stackBonus = Math.round((Number(b.stackBonus) || 0) * 100) / 100;
    const optPct = Math.max(0, Math.min(100, Math.round((Number(b.optPct) || 0) * 10) / 10));
    const hintsUsed = Math.max(0, Math.min(7, Math.round(Number(b.hintsUsed) || 0)));
    const difficulty = b.difficulty === 'casual' ? 'casual' : 'pro';

    let displayName = req.user ? req.user.username : String(b.displayName || '').trim().slice(0, 20);
    if (!displayName) displayName = 'Guest';

    // Generate unique short code
    let code = shortCode(7);
    while (db.prepare(`SELECT 1 FROM runs WHERE short_code = ?`).get(code)) {
      code = shortCode(7);
    }

    const info = db.prepare(`
      INSERT INTO runs (
        short_code, user_id, anon_id, display_name, mode, board_date, scoring,
        spins_json, roster_json, grades_json, wins, losses, avg_ppg, base_ppg,
        stack_bonus, opt_pct, weeks_json, challenge_code, hints_used, difficulty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      req.user ? req.user.id : null,
      req.anonId,
      displayName,
      mode,
      boardDate,
      scoring,
      JSON.stringify(b.spins),
      JSON.stringify(b.roster),
      JSON.stringify(b.grades || []),
      wins,
      losses,
      avgPPG,
      basePPG,
      stackBonus,
      optPct,
      JSON.stringify(b.weeks || []),
      b.challengeCode || null,
      hintsUsed,
      difficulty
    );
    const runId = Number(info.lastInsertRowid);

    // Insert the 7 individual picks for crowd pick-rate % queries
    const insPick = db.prepare(`
      INSERT INTO run_picks (run_id, board_date, mode, round_idx, team_id, era_label, player_name, player_year, pos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const picksByRound = Array.isArray(b.picksByRound) && b.picksByRound.length === 7 ? b.picksByRound : null;
    if (picksByRound) {
      picksByRound.forEach((pk, rIdx) => {
        insPick.run(
          runId, boardDate, mode, rIdx,
          String(pk.teamId || ''), String(pk.eraLabel || ''),
          String(pk.playerName || ''), Number(pk.playerYear || 0), String(pk.pos || '')
        );
      });
    }

    const runRow = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId);
    res.status(201).json({
      shortCode: code,
      run: hydrateRun(runRow),
      crowd: computeCrowdStats(runRow),
      stats: getIdentityStats(req),
    });
  } catch (err) {
    console.error('Save run error:', err);
    res.status(500).json({ error: 'Could not save run.' });
  }
});

app.get('/api/runs/:code', (req, res) => {
  const row = db.prepare(`SELECT * FROM runs WHERE short_code = ?`).get(req.params.code);
  if (!row) return res.status(404).json({ error: 'Run not found.' });
  res.json({ run: hydrateRun(row), crowd: computeCrowdStats(row) });
});

app.get('/api/history', (req, res) => {
  const where = req.user ? `user_id = ?` : `anon_id = ?`;
  const param = req.user ? req.user.id : req.anonId;
  const rows = db.prepare(`
    SELECT * FROM runs WHERE ${where}
    ORDER BY wins DESC, avg_ppg DESC, created_at DESC
    LIMIT 12
  `).all(param);
  res.json({
    stats: getIdentityStats(req),
    runs: rows.map(hydrateRun),
  });
});

app.get('/api/daily/leaderboard', (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : getTodayUTC();
  const scoring = ['ppr', 'half', 'std'].includes(req.query.scoring) ? req.query.scoring : 'half';

  const top = db.prepare(`
    SELECT short_code, display_name, user_id, wins, losses, avg_ppg, stack_bonus, opt_pct, grades_json, hints_used, difficulty, created_at
    FROM runs
    WHERE mode = 'daily' AND board_date = ? AND scoring = ?
    ORDER BY wins DESC, avg_ppg DESC, created_at ASC
    LIMIT 25
  `).all(date, scoring);

  const summary = db.prepare(`
    SELECT COUNT(*) AS total, AVG(wins) AS avgWins, AVG(avg_ppg) AS avgPPG,
           SUM(CASE WHEN wins = 17 THEN 1 ELSE 0 END) AS perfects
    FROM runs
    WHERE mode = 'daily' AND board_date = ? AND scoring = ?
  `).get(date, scoring);

  const histRows = db.prepare(`
    SELECT wins, COUNT(*) AS c FROM runs
    WHERE mode = 'daily' AND board_date = ? AND scoring = ?
    GROUP BY wins
  `).all(date, scoring);
  const histogram = new Array(18).fill(0);
  for (const r of histRows) if (r.wins >= 0 && r.wins <= 17) histogram[r.wins] = r.c;

  // Most popular pick per round today
  const popularByRound = [];
  for (let r = 0; r < 7; r++) {
    const totalR = db.prepare(
      `SELECT COUNT(*) AS c FROM run_picks WHERE mode = 'daily' AND board_date = ? AND round_idx = ?`
    ).get(date, r).c;
    const topPicks = db.prepare(`
      SELECT team_id, era_label, player_name, player_year, pos, COUNT(*) AS c
      FROM run_picks
      WHERE mode = 'daily' AND board_date = ? AND round_idx = ?
      GROUP BY player_name, player_year
      ORDER BY c DESC
      LIMIT 3
    `).all(date, r);
    popularByRound.push({
      roundIdx: r,
      total: totalR,
      top: topPicks.map(p => ({
        teamId: p.team_id,
        eraLabel: p.era_label,
        playerName: p.player_name,
        playerYear: p.player_year,
        pos: p.pos,
        pct: totalR > 0 ? Math.round((p.c / totalR) * 1000) / 10 : 0,
      })),
    });
  }

  res.json({
    date,
    scoring,
    totalPlayers: summary.total || 0,
    avgWins: summary.avgWins ? Math.round(summary.avgWins * 10) / 10 : 0,
    avgPPG: summary.avgPPG ? Math.round(summary.avgPPG * 10) / 10 : 0,
    perfects: summary.perfects || 0,
    histogram,
    popularByRound,
    leaders: top.map(r => ({
      shortCode: r.short_code,
      displayName: r.display_name,
      isAccount: !!r.user_id,
      wins: r.wins,
      losses: r.losses,
      avgPPG: r.avg_ppg,
      stackBonus: r.stack_bonus,
      optPct: r.opt_pct,
      hintsUsed: r.hints_used || 0,
      difficulty: r.difficulty || 'pro',
      grades: JSON.parse(r.grades_json),
    })),
  });
});

// ==================== 1v1 FRIEND CHALLENGES ====================
app.post('/api/challenges', runLimiter, (req, res) => {
  const runCode = String(req.body?.shortCode || '');
  const runRow = db.prepare(`SELECT * FROM runs WHERE short_code = ?`).get(runCode);
  if (!runRow) return res.status(404).json({ error: 'Run not found.' });

  const existing = db.prepare(`SELECT code FROM challenges WHERE creator_run_id = ?`).get(runRow.id);
  if (existing) return res.json({ code: existing.code });

  let code = shortCode(7);
  while (db.prepare(`SELECT 1 FROM challenges WHERE code = ?`).get(code)) code = shortCode(7);

  db.prepare(`INSERT INTO challenges (code, creator_run_id, spins_json, scoring) VALUES (?, ?, ?, ?)`)
    .run(code, runRow.id, runRow.spins_json, runRow.scoring);
  res.status(201).json({ code });
});

function buildChallengeEntry(row, creatorRunId) {
  const hydrated = hydrateRun(row);
  return {
    shortCode: hydrated.shortCode,
    displayName: hydrated.displayName,
    isAccount: hydrated.isAccount,
    isCreator: row.id === creatorRunId,
    wins: hydrated.wins,
    losses: hydrated.losses,
    avgPPG: hydrated.avgPPG,
    optPct: hydrated.optPct,
    hintsUsed: hydrated.hintsUsed,
    difficulty: hydrated.difficulty,
    roster: hydrated.roster,
    picksByRound: hydrated.picksByRound,
    createdAt: hydrated.createdAt,
  };
}

app.get('/api/challenges/:code', (req, res) => {
  const ch = db.prepare(`
    SELECT c.code, c.creator_run_id, c.spins_json, c.scoring,
           r.display_name AS creator_name, r.user_id AS creator_user_id, r.anon_id AS creator_anon_id
    FROM challenges c
    JOIN runs r ON r.id = c.creator_run_id
    WHERE c.code = ?
  `).get(req.params.code);
  if (!ch) return res.status(404).json({ error: 'Challenge not found.' });

  const whereMe = req.user ? `user_id = ?` : `anon_id = ?`;
  const paramMe = req.user ? req.user.id : req.anonId;
  const isCreator = req.user
    ? ch.creator_user_id === req.user.id
    : (!!req.anonId && ch.creator_anon_id === req.anonId);

  const creatorRow = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(ch.creator_run_id);
  const viewerRunRow = isCreator
    ? creatorRow
    : (paramMe
        ? db.prepare(`SELECT * FROM runs WHERE ${whereMe} AND challenge_code = ? ORDER BY created_at DESC LIMIT 1`).get(paramMe, ch.code)
        : null);

  const totalEntries = db.prepare(
    `SELECT COUNT(*) AS c FROM runs WHERE id = ? OR challenge_code = ?`
  ).get(ch.creator_run_id, ch.code).c;

  const reveal = req.query.reveal === '1' || !!viewerRunRow;
  let leaderboard = [];
  if (reveal) {
    const lbRows = db.prepare(`
      SELECT * FROM runs
      WHERE id = ? OR challenge_code = ?
      ORDER BY wins DESC, avg_ppg DESC, created_at ASC
      LIMIT 50
    `).all(ch.creator_run_id, ch.code);
    leaderboard = lbRows.map(r => buildChallengeEntry(r, ch.creator_run_id));
  }

  res.json({
    code: ch.code,
    spins: JSON.parse(ch.spins_json),
    scoring: ch.scoring,
    creatorName: ch.creator_name,
    isCreator,
    totalEntries,
    creator: reveal && creatorRow ? buildChallengeEntry(creatorRow, ch.creator_run_id) : null,
    leaderboard,
    viewerRun: viewerRunRow ? hydrateRun(viewerRunRow) : null,
    viewerCrowd: viewerRunRow ? computeCrowdStats(viewerRunRow) : null,
  });
});

// ==================== STATIC & DYNAMIC SHARE PAGES ====================
const RAW_GA_ID = (process.env.GA_MEASUREMENT_ID || '').trim();
const GA_ID = /^G-[A-Z0-9]+$/i.test(RAW_GA_ID) ? RAW_GA_ID : '';
const RAW_ADSENSE_CLIENT = (process.env.ADSENSE_CLIENT_ID || '').trim();
const ADSENSE_CLIENT = /^ca-pub-\d+$/i.test(RAW_ADSENSE_CLIENT) ? RAW_ADSENSE_CLIENT : '';
const RAW_ADSENSE_SLOT = (process.env.ADSENSE_SLOT_ID || '').trim();
const ADSENSE_SLOT = /^\d+$/.test(RAW_ADSENSE_SLOT) ? RAW_ADSENSE_SLOT : '';
const APP_JS_HASH = (() => {
  const hash = crypto.createHash('sha256');
  const jsDir = path.join(PUBLIC_DIR, 'js');
  for (const name of fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()) {
    hash.update(name);
    hash.update(fs.readFileSync(path.join(jsDir, name)));
  }
  return hash.digest('hex').slice(0, 10);
})();

function buildGaSnippet() {
  if (!GA_ID) return '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;
}

function buildAdsenseHead() {
  if (!ADSENSE_CLIENT) return '';
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;
}

function buildAdsenseUnit() {
  if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return '';
  return `<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-center overflow-hidden">
    <div class="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Advertisement</div>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${ADSENSE_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>`;
}

function renderIndex({ title = null, ogMeta = '' } = {}) {
  let html = INDEX_TEMPLATE()
    .replace('<!--GA_SCRIPT-->', buildGaSnippet())
    .replace('<!--ADSENSE_SCRIPT-->', buildAdsenseHead())
    .replace('<!--ADSENSE_UNIT-->', buildAdsenseUnit())
    .replace('src="/js/main.js"', `src="/js/main.js?v=${APP_JS_HASH}"`);
  if (title) {
    html = html.replace('<title>KNOW BALL — All-Time Fantasy Football Draft</title>', `<title>${escapeAttr(title)}</title>`);
  }
  return html.replace('<!--OG_META-->', ogMeta);
}

app.get('/ads.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (!ADSENSE_CLIENT) {
    return res.send('# Set ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX in Railway Variables to populate ads.txt\n');
  }
  const pubId = ADSENSE_CLIENT.replace(/^ca-/i, '');
  res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
});

const editorial = createEditorialPages({
  playersRaw: PLAYERS_RAW,
  buildGaSnippet,
  buildAdsenseHead,
});

app.get('/how-to-play', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(editorial.howToPlayHtml());
});

app.get('/records', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(editorial.recordsHtml());
});

app.get('/about', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(editorial.aboutHtml());
});

app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(editorial.termsHtml());
});

app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(editorial.privacyHtml());
});

app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(editorial.robotsTxt());
});

app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(editorial.sitemapXml());
});

app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.send(renderIndex());
});

app.use(express.static(PUBLIC_DIR, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.get('/r/:code', (req, res) => {
  const row = db.prepare(`SELECT * FROM runs WHERE short_code = ?`).get(req.params.code);
  if (!row) return res.send(renderIndex());
  const weeks = JSON.parse(row.weeks_json);
  const sq = weeks.map(w => w.win ? '🟩' : '🟥').join('');
  const dTag = (row.difficulty || 'pro') === 'casual' ? ' · 📋 Casual' : '';
  const hTag = (row.hints_used || 0) === 0 ? 'No Hints 🧠' : `${row.hints_used} Hint${row.hints_used === 1 ? '' : 's'} 💡`;
  const title = `${row.wins}-${row.losses} (${row.avg_ppg.toFixed(1)} PPG) — KNOW BALL Fantasy Draft`;
  const desc = `${row.display_name} drafted a ${row.wins}-${row.losses} ${row.scoring.toUpperCase()} squad (${row.opt_pct.toFixed(0)}% Optimal · ${hTag}${dTag}) ${sq}`;
  const ogMeta = `
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(desc)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(desc)}" />`;
  res.send(renderIndex({ title, ogMeta }));
});

app.get('/c/:code', (req, res) => {
  const ch = db.prepare(`
    SELECT r.display_name, c.scoring FROM challenges c JOIN runs r ON r.id = c.creator_run_id WHERE c.code = ?
  `).get(req.params.code);
  if (!ch) return res.send(renderIndex());
  const title = `${ch.display_name} challenged you on KNOW BALL!`;
  const desc = `Draft the exact same 7 fantasy football spins (${ch.scoring.toUpperCase()}) and prove you know more ball than ${ch.display_name}.`;
  const ogMeta = `
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(desc)}" />
    <meta property="og:type" content="website" />`;
  res.send(renderIndex({ title, ogMeta }));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏈 KNOW BALL (Fantasy Draft) listening on http://0.0.0.0:${PORT} (DB: ${DB_PATH}, ${PLAYERS_COUNT} player-era entries, GA4: ${GA_ID || 'off'}, AdSense: ${ADSENSE_CLIENT || 'off'})`);
});
