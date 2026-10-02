/**
 * Lineup board API.
 *
 * Static-site backend: the browser talks to this Worker, the Worker talks to a
 * Cloudflare D1 SQLite database holding both the board and the PIN digest.
 * The PIN itself is never stored or transmitted anywhere.
 *
 *   GET  /board            -> { rev, updatedAt, state }   (public read)
 *   PUT  /board            -> { rev, updatedAt, conflict } (needs X-Board-Pin)
 *   GET  /verify           -> { ok: true }                 (checks X-Board-Pin, writes nothing)
 *   GET  /health           -> { ok: true }
 */

const MAX_BODY_BYTES = 400 * 1024;
const WINDOW_MS = 60_000;
const READ_LIMIT = 120;
const WRITE_LIMIT = 30;

/**
 * Echo the request origin only when it is on the allowlist, so other sites
 * cannot read or write the board from their own pages.
 */
function resolveOrigin(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  if (!origin) return '*';
  const allowed = (env.origins ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return origin;
  return allowed.includes(origin) ? origin : allowed[0];
}

function responder(request, env) {
  const base = {
    'cache-control': 'no-store',
    'access-control-allow-origin': resolveOrigin(request, env),
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type, x-board-pin',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
  return {
    json: (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...base, 'content-type': 'application/json; charset=utf-8', ...extra },
      }),
    empty: () => new Response(null, { status: 204, headers: base }),
  };
}

/** Best-effort per-IP throttle (in memory; Workers isolates are ephemeral). */
const hits = new Map();

function throttled(request, kind) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'anon';
  const now = Date.now();
  const limit = kind === 'write' ? WRITE_LIMIT : READ_LIMIT;
  const key = `${kind}:${ip}`;
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= limit) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The editor PIN is never stored: only its SHA-256 digest sits in D1, which is
 * not reachable from the public internet. A wrong PIN cannot be brute forced
 * through this endpoint because /verify is rate limited like a write.
 */
async function pinMatches(env, candidate) {
  if (typeof candidate !== 'string') return false;
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('pin_hash').first();
  const stored = row?.value;
  if (typeof stored !== 'string' || !stored) return false;
  const a = await sha256Hex(candidate.trim());
  const b = stored.trim().toLowerCase();
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function readBoard(env) {
  const row = await env.DB.prepare('SELECT rev, updated_at, payload FROM board WHERE id = 1').first();
  if (!row) return { rev: 0, updatedAt: 0, state: null };
  try {
    const state = JSON.parse(row.payload);
    return { rev: Number(row.rev) || 0, updatedAt: Number(row.updated_at) || 0, state };
  } catch {
    return { rev: 0, updatedAt: 0, state: null };
  }
}

async function handleGet(request, env, res) {
  if (throttled(request, 'read')) return res.json({ error: 'rate_limited' }, 429);
  try {
    return res.json(await readBoard(env));
  } catch {
    return res.json({ error: 'storage_unavailable' }, 503);
  }
}

async function handlePut(request, env, res) {
  if (throttled(request, 'write')) return res.json({ error: 'rate_limited' }, 429);
  if (!(await pinMatches(env, request.headers.get('x-board-pin')))) {
    return res.json({ error: 'invalid_pin' }, 403);
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return res.json({ error: 'payload_too_large' }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return res.json({ error: 'invalid_json' }, 400);
  }
  if (!payload || typeof payload !== 'object' || !payload.state || typeof payload.state !== 'object') {
    return res.json({ error: 'invalid_payload' }, 400);
  }

  const serialized = JSON.stringify(payload.state);
  if (serialized.length > MAX_BODY_BYTES) return res.json({ error: 'payload_too_large' }, 413);

  let current;
  try {
    current = await readBoard(env);
  } catch {
    return res.json({ error: 'storage_unavailable' }, 503);
  }

  const conflict = current.rev > 0 && Number(payload.baseRev) !== current.rev;
  const next = { rev: current.rev + 1, updatedAt: Date.now() };

  try {
    await env.DB.prepare(
      `INSERT INTO board (id, rev, updated_at, payload) VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, updated_at = excluded.updated_at, payload = excluded.payload`,
    )
      .bind(next.rev, next.updatedAt, serialized)
      .run();
  } catch {
    return res.json({ error: 'storage_unavailable' }, 503);
  }
  return res.json({ rev: next.rev, updatedAt: next.updatedAt, conflict });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const res = responder(request, env);

    if (request.method === 'OPTIONS') return res.empty();
    if (url.pathname === '/health') return res.json({ ok: true });
    if (url.pathname === '/verify') {
      if (throttled(request, 'write')) return res.json({ error: 'rate_limited' }, 429);
      if (!(await pinMatches(env, request.headers.get('x-board-pin')))) {
        return res.json({ error: 'invalid_pin' }, 403);
      }
      return res.json({ ok: true });
    }
    if (url.pathname !== '/board') return res.json({ error: 'not_found' }, 404);

    try {
      if (request.method === 'GET') return await handleGet(request, env, res);
      if (request.method === 'PUT') return await handlePut(request, env, res);
      return res.json({ error: 'method_not_allowed' }, 405);
    } catch {
      return res.json({ error: 'server_error' }, 500);
    }
  },
};