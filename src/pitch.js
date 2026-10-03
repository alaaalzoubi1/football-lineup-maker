import * as THREE from 'three';
import { getFormation } from './data.js';
import { store } from './store.js';
import { pitchCardHTML, slotPlaceholderHTML } from './cards.js';
import { clamp } from './util.js';

const ANCHOR_HEIGHT = 0.9;
/* A card is an avatar with a name tag under it. These are its unscaled sizes in
   CSS px; the tag's real width is measured per player (see tagWidth) because a
   fixed 122px made every card look twice as wide as it is and shrank the whole
   formation to keep imaginary overlaps apart. */
const AVATAR_W = 61; // 54px avatar + the number badge hanging off it
const FULL_H = 78;
const COMPACT_H = 60;
const SCALE_SAFETY = 0.9;
/* When even the best fit would make the name tags unreadably small, drop the
   tags and show bigger avatars (initials + number) instead. The two thresholds
   are apart on purpose so the layout does not flicker between modes. */
const COMPACT_ENTER = 0.6;
const COMPACT_EXIT = 0.7;
const scaleBuf = [];
const slotIds = [];

let measureCtx = null;
function tagWidth(name) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = '700 11px system-ui, "Segoe UI", sans-serif';
  return Math.min(122, Math.ceil(measureCtx.measureText(name).width) + 18);
}

export function createPitch({ overlay, stadium }) {
  const slotEls = new Map();
  const projected = new THREE.Vector3();
  let selectedSlotId = null;
  let lastScale = -1;
  let compact = false;
  const footprint = new Map(); // slot id -> unscaled card width incl. name tag

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
      footprint.set(slot.id, filled ? Math.max(AVATAR_W, tagWidth(player.name)) : AVATAR_W);
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
      scaleBuf[count * 3] = x;
      scaleBuf[count * 3 + 1] = y;
      scaleBuf[count * 3 + 2] = count;
      slotIds[count] = slot.id;
      count += 1;
    }

    // Pair-wise: two cards stay clear if they are far enough apart sideways
    // (by their average width) or vertically (by the card height).
    const fit = (cardH, widthOf) => {
      let best = 1;
      for (let i = 0; i < count; i += 1) {
        for (let j = i + 1; j < count; j += 1) {
          const dx = Math.abs(scaleBuf[i * 3] - scaleBuf[j * 3]);
          const dy = Math.abs(scaleBuf[i * 3 + 1] - scaleBuf[j * 3 + 1]);
          const w = (widthOf(scaleBuf[i * 3 + 2]) + widthOf(scaleBuf[j * 3 + 2])) / 2;
          best = Math.min(best, SCALE_SAFETY * Math.max(dx / w, dy / cardH));
        }
      }
      return best;
    };

    const fullScale = fit(FULL_H, (id) => footprint.get(slotIds[id]) ?? AVATAR_W);
    if (compact ? fullScale > COMPACT_EXIT : fullScale < COMPACT_ENTER) {
      compact = !compact;
      overlay.classList.toggle('compact', compact);
    }
    scale = compact ? fit(COMPACT_H, () => AVATAR_W) : fullScale;
    // The floor is low enough for a phone in portrait, where the play area is a
    // short strip, so cards get smaller before they would start to overlap.
    scale = clamp(scale, compact ? 0.4 : 0.5, 1);
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