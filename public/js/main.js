import {
  DIFFICULTY_KEY,
  ERA_LIST,
  ERA_SUB,
  GRADE_STYLE,
  POS_CHIP,
  POS_LIST,
  RULES_SEEN_KEY,
  SCORE_CONFIG,
  SFX,
  SLOTS,
  TEAMS,
  api,
  escapeHtml,
  getTodayUTC,
  hashString,
  mulberry32,
  normalizeName,
  trackEvent,
} from './data.js';
import {
  buildRealWeeklySim,
  canDraftPlayer,
  computeOptimalLineup,
  computeStacks,
  generateInitialSpins,
  getEligiblePositions,
  getPeakSeason,
  getSeasonPPG,
  gradePick,
  hasStackOpportunity,
  wouldExactStack,
} from './engine.js';
import { initModals } from './modals.js';

let PLAYERS = [];
const POOL_MAP = new Map();

let savedDifficulty = 'pro';
try {
  if (localStorage.getItem(DIFFICULTY_KEY) === 'casual') savedDifficulty = 'casual';
} catch (_) {}

const state = {
  user: null,
  stats: { totalRuns: 0, perfects: 0, bestWins: -1, highPPG: 0, streak: 0 },
  mode: 'daily', // 'daily' | 'unlimited' | 'challenge'
  scoring: 'half',
  difficulty: savedDifficulty, // 'pro' | 'casual'
  runDifficulty: savedDifficulty,
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
  spinTimer: null,
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
  hintedRounds: new Set(),
  hintsUsed: 0,
};

// ==================== TIMER & LIFECYCLE ====================
function cancelSpin() {
  if (state.spinTimer) {
    clearTimeout(state.spinTimer);
    state.spinTimer = null;
  }
  state.spinning = false;
}

function updateSearchPlaceholder(spin) {
  if (!spin) return;
  const search = document.getElementById('playerSearch');
  const tName = TEAMS[spin.teamIdx].name.split(' ').pop();
  search.placeholder = state.difficulty === 'casual'
    ? `Filter ${ERA_LIST[spin.eraIdx]} ${tName} players below...`
    : `Draft a ${ERA_LIST[spin.eraIdx]} ${tName} player...`;
}

function startDraft(mode = state.mode, opts = {}) {
  cancelSpin();
  if (state.simTimer) {
    clearTimeout(state.simTimer);
    state.simTimer = null;
  }
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
  state.pendingPlayer = null;
  state.lastDraftedSlot = -1;
  state.lastSim = null;
  state.lastSavedCode = null;
  state.lastCrowd = null;
  state.hintedRounds = new Set();
  state.hintsUsed = 0;
  state.runDifficulty = state.difficulty;

  document.getElementById('draftConsole').classList.remove('hidden');
  document.getElementById('simStage').classList.add('hidden');
  document.getElementById('h2hBanner').classList.add('hidden');
  document.getElementById('challengePanel').classList.add('hidden');
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  document.getElementById('inspectorBar').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  document.getElementById('casualPoolWrap').classList.add('hidden');
  if (mode !== 'challenge') document.getElementById('contextBanner').classList.add('hidden');

  renderChrome();
  renderField();
  if (opts.deferSpin) {
    paintTeamReel(state.spins[0].teamIdx);
    paintEraReel(state.spins[0].eraIdx);
    updateSearchPlaceholder(state.spins[0]);
    renderDraftHeader();
    renderCasualPool('');
  } else {
    animateSpin(true, true);
  }
}

// ==================== SLOT MACHINE ====================
function paintTeamReel(teamIdx) {
  const team = TEAMS[teamIdx];
  const reel = document.getElementById('teamReel');
  reel.style.backgroundColor = team.bg;
  reel.style.color = team.fg;
  document.getElementById('teamAbbrev').textContent = team.id;
  document.getElementById('teamFullName').textContent = team.name;
  document.getElementById('teamNote').textContent = team.note || 'Real 1999–2025 game logs';
}

function paintEraReel(eraIdx) {
  document.getElementById('eraMain').textContent = ERA_LIST[eraIdx];
  document.getElementById('eraSub').textContent = ERA_SUB[eraIdx];
}

function animateSpin(spinTeam, spinEra) {
  cancelSpin();
  state.spinning = true;
  state.pendingPlayer = null;
  document.getElementById('yearPickerWrap').classList.add('hidden');
  document.getElementById('searchWrap').classList.remove('hidden');
  document.getElementById('casualPoolWrap').classList.add('hidden');
  const search = document.getElementById('playerSearch');
  search.disabled = true;
  renderDraftHeader();

  const target = state.spins[state.round];
  const steps = 10;
  let step = 0;

  function tick() {
    step++;
    if (step < steps) {
      if (spinTeam) paintTeamReel(Math.floor(Math.random() * TEAMS.length));
      if (spinEra) paintEraReel(Math.floor(Math.random() * ERA_LIST.length));
      SFX.tick();
      state.spinTimer = setTimeout(tick, 34 + step * step * 2.1);
    } else {
      state.spinTimer = null;
      paintTeamReel(target.teamIdx);
      paintEraReel(target.eraIdx);
      SFX.lock();
      if (spinTeam) {
        const el = document.getElementById('teamReel');
        el.classList.remove('reel-lock');
        void el.offsetWidth;
        el.classList.add('reel-lock');
      }
      if (spinEra) {
        const el = document.getElementById('eraReel');
        el.classList.remove('reel-lock');
        void el.offsetWidth;
        el.classList.add('reel-lock');
      }
      state.spinning = false;
      search.disabled = false;
      updateSearchPlaceholder(target);
      renderDraftHeader();
      renderCasualPool('');
      if (state.difficulty !== 'casual') search.focus();
    }
  }
  tick();
}

// ==================== PICKING & SEASON SELECTION ====================
function showFloatingPop(text, tone = 'normal') {
  const host = document.getElementById('fieldPopAnchor');
  const el = document.createElement('div');
  const cls = tone === 'gold'
    ? 'bg-amber-400 text-black'
    : tone === 'stack'
      ? 'bg-sky-400 text-slate-950'
      : 'bg-white text-emerald-950';
  el.className = `float-pop whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-black shadow-lg ${cls}`;
  el.textContent = text;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function selectPlayerForSeason(player) {
  if (state.spinning || state.round >= 7) return;
  if (!canDraftPlayer(state.roster, player).ok) return;
  if (player.seasons.length === 1) {
    commitPlayerSeason(player, player.seasons[0]);
    return;
  }

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
    const isExactStack = wouldExactStack(state.roster, player, s.year);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `px-4 py-2 rounded-xl border-2 text-sm font-black tabular transition cursor-pointer flex items-center gap-1.5 ${
      isExactStack
        ? 'border-amber-400 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
        : 'border-[var(--border)] bg-[var(--card)] hover:border-emerald-500 hover:bg-emerald-500/10'
    }`;
    b.innerHTML = `<span>${s.year}</span>${isExactStack ? '<span class="text-xs" title="Exact Same-Season Stack (+4.0 PPG)">⚡</span>' : ''}`;
    b.addEventListener('click', () => commitPlayerSeason(player, s));
    btns.appendChild(b);
  });
}

function commitPlayerSeason(player, season) {
  const check = canDraftPlayer(state.roster, player);
  if (!check.ok) return;

  const prevStacks = computeStacks(state.roster).totalBonus;
  const spin = state.spins[state.round];
  const peak = getPeakSeason(player, state.scoring);

  const flat = {
    name: player.name, pos: player.pos, teamIdx: player.teamIdx, team: player.team,
    eraIdx: player.eraIdx, era: player.era, year: season.year, games: season.games,
    ppr: season.ppr, half: season.half, std: season.std, stat: season.stat, weeks: season.weeks,
    peakYear: peak.year, peakPPG: getSeasonPPG(peak, state.scoring), seasonCount: player.seasons.length,
  };

  const testRoster = state.roster.slice();
  testRoster[check.slotIdx] = flat;
  const gainedStack = computeStacks(testRoster).totalBonus - prevStacks;
  const grade = gradePick(state.roster, POOL_MAP, state.scoring, player, season, spin, gainedStack);

  state.roster[check.slotIdx] = flat;
  state.slotGrades[check.slotIdx] = grade;
  state.lastDraftedSlot = check.slotIdx;
  state.picksByRound.push({ spin: { ...spin }, player: flat, slotIdx: check.slotIdx, grade });
  state.pendingPlayer = null;

  const ppg = getSeasonPPG(season, state.scoring);
  const nailedPeak = player.seasons.length > 1 && season.year === peak.year;
  SFX.draft(grade);
  if (gainedStack > 0) {
    SFX.stack();
    showFloatingPop(`⚡ STACK +${gainedStack.toFixed(1)} · ${grade}-TIER (${ppg.toFixed(1)})`, 'stack');
  } else if (nailedPeak) {
    showFloatingPop(`★ PEAK ${season.year}! · ${grade}-TIER (+${ppg.toFixed(1)})`, 'gold');
  } else {
    showFloatingPop(`${grade}-TIER · ${season.year} (+${ppg.toFixed(1)} PPG)`, grade === 'S' ? 'gold' : 'normal');
  }

  state.round++;
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
  for (let t = 0; t < TEAMS.length; t++) {
    if (t !== cur.teamIdx && !state.usedBuckets.has(`${t}-${cur.eraIdx}`)) cands.push(t);
  }
  if (!cands.length) return;
  cur.teamIdx = cands[Math.floor(state.rng() * cands.length)];
  state.usedBuckets.add(`${cur.teamIdx}-${cur.eraIdx}`);
  state.rerollsTeam--;
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  animateSpin(true, false);
}

function rerollEra() {
  if (state.spinning || state.rerollsEra <= 0 || state.round >= 7) return;
  const cur = state.spins[state.round];
  const cands = [];
  for (let e = 0; e < ERA_LIST.length; e++) {
    if (e !== cur.eraIdx && !state.usedBuckets.has(`${cur.teamIdx}-${e}`)) cands.push(e);
  }
  if (!cands.length) {
    for (let e = 0; e < ERA_LIST.length; e++) {
      if (e !== cur.eraIdx) cands.push(e);
    }
  }
  cur.eraIdx = cands[Math.floor(state.rng() * cands.length)];
  state.usedBuckets.add(`${cur.teamIdx}-${cur.eraIdx}`);
  state.rerollsEra--;
  document.getElementById('hintDrawer').classList.add('hidden');
  document.getElementById('playerSearch').value = '';
  document.getElementById('searchDropdown').classList.add('hidden');
  animateSpin(false, true);
}

// ==================== SIM & PERSISTENCE ====================
async function finishAndPersistDraft() {
  const sim = buildRealWeeklySim({
    roster: state.roster,
    spins: state.spins,
    poolMap: POOL_MAP,
    mode: state.mode,
    scoring: state.scoring,
    draftSeed: state.draftSeed,
    challengeCode: state.challengeCode,
  });
  state.lastSim = sim;
  trackEvent('draft_completed', {
    mode: state.mode,
    difficulty: state.runDifficulty,
    wins: sim.wins,
    avg_ppg: Math.round(sim.avgPPG * 10) / 10,
    hints_used: state.hintsUsed,
    stack_bonus: sim.stackBonus,
  });

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
    hintsUsed: state.hintsUsed,
    difficulty: state.runDifficulty,
  };

  api('/api/runs', { method: 'POST', body: JSON.stringify(payload) })
    .then(async res => {
      state.lastSavedCode = res.shortCode;
      state.lastCrowd = res.crowd;
      if (res.stats) {
        state.stats = res.stats;
        updateHOFBadge();
      }
      if (state.mode === 'challenge' && state.challengeCode) {
        try {
          const rev = await api(`/api/challenges/${state.challengeCode}?reveal=1`);
          state.challengeMeta = rev;
          renderChallengePanel(rev, sim);
        } catch (_) {}
      }
      renderCrowdOverlay();
    })
    .catch(err => console.error('Save run failed:', err));

  playSeasonSim(sim, false);
}

function resolveEntryPicksByRound(entry, spins) {
  const roster = Array.isArray(entry?.roster) ? entry.roster : [];
  const pbr = Array.isArray(entry?.picksByRound) ? entry.picksByRound : [];
  const used = new Set();
  return spins.map((spin, rIdx) => {
    const pk = pbr[rIdx];
    let matchIdx = -1;
    if (pk) {
      matchIdx = roster.findIndex((p, idx) => !used.has(idx) && p && p.name === pk.playerName && p.year === pk.playerYear);
    }
    if (matchIdx === -1) {
      matchIdx = roster.findIndex((p, idx) => !used.has(idx) && p && p.teamIdx === spin.teamIdx && p.eraIdx === spin.eraIdx);
    }
    if (matchIdx === -1) {
      matchIdx = roster.findIndex((p, idx) => !used.has(idx) && p);
    }
    if (matchIdx >= 0) {
      used.add(matchIdx);
      return roster[matchIdx];
    }
    return pk ? { name: pk.playerName, year: pk.playerYear, pos: pk.pos } : null;
  });
}

function renderH2H(opponent, mySim) {
  const banner = document.getElementById('h2hBanner');
  if (!opponent || !mySim) {
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  const beat = mySim.wins > opponent.wins || (mySim.wins === opponent.wins && mySim.avgPPG > opponent.avgPPG);
  const tie = mySim.wins === opponent.wins && Math.abs(mySim.avgPPG - opponent.avgPPG) < 0.05;
  const oppLabel = `${opponent.isAccount ? '@' : ''}${opponent.displayName}`;
  document.getElementById('h2hSummary').textContent =
    `⚔️ 1v1 vs. ${oppLabel}: YOU ${mySim.wins}-${mySim.losses} (${mySim.avgPPG.toFixed(1)}) vs. ${oppLabel} ${opponent.wins}-${opponent.losses} (${opponent.avgPPG.toFixed(1)})`;
  const v = document.getElementById('h2hVerdict');
  v.textContent = tie ? 'TIE GAME!' : beat ? 'YOU KNOW MORE BALL!' : `${opponent.displayName} KNOWS MORE BALL`;
  v.className = `px-2.5 py-1 rounded-lg font-black text-xs ${tie ? 'bg-amber-500/20 text-amber-300' : beat ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 text-rose-300'}`;
}

function renderSideBySidePicks(opponent, mySim) {
  const wrap = document.getElementById('h2hPicksWrap');
  const list = document.getElementById('h2hPicksList');
  if (!opponent || !state.picksByRound.length) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  const oppLabel = `${opponent.isAccount ? '@' : ''}${opponent.displayName}`;
  const oppPicks = resolveEntryPicksByRound(opponent, state.spins);

  let myWonRounds = 0;
  let oppWonRounds = 0;
  let sameCount = 0;

  list.innerHTML = state.picksByRound.map((pick, i) => {
    const team = TEAMS[pick.spin.teamIdx];
    const era = ERA_LIST[pick.spin.eraIdx];
    const myP = pick.player;
    const myPPG = Number(myP?.[state.scoring] ?? 0);
    const oppP = oppPicks[i];
    const oppPPG = Number(oppP?.[state.scoring] ?? 0);
    const isSame = oppP && myP && oppP.name === myP.name && oppP.year === myP.year;
    if (isSame) sameCount++;
    else if (myPPG > oppPPG + 0.05) myWonRounds++;
    else if (oppPPG > myPPG + 0.05) oppWonRounds++;

    const myWin = !isSame && myPPG > oppPPG + 0.05;
    const oppWin = !isSame && oppPPG > myPPG + 0.05;

    return `
      <div class="py-2.5 grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] items-center gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-black text-white shrink-0" style="background:${team.color}">${team.id}</span>
          <span class="text-[11px] font-bold text-[var(--muted-foreground)] tabular truncate">${era}</span>
          ${isSame ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black shrink-0">SAME</span>' : ''}
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${myWin ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-[var(--card)]/60 border border-[var(--border)]'}">
          <div class="min-w-0 truncate">
            <span class="text-[10px] font-black uppercase text-[var(--muted-foreground)] mr-1">You</span>
            <span class="font-bold ${myWin ? 'text-emerald-300' : ''}">${escapeHtml(myP.name)}</span>
            <span class="text-[var(--muted-foreground)] tabular">’${String(myP.year).slice(-2)}</span>
          </div>
          <span class="font-black tabular shrink-0 ${myWin ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}">${myPPG.toFixed(1)}</span>
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${oppWin ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-[var(--card)]/60 border border-[var(--border)]'}">
          <div class="min-w-0 truncate">
            <span class="text-[10px] font-black uppercase text-[var(--muted-foreground)] mr-1">${escapeHtml(opponent.displayName)}</span>
            <span class="font-bold ${oppWin ? 'text-rose-300' : ''}">${oppP ? escapeHtml(oppP.name) : '—'}</span>
            ${oppP?.year ? `<span class="text-[var(--muted-foreground)] tabular">’${String(oppP.year).slice(-2)}</span>` : ''}
          </div>
          <span class="font-black tabular shrink-0 ${oppWin ? 'text-rose-400' : 'text-[var(--muted-foreground)]'}">${oppP ? oppPPG.toFixed(1) : '—'}</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('h2hPicksTitle').textContent = `⚔️ Side-by-Side Picks · You vs. ${oppLabel}`;
  const ppgDiff = mySim.avgPPG - opponent.avgPPG;
  const diffStr = `${ppgDiff >= 0 ? '+' : ''}${ppgDiff.toFixed(1)} PPG`;
  document.getElementById('h2hPicksDelta').textContent =
    `Rounds won: ${myWonRounds}-${oppWonRounds}${sameCount ? ` (${sameCount} same)` : ''} · ${diffStr}`;
}

function renderChallengeLeaderboard(ch, activeCompareCode) {
  const wrap = document.getElementById('challengeLbWrap');
  const list = document.getElementById('challengeLbList');
  const meta = document.getElementById('challengeLbMeta');
  const entries = Array.isArray(ch?.leaderboard) ? ch.leaderboard : [];
  if (!entries.length) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  meta.textContent = `${entries.length} ${entries.length === 1 ? 'player' : 'players'} · ${ch.scoring.toUpperCase()}`;

  list.innerHTML = entries.map((e, idx) => {
    const isMe = e.shortCode === state.lastSavedCode;
    const isComparing = e.shortCode === activeCompareCode;
    const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
    const nameLabel = `${e.isAccount ? '@' : ''}${e.displayName}`;
    const diffBadge = e.difficulty === 'casual'
      ? '<span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">Casual</span>'
      : '';
    const hintBadge = e.hintsUsed > 0
      ? `<span class="text-[10px] text-amber-400 font-bold" title="${e.hintsUsed} hints used">💡${e.hintsUsed}</span>`
      : '';

    return `
      <div class="py-2.5 flex flex-wrap items-center justify-between gap-2 ${isMe ? 'bg-emerald-500/5 -mx-3.5 px-3.5' : ''}">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-6 text-center font-black tabular shrink-0">${rankIcon}</span>
          <span class="font-bold truncate ${isMe ? 'text-emerald-300' : ''}">${escapeHtml(nameLabel)}</span>
          ${e.isCreator ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 text-[10px] font-black">HOST</span>' : ''}
          ${isMe ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">YOU</span>' : ''}
          ${diffBadge}
          ${hintBadge}
        </div>
        <div class="flex items-center gap-2.5 tabular">
          <span class="font-black text-sm">${e.wins}-${e.losses}</span>
          <span class="text-[var(--muted-foreground)] font-semibold">${e.avgPPG.toFixed(1)} PPG</span>
          <span class="hidden sm:inline text-[11px] text-[var(--muted-foreground)]">${e.optPct.toFixed(0)}% Opt</span>
          ${!isMe
            ? `<button data-compare="${escapeHtml(e.shortCode)}" class="px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${isComparing ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] text-[var(--foreground)]'}">${isComparing ? 'Comparing' : 'Compare'}</button>`
            : ''}
          <a href="/r/${encodeURIComponent(e.shortCode)}" class="text-[11px] font-bold text-[var(--link)] hover:underline">View</a>
        </div>
      </div>`;
  }).join('');

  if (entries.length === 1) {
    list.innerHTML += `<div class="py-2.5 text-[11px] text-[var(--muted-foreground)]">No challengers yet — share your <span class="font-mono text-amber-300">/c/${escapeHtml(ch.code)}</span> link so friends can draft this exact board!</div>`;
  }

  list.querySelectorAll('button[data-compare]').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-compare');
      const target = entries.find(item => item.shortCode === code);
      if (target && state.lastSim) {
        renderH2H(target, state.lastSim);
        renderSideBySidePicks(target, state.lastSim);
        renderChallengeLeaderboard(ch, target.shortCode);
      }
    });
  });
}

function renderChallengePanel(ch, mySim) {
  const panel = document.getElementById('challengePanel');
  if (!ch || !mySim) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  const entries = Array.isArray(ch.leaderboard) ? ch.leaderboard : [];
  let defaultOpp = null;
  if (ch.creator && ch.creator.shortCode !== state.lastSavedCode) {
    defaultOpp = ch.creator;
  } else {
    defaultOpp = entries.find(e => e.shortCode !== state.lastSavedCode) || null;
  }

  renderH2H(defaultOpp, mySim);
  renderSideBySidePicks(defaultOpp, mySim);
  renderChallengeLeaderboard(ch, defaultOpp ? defaultOpp.shortCode : null);
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
    const myP = pick.player[state.scoring];
    const optP = opt.player.ppg;
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
    if (b.waiver) {
      return `<span class="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold" title="Injury waiver fill-in for ${escapeHtml(b.name)}">🏥 ${b.slot} Waiver <strong>${b.pts.toFixed(1)}</strong></span>`;
    }
    const cls = b.pts === maxP
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
      : b.pts === minP && b.pts < 10
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold'
        : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]';
    return `<span class="px-2 py-0.5 rounded border ${cls}">${b.slot} ${escapeHtml(b.name)} <strong>${b.pts.toFixed(1)}</strong></span>`;
  }).join('') + (wk.stackBonus > 0 ? `<span class="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-400 font-bold">⚡ Stack +${wk.stackBonus.toFixed(1)}</span>` : '');
}

function playSeasonSim(sim, instant = false) {
  if (state.simTimer) {
    clearTimeout(state.simTimer);
    state.simTimer = null;
  }
  document.getElementById('draftConsole').classList.add('hidden');
  document.getElementById('simStage').classList.remove('hidden');
  document.getElementById('postSimWrap').classList.add('hidden');
  document.getElementById('btnSkipSim').classList.remove('hidden');
  document.getElementById('simPPG').textContent = sim.avgPPG.toFixed(1);
  document.getElementById('simOptPct').textContent = `${sim.optPct.toFixed(0)}%`;
  document.getElementById('simStackBonus').textContent = `+${sim.stackBonus.toFixed(1)}`;

  const totalWaiverWks = (sim.weeks || []).reduce(
    (sum, wk) => sum + (wk.breakdown || []).filter(b => b.waiver).length,
    0,
  );
  const injEl = document.getElementById('simInjuryNote');
  if (totalWaiverWks > 0) {
    injEl.textContent = `🏥 ${totalWaiverWks} inj wk${totalWaiverWks === 1 ? '' : 's'}`;
    injEl.classList.remove('hidden');
  } else {
    injEl.classList.add('hidden');
  }

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

  let curW = 0;
  let curL = 0;
  let idx = 0;

  function revealWeek(i, silent = false) {
    const wk = sim.weeks[i];
    if (wk.win) curW++;
    else curL++;
    const c = cells[i];
    c.textContent = wk.win ? 'W' : 'L';
    c.className = `py-1.5 rounded-md text-xs font-black tabular border cursor-pointer transition ${
      wk.win
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
    }`;
    c.addEventListener('mouseenter', () => renderWeekBoxScore(wk));
    c.addEventListener('click', () => renderWeekBoxScore(wk));
    renderWeekBoxScore(wk);
    document.getElementById('simRecord').textContent = `${curW}-${curL}`;
    if (!silent) {
      if (wk.win) SFX.winTick();
      else SFX.lossTick();
    }
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
      if (!instant) {
        SFX.fanfare();
        launchConfetti();
      }
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

    const dPill = document.getElementById('difficultyPill');
    if (state.runDifficulty === 'casual') {
      dPill.textContent = '📋 Casual';
      dPill.className = 'px-2 py-0.5 rounded text-xs font-black bg-sky-500/15 text-sky-300 border border-sky-500/30';
    } else {
      dPill.className = 'hidden';
    }

    const hPill = document.getElementById('hintsUsedPill');
    hPill.classList.remove('hidden');
    if (state.hintsUsed === 0) {
      hPill.textContent = '🧠 Pure · No Hints';
      hPill.className = 'px-2 py-0.5 rounded text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    } else {
      hPill.textContent = `💡 ${state.hintsUsed} Hint${state.hintsUsed === 1 ? '' : 's'}`;
      hPill.className = 'px-2 py-0.5 rounded text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
    renderCrowdOverlay();
  }

  if (instant) {
    for (let i = 0; i < 17; i++) revealWeek(i, true);
    finalizeSim();
    return;
  }

  document.getElementById('simStatusTag').textContent = 'SIMULATING REAL WEEKLY LOGS...';
  document.getElementById('simVerdict').textContent = 'Playing 17-week schedule...';
  function stepWeek() {
    if (idx < 17) {
      revealWeek(idx, false);
      idx++;
      state.simTimer = setTimeout(stepWeek, (idx >= 14 && curL === 0) ? 280 : 130);
    } else {
      state.simTimer = null;
      finalizeSim();
    }
  }
  stepWeek();
}

// ==================== RENDERING ====================
function updateHOFBadge() {
  document.getElementById('hofBadgeCount').textContent = state.stats.perfects || 0;
}

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
  document.getElementById('btnDiffPro').className = `px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${state.difficulty === 'pro' ? act : inact}`;
  document.getElementById('btnDiffCasual').className = `px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${state.difficulty === 'casual' ? 'bg-sky-600 text-white' : inact}`;
  document.getElementById('btnHint').classList.toggle('hidden', state.difficulty === 'casual');
  document.getElementById('headerSub').textContent = state.mode === 'daily'
    ? `Daily Challenge · ${getTodayUTC()} · Half-PPR`
    : state.mode === 'challenge'
      ? '1v1 Friend Challenge · Half-PPR'
      : 'Unlimited Mode · Half-PPR';
  updateHOFBadge();
  updateAccountBtn();
}

function renderDraftHeader() {
  document.getElementById('roundBanner').textContent = `PICK ${Math.min(7, state.round + 1)} OF 7`;
  const counts = {};
  for (let i = 0; i < SLOTS.length; i++) {
    if (!state.roster[i]) counts[SLOTS[i].label] = (counts[SLOTS[i].label] || 0) + 1;
  }
  document.getElementById('needSummary').textContent = 'Need ' + Object.entries(counts).map(([k, v]) => v > 1 ? `${v} ${k}` : k).join(', ');

  const stackPill = document.getElementById('stackAlertPill');
  stackPill.classList.toggle('hidden', state.spinning || state.round >= 7 || !hasStackOpportunity(state.roster, state.spins[state.round]));

  const pips = document.getElementById('roundPips');
  pips.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('span');
    d.className = i < state.round
      ? 'w-2.5 h-2.5 rounded-full bg-emerald-500'
      : i === state.round
        ? 'w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-400/30'
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
    const slot = SLOTS[i];
    const p = state.roster[i];
    const mount = document.getElementById(`slot-${i}`);
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
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || parts[0];
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
  const stackBadge = document.getElementById('fieldStackBadge');
  if (stacks.totalBonus > 0) {
    stackBadge.classList.remove('hidden');
    stackBadge.textContent = `⚡ +${stacks.totalBonus.toFixed(1)} STACK`;
    stackBadge.title = stacks.labels.join(', ');
  } else {
    stackBadge.classList.add('hidden');
  }
}

// ==================== SEARCH, CASUAL POOL & HINTS ====================
function renderCasualPool(query = '') {
  const wrap = document.getElementById('casualPoolWrap');
  if (state.difficulty !== 'casual' || state.spinning || state.round >= 7 || state.pendingPlayer) {
    wrap.classList.add('hidden');
    return;
  }
  const spin = state.spins[state.round];
  if (!spin) {
    wrap.classList.add('hidden');
    return;
  }
  const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
  const q = normalizeName(query);
  const openPos = getEligiblePositions(state.roster);

  const eligible = pool.filter(p => openPos.has(p.pos) && canDraftPlayer(state.roster, p).ok && (!q || p.norm.includes(q)));
  wrap.classList.remove('hidden');
  wrap.innerHTML = '';

  if (!eligible.length) {
    wrap.innerHTML = `<div class="text-xs text-[var(--muted-foreground)] py-1">No eligible players match "${escapeHtml(query)}".</div>`;
    return;
  }

  for (const pos of POS_LIST) {
    if (!openPos.has(pos)) continue;
    const group = eligible.filter(p => p.pos === pos).sort((a, b) => a.name.localeCompare(b.name));
    if (!group.length) continue;

    const section = document.createElement('div');
    section.className = 'space-y-1.5';
    section.innerHTML = `<div class="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">
      <span class="px-1.5 py-0.2 rounded ${POS_CHIP[pos]}">${pos}</span>
      <span>${group.length} eligible</span>
    </div>`;

    const grid = document.createElement('div');
    grid.className = 'flex flex-wrap gap-1.5';
    for (const p of group) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const yrTag = p.seasons.length > 1 ? `${p.seasons.length} yrs` : `${p.seasons[0].year}`;
      btn.className = 'px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-emerald-500 hover:bg-emerald-500/10 text-xs font-bold transition cursor-pointer flex items-center gap-1.5';
      btn.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="text-[10px] text-[var(--muted-foreground)] tabular">${yrTag}</span>`;
      btn.addEventListener('click', () => selectPlayerForSeason(p));
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    wrap.appendChild(section);
  }
}

function renderSearch(query) {
  const dd = document.getElementById('searchDropdown');
  if (state.difficulty === 'casual') {
    dd.classList.add('hidden');
    state.dropdownMatches = [];
    renderCasualPool(query);
    return;
  }
  document.getElementById('casualPoolWrap').classList.add('hidden');
  if (state.spinning || state.round >= 7 || state.pendingPlayer) {
    dd.classList.add('hidden');
    return;
  }
  const spin = state.spins[state.round];
  const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
  const q = normalizeName(query);

  if (q.length < 2) {
    dd.classList.add('hidden');
    state.dropdownMatches = [];
    return;
  }

  const matches = pool.filter(p => p.norm.includes(q));
  matches.sort((a, b) => {
    const aS = a.norm.startsWith(q) || a.norm.split(' ').some(w => w.startsWith(q)) ? 0 : 1;
    const bS = b.norm.startsWith(q) || b.norm.split(' ').some(w => w.startsWith(q)) ? 0 : 1;
    return aS !== bS ? aS - bS : a.name.localeCompare(b.name);
  });

  state.dropdownMatches = matches.slice(0, 35);
  state.activeDropdownIdx = state.dropdownMatches.findIndex(p => canDraftPlayer(state.roster, p).ok);
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
    const check = canDraftPlayer(state.roster, p);
    const isAct = idx === state.activeDropdownIdx && check.ok;
    const yrBadge = p.seasons.length > 1 ? `${p.seasons.length} yrs` : `${p.seasons[0].year}`;
    const row = document.createElement('button');
    row.type = 'button';
    row.disabled = !check.ok;
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
  if (!drawer.classList.contains('hidden')) {
    if (!state.hintedRounds.has(state.round)) {
      state.hintedRounds.add(state.round);
      state.hintsUsed = state.hintedRounds.size;
    }
    const spin = state.spins[state.round];
    const pool = POOL_MAP.get(`${spin.teamIdx}-${spin.eraIdx}`) || [];
    const open = getEligiblePositions(state.roster);
    const cfg = SCORE_CONFIG[state.scoring];
    const top = pool
      .filter(p => open.has(p.pos) && !state.roster.some(r => r && r.name === p.name))
      .map(p => ({ p, vorp: getSeasonPPG(getPeakSeason(p, state.scoring), state.scoring) - cfg.base[p.pos] }))
      .sort((a, b) => b.vorp - a.vorp)
      .slice(0, 4);
    document.getElementById('hintPills').innerHTML = top.map(({ p }) => {
      const init = p.name.split(' ').map(w => w[0] + '.').join(' ');
      return `<span class="px-2 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] font-mono font-bold">${p.pos} ${init}</span>`;
    }).join('');
  }
}

// ==================== SHARE & CHALLENGE ACTIONS ====================
function flashToast(msg = 'Copied!') {
  const el = document.getElementById('copyToast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

async function copyTextFallback(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

async function copyShareLink() {
  const url = state.lastSavedCode ? `${window.location.origin}/r/${state.lastSavedCode}` : window.location.href;
  trackEvent('share_clicked', { method: 'link', mode: state.mode });
  if (await copyTextFallback(url)) {
    flashToast('Share link copied!');
  } else {
    window.prompt('Copy your share link:', url);
  }
}

async function copyShareCard() {
  const sim = state.lastSim;
  if (!sim) return;
  const tag = state.mode === 'daily' ? `Daily ${getTodayUTC()}` : 'Unlimited';
  const sq = sim.weeks.map(w => w.win ? '🟩' : '🟥').join('');
  const grades = state.picksByRound.map(p => p.grade).join('');
  const dTag = state.runDifficulty === 'casual' ? ' · 📋 Casual' : '';
  const hTag = state.hintsUsed === 0 ? 'No Hints 🧠' : `${state.hintsUsed} Hint${state.hintsUsed === 1 ? '' : 's'} 💡`;
  const link = state.lastSavedCode ? `${window.location.origin}/r/${state.lastSavedCode}` : '';
  const text = [
    `🏈 KNOW BALL — Fantasy Draft (${tag} · ${SCORE_CONFIG[state.scoring].name}${dTag})`,
    `Record: ${sim.wins}-${sim.losses} | ${sim.avgPPG.toFixed(1)} PPG (${sim.optPct.toFixed(0)}% Optimal) | ${hTag} | Grades: ${grades}`,
    sim.stackBonus > 0 ? `⚡ Stack Bonus: +${sim.stackBonus.toFixed(1)} PPG/wk` : null,
    sq,
    link || null,
  ].filter(Boolean).join('\n');
  trackEvent('share_clicked', { method: 'text', mode: state.mode });
  if (await copyTextFallback(text)) {
    flashToast('Text card copied!');
  } else {
    window.prompt('Copy your text card:', text);
  }
}

async function createChallengeLink() {
  if (!state.lastSavedCode) {
    flashToast('Saving run — try again in a second!');
    return;
  }
  const urlPromise = api('/api/challenges', {
    method: 'POST',
    body: JSON.stringify({ shortCode: state.lastSavedCode }),
  }).then(res => `${window.location.origin}/c/${res.code}`);

  // Invoke clipboard.write synchronously with a Promise-backed ClipboardItem so Safari/iOS keeps user-gesture activation
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        'text/plain': urlPromise.then(url => new Blob([url], { type: 'text/plain' })),
      });
      await navigator.clipboard.write([item]);
      await urlPromise;
      trackEvent('share_clicked', { method: 'challenge', mode: state.mode });
      flashToast('1v1 Challenge link copied!');
      return;
    } catch (_) {
      // Fall through to handle API error or fallback copy method
    }
  }

  try {
    const url = await urlPromise;
    trackEvent('share_clicked', { method: 'challenge', mode: state.mode });
    if (await copyTextFallback(url)) {
      flashToast('1v1 Challenge link copied!');
    } else if (navigator.share) {
      await navigator.share({ title: 'KNOW BALL 1v1 Challenge', url });
    } else {
      window.prompt('Copy your 1v1 Challenge link:', url);
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      flashToast(err.message || 'Could not create challenge link.');
    }
  }
}

// ==================== HYDRATE SAVED RUN & DIFFICULTY ====================
function displaySavedRun(run, crowd, bannerMsg = null) {
  cancelSpin();
  state.mode = run.mode;
  state.scoring = run.scoring;
  state.spins = run.spins;
  state.roster = run.roster;
  state.slotGrades = new Array(7).fill('A');
  state.hintsUsed = run.hintsUsed || 0;
  state.runDifficulty = run.difficulty || 'pro';
  state.round = 7;
  state.lastSavedCode = run.shortCode;
  state.lastCrowd = crowd;

  const usedSlots = new Set();
  state.picksByRound = run.spins.map((spin, rIdx) => {
    const pk = run.picksByRound && run.picksByRound[rIdx];
    let slotIdx = -1;
    if (pk) {
      slotIdx = run.roster.findIndex((p, sIdx) =>
        !usedSlots.has(sIdx) && p && p.name === pk.playerName && p.year === pk.playerYear
      );
    }
    if (slotIdx === -1) {
      slotIdx = run.roster.findIndex((p, sIdx) =>
        !usedSlots.has(sIdx) && p && p.teamIdx === spin.teamIdx && p.eraIdx === spin.eraIdx
      );
    }
    if (slotIdx === -1) {
      slotIdx = run.roster.findIndex((_, sIdx) => !usedSlots.has(sIdx));
    }
    usedSlots.add(slotIdx);
    const grade = (run.grades && run.grades[rIdx]) || 'A';
    if (slotIdx >= 0) state.slotGrades[slotIdx] = grade;
    return { spin, player: run.roster[slotIdx], slotIdx, grade };
  });

  const optimal = computeOptimalLineup(run.spins, POOL_MAP, run.scoring);
  state.lastSim = {
    wins: run.wins, losses: run.losses, avgPPG: run.avgPPG, basePPG: run.basePPG,
    stackBonus: run.stackBonus, optPct: run.optPct, optimal, weeks: run.weeks,
  };
  document.getElementById('h2hBanner').classList.add('hidden');
  document.getElementById('challengePanel').classList.add('hidden');
  if (bannerMsg) {
    document.getElementById('contextBanner').classList.remove('hidden');
    document.getElementById('contextBannerText').textContent = bannerMsg;
  }
  renderChrome();
  renderField();
  playSeasonSim(state.lastSim, true);
}

function setDifficulty(diff) {
  state.difficulty = diff;
  try { localStorage.setItem(DIFFICULTY_KEY, diff); } catch (_) {}
  // Anti-peek: if switched to Casual at any point during an active draft, mark the run as casual
  if (diff === 'casual' && state.round < 7) state.runDifficulty = 'casual';
  if (diff === 'pro' && state.round === 0 && state.picksByRound.length === 0) state.runDifficulty = 'pro';
  document.getElementById('hintDrawer').classList.add('hidden');
  renderChrome();
  if (state.round < 7 && !state.spinning) {
    updateSearchPlaceholder(state.spins[state.round]);
    renderSearch(document.getElementById('playerSearch').value);
  }
}

// ==================== EVENTS & BOOT ====================
const { openHelpModal } = initModals({
  state,
  onAuthChange: () => {
    updateAccountBtn();
    updateHOFBadge();
  },
  onWelcomeDismiss: () => {
    if (state.waitingForWelcome) {
      state.waitingForWelcome = false;
      animateSpin(true, true);
    }
  },
});

document.getElementById('btnDiffPro').addEventListener('click', () => setDifficulty('pro'));
document.getElementById('btnDiffCasual').addEventListener('click', () => setDifficulty('casual'));
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
  if (state.difficulty === 'casual') {
    renderCasualPool(document.getElementById('playerSearch').value);
  } else {
    document.getElementById('playerSearch').focus();
  }
});
document.getElementById('btnCopyLink').addEventListener('click', copyShareLink);
document.getElementById('btnCopyShare').addEventListener('click', copyShareCard);
document.getElementById('btnChallengeFriend').addEventListener('click', createChallengeLink);
document.getElementById('btnSkipSim').addEventListener('click', () => playSeasonSim(state.lastSim, true));
document.getElementById('btnCloseInspector').addEventListener('click', () => document.getElementById('inspectorBar').classList.add('hidden'));
document.getElementById('btnSound').addEventListener('click', (e) => {
  SFX.enabled = !SFX.enabled;
  e.target.textContent = SFX.enabled ? '🔊' : '🔇';
});

document.getElementById('playerSearch').addEventListener('input', (e) => renderSearch(e.target.value));
document.getElementById('playerSearch').addEventListener('keydown', (e) => {
  if (!state.dropdownMatches.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    let next = state.activeDropdownIdx;
    for (let k = 0; k < state.dropdownMatches.length; k++) {
      next = (next + 1) % state.dropdownMatches.length;
      if (canDraftPlayer(state.roster, state.dropdownMatches[next]).ok) {
        state.activeDropdownIdx = next;
        break;
      }
    }
    paintDropdownItems();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    let prev = state.activeDropdownIdx;
    for (let k = 0; k < state.dropdownMatches.length; k++) {
      prev = (prev - 1 + state.dropdownMatches.length) % state.dropdownMatches.length;
      if (canDraftPlayer(state.roster, state.dropdownMatches[prev]).ok) {
        state.activeDropdownIdx = prev;
        break;
      }
    }
    paintDropdownItems();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const cand = state.dropdownMatches[state.activeDropdownIdx];
    if (cand && canDraftPlayer(state.roster, cand).ok) selectPlayerForSeason(cand);
  }
});

async function loadDailyOrStart(deferForWelcome = false) {
  try {
    const me = await api(`/api/me?date=${getTodayUTC()}&scoring=${state.scoring}`);
    state.user = me.user;
    state.stats = me.stats;
    if (me.todayDaily) {
      displaySavedRun(
        me.todayDaily.run,
        me.todayDaily.crowd,
        `Today’s Daily (${getTodayUTC()}) is locked in! Play Unlimited or check the Leaderboard.`,
      );
      return;
    }
  } catch (_) {}
  startDraft('daily', { deferSpin: deferForWelcome });
}

async function boot() {
  const raw = await api('/api/players');
  PLAYERS = raw.map((r, i) => ({
    idx: i,
    name: r[0],
    norm: normalizeName(r[0]),
    pos: POS_LIST[r[1]],
    teamIdx: r[2],
    team: TEAMS[r[2]].id,
    eraIdx: r[3],
    era: ERA_LIST[r[3]],
    seasons: r[4].map(s => ({ year: s[0], games: s[1], ppr: s[2], half: s[3], std: s[4], stat: s[5], weeks: s[6] })),
  }));
  for (const p of PLAYERS) {
    const k = `${p.teamIdx}-${p.eraIdx}`;
    if (!POOL_MAP.has(k)) POOL_MAP.set(k, []);
    POOL_MAP.get(k).push(p);
  }

  try {
    const me = await api(`/api/me?date=${getTodayUTC()}&scoring=${state.scoring}`);
    state.user = me.user;
    state.stats = me.stats;
  } catch (_) {}
  renderChrome();

  const path = window.location.pathname;
  const runMatch = path.match(/^\/r\/([a-zA-Z0-9_-]+)$/);
  const chMatch = path.match(/^\/c\/([a-zA-Z0-9_-]+)$/);

  if (runMatch) {
    try {
      const data = await api(`/api/runs/${runMatch[1]}`);
      displaySavedRun(
        data.run,
        data.crowd,
        `Viewing ${data.run.isAccount ? '@' : ''}${data.run.displayName}’s ${data.run.wins}-${data.run.losses} squad (${data.run.scoring.toUpperCase()})`,
      );
      return;
    } catch (_) {}
  }

  if (chMatch) {
    try {
      const ch = await api(`/api/challenges/${chMatch[1]}`);
      if (ch.viewerRun) {
        const banner = ch.isCreator
          ? `⚔️ Your 1v1 Challenge Board (${ch.totalEntries} ${ch.totalEntries === 1 ? 'player' : 'players'} · ${ch.scoring.toUpperCase()})`
          : `⚔️ Completed 1v1 Challenge vs. ${ch.creatorName} (${ch.totalEntries} ${ch.totalEntries === 1 ? 'player' : 'players'} · ${ch.scoring.toUpperCase()})`;
        displaySavedRun(ch.viewerRun, ch.viewerCrowd, banner);
        state.challengeCode = ch.code;
        state.challengeMeta = ch;
        renderChallengePanel(ch, state.lastSim);
        return;
      }
      document.getElementById('contextBanner').classList.remove('hidden');
      const countNote = ch.totalEntries > 1 ? ` · ${ch.totalEntries} players on board` : '';
      document.getElementById('contextBannerText').textContent =
        `⚔️ 1v1 Challenge from ${ch.creatorName}${countNote} — Draft these exact 7 spins (${ch.scoring.toUpperCase()}, no rerolls)!`;
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
