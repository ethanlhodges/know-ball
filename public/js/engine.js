import {
  ERA_LIST,
  OPP_NAMES,
  SCORE_CONFIG,
  SLOTS,
  TEAMS,
  getTodayUTC,
  hashString,
  mulberry32,
  randNormal,
} from './data.js';

export function getSeasonPPG(season, scoring) {
  return season[scoring];
}

export function getPeakSeason(player, scoring) {
  let best = player.seasons[0];
  for (const s of player.seasons) {
    if (s[scoring] > best[scoring]) best = s;
  }
  return best;
}

export function computeStacks(roster) {
  const qb = roster[0];
  if (!qb) return { totalBonus: 0, stackedSlots: new Set(), labels: [] };
  let totalBonus = 0;
  const stackedSlots = new Set();
  const labels = [];
  for (let i = 1; i < roster.length; i++) {
    const p = roster[i];
    if (!p) continue;
    if ((p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === qb.teamIdx) {
      if (p.year === qb.year) {
        totalBonus += 4.0;
        stackedSlots.add(0);
        stackedSlots.add(i);
        labels.push(`${qb.team} '${String(qb.year).slice(-2)} Exact Stack (+4.0)`);
      } else if (p.eraIdx === qb.eraIdx) {
        totalBonus += 2.5;
        stackedSlots.add(0);
        stackedSlots.add(i);
        labels.push(`${qb.team} ${qb.era} Stack (+2.5)`);
      }
    }
  }
  return { totalBonus, stackedSlots, labels };
}

export function getEligiblePositions(roster) {
  const s = new Set();
  for (let i = 0; i < SLOTS.length; i++) {
    if (!roster[i]) SLOTS[i].accepts.forEach(p => s.add(p));
  }
  return s;
}

export function hasStackOpportunity(roster, spin) {
  const qb = roster[0];
  const openPos = getEligiblePositions(roster);
  if (qb && qb.teamIdx === spin.teamIdx && qb.eraIdx === spin.eraIdx && (openPos.has('WR') || openPos.has('TE'))) {
    return true;
  }
  if (!qb && openPos.has('QB')) {
    return roster.some(p => p && (p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === spin.teamIdx && p.eraIdx === spin.eraIdx);
  }
  return false;
}

export function wouldExactStack(roster, player, year) {
  const qb = roster[0];
  if (player.pos === 'QB') {
    return roster.some(p => p && (p.pos === 'WR' || p.pos === 'TE') && p.teamIdx === player.teamIdx && p.year === year);
  }
  return (player.pos === 'WR' || player.pos === 'TE') && qb && qb.teamIdx === player.teamIdx && qb.year === year;
}

export function findOpenSlotForPos(roster, pos) {
  for (let i = 0; i < 6; i++) {
    if (!roster[i] && SLOTS[i].accepts.includes(pos)) return i;
  }
  if (!roster[6] && SLOTS[6].accepts.includes(pos)) return 6;
  return -1;
}

export function canDraftPlayer(roster, player) {
  if (roster.some(p => p && p.name === player.name)) return { ok: false, reason: 'Drafted' };
  const slotIdx = findOpenSlotForPos(roster, player.pos);
  if (slotIdx === -1) return { ok: false, reason: `No ${player.pos} spot` };
  return { ok: true, slotIdx };
}

export function gradePick(roster, poolMap, scoring, player, season, spin, gainedStack) {
  const cfg = SCORE_CONFIG[scoring];
  const openPos = getEligiblePositions(roster);
  const pool = poolMap.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
  let bestVorp = -1e9;
  for (const cand of pool) {
    if (!openPos.has(cand.pos) || roster.some(r => r && r.name === cand.name)) continue;
    const vorp = getPeakSeason(cand, scoring)[scoring] - cfg.base[cand.pos];
    if (vorp > bestVorp) bestVorp = vorp;
  }
  const gap = Math.max(0, bestVorp - (season[scoring] + gainedStack - cfg.base[player.pos]));
  if (gap <= 2.2) return 'S';
  if (gap <= 4.8) return 'A';
  if (gap <= 7.8) return 'B';
  if (gap <= 11.5) return 'C';
  return 'F';
}

export function generateInitialSpins(rng) {
  const all = [];
  for (let t = 0; t < TEAMS.length; t++) {
    for (let e = 0; e < ERA_LIST.length; e++) all.push({ teamIdx: t, eraIdx: e });
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 7);
}

export function computeOptimalLineup(spins, poolMap, scoring) {
  const N = 7;
  const FULL = (1 << N) - 1;
  const dp = Array.from({ length: N + 1 }, () => new Float64Array(1 << N).fill(-1e9));
  const parent = Array.from({ length: N + 1 }, () => new Array(1 << N).fill(null));
  dp[0][0] = 0;

  for (let r = 0; r < N; r++) {
    const pool = poolMap.get(`${spins[r].teamIdx}-${spins[r].eraIdx}`) || [];
    const bestForSlot = new Array(N).fill(null);
    for (let s = 0; s < N; s++) {
      let best = null;
      let bestVal = -1;
      for (const p of pool) {
        if (!SLOTS[s].accepts.includes(p.pos)) continue;
        const pk = getPeakSeason(p, scoring);
        const val = pk[scoring];
        if (val > bestVal) {
          bestVal = val;
          best = { name: p.name, pos: p.pos, year: pk.year, ppg: val };
        }
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

export function getPlayer17WeekLog(player, scoring, rng) {
  const cfg = SCORE_CONFIG[scoring];
  const scale = player.ppr > 0 ? (player[scoring] / player.ppr) : 1;
  const raw = player.weeks.map(x => Math.round((x / 10.0) * scale * 10) / 10);
  const seasonCap = player.year >= 2021 ? 17 : 16;
  const missed = Math.max(0, seasonCap - raw.length);
  const waiverWeeks = missed >= 4 ? Math.min(4, Math.floor(missed / 2)) : 0;

  const log = raw.map(pts => ({ pts, waiver: false }));
  for (let i = 0; i < waiverWeeks; i++) {
    log.push({ pts: Math.round((cfg.waiver + (rng() - 0.5) * 4.0) * 10) / 10, waiver: true });
  }
  let idx = 0;
  while (log.length < 17) {
    log.push({ pts: raw[idx % raw.length], waiver: false });
    idx++;
  }
  const out = log.slice(0, 17);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildRealWeeklySim({ roster, spins, poolMap, mode, scoring, draftSeed, challengeCode }) {
  const cfg = SCORE_CONFIG[scoring];
  const stacks = computeStacks(roster);
  const oppSeed = mode === 'daily'
    ? hashString('nfl-opp-v3-' + getTodayUTC() + '-' + scoring)
    : mode === 'challenge'
      ? hashString('nfl-opp-ch-' + challengeCode + '-' + scoring)
      : hashString('nfl-opp-u3-' + draftSeed + '-' + scoring);
  const oppRng = mulberry32(oppSeed);
  const logRng = mulberry32(hashString(roster.map(p => `${p.name}-${p.year}`).join('|') + scoring));
  const playerLogs = roster.map(p => getPlayer17WeekLog(p, scoring, logRng));

  let wins = 0;
  let totalMy = 0;
  const weeks = [];
  for (let w = 0; w < 17; w++) {
    const breakdown = roster.map((p, sIdx) => ({
      slot: SLOTS[sIdx].label,
      name: p.name.split(' ').slice(-1)[0],
      pts: playerLogs[sIdx][w].pts,
      waiver: playerLogs[sIdx][w].waiver,
    }));
    const my = Math.round((breakdown.reduce((a, b) => a + b.pts, 0) + stacks.totalBonus) * 10) / 10;
    const opp = Math.round(Math.max(72, cfg.oppMean + randNormal(oppRng) * cfg.oppSd) * 10) / 10;
    const win = my >= opp;
    if (win) wins++;
    totalMy += my;
    weeks.push({ week: w + 1, oppName: OPP_NAMES[w], my, opp, win, breakdown, stackBonus: stacks.totalBonus });
  }

  const optimal = computeOptimalLineup(spins, poolMap, scoring);
  const basePPG = roster.reduce((a, p) => a + p[scoring], 0);
  const avgPPG = totalMy / 17;
  const optPct = Math.min(100, (basePPG / optimal.total) * 100);
  return { wins, losses: 17 - wins, avgPPG, basePPG, stackBonus: stacks.totalBonus, optPct, optimal, weeks };
}
