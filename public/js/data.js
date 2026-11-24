// ==================== SOUND ENGINE ====================
export const SFX = {
  enabled: true,
  ctx: null,
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
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch (_) {}
  },
  tick() { this.tone(520 + Math.random() * 140, 0.035, 'square', 0.02); },
  lock() { this.tone(190, 0.09, 'triangle', 0.08); this.tone(380, 0.07, 'sine', 0.05, 0.03); },
  draft(grade) {
    this.tone(440, 0.09, 'triangle', 0.07, 0);
    if (grade === 'S' || grade === 'A') this.tone(554.37, 0.11, 'triangle', 0.07, 0.06);
    if (grade === 'S') {
      this.tone(659.25, 0.14, 'triangle', 0.08, 0.12);
      this.tone(880, 0.22, 'sine', 0.08, 0.18);
    }
  },
  stack() { this.tone(587.33, 0.1, 'sine', 0.08, 0.16); this.tone(880, 0.18, 'sine', 0.08, 0.24); },
  winTick() { this.tone(620, 0.06, 'sine', 0.04); },
  lossTick() { this.tone(210, 0.12, 'sawtooth', 0.045); },
  fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.08, i * 0.08)); },
};

// ==================== METADATA ====================
export const POS_LIST = ['QB', 'RB', 'WR', 'TE'];
export const ERA_LIST = ['1999–04', '2005–09', '2010–14', '2015–19', '2020–25'];
export const ERA_SUB  = ['1999–2004 seasons', '2005–2009 seasons', '2010–2014 seasons', '2015–2019 seasons', '2020–2025 seasons'];
export const OPP_NAMES = [
  '4th & Inches', 'Waiver Wire Sharks', 'Sunday Scaries', 'Bye Week Blues',
  'Two-Minute Drill', 'Red Zone Vultures', 'Garbage Time Kings', 'Hail Mary Club',
  'Checkdown Charlie', 'Zero-RB Mafia', 'Flex Appeal', 'Goal Line Stand',
  'Monday Night Miracle', 'Taco Tuesday', 'Commissioner’s Pet', 'Playoff Bound', 'Championship Boss',
];

export const TEAMS = [
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

export const SLOTS = [
  { id: 'QB',   label: 'QB',   accepts: ['QB'] },
  { id: 'RB1',  label: 'RB',   accepts: ['RB'] },
  { id: 'RB2',  label: 'RB',   accepts: ['RB'] },
  { id: 'WR1',  label: 'WR',   accepts: ['WR'] },
  { id: 'WR2',  label: 'WR',   accepts: ['WR'] },
  { id: 'TE',   label: 'TE',   accepts: ['TE'] },
  { id: 'FLEX', label: 'FLEX', accepts: ['RB', 'WR', 'TE'] },
];

export const SCORE_CONFIG = {
  ppr:  { name: 'PPR',      target: 155.0, oppMean: 118.0, oppSd: 16.5, waiver: 7.5, base: { QB: 17.5, RB: 13.5, WR: 13.5, TE: 9.5 } },
  half: { name: 'HALF-PPR', target: 138.0, oppMean: 105.0, oppSd: 15.0, waiver: 6.5, base: { QB: 17.0, RB: 11.8, WR: 11.0, TE: 8.0 } },
  std:  { name: 'STD',      target: 123.0, oppMean: 93.0,  oppSd: 14.0, waiver: 5.5, base: { QB: 16.5, RB: 10.2, WR: 8.8,  TE: 6.5 } },
};

export const POS_CHIP = {
  QB: 'bg-rose-500 text-white',
  RB: 'bg-emerald-500 text-white',
  WR: 'bg-sky-500 text-white',
  TE: 'bg-amber-500 text-black',
};

export const GRADE_STYLE = {
  S: 'bg-amber-400 text-black',
  A: 'bg-emerald-500 text-white',
  B: 'bg-sky-500 text-white',
  C: 'bg-orange-400 text-black',
  F: 'bg-rose-500 text-white',
};

export const RULES_SEEN_KEY = 'nfl_17_0_seen_rules_v1';
export const DIFFICULTY_KEY = 'knowball_difficulty';

// ==================== UTILITIES ====================
export function normalizeName(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randNormal(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function trackEvent(name, params = {}) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  } catch (_) {}
}

export async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
