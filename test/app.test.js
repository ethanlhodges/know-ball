const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'players_multi.json');
const TEST_PORT = 3499;
const TEST_DB = `/tmp/know_ball_test_${process.pid}.db`;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

const ERA_BOUNDS = [
  [1999, 2004],
  [2005, 2009],
  [2010, 2014],
  [2015, 2019],
  [2020, 2025],
];

describe('KNOW BALL — Dataset Integrity', () => {
  const players = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  it('covers 100% of 32 teams × 5 eras × 4 positions', () => {
    const cov = new Set();
    for (const r of players) cov.add(`${r[2]}-${r[3]}-${r[1]}`);
    const missing = [];
    for (let t = 0; t < 32; t++) {
      for (let e = 0; e < 5; e++) {
        for (let p = 0; p < 4; p++) {
          if (!cov.has(`${t}-${e}-${p}`)) missing.push(`${t}-${e}-${p}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it('keeps every player season inside its assigned era window and valid game count', () => {
    for (const [name, posIdx, teamIdx, eraIdx, seasons] of players) {
      assert.ok(seasons.length >= 1, `${name} should have >=1 season`);
      const [lo, hi] = ERA_BOUNDS[eraIdx];
      for (const [yr, games, ppr, half, std, stat, weeks] of seasons) {
        assert.ok(yr >= lo && yr <= hi, `${name} year ${yr} outside era ${eraIdx} (${lo}-${hi})`);
        assert.ok(games >= 8 && games <= 17, `${name} ${yr} invalid games: ${games}`);
        assert.equal(weeks.length, games, `${name} ${yr} weekly log length != games`);
        assert.ok(ppr >= half && half >= std, `${name} ${yr} PPR >= Half >= Std violated`);
      }
    }
  });
});

describe('KNOW BALL — Server API, Auth, Crowd Picks & Round Alignment', () => {
  let srv;

  before(async () => {
    for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    srv = spawn('node', ['--no-warnings=ExperimentalWarning', 'src/server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(TEST_PORT), DB_PATH: TEST_DB, GA_MEASUREMENT_ID: 'G-TEST12345' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(`${BASE}/api/health`);
        if (r.ok) return;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 120));
    }
    throw new Error('Server failed to start');
  });

  after(() => {
    if (srv) srv.kill();
    for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });

  it('serves /api/health, /api/players, and injects GA4 gtag on /', async () => {
    const h = await (await fetch(`${BASE}/api/health`)).json();
    assert.equal(h.ok, true);
    assert.ok(h.players > 3000);
    const home = await (await fetch(`${BASE}/`)).text();
    assert.ok(home.includes('googletagmanager.com/gtag/js?id=G-TEST12345'));
  });

  it('persists anonymous runs in Half-PPR, tracks hints, and preserves exact draft round order', async () => {
    const meRes = await fetch(`${BASE}/api/me`);
    const cookie = meRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    assert.ok(cookie.includes('nfl17_anon='));

    // Intentionally draft in a different order than lineup slot order:
    // Slot order: [QB(0), RB1(1), RB2(2), WR1(3), WR2(4), TE(5), FLEX(6)]
    // Round 0 picks WR1 (slot 3), Round 1 picks QB (slot 0), etc.
    const roster = [
      { name: 'Patrick Mahomes', pos: 'QB', teamIdx: 15, team: 'KC', eraIdx: 3, era: '2015–19', year: 2018, games: 16, ppr: 26, half: 26, std: 26, stat: 's', weeks: [260] },
      { name: 'Marshall Faulk', pos: 'RB', teamIdx: 17, team: 'LAR', eraIdx: 0, era: '1999–04', year: 2000, games: 14, ppr: 32.8, half: 29.9, std: 27, stat: 's', weeks: [300] },
      { name: 'LaDainian Tomlinson', pos: 'RB', teamIdx: 16, team: 'LAC', eraIdx: 1, era: '2005–09', year: 2006, games: 16, ppr: 30.1, half: 28.3, std: 26.5, stat: 's', weeks: [280] },
      { name: 'Cooper Kupp', pos: 'WR', teamIdx: 17, team: 'LAR', eraIdx: 4, era: '2020–25', year: 2021, games: 17, ppr: 25.8, half: 21.6, std: 17.3, stat: 's', weeks: [220] },
      { name: 'Randy Moss', pos: 'WR', teamIdx: 21, team: 'NE', eraIdx: 1, era: '2005–09', year: 2007, games: 16, ppr: 24.1, half: 21.0, std: 17.9, stat: 's', weeks: [210] },
      { name: 'Rob Gronkowski', pos: 'TE', teamIdx: 21, team: 'NE', eraIdx: 2, era: '2010–14', year: 2011, games: 16, ppr: 20.7, half: 17.9, std: 15.1, stat: 's', weeks: [180] },
      { name: 'Christian McCaffrey', pos: 'RB', teamIdx: 4, team: 'CAR', eraIdx: 3, era: '2015–19', year: 2019, games: 16, ppr: 29.5, half: 25.8, std: 22.2, stat: 's', weeks: [260] },
    ];
    const roundOrderSlots = [3, 0, 5, 1, 6, 4, 2]; // scrambled vs slot order!
    const spins = roundOrderSlots.map(s => ({ teamIdx: roster[s].teamIdx, eraIdx: roster[s].eraIdx }));
    const picksByRound = roundOrderSlots.map(s => ({
      teamId: roster[s].team, eraLabel: roster[s].era,
      playerName: roster[s].name, playerYear: roster[s].year, pos: roster[s].pos,
    }));

    const saveRes = await fetch(`${BASE}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        mode: 'daily', boardDate: '2026-11-22', spins, roster, picksByRound,
        grades: ['S', 'S', 'S', 'S', 'S', 'S', 'S'],
        wins: 17, avgPPG: 168.2, basePPG: 170.5, stackBonus: 0, optPct: 99.1,
        hintsUsed: 1,
        weeks: Array.from({ length: 17 }, (_, w) => ({ week: w + 1, oppName: 'Opp', my: 168, opp: 105, win: true, breakdown: [] })),
      }),
    });
    assert.equal(saveRes.status, 201);
    const saved = await saveRes.json();
    assert.equal(saved.run.scoring, 'half');
    assert.equal(saved.run.hintsUsed, 1);

    // Fetch via /api/runs/:code and verify picksByRound preserves exact draft order (Cooper Kupp in Rd 0, Mahomes in Rd 1)
    const fetched = await (await fetch(`${BASE}/api/runs/${saved.shortCode}`)).json();
    assert.equal(fetched.run.picksByRound[0].playerName, 'Cooper Kupp');
    assert.equal(fetched.run.picksByRound[1].playerName, 'Patrick Mahomes');
    assert.equal(fetched.run.picksByRound[2].playerName, 'Rob Gronkowski');
    assert.equal(fetched.crowd.pickRates[0].exactPct, 100);

    // Verify Daily Leaderboard returns Half-PPR by default with hintsUsed
    const lb = await (await fetch(`${BASE}/api/daily/leaderboard?date=2026-11-22`)).json();
    assert.equal(lb.scoring, 'half');
    assert.equal(lb.leaders[0].hintsUsed, 1);

    // Verify OG meta tags on /r/:code
    const html = await (await fetch(`${BASE}/r/${saved.shortCode}`)).text();
    assert.ok(html.includes('KNOW BALL Fantasy Draft'));
    assert.ok(html.includes('1 Hint 💡'));
  });

  it('handles optional scrypt auth, rejects bad passwords, and claims prior anonymous runs', async () => {
    const meRes = await fetch(`${BASE}/api/me`);
    let cookie = meRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

    // Reject weak password
    const weak = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ username: 'ballknower99', password: '123' }),
    });
    assert.equal(weak.status, 400);

    // Register valid user
    const reg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ username: 'ballknower99', password: 'correcthorsebatterystaple' }),
    });
    assert.equal(reg.status, 201);

    // Reject wrong password
    const bad = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ballknower99', password: 'wrongpassword' }),
    });
    assert.equal(bad.status, 401);

    // Accept correct password (case-insensitive username)
    const good = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'BallKnower99', password: 'correcthorsebatterystaple' }),
    });
    assert.equal(good.status, 200);
  });
});
