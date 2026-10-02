import { DEFAULT_FORMATION, FORMATIONS, getFormation, positionAffinity, starterSlotIds } from './data.js';
import { lowestFreeNumber, uid } from './util.js';

const STORAGE_KEY = 'lineup-studio-v1';
const TEAMS = [
  { id: 'home', name: 'Home', color: '#b6ff3c' },
  { id: 'away', name: 'Away', color: '#22d3ee' },
];

function emptyLineup(formationId) {
  const lineup = {};
  for (const slotId of starterSlotIds(formationId)) lineup[slotId] = null;
  return lineup;
}

function makeTeam(def) {
  return {
    id: def.id,
    name: def.name,
    color: def.color,
    formation: DEFAULT_FORMATION,
    players: [],
    lineup: emptyLineup(DEFAULT_FORMATION),
  };
}

function freshState() {
  return {
    v: 1,
    activeTeam: TEAMS[0].id,
    teams: TEAMS.map(makeTeam),
  };
}

function sanitizeTeam(raw, fallback) {
  const team = makeTeam({
    id: raw.id ?? fallback.id,
    name: raw.name ?? fallback.name,
    color: raw.color ?? fallback.color,
  });
  if (raw.formation && FORMATIONS[raw.formation]) team.formation = raw.formation;

  const seenIds = new Set();
  const takenNumbers = new Set();
  const players = Array.isArray(raw.players) ? raw.players : [];

  for (const p of players) {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) continue;
    let id = typeof p.id === 'string' && p.id ? p.id : uid('p');
    if (seenIds.has(id)) id = uid('p');
    seenIds.add(id);

    let number = Number.isFinite(Number(p.number)) ? Math.round(Number(p.number)) : NaN;
    if (!Number.isFinite(number) || number < 1 || number > 99 || takenNumbers.has(number)) {
      number = lowestFreeNumber([...takenNumbers]);
    }
    takenNumbers.add(number);

    team.players.push({
      id,
      name: p.name.trim().slice(0, 24),
      position: typeof p.position === 'string' && p.position ? p.position.slice(0, 3) : 'CM',
      number,
      photo: typeof p.photo === 'string' && p.photo.startsWith('data:image') ? p.photo : null,
    });
  }

  const slotIds = starterSlotIds(team.formation);
  const lineup = {};
  const claimed = new Set();
  for (const slotId of slotIds) {
    const value = raw.lineup?.[slotId];
    const ok = value && seenIds.has(value) && !claimed.has(value);
    lineup[slotId] = ok ? value : null;
    if (ok) claimed.add(value);
  }
  team.lineup = lineup;

  return team;
}

export function hydrate(raw) {
  if (!raw || !Array.isArray(raw.teams) || !raw.teams.length) return freshState();
  const teams = TEAMS.map((def, i) => sanitizeTeam(raw.teams[i] ?? {}, def));
  const extra = raw.teams.filter((t) => !TEAMS.some((d) => d.id === t?.id));
  for (const t of extra) teams.push(sanitizeTeam(t, { id: uid('t'), name: 'Team', color: '#a78bfa' }));
  const activeTeam = teams.some((t) => t.id === raw.activeTeam) ? raw.activeTeam : teams[0].id;
  return { v: 1, activeTeam, teams };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    return hydrate(JSON.parse(raw));
  } catch {
    return freshState();
  }
}

export const store = {
  state: load(),
  listeners: new Set(),
  saveFailed: false,
  persistTimer: null,
  readOnly: false,
  onBlocked: null,

  get activeTeam() {
    return this.state.teams.find((t) => t.id === this.state.activeTeam) ?? this.state.teams[0];
  },

  /** Swap in a whole state (used by shared-board sync) and repaint. */
  replaceState(next) {
    this.state = next ?? freshState();
    this.persistNow();
    this.emit();
  },

  setReadOnly(value) {
    if (this.readOnly === Boolean(value)) return;
    this.readOnly = Boolean(value);
    document.body.classList.toggle('read-only', this.readOnly);
    this.emit();
  },

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  emit() {
    for (const fn of this.listeners) fn(this.state, this.activeTeam);
  },

  commit({ silent = false } = {}) {
    this.persist();
    if (!silent) this.emit();
  },

  persist() {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persistNow(), 220);
  },

  persistNow() {
    clearTimeout(this.persistTimer);
    this.persistTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.saveFailed = false;
    } catch {
      if (!this.saveFailed) {
        this.saveFailed = true;
        this.emit();
      }
    }
  },

  playerById(playerId) {
    if (!playerId) return null;
    return this.activeTeam.players.find((p) => p.id === playerId) ?? null;
  },

  slotOf(playerId) {
    const { lineup } = this.activeTeam;
    for (const [slotId, value] of Object.entries(lineup)) if (value === playerId) return slotId;
    return null;
  },

  substitutes() {
    const { players, lineup } = this.activeTeam;
    const used = new Set(Object.values(lineup).filter(Boolean));
    return players.filter((p) => !used.has(p.id));
  },

  starters() {
    const { lineup } = this.activeTeam;
    return Object.entries(lineup)
      .map(([slotId, playerId]) => ({ slotId, player: this.playerById(playerId) }))
      .filter((x) => x.player);
  },

  addPlayer({ name, position, number, photo }) {
    const team = this.activeTeam;
    const cleanName = String(name ?? '').trim().slice(0, 24);
    if (!cleanName) return null;
    const player = {
      id: uid('p'),
      name: cleanName,
      position: position || 'CM',
      number: Number.isFinite(Number(number)) && Number(number) >= 1 && Number(number) <= 99
        ? Math.round(Number(number))
        : lowestFreeNumber(team.players.map((p) => p.number)),
      photo: photo || null,
    };
    team.players.push(player);
    this.commit();
    return player;
  },

  updatePlayer(playerId, patch) {
    const player = this.activeTeam.players.find((p) => p.id === playerId);
    if (!player) return;
    if (typeof patch.name === 'string' && patch.name.trim()) player.name = patch.name.trim().slice(0, 24);
    if (typeof patch.position === 'string') player.position = patch.position;
    if (Number.isFinite(Number(patch.number)) && Number(patch.number) >= 1 && Number(patch.number) <= 99) {
      player.number = Math.round(Number(patch.number));
    }
    if ('photo' in patch) player.photo = patch.photo || null;
    this.commit();
  },

  removePlayer(playerId) {
    const team = this.activeTeam;
    team.players = team.players.filter((p) => p.id !== playerId);
    for (const slotId of Object.keys(team.lineup)) {
      if (team.lineup[slotId] === playerId) team.lineup[slotId] = null;
    }
    this.commit();
  },

  clearSquad() {
    const team = this.activeTeam;
    team.players = [];
    team.lineup = emptyLineup(team.formation);
    this.commit();
  },

  clearLineup() {
    const team = this.activeTeam;
    for (const slotId of Object.keys(team.lineup)) team.lineup[slotId] = null;
    this.commit();
  },

  setFormation(formationId) {
    const team = this.activeTeam;
    if (!FORMATIONS[formationId] || team.formation === formationId) return { benched: 0 };
    const previous = getFormation(team.formation);
    const next = getFormation(formationId);
    const playersByPos = {};
    for (const slot of previous.slots) {
      const playerId = team.lineup[slot.id];
      if (!playerId) continue;
      const player = team.players.find((p) => p.id === playerId);
      if (!player) continue;
      playersByPos[slot.pos] = playersByPos[slot.pos] ?? [];
      playersByPos[slot.pos].push(playerId);
    }
    const lineup = {};
    for (const slot of next.slots) {
      const queue = playersByPos[slot.pos];
      lineup[slot.id] = queue && queue.length ? queue.shift() : null;
    }
    let benched = 0;
    for (const playerId of Object.values(team.lineup)) {
      if (playerId && !Object.values(lineup).includes(playerId)) benched += 1;
    }
    team.formation = formationId;
    team.lineup = lineup;
    this.commit();
    return { benched };
  },

  setTeamColor(color) {
    this.activeTeam.color = color;
    this.commit();
  },

  setTeamName(name) {
    this.activeTeam.name = String(name ?? '').slice(0, 28);
    this.commit();
  },

  setActiveTeam(teamId) {
    if (!this.state.teams.some((t) => t.id === teamId)) return;
    this.state.activeTeam = teamId;
    this.commit();
  },

  place(playerId, slotId) {
    const team = this.activeTeam;
    if (!team.players.some((p) => p.id === playerId)) return;
    const slotIds = Object.keys(team.lineup);
    const target = slotId === null || slotId === 'bench' ? null : slotId;
    if (target && !slotIds.includes(target)) return;
    let displaced = null;
    for (const id of slotIds) if (team.lineup[id] === playerId) team.lineup[id] = null;
    if (target) {
      displaced = team.lineup[target] ?? null;
      team.lineup[target] = playerId;
    }
    this.commit();
    return { displaced, slotId: target };
  },

  swap(slotA, slotB) {
    const team = this.activeTeam;
    if (!(slotA in team.lineup) || !(slotB in team.lineup) || slotA === slotB) return;
    const a = team.lineup[slotA] ?? null;
    const b = team.lineup[slotB] ?? null;
    team.lineup[slotA] = b;
    team.lineup[slotB] = a;
    this.commit();
  },

  slotPosition(slotId) {
    const slot = getFormation(this.activeTeam.formation).slots.find((s) => s.id === slotId);
    return slot ? slot.pos : null;
  },

  dropPlayer(playerId, targetSlotId, originSlotId) {
    const team = this.activeTeam;
    const player = team.players.find((p) => p.id === playerId);
    if (!player) return { ok: false };

    const slotIds = Object.keys(team.lineup);
    if (targetSlotId && !slotIds.includes(targetSlotId)) return { ok: false };

    const targetPos = targetSlotId ? this.slotPosition(targetSlotId) : null;
    if (targetPos && player.position === 'GK' && targetPos !== 'GK') {
      return { ok: false, reason: 'gk-outfield' };
    }

    const occupant = targetSlotId ? team.lineup[targetSlotId] : null;
    for (const id of slotIds) {
      if (team.lineup[id] === playerId) team.lineup[id] = null;
    }
    if (targetSlotId) team.lineup[targetSlotId] = playerId;

    let benched = null;
    if (occupant && occupant !== playerId) {
      const canSwapBack =
        originSlotId && originSlotId !== targetSlotId && slotIds.includes(originSlotId) && !team.lineup[originSlotId];
      if (canSwapBack) {
        team.lineup[originSlotId] = occupant;
      } else {
        benched = occupant;
      }
    }

    this.commit();
    return { ok: true, benched };
  },

  autoFill() {
    const team = this.activeTeam;
    const slots = getFormation(team.formation).slots;
    const available = new Map();
    for (const p of store.substitutes()) {
      if (!available.has(p.position)) available.set(p.position, []);
      available.get(p.position).push(p);
    }

    let filled = 0;
    const assignments = [];
    for (const slot of slots) {
      if (team.lineup[slot.id]) continue;
      let chosen = null;
      for (const [position, list] of available) {
        if (!list.length) continue;
        const score = positionAffinity(slot.pos, position);
        if (score > 0 && (!chosen || score > chosen.score)) {
          chosen = { list, position, score };
        }
      }
      if (!chosen) continue;
      const player = chosen.list.shift();
      team.lineup[slot.id] = player.id;
      assignments.push({ slot, player });
      filled += 1;
    }
    if (filled) this.commit();
    return { filled, assignments };
  },

  reset() {
    this.state = freshState();
    this.commit();
  },
};

/** Content mutations are refused while the board is shared-and-locked. */
const SHARED_MUTATORS = [
  'addPlayer',
  'updatePlayer',
  'removePlayer',
  'clearSquad',
  'clearLineup',
  'setFormation',
  'setTeamColor',
  'setTeamName',
  'place',
  'swap',
  'dropPlayer',
  'reset',
];

for (const name of SHARED_MUTATORS) {
  const original = store[name];
  store[name] = (...args) => {
    if (store.readOnly) {
      if (store.onBlocked) store.onBlocked(name);
      return null;
    }
    return original.apply(store, args);
  };
}

const autoFill = store.autoFill;
store.autoFill = () => {
  if (store.readOnly) {
    if (store.onBlocked) store.onBlocked('autoFill');
    return { filled: 0, assignments: [] };
  }
  return autoFill.apply(store, []);
};