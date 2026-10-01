import { FORMATIONS, KIT_COLORS, POSITIONS } from './data.js';
import { store } from './store.js';
import { esc, initials, readImageAsDataURL, toast } from './util.js';
import { pitchCardHTML } from './cards.js';

export function createSidebar({ onPlayerRemoved } = {}) {
  const el = {
    app: document.querySelector('.app'),
    tabs: document.getElementById('teamTabs'),
    teamName: document.getElementById('teamName'),
    swatches: document.getElementById('swatches'),
    formationRow: document.getElementById('formationRow'),
    form: document.getElementById('playerForm'),
    photoPicker: document.getElementById('photoPicker'),
    photoInput: document.getElementById('photoInput'),
    photoPreview: document.getElementById('photoPreview'),
    photoClear: document.getElementById('photoClear'),
    name: document.getElementById('playerName'),
    position: document.getElementById('playerPosition'),
    number: document.getElementById('playerNumber'),
    squadList: document.getElementById('squadList'),
    squadEmpty: document.getElementById('squadEmpty'),
    squadCount: document.getElementById('squadCount'),
    squadClear: document.getElementById('squadClear'),
    resetAll: document.getElementById('resetAll'),
    close: document.getElementById('sidebarClose'),
    open: document.getElementById('sidebarOpen'),
  };

  let pendingPhoto = null;
  const cache = { tabs: '', swatches: '', formations: '', squad: '' };

  el.position.innerHTML = POSITIONS.map((p) => `<option value="${esc(p.id)}">${esc(p.id)} &middot; ${esc(p.label)}</option>`).join('');
  el.position.value = 'CM';

  function setPhotoPreview(src) {
    if (src) {
      el.photoPreview.src = src;
      el.photoPicker.classList.add('has-photo');
    } else {
      el.photoPreview.removeAttribute('src');
      el.photoPicker.classList.remove('has-photo');
    }
  }

  function renderTeams() {
    const { teams } = store.state;
    const key = teams.map((t) => `${t.id}:${t.name}:${t.color}`).join('|') + `::${store.state.activeTeam}`;
    if (key === cache.tabs) return;
    cache.tabs = key;
    el.tabs.innerHTML = teams
      .map(
        (t) =>
          `<button class="team-tab" role="tab" type="button" data-team="${esc(t.id)}" aria-selected="${t.id === store.state.activeTeam}" title="${esc(t.name)}">
            <span class="dot" style="--team:${esc(t.color)}"></span>${esc(t.name)}
          </button>`,
      )
      .join('');
  }

  function renderSwatches() {
    const color = String(store.activeTeam.color);
    if (color === cache.swatches) return;
    cache.swatches = color;
    el.swatches.innerHTML = KIT_COLORS.map(
      (c) => `<button class="swatch" type="button" style="--sw:${esc(c)}" data-color="${esc(c)}" aria-pressed="${c.toLowerCase() === color.toLowerCase()}" title="${esc(c)}"></button>`,
    ).join('');
  }

  function renderFormations() {
    const current = store.activeTeam.formation;
    if (current === cache.formations) return;
    cache.formations = current;
    el.formationRow.innerHTML = Object.values(FORMATIONS)
      .map(
        (f) =>
          `<button class="formation-btn" type="button" data-formation="${esc(f.id)}" aria-pressed="${f.id === current}" title="${esc(f.blurb)}">${esc(f.label)}</button>`,
      )
      .join('');
  }

  function renderTeamMeta() {
    const team = store.activeTeam;
    if (document.activeElement !== el.teamName) el.teamName.value = team.name;
    renderTeams();
    renderSwatches();
    renderFormations();
  }

  function renderSquad() {
    const team = store.activeTeam;
    const starters = new Set(Object.values(team.lineup).filter(Boolean));
    const key = `${team.id}|${team.color}|${team.players
      .map((p) => `${p.id}:${p.name}:${p.number}:${p.position}:${p.photo ? 1 : 0}`)
      .join(',')}|${Object.values(team.lineup).join(',')}`;
    el.squadCount.textContent = String(team.players.length);
    el.squadEmpty.hidden = team.players.length > 0;
    el.squadClear.hidden = team.players.length === 0;
    if (key === cache.squad) return;
    cache.squad = key;

    el.squadList.innerHTML = team.players
      .map((player) => {
        const onPitch = starters.has(player.id);
        const slotId = store.slotOf(player.id);
        const avatar = player.photo
          ? `<img src="${esc(player.photo)}" alt="" draggable="false" />`
          : esc(initials(player.name));
        return `<li class="squad-row${onPitch ? ' is-starter' : ''}" data-draggable="1" data-player-id="${esc(player.id)}" data-origin="squad" style="--team:${esc(team.color)}" title="Drag onto the pitch">
          <span class="squad-avatar">${avatar}<span class="sq-num">${esc(player.number)}</span></span>
          <span class="squad-info">
            <span class="squad-name">${esc(player.name)}</span>
            <span class="squad-pos">${esc(player.position)}${slotId ? ` &middot; on pitch` : ''}</span>
          </span>
          <span class="squad-status${onPitch ? '' : ' bench'}">${onPitch ? 'XI' : 'Sub'}</span>
          <button class="squad-del" type="button" data-delete="${esc(player.id)}" title="Remove ${esc(player.name)}" aria-label="Remove ${esc(player.name)}">
            <svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13"/></svg>
          </button>
          <div data-ghost-source>${pitchCardHTML({ ...player, slotId: slotId ?? 'bench' }, team)}</div>
        </li>`;
      })
      .join('');
  }

  function render() {
    renderTeamMeta();
    renderSquad();
  }

  el.tabs.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-team]');
    if (!btn) return;
    store.setActiveTeam(btn.dataset.team);
  });

  el.teamName.addEventListener('input', () => {
    store.setTeamName(el.teamName.value);
  });

  el.swatches.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-color]');
    if (!btn) return;
    store.setTeamColor(btn.dataset.color);
  });

  el.formationRow.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-formation]');
    if (!btn) return;
    const { benched } = store.setFormation(btn.dataset.formation);
    if (benched > 0) {
      toast(`${benched} player${benched === 1 ? '' : 's'} do not fit this shape and moved to the bench`);
    }
  });

  el.photoPicker.addEventListener('click', () => el.photoInput.click());

  el.photoInput.addEventListener('change', async () => {
    const file = el.photoInput.files?.[0];
    if (!file) return;
    try {
      pendingPhoto = await readImageAsDataURL(file, 192);
      setPhotoPreview(pendingPhoto);
    } catch {
      pendingPhoto = null;
      setPhotoPreview(null);
      toast('Could not read that image', 'warn');
    }
    el.photoInput.value = '';
  });

  el.photoClear.addEventListener('click', () => {
    pendingPhoto = null;
    setPhotoPreview(null);
    toast('Photo cleared');
  });

  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = el.name.value.trim();
    if (!name) {
      el.name.focus();
      return;
    }
    const number = el.number.value.trim();
    const player = store.addPlayer({
      name,
      position: el.position.value,
      number: number === '' ? null : Number(number),
      photo: pendingPhoto,
    });
    if (!player) return;
    el.name.value = '';
    el.number.value = '';
    pendingPhoto = null;
    setPhotoPreview(null);
    el.name.focus();
    toast(`${player.name} added as #${player.number} (${player.position})`);
    if (store.saveFailed) toast('Storage full - photos cannot be saved', 'warn');
  });

  el.squadList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-delete]');
    if (!btn) return;
    const player = store.playerById(btn.dataset.delete);
    store.removePlayer(btn.dataset.delete);
    if (player) toast(`${player.name} removed`);
    onPlayerRemoved?.(btn.dataset.delete);
  });

  el.squadClear.addEventListener('click', () => {
    if (!store.activeTeam.players.length) return;
    if (!window.confirm('Remove every player from this team?')) return;
    store.clearSquad();
    toast('Squad cleared');
  });

  el.resetAll.addEventListener('click', () => {
    if (!window.confirm('Reset everything and start from scratch?')) return;
    store.reset();
    pendingPhoto = null;
    setPhotoPreview(null);
    el.name.value = '';
    el.number.value = '';
    toast('Everything reset');
  });

  el.close.addEventListener('click', () => el.app.classList.add('sidebar-hidden'));
  el.open?.addEventListener('click', () => el.app.classList.remove('sidebar-hidden'));

  render();

  return { render, setPhotoPreview };
}