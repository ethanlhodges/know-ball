const SITE_ORIGIN = 'https://knowball.app';

const POS_LIST = ['QB', 'RB', 'WR', 'TE'];
const ERA_LIST = ['1999–04', '2005–09', '2010–14', '2015–19', '2020–25'];
const TEAMS = [
  { id: 'ARI', name: 'Arizona Cardinals', bg: '#97233F', fg: '#FFFFFF' },
  { id: 'ATL', name: 'Atlanta Falcons', bg: '#A71930', fg: '#FFFFFF' },
  { id: 'BAL', name: 'Baltimore Ravens', bg: '#241773', fg: '#FFFFFF' },
  { id: 'BUF', name: 'Buffalo Bills', bg: '#00338D', fg: '#FFFFFF' },
  { id: 'CAR', name: 'Carolina Panthers', bg: '#0085CA', fg: '#FFFFFF' },
  { id: 'CHI', name: 'Chicago Bears', bg: '#0B162A', fg: '#F38B00' },
  { id: 'CIN', name: 'Cincinnati Bengals', bg: '#FB4F14', fg: '#FFFFFF' },
  { id: 'CLE', name: 'Cleveland Browns', bg: '#311D00', fg: '#FF3C00' },
  { id: 'DAL', name: 'Dallas Cowboys', bg: '#041E42', fg: '#FFFFFF' },
  { id: 'DEN', name: 'Denver Broncos', bg: '#FB4F14', fg: '#FFFFFF' },
  { id: 'DET', name: 'Detroit Lions', bg: '#0076B6', fg: '#FFFFFF' },
  { id: 'GB',  name: 'Green Bay Packers', bg: '#203731', fg: '#FFB612' },
  { id: 'HOU', name: 'Houston Texans', bg: '#03202F', fg: '#FFFFFF' },
  { id: 'IND', name: 'Indianapolis Colts', bg: '#002C5F', fg: '#FFFFFF' },
  { id: 'JAX', name: 'Jacksonville Jaguars', bg: '#006778', fg: '#FFFFFF' },
  { id: 'KC',  name: 'Kansas City Chiefs', bg: '#E31837', fg: '#FFFFFF' },
  { id: 'LAC', name: 'Los Angeles Chargers', bg: '#0080C6', fg: '#FFC20E' },
  { id: 'LAR', name: 'Los Angeles Rams', bg: '#003594', fg: '#FFD100' },
  { id: 'LV',  name: 'Las Vegas Raiders', bg: '#161618', fg: '#E4E4E7' },
  { id: 'MIA', name: 'Miami Dolphins', bg: '#008E97', fg: '#FFFFFF' },
  { id: 'MIN', name: 'Minnesota Vikings', bg: '#4F2683', fg: '#FFC62F' },
  { id: 'NE',  name: 'New England Patriots', bg: '#002244', fg: '#FFFFFF' },
  { id: 'NO',  name: 'New Orleans Saints', bg: '#101820', fg: '#D3BC8D' },
  { id: 'NYG', name: 'New York Giants', bg: '#0B2265', fg: '#FFFFFF' },
  { id: 'NYJ', name: 'New York Jets', bg: '#125740', fg: '#FFFFFF' },
  { id: 'PHI', name: 'Philadelphia Eagles', bg: '#004C54', fg: '#FFFFFF' },
  { id: 'PIT', name: 'Pittsburgh Steelers', bg: '#101820', fg: '#FFB612' },
  { id: 'SEA', name: 'Seattle Seahawks', bg: '#002244', fg: '#69BE28' },
  { id: 'SF',  name: 'San Francisco 49ers', bg: '#AA0000', fg: '#FFFFFF' },
  { id: 'TB',  name: 'Tampa Bay Buccaneers', bg: '#D50A0A', fg: '#FFFFFF' },
  { id: 'TEN', name: 'Tennessee Titans', bg: '#0C2340', fg: '#4B92DB' },
  { id: 'WAS', name: 'Washington Commanders', bg: '#5A1414', fg: '#FFB612' },
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function teamBadge(teamIdx) {
  const t = TEAMS[teamIdx] || { id: 'NFL', bg: '#334155', fg: '#fff' };
  return `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide" style="background:${t.bg};color:${t.fg}">${t.id}</span>`;
}

function posBadge(pos) {
  const cls = pos === 'QB' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : pos === 'RB' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : pos === 'WR' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return `<span class="inline-block px-1.5 py-0.5 rounded border text-[10px] font-black ${cls}">${esc(pos)}</span>`;
}

function renderLayout({ title, description, canonicalPath, activeNav = '', bodyHtml, gaSnippet = '', adsenseHead = '' }) {
  const navLinks = [
    { href: '/', label: 'Play', key: 'play' },
    { href: '/how-to-play', label: 'How to Play', key: 'how-to-play' },
    { href: '/records', label: 'All-Time Records', key: 'records' },
    { href: '/about', label: 'About', key: 'about' },
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${SITE_ORIGIN}${canonicalPath}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${SITE_ORIGIN}${canonicalPath}" />
  ${gaSnippet}
  ${adsenseHead}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>.tabular { font-variant-numeric: tabular-nums; }</style>
</head>
<body class="bg-[#0b0f17] text-[#f1f5f9] antialiased min-h-screen">
  <div class="max-w-4xl mx-auto px-3 sm:px-5 py-4 space-y-4">

    <!-- Broadcast Header (matches homepage) -->
    <header class="flex flex-wrap items-center justify-between gap-2.5">
      <a href="/" class="flex items-center gap-2.5 group">
        <div class="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-black text-base tracking-tight shadow-sm group-hover:bg-emerald-500 transition">
          KNOW BALL
        </div>
        <div class="leading-tight">
          <div class="text-sm sm:text-base font-extrabold tracking-tight text-[#f1f5f9]">ALL-TIME FANTASY DRAFT</div>
          <div class="text-xs text-[#94a3b8]">Chase 17-0 · 1999–2025 NFL Game Logs</div>
        </div>
      </a>

      <a href="/" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
        🏈 Play Today’s Draft
      </a>
    </header>

    <!-- Site Navigation (matches homepage) -->
    <nav class="flex flex-wrap items-center gap-1 border-b border-[#263248] pb-2.5 text-xs font-bold">
      ${navLinks.map(n => `
        <a href="${n.href}" class="px-2.5 py-1 rounded-md transition ${activeNav === n.key ? 'bg-emerald-600 text-white' : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#131a26]'}">${n.label}</a>
      `).join('')}
    </nav>

    <main class="space-y-6 text-sm text-slate-300 leading-relaxed pt-2">
      ${bodyHtml}
    </main>

    <footer class="pt-4 border-t border-[#263248] flex flex-wrap items-center justify-between gap-2 pb-4 text-[11px] text-[#94a3b8]">
      <span>© KNOW BALL (<a href="${SITE_ORIGIN}" class="hover:text-[#f1f5f9] underline">knowball.app</a>) · Independent fantasy football trivia game, not affiliated with the NFL.</span>
      <div class="flex flex-wrap items-center gap-3">
        <a href="/how-to-play" class="hover:text-[#f1f5f9] underline">How to Play</a>
        <a href="/records" class="hover:text-[#f1f5f9] underline">All-Time Records</a>
        <a href="/about" class="hover:text-[#f1f5f9] underline">About</a>
        <a href="/privacy" class="hover:text-[#f1f5f9] underline">Privacy Policy</a>
        <a href="/terms" class="hover:text-[#f1f5f9] underline">Terms</a>
        <a href="/ads.txt" class="hover:text-[#f1f5f9] underline">ads.txt</a>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function buildRecordsData(playersRaw) {
  const raw = JSON.parse(playersRaw);
  const allSeasons = [];
  for (const r of raw) {
    const [name, posIdx, teamIdx, eraIdx, seasons] = r;
    const pos = POS_LIST[posIdx];
    for (const s of seasons) {
      const [year, games, ppr, half, std, stat] = s;
      allSeasons.push({ name, pos, teamIdx, eraIdx, year, games, ppr, half, std, stat });
    }
  }

  // Filter to full/meaningful seasons (min 10 games) for record rankings
  const qualified = allSeasons.filter(s => s.games >= 10);
  const sortByHalf = (a, b) => b.half - a.half || b.games - a.games;

  const top25 = [...qualified].sort(sortByHalf).slice(0, 25);

  const topByPos = {};
  for (const pos of POS_LIST) {
    topByPos[pos] = qualified.filter(s => s.pos === pos).sort(sortByHalf).slice(0, 10);
  }

  const bestByTeam = TEAMS.map((t, idx) => {
    const best = qualified.filter(s => s.teamIdx === idx).sort(sortByHalf)[0] || null;
    return { team: t, teamIdx: idx, best };
  });

  const bestByEra = ERA_LIST.map((era, idx) => ({
    era,
    top: qualified.filter(s => s.eraIdx === idx).sort(sortByHalf).slice(0, 5),
  }));

  return {
    totalSeasons: allSeasons.length,
    totalEntries: raw.length,
    top25,
    topByPos,
    bestByTeam,
    bestByEra,
  };
}

function renderSeasonTable(rows, { showRank = true } = {}) {
  return `
    <div class="overflow-x-auto rounded-xl border border-[#263248] bg-[#131a26]">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-[#263248] bg-[#1a2333] text-[11px] uppercase tracking-wider text-slate-400">
            ${showRank ? '<th class="py-2.5 px-3 font-bold">#</th>' : ''}
            <th class="py-2.5 px-3 font-bold">Player</th>
            <th class="py-2.5 px-3 font-bold">Year</th>
            <th class="py-2.5 px-3 font-bold">Team</th>
            <th class="py-2.5 px-3 font-bold">Pos</th>
            <th class="py-2.5 px-3 font-bold text-right">GP</th>
            <th class="py-2.5 px-3 font-bold text-right">Half-PPR</th>
            <th class="py-2.5 px-3 font-bold text-right hidden sm:table-cell">PPR</th>
            <th class="py-2.5 px-3 font-bold hidden md:table-cell">Season Stat Line</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#263248] tabular">
          ${rows.map((s, i) => `
            <tr class="hover:bg-[#1a2333]/60">
              ${showRank ? `<td class="py-2 px-3 font-black text-slate-400">${i + 1}</td>` : ''}
              <td class="py-2 px-3 font-bold text-white whitespace-nowrap">${esc(s.name)}</td>
              <td class="py-2 px-3 font-semibold text-slate-300">${s.year}</td>
              <td class="py-2 px-3">${teamBadge(s.teamIdx)}</td>
              <td class="py-2 px-3">${posBadge(s.pos)}</td>
              <td class="py-2 px-3 text-right text-slate-400">${s.games}</td>
              <td class="py-2 px-3 text-right font-black text-emerald-400">${s.half.toFixed(1)}</td>
              <td class="py-2 px-3 text-right text-slate-300 hidden sm:table-cell">${s.ppr.toFixed(1)}</td>
              <td class="py-2 px-3 text-slate-400 hidden md:table-cell">${esc(s.stat)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function createEditorialPages({ playersRaw, buildGaSnippet, buildAdsenseHead }) {
  const records = buildRecordsData(playersRaw);

  const howToPlayBody = `
    <div class="space-y-3">
      <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
        Official Guide &amp; Strategy
      </div>
      <h1 class="text-3xl font-black text-white tracking-tight">How to Play KNOW BALL</h1>
      <p class="text-base text-slate-300">
        KNOW BALL is a daily all-time NFL fantasy football draft game powered by <strong>${records.totalSeasons.toLocaleString()} real player-seasons (1999–2025)</strong> from <code class="text-emerald-300">nflverse</code>. Your goal is simple: build a 7-player Half-PPR starting lineup across seven random franchise &amp; era prompts and chase a <strong>17–0 undefeated season</strong>.
      </p>
    </div>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-4">
      <h2 class="text-lg font-black text-white">1. The 7-Round Draft &amp; Roster Slots</h2>
      <p>
        Every game consists of <strong>7 rounds</strong>. Each round locks in an NFL franchise (all 32 teams, including relocated histories like San Diego/LA Chargers, St. Louis/LA Rams, and Oakland/Las Vegas Raiders) paired with a 5-year era window:
        <strong>1999–04</strong>, <strong>2005–09</strong>, <strong>2010–14</strong>, <strong>2015–19</strong>, or <strong>2020–25</strong>.
      </p>
      <p>You must fill all 7 fantasy starting spots by the end of Round 7:</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div class="rounded-xl border border-[#263248] bg-[#1a2333] p-3"><div class="font-black text-rose-300">1× QB</div><div class="text-slate-400 mt-0.5">Quarterback</div></div>
        <div class="rounded-xl border border-[#263248] bg-[#1a2333] p-3"><div class="font-black text-emerald-300">2× RB</div><div class="text-slate-400 mt-0.5">Running Backs</div></div>
        <div class="rounded-xl border border-[#263248] bg-[#1a2333] p-3"><div class="font-black text-sky-300">2× WR</div><div class="text-slate-400 mt-0.5">Wide Receivers</div></div>
        <div class="rounded-xl border border-[#263248] bg-[#1a2333] p-3"><div class="font-black text-amber-300">1× TE + 1× FLEX</div><div class="text-slate-400 mt-0.5">TE &amp; RB/WR/TE</div></div>
      </div>
      <p>
        After choosing a player who played for that franchise in that era, you pick the <strong>exact season</strong> you want to draft (for example, choosing 2006 LaDainian Tomlinson vs. 2007 LaDainian Tomlinson). Picking the player's true peak year is often the difference between 15–2 and 17–0.
      </p>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-4">
      <h2 class="text-lg font-black text-white">2. Real 17-Week Simulation &amp; Injury Fill-Ins</h2>
      <p>
        Instead of just summing season averages, KNOW BALL simulates a full <strong>17-week fantasy schedule</strong> using each drafted player's actual historical weekly Half-PPR game logs.
      </p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Real boom/bust variance:</strong> High-ceiling players can carry you through tough opponent weeks, while inconsistent players can cost you close matchups.</li>
        <li><strong>Durability matters:</strong> If you draft an injury-shortened season (e.g., a player who only appeared in 10 games), the missing weeks are automatically filled by realistic replacement-level waiver wire scores. A 16- or 17-game superstar often outperforms a slightly higher PPG player who missed half the year.</li>
        <li><strong>Half-PPR scoring:</strong> 0.5 points per reception, 1 point per 10 rushing/receiving yards, 1 point per 25 passing yards, 6 points per rushing/receiving TD, and 4 points per passing TD (with standard turnover deductions).</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-4">
      <h2 class="text-lg font-black text-white">3. Stack Bonuses (+2.5 or +4.0 PPG/Week)</h2>
      <p>
        Drafting a Quarterback and a pass-catcher (Wide Receiver or Tight End) from the same franchise unlocks a weekly <strong>Stack Bonus</strong> added to your score in every single one of the 17 weeks:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-1">
          <div class="font-black text-amber-300 text-sm">⚡ Era Stack: +2.5 PPG/wk</div>
          <p class="text-slate-300">Your QB and WR/TE played for the <strong>same franchise in the same 5-year era</strong> (e.g., 2018 Patrick Mahomes + 2019 Tyreek Hill).</p>
        </div>
        <div class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-1">
          <div class="font-black text-emerald-300 text-sm">🔥 Exact-Season Stack: +4.0 PPG/wk</div>
          <p class="text-slate-300">Your QB and WR/TE played for the <strong>same franchise in the exact same year</strong> (e.g., 2007 Tom Brady + 2007 Randy Moss).</p>
        </div>
      </div>
      <p class="text-xs text-slate-400">
        Pro tip: Because +4.0 PPG/wk adds <strong>+68 total fantasy points</strong> over a 17-week season, locking in an exact-season stack can turn a good 13–4 lineup into a 17–0 juggernaut.
      </p>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-4">
      <h2 class="text-lg font-black text-white">4. Game Modes, Rerolls &amp; Grading</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <h3 class="font-black text-white">Daily Challenge</h3>
          <p>Everyone worldwide receives the exact same 7 spins and the exact same 17-week opponent schedule each day (resetting at 00:00 UTC). Compete for the Daily Top 25 Leaderboard, build a daily streak, and compare your exact-season crowd pick percentages.</p>
        </div>
        <div class="space-y-1.5">
          <h3 class="font-black text-white">Unlimited &amp; 1v1 Challenges</h3>
          <p>Draft endlessly in Unlimited mode, then click <strong>⚔️ Challenge a Friend</strong> after any run (Daily or Unlimited) to generate a blind <code>/c/...</code> link with your exact 7 spins. Friends draft with 0 rerolls and unlock a side-by-side pick comparison and challenge leaderboard when they finish.</p>
        </div>
        <div class="space-y-1.5">
          <h3 class="font-black text-white">Pro vs. Casual Difficulty</h3>
          <p><strong>Pro mode</strong> tests pure football memory via search. <strong>Casual mode</strong> displays an alphabetical directory of eligible players for the current franchise &amp; era—great for learning historical rosters.</p>
        </div>
        <div class="space-y-1.5">
          <h3 class="font-black text-white">Grades, Optimal % &amp; 💎 Rare Gems</h3>
          <p>Each pick is graded <strong>S, A, B, C, D, or F</strong> against the best open positional option on that spin. After your draft, inspect the Optimal Board to see the mathematically highest-scoring 7-player lineup possible—and hunt for <strong>💎 Rare Gems</strong> (picks chosen by 10% or fewer of players).</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-4">
      <h2 class="text-lg font-black text-white">5. Winning Strategy Tips</h2>
      <ol class="list-decimal pl-5 space-y-2">
        <li><strong>Don't punt Tight End early:</strong> Elite TE seasons (Travis Kelce, Rob Gronkowski, Jimmy Graham, Tony Gonzalez, Antonio Gates) are concentrated in specific franchises and eras. Grabbing an S-tier TE when KC, NE, NO, or LAC appears saves you from being stuck with a 7 PPG TE in Round 7.</li>
        <li><strong>Save your Team &amp; Era Rerolls for bad fits:</strong> You get 1 Team reroll and 1 Era reroll in Daily and Unlimited modes. Hold them for Rounds 5–7 when you only have 1–2 positional slots open (like TE or QB) and land on a franchise that lacked a top option in that era.</li>
        <li><strong>Study the franchise peak seasons:</strong> Check our <a href="/records" class="text-emerald-400 underline font-bold">All-Time Records</a> page to memorize the highest-scoring fantasy seasons for all 32 franchises and every era window.</li>
      </ol>
    </section>

    <div class="flex flex-wrap items-center gap-3 pt-2">
      <a href="/" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition">🏈 Play Today’s Daily Draft</a>
      <a href="/records" class="px-5 py-2.5 rounded-xl border border-[#263248] bg-[#131a26] hover:bg-[#1a2333] text-white font-bold text-xs transition">🏆 Browse All-Time Records (1999–2025)</a>
    </div>
  `;

  const recordsBody = `
    <div class="space-y-3">
      <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
        1999–2025 Historical Database · ${records.totalSeasons.toLocaleString()} Player-Seasons
      </div>
      <h1 class="text-3xl font-black text-white tracking-tight">All-Time Fantasy Football Records (1999–2025)</h1>
      <p class="text-base text-slate-300">
        Every season below comes directly from KNOW BALL's real weekly <code class="text-emerald-300">nflverse</code> fantasy database (Half-PPR PPG, minimum 10 games played). Use these rankings as a study guide to spot S-tier picks, franchise legends, and era-defining seasons when chasing 17–0.
      </p>
    </div>

    <section class="space-y-3">
      <div>
        <h2 class="text-xl font-black text-white">Top 25 Single-Season Fantasy Performances (1999–2025)</h2>
        <p class="text-xs text-slate-400 mt-1">
          The highest-scoring Half-PPR per-game seasons across all positions (QB, RB, WR, TE) over the last 27 NFL seasons. Notice how prime 2000s workhorse running backs and dual-threat modern quarterbacks dominate the top of the leaderboard.
        </p>
      </div>
      ${renderSeasonTable(records.top25)}
    </section>

    <section class="space-y-5">
      <div>
        <h2 class="text-xl font-black text-white">Top 10 Seasons by Position</h2>
        <p class="text-xs text-slate-400 mt-1">
          Positional scarcity is the key to drafting an optimal 7-player squad. Comparing the drop-off at Tight End versus Running Back and Quarterback shows why grabbing an iconic TE season when the right franchise appears can swing your entire 17-week record.
        </p>
      </div>
      <div class="space-y-6">
        ${POS_LIST.map(pos => `
          <div class="space-y-2">
            <h3 class="text-base font-black text-white flex items-center gap-2">${posBadge(pos)} <span>Top 10 ${pos} Fantasy Seasons (Half-PPR)</span></h3>
            ${renderSeasonTable(records.topByPos[pos])}
          </div>
        `).join('')}
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h2 class="text-xl font-black text-white">Best Single Fantasy Season by NFL Franchise (All 32 Teams)</h2>
        <p class="text-xs text-slate-400 mt-1">
          The #1 highest-scoring Half-PPR season (min. 10 games) in our 1999–2025 database for each of the 32 NFL franchises.
        </p>
      </div>
      <div class="overflow-x-auto rounded-xl border border-[#263248] bg-[#131a26]">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[#263248] bg-[#1a2333] text-[11px] uppercase tracking-wider text-slate-400">
              <th class="py-2.5 px-3 font-bold">Franchise</th>
              <th class="py-2.5 px-3 font-bold">Best Season</th>
              <th class="py-2.5 px-3 font-bold">Pos</th>
              <th class="py-2.5 px-3 font-bold text-right">Half-PPR</th>
              <th class="py-2.5 px-3 font-bold hidden md:table-cell">Stat Line</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#263248] tabular">
            ${records.bestByTeam.map(({ team, teamIdx, best }) => best ? `
              <tr class="hover:bg-[#1a2333]/60">
                <td class="py-2 px-3 whitespace-nowrap flex items-center gap-2">${teamBadge(teamIdx)} <span class="font-bold text-slate-200">${esc(team.name)}</span></td>
                <td class="py-2 px-3 font-bold text-white whitespace-nowrap">${esc(best.name)} <span class="text-slate-400 font-semibold">(${best.year})</span></td>
                <td class="py-2 px-3">${posBadge(best.pos)}</td>
                <td class="py-2 px-3 text-right font-black text-emerald-400">${best.half.toFixed(1)}</td>
                <td class="py-2 px-3 text-slate-400 hidden md:table-cell">${esc(best.stat)}</td>
              </tr>
            ` : '').join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-black text-white">Top 5 Fantasy Seasons by Era Window</h2>
        <p class="text-xs text-slate-400 mt-1">
          Each KNOW BALL spin locks into one of five eras. Here are the five highest-scoring Half-PPR seasons in each window.
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${records.bestByEra.map(({ era, top }) => `
          <div class="rounded-xl border border-[#263248] bg-[#131a26] p-4 space-y-2.5">
            <h3 class="text-sm font-black text-amber-300 uppercase tracking-wider">${esc(era)} Era Leaders</h3>
            <div class="divide-y divide-[#263248] text-xs tabular">
              ${top.map((s, idx) => `
                <div class="py-2 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-slate-500 font-black w-4">${idx + 1}.</span>
                    ${teamBadge(s.teamIdx)}
                    <span class="font-bold text-white truncate">${esc(s.name)}</span>
                    <span class="text-slate-400 shrink-0">’${String(s.year).slice(-2)}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    ${posBadge(s.pos)}
                    <span class="font-black text-emerald-400">${s.half.toFixed(1)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-3 pt-2">
      <a href="/" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition">🏈 Put Your Knowledge to the Test</a>
      <a href="/how-to-play" class="px-5 py-2.5 rounded-xl border border-[#263248] bg-[#131a26] hover:bg-[#1a2333] text-white font-bold text-xs transition">📖 Read the Strategy Guide</a>
    </div>
  `;

  const aboutBody = `
    <div class="space-y-3">
      <h1 class="text-3xl font-black text-white tracking-tight">About KNOW BALL</h1>
      <p class="text-base text-slate-300">
        KNOW BALL is an independent daily fantasy football trivia and draft-simulation game built for NFL fans who love debating historical peak seasons, sleeper stacks, and forgotten fantasy league-winners.
      </p>
    </div>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-3">
      <h2 class="text-lg font-black text-white">Data &amp; Methodology</h2>
      <p>
        Every player-season and weekly box score in KNOW BALL is derived from historical NFL player statistics spanning <strong>1999 through 2025</strong> via the open-source <code class="text-emerald-300">nflverse</code> dataset. Our curated database covers <strong>${records.totalSeasons.toLocaleString()} individual player-seasons</strong> across all 32 NFL franchises and 5 distinct era windows, ensuring 100% coverage of every Team × Era × Position combination on the wheel.
      </p>
      <p>
        Relocated franchises are unified under their modern franchise lineage (for example, St. Louis Rams and Los Angeles Rams share the <strong>LAR</strong> pool; San Diego and Los Angeles Chargers share <strong>LAC</strong>; Oakland and Las Vegas Raiders share <strong>LV</strong>; Washington Redskins, Football Team, and Commanders share <strong>WAS</strong>).
      </p>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-3">
      <h2 class="text-lg font-black text-white">Fair Play &amp; Independent Status</h2>
      <p>
        KNOW BALL is a free-to-play trivia and simulation game with no real-money wagering, entry fees, or cash prizes. KNOW BALL is an independent fan project and is not affiliated with, endorsed by, or sponsored by the National Football League (NFL), the NFLPA, or any individual NFL franchise.
      </p>
    </section>

    <section class="rounded-2xl border border-[#263248] bg-[#131a26] p-5 sm:p-6 space-y-3">
      <h2 class="text-lg font-black text-white">Contact &amp; Feedback</h2>
      <p>
        Spotted a missing player-season, stat discrepancy, or bug—or have an idea for a new feature? Reach out anytime at
        <a href="mailto:hello@knowball.app" class="text-emerald-400 underline font-bold">hello@knowball.app</a>.
      </p>
    </section>
  `;

  const termsBody = `
    <div class="space-y-2">
      <h1 class="text-3xl font-black text-white tracking-tight">Terms of Use</h1>
      <p class="text-xs text-slate-400">Last updated: April 2026 · knowball.app</p>
    </div>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">1. Acceptance of Terms</h2>
      <p>By accessing or playing KNOW BALL (<strong>knowball.app</strong>), you agree to these Terms of Use and our <a href="/privacy" class="text-emerald-400 underline">Privacy Policy</a>.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">2. Entertainment Only</h2>
      <p>KNOW BALL is provided strictly for free, non-commercial entertainment and trivia purposes. No real-money gambling, betting, or cash prizes are offered on this site.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">3. Usernames &amp; Community Conduct</h2>
      <p>If you create an optional account, you agree to choose a respectful username and not attempt to abuse, scrape, or manipulate leaderboards, APIs, or challenge links. We reserve the right to remove offensive usernames or fraudulent leaderboard entries.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">4. Intellectual Property &amp; Disclaimer</h2>
      <p>Historical NFL statistics are factual sports data compiled from public sources. All NFL team names and marks belong to their respective owners. KNOW BALL is not affiliated with the NFL or any NFL team. The service is provided "as is" without warranties of any kind.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">5. Contact</h2>
      <p>Questions about these Terms? Contact <a href="mailto:hello@knowball.app" class="text-emerald-400 underline">hello@knowball.app</a>.</p>
    </section>
  `;

  const privacyBody = `
    <div class="space-y-2">
      <h1 class="text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
      <p class="text-xs text-slate-400">Last updated: April 2026 · knowball.app</p>
    </div>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">1. Information We Collect</h2>
      <p>KNOW BALL can be played completely without an account. We use an anonymous <code>HttpOnly</code> browser cookie to save your completed drafts, Daily Challenge streaks, and Hall of Fame on our server. If you optionally create an account, we store your chosen username, email address, and a salted <code>scrypt</code> hash of your password (we never store plaintext passwords). Emails are never displayed publicly.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">2. Analytics &amp; Advertising</h2>
      <p>We use <strong>Google Analytics 4</strong> to understand aggregate traffic and gameplay trends (such as page views and completed drafts). We also display advertisements served by <strong>Google AdSense</strong>. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</p>
      <p>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline">Google Ads Settings</a> or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline">aboutads.info</a>.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">3. Public Leaderboards &amp; Shared Links</h2>
      <p>Completed Daily Challenge runs may appear on the public Daily Leaderboard alongside your username (or "Guest" if playing anonymously). Shareable result links (<code>/r/...</code>) and 1v1 challenge links (<code>/c/...</code>) are publicly viewable by anyone with the link.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">4. Local Storage &amp; Cookies</h2>
      <p>We store lightweight preferences (such as Pro vs. Casual mode and whether you have seen the welcome rules) in your browser's local storage, and session/anonymous IDs in first-party cookies.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-base font-bold text-white">5. Contact</h2>
      <p>If you have questions about this Privacy Policy or would like to request deletion of your account data, please contact us at <a href="mailto:hello@knowball.app" class="text-emerald-400 underline">hello@knowball.app</a>.</p>
    </section>
  `;

  return {
    howToPlayHtml: () => renderLayout({
      title: 'How to Play KNOW BALL — Rules, Scoring, Stacks & Strategy Guide',
      description: 'Learn how to play KNOW BALL: Half-PPR scoring, +2.5 and +4.0 QB-WR stack bonuses, real 17-week weekly game log simulations, S–F grading, and Daily vs. 1v1 strategy tips.',
      canonicalPath: '/how-to-play',
      activeNav: 'how-to-play',
      bodyHtml: howToPlayBody,
      gaSnippet: buildGaSnippet(),
      adsenseHead: buildAdsenseHead(),
    }),
    recordsHtml: () => renderLayout({
      title: 'All-Time Fantasy Football Records (1999–2025) — KNOW BALL',
      description: 'Explore the top 25 single-season Half-PPR fantasy football performances (1999–2025), top 10 seasons by position (QB, RB, WR, TE), and the best fantasy season for all 32 NFL franchises.',
      canonicalPath: '/records',
      activeNav: 'records',
      bodyHtml: recordsBody,
      gaSnippet: buildGaSnippet(),
      adsenseHead: buildAdsenseHead(),
    }),
    aboutHtml: () => renderLayout({
      title: 'About KNOW BALL — All-Time NFL Fantasy Football Draft Game',
      description: 'About KNOW BALL, our 1999–2025 nflverse fantasy football dataset covering 32 NFL franchises and 5 eras, fair play policy, and contact info.',
      canonicalPath: '/about',
      activeNav: 'about',
      bodyHtml: aboutBody,
      gaSnippet: buildGaSnippet(),
      adsenseHead: buildAdsenseHead(),
    }),
    termsHtml: () => renderLayout({
      title: 'Terms of Use — KNOW BALL',
      description: 'Terms of Use for KNOW BALL (knowball.app), an independent free-to-play NFL fantasy football trivia game.',
      canonicalPath: '/terms',
      activeNav: '',
      bodyHtml: termsBody,
      gaSnippet: buildGaSnippet(),
      adsenseHead: '',
    }),
    privacyHtml: () => renderLayout({
      title: 'Privacy Policy — KNOW BALL',
      description: 'Privacy Policy for KNOW BALL (knowball.app), including cookies, Google Analytics 4, Google AdSense, and account data practices.',
      canonicalPath: '/privacy',
      activeNav: '',
      bodyHtml: privacyBody,
      gaSnippet: buildGaSnippet(),
      adsenseHead: '',
    }),
    robotsTxt: () => [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
      '',
    ].join('\n'),
    sitemapXml: () => {
      const urls = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/how-to-play', priority: '0.9', changefreq: 'monthly' },
        { loc: '/records', priority: '0.9', changefreq: 'monthly' },
        { loc: '/about', priority: '0.7', changefreq: 'monthly' },
        { loc: '/privacy', priority: '0.4', changefreq: 'yearly' },
        { loc: '/terms', priority: '0.4', changefreq: 'yearly' },
      ];
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
        urls.map(u => `  <url><loc>${SITE_ORIGIN}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')
      }\n</urlset>\n`;
    },
  };
}

module.exports = { createEditorialPages };
