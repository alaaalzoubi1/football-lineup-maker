import { PITCH, POS_LABEL, getFormation } from './data.js';
import { store } from './store.js';
import { initials, loadImage } from './util.js';
import { formationLabel, getLang, isRtl, positionLabel, t } from './i18n.js';

const W = 1240;
const H = 1660;
const HEAD_H = 205;
const SUBS_H = 250;
const PITCH_H = H - HEAD_H - SUBS_H - 60;
const PITCH_W = PITCH_H / (PITCH.length / PITCH.width);
const PITCH_X = (W - PITCH_W) / 2;
const PITCH_Y = HEAD_H;

/* The poster mirrors the UI language: Arabic is drawn right-to-left and the
   header block swaps sides so nothing is clipped. */
function alignOf(side) {
  if (!isRtl()) return side === 'end' ? 'right' : 'left';
  return side === 'end' ? 'left' : 'right';
}

function edgeOf(side) {
  const base = side === 'end' ? W - 56 : 56;
  return isRtl() ? (side === 'end' ? 56 : W - 56) : base;
}

function setAlign(ctx, side) {
  ctx.direction = isRtl() ? 'rtl' : 'ltr';
  ctx.textAlign = alignOf(side);
}

const imageCache = new Map();

async function getPhoto(player) {
  if (!player.photo) return null;
  if (imageCache.has(player.photo)) return imageCache.get(player.photo);
  try {
    const img = await loadImage(player.photo);
    imageCache.set(player.photo, img);
    return img;
  } catch {
    imageCache.set(player.photo, null);
    return null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toPitch(x, z) {
  return {
    cx: PITCH_X + ((x + PITCH.halfWidth) / PITCH.width) * PITCH_W,
    cy: PITCH_Y + ((z + PITCH.halfLength) / PITCH.length) * PITCH_H,
  };
}

function drawPitch(ctx, accent) {
  ctx.fillStyle = '#1b6f38';
  roundRect(ctx, PITCH_X, PITCH_Y, PITCH_W, PITCH_H, 14);
  ctx.fill();

  ctx.save();
  roundRect(ctx, PITCH_X, PITCH_Y, PITCH_W, PITCH_H, 14);
  ctx.clip();

  const bands = 16;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(PITCH_X, PITCH_Y + (PITCH_H / bands) * i, PITCH_W, PITCH_H / bands + 1);
  }

  const sx = PITCH_W / PITCH.width;
  const sz = PITCH_H / PITCH.length;
  const L = PITCH.halfLength;
  const Wd = PITCH.halfWidth;

  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_X + Wd * sx, PITCH_Y + L * sz, PITCH_W - Wd * sx * 2, PITCH_H - L * sz * 2);

  ctx.beginPath();
  ctx.moveTo(PITCH_X, PITCH_Y + PITCH_H / 2);
  ctx.lineTo(PITCH_X + PITCH_W, PITCH_Y + PITCH_H / 2);
  ctx.stroke();

  const centre = toPitch(0, 0);
  ctx.beginPath();
  ctx.ellipse(centre.cx, centre.cy, 9.15 * sx, 9.15 * sz, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(centre.cx, centre.cy, 5, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    const goal = side * L;
    const areaTop = goal - side * 16.5;
    ctx.strokeRect(PITCH_X + (-20.16) * sx, PITCH_Y + Math.min(goal, areaTop) * sz, 40.32 * sx, 16.5 * sz);
    const sixTop = side * (L - 5.5);
    ctx.strokeRect(PITCH_X + (-9.16) * sx, PITCH_Y + Math.min(side * L, sixTop) * sz, 18.32 * sx, 5.5 * sz);

    const spot = toPitch(0, side * (L - 11));
    ctx.beginPath();
    ctx.arc(spot.cx, spot.cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 4;
  roundRect(ctx, PITCH_X, PITCH_Y, PITCH_W, PITCH_H, 14);
  ctx.stroke();

  ctx.restore();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, PITCH_X - 2, PITCH_Y - 2, PITCH_W + 4, PITCH_H + 4, 16);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

async function drawPlayer(ctx, player, team, cx, cy, radius, showName = true) {
  const photo = await getPhoto(player);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = team.color;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
  ctx.clip();
  if (photo) {
    const side = Math.min(photo.naturalWidth, photo.naturalHeight);
    ctx.drawImage(
      photo,
      (photo.naturalWidth - side) / 2,
      (photo.naturalHeight - side) / 2,
      side,
      side,
      cx - radius + 4,
      cy - radius + 4,
      (radius - 4) * 2,
      (radius - 4) * 2,
    );
  } else {
    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, team.color);
    grad.addColorStop(1, '#111a20');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(radius * 0.8)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(player.name), cx, cy + 2);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const badgeR = radius * 0.42;
  const bx = cx + radius * 0.78;
  const by = cy + radius * 0.78;
  ctx.beginPath();
  ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#b6ff3c';
  ctx.fill();
  ctx.strokeStyle = '#0a1014';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#0b1206';
  ctx.font = `800 ${Math.round(badgeR * 1.25)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(player.number), bx, by + 1);

  if (showName) {
    const label = player.name.length > 16 ? `${player.name.slice(0, 15)}…` : player.name;
    ctx.font = '700 21px "Segoe UI", system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    const padX = 12;
    const boxH = 32;
    const boxY = cy + radius + 10;
    ctx.fillStyle = 'rgba(6,12,16,0.82)';
    roundRect(ctx, cx - textW / 2 - padX, boxY, textW + padX * 2, boxH, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#eef5f8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, boxY + boxH / 2);
  }
}

export async function renderLineupPoster() {
  const team = store.activeTeam;
  const formation = getFormation(team.formation);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b1116');
  bg.addColorStop(1, '#05080b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = team.color;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(0, 0, W, 220);
  ctx.globalAlpha = 1;
  ctx.fillStyle = team.color;
  ctx.fillRect(0, 0, W, 8);

  setAlign(ctx, 'start');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f2f8fa';
  ctx.font = '800 62px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(team.name || t('poster.fallbackName'), edgeOf('start'), 96);

  ctx.font = '600 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#9fb2bd';
  ctx.fillText(t('poster.subtitle', { formation: formationLabel(team.formation) }), edgeOf('start'), 140);

  setAlign(ctx, 'end');
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = team.color;
  ctx.fillText(formationLabel(team.formation), edgeOf('end'), 96);
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#7f939e';
  ctx.fillText(
    new Date().toLocaleDateString(getLang(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    edgeOf('end'),
    136,
  );

  drawPitch(ctx, team.color);

  const ordered = [...formation.slots].sort((a, b) => b.z - a.z);
  const radius = 52;
  for (const slot of ordered) {
    const player = store.playerById(team.lineup[slot.id]);
    if (!player) continue;
    const { cx, cy } = toPitch(slot.x, slot.z);
    await drawPlayer(ctx, player, team, cx, cy, radius);
  }

  const missing = formation.slots.length - ordered.filter((s) => team.lineup[s.id]).length;
  if (missing > 0) {
    for (const slot of ordered) {
      if (team.lineup[slot.id]) continue;
      const { cx, cy } = toPitch(slot.x, slot.z);
      ctx.save();
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.pos, cx, cy);
    }
  }

  const subs = store.substitutes();
  const subsTop = PITCH_Y + PITCH_H + 34;

  setAlign(ctx, 'start');
  ctx.fillStyle = '#7f939e';
  ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('poster.subsTitle', { count: subs.length }), edgeOf('start'), subsTop + 16);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(56, subsTop + 30, W - 112, 2);

  if (!subs.length) {
    ctx.fillStyle = 'rgba(159,178,189,0.6)';
    ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(t('poster.subsEmpty'), edgeOf('start'), subsTop + 76);
  } else {
    const cardW = 168;
    const cardH = 118;
    const perRow = Math.floor((W - 112 + 16) / (cardW + 16));
    const shown = Math.min(subs.length, perRow);
    const startX = 56 + Math.max(0, (W - 112 - (shown * cardW + Math.max(0, shown - 1) * 16)) / 2);

    for (let i = 0; i < subs.length; i += 1) {
      const player = subs[i];
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + 16);
      const y = subsTop + 46 + row * (cardH + 14);

      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = team.color;
      ctx.fillRect(isRtl() ? x + cardW - 16 : x, y + 12, 4, cardH - 24);

      setAlign(ctx, 'start');
      const padStart = isRtl() ? x + 20 : x + 92;
      ctx.fillStyle = '#eef5f8';
      ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
      const label = player.name.length > 12 ? `${player.name.slice(0, 11)}…` : player.name;
      ctx.fillText(label, padStart, y + 50);
      ctx.fillStyle = '#8fa3ae';
      ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(
        t('poster.subsMeta', { position: positionLabel(player.position), number: player.number }),
        padStart,
        y + 78);

      await drawPlayer(ctx, player, team, isRtl() ? x + cardW - 48 : x + 48, y + cardH / 2, 32, false);
    }
  }

  ctx.textAlign = 'center';
  ctx.direction = isRtl() ? 'rtl' : 'ltr';
  ctx.fillStyle = 'rgba(159,178,189,0.5)';
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('poster.footer', { gk: positionLabel('GK') }), W / 2, H - 34);

  return canvas;
}

export async function downloadLineupPoster() {
  const canvas = await renderLineupPoster();
  const team = store.activeTeam;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = (team.name || 'lineup').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'lineup';
  link.href = url;
  link.download = `${safe}-${team.formation}-lineup.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}