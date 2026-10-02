import { FORMATIONS, KIT_COLORS, POSITIONS } from './data.js';
import { store } from './store.js';
import { esc, initials, readImageAsDataURL, toast } from './util.js';
import { pitchCardHTML } from './cards.js';
import { formationBlurb, positionLabel, t } from './i18n.js';

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
    sidebar: document.getElementById('sidebar'),
    sheetTabs: document.getElementById('sheetTabs'),
    teamPanel: document.getElementById('teamPanel'),
    teamToggle: document.getElementById('teamToggle'),
  };

  let pendingPhoto = null;
  const cache = { tabs: '', swatches: '', formations: '', squad: '' };

  el.position.innerHTML = POSITIONS.map((p) => `<option value="${esc(p.id)}">${esc(p.id)} &middot; ${esc(positionLabel(p.id))}</option>`).join('');
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
          `<button class="formation-btn" type="button" data-formation="${esc(f.id)}" aria-pressed="${f.id === current}" title="${esc(formationBlurb(f.id))}">${esc(f.label)}</button>`,
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
        return `<li class="squad-row${onPitch ? ' is-starter' : ''}" data-draggable="1" data-player-id="${esc(player.id)}" data-origin="squad" style="--team:${esc(team.color)}" title="${esc(t('squad.dragHint'))}">
          <span class="squad-avatar">${avatar}<span class="sq-num">${esc(player.number)}</span></span>
          <span class="squad-info">
            <span class="squad-name">${esc(player.name)}</span>
            <span class="squad-pos">${esc(player.position)}${slotId ? ` &middot; ${esc(t('squad.onPitch'))}` : ''}</span>
          </span>
          <span class="squad-status${onPitch ? '' : ' is-sub'}">${onPitch ? esc(t('squad.xi')) : esc(t('squad.sub'))}</span>
          <button class="squad-del" type="button" data-delete="${esc(player.id)}" title="${esc(t('action.removePlayer', { name: player.name }))}" aria-label="${esc(t('action.removePlayer', { name: player.name }))}">
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
      toast(t('toast.need', { count: benched }));
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
      toast(t('toast.imageUnreadable'), 'warn');
    }
    el.photoInput.value = '';
  });

  el.photoClear.addEventListener('click', () => {
    pendingPhoto = null;
    setPhotoPreview(null);
    toast(t('toast.photoCleared'));
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
    toast(t('toast.playerAdded', { name: player.name, number: player.number, position: positionLabel(player.position) }));
    if (store.saveFailed) toast(t('toast.storageFull'), 'warn');
  });

  el.squadList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-delete]');
    if (!btn) return;
    const player = store.playerById(btn.dataset.delete);
    store.removePlayer(btn.dataset.delete);
    if (player) toast(t('toast.playerRemoved', { name: player.name }));
    onPlayerRemoved?.(btn.dataset.delete);
  });

  el.squadClear.addEventListener('click', () => {
    if (!store.activeTeam.players.length) return;
    if (!window.confirm(t('confirm.clearSquad'))) return;
    store.clearSquad();
    toast(t('toast.squadCleared'));
  });

  el.resetAll.addEventListener('click', () => {
    if (!window.confirm(t('confirm.resetAll'))) return;
    store.reset();
    pendingPhoto = null;
    setPhotoPreview(null);
    el.name.value = '';
    el.number.value = '';
    toast(t('toast.everythingReset'));
  });

el.close.addEventListener('click', () => el.app.classList.add('sidebar-hidden'));
  el.open?.addEventListener('click', () => el.app.classList.remove('sidebar-hidden'));

  /* Phone only: the sheet shows the add-player form or the squad, never both. */
  function setSheetTab(name) {
    el.sidebar.dataset.sheet = name;
    for (const btn of el.sheetTabs?.querySelectorAll('[data-sheet-tab]') ?? []) {
      btn.setAttribute('aria-selected', String(btn.dataset.sheetTab === name));
    }
  }

  el.sheetTabs?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-sheet-tab]');
    if (btn) setSheetTab(btn.dataset.sheetTab);
  });

  const TEAM_OPEN_KEY = 'lineup-studio-team-open';
  function setTeamOpen(open) {
    el.teamPanel.dataset.open = String(open);
    el.teamToggle.setAttribute('aria-expanded', String(open));
    try {
      localStorage.setItem(TEAM_OPEN_KEY, open ? '1' : '0');
    } catch {
      /* private mode */
    }
  }

  // Landscape draws the sidebar as a side drawer with the full height, so the
  // team settings start open there and collapsed in the bottom sheet.
  let teamOpen = window.matchMedia('(max-height: 520px) and (orientation: landscape)').matches;
  try {
    const saved = localStorage.getItem(TEAM_OPEN_KEY);
    if (saved !== null) teamOpen = saved === '1';
  } catch {
    /* private mode */
  }
  setTeamOpen(teamOpen);
  el.teamToggle.addEventListener('click', () => setTeamOpen(el.teamPanel.dataset.open !== 'true'));

  // Start on the squad when there is already one to look at.
  setSheetTab(store.activeTeam.players.length ? 'squad' : 'add');

  render();

  return { render, setPhotoPreview };
}