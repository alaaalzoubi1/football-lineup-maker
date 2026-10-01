import { createStadium } from './stadium.js';
import { createDragController } from './drag.js';
import { createPitch } from './pitch.js';
import { createBench } from './bench.js';
import { createSidebar } from './sidebar.js';
import { downloadLineupPoster } from './exportPng.js';
import { store } from './store.js';
import { getFormation, starterSlotIds } from './data.js';
import { toast } from './util.js';

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
      if (result.ok) toast('Player benched');
      return;
    }
    if (!drop.startsWith('slot:')) return;
    const targetSlotId = drop.slice(5);
    if (originSlotId === targetSlotId) return;
    const result = store.dropPlayer(playerId, targetSlotId, originSlotId);
    if (!result.ok && result.reason === 'gk-outfield') {
      toast('Goalkeepers can only play in goal', 'warn');
      return;
    }
    if (result.ok && result.benched) {
      const benched = store.playerById(result.benched);
      if (benched) toast(`${benched.name} sent to the bench`);
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
    toast('Now tap another player to swap them');
  },
  onDragStateChange(active) {
    bench.classList.toggle('drag-active', active);
  },
});

document.getElementById('autoFill').addEventListener('click', () => {
  const { filled } = store.autoFill();
  toast(filled ? `Fielded ${filled} player${filled === 1 ? '' : 's'}` : 'No matching players on the bench', filled ? 'ok' : 'warn');
});

document.getElementById('clearXI').addEventListener('click', () => {
  if (!store.starters().length) return;
  store.clearLineup();
  toast('Pitch cleared - everyone to the bench');
});

document.getElementById('zoomIn').addEventListener('click', () => stadium?.zoom(0.82));
document.getElementById('zoomOut').addEventListener('click', () => stadium?.zoom(1.22));
document.getElementById('resetView').addEventListener('click', () => stadium?.resetView());

document.getElementById('exportPNG').addEventListener('click', async (event) => {
  const btn = event.currentTarget;
  btn.disabled = true;
  try {
    await downloadLineupPoster();
    toast('Lineup PNG downloaded');
  } catch (err) {
    console.error(err);
    toast('Could not export the poster', 'warn');
  } finally {
    btn.disabled = false;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'Escape') pitch?.clearSelection();
  if (event.key === 'f' || event.key === 'F') {
    const { filled } = store.autoFill();
    toast(filled ? `Fielded ${filled} player${filled === 1 ? '' : 's'}` : 'No matching players on the bench', filled ? 'ok' : 'warn');
  }
});

renderAll();
window.addEventListener('beforeunload', () => store.persistNow());

window.lineupStudio = { store, stadium, pitch, bench: benchUI };

if (!store.activeTeam.players.length) {
  setTimeout(() => toast('Add your squad on the left, then drag players onto the pitch'), 500);
}