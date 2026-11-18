import type {
  DailyPuzzle,
  DifferenceTarget,
  MutationType,
  PropKind,
  PuzzleDifficulty,
  PuzzleTheme,
  SceneProp,
  ScoreBreakdown,
  ThemePalette,
} from '../types/game';

export const ARCHIVE_MONTHS = 6;

// Deterministic PRNG (Mulberry32)
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDateString(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function getArchiveStartDateKey(todayKey = getTodayDateKey()): string {
  const today = parseDateKey(todayKey);
  const start = new Date(today.getFullYear(), today.getMonth() - ARCHIVE_MONTHS, today.getDate());
  return formatDateKey(start);
}

export function getArchiveDateKeys(todayKey = getTodayDateKey()): string[] {
  const startKey = getArchiveStartDateKey(todayKey);
  const start = parseDateKey(startKey);
  const end = parseDateKey(todayKey);
  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.reverse(); // Newest (Today) first
}

export function formatReadableDate(dateKey: string): string {
  const dt = parseDateKey(dateKey);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthHeading(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface ThemeSpec {
  id: PuzzleTheme;
  label: string;
  palettes: ThemePalette[];
  titleAdjectives: string[];
  titleNouns: string[];
  skyPool: PropKind[];
  midPool: PropKind[];
  fgPool: PropKind[];
}

const THEME_SPECS: ThemeSpec[] = [
  {
    id: 'conservatory',
    label: 'Botanical Conservatory',
    titleAdjectives: ['Glasshouse', 'Dewfall', 'Sunlit', 'Fernwood', 'Emerald', 'Morning'],
    titleNouns: ['Palm Pavilion', 'Orchid Study', 'Terrarium', 'Botanica', 'Wintergarden', 'Atrium'],
    palettes: [
      {
        skyTop: '#244A52',
        skyBottom: '#8BB8A8',
        horizon: '#4F7E73',
        ground: '#E7DEC8',
        groundAccent: '#C9B99B',
        structure: '#2A413B',
        structureTrim: '#D7A859',
        ink: '#1A2421',
        warmAccent: '#D96B43',
        coolAccent: '#3D8C7D',
        highlight: '#F6E8C3',
      },
      {
        skyTop: '#2D3A4F',
        skyBottom: '#D6A87C',
        horizon: '#6B7E68',
        ground: '#EDE4D3',
        groundAccent: '#C6B79E',
        structure: '#34473D',
        structureTrim: '#E2B466',
        ink: '#1E2326',
        warmAccent: '#C95D4B',
        coolAccent: '#4C8B84',
        highlight: '#FBF0D4',
      },
    ],
    skyPool: ['sunDisc', 'crescentMoon', 'cloudCluster', 'butterfly', 'hangingLantern', 'birdFlock'],
    midPool: ['archWindow', 'pottedMonstera', 'flowerBox', 'hangingLantern', 'clockDial'],
    fgPool: ['pottedMonstera', 'wateringCan', 'teaCup', 'bookStack', 'catSilhouette', 'butterfly'],
  },
  {
    id: 'lighthouse',
    label: 'Harbor Lighthouse',
    titleAdjectives: ['Foghorn', 'Breakwater', 'Tidepool', 'Windward', 'Beacon', 'Saltmarsh'],
    titleNouns: ['Point', 'Harbor', 'Headland', 'Jetty', 'Shoal', 'Promontory'],
    palettes: [
      {
        skyTop: '#1E3A54',
        skyBottom: '#8EB5C9',
        horizon: '#3B6E8C',
        ground: '#2D5973',
        groundAccent: '#D9C7A3',
        structure: '#F2ECE1',
        structureTrim: '#C94C38',
        ink: '#17222D',
        warmAccent: '#E08C45',
        coolAccent: '#468BA3',
        highlight: '#F7E7BD',
      },
      {
        skyTop: '#2E2B48',
        skyBottom: '#DF9B74',
        horizon: '#4B637A',
        ground: '#294861',
        groundAccent: '#C9B491',
        structure: '#EFE7DA',
        structureTrim: '#2D6A73',
        ink: '#1B1F29',
        warmAccent: '#D96045',
        coolAccent: '#5897A6',
        highlight: '#FCE7BF',
      },
    ],
    skyPool: ['sunDisc', 'crescentMoon', 'cloudCluster', 'seagull', 'hotAirBalloon', 'birdFlock'],
    midPool: ['lighthouseTower', 'sailboat', 'weathervane', 'cloudCluster'],
    fgPool: ['buoy', 'sailboat', 'seagull', 'flowerBox', 'catSilhouette', 'teaCup'],
  },
  {
    id: 'observatory',
    label: 'Celestial Observatory',
    titleAdjectives: ['Equinox', 'Meridian', 'Astral', 'Brass', 'Solstice', 'Zenith'],
    titleNouns: ['Orrery', 'Rotunda', 'Star Chamber', 'Chartroom', 'Planisphere', 'Dome'],
    palettes: [
      {
        skyTop: '#161D30',
        skyBottom: '#35496B',
        horizon: '#24324D',
        ground: '#DDD3BE',
        groundAccent: '#B5A385',
        structure: '#2B364B',
        structureTrim: '#D9A44E',
        ink: '#131822',
        warmAccent: '#D98245',
        coolAccent: '#5587A6',
        highlight: '#F8E3A3',
      },
      {
        skyTop: '#1F1E33',
        skyBottom: '#5B4E73',
        horizon: '#363352',
        ground: '#E3DAC7',
        groundAccent: '#BAA98B',
        structure: '#2D2C42',
        structureTrim: '#E2B35B',
        ink: '#171522',
        warmAccent: '#CC6B49',
        coolAccent: '#538E91',
        highlight: '#FAF0CA',
      },
    ],
    skyPool: ['crescentMoon', 'sunDisc', 'cloudCluster', 'owl', 'constellationFrame'],
    midPool: ['telescope', 'orrery', 'archWindow', 'constellationFrame', 'clockDial'],
    fgPool: ['bookStack', 'teaCup', 'owl', 'catSilhouette', 'pocketWatch', 'pottedMonstera'],
  },
  {
    id: 'cafe',
    label: 'Canal Café Terrace',
    titleAdjectives: ['Cobblestone', 'Espresso', 'Lantern', 'Canal', 'Terrace', 'Velvet'],
    titleNouns: ['Bistro', 'Promenade', 'Corner', 'Patisserie', 'Arcade', 'Veranda'],
    palettes: [
      {
        skyTop: '#315466',
        skyBottom: '#D6B08C',
        horizon: '#6B7E84',
        ground: '#D4C7B2',
        groundAccent: '#9F917C',
        structure: '#EFE7D6',
        structureTrim: '#B84A39',
        ink: '#1E2024',
        warmAccent: '#C9563C',
        coolAccent: '#3E7A78',
        highlight: '#F9E6B8',
      },
      {
        skyTop: '#243447',
        skyBottom: '#7E98A8',
        horizon: '#455A6B',
        ground: '#CFC4B0',
        groundAccent: '#988D79',
        structure: '#EAE0CE',
        structureTrim: '#2D6B68',
        ink: '#1A1E24',
        warmAccent: '#D67C3B',
        coolAccent: '#3D7C8C',
        highlight: '#FCE7BA',
      },
    ],
    skyPool: ['sunDisc', 'crescentMoon', 'cloudCluster', 'birdFlock', 'hangingLantern'],
    midPool: ['bistroAwning', 'archWindow', 'lamppost', 'flowerBox', 'clockDial'],
    fgPool: ['bistroTable', 'bicycle', 'teaCup', 'catSilhouette', 'pottedMonstera', 'bookStack'],
  },
  {
    id: 'chalet',
    label: 'Alpine Chalet & Rail',
    titleAdjectives: ['Timberline', 'Glacier', 'Pinecrest', 'Viaduct', 'Highland', 'Summit'],
    titleNouns: ['Chalet', 'Switchback', 'Station', 'Overlook', 'Lodge', 'Pass'],
    palettes: [
      {
        skyTop: '#2A4D69',
        skyBottom: '#B5D3DF',
        horizon: '#557A8C',
        ground: '#E8ECEB',
        groundAccent: '#9EB3AE',
        structure: '#734B36',
        structureTrim: '#D99B43',
        ink: '#1A2126',
        warmAccent: '#C94E3A',
        coolAccent: '#2E6B5E',
        highlight: '#FAF1D6',
      },
      {
        skyTop: '#29354F',
        skyBottom: '#DEAA85',
        horizon: '#636A82',
        ground: '#E5E7E6',
        groundAccent: '#A6B0B5',
        structure: '#694433',
        structureTrim: '#E0AC52',
        ink: '#1C1D24',
        warmAccent: '#CE5942',
        coolAccent: '#356E66',
        highlight: '#FDF2D7',
      },
    ],
    skyPool: ['sunDisc', 'crescentMoon', 'cloudCluster', 'hotAirBalloon', 'birdFlock'],
    midPool: ['chaletGable', 'pineTree', 'steamTrain', 'weathervane'],
    fgPool: ['pineTree', 'flowerBox', 'wateringCan', 'catSilhouette', 'lamppost'],
  },
  {
    id: 'clockshop',
    label: 'Clockmaker’s Atelier',
    titleAdjectives: ['Pendulum', 'Mainspring', 'Gilded', 'Chronometer', 'Escapement', 'Ticking'],
    titleNouns: ['Workshop', 'Horology', 'Gallery', 'Belfry', 'Atelier', 'Cabinet'],
    palettes: [
      {
        skyTop: '#2B2420',
        skyBottom: '#665242',
        horizon: '#47382E',
        ground: '#D9C9AE',
        groundAccent: '#A8916E',
        structure: '#4A3628',
        structureTrim: '#D6A146',
        ink: '#1A1411',
        warmAccent: '#C95A3A',
        coolAccent: '#467D7B',
        highlight: '#F8E3AD',
      },
      {
        skyTop: '#1E2A33',
        skyBottom: '#4E636E',
        horizon: '#34454E',
        ground: '#DFD2BA',
        groundAccent: '#B19D7B',
        structure: '#3B4248',
        structureTrim: '#DEB057',
        ink: '#15191D',
        warmAccent: '#D16A43',
        coolAccent: '#4D8882',
        highlight: '#FAF0C8',
      },
    ],
    skyPool: ['hangingLantern', 'gearCluster', 'clockDial', 'constellationFrame'],
    midPool: ['grandfatherClock', 'archWindow', 'gearCluster', 'pocketWatch', 'clockDial'],
    fgPool: ['pocketWatch', 'bookStack', 'teaCup', 'catSilhouette', 'owl', 'pottedMonstera'],
  },
  {
    id: 'mesa',
    label: 'Canyon Mesa & Pueblo',
    titleAdjectives: ['Terracotta', 'Redrock', 'Sundial', 'Arroyo', 'Juniper', 'Saguaro'],
    titleNouns: ['Mesa', 'Canyon', 'Courtyard', 'Pueblo', 'Horizon', 'Basin'],
    palettes: [
      {
        skyTop: '#2B5B73',
        skyBottom: '#E7B98A',
        horizon: '#C2744E',
        ground: '#E0BC93',
        groundAccent: '#BA8559',
        structure: '#D99968',
        structureTrim: '#3C7A75',
        ink: '#241914',
        warmAccent: '#C44D36',
        coolAccent: '#3B7D77',
        highlight: '#FBE8C2',
      },
      {
        skyTop: '#283654',
        skyBottom: '#DE8F6B',
        horizon: '#A85C4A',
        ground: '#D6AE88',
        groundAccent: '#A6724E',
        structure: '#CE8C62',
        structureTrim: '#42807A',
        ink: '#221716',
        warmAccent: '#D15B3E',
        coolAccent: '#458A80',
        highlight: '#FCEAC7',
      },
    ],
    skyPool: ['sunDisc', 'crescentMoon', 'cloudCluster', 'birdFlock', 'hotAirBalloon'],
    midPool: ['mesaButte', 'saguaro', 'archWindow', 'weathervane'],
    fgPool: ['clayAmphora', 'saguaro', 'pottedMonstera', 'catSilhouette', 'flowerBox'],
  },
  {
    id: 'jazzrooftop',
    label: 'Midnight Rooftop Studio',
    titleAdjectives: ['Velvet', 'Blue Note', 'Skyline', 'Nocturne', 'Brass', 'Moonlit'],
    titleNouns: ['Rooftop', 'Loft', 'Session', 'Terrace', 'Penthouse', 'Studio'],
    palettes: [
      {
        skyTop: '#131A2B',
        skyBottom: '#394D6E',
        horizon: '#24314A',
        ground: '#2D3440',
        groundAccent: '#4B5566',
        structure: '#D9CFC1',
        structureTrim: '#D99A43',
        ink: '#11151E',
        warmAccent: '#D96443',
        coolAccent: '#4C918E',
        highlight: '#F6E0A2',
      },
      {
        skyTop: '#1E1A2E',
        skyBottom: '#5A496B',
        horizon: '#342C47',
        ground: '#332E3D',
        groundAccent: '#524961',
        structure: '#E2D8C8',
        structureTrim: '#E2A94F',
        ink: '#14121D',
        warmAccent: '#DF6E4B',
        coolAccent: '#529396',
        highlight: '#FAEAAD',
      },
    ],
    skyPool: ['crescentMoon', 'cloudCluster', 'birdFlock', 'hangingLantern'],
    midPool: ['waterTower', 'archWindow', 'vinylShelf', 'lamppost', 'clockDial'],
    fgPool: ['saxophone', 'vinylShelf', 'pottedMonstera', 'teaCup', 'catSilhouette', 'bookStack'],
  },
];

const PROP_LABELS: Record<PropKind, string> = {
  sunDisc: 'Solar emblem',
  crescentMoon: 'Crescent moon',
  cloudCluster: 'Drifting cloud',
  birdFlock: 'Migrating birds',
  hotAirBalloon: 'Hot air balloon',
  weathervane: 'Roof weathervane',
  hangingLantern: 'Brass lantern',
  pottedMonstera: 'Potted botanical',
  wateringCan: 'Copper watering can',
  butterfly: 'Monarch butterfly',
  archWindow: 'Arched window',
  lighthouseTower: 'Lighthouse tower',
  sailboat: 'Harbor sailboat',
  seagull: 'Coastal gull',
  buoy: 'Channel buoy',
  telescope: 'Brass telescope',
  orrery: 'Planetary orrery',
  constellationFrame: 'Star chart frame',
  owl: 'Perched barn owl',
  bistroAwning: 'Striped awning',
  bistroTable: 'Café bistro table',
  bicycle: 'Vintage bicycle',
  lamppost: 'Iron streetlamp',
  steamTrain: 'Mountain locomotive',
  pineTree: 'Alpine pine',
  chaletGable: 'Timber chalet',
  grandfatherClock: 'Tallcase clock',
  pocketWatch: 'Brass pocket watch',
  gearCluster: 'Escapement gears',
  mesaButte: 'Sandstone butte',
  saguaro: 'Saguaro cactus',
  clayAmphora: 'Painted amphora',
  waterTower: 'Rooftop water tower',
  saxophone: 'Tenor saxophone',
  vinylShelf: 'Record cabinet',
  catSilhouette: 'Curious cat',
  teaCup: 'Porcelain teacup',
  bookStack: 'Bound folio stack',
  flowerBox: 'Window flower box',
  clockDial: 'Wall chronometer',
};

const MUTATION_PHRASES: Record<MutationType, (label: string) => string> = {
  color_shift: (l) => `${l} palette altered`,
  missing: (l) => `${l} missing in print`,
  added: (l) => `Extra ${l.toLowerCase()} present`,
  flip: (l) => `${l} orientation reversed`,
  pattern_swap: (l) => `${l} pattern detail changed`,
  position_shift: (l) => `${l} position shifted`,
};

const PROP_BOUNDS: Record<PropKind, { w: number; h: number }> = {
  sunDisc: { w: 86, h: 86 },
  crescentMoon: { w: 68, h: 68 },
  cloudCluster: { w: 108, h: 56 },
  birdFlock: { w: 78, h: 50 },
  hotAirBalloon: { w: 72, h: 102 },
  weathervane: { w: 68, h: 72 },
  hangingLantern: { w: 46, h: 78 },
  pottedMonstera: { w: 74, h: 98 },
  wateringCan: { w: 84, h: 58 },
  butterfly: { w: 66, h: 58 },
  archWindow: { w: 76, h: 100 },
  lighthouseTower: { w: 64, h: 136 },
  sailboat: { w: 78, h: 82 },
  seagull: { w: 62, h: 48 },
  buoy: { w: 48, h: 72 },
  telescope: { w: 86, h: 88 },
  orrery: { w: 92, h: 76 },
  constellationFrame: { w: 76, h: 64 },
  owl: { w: 52, h: 64 },
  bistroAwning: { w: 132, h: 52 },
  bistroTable: { w: 76, h: 64 },
  bicycle: { w: 94, h: 62 },
  lamppost: { w: 42, h: 124 },
  steamTrain: { w: 94, h: 76 },
  pineTree: { w: 82, h: 108 },
  chaletGable: { w: 108, h: 104 },
  grandfatherClock: { w: 56, h: 118 },
  pocketWatch: { w: 56, h: 64 },
  gearCluster: { w: 72, h: 68 },
  mesaButte: { w: 112, h: 68 },
  saguaro: { w: 68, h: 90 },
  clayAmphora: { w: 54, h: 74 },
  waterTower: { w: 64, h: 106 },
  saxophone: { w: 58, h: 86 },
  vinylShelf: { w: 72, h: 60 },
  catSilhouette: { w: 56, h: 66 },
  teaCup: { w: 52, h: 48 },
  bookStack: { w: 60, h: 48 },
  flowerBox: { w: 72, h: 46 },
  clockDial: { w: 60, h: 60 },
};

// Only props that are genuinely asymmetric horizontally can use 'flip'
const FLIPPABLE_PROPS = new Set<PropKind>([
  'crescentMoon',
  'birdFlock',
  'weathervane',
  'wateringCan',
  'sailboat',
  'seagull',
  'telescope',
  'constellationFrame',
  'bicycle',
  'steamTrain',
  'saxophone',
  'catSilhouette',
  'teaCup',
  'vinylShelf',
]);

// Props that don't have strong filled color bodies skip 'color_shift'
const NO_COLOR_SHIFT_PROPS = new Set<PropKind>(['birdFlock']);

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function colorDistance(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

// Fixed curated anchor slots per zone so compositions look artfully balanced and never collide
const SKY_SLOTS = [
  { x: 115, y: 88 },
  { x: 265, y: 74 },
  { x: 420, y: 92 },
  { x: 565, y: 76 },
  { x: 695, y: 96 },
];

const MID_SLOTS = [
  { x: 105, y: 245 },
  { x: 255, y: 235 },
  { x: 405, y: 225 },
  { x: 555, y: 240 },
  { x: 695, y: 230 },
];

const FG_SLOTS = [
  { x: 95, y: 425 },
  { x: 220, y: 455 },
  { x: 350, y: 415 },
  { x: 485, y: 450 },
  { x: 615, y: 420 },
  { x: 720, y: 465 },
];

const ACCENT_SLOTS = [
  { x: 175, y: 335 },
  { x: 325, y: 325 },
  { x: 475, y: 340 },
  { x: 635, y: 330 },
];

function pickUnique<T>(pool: T[], count: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < count && copy.length > 0) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function generatePuzzleForDate(dateKey: string, todayKey = getTodayDateKey()): DailyPuzzle {
  const seed = hashDateString(`atelier-loupe-v1-${dateKey}`);
  const rng = createRng(seed);

  const startKey = getArchiveStartDateKey(todayKey);
  const startDt = parseDateKey(startKey);
  const curDt = parseDateKey(dateKey);
  const issueNumber = Math.max(1, Math.round((curDt.getTime() - startDt.getTime()) / 86400000) + 1);

  const themeIndex = (issueNumber - 1 + Math.floor(rng() * 3)) % THEME_SPECS.length;
  const spec = THEME_SPECS[themeIndex];
  const palette = spec.palettes[Math.floor(rng() * spec.palettes.length)];

  const adj = spec.titleAdjectives[Math.floor(rng() * spec.titleAdjectives.length)];
  const noun = spec.titleNouns[Math.floor(rng() * spec.titleNouns.length)];
  const title = `${adj} ${noun}`;

  const dayOfWeek = curDt.getDay(); // 0=Sun, 6=Sat
  let difficulty: PuzzleDifficulty = 'Standard';
  let diffCount = 5;
  let parSeconds = 110;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    difficulty = 'Master';
    diffCount = 7;
    parSeconds = 150;
  } else if (dayOfWeek === 3 || dayOfWeek === 5) {
    difficulty = 'Challenging';
    diffCount = 6;
    parSeconds = 130;
  }

  const props: SceneProp[] = [];

  const placeSlot = (
    slot: { x: number; y: number },
    kind: PropKind,
    index: number,
    zoneScale: number
  ) => {
    const jitterX = (rng() - 0.5) * 28;
    const jitterY = (rng() - 0.5) * 18;
    const colorChoices = [palette.warmAccent, palette.coolAccent, palette.structureTrim, palette.highlight];
    const primaryColor = colorChoices[Math.floor(rng() * colorChoices.length)];
    const secondaryColor = colorChoices[(colorChoices.indexOf(primaryColor) + 1) % colorChoices.length];
    const accentColor = palette.structureTrim;

    props.push({
      id: `prop-${index}-${kind}`,
      kind,
      x: Math.round(slot.x + jitterX),
      y: Math.round(slot.y + jitterY),
      scale: Number((zoneScale * (0.9 + rng() * 0.22)).toFixed(2)),
      rotation: Math.round((rng() - 0.5) * 8),
      primaryColor,
      secondaryColor,
      accentColor,
      variant: Math.floor(rng() * 3),
      flipped: rng() > 0.5,
      label: PROP_LABELS[kind],
    });
  };

  let propIndex = 0;

  // Sky (4 props)
  const skyOrder = pickUnique(SKY_SLOTS, 4, rng);
  skyOrder.forEach((slot, i) => {
    const kind = spec.skyPool[(i + Math.floor(rng() * spec.skyPool.length)) % spec.skyPool.length];
    placeSlot(slot, kind, propIndex++, 0.95);
  });

  // Midground (5 props)
  const midOrder = pickUnique(MID_SLOTS, 5, rng);
  midOrder.forEach((slot, i) => {
    const kind = spec.midPool[(i + Math.floor(rng() * spec.midPool.length)) % spec.midPool.length];
    placeSlot(slot, kind, propIndex++, 1.05);
  });

  // Accent mid-low (3 props)
  const accOrder = pickUnique(ACCENT_SLOTS, 3, rng);
  accOrder.forEach((slot, i) => {
    const pool = i % 2 === 0 ? spec.midPool : spec.fgPool;
    const kind = pool[Math.floor(rng() * pool.length)];
    placeSlot(slot, kind, propIndex++, 0.9);
  });

  // Foreground (6 props)
  const fgOrder = pickUnique(FG_SLOTS, 6, rng);
  fgOrder.forEach((slot, i) => {
    const kind = spec.fgPool[(i + Math.floor(rng() * spec.fgPool.length)) % spec.fgPool.length];
    placeSlot(slot, kind, propIndex++, 1.02);
  });

  // Select diffCount well-separated props so differences never overlap
  const candidateProps = [...props].sort(() => rng() - 0.5);
  const selectedProps: SceneProp[] = [];
  for (const cand of candidateProps) {
    if (selectedProps.length >= diffCount) break;
    const tooClose = selectedProps.some((existing) => {
      const dx = existing.x - cand.x;
      const dy = existing.y - cand.y;
      return Math.hypot(dx, dy) < 115;
    });
    if (!tooClose) {
      selectedProps.push(cand);
    }
  }
  // Fallback if tight spacing
  for (const cand of candidateProps) {
    if (selectedProps.length >= diffCount) break;
    if (!selectedProps.includes(cand)) {
      selectedProps.push(cand);
    }
  }

  const allMutations: MutationType[] = [
    'color_shift',
    'missing',
    'added',
    'flip',
    'pattern_swap',
    'position_shift',
  ];

  const altColorSwatches = [
    '#D63A3A', // vibrant vermilion
    '#1F8A8C', // deep teal
    '#F2B705', // bright gold
    '#6B4CE6', // royal indigo
    '#F5F5F0', // crisp ivory
    '#1F3044', // midnight navy
    '#2E9E5B', // emerald green
  ];

  const differences: DifferenceTarget[] = selectedProps.map((prop, idx) => {
    const allowedMutations = allMutations.filter((m) => {
      if (m === 'flip' && !FLIPPABLE_PROPS.has(prop.kind)) return false;
      if (m === 'color_shift' && NO_COLOR_SHIFT_PROPS.has(prop.kind)) return false;
      return true;
    });

    const mutation =
      allowedMutations[(idx + Math.floor(rng() * allowedMutations.length)) % allowedMutations.length];

    // Pick maximally contrasting altColor so color_shift is unmistakable
    const sortedColors = [...altColorSwatches].sort(
      (a, b) =>
        colorDistance(b, prop.primaryColor) +
        colorDistance(b, prop.secondaryColor) * 0.5 -
        (colorDistance(a, prop.primaryColor) + colorDistance(a, prop.secondaryColor) * 0.5)
    );
    const altColor = sortedColors[0] ?? '#F2B705';
    const altAccent =
      sortedColors.find((c) => c !== altColor && colorDistance(c, prop.secondaryColor) >= 140) ??
      sortedColors[1] ??
      '#1F8A8C';

    const dx =
      mutation === 'position_shift'
        ? prop.x > 620
          ? -44
          : prop.x < 180
          ? 44
          : rng() > 0.5
          ? 42
          : -42
        : 0;
    const dy =
      mutation === 'position_shift'
        ? prop.y > 470
          ? -34
          : prop.y < 130
          ? 34
          : rng() > 0.5
          ? 28
          : -28
        : 0;

    const bounds = PROP_BOUNDS[prop.kind];
    const hitWidth = Math.round(bounds.w * prop.scale + 22);
    const hitHeight = Math.round(bounds.h * prop.scale + 22);
    const hitRadius = Math.round(Math.max(hitWidth, hitHeight) / 2);

    const origX = prop.x;
    const origY = prop.y;
    const altX = prop.x + dx;
    const altY = prop.y + dy;

    return {
      id: `diff-${idx + 1}`,
      propId: prop.id,
      x: Math.round((origX + altX) / 2),
      y: Math.round((origY + altY) / 2),
      origX,
      origY,
      altX,
      altY,
      hitRadius,
      hitWidth,
      hitHeight,
      mutation,
      description: MUTATION_PHRASES[mutation](prop.label),
      altColor,
      altAccent,
      altVariant: (prop.variant + 1) % 3,
      altDx: dx,
      altDy: dy,
    };
  });

  return {
    date: dateKey,
    issueNumber,
    isToday: dateKey === todayKey,
    title,
    theme: spec.id,
    themeLabel: spec.label,
    difficulty,
    parSeconds,
    palette,
    props,
    differences,
    seed,
  };
}

export function calculateScoreBreakdown(params: {
  totalDiffs: number;
  maxCombo: number;
  elapsedSeconds: number;
  parSeconds: number;
  hintsUsed: number;
  mistakes: number;
}): ScoreBreakdown {
  const { totalDiffs, maxCombo, elapsedSeconds, parSeconds, hintsUsed, mistakes } = params;
  const baseScore = totalDiffs * 500;
  const comboBonus = Math.max(0, maxCombo - 1) * 140;
  const speedBonus = Math.max(0, Math.round((parSeconds - elapsedSeconds) * 18));
  const totalClicks = totalDiffs + mistakes;
  const accuracy = totalClicks > 0 ? Math.round((totalDiffs / totalClicks) * 1000) / 10 : 100;
  const accuracyBonus = Math.round((accuracy / 100) * 600);
  const hintPenalty = hintsUsed * 180;
  const mistakePenalty = mistakes * 85;

  const rawFinal = baseScore + comboBonus + speedBonus + accuracyBonus - hintPenalty - mistakePenalty;
  const finalScore = Math.max(250, rawFinal);

  let stars: 1 | 2 | 3 = 1;
  if (accuracy >= 80 && hintsUsed <= 1 && elapsedSeconds <= parSeconds + 30) {
    stars = 3;
  } else if (accuracy >= 60 && hintsUsed <= 2) {
    stars = 2;
  }

  return {
    baseScore,
    comboBonus,
    speedBonus,
    accuracyBonus,
    hintPenalty,
    mistakePenalty,
    finalScore,
    accuracy,
    stars,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
