/**
 * Shared board client.
 *
 * Talks to the Cloudflare Worker (see /worker), which holds the database
 * credentials and checks the edit PIN. Reads are open, writes need the PIN.
 */

import { hydrate } from './store.js';

const CONFIGURED = import.meta.env?.VITE_BOARD_ENDPOINT ?? 'https://lineup-board.alaaalzoubi321-986.workers.dev/board';
// Set VITE_BOARD_ENDPOINT=off to run purely local, without the shared board.
export const BOARD_ENDPOINT = CONFIGURED === 'off' ? '' : CONFIGURED;
const BOARD_BASE = BOARD_ENDPOINT.replace(/\/board\/?$/, '');
export const POLL_INTERVAL = 8000;
export const SAVE_DEBOUNCE = 700;

const PIN_STORAGE = 'lineup-studio-pin';

const emptyStatus = () => ({
  enabled: Boolean(BOARD_ENDPOINT),
  phase: BOARD_ENDPOINT ? 'connecting' : 'local',
  lastSync: 0,
  rev: 0,
  error: null,
  conflict: false,
});

export function createSync({ store, onChange = () => {}, onConflict = () => {} }) {
  const status = emptyStatus();
  const listeners = new Set();
  let pin = '';
  let rev = 0;
  let lastRemoteUpdatedAt = 0;
  let applyingRemote = false;
  let saveTimer = null;
  let pollTimer = null;
  let inFlight = false;

  function notify() {
    for (const fn of listeners) fn(status);
    onChange(status);
  }

  function setStatus(patch) {
    Object.assign(status, patch);
    notify();
  }

  function isUnlocked() {
    return Boolean(pin);
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${BOARD_BASE}${path}`, { ...options, signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  function applyRemote(doc, force = false) {
    if (!doc?.state) return false;
    if (!force && doc.updatedAt && doc.updatedAt <= lastRemoteUpdatedAt) return false;
    lastRemoteUpdatedAt = doc.updatedAt ?? 0;
    rev = doc.rev ?? rev;
    applyingRemote = true;
    store.replaceState(hydrate(doc.state));
    applyingRemote = false;
    return true;
  }

  async function refresh({ silent = false, force = false } = {}) {
    if (!status.enabled || inFlight) return;
    inFlight = true;
    try {
      const { ok, body } = await request('/board', { method: 'GET', headers: { accept: 'application/json' } });
      if (!ok) throw new Error(body?.error ?? `http_${body?.status ?? ''}`);
      const changed = applyRemote(body, force);
      setStatus({
        phase: isUnlocked() ? 'editing' : 'readonly',
        lastSync: Date.now(),
        rev: body.rev ?? 0,
        error: null,
        conflict: false,
      });
      if (changed) rev = body.rev ?? rev;
      if (!silent && body.state === null) setStatus({ phase: 'empty' });
    } catch (err) {
      setStatus({ phase: 'offline', error: err?.message ?? 'offline' });
    } finally {
      inFlight = false;
    }
  }

  async function save() {
    if (!status.enabled || !isUnlocked() || applyingRemote) return;
    const payload = JSON.stringify(store.state);
    if (payload.length > 380 * 1024) {
      setStatus({ error: 'board_too_large' });
      return;
    }
    try {
      const { ok, body } = await request('/board', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-board-pin': pin },
        body: JSON.stringify({ baseRev: rev, state: JSON.parse(payload) }),
      });
      if (body?.error === 'invalid_pin') {
        pin = '';
        sessionStorage.removeItem(PIN_STORAGE);
        store.setReadOnly(true);
        setStatus({ phase: 'readonly', error: 'invalid_pin' });
        return;
      }
      if (!ok) throw new Error(body?.error ?? 'save_failed');
      rev = body.rev ?? rev;
      lastRemoteUpdatedAt = body.updatedAt ?? lastRemoteUpdatedAt;
      setStatus({ phase: 'editing', lastSync: Date.now(), rev, error: null });
      if (body.conflict) {
        setStatus({ conflict: true });
        onConflict();
      }
    } catch (err) {
      setStatus({ error: err?.message ?? 'save_failed' });
    }
  }

  function scheduleSave() {
    if (!status.enabled || !isUnlocked() || applyingRemote) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DEBOUNCE);
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh({ silent: true });
  });

  store.subscribe(() => scheduleSave());

  return {
    status,
    subscribe(fn) {
      listeners.add(fn);
      fn(status);
      return () => listeners.delete(fn);
    },
    get unlocked() {
      return isUnlocked();
    },
    async start() {
      pin = sessionStorage.getItem(PIN_STORAGE) ?? '';
      if (!status.enabled) {
        store.setReadOnly(false);
        return;
      }
      await refresh();
      store.setReadOnly(!isUnlocked());
      startPolling();
      notify();
    },
    async unlock(pinValue) {
      const candidate = String(pinValue ?? '').trim();
      if (!candidate) return false;
      // Verify the PIN without writing: unlocking must never publish the
      // visitor's stale local copy over the shared board.
      const { ok, body } = await request('/verify', {
        method: 'GET',
        headers: { accept: 'application/json', 'x-board-pin': candidate },
      });
      if (body?.error === 'invalid_pin' || !ok) {
        setStatus({ error: 'invalid_pin' });
        return false;
      }
      pin = candidate;
      sessionStorage.setItem(PIN_STORAGE, candidate);
      // The board is the source of truth once you hold the PIN: adopt it
      // wholesale rather than merging in whatever this tab had cached.
      await refresh({ silent: true, force: true });
      store.setReadOnly(false);
      setStatus({ phase: 'editing', error: null, conflict: false });
      return true;
    },
    lock() {
      pin = '';
      sessionStorage.removeItem(PIN_STORAGE);
      clearTimeout(saveTimer);
      store.setReadOnly(true);
      setStatus({ phase: 'readonly', error: null, conflict: false });
    },
    refresh,
  };
}