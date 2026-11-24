import {
  RULES_SEEN_KEY,
  SCORE_CONFIG,
  api,
  escapeHtml,
  getTodayUTC,
  trackEvent,
} from './data.js';

export function initModals({ state, onAuthChange, onWelcomeDismiss }) {
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
              ${r.difficulty === 'casual' ? `<span class="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 text-[10px] font-black" title="Casual Mode (roster listed)">📋 Casual</span>` : ''}
              <span class="text-[11px] font-bold ${r.hintsUsed === 0 ? 'text-emerald-400' : 'text-amber-400'}" title="${r.hintsUsed === 0 ? 'Pure (No Hints)' : `${r.hintsUsed} hint(s) used`}">${r.hintsUsed === 0 ? '🧠' : `💡${r.hintsUsed}`}</span>
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
      state.stats = data.stats;
      onAuthChange();
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
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black text-sm tabular ${s.wins === 17 ? 'text-amber-400' : 'text-emerald-400'}">${s.wins}-${s.losses}</span>
                <span class="font-bold tabular">${s.avgPPG.toFixed(1)} PPG</span>
                ${s.stackBonus > 0 ? `<span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[11px]">⚡ +${s.stackBonus.toFixed(1)}</span>` : ''}
                ${s.difficulty === 'casual' ? `<span class="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 font-bold text-[11px]">📋 Casual</span>` : ''}
                <span class="text-[11px] font-bold ${(s.hintsUsed || 0) === 0 ? 'text-emerald-400' : 'text-amber-400'}">${(s.hintsUsed || 0) === 0 ? '🧠 Pure' : `💡 ${s.hintsUsed}`}</span>
              </div>
              <span class="text-[var(--muted-foreground)]">${s.mode} · ${s.scoring.toUpperCase()} · ${s.boardDate}</span>
            </div>
            <div class="text-[11px] text-[var(--muted-foreground)] truncate">${escapeHtml(s.roster.map(p => `${p.name} '${String(p.year).slice(-2)}`).join(' · '))}</div>
          </a>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function setAuthTab(mode) {
    state.authMode = mode;
    const isReg = mode === 'register';
    document.getElementById('tabLogin').className = `flex-1 py-1.5 rounded-md font-bold cursor-pointer ${!isReg ? 'bg-emerald-600 text-white' : 'text-[var(--muted-foreground)]'}`;
    document.getElementById('tabRegister').className = `flex-1 py-1.5 rounded-md font-bold cursor-pointer ${isReg ? 'bg-emerald-600 text-white' : 'text-[var(--muted-foreground)]'}`;
    document.getElementById('authUserLabel').textContent = isReg ? 'Username' : 'Username or Email';
    document.getElementById('authUser').placeholder = isReg ? '3–20 letters, numbers, or _' : 'Username or email';
    document.getElementById('authEmailWrap').classList.toggle('hidden', !isReg);
    document.getElementById('authEmail').required = isReg;
    document.getElementById('btnAuthSubmit').textContent = isReg ? 'Create Account' : 'Sign In';
    document.getElementById('authPass').autocomplete = isReg ? 'new-password' : 'current-password';
  }

  function openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authError').classList.add('hidden');
    if (state.user) {
      document.getElementById('authSignedIn').classList.remove('hidden');
      document.getElementById('authForm').classList.add('hidden');
      document.getElementById('authUsernameLabel').textContent = `@${state.user.username}`;
      const emailDisp = document.getElementById('authEmailDisplay');
      const addForm = document.getElementById('addEmailForm');
      if (state.user.email) {
        emailDisp.textContent = state.user.email;
        addForm.classList.add('hidden');
      } else {
        emailDisp.textContent = 'No email on file (optional)';
        addForm.classList.remove('hidden');
        document.getElementById('addEmailMsg').classList.add('hidden');
      }
    } else {
      document.getElementById('authSignedIn').classList.add('hidden');
      document.getElementById('authForm').classList.remove('hidden');
      setAuthTab(state.authMode);
    }
  }

  function openHelpModal(isFirstVisit = false) {
    document.getElementById('btnCloseHelp').textContent = isFirstVisit ? 'Start Drafting →' : 'Back to Draft';
    document.getElementById('helpModal').classList.remove('hidden');
  }

  function closeHelpModal() {
    document.getElementById('helpModal').classList.add('hidden');
    try { localStorage.setItem(RULES_SEEN_KEY, '1'); } catch (_) {}
    onWelcomeDismiss();
  }

  // Bind modal listeners
  document.getElementById('btnLeaderboard').addEventListener('click', openLeaderboard);
  document.getElementById('btnCloseLB').addEventListener('click', () => document.getElementById('lbModal').classList.add('hidden'));
  document.getElementById('lbModal').addEventListener('click', (e) => {
    if (e.target.id === 'lbModal') document.getElementById('lbModal').classList.add('hidden');
  });

  document.getElementById('btnHOF').addEventListener('click', openHOF);
  document.getElementById('btnCloseHOF').addEventListener('click', () => document.getElementById('hofModal').classList.add('hidden'));
  document.getElementById('hofModal').addEventListener('click', (e) => {
    if (e.target.id === 'hofModal') document.getElementById('hofModal').classList.add('hidden');
  });

  document.getElementById('btnAccount').addEventListener('click', openAuthModal);
  document.getElementById('btnCloseAuth').addEventListener('click', () => document.getElementById('authModal').classList.add('hidden'));
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target.id === 'authModal') document.getElementById('authModal').classList.add('hidden');
  });
  document.getElementById('tabLogin').addEventListener('click', () => setAuthTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => setAuthTab('register'));

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('authError');
    errEl.classList.add('hidden');
    try {
      const isReg = state.authMode === 'register';
      const endpoint = isReg ? '/api/auth/register' : '/api/auth/login';
      const body = isReg
        ? {
            username: document.getElementById('authUser').value,
            email: document.getElementById('authEmail').value,
            password: document.getElementById('authPass').value,
          }
        : {
            identifier: document.getElementById('authUser').value,
            password: document.getElementById('authPass').value,
          };
      const res = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      state.user = res.user;
      state.stats = res.stats;
      document.getElementById('authPass').value = '';
      if (isReg) trackEvent('account_registered');
      onAuthChange();
      document.getElementById('authModal').classList.add('hidden');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('addEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('addEmailMsg');
    msg.classList.add('hidden');
    try {
      const res = await api('/api/auth/email', {
        method: 'POST',
        body: JSON.stringify({ email: document.getElementById('addEmailInput').value }),
      });
      state.user = res.user;
      document.getElementById('authEmailDisplay').textContent = res.user.email;
      document.getElementById('addEmailForm').classList.add('hidden');
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'text-rose-400 font-bold';
    }
  });

  document.getElementById('btnLogout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    state.user = null;
    onAuthChange();
    document.getElementById('authModal').classList.add('hidden');
  });

  document.getElementById('btnHelp').addEventListener('click', () => openHelpModal(false));
  document.getElementById('btnCloseHelp').addEventListener('click', closeHelpModal);
  document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') closeHelpModal();
  });

  return { openHelpModal };
}
