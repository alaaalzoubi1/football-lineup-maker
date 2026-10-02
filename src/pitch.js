import * as THREE from 'three';
import { getFormation } from './data.js';
import { store } from './store.js';
import { pitchCardHTML, slotPlaceholderHTML } from './cards.js';
import { clamp } from './util.js';

const ANCHOR_HEIGHT = 0.9;
const CARD_W = 122;
const CARD_H = 76;
const SCALE_SAFETY = 0.66;
const scaleBuf = [];

export function createPitch({ overlay, stadium }) {
  const slotEls = new Map();
  const projected = new THREE.Vector3();
  let selectedSlotId = null;
  let lastScale = -1;

  function ensureSlots(slots) {
    const wanted = new Set(slots.map((s) => s.id));
    for (const [id, el] of slotEls) {
      if (!wanted.has(id)) {
        el.remove();
        slotEls.delete(id);
      }
    }
    for (const slot of slots) {
      if (slotEls.has(slot.id)) continue;
      const el = document.createElement('div');
      el.className = 'slot empty';
      el.dataset.slot = slot.id;
      overlay.appendChild(el);
      slotEls.set(slot.id, el);
    }
  }

  function render() {
    const team = store.activeTeam;
    const formation = getFormation(team.formation);
    ensureSlots(formation.slots);

    for (const slot of formation.slots) {
      const el = slotEls.get(slot.id);
      const player = store.playerById(team.lineup[slot.id]);
      const filled = Boolean(player);
      el.dataset.drop = `slot:${slot.id}`;
      el.dataset.filled = filled ? '1' : '0';
      el.classList.toggle('filled', filled);
      el.classList.toggle('empty', !filled);
      el.classList.toggle('selected', slot.id === selectedSlotId);
      el.innerHTML = `<div class="slot-inner">${
        filled ? pitchCardHTML({ ...player, slotId: slot.id }, team) : slotPlaceholderHTML(slot.pos)
      }</div>`;
    }

    stadium.setSlots(
      formation.slots.map((slot) => ({
        id: slot.id,
        x: slot.x,
        z: slot.z,
        playerId: team.lineup[slot.id],
      })),
    );
    stadium.setShape(
      formation.slots.filter((slot) => team.lineup[slot.id]).map((slot) => ({ x: slot.x, z: slot.z })),
    );
    stadium.setSelected(selectedSlotId);
  }

  function project() {
    const formation = getFormation(store.activeTeam.formation);
    const camera = stadium.camera;
    const width = overlay.clientWidth;
    const height = overlay.clientHeight;

    let count = 0;
    let scale = 1;
    for (const slot of formation.slots) {
      const el = slotEls.get(slot.id);
      if (!el) continue;
      projected.set(slot.x, ANCHOR_HEIGHT, slot.z).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      const behind = projected.z > 1;
      const outside = x < -140 || x > width + 140 || y < -120 || y > height + 120;
      if (behind || outside) {
        el.style.visibility = 'hidden';
        continue;
      }
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      el.style.zIndex = String(1000 - Math.round(projected.z * 900));
      scaleBuf[count * 2] = x;
      scaleBuf[count * 2 + 1] = y;
      count += 1;
    }

    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const dx = Math.abs(scaleBuf[i * 2] - scaleBuf[j * 2]);
        const dy = Math.abs(scaleBuf[i * 2 + 1] - scaleBuf[j * 2 + 1]);
        scale = Math.min(scale, SCALE_SAFETY * Math.max(dx / CARD_W, dy / CARD_H));
      }
    }
/* The floor has to be low enough for a phone in portrait, where the play area
   is a short strip: at 0.34 the cards hit the clamp and start overlapping
   each other instead of just getting smaller. */
scale = clamp(scale, 0.2, 1);
    if (Number.isFinite(scale) && Math.abs(scale - lastScale) > 0.004) {
      lastScale = scale;
      overlay.style.setProperty('--slot-scale', scale.toFixed(3));
    }
  }

  function syncSelectionClasses() {
    for (const [id, el] of slotEls) el.classList.toggle('selected', id === selectedSlotId);
    stadium.setSelected(selectedSlotId);
  }

  function select(slotId) {
    selectedSlotId = selectedSlotId === slotId ? null : slotId;
    syncSelectionClasses();
  }

  function clearSelection() {
    if (selectedSlotId === null) return false;
    selectedSlotId = null;
    syncSelectionClasses();
    return true;
  }

  stadium.onFrame(project);

  return {
    render,
    project,
    select,
    clearSelection,
    get selectedSlotId() {
      return selectedSlotId;
    },
    slotElement(slotId) {
      return slotEls.get(slotId) ?? null;
    },
  };
}