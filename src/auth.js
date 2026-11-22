const crypto = require('node:crypto');
const { db } = require('./db');

const SESSION_COOKIE = 'nfl17_sid';
const ANON_COOKIE = 'nfl17_anon';
const SESSION_DAYS = 30;
const IS_PROD = process.env.NODE_ENV === 'production';

// OWASP-recommended scrypt parameters: N=16384, r=8, p=1, 64-byte key, 16-byte random salt
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, derived) => {
      if (err) return reject(err);
      resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve) => {
    const parts = String(storedHash || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
    const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
    const salt = parts[4];
    const expectedHex = parts[5];
    crypto.scrypt(password, salt, expectedHex.length / 2, { N, r, p }, (err, derived) => {
      if (err) return resolve(false);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (derived.length !== expectedBuf.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derived, expectedBuf));
    });
  });
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/',
    maxAge: maxAgeMs,
  };
}

function createSession(res, userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`).run(tokenHash, userId, expiresAt);
  res.cookie(SESSION_COOKIE, rawToken, cookieOpts(SESSION_DAYS * 86400 * 1000));
}

function destroySession(req, res) {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (raw) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(raw));
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// Middleware: attaches req.user (if signed in) and guarantees req.anonId cookie for guests
function attachIdentity(req, res, next) {
  let anonId = req.cookies?.[ANON_COOKIE];
  if (!anonId || typeof anonId !== 'string' || anonId.length < 16 || anonId.length > 64) {
    anonId = crypto.randomBytes(16).toString('hex');
    res.cookie(ANON_COOKIE, anonId, cookieOpts(365 * 86400 * 1000));
  }
  req.anonId = anonId;
  req.user = null;

  const rawSid = req.cookies?.[SESSION_COOKIE];
  if (rawSid && typeof rawSid === 'string') {
    const row = db.prepare(`
      SELECT u.id, u.username, u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now')
    `).get(hashToken(rawSid));
    if (row) {
      req.user = { id: row.id, username: row.username, createdAt: row.created_at };
    }
  }
  next();
}

// Simple in-memory sliding-window rate limiter (no extra dependencies)
function rateLimit({ windowMs = 60000, max = 20 }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const list = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (list.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
    }
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) {
      for (const [k, v] of hits.entries()) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
    }
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  attachIdentity,
  rateLimit,
};
