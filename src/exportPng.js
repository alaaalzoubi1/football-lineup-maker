import { PITCH, POS_LABEL, getFormation } from './data.js';
import { store } from './store.js';
import { initials, loadImage } from './util.js';
import { formationLabel, getLang, isRtl, positionLabel, t } from './i18n.js';

const W = 1240;
const H = 1660;
const HEAD_H = 220; // height of the tinted header band
const SUBS_H = 250;
const PITCH_Y = HEAD_H + 22;
const PITCH_H = H - PITCH_Y - SUBS_H - 60;
const PITCH_W = PITCH_H / (PITCH.length / PITCH.width);
const PITCH_X = (W - PITCH_W) / 2;
/* Room kept above and below a player's centre so the avatar, the name tag and
   the pitch border never collide (the keeper's tag used to sit on the line). */
const PLAYER_PAD = 112;

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

/* Draws one line of text no wider than maxW: shrinks the font down to a floor,
   then truncates with an ellipsis. Alignment/direction come from the caller. */
function fitText(ctx, text, x, y, maxW, size, weight) {
  const family = '"Segoe UI", system-ui, sans-serif';
  let px = size;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > size * 0.72 && ctx.measureText(text).width > maxW) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(out).width > maxW) out = out.slice(0, -1);
  if (out !== text) {
    out = out.slice(0, -1) + '…';
  }
  ctx.fillText(out, x, y);
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

/* Where a player is drawn. Same as toPitch, except that the vertical spread is
   squeezed just enough to keep the outermost players clear of the pitch ends. */
function playerScaleZ(slots) {
  const maxZ = Math.max(1, ...slots.map((slot) => Math.abs(slot.z)));
  const natural = PITCH_H / PITCH.length;
  const roomy = (PITCH_H / 2 - PLAYER_PAD) / maxZ;
  return Math.min(natural, roomy);
}

function toPlayer(x, z, kz) {
  return {
    cx: PITCH_X + ((x + PITCH.halfWidth) / PITCH.width) * PITCH_W,
    cy: PITCH_Y + PITCH_H / 2 + z * kz,
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
  // metres -> canvas, measured from the pitch centre
  const X = (m) => PITCH_X + PITCH_W / 2 + m * sx;
  const Z = (m) => PITCH_Y + PITCH_H / 2 + m * sz;
  const line = 'rgba(255,255,255,0.85)';

  ctx.strokeStyle = line;
  ctx.fillStyle = line;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  // touchlines and goal lines, inset a little so the stroke is not clipped
  const inset = 6;
  ctx.strokeRect(PITCH_X + inset, PITCH_Y + inset, PITCH_W - inset * 2, PITCH_H - inset * 2);

  // halfway line + centre circle + centre spot
  ctx.beginPath();
  ctx.moveTo(PITCH_X + inset, Z(0));
  ctx.lineTo(PITCH_X + PITCH_W - inset, Z(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X(0), Z(0), 9.15 * sx, 9.15 * sz, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0), Z(0), 5, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    // side = -1 is the top end, +1 the bottom end. "toward" points at the goal.
    const goalZ = side * L;
    const rect = (halfW, depth) => {
      const nearZ = goalZ;
      const farZ = goalZ - side * depth;
      const top = Math.min(nearZ, farZ);
      ctx.strokeRect(X(-halfW), Z(top), halfW * 2 * sx, depth * sz);
    };
    // penalty area and six-yard box: drawn from the goal line, not the centre
    rect(20.16, 16.5);
    rect(9.16, 5.5);

    // goal mouth, just outside the line so it reads as the goal
    ctx.save();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(X(-3.66), Z(goalZ));
    ctx.lineTo(X(3.66), Z(goalZ));
    ctx.stroke();
    ctx.restore();

    // penalty spot and the arc of the "D" that sits outside the area
    const spotZ = goalZ - side * 11;
    ctx.beginPath();
    ctx.arc(X(0), Z(spotZ), 4.5, 0, Math.PI * 2);
    ctx.fill();
    const theta = Math.acos((16.5 - 11) / 9.15);
    const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2; // towards the centre circle
    ctx.beginPath();
    ctx.ellipse(X(0), Z(spotZ), 9.15 * sx, 9.15 * sz, 0, facing - theta, facing + theta);
    ctx.stroke();

    // corner arcs
    for (const cornerSide of [-1, 1]) {
      const start = cornerSide < 0 ? (side < 0 ? 0 : -Math.PI / 2) : side < 0 ? Math.PI / 2 : Math.PI;
      const end = start + Math.PI / 2;
      ctx.beginPath();
      ctx.arc(X(cornerSide * Wd), Z(goalZ), 1.2 * sx * 1.6, start, end);
      ctx.stroke();
    }
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
  const subs = store.substitutes();
  const CARD_W = 300;
  const CARD_H = 110;
  const CARD_GAP = 16;
  const perRow = Math.max(1, Math.floor((W - 112 + CARD_GAP) / (CARD_W + CARD_GAP)));
  const subRows = Math.max(1, Math.ceil(subs.length / perRow));
  const totalH = H + (subRows - 1) * (CARD_H + 14);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, totalH);
  bg.addColorStop(0, '#0b1116');
  bg.addColorStop(1, '#05080b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, totalH);

  ctx.fillStyle = team.color;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(0, 0, W, HEAD_H);
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
  ctx.fillText(t('poster.subtitle', { formation: `\u2066${formationLabel(formation)}\u2069` }), edgeOf('start'), 140);

  setAlign(ctx, 'end');
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = team.color;
  ctx.fillText(formationLabel(formation), edgeOf('end'), 96);
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
  const kz = playerScaleZ(formation.slots);
  const radius = 52;
  for (const slot of ordered) {
    const player = store.playerById(team.lineup[slot.id]);
    if (!player) continue;
    const { cx, cy } = toPlayer(slot.x, slot.z, kz);
    await drawPlayer(ctx, player, team, cx, cy, radius);
  }

  const missing = formation.slots.length - ordered.filter((s) => team.lineup[s.id]).length;
  if (missing > 0) {
    for (const slot of ordered) {
      if (team.lineup[slot.id]) continue;
      const { cx, cy } = toPlayer(slot.x, slot.z, kz);
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

  const subsTop = PITCH_Y + PITCH_H + 34;

  setAlign(ctx, 'start');
  ctx.textBaseline = 'alphabetic';
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
    const rtl = isRtl();
    for (let i = 0; i < subs.length; i += 1) {
      const player = subs[i];
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, subs.length - row * perRow);
      const col = i % perRow;
      // each row is centred on its own, so a short last row is not left-heavy
      const rowW = inRow * CARD_W + (inRow - 1) * CARD_GAP;
      const rowStart = (W - rowW) / 2;
      const slotIdx = rtl ? inRow - 1 - col : col;
      const x = rowStart + slotIdx * (CARD_W + CARD_GAP);
      const y = subsTop + 46 + row * (CARD_H + 14);

      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, CARD_W, CARD_H, 14);
      ctx.fill();
      ctx.stroke();

      // team-colour accent on the side the avatar is on
      ctx.fillStyle = team.color;
      ctx.fillRect(rtl ? x + CARD_W - 4 : x, y + 14, 4, CARD_H - 28);

      const avatarX = rtl ? x + CARD_W - 56 : x + 56;
      await drawPlayer(ctx, player, team, avatarX, y + CARD_H / 2, 34, false);

      // text sits beside the avatar and is shrunk/truncated to the room left
      const textEdge = rtl ? avatarX - 52 : avatarX + 52;
      const room = CARD_W - 56 - 52 - 16;
      setAlign(ctx, 'start');
      ctx.fillStyle = '#eef5f8';
      fitText(ctx, player.name, textEdge, y + CARD_H / 2 - 6, room, 26, 700);
      ctx.fillStyle = '#8fa3ae';
      const meta = positionLabel(player.position);
      fitText(ctx, meta, textEdge, y + CARD_H / 2 + 24, room, 19, 600);
    }
  }

  ctx.textAlign = 'center';
  ctx.direction = isRtl() ? 'rtl' : 'ltr';
  ctx.fillStyle = 'rgba(159,178,189,0.5)';
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('poster.footer', { gk: positionLabel('GK') }), W / 2, totalH - 34);

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