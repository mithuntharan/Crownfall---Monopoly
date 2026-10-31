/**
 * Crownfall Multiplayer Security & Abuse Protection Layer
 *
 * Implements:
 * 1. Monotonic in-memory token-bucket rate limiting per action category.
 * 2. Connection, payload, and user-input validation (room codes, names, colors, sizes).
 * 3. Cloudflare Turnstile CAPTCHA server-side token verification with fail-closed semantics.
 * 4. Bounded security event logging with rate-limited console reporting (prevents log DoS).
 * 5. Reliable proxy-aware client IP extraction (configurable via TRUST_PROXY).
 *
 * Zero external dependencies: uses built-in Node.js modules (https, http, crypto).
 */

const https = require('https');
const crypto = require('crypto');

// ─── MONOTONIC CLOCK HELPER ──────────────────────────────────────────────────

function getMonotonicTimeMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

// ─── CLIENT IP EXTRACTION ─────────────────────────────────────────────────────

function resolveClientIp(req) {
  const trustProxy = process.env.TRUST_PROXY === 'true' || 
    (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'false');
  
  if (trustProxy && req && req.headers) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      const firstIp = forwarded.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp.trim();
    }
  }

  return (req && req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

// ─── TOKEN BUCKET RATE LIMITER ────────────────────────────────────────────────

const RATE_LIMIT_CONFIGS = {
  ROOM_CREATE: {
    maxTokens: parseInt(process.env.RATE_LIMIT_ROOM_CREATE_BURST || '5', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_ROOM_CREATE_RATE || '0.00833'), // 1 token per 120s (~5 per 10m)
    description: 'Room creation',
  },
  ROOM_JOIN: {
    maxTokens: parseInt(process.env.RATE_LIMIT_ROOM_JOIN_BURST || '15', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_ROOM_JOIN_RATE || '0.25'), // 1 token per 4s (~15 per min)
    description: 'Room join requests',
  },
  JOIN_REQUEST_RESPOND: {
    maxTokens: parseInt(process.env.RATE_LIMIT_JOIN_RESPOND_BURST || '30', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_JOIN_RESPOND_RATE || '0.5'), // 1 token per 2s (~30 per min)
    description: 'Join request responses',
  },
  CHAT_MESSAGE: {
    maxTokens: parseInt(process.env.RATE_LIMIT_CHAT_BURST || '10', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_CHAT_RATE || '1.0'), // 1 token per second
    description: 'In-game chat messages',
  },
  RECONNECT: {
    maxTokens: parseInt(process.env.RATE_LIMIT_RECONNECT_BURST || '20', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_RECONNECT_RATE || '0.33'), // 1 token per 3s (~20 per min)
    description: 'Room reconnect attempts',
  },
  GAMEPLAY_ACTION: {
    maxTokens: parseInt(process.env.RATE_LIMIT_GAMEPLAY_BURST || '25', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_GAMEPLAY_RATE || '5.0'), // 5 tokens per sec sustained, 25 burst
    description: 'In-game player actions',
  },
  GENERAL_API: {
    maxTokens: parseInt(process.env.RATE_LIMIT_GENERAL_BURST || '100', 10),
    refillRatePerSec: parseFloat(process.env.RATE_LIMIT_GENERAL_RATE || '2.0'), // 2 tokens per sec (~120 per min)
    description: 'General API requests',
  },
};

const MAX_TRACKED_KEYS_PER_BUCKET = 5000;
const ENTRY_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

class TokenBucketLimiter {
  constructor(category, config) {
    this.category = category;
    this.maxTokens = config.maxTokens;
    this.refillRatePerSec = config.refillRatePerSec;
    this.description = config.description;
    this.buckets = new Map(); // key -> { tokens, lastRefillMs, lastAccessMs }
  }

  consume(key, count = 1) {
    const now = getMonotonicTimeMs();
    let entry = this.buckets.get(key);

    if (!entry) {
      if (this.buckets.size >= MAX_TRACKED_KEYS_PER_BUCKET) {
        // Evict oldest entry to prevent unbounded memory growth
        const oldestKey = this.buckets.keys().next().value;
        this.buckets.delete(oldestKey);
      }
      entry = {
        tokens: this.maxTokens,
        lastRefillMs: now,
        lastAccessMs: now,
      };
      this.buckets.set(key, entry);
    }

    // Refill tokens based on monotonic elapsed time
    const elapsedSec = (now - entry.lastRefillMs) / 1000;
    entry.tokens = Math.min(this.maxTokens, entry.tokens + (elapsedSec * this.refillRatePerSec));
    entry.lastRefillMs = now;
    entry.lastAccessMs = now;

    if (entry.tokens >= count) {
      entry.tokens -= count;
      return { allowed: true, remaining: Math.floor(entry.tokens), retryAfter: 0, retryAfterSec: 0 };
    }

    const deficit = count - entry.tokens;
    const retryAfterSec = Math.max(1, Math.ceil(deficit / this.refillRatePerSec));
    return {
      allowed: false,
      remaining: 0,
      retryAfter: retryAfterSec,
      retryAfterSec,
      description: this.description,
    };
  }

  sweepStaleEntries() {
    const now = getMonotonicTimeMs();
    for (const [key, entry] of this.buckets.entries()) {
      if (now - entry.lastAccessMs > ENTRY_EXPIRY_MS) {
        this.buckets.delete(key);
      }
    }
  }
}

class RateLimiterRegistry {
  constructor() {
    this.limiters = new Map();
    for (const [category, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
      this.limiters.set(category, new TokenBucketLimiter(category, config));
    }

    // Periodically sweep expired rate limiter entries every 60 seconds
    this.sweepInterval = setInterval(() => {
      for (const limiter of this.limiters.values()) {
        limiter.sweepStaleEntries();
      }
    }, 60 * 1000);
    if (this.sweepInterval && typeof this.sweepInterval.unref === 'function') {
      this.sweepInterval.unref();
    }
  }

  check(category, key, count = 1) {
    const limiter = this.limiters.get(category);
    if (!limiter) return { allowed: true, remaining: 100, retryAfter: 0, retryAfterSec: 0 };
    return limiter.consume(key, count);
  }

  consume(category, key, count = 1) {
    return this.check(category, key, count);
  }
}

const globalRateLimiter = new RateLimiterRegistry();

// ─── CLOUDFLARE TURNSTILE CAPTCHA VERIFIER ────────────────────────────────────

// Suspicious IP tracking (e.g. repeated failed room joins)
const suspiciousJoinIps = new Map(); // ip -> { failedCount, firstFailMs, lastFailMs }

function recordFailedJoin(ip) {
  if (!ip) return;
  const now = Date.now();
  const entry = suspiciousJoinIps.get(ip) || { failedCount: 0, firstFailMs: now, lastFailMs: now };
  if (now - entry.firstFailMs > 5 * 60 * 1000) {
    // Reset window after 5 minutes
    entry.failedCount = 1;
    entry.firstFailMs = now;
  } else {
    entry.failedCount += 1;
  }
  entry.lastFailMs = now;
  suspiciousJoinIps.set(ip, entry);

  // Keep suspicious tracking map bounded
  if (suspiciousJoinIps.size > 2000) {
    const oldestKey = suspiciousJoinIps.keys().next().value;
    suspiciousJoinIps.delete(oldestKey);
  }
}

function clearSuspiciousJoin(ip) {
  if (ip) suspiciousJoinIps.delete(ip);
}

function isIpSuspicious(ip) {
  if (!ip) return false;
  const entry = suspiciousJoinIps.get(ip);
  if (!entry) return false;
  const now = Date.now();
  if (now - entry.firstFailMs > 5 * 60 * 1000) {
    suspiciousJoinIps.delete(ip);
    return false;
  }
  return entry.failedCount >= 3;
}

/**
 * Server-side verification for Cloudflare Turnstile token.
 * Uses environment variable TURNSTILE_SECRET_KEY / CAPTCHA_SECRET_KEY.
 * Never exposes secrets to client or bundles.
 */
async function verifyCaptchaToken(token, clientIp = null) {
  const secretKey = (process.env.TURNSTILE_SECRET_KEY || process.env.CAPTCHA_SECRET_KEY || '').trim();
  const enforcement = (process.env.CAPTCHA_ENFORCEMENT || 'auto').toLowerCase().trim(); // 'always' | 'suspicious' | 'auto' | 'off'

  if (enforcement === 'off') {
    return { ok: true, valid: true, verified: false, reason: 'enforcement_off' };
  }

  // If secret key is not provisioned:
  if (!secretKey) {
    if (enforcement === 'always') {
      return {
        ok: false,
        valid: false,
        error: 'Human verification is strictly enforced, but TURNSTILE_SECRET_KEY is not configured on the server. Please contact administrator.',
        code: 'CAPTCHA_CONFIGURATION_MISSING',
      };
    }
    // In auto or suspicious mode without secret key, allow legitimate users
    return { ok: true, valid: true, verified: false, reason: 'no_secret_configured' };
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      valid: false,
      error: 'Human verification required. Please complete the CAPTCHA challenge before continuing.',
      code: 'CAPTCHA_REQUIRED',
    };
  }

  const cleanToken = token.trim();

  try {
    const postData = new URLSearchParams({
      secret: secretKey,
      response: cleanToken,
      ...(clientIp ? { remoteip: clientIp } : {})
    }).toString();

    const result = await new Promise((resolve, reject) => {
      const req = https.request('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 6000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error('Invalid JSON from Turnstile endpoint'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Turnstile verification request timed out'));
      });

      req.write(postData);
      req.end();
    });

    if (result && result.success) {
      if (clientIp) clearSuspiciousJoin(clientIp);
      return { ok: true, valid: true, verified: true };
    }

    const errCodes = (result && result['error-codes']) ? result['error-codes'].join(', ') : 'invalid-token';
    return {
      ok: false,
      valid: false,
      error: `Human verification failed (${errCodes}). Please reload and complete the challenge.`,
      code: 'CAPTCHA_INVALID',
    };
  } catch (err) {
    return {
      ok: false,
      valid: false,
      error: 'Verification provider temporarily unreachable. Please retry.',
      code: 'CAPTCHA_SERVICE_UNAVAILABLE',
    };
  }
}

// ─── PAYLOAD & INPUT VALIDATION ───────────────────────────────────────────────

const ROOM_CODE_REGEX = /^[A-Za-z0-9_-]{3,16}$/;
const VALID_COLORS = new Set([
  'saffron', 'teal', 'plum', 'blue', 'gold', 'burgundy', 'emerald', 'coral', 'bronze', 'purple'
]);

function validateRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  return ROOM_CODE_REGEX.test(clean);
}

function sanitizePlayerName(name, fallback = 'Guest Player') {
  if (!name || typeof name !== 'string') return fallback;
  // Strip control characters, tabs, newlines, and limit to 20 chars
  const clean = name.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 20);
  return clean || fallback;
}

function validateColor(color) {
  if (!color || typeof color !== 'string') return null;
  const clean = color.trim().toLowerCase();
  return VALID_COLORS.has(clean) ? clean : null;
}

// ─── SECURITY EVENT LOGGER (BOUNDED RING BUFFER) ──────────────────────────────

const MAX_SECURITY_LOG_SIZE = 200;
const securityEventLog = [];
const consoleThrottleMap = new Map(); // category:ip -> lastLogMs

function logSecurityEvent(type, details = {}) {
  const now = Date.now();
  const entry = {
    id: `sec_${now}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: now,
    type,
    ...details,
  };

  securityEventLog.push(entry);
  if (securityEventLog.length > MAX_SECURITY_LOG_SIZE) {
    securityEventLog.shift();
  }

  // Console output throttled to max 1 line per 2 seconds per event category to avoid console DoS
  const throttleKey = `${type}:${details.ip || 'global'}`;
  const lastLog = consoleThrottleMap.get(throttleKey) || 0;
  if (now - lastLog > 2000) {
    consoleThrottleMap.set(throttleKey, now);
    // Sanitize log output (no secrets, no full auth tokens)
    const safeDetails = { ...details };
    delete safeDetails.sessionToken;
    delete safeDetails.secret;
    delete safeDetails.token;
    console.warn(`[SECURITY] [${type}]`, JSON.stringify(safeDetails));
  }

  // Periodic cleanup of throttle map
  if (consoleThrottleMap.size > 1000) {
    for (const [k, t] of consoleThrottleMap.entries()) {
      if (now - t > 10000) consoleThrottleMap.delete(k);
    }
  }
}

module.exports = {
  getMonotonicTimeMs,
  resolveClientIp,
  globalRateLimiter,
  RATE_LIMIT_CONFIGS,
  verifyCaptchaToken,
  recordFailedJoin,
  clearSuspiciousJoin,
  isIpSuspicious,
  validateRoomCode,
  sanitizePlayerName,
  validateColor,
  VALID_COLORS,
  logSecurityEvent,
  securityEventLog,
};
