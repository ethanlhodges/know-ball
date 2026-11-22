// ==================== SOUND ENGINE ====================
const SFX = {
  enabled: true, ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'triangle', gain = 0.06, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + dur);
    } catch (_) {}
  },
  tick() { this.tone(520 + Math.random() * 140, 0.035, 'square', 0.02); },
  lock() { this.tone(190, 0.09, 'triangle', 0.08); this.tone(380, 0.07, 'sine', 0.05, 0.03); },
  draft(grade) {
    this.tone(440, 0.09, 'triangle', 0.07, 0);
    if (grade === 'S' || grade === 'A') this.tone(554.37, 0.11, 'triangle', 0.07, 0.06);
    if (grade === 'S') { this.tone(659.25, 0.14, 'triangle', 0.08, 0.12); this.tone(880, 0.22, 'sine', 0.08, 0.18); }
  },
  stack() { this.tone(587.33, 0.1, 'sine', 0.08, 0.16); this.tone(880, 0.18, 'sine', 0.08, 0.24); },
  winTick() { this.tone(620, 0.06, 'sine', 0.04); },
  lossTick() { this.tone(210, 0.12, 'sawtooth', 0.045); },
  fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.08, i * 0.08)); }
};

// ==================== METADATA ====================
const POS_LIST = ['QB', 'RB', 'WR', 'TE'];
const ERA_LIST = ['2000–04', '2005–09', '2010–14', '2015–19', '2020–25'];
const ERA_SUB  = ['1999–2004 seasons', '2005–2009 seasons', '2010–2014 seasons', '2015–2019 seasons', '2020–2025 seasons'];
const OPP_NAMES = [
  '4th & Inches', 'Waiver Wire Sharks', 'Sunday Scaries', 'Bye Week Blues',
  'Two-Minute Drill', 'Red Zone Vultures', 'Garbage Time Kings', 'Hail Mary Club',
  'Checkdown Charlie', 'Zero-RB Mafia', 'Flex Appeal', 'Goal Line Stand',
  'Monday Night Miracle', 'Taco Tuesday', 'Commissioner’s Pet', 'Playoff Bound', 'Championship Boss'
];

const TEAMS = [
  { id: 'ARI', name: 'Arizona Cardinals', bg: '#97233F', fg: '#FFFFFF', note: '' },
  { id: 'ATL', name: 'Atlanta Falcons', bg: '#A71930', fg: '#FFFFFF', note: '' },
  { id: 'BAL', name: 'Baltimore Ravens', bg: '#241773', fg: '#FFFFFF', note: '' },
  { id: 'BUF', name: 'Buffalo Bills', bg: '#00338D', fg: '#FFFFFF', note: '' },
  { id: 'CAR', name: 'Carolina Panthers', bg: '#0085CA', fg: '#FFFFFF', note: '' },
  { id: 'CHI', name: 'Chicago Bears', bg: '#0B162A', fg: '#F38B00', note: '' },
  { id: 'CIN', name: 'Cincinnati Bengals', bg: '#FB4F14', fg: '#FFFFFF', note: '' },
  { id: 'CLE', name: 'Cleveland Browns', bg: '#311D00', fg: '#FF3C00', note: '' },
  { id: 'DAL', name: 'Dallas Cowboys', bg: '#041E42', fg: '#FFFFFF', note: '' },
  { id: 'DEN', name: 'Denver Broncos', bg: '#FB4F14', fg: '#FFFFFF', note: '' },
  { id: 'DET', name: 'Detroit Lions', bg: '#0076B6', fg: '#FFFFFF', note: '' },
  { id: 'GB',  name: 'Green Bay Packers', bg: '#203731', fg: '#FFB612', note: '' },
  { id: 'HOU', name: 'Houston Texans', bg: '#03202F', fg: '#FFFFFF', note: 'Debuted 2002' },
  { id: 'IND', name: 'Indianapolis Colts', bg: '#002C5F', fg: '#FFFFFF', note: '' },
  { id: 'JAX', name: 'Jacksonville Jaguars', bg: '#006778', fg: '#FFFFFF', note: '' },
  { id: 'KC',  name: 'Kansas City Chiefs', bg: '#E31837', fg: '#FFFFFF', note: '' },
  { id: 'LAC', name: 'Los Angeles Chargers', bg: '#0080C6', fg: '#FFC20E', note: 'Incl. San Diego' },
  { id: 'LAR', name: 'Los Angeles Rams', bg: '#003594', fg: '#FFD100', note: 'Incl. St. Louis' },
  { id: 'LV',  name: 'Las Vegas Raiders', bg: '#161618', fg: '#E4E4E7', note: 'Incl. Oakland' },
  { id: 'MIA', name: 'Miami Dolphins', bg: '#008E97', fg: '#FFFFFF', note: '' },
  { id: 'MIN', name: 'Minnesota Vikings', bg: '#4F2683', fg: '#FFC62F', note: '' },
  { id: 'NE',  name: 'New England Patriots', bg: '#002244', fg: '#FFFFFF', note: '' },
  { id: 'NO',  name: 'New Orleans Saints', bg: '#101820', fg: '#D3BC8D', note: '' },
  { id: 'NYG', name: 'New York Giants', bg: '#0B2265', fg: '#FFFFFF', note: '' },
  { id: 'NYJ', name: 'New York Jets', bg: '#125740', fg: '#FFFFFF', note: '' },
  { id: 'PHI', name: 'Philadelphia Eagles', bg: '#004C54', fg: '#FFFFFF', note: '' },
  { id: 'PIT', name: 'Pittsburgh Steelers', bg: '#101820', fg: '#FFB612', note: '' },
  { id: 'SEA', name: 'Seattle Seahawks', bg: '#002244', fg: '#69BE28', note: '' },
  { id: 'SF',  name: 'San Francisco 49ers', bg: '#AA0000', fg: '#FFFFFF', note: '' },
  { id: 'TB',  name: 'Tampa Bay Buccaneers', bg: '#D50A0A', fg: '#FFFFFF', note: '' },
  { id: 'TEN', name: 'Tennessee Titans', bg: '#0C2340', fg: '#4B92DB', note: '' },
  { id: 'WAS', name: 'Washington Commanders', bg: '#5A1414', fg: '#FFB612', note: 'Incl. WFT / Redskins' },
];

const SLOTS = [
  { id: 'QB',   label: 'QB',   accepts: ['QB'] },
  { id: 'RB1',  label: 'RB',   accepts: ['RB'] },
  { id: 'RB2',  label: 'RB',   accepts: ['RB'] },
  { id: 'WR1',  label: 'WR',   accepts: ['WR'] },
  { id: 'WR2',  label: 'WR',   accepts: ['WR'] },
  { id: 'TE',   label: 'TE',   accepts: ['TE'] },
  { id: 'FLEX', label: 'FLEX', accepts: ['RB', 'WR', 'TE'] },
];

const SCORE_CONFIG = {
  ppr:  { name: 'PPR',  target: 155.0, oppMean: 118.0, oppSd: 16.5, waiver: 7.5, base: { QB: 17.5, RB: 13.5, WR: 13.5, TE: 9.5 } },
  half: { name: 'HALF', target: 138.0, oppMean: 105.0, oppSd: 15.0, waiver: 6.5, base: { QB: 17.0, RB: 11.8, WR: 11.0, TE: 8.0 } },
  std:  { name: 'STD',  target: 123.0, oppMean: 93.0,  oppSd: 14.0, waiver: 5.5, base: { QB: 16.5, RB: 10.2, WR: 8.8,  TE: 6.5 } },
};

const POS_CHIP = { QB: 'bg-rose-500 text-white', RB: 'bg-emerald-500 text-white', WR: 'bg-sky-500 text-white', TE: 'bg-amber-500 text-black' };
const GRADE_STYLE = { S: 'bg-amber-400 text-black', A: 'bg-emerald-500 text-white', B: 'bg-sky-500 text-white', C: 'bg-orange-400 text-black', F: 'bg-rose-500 text-white' };

const RULES_SEEN_KEY = 'nfl_17_0_seen_rules_v1';

let PLAYERS = [];
const POOL_MAP = new Map();

function normalizeName(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randNormal(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function getTodayUTC() { return new Date().toISOString().slice(0, 10); }
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ==================== STATE ====================
const state = {
  user: null,
  stats: { totalRuns: 0, perfects: 0, bestWins: -1, highPPG: 0, streak: 0 },
  mode: 'daily', // 'daily' | 'unlimited' | 'challenge'
  scoring: 'ppr',
  round: 0,
  spins: [],
  usedBuckets: new Set(),
  roster: new Array(7).fill(null),
  slotGrades: new Array(7).fill(null),
  picksByRound: [],
  rerollsTeam: 1,
  rerollsEra: 1,
  rng: Math.random,
  draftSeed: 0,
  spinning: false,
  showFullPool: false,
  pendingPlayer: null,
  activeDropdownIdx: 0,
  dropdownMatches: [],
  lastDraftedSlot: -1,
  lastSim: null,
  lastSavedCode: null,
  lastCrowd: null,
  challengeCode: null,
  challengeMeta: null,
  simTimer: null,
  waitingForWelcome: false,
  authMode: 'login',
};

const getSeasonPPG = (s) => s[state.scoring];
function getPeakSeason(player) {
  let best = player.seasons[0];
  for (const s of player.seasons) if (getSeasonPPG(s) > getSeasonPPG(best)) best = s;
  return best;
}

// ==================== API HELPERS ====================
async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ==================== STACKS & ELIGIBILITY ====================
function computeStacks(roster) {
  const qb = roster[0];
  if (!qb) return { totalBonus: 0, stackedSlots: new Set(), labels: [] };
  let totalBonus = 0;
  const stackedSlots = new Set(), labels = [];
  for (let i = 1; i < roster.length; i++) {
    const p = roster[i];
    if (!p) continue;
    if ((p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === qb.teamIdx) {
      if (p.year === qb.year) {
        totalBonus += 4.0; stackedSlots.add(0); stackedSlots.add(i);
        labels.push(`${qb.team} '${String(qb.year).slice(-2)} Exact Stack (+4.0)`);
      } else if (p.eraIdx === qb.eraIdx) {
        totalBonus += 2.5; stackedSlots.add(0); stackedSlots.add(i);
        labels.push(`${qb.team} ${qb.era} Stack (+2.5)`);
      }
    }
  }
  return { totalBonus, stackedSlots, labels };
}

function getEligiblePositions() {
  const s = new Set();
  for (let i = 0; i < SLOTS.length; i++) if (!state.roster[i]) SLOTS[i].accepts.forEach(p => s.add(p));
  return s;
}

function hasStackOpportunity(spin) {
  const qb = state.roster[0];
  const openPos = getEligiblePositions();
  if (qb && qb.teamIdx === spin.teamIdx && qb.eraIdx === spin.eraIdx && (openPos.has('WR') || openPos.has('TE'))) return true;
  if (!qb && openPos.has('QB')) return state.roster.some(p => p && (p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === spin.teamIdx && p.eraIdx === spin.eraIdx);
  return false;
}

function wouldExactStack(player, year) {
  const qb = state.roster[0];
  if (player.pos === 'QB') return state.roster.some(p => p && (p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === player.teamIdx && p.year === year);
  return (player.pos === 'WR' || player.pos === 'TE') && qb && qb.teamIdx === player.teamIdx && qb.year === year;
}

function findOpenSlotForPos(pos) {
  for (let i = 0; i < 6; i++) if (!state.roster[i] && SLOTS[i].accepts.includes(pos)) return i;
  if (!state.roster[6] && SLOTS[6].accepts.includes(pos)) return 6;
  return -1;
}

function canDraftPlayer(player) {
  if (state.roster.some(p => p && p.name === player.name)) return { ok: false, reason: 'Drafted' };
  const slotIdx = findOpenSlotForPos(player.pos);
  if (slotIdx === -1) return { ok: false, reason: `No ${player.pos} spot` };
  return { ok: true, slotIdx };
}

function gradePick(player, season, spin, gainedStack) {
  const cfg = SCORE_CONFIG[state.scoring];
  const openPos = getEligiblePositions();
  const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
  let bestVorp = -1e9;
  for (const cand of pool) {
    if (!openPos.has(cand.pos) || state.roster.some(r => r && r.name === cand.name)) continue;
    const vorp = getSeasonPPG(getPeakSeason(cand)) - cfg.base[cand.pos];
    if (vorp > bestVorp) bestVorp = vorp;
  }
  const gap = Math.max(0, bestVorp - (getSeasonPPG(season) + gainedStack - cfg.base[player.pos]));
  if (gap <= 2.2) return 'S';
  if (gap <= 4.8) return 'A';
  if (gap <= 7.8) return 'B';
  if (gap <= 11.5) return 'C';
  return 'F';
}

// ==================== DRAFT LIFECYCLE ====================
function generateInitialSpins(rng) {
  const all = [];
  for (let t = 0; t < TEAMS.length; t++) for (let e = 0; e < ERA_LIST.length; e++) all.push({ teamIdx: t, eraIdx: e });
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 7);
}

function startDraft(mode = state.mode, opts = {}) {
  if (state.simTimer) { clearTimeout(state.simTimer); state.simTimer = null; }
  state.mode = mode;
  state.challengeCode = opts.challengeCode || null;
  state.challengeMeta = opts.challengeMeta || null;
  if (opts.scoring) state.scoring = opts.scoring;

  state.draftSeed = mode === 'daily'
    ? hashString('nfl-17-0-v3-' + getTodayUTC())
    : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  state.rng = mulberry32(state.draftSeed);
  state.spins = opts.fixedSpins ? opts.fixedSpins.map(s => ({ ...s })) : generateInitialSpins(state.rng);
  state.usedBuckets = new Set(state.spins.map(s => `${s.teamIdx}-${s.eraIdx}`));
  state.round = 0;
  state.roster = new Array(7).fill(null);
  state.slotGrades = new Array(7).fill(null);
  state.picksByRound = [];
  state.rerollsTeam = mode === 'challenge' ? 0 : 1;
  state.rerollsEra = mode === 'challenge' ? 0 : 1;
  state.showFullPool = false;
  state.pendingPlayer = null;
  state.lastDraftedSlot = -1;
  state.lastSim = null;
  state.lastSavedCode = null;
  state.lastCrowd = null;

  document.getElementById('draftConsole').classList.remove('hidden');
  document.getElementById('simStage').classList.add('hidden');
  document.getElementById('h2hBanner').classList.add('hidden');
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  document.getElementById('inspectorBar').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  if (mode !== 'challenge') document.getElementById('contextBanner').classList.add('hidden');

  renderChrome();
  renderField();
  if (opts.deferSpin) {
    paintTeamReel(state.spins[0].teamIdx);
    paintEraReel(state.spins[0].eraIdx);
    renderDraftHeader();
  } else {
    animateSpin(true, true);
  }
}

// ==================== SLOT MACHINE ====================
function paintTeamReel(teamIdx) {
  const team = TEAMS[teamIdx];
  const reel = document.getElementById('teamReel');
  reel.style.backgroundColor = team.bg; reel.style.color = team.fg;
  document.getElementById('teamAbbrev').textContent = team.id;
  document.getElementById('teamFullName').textContent = team.name;
  document.getElementById('teamNote').textContent = team.note || 'Real 1999–2025 game logs';
}
function paintEraReel(eraIdx) {
  document.getElementById('eraMain').textContent = ERA_LIST[eraIdx];
  document.getElementById('eraSub').textContent = ERA_SUB[eraIdx];
}
function animateSpin(spinTeam, spinEra) {
  state.spinning = true;
  state.pendingPlayer = null;
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  const search = document.getElementById('playerSearch');
  search.disabled = true;
  renderDraftHeader();

  const target = state.spins[state.round];
  const steps = 10; let step = 0;
  function tick() {
    step++;
    if (step < steps) {
      if (spinTeam) paintTeamReel(Math.floor(Math.random() * TEAMS.length));
      if (spinEra) paintEraReel(Math.floor(Math.random() * ERA_LIST.length));
      SFX.tick();
      setTimeout(tick, 34 + step * step * 2.1);
    } else {
      paintTeamReel(target.teamIdx);
      paintEraReel(target.eraIdx);
      SFX.lock();
      if (spinTeam) { const el = document.getElementById('teamReel'); el.classList.remove('reel-lock'); void el.offsetWidth; el.classList.add('reel-lock'); }
      if (spinEra)  { const el = document.getElementById('eraReel');  el.classList.remove('reel-lock'); void el.offsetWidth; el.classList.add('reel-lock'); }
      state.spinning = false;
      search.disabled = false;
      const tName = TEAMS[target.teamIdx].name.split(' ').pop();
      search.placeholder = `Draft a ${ERA_LIST[target.eraIdx]} ${tName} player...`;
      renderDraftHeader();
      search.focus();
    }
  }
  tick();
}

// ==================== PICKING & SEASON SELECTION ====================
function showFloatingPop(text, tone = 'normal') {
  const host = document.getElementById('fieldPopAnchor');
  const el = document.createElement('div');
  const cls = tone === 'gold' ? 'bg-amber-400 text-black' : tone === 'stack' ? 'bg-sky-400 text-slate-950' : 'bg-white text-emerald-950';
  el.className = `float-pop whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-black shadow-lg ${cls}`;
  el.textContent = text;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function selectPlayerForSeason(player) {
  if (state.spinning || state.round >= 7) return;
  if (!canDraftPlayer(player).ok) return;
  if (player.seasons.length === 1) { commitPlayerSeason(player, player.seasons[0]); return; }

  state.pendingPlayer = player;
  document.getElementById('searchDropdown').classList.add('hidden');
  document.getElementById('searchWrap').classList.add('hidden');
  document.getElementById('yearPickerWrap').classList.remove('hidden');

  const chip = document.getElementById('ypPosChip');
  chip.textContent = player.pos;
  chip.className = `px-2 py-0.5 rounded text-xs font-black ${POS_CHIP[player.pos]}`;
  document.getElementById('ypPlayerName').textContent = `${player.name} (${player.team})`;

  const btns = document.getElementById('yearButtons');
  btns.innerHTML = '';
  player.seasons.forEach(s => {
    const isExactStack = wouldExactStack(player, s.year);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `px-4 py-2 rounded-xl border-2 text-sm font-black tabular transition cursor-pointer flex items-center gap-1.5 ${
      isExactStack ? 'border-amber-400 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' : 'border-[var(--border)] bg-[var(--card)] hover:border-emerald-500 hover:bg-emerald-500/10'
    }`;
    b.innerHTML = `<span>${s.year}</span>${isExactStack ? '<span class="text-xs" title="Exact Same-Season Stack (+4.0 PPG)">⚡</span>' : ''}`;
    b.addEventListener('click', () => commitPlayerSeason(player, s));
    btns.appendChild(b);
  });
}

function commitPlayerSeason(player, season) {
  const check = canDraftPlayer(player);
  if (!check.ok) return;

  const prevStacks = computeStacks(state.roster).totalBonus;
  const spin = state.spins[state.round];
  const peak = getPeakSeason(player);

  const flat = {
    name: player.name, pos: player.pos, teamIdx: player.teamIdx, team: player.team,
    eraIdx: player.eraIdx, era: player.era, year: season.year, games: season.games,
    ppr: season.ppr, half: season.half, std: season.std, stat: season.stat, weeks: season.weeks,
    peakYear: peak.year, peakPPG: getSeasonPPG(peak), seasonCount: player.seasons.length,
  };

  const testRoster = state.roster.slice();
  testRoster[check.slotIdx] = flat;
  const gainedStack = computeStacks(testRoster).totalBonus - prevStacks;
  const grade = gradePick(player, season, spin, gainedStack);

  state.roster[check.slotIdx] = flat;
  state.slotGrades[check.slotIdx] = grade;
  state.lastDraftedSlot = check.slotIdx;
  state.picksByRound.push({ spin: { ...spin }, player: flat, slotIdx: check.slotIdx, grade });
  state.pendingPlayer = null;

  const ppg = getSeasonPPG(season);
  const nailedPeak = player.seasons.length > 1 && season.year === peak.year;
  SFX.draft(grade);
  if (gainedStack > 0) { SFX.stack(); showFloatingPop(`⚡ STACK +${gainedStack.toFixed(1)} · ${grade}-TIER (${ppg.toFixed(1)})`, 'stack'); }
  else if (nailedPeak) showFloatingPop(`★ PEAK ${season.year}! · ${grade}-TIER (+${ppg.toFixed(1)})`, 'gold');
  else showFloatingPop(`${grade}-TIER · ${season.year} (+${ppg.toFixed(1)} PPG)`, grade === 'S' ? 'gold' : 'normal');

  state.round++;
  state.showFullPool = false;
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');

  renderField();
  if (state.round >= 7) finishAndPersistDraft();
  else animateSpin(true, true);
}

function rerollTeam() {
  if (state.spinning || state.rerollsTeam <= 0 || state.round >= 7) return;
  const cur = state.spins[state.round];
  const cands = [];
  for (let t = 0; t < TEAMS.length; t++) if (t !== cur.teamIdx && !state.usedBuckets.has(`${t}-${cur.eraIdx}`)) cands.push(t);
  if (!cands.length) return;
  cur.teamIdx = cands[Math.floor(state.rng() * cands.length)];
  state.usedBuckets.add(`${cur.teamIdx}-${cur.eraIdx}`);
  state.rerollsTeam--;
  state.showFullPool = false;
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  animateSpin(true, false);
}

function rerollEra() {
  if (state.spinning || state.rerollsEra <= 0 || state.round >= 7) return;
  const cur = state.spins[state.round];
  const cands = [];
  for (let e = 0; e < ERA_LIST.length; e++) if (e !== cur.eraIdx && !state.usedBuckets.has(`${cur.teamIdx}-${e}`)) cands.push(e);
  if (!cands.length) for (let e = 0; e < ERA_LIST.length; e++) if (e !== cur.eraIdx) cands.push(e);
  cur.eraIdx = cands[Math.floor(state.rng() * cands.length)];
  state.usedBuckets.add(`${cur.teamIdx}-${cur.eraIdx}`);
  state.rerollsEra--;
  state.showFullPool = false;
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  animateSpin(false, true);
}

// ==================== OPTIMAL DP & REAL WEEKLY LOG SIM ====================
function computeOptimalLineup(spins) {
  const N = 7, FULL = (1 << N) - 1;
  const dp = Array.from({ length: N + 1 }, () => new Float64Array(1 << N).fill(-1e9));
  const parent = Array.from({ length: N + 1 }, () => new Array(1 << N).fill(null));
  dp[0][0] = 0;
  for (let r = 0; r < N; r++) {
    const pool = POOL_MAP.get(`${spins[r].teamIdx}-${spins[r].eraIdx}`) || [];
    const bestForSlot = new Array(N).fill(null);
    for (let s = 0; s < N; s++) {
      let best = null, bestVal = -1;
      for (const p of pool) {
        if (!SLOTS[s].accepts.includes(p.pos)) continue;
        const pk = getPeakSeason(p);
        const val = getSeasonPPG(pk);
        if (val > bestVal) { bestVal = val; best = { name: p.name, pos: p.pos, year: pk.year, ppg: val }; }
      }
      bestForSlot[s] = best;
    }
    for (let mask = 0; mask <= FULL; mask++) {
      if (dp[r][mask] < -1e8) continue;
      for (let s = 0; s < N; s++) {
        if (mask & (1 << s)) continue;
        const cand = bestForSlot[s];
        if (!cand) continue;
        const nextMask = mask | (1 << s);
        const val = dp[r][mask] + cand.ppg;
        if (val > dp[r + 1][nextMask]) {
          dp[r + 1][nextMask] = val;
          parent[r + 1][nextMask] = { prevMask: mask, slotIdx: s, player: cand };
        }
      }
    }
  }
  const assignments = new Array(N);
  let mask = FULL;
  for (let r = N; r >= 1; r--) {
    const step = parent[r][mask];
    assignments[r - 1] = { spin: spins[r - 1], player: step.player, slotIdx: step.slotIdx };
    mask = step.prevMask;
  }
  return { total: dp[N][FULL], assignments };
}

function getPlayer17WeekLog(player, rng) {
  const cfg = SCORE_CONFIG[state.scoring];
  const scale = player.ppr > 0 ? (player[state.scoring] / player.ppr) : 1;
  const raw = player.weeks.map(x => Math.round((x / 10.0) * scale * 10) / 10);
  const seasonCap = player.year >= 2021 ? 17 : 16;
  const missed = Math.max(0, seasonCap - raw.length);
  const waiverWeeks = missed >= 4 ? Math.min(4, Math.floor(missed / 2)) : 0;

  const log = raw.slice();
  for (let i = 0; i < waiverWeeks; i++) log.push(Math.round((cfg.waiver + (rng() - 0.5) * 4.0) * 10) / 10);
  let idx = 0;
  while (log.length < 17) { log.push(raw[idx % raw.length]); idx++; }
  const out = log.slice(0, 17);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRealWeeklySim() {
  const cfg = SCORE_CONFIG[state.scoring];
  const stacks = computeStacks(state.roster);
  const oppSeed = state.mode === 'daily'
    ? hashString('nfl-opp-v3-' + getTodayUTC() + '-' + state.scoring)
    : state.mode === 'challenge'
      ? hashString('nfl-opp-ch-' + state.challengeCode + '-' + state.scoring)
      : hashString('nfl-opp-u3-' + state.draftSeed + '-' + state.scoring);
  const oppRng = mulberry32(oppSeed);
  const logRng = mulberry32(hashString(state.roster.map(p => `${p.name}-${p.year}`).join('|') + state.scoring));
  const playerLogs = state.roster.map(p => getPlayer17WeekLog(p, logRng));

  let wins = 0, totalMy = 0;
  const weeks = [];
  for (let w = 0; w < 17; w++) {
    const breakdown = state.roster.map((p, sIdx) => ({
      slot: SLOTS[sIdx].label, name: p.name.split(' ').slice(-1)[0], pts: playerLogs[sIdx][w],
    }));
    const my = Math.round((breakdown.reduce((a, b) => a + b.pts, 0) + stacks.totalBonus) * 10) / 10;
    const opp = Math.round(Math.max(72, cfg.oppMean + randNormal(oppRng) * cfg.oppSd) * 10) / 10;
    const win = my >= opp;
    if (win) wins++;
    totalMy += my;
    weeks.push({ week: w + 1, oppName: OPP_NAMES[w], my, opp, win, breakdown, stackBonus: stacks.totalBonus });
  }
  const optimal = computeOptimalLineup(state.spins);
  const basePPG = state.roster.reduce((a, p) => a + p[state.scoring], 0);
  const avgPPG = totalMy / 17;
  const optPct = Math.min(100, (basePPG / optimal.total) * 100);
  return { wins, losses: 17 - wins, avgPPG, basePPG, stackBonus: stacks.totalBonus, optPct, optimal, weeks };
}

async function finishAndPersistDraft() {
  const sim = buildRealWeeklySim();
  state.lastSim = sim;

  // Save to SQLite backend in parallel with the live 17-week animation!
  const payload = {
    mode: state.mode,
    boardDate: getTodayUTC(),
    scoring: state.scoring,
    spins: state.spins,
    roster: state.roster,
    grades: state.picksByRound.map(p => p.grade),
    picksByRound: state.picksByRound.map(p => ({
      teamId: TEAMS[p.spin.teamIdx].id,
      eraLabel: ERA_LIST[p.spin.eraIdx],
      playerName: p.player.name,
      playerYear: p.player.year,
      pos: p.player.pos,
    })),
    wins: sim.wins,
    avgPPG: sim.avgPPG,
    basePPG: sim.basePPG,
    stackBonus: sim.stackBonus,
    optPct: sim.optPct,
    weeks: sim.weeks,
    challengeCode: state.challengeCode,
  };

  api('/api/runs', { method: 'POST', body: JSON.stringify(payload) })
    .then(async res => {
      state.lastSavedCode = res.shortCode;
      state.lastCrowd = res.crowd;
      if (res.stats) { state.stats = res.stats; updateHOFBadge(); }
      if (state.mode === 'challenge' && state.challengeCode) {
        try {
          const rev = await api(`/api/challenges/${state.challengeCode}?reveal=1`);
          renderH2H(rev.creator, sim);
        } catch (_) {}
      }
      renderCrowdOverlay();
    })
    .catch(err => console.error('Save run failed:', err));

  playSeasonSim(sim, false);
}

function renderH2H(creator, mySim) {
  if (!creator) return;
  const banner = document.getElementById('h2hBanner');
  banner.classList.remove('hidden');
  const beat = mySim.wins > creator.wins || (mySim.wins === creator.wins && mySim.avgPPG > creator.avgPPG);
  const tie = mySim.wins === creator.wins && Math.abs(mySim.avgPPG - creator.avgPPG) < 0.05;
  document.getElementById('h2hSummary').textContent =
    `⚔️ 1v1 vs. ${creator.displayName}: YOU ${mySim.wins}-${mySim.losses} (${mySim.avgPPG.toFixed(1)}) vs. ${creator.displayName} ${creator.wins}-${creator.losses} (${creator.avgPPG.toFixed(1)})`;
  const v = document.getElementById('h2hVerdict');
  v.textContent = tie ? 'TIE GAME!' : beat ? 'YOU KNOW MORE BALL!' : `${creator.displayName} KNOWS MORE BALL`;
  v.className = `px-2.5 py-1 rounded-lg font-black text-xs ${beat ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300'}`;
}

function renderCrowdOverlay() {
  const crowd = state.lastCrowd;
  const pill = document.getElementById('dailyPercentilePill');
  if (crowd?.dailySummary && crowd.dailySummary.totalPlayers >= 1) {
    pill.classList.remove('hidden');
    pill.textContent = `Top ${crowd.dailySummary.topPct}% of ${crowd.dailySummary.totalPlayers} today`;
  } else {
    pill.classList.add('hidden');
  }
  renderOptimalTable();
}

function renderOptimalTable() {
  const sim = state.lastSim;
  if (!sim) return;
  document.getElementById('optimalMaxLabel').textContent = `Max Possible: ${sim.optimal.total.toFixed(1)} PPG`;

  const rates = state.lastCrowd?.pickRates || [];
  document.getElementById('optimalList').innerHTML = state.picksByRound.map((pick, i) => {
    const opt = sim.optimal.assignments[i];
    const team = TEAMS[pick.spin.teamIdx];
    const era = ERA_LIST[pick.spin.eraIdx];
    const myP = pick.player[state.scoring], optP = opt.player.ppg;
    const exact = pick.player.name === opt.player.name && pick.player.year === opt.player.year;
    const diff = myP - optP;
    const pr = rates[i];
    const pctBadge = pr
      ? (pr.exactPct <= 10 && pr.sampleSize >= 3
          ? `<span class="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold tabular" title="${pr.playerPct}% picked ${escapeHtml(pick.player.name)} (any year)">💎 ${pr.exactPct}%</span>`
          : `<span class="px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] font-bold tabular" title="${pr.playerPct}% picked ${escapeHtml(pick.player.name)} (any year)">${pr.exactPct}% picked</span>`)
      : '';

    return `
      <div class="py-2 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span class="px-1.5 py-0.5 rounded text-[11px] font-black ${GRADE_STYLE[pick.grade]}">${pick.grade}</span>
          <span class="px-1.5 py-0.5 rounded text-[11px] font-black" style="background:${team.bg};color:${team.fg}">${team.id}</span>
          <span class="text-[var(--muted-foreground)]">${era}</span>
          <span class="font-bold">${escapeHtml(pick.player.name)} '${String(pick.player.year).slice(-2)}</span>
          <span class="text-[var(--muted-foreground)] tabular">${myP.toFixed(1)}</span>
          ${pctBadge}
        </div>
        <div class="flex items-center gap-2">
          ${exact
            ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-black">✓ Optimal</span>`
            : `<span class="text-[var(--muted-foreground)]">Best: <strong class="text-[var(--foreground)]">${escapeHtml(opt.player.name)} '${String(opt.player.year).slice(-2)}</strong> (${opt.player.pos} · ${optP.toFixed(1)})</span>
               <span class="font-bold tabular ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</span>`
          }
        </div>
      </div>`;
  }).join('');
}

function launchConfetti() {
  const host = document.getElementById('confettiHost');
  host.innerHTML = '';
  const colors = ['#10b981', '#f59e0b', '#38bdf8', '#f43f5e', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const bit = document.createElement('div');
    bit.className = 'confetti-bit';
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.backgroundColor = colors[i % colors.length];
    bit.style.animationDelay = `${Math.random() * 0.45}s`;
    host.appendChild(bit);
  }
}

function renderWeekBoxScore(wk) {
  document.getElementById('tickerWeek').textContent = `WEEK ${wk.week}`;
  document.getElementById('tickerOppName').textContent = `vs. ${wk.oppName}`;
  document.getElementById('tickerScore').textContent = `${wk.my.toFixed(1)} – ${wk.opp.toFixed(1)}`;
  const out = document.getElementById('tickerOutcome');
  out.textContent = wk.win ? 'WIN' : 'LOSS';
  out.className = `px-2 py-0.5 rounded font-black ${wk.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`;

  const maxP = Math.max(...wk.breakdown.map(b => b.pts));
  const minP = Math.min(...wk.breakdown.map(b => b.pts));
  document.getElementById('weekBoxScore').innerHTML = wk.breakdown.map(b => {
    const cls = b.pts === maxP ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
      : b.pts === minP && b.pts < 10 ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold'
      : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]';
    return `<span class="px-2 py-0.5 rounded border ${cls}">${b.slot} ${escapeHtml(b.name)} <strong>${b.pts.toFixed(1)}</strong></span>`;
  }).join('') + (wk.stackBonus > 0 ? `<span class="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-400 font-bold">⚡ Stack +${wk.stackBonus.toFixed(1)}</span>` : '');
}

function playSeasonSim(sim, instant = false) {
  if (state.simTimer) { clearTimeout(state.simTimer); state.simTimer = null; }
  document.getElementById('draftConsole').classList.add('hidden');
  document.getElementById('simStage').classList.remove('hidden');
  document.getElementById('postSimWrap').classList.add('hidden');
  document.getElementById('btnSkipSim').classList.remove('hidden');
  document.getElementById('simPPG').textContent = sim.avgPPG.toFixed(1);
  document.getElementById('simOptPct').textContent = `${sim.optPct.toFixed(0)}%`;
  document.getElementById('simStackBonus').textContent = `+${sim.stackBonus.toFixed(1)}`;

  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < 17; i++) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'py-1.5 rounded-md text-xs font-black tabular border border-[var(--border)] bg-[var(--content)] text-[var(--muted-foreground)] transition';
    c.textContent = `${i + 1}`;
    grid.appendChild(c);
    cells.push(c);
  }

  let curW = 0, curL = 0, idx = 0;
  function revealWeek(i, silent = false) {
    const wk = sim.weeks[i];
    if (wk.win) curW++; else curL++;
    const c = cells[i];
    c.textContent = wk.win ? 'W' : 'L';
    c.className = `py-1.5 rounded-md text-xs font-black tabular border cursor-pointer transition ${
      wk.win ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
             : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
    }`;
    c.addEventListener('mouseenter', () => renderWeekBoxScore(wk));
    c.addEventListener('click', () => renderWeekBoxScore(wk));
    renderWeekBoxScore(wk);
    document.getElementById('simRecord').textContent = `${curW}-${curL}`;
    if (!silent) { if (wk.win) SFX.winTick(); else SFX.lossTick(); }
  }

  function finalizeSim() {
    document.getElementById('btnSkipSim').classList.add('hidden');
    document.getElementById('postSimWrap').classList.remove('hidden');
    const tag = document.getElementById('simStatusTag');
    const verdict = document.getElementById('simVerdict');
    if (sim.wins === 17) {
      tag.textContent = '★ CERTIFIED BALL KNOWER 🏆 ★';
      tag.className = 'px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-amber-400 text-black';
      verdict.textContent = '17-0 Undefeated Fantasy Dynasty!';
      if (!instant) { SFX.fanfare(); launchConfetti(); }
    } else if (sim.wins >= 15) {
      tag.textContent = 'ELITE BALL KNOWLEDGE';
      tag.className = 'px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      verdict.textContent = sim.wins === 16 ? 'One game shy of 17-0!' : '1-Seed & Title Favorite';
    } else if (sim.wins >= 12) {
      tag.textContent = 'KNOWS BALL';
      tag.className = 'px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30';
      verdict.textContent = 'Playoff Lock — Solid Fantasy IQ';
    } else if (sim.wins >= 9) {
      tag.textContent = 'CASUAL';
      tag.className = 'px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-[var(--content)] text-[var(--foreground)] border border-[var(--border)]';
      verdict.textContent = 'Barely squeaked into the Wild Card';
    } else {
      tag.textContent = "DOESN'T KNOW BALL";
      tag.className = 'px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30';
      verdict.textContent = 'Rough week — run it back!';
    }
    renderCrowdOverlay();
  }

  if (instant) { for (let i = 0; i < 17; i++) revealWeek(i, true); finalizeSim(); return; }

  document.getElementById('simStatusTag').textContent = 'SIMULATING REAL WEEKLY LOGS...';
  document.getElementById('simVerdict').textContent = 'Playing 17-week schedule...';
  function stepWeek() {
    if (idx < 17) {
      revealWeek(idx, false); idx++;
      state.simTimer = setTimeout(stepWeek, (idx >= 14 && curL === 0) ? 280 : 130);
    } else { state.simTimer = null; finalizeSim(); }
  }
  stepWeek();
}

// ==================== RENDERING ====================
function updateHOFBadge() { document.getElementById('hofBadgeCount').textContent = state.stats.perfects || 0; }
function updateAccountBtn() {
  const btn = document.getElementById('btnAccount');
  if (state.user) {
    btn.textContent = `@${state.user.username}`;
    btn.className = 'px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-xs font-bold transition cursor-pointer';
  } else {
    btn.textContent = 'Sign In';
    btn.className = 'px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--content)] text-xs font-bold transition cursor-pointer';
  }
}

function renderChrome() {
  const act = 'bg-emerald-600 text-white';
  const inact = 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]';
  document.getElementById('btnModeDaily').className = `px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${state.mode === 'daily' ? act : inact}`;
  document.getElementById('btnModeUnlimited').className = `px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${state.mode === 'unlimited' ? act : inact}`;
  document.getElementById('headerSub').textContent = state.mode === 'daily'
    ? `Daily Challenge · ${getTodayUTC()} · Pure Trivia`
    : state.mode === 'challenge' ? '1v1 Friend Challenge' : 'Unlimited Mode · Pick Exact Seasons';

  document.querySelectorAll('.score-btn').forEach(btn => {
    btn.className = `score-btn px-2 py-1 rounded-md font-bold transition cursor-pointer ${btn.dataset.score === state.scoring ? act : inact}`;
  });
  updateHOFBadge();
  updateAccountBtn();
}

function renderDraftHeader() {
  document.getElementById('roundBanner').textContent = `PICK ${Math.min(7, state.round + 1)} OF 7`;
  const counts = {};
  for (let i = 0; i < SLOTS.length; i++) if (!state.roster[i]) counts[SLOTS[i].label] = (counts[SLOTS[i].label] || 0) + 1;
  document.getElementById('needSummary').textContent = 'Need ' + Object.entries(counts).map(([k, v]) => v > 1 ? `${v} ${k}` : k).join(', ');

  const stackPill = document.getElementById('stackAlertPill');
  stackPill.classList.toggle('hidden', state.spinning || state.round >= 7 || !hasStackOpportunity(state.spins[state.round]));

  const pips = document.getElementById('roundPips');
  pips.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('span');
    d.className = i < state.round ? 'w-2.5 h-2.5 rounded-full bg-emerald-500'
      : i === state.round ? 'w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-400/30'
      : 'w-2 h-2 rounded-full bg-[var(--border)]';
    pips.appendChild(d);
  }
  document.getElementById('btnRerollTeam').disabled = state.spinning || state.rerollsTeam <= 0;
  document.getElementById('btnRerollEra').disabled = state.spinning || state.rerollsEra <= 0;
  document.getElementById('rerollTeamLeft').textContent = state.rerollsTeam;
  document.getElementById('rerollEraLeft').textContent = state.rerollsEra;
}

function renderField() {
  let total = 0;
  const cfg = SCORE_CONFIG[state.scoring];
  const stacks = computeStacks(state.roster);

  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i], p = state.roster[i], mount = document.getElementById(`slot-${i}`);
    if (!p) {
      mount.innerHTML = `
        <div class="h-[88px] rounded-xl border-2 border-dashed border-white/25 bg-black/20 flex flex-col items-center justify-center gap-1 text-center px-2 slot-open-glow">
          <span class="px-2 py-0.5 rounded bg-white/15 text-xs font-black tracking-wider text-white">${slot.label}</span>
          <span class="text-[11px] font-medium text-white/55">${slot.label === 'FLEX' ? 'RB / WR / TE' : 'Open Spot'}</span>
        </div>`;
    } else {
      const ppg = p[state.scoring];
      total += ppg;
      const team = TEAMS[p.teamIdx];
      const grade = state.slotGrades[i] || 'A';
      const isStacked = stacks.stackedSlots.has(i);
      const parts = p.name.split(' ');
      const firstName = parts[0], lastName = parts.slice(1).join(' ') || parts[0];
      const isNew = i === state.lastDraftedSlot;

      mount.innerHTML = `
        <button type="button" data-slot="${i}" class="field-card w-full h-[88px] rounded-xl overflow-hidden border ${isStacked ? 'border-amber-300 ring-1 ring-amber-300/60 shadow-lg shadow-amber-500/20' : 'border-white/25 shadow-md'} bg-slate-950/85 hover:bg-slate-900/95 text-left flex flex-col justify-between transition cursor-pointer ${isNew ? 'card-snap' : ''}">
          <div class="px-2 py-1 flex items-center justify-between gap-1 text-[11px] font-black" style="background:${team.bg};color:${team.fg}">
            <span class="truncate">${slot.label} · ${team.id} '${String(p.year).slice(-2)}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${GRADE_STYLE[grade]}">${grade}</span>
          </div>
          <div class="px-2.5 py-1.5 flex items-end justify-between gap-1">
            <div class="min-w-0 leading-tight">
              <div class="text-[11px] text-white/65 truncate">${isStacked ? '⚡ ' : ''}${escapeHtml(firstName)}</div>
              <div class="text-xs sm:text-sm font-black text-white truncate">${escapeHtml(lastName)}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm sm:text-base font-black tabular ${grade === 'S' ? 'text-amber-300' : 'text-emerald-400'}">${ppg.toFixed(1)}</div>
            </div>
          </div>
        </button>`;
    }
  }

  document.querySelectorAll('.field-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = state.roster[Number(btn.dataset.slot)];
      if (!p) return;
      document.getElementById('inspectorBar').classList.remove('hidden');
      const hi = p.weeks ? (Math.max(...p.weeks) / 10).toFixed(1) : '—';
      const lo = p.weeks ? (Math.min(...p.weeks) / 10).toFixed(1) : '—';
      document.getElementById('inspectorText').innerHTML =
        `<strong>${escapeHtml(p.name)}</strong> (${p.pos}, ${p.year} ${p.team}, ${p.games}g) · ` +
        `<span class="text-[var(--muted-foreground)]">${escapeHtml(p.stat)}</span> · ` +
        `<strong class="text-emerald-400 tabular">${p[state.scoring].toFixed(2)} ${cfg.name} PPG</strong> ` +
        `<span class="text-[var(--muted-foreground)] tabular">(High ${hi} / Low ${lo})</span>`;
    });
  });

  const effectiveTotal = total + stacks.totalBonus;
  document.getElementById('fieldTotalPPG').textContent = effectiveTotal.toFixed(1);
  document.getElementById('fieldScoringTag').textContent = cfg.name;
  document.getElementById('fieldTargetLabel').textContent = `${cfg.target.toFixed(0)}+ PPG`;
  const stackBadge = document.getElementById('fieldStackBadge');
  if (stacks.totalBonus > 0) {
    stackBadge.classList.remove('hidden');
    stackBadge.textContent = `⚡ +${stacks.totalBonus.toFixed(1)} STACK`;
    stackBadge.title = stacks.labels.join(', ');
  } else stackBadge.classList.add('hidden');

  const bar = document.getElementById('fieldTargetBar');
  bar.style.width = `${Math.min(100, (effectiveTotal / cfg.target) * 100)}%`;
  bar.className = `h-full rounded-full transition-all duration-300 ${effectiveTotal >= cfg.target ? 'bg-emerald-400' : 'bg-amber-400'}`;
}

// ==================== SEARCH & HINTS ====================
function renderSearch(query) {
  const dd = document.getElementById('searchDropdown');
  if (state.spinning || state.round >= 7 || state.pendingPlayer) { dd.classList.add('hidden'); return; }
  const spin = state.spins[state.round];
  const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
  const q = normalizeName(query);

  let matches = [];
  if (state.showFullPool && state.mode === 'unlimited' && q.length < 2) {
    matches = pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  } else if (q.length < 2) { dd.classList.add('hidden'); state.dropdownMatches = []; return; }
  else {
    matches = pool.filter(p => p.norm.includes(q));
    matches.sort((a, b) => {
      const aS = a.norm.startsWith(q) || a.norm.split(' ').some(w => w.startsWith(q)) ? 0 : 1;
      const bS = b.norm.startsWith(q) || b.norm.split(' ').some(w => w.startsWith(q)) ? 0 : 1;
      return aS !== bS ? aS - bS : a.name.localeCompare(b.name);
    });
  }
  state.dropdownMatches = matches.slice(0, 35);
  state.activeDropdownIdx = state.dropdownMatches.findIndex(p => canDraftPlayer(p).ok);
  dd.classList.remove('hidden');
  if (!state.dropdownMatches.length) {
    dd.innerHTML = `<div class="px-4 py-3 text-xs text-[var(--muted-foreground)]">No qualifying player matching "${escapeHtml(query)}" for ${TEAMS[spin.teamIdx].id} (${ERA_LIST[spin.eraIdx]}).</div>`;
    return;
  }
  paintDropdownItems();
}

function paintDropdownItems() {
  const dd = document.getElementById('searchDropdown');
  dd.innerHTML = '';
  state.dropdownMatches.forEach((p, idx) => {
    const check = canDraftPlayer(p);
    const isAct = idx === state.activeDropdownIdx && check.ok;
    const yrBadge = p.seasons.length > 1 ? `${p.seasons.length} yrs` : `${p.seasons[0].year}`;
    const row = document.createElement('button');
    row.type = 'button'; row.disabled = !check.ok;
    row.className = `w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition ${
      !check.ok ? 'opacity-40 cursor-not-allowed' : isAct ? 'bg-[var(--content)] cursor-pointer' : 'hover:bg-[var(--content)] cursor-pointer'
    }`;
    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-8 text-center py-0.5 rounded text-[11px] font-black shrink-0 ${POS_CHIP[p.pos]}">${p.pos}</span>
        <span class="text-sm font-bold truncate">${escapeHtml(p.name)}</span>
        <span class="text-[11px] text-[var(--muted-foreground)] tabular shrink-0">(${yrBadge})</span>
      </div>
      <span class="text-xs font-bold shrink-0 ${check.ok ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}">
        ${check.ok ? (p.seasons.length > 1 ? 'Pick Year →' : `→ ${SLOTS[check.slotIdx].label}`) : check.reason}
      </span>`;
    if (check.ok) {
      row.addEventListener('mouseenter', () => { state.activeDropdownIdx = idx; });
      row.addEventListener('click', () => selectPlayerForSeason(p));
    }
    dd.appendChild(row);
  });
}

function toggleHint() {
  if (state.spinning || state.round >= 7) return;
  const drawer = document.getElementById('hintDrawer');
  drawer.classList.toggle('hidden');
  document.getElementById('btnRevealPool').classList.toggle('hidden', state.mode !== 'unlimited');
  if (!drawer.classList.contains('hidden')) {
    const spin = state.spins[state.round];
    const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
    const open = getEligiblePositions(), cfg = SCORE_CONFIG[state.scoring];
    const top = pool.filter(p => open.has(p.pos) && !state.roster.some(r => r && r.name === p.name))
      .map(p => ({ p, vorp: getSeasonPPG(getPeakSeason(p)) - cfg.base[p.pos] }))
      .sort((a, b) => b.vorp - a.vorp).slice(0, 4);
    document.getElementById('hintPills').innerHTML = top.map(({ p }) => {
      const init = p.name.split(' ').map(w => w[0] + '.').join(' ');
      return `<span class="px-2 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono font-bold">${p.pos} ${init}</span>`;
    }).join('');
  }
}

// ==================== MODALS: LEADERBOARD, HOF, AUTH ====================
async function openLeaderboard() {
  document.getElementById('lbModal').classList.remove('hidden');
  document.getElementById('lbSub').textContent = `Loading ${getTodayUTC()} (${SCORE_CONFIG[state.scoring].name})...`;
  try {
    const data = await api(`/api/daily/leaderboard?date=${getTodayUTC()}&scoring=${state.scoring}`);
    document.getElementById('lbSub').textContent = `${data.date} · ${SCORE_CONFIG[data.scoring].name} · ${data.totalPlayers} completed drafts`;
    document.getElementById('lbSummaryGrid').innerHTML = `
      <div class="rounded-xl border border-[var(--border)] bg-[var(--content)] p-2.5"><div class="text-[11px] text-[var(--muted-foreground)] font-bold">Players</div><div class="text-lg font-black tabular">${data.totalPlayers}</div></div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--content)] p-2.5"><div class="text-[11px] text-[var(--muted-foreground)] font-bold">17-0s</div><div class="text-lg font-black tabular text-amber-400">${data.perfects}</div></div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--content)] p-2.5"><div class="text-[11px] text-[var(--muted-foreground)] font-bold">Avg Wins</div><div class="text-lg font-black tabular">${data.avgWins}</div></div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--content)] p-2.5"><div class="text-[11px] text-[var(--muted-foreground)] font-bold">Avg PPG</div><div class="text-lg font-black tabular">${data.avgPPG}</div></div>`;

    const list = document.getElementById('lbLeaders');
    if (!data.leaders.length) {
      list.innerHTML = `<div class="py-4 text-center text-[var(--muted-foreground)]">No Daily drafts submitted yet today — be the first!</div>`;
    } else {
      list.innerHTML = data.leaders.map((r, i) => `
        <a href="/r/${r.shortCode}" class="py-2 flex items-center justify-between gap-2 hover:opacity-85">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-6 font-black tabular text-[var(--muted-foreground)]">#${i + 1}</span>
            <span class="font-bold truncate">${r.isAccount ? '@' : ''}${escapeHtml(r.displayName)}</span>
            <span class="text-[11px] font-mono text-[var(--muted-foreground)]">${r.grades.join('')}</span>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 tabular">
            <span class="font-black ${r.wins === 17 ? 'text-amber-400' : 'text-emerald-400'}">${r.wins}-${r.losses}</span>
            <span class="font-bold">${r.avgPPG.toFixed(1)} PPG</span>
          </div>
        </a>`).join('');
    }

    document.getElementById('lbPopular').innerHTML = data.popularByRound.filter(r => r.top.length).map(r => `
      <div class="rounded-lg border border-[var(--border)] bg-[var(--content)] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <span class="font-bold text-[var(--muted-foreground)]">Rd ${r.roundIdx + 1} · ${r.top[0].teamId} ${r.top[0].eraLabel}</span>
        <div class="flex flex-wrap gap-1.5">
          ${r.top.map(p => `<span class="px-2 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-semibold">${escapeHtml(p.playerName)} '${String(p.playerYear).slice(-2)} <strong class="text-emerald-400">${p.pct}%</strong></span>`).join('')}
        </div>
      </div>`).join('') || `<div class="text-[var(--muted-foreground)]">Complete today’s Daily to populate crowd pick rates.</div>`;
  } catch (err) {
    document.getElementById('lbSub').textContent = err.message;
  }
}

async function openHOF() {
  document.getElementById('hofModal').classList.remove('hidden');
  try {
    const data = await api('/api/history');
    state.stats = data.stats; updateHOFBadge();
    document.getElementById('statPerfects').textContent = data.stats.perfects;
    document.getElementById('statStreak').textContent = data.stats.streak;
    document.getElementById('statBestRec').textContent = data.stats.bestWins >= 0 ? `${data.stats.bestWins}-${17 - data.stats.bestWins}` : '—';
    document.getElementById('statHighPPG').textContent = data.stats.highPPG > 0 ? data.stats.highPPG.toFixed(1) : '—';

    const list = document.getElementById('hofList');
    if (!data.runs.length) {
      list.innerHTML = `<div class="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[var(--muted-foreground)]">Finish a draft to save your first squad to SQLite!</div>`;
    } else {
      list.innerHTML = data.runs.map(s => `
        <a href="/r/${s.shortCode}" class="block rounded-xl border border-[var(--border)] bg-[var(--content)] hover:border-emerald-500/50 p-3 space-y-1 transition">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-black text-sm tabular ${s.wins === 17 ? 'text-amber-400' : 'text-emerald-400'}">${s.wins}-${s.losses}</span>
              <span class="font-bold tabular">${s.avgPPG.toFixed(1)} PPG</span>
              ${s.stackBonus > 0 ? `<span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[11px]">⚡ +${s.stackBonus.toFixed(1)}</span>` : ''}
            </div>
            <span class="text-[var(--muted-foreground)]">${s.mode} · ${s.scoring.toUpperCase()} · ${s.boardDate}</span>
          </div>
          <div class="text-[11px] text-[var(--muted-foreground)] truncate">${escapeHtml(s.roster.map(p => `${p.name} '${String(p.year).slice(-2)}`).join(' · '))}</div>
        </a>`).join('');
    }
  } catch (err) { console.error(err); }
}

function openAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  if (state.user) {
    document.getElementById('authSignedIn').classList.remove('hidden');
    document.getElementById('authForm').classList.add('hidden');
    document.getElementById('authUsernameLabel').textContent = `@${state.user.username}`;
  } else {
    document.getElementById('authSignedIn').classList.add('hidden');
    document.getElementById('authForm').classList.remove('hidden');
  }
}

function setAuthTab(mode) {
  state.authMode = mode;
  document.getElementById('tabLogin').className = `flex-1 py-1.5 rounded-md font-bold cursor-pointer ${mode === 'login' ? 'bg-emerald-600 text-white' : 'text-[var(--muted-foreground)]'}`;
  document.getElementById('tabRegister').className = `flex-1 py-1.5 rounded-md font-bold cursor-pointer ${mode === 'register' ? 'bg-emerald-600 text-white' : 'text-[var(--muted-foreground)]'}`;
  document.getElementById('btnAuthSubmit').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}

// ==================== SHARE & CHALLENGE ACTIONS ====================
function flashToast(msg = 'Copied!') {
  const el = document.getElementById('copyToast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

function copyShareLink() {
  const url = state.lastSavedCode ? `${window.location.origin}/r/${state.lastSavedCode}` : window.location.href;
  navigator.clipboard.writeText(url).then(() => flashToast('Share link copied!'));
}

function copyShareCard() {
  const sim = state.lastSim;
  if (!sim) return;
  const tag = state.mode === 'daily' ? `Daily ${getTodayUTC()}` : 'Unlimited';
  const sq = sim.weeks.map(w => w.win ? '🟩' : '🟥').join('');
  const grades = state.picksByRound.map(p => p.grade).join('');
  const link = state.lastSavedCode ? `${window.location.origin}/r/${state.lastSavedCode}` : '';
  const text = [
    `🏈 KNOW BALL — Fantasy Draft (${tag} · ${SCORE_CONFIG[state.scoring].name})`,
    `Record: ${sim.wins}-${sim.losses} | ${sim.avgPPG.toFixed(1)} PPG (${sim.optPct.toFixed(0)}% Optimal) | Grades: ${grades}`,
    sim.stackBonus > 0 ? `⚡ Stack Bonus: +${sim.stackBonus.toFixed(1)} PPG/wk` : null,
    sq,
    link || null,
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(text).then(() => flashToast('Text card copied!'));
}

async function createChallengeLink() {
  if (!state.lastSavedCode) return;
  try {
    const res = await api('/api/challenges', { method: 'POST', body: JSON.stringify({ shortCode: state.lastSavedCode }) });
    const url = `${window.location.origin}/c/${res.code}`;
    await navigator.clipboard.writeText(url);
    flashToast('1v1 Challenge link copied!');
  } catch (err) { flashToast(err.message); }
}

// ==================== HYDRATE SHARED RUN (/r/:code) OR DAILY LOCK ====================
function displaySavedRun(run, crowd, bannerMsg = null) {
  state.mode = run.mode;
  state.scoring = run.scoring;
  state.spins = run.spins;
  state.roster = run.roster;
  state.slotGrades = run.grades;
  state.round = 7;
  state.lastSavedCode = run.shortCode;
  state.lastCrowd = crowd;
  state.picksByRound = run.spins.map((spin, i) => ({
    spin, player: run.roster[i], slotIdx: i, grade: run.grades[i] || 'A'
  }));
  const optimal = computeOptimalLineup(run.spins);
  state.lastSim = {
    wins: run.wins, losses: run.losses, avgPPG: run.avgPPG, basePPG: run.basePPG,
    stackBonus: run.stackBonus, optPct: run.optPct, optimal, weeks: run.weeks,
  };
  if (bannerMsg) {
    document.getElementById('contextBanner').classList.remove('hidden');
    document.getElementById('contextBannerText').textContent = bannerMsg;
  }
  renderChrome();
  renderField();
  playSeasonSim(state.lastSim, true);
}

// ==================== EVENTS ====================
document.getElementById('btnModeDaily').addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  loadDailyOrStart();
});
document.getElementById('btnModeUnlimited').addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  startDraft('unlimited');
});
document.getElementById('btnRunBack').addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  startDraft('unlimited');
});
document.getElementById('btnContextAction').addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  document.getElementById('contextBanner').classList.add('hidden');
  loadDailyOrStart();
});
document.getElementById('btnRerollTeam').addEventListener('click', rerollTeam);
document.getElementById('btnRerollEra').addEventListener('click', rerollEra);
document.getElementById('btnHint').addEventListener('click', toggleHint);
document.getElementById('btnCancelYear').addEventListener('click', () => {
  state.pendingPlayer = null;
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  document.getElementById('playerSearch').focus();
});
document.getElementById('btnCopyLink').addEventListener('click', copyShareLink);
document.getElementById('btnCopyShare').addEventListener('click', copyShareCard);
document.getElementById('btnChallengeFriend').addEventListener('click', createChallengeLink);
document.getElementById('btnSkipSim').addEventListener('click', () => playSeasonSim(state.lastSim, true));
document.getElementById('btnCloseInspector').addEventListener('click', () => document.getElementById('inspectorBar').classList.add('hidden'));

document.getElementById('btnLeaderboard').addEventListener('click', openLeaderboard);
document.getElementById('btnCloseLB').addEventListener('click', () => document.getElementById('lbModal').classList.add('hidden'));
document.getElementById('lbModal').addEventListener('click', (e) => { if (e.target.id === 'lbModal') document.getElementById('lbModal').classList.add('hidden'); });

document.getElementById('btnHOF').addEventListener('click', openHOF);
document.getElementById('btnCloseHOF').addEventListener('click', () => document.getElementById('hofModal').classList.add('hidden'));
document.getElementById('hofModal').addEventListener('click', (e) => { if (e.target.id === 'hofModal') document.getElementById('hofModal').classList.add('hidden'); });

document.getElementById('btnAccount').addEventListener('click', openAuthModal);
document.getElementById('btnCloseAuth').addEventListener('click', () => document.getElementById('authModal').classList.add('hidden'));
document.getElementById('authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') document.getElementById('authModal').classList.add('hidden'); });
document.getElementById('tabLogin').addEventListener('click', () => setAuthTab('login'));
document.getElementById('tabRegister').addEventListener('click', () => setAuthTab('register'));

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('authError');
  errEl.classList.add('hidden');
  try {
    const endpoint = state.authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('authUser').value,
        password: document.getElementById('authPass').value,
      }),
    });
    state.user = res.user;
    state.stats = res.stats;
    document.getElementById('authPass').value = '';
    updateAccountBtn();
    updateHOFBadge();
    document.getElementById('authModal').classList.add('hidden');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  state.user = null;
  updateAccountBtn();
  document.getElementById('authModal').classList.add('hidden');
});

document.getElementById('btnSound').addEventListener('click', (e) => {
  SFX.enabled = !SFX.enabled;
  e.target.textContent = SFX.enabled ? '🔊' : '🔇';
});
document.getElementById('btnRevealPool').addEventListener('click', () => {
  if (state.mode !== 'unlimited') return;
  state.showFullPool = true;
  renderSearch(document.getElementById('playerSearch').value);
});

document.querySelectorAll('.score-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.scoring = btn.dataset.score;
    renderChrome();
    renderField();
    if (state.round >= 7 && state.mode === 'unlimited') playSeasonSim(buildRealWeeklySim(), true);
    else if (state.mode === 'daily' && state.round === 0) loadDailyOrStart();
  });
});

document.getElementById('playerSearch').addEventListener('input', (e) => renderSearch(e.target.value));
document.getElementById('playerSearch').addEventListener('keydown', (e) => {
  if (!state.dropdownMatches.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    let next = state.activeDropdownIdx;
    for (let k = 0; k < state.dropdownMatches.length; k++) {
      next = (next + 1) % state.dropdownMatches.length;
      if (canDraftPlayer(state.dropdownMatches[next]).ok) { state.activeDropdownIdx = next; break; }
    }
    paintDropdownItems();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    let prev = state.activeDropdownIdx;
    for (let k = 0; k < state.dropdownMatches.length; k++) {
      prev = (prev - 1 + state.dropdownMatches.length) % state.dropdownMatches.length;
      if (canDraftPlayer(state.dropdownMatches[prev]).ok) { state.activeDropdownIdx = prev; break; }
    }
    paintDropdownItems();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const cand = state.dropdownMatches[state.activeDropdownIdx];
    if (cand && canDraftPlayer(cand).ok) selectPlayerForSeason(cand);
  }
});

function openHelpModal(isFirstVisit = false) {
  document.getElementById('btnCloseHelp').textContent = isFirstVisit ? 'Start Drafting →' : 'Back to Draft';
  document.getElementById('helpModal').classList.remove('hidden');
}
function closeHelpModal() {
  document.getElementById('helpModal').classList.add('hidden');
  try { localStorage.setItem(RULES_SEEN_KEY, '1'); } catch (_) {}
  if (state.waitingForWelcome) { state.waitingForWelcome = false; animateSpin(true, true); }
}
document.getElementById('btnHelp').addEventListener('click', () => openHelpModal(false));
document.getElementById('btnCloseHelp').addEventListener('click', closeHelpModal);
document.getElementById('helpModal').addEventListener('click', (e) => { if (e.target.id === 'helpModal') closeHelpModal(); });

// ==================== BOOT ====================
async function loadDailyOrStart(deferForWelcome = false) {
  try {
    const me = await api(`/api/me?date=${getTodayUTC()}&scoring=${state.scoring}`);
    state.user = me.user;
    state.stats = me.stats;
    if (me.todayDaily) {
      displaySavedRun(me.todayDaily.run, me.todayDaily.crowd, `Today’s Daily (${getTodayUTC()}) is locked in! Play Unlimited or check the Leaderboard.`);
      return;
    }
  } catch (_) {}
  startDraft('daily', { deferSpin: deferForWelcome });
}

async function boot() {
  // 1. Load 6,421 player-seasons from /api/players
  const raw = await api('/api/players');
  PLAYERS = raw.map((r, i) => ({
    idx: i, name: r[0], norm: normalizeName(r[0]), pos: POS_LIST[r[1]],
    teamIdx: r[2], team: TEAMS[r[2]].id, eraIdx: r[3], era: ERA_LIST[r[3]],
    seasons: r[4].map(s => ({ year: s[0], games: s[1], ppr: s[2], half: s[3], std: s[4], stat: s[5], weeks: s[6] })),
  }));
  for (const p of PLAYERS) {
    const k = `${p.teamIdx}-${p.eraIdx}`;
    if (!POOL_MAP.has(k)) POOL_MAP.set(k, []);
    POOL_MAP.get(k).push(p);
  }

  // 2. Check identity
  try {
    const me = await api(`/api/me?date=${getTodayUTC()}&scoring=${state.scoring}`);
    state.user = me.user; state.stats = me.stats;
  } catch (_) {}
  renderChrome();

  // 3. Handle /r/:code (shared run) or /c/:code (1v1 challenge)
  const path = window.location.pathname;
  const runMatch = path.match(/^\/r\/([a-zA-Z0-9_-]+)$/);
  const chMatch = path.match(/^\/c\/([a-zA-Z0-9_-]+)$/);

  if (runMatch) {
    try {
      const data = await api(`/api/runs/${runMatch[1]}`);
      displaySavedRun(data.run, data.crowd, `Viewing ${data.run.isAccount ? '@' : ''}${data.run.displayName}’s ${data.run.wins}-${data.run.losses} squad (${data.run.scoring.toUpperCase()})`);
      return;
    } catch (_) {}
  }

  if (chMatch) {
    try {
      const ch = await api(`/api/challenges/${chMatch[1]}`);
      document.getElementById('contextBanner').classList.remove('hidden');
      document.getElementById('contextBannerText').textContent = `⚔️ 1v1 Challenge from ${ch.creatorName} — Draft these exact 7 spins (${ch.scoring.toUpperCase()}, no rerolls)!`;
      startDraft('challenge', { fixedSpins: ch.spins, scoring: ch.scoring, challengeCode: ch.code, challengeMeta: ch });
      return;
    } catch (_) {}
  }

  let seenRules = false;
  try { seenRules = localStorage.getItem(RULES_SEEN_KEY) === '1'; } catch (_) {}
  if (!seenRules) {
    state.waitingForWelcome = true;
    await loadDailyOrStart(true);
    if (state.round === 0) openHelpModal(true);
    else state.waitingForWelcome = false;
  } else {
    await loadDailyOrStart(false);
  }
}

boot();
