import { createStadium } from './stadium.js';
import { createDragController } from './drag.js';
import { createPitch } from './pitch.js';
import { createBench } from './bench.js';
import { createSidebar } from './sidebar.js';
import { downloadLineupPoster, renderLineupPoster } from './exportPng.js';
import { store } from './store.js';
import { getFormation, starterSlotIds } from './data.js';
import { createSync } from './sync.js';
import { toast } from './util.js';
import { LANGS, applyDom, getLang, initLang, onLangChange, t, toggleLang } from './i18n.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('scene');
const overlay = document.getElementById('overlay');
const bench = document.getElementById('bench');
const benchTrack = document.getElementById('benchTrack');
const benchSub = document.getElementById('benchSub');

const toolbar = document.getElementById('toolbar');

function chromeHeight(el, fallback) {
  if (!el) return fallback;
  const rect = el.getBoundingClientRect();
  return rect.height > 0 ? rect.height : fallback;
}

let stadium;
try {
  stadium = createStadium({
    canvas,
    stage,
    safeTop: () => chromeHeight(toolbar, 56) + 14,
    safeBottom: () => chromeHeight(bench, 140) + 14,
  });
} catch (err) {
  overlay.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#9fb2bd">
    WebGL is unavailable in this browser, so the 3D pitch cannot be drawn.<br />You can still add players and export a lineup PNG.</div>`;
  console.error(err);
}

const pitch = stadium ? createPitch({ overlay, stadium }) : null;
const benchUI = createBench({ bench, track: benchTrack, subLabel: benchSub });
const sidebar = createSidebar();

function renderAll() {
  sidebar.render();
  if (pitch) pitch.render();
  benchUI.render();
  if (stadium) stadium.setTeamColor(store.activeTeam.color);
  validateLineup();
}

function validateLineup() {
  const team = store.activeTeam;
  const allowed = new Set(starterSlotIds(team.formation));
  for (const slotId of Object.keys(team.lineup)) {
    if (!allowed.has(slotId)) team.lineup[slotId] = null;
  }
}

store.subscribe(renderAll);

createDragController({
  onDrop({ playerId, origin, drop }) {
    if (!drop) return;
    const originSlotId = typeof origin === 'string' && origin.startsWith('slot:') ? origin.slice(5) : null;
    if (drop === 'bench') {
      const result = store.dropPlayer(playerId, null, originSlotId);
      if (result.ok) toast(t('toast.benched'));
      return;
    }
    if (!drop.startsWith('slot:')) return;
    const targetSlotId = drop.slice(5);
    if (originSlotId === targetSlotId) return;
    const result = store.dropPlayer(playerId, targetSlotId, originSlotId);
    if (!result.ok && result.reason === 'gk-outfield') {
      toast(t('toast.gkOnly'), 'warn');
      return;
    }
    if (result.ok && result.benched) {
      const benched = store.playerById(result.benched);
      if (benched) toast(t('toast.sentOff', { name: benched.name }));
    }
    pitch?.clearSelection();
  },
  onTap({ origin }) {
    if (!pitch) return;
    if (typeof origin !== 'string' || !origin.startsWith('slot:')) {
      pitch.clearSelection();
      return;
    }
    const slotId = origin.slice(5);
    const selected = pitch.selectedSlotId;
    if (selected && selected !== slotId) {
      store.swap(selected, slotId);
      pitch.clearSelection();
      return;
    }
    pitch.select(slotId);
    toast(t('toast.swapHint'));
  },
  onDragStateChange(active) {
    bench.classList.toggle('drag-active', active);
  },
});

document.getElementById('autoFill').addEventListener('click', () => {
  const { filled } = store.autoFill();
  toast(filled ? t('toast.fielded', { count: filled }) : t('toast.noMatches'), filled ? 'ok' : 'warn');
});

document.getElementById('clearXI').addEventListener('click', () => {
  if (!store.starters().length) return;
  store.clearLineup();
  toast(t('toast.pitchCleared'));
});

document.getElementById('zoomIn').addEventListener('click', () => stadium?.zoom(0.82));
document.getElementById('zoomOut').addEventListener('click', () => stadium?.zoom(1.22));
document.getElementById('resetView').addEventListener('click', () => stadium?.resetView());

document.getElementById('exportPNG').addEventListener('click', async (event) => {
  const btn = event.currentTarget;
  btn.disabled = true;
  try {
    await downloadLineupPoster();
    toast(t('toast.pngDownloaded'));
  } catch (err) {
    console.error(err);
    toast(t('toast.exportFailed'), 'warn');
  } finally {
    btn.disabled = false;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'Escape') {
    pitch?.clearSelection();
    closePinModal();
  }
  if (event.key === 'f' || event.key === 'F') {
    const { filled } = store.autoFill();
    toast(filled ? t('toast.fielded', { count: filled }) : t('toast.noMatches'), filled ? 'ok' : 'warn');
  }
});

renderAll();
window.addEventListener('beforeunload', () => store.persistNow());

/* ----------------------------- shared board ----------------------------- */

const boardPill = document.getElementById('boardPill');
const boardLabel = document.getElementById('boardLabel');
const pinModal = document.getElementById('pinModal');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');
const pinCancel = document.getElementById('pinCancel');
const pinFoot = document.getElementById('pinFoot');

const sync = createSync({
  store,
  onChange: renderBoardPill,
  onConflict: () => toast(t('toast.conflict'), 'warn'),
});

/* Phase classes are fixed; the words come from the dictionary so they change
   with the language. `key` is looked up again on every language change. */
const PHASES = {
  local: { cls: 'is-local', key: 'board.local' },
  connecting: { cls: 'is-connecting', key: 'board.connecting' },
  readonly: { cls: 'is-readonly', key: 'board.readonly' },
  empty: { cls: 'is-readonly', key: 'board.empty' },
  editing: { cls: 'is-live', key: 'board.editing' },
  offline: { cls: 'is-offline', key: 'board.offline' },
  conflict: { cls: 'is-live', key: 'board.conflict' },
};

const BOARD_TITLE = {
  on: 'board.titleLong',
  off: 'board.titleOff',
};

function renderBoardPill(status) {
  const key = status.phase === 'editing' && status.conflict ? 'conflict' : status.phase;
  const phase = PHASES[key] ?? PHASES.local;
  boardPill.className = `board-pill ${phase.cls}`;
  boardLabel.textContent = t(phase.key);
  if (status.error === 'invalid_pin') {
    boardPill.className = 'board-pill is-error';
    boardLabel.textContent = t('board.wrongPin');
  }
  boardPill.title = t(status.enabled ? BOARD_TITLE.on : BOARD_TITLE.off);
}

function openPinModal() {
  pinModal.hidden = false;
  pinError.hidden = true;
  pinInput.value = '';
  pinFoot.textContent = t(sync.unlocked ? 'pin.footLocked' : 'pin.foot');
  document.getElementById('pinTitle').textContent = t(sync.unlocked ? 'pin.titleLocked' : 'pin.title');
  document.querySelector('#pinForm button[type="submit"]').textContent = t(
    sync.unlocked ? 'action.lock' : 'action.unlock',
  );
  pinInput.focus();
}

function closePinModal() {
  pinModal.hidden = true;
}

boardPill.addEventListener('click', openPinModal);
pinCancel.addEventListener('click', closePinModal);
pinModal.addEventListener('click', (event) => {
  if (event.target === pinModal) closePinModal();
});

pinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sync.unlocked) {
    sync.lock();
    closePinModal();
    toast(t('toast.locked'));
    return;
  }
  const ok = await sync.unlock(pinInput.value);
  if (!ok) {
    pinError.hidden = false;
    pinInput.value = '';
    pinInput.focus();
    return;
  }
  closePinModal();
  toast(t('toast.unlocked'), 'ok');
});

store.onBlocked = () => {
  if (pinModal.hidden) openPinModal();
};

window.lineupStudio = { store, stadium, pitch, bench: benchUI, sync, renderPoster: renderLineupPoster };

sync.start().then(() => {
  if (!sync.status.enabled) return;
  if (!sync.unlocked) {
    setTimeout(() => toast(t('toast.boardLoaded'), 'ok'), 900);
  }
});

if (!store.activeTeam.players.length) {
  setTimeout(() => toast(t('toast.addSquad')), 500);
}

/* ------------------------------ language ------------------------------ */

const langToggle = document.getElementById('langToggle');
const langLabel = document.getElementById('langLabel');

function renderLangToggle() {
  const lang = getLang();
  const next = LANGS.find((entry) => entry.id !== lang);
  langLabel.textContent = LANGS.find((entry) => entry.id === next.id)?.native ?? next.id;
  langToggle.setAttribute('aria-label', t('action.switchLang', { lang: next.name }));
  langToggle.setAttribute('title', t('action.switchLang', { lang: next.name }));
}

langToggle.addEventListener('click', () => {
  toggleLang();
  // Pin keys may hold live text; re-apply them from the dictionary.
  if (!pinModal.hidden) openPinModal();
  renderBoardPill(sync.status);
});

onLangChange(() => {
  applyDom();
  renderLangToggle();
  sidebar.render();
  benchUI.render();
  pitch.render();
  renderBoardPill(sync.status);
});

initLang();
renderLangToggle();