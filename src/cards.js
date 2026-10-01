import { esc, initials } from './util.js';

export function avatarHTML(player, size = '') {
  const cls = `card-avatar${size ? ` card-avatar-${size}` : ''}`;
  const inner = player.photo
    ? `<img src="${player.photo}" alt="" draggable="false" />`
    : esc(initials(player.name));
  return `<div class="${cls}">${inner}<span class="card-number">${esc(player.number)}</span></div>`;
}

export function pitchCardHTML(player, team) {
  return `<div class="card" style="--team:${esc(team.color)}" data-draggable="1" data-player-id="${esc(player.id)}" data-origin="slot:${esc(player.slotId)}">
    ${avatarHTML(player)}
    <span class="card-name">${esc(player.name)}</span>
  </div>`;
}

export function slotPlaceholderHTML(position) {
  return `<div class="slot-empty">${esc(position)}</div><div class="slot-mark">${esc(position)}</div>`;
}

export function benchCardHTML(player, team) {
  return `<div class="bench-slot-card" style="--team:${esc(team.color)}" data-draggable="1" data-player-id="${esc(player.id)}" data-origin="bench">
    <span class="sub-pos">${esc(player.position)}</span>
    ${avatarHTML(player, 'sm')}
    <span class="card-name">${esc(player.name)}</span>
  </div>`;
}