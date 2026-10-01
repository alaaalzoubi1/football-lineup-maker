export const PITCH = {
  width: 70,
  length: 105,
  get halfWidth() {
    return this.width / 2;
  },
  get halfLength() {
    return this.length / 2;
  },
};

export const STARTING_SIZES = { gk: 1, outfield: 5, total: 6 };

export const POSITIONS = [
  { id: 'GK', label: 'Goalkeeper' },
  { id: 'LB', label: 'Left Back' },
  { id: 'CB', label: 'Centre Back' },
  { id: 'RB', label: 'Right Back' },
  { id: 'DM', label: 'Defensive Midfielder' },
  { id: 'CM', label: 'Centre Midfielder' },
  { id: 'AM', label: 'Attacking Midfielder' },
  { id: 'ST', label: 'Striker' },
];

export const POS_LABEL = Object.fromEntries(POSITIONS.map((p) => [p.id, p.label]));

export const KIT_COLORS = [
  '#b6ff3c',
  '#22d3ee',
  '#f472b6',
  '#f59e0b',
  '#a78bfa',
  '#ef4444',
  '#f8fafc',
  '#111827',
];

const GK = { id: 'G', pos: 'GK', x: 0, z: 45 };

export const FORMATIONS = {
  '3-1-1': {
    id: '3-1-1',
    label: '3-1-1',
    blurb: 'Back three, single pivot, lone striker',
    slots: [
      GK,
      { id: 'D1', pos: 'LB', x: -23, z: 17 },
      { id: 'D2', pos: 'CB', x: 0, z: 13 },
      { id: 'D3', pos: 'RB', x: 23, z: 17 },
      { id: 'M1', pos: 'CM', x: 0, z: -13 },
      { id: 'F1', pos: 'ST', x: 0, z: -40 },
    ],
  },
  '3-2': {
    id: '3-2',
    label: '3-2',
    blurb: 'Back three with a double pivot',
    slots: [
      GK,
      { id: 'D1', pos: 'LB', x: -22, z: 17 },
      { id: 'D2', pos: 'CB', x: 0, z: 13 },
      { id: 'D3', pos: 'RB', x: 22, z: 17 },
      { id: 'M1', pos: 'CM', x: -14, z: -13 },
      { id: 'M2', pos: 'CM', x: 14, z: -13 },
    ],
  },
  '4-1': {
    id: '4-1',
    label: '4-1',
    blurb: 'Flat back four hunting a single forward',
    slots: [
      GK,
      { id: 'D1', pos: 'LB', x: -27, z: 19 },
      { id: 'D2', pos: 'CB', x: -9, z: 14 },
      { id: 'D3', pos: 'CB', x: 9, z: 14 },
      { id: 'D4', pos: 'RB', x: 27, z: 19 },
      { id: 'F1', pos: 'ST', x: 0, z: -40 },
    ],
  },
  '2-2-1': {
    id: '2-2-1',
    label: '2-2-1',
    blurb: 'Compact centre pair, midfield shield, poacher',
    slots: [
      GK,
      { id: 'D1', pos: 'LB', x: -16, z: 17 },
      { id: 'D2', pos: 'CB', x: 16, z: 17 },
      { id: 'M1', pos: 'DM', x: -14, z: -13 },
      { id: 'M2', pos: 'CM', x: 14, z: -13 },
      { id: 'F1', pos: 'ST', x: 0, z: -40 },
    ],
  },
};

export const DEFAULT_FORMATION = '3-1-1';

export function getFormation(id) {
  return FORMATIONS[id] ?? FORMATIONS[DEFAULT_FORMATION];
}

export function starterSlotIds(formationId) {
  return getFormation(formationId).slots.map((s) => s.id);
}

export function positionAffinity(playerPosition, slotPosition) {
  if (playerPosition === slotPosition) return 3;
  const groups = [
    ['GK'],
    ['LB', 'CB', 'RB'],
    ['DM', 'CM', 'AM'],
    ['AM', 'ST'],
  ];
  const idx = groups.findIndex((g) => g.includes(playerPosition));
  const slotIdx = groups.findIndex((g) => g.includes(slotPosition));
  if (playerPosition === 'GK' || slotPosition === 'GK') return 0;
  if (idx !== -1 && idx === slotIdx) return 1;
  if (playerPosition === 'AM' && slotPosition === 'ST') return 2;
  if (playerPosition === 'CM' && slotPosition === 'ST') return 1;
  return 0;
}