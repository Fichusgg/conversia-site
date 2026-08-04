'use strict';

/**
 * Small HTTP helpers shared by the API functions.
 *
 * Files under /api whose name starts with "_" are not routed by Vercel, so this
 * directory holds shared code rather than endpoints.
 */

const crypto = require('crypto');

/**
 * Read the raw request body as a Buffer.
 *
 * HMAC signatures are computed over the exact bytes that were sent, so we must
 * not let anything re-serialise the payload first. Vercel's Node runtime only
 * parses `req.body` when it is accessed, so reading the stream here works as
 * long as no caller touches `req.body` beforehand. The `req.body` fallback
 * covers runtimes that parse eagerly — signature checks are skipped in that
 * case because the bytes can no longer be trusted to match.
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Returns { raw, body, rawIsAuthentic }.
 *
 * `rawIsAuthentic` is false when the stream was already drained and we had to
 * fall back to re-serialising `req.body`; callers that verify signatures must
 * refuse to do so in that case rather than validate against reconstructed bytes.
 */
async function readJson(req) {
  let raw = Buffer.alloc(0);

  try {
    raw = await readRawBody(req);
  } catch (error) {
    raw = Buffer.alloc(0);
  }

  if (raw.length > 0) {
    let body = null;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch (error) {
      body = null;
    }
    return { raw, body, rawIsAuthentic: true };
  }

  if (req.body && typeof req.body === 'object') {
    return {
      raw: Buffer.from(JSON.stringify(req.body), 'utf8'),
      body: req.body,
      rawIsAuthentic: false
    };
  }

  return { raw, body: null, rawIsAuthentic: true };
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Length-safe constant-time string comparison. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');

  // timingSafeEqual throws on length mismatch, so hash first to fix the length.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();

  return crypto.timingSafeEqual(hashA, hashB) && bufA.length === bufB.length;
}

/**
 * Shared-secret header auth for the endpoints Make calls.
 * Accepts either `x-bridge-secret: <secret>` or `authorization: Bearer <secret>`.
 */
function checkSharedSecret(req, expected) {
  if (!expected) return false;

  const headerSecret = req.headers['x-bridge-secret'];
  if (headerSecret && safeEqual(headerSecret, expected)) return true;

  const auth = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (match && safeEqual(match[1].trim(), expected)) return true;

  return false;
}

function requireEnv(...names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Missing environment variable(s): ${missing.join(', ')}`);
    error.code = 'MISSING_ENV';
    error.missing = missing;
    throw error;
  }
}

/** Best-effort client IP, for rate-limit-ish logging only. */
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket ? req.socket.remoteAddress : null;
}

module.exports = {
  readRawBody,
  readJson,
  json,
  safeEqual,
  checkSharedSecret,
  requireEnv,
  clientIp
};
