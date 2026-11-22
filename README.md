# KNOW BALL — All-Time Fantasy Football Draft (Railway + SQLite)

Prove you know ball: spin historical NFL franchises & 5-year windows, pick exact seasons from **6,421 real player-seasons (1999–2025)**, and chase **17-0** across actual weekly game logs from `nflverse`.

## Features
- **Zero-account guest play:** Works immediately with an `HttpOnly` anonymous session cookie (persists Daily lock-in, Hall of Fame, and streaks).
- **Optional accounts (best-practice security):** `scrypt` password hashing with random 16-byte salts & constant-time verification (`crypto.timingSafeEqual`), SHA-256 hashed 32-byte session tokens in SQLite, `HttpOnly`/`SameSite=Lax`/`Secure` cookies, and automatic claiming of prior guest runs on sign-up.
- **Crowd Pick Rates & Daily Leaderboard:** See exact-year & player pick-rate percentages, `💎 Rare Gem` badges, Daily percentiles, and today's Top 25 board.
- **Shareable Permalinks & 1v1 Challenges:** Every completed run gets a `/r/<code>` permalink (with Open Graph meta tags) and a `/c/<code>` blind 1v1 friend challenge link.
- **Zero native C++ build dependencies:** Uses Node 22's built-in `node:sqlite` in WAL mode.

## Deploy to Railway (2 minutes)
1. Push this directory to a GitHub repository.
2. In Railway, click **New Project → Deploy from GitHub Repo** and select your repo (`Dockerfile` + `railway.json` are auto-detected).
3. **Add persistent SQLite storage:** Open your Railway service → **Volumes → Add Volume** → set Mount Path to `/data`.
   - The app automatically detects `/data` and stores the SQLite database at `/data/nfl17.db` (or set `DB_PATH` explicitly).
4. Railway sets `PORT` automatically and checks `/api/health`.

## Local Development
```bash
npm install
npm run dev
# http://localhost:3000
```
