// Gloomhaven game configuration.
// Images live in images/gh2/ (not gh/).

import { MERCENARY_STATS } from './common.js';

const SH = { left: 41, top: 35, w:  81, h:  70 };
// 2-hex overlays — fixed display height 156, width computed to preserve aspect ratio
const TH  = { left: 46, top: 39, w:  91, h: 156, hexes: ['S'] }; // ~215×370 (floor tiles, hot coals, dark pit)
const LH  = { left: 36, top: 39, w:  71, h: 156, hexes: ['S'] }; // 157×345 (log)
const WH  = { left: 27, top: 39, w:  53, h: 156, hexes: ['S'] }; // 118×349 (wall)
const BKH = { left: 29, top: 39, w:  58, h: 156, hexes: ['S'] }; // 130×350 (bookcase)
const BOH = { left: 42, top: 39, w:  78, h: 156, hexes: ['S'] }; // 176×352 (boulder)
const XH  = { left: 35, top: 39, w: 142, h: 156, hexes: ['S', 'SE'] }; // ~330×360 (3-hex)

// ─── Tiles ───────────────────────────────────────────────────────────────────

const TILE_ROWS = [
  {
    id: 1, title: '01-A', left: 86, top: 40   },
  { id: 2, title: '01-B', left: 86, top: 52    },
  { id:  3, title: '01-C', left: 86, top:  40 },
  { id:  4, title: '01-D', left: 86, top:  52 },
  { id:  5, title: '01-E', left: 86, top:  40 },
  { id:  6, title: '01-F', left: 86, top:  52 },
  { id:  7, title: '02-A', left: 86, top:  80 },
  { id:  8, title: '02-B', left: 84, top:  94 },
  { id: 9, title: '02-C',  left: 82, top: 75 },
  { id: 10, title: '02-D', left: 84, top: 94 },
  { id: 11, title: '02-E', left: 86, top: 80 },
  { id: 12, title: '02-F', left: 84, top: 94 },
  { id: 13, title: '02-G', left: 86, top: 80 },
  { id: 14, title: '02-H', left: 84, top: 94 },
  { id: 15, title: '03-A', left: 68, top: 120 },
  { id: 16, title: '03-B', left: 68, top:  78 },
  { id: 17, title: '03-C', left: 68, top:  78 },
  { id: 18, title: '03-D', left: 68, top:  75 },
  { id: 19, title: '04-A', left: 68, top: 154 },
  { id: 20, title: '04-B', left: 68, top: 154 },
  { id: 21, title: '04-C', left: 68, top: 156 },
  { id: 22, title: '04-D', left: 66, top: 160 },
  { id: 23, title: '05-A', left: 68, top:  78 },
  { id: 24, title: '05-B', left: 68, top:  93 },
  { id: 25, title: '06-A', left: 65, top:  52 },
  { id: 26, title: '06-B', left: 65, top:  52 },
  { id: 27, title: '07-A', left: 68, top:  57 },
  { id: 28, title: '07-B', left: 86, top:  56 },
  { id: 29, title: '07-C', left: 86, top:  39 },
  { id: 30, title: '07-D', left: 86, top:  56 },
  { id: 31, title: '09-A', left: 68, top: 232 },
  { id: 32, title: '09-B', left: 68, top: 250 },
  { id: 33, title: '09-C', left: 68, top: 234 },
  { id: 34, title: '09-D', left: 68, top: 250 },
  { id: 35, title: '10-A', left: 84, top:  43 },
  { id: 36, title: '10-B', left: 84, top:  58 },
  { id: 37, title: '10-C', left: 84, top:  42 },
  { id: 38, title: '10-D', left: 84, top:  58 },
  { id: 39, title: '11-A', left: 86, top:  52 },
  { id: 40, title: '11-B', left: 86, top:  45 },
  { id: 41, title: '11-C', left: 80, top:  52 },
  { id: 42, title: '11-D', left: 86, top:  45 },
  { id: 43, title: '12-A', left: 68, top: 115 },
  { id: 44, title: '12-B', left: 68, top: 110 },
  { id: 45, title: '12-C', left: 68, top: 108 },
  { id: 46, title: '12-D', left: 68, top: 112 },
  { id: 47, title: '13-A', left: 82, top:  52 },
  { id: 48, title: '13-B', left: 86, top:  41 },
  { id: 49, title: '13-C', left: 82, top:  52 },
  { id: 50, title: '13-D', left: 82, top:  41 },
  { id: 51, title: '13-E', left: 82, top:  52 },
  { id: 52, title: '13-F', left: 82, top:  41 },
  { id: 53, title: '15-A', left: 80, top: 117 },
  { id: 54, title: '15-B', left: 80, top: 117 },
  { id: 55, title: '16-A', left: 80, top:  55 },
  { id: 56, title: '16-B', left: 80, top:  40 },
].map(r => ({ ...r, game: 'gh2' }));

// ─── Overlays ─────────────────────────────────────────────────────────────────

const OVERLAY_ROWS = [
  // ── Corridors ─────────────────────────────────────────────────────
  { id:  1, title: 'dirt floor 2h', img: 'dirt-floor-2h', ...TH, defaultRole: 'corridor' },
  { id:  2, title: 'dirt floor',   img: 'dirt-floor',    ...SH, defaultRole: 'corridor' },
  { id:  3, title: 'rock floor',   img: 'rock-floor',    ...TH, defaultRole: 'corridor' },
  { id:  4, title: 'stone floor',  img: 'stone-floor',   ...TH, defaultRole: 'corridor' },
  // ── Difficult terrain ─────────────────────────────────────────────
  { id:  9, title: 'log',         img: 'log',         ...LH,  defaultRole: 'difficult' },
  // ── Hazardous terrain ─────────────────────────────────────────────
  { id:  5, title: 'hot coals',   img: 'hot-coals',   ...TH,  defaultRole: 'hazardous' },
  { id:  6, title: 'thorns',      img: 'thorns',      ...SH,  defaultRole: 'hazardous' },
  // ── Walls ─────────────────────────────────────────────────────────
  { id:  7, title: 'dark pit',    img: 'dark-pit',    ...TH,  defaultRole: 'wall' },
  { id:  8, title: 'wall',        img: 'wall',        ...WH,  defaultRole: 'wall' },
  // ── Obstacles ─────────────────────────────────────────────────────
  { id: 11, title: 'bookcase',     img: 'bookcase',    ...BKH, defaultRole: 'obstacle' },
  { id: 12, title: 'boulder',      img: 'boulder',     ...BOH, defaultRole: 'obstacle' },
  { id: 13, title: 'boulder 3h',   img: 'boulder-3h',   ...XH, defaultRole: 'obstacle' },
  { id: 14, title: 'bush',         img: 'bush',         ...SH, defaultRole: 'obstacle' },
  { id: 15, title: 'cabinet',      img: 'cabinet',      ...SH, defaultRole: 'obstacle' },
  { id: 16, title: 'crystal',      img: 'crystal',      ...SH, defaultRole: 'obstacle' },
  { id: 17, title: 'fountain',     img: 'fountain',     ...SH, defaultRole: 'obstacle' },
  { id: 18, title: 'rock column',  img: 'rock-column',  ...SH, defaultRole: 'obstacle' },
  { id: 19, title: 'stone pillar', img: 'stone-pillar', ...SH, defaultRole: 'obstacle' },
  { id: 20, title: 'stump',        img: 'stump',        ...SH, defaultRole: 'obstacle' },
  { id: 21, title: 'table',        img: 'table',        ...LH, defaultRole: 'obstacle' },
  { id: 22, title: 'tree',         img: 'tree',         ...XH, defaultRole: 'obstacle' },
  // ── Loot ──────────────────────────────────────────────────────────
  { id: 31, title: 'chest', img: 'chest', ...SH, defaultRole: 'loot' },
  { id: 32, title: 'coin', img: 'coin', ...SH, defaultRole: 'loot' },
  { id: 33, title: 'coin 5', img: 'coin5', ...SH, defaultRole: 'loot' },
  // ── Doors ─────────────────────────────────────────────────────────
  { id: 51, title: 'stone door',  img: 'stone-door', ...SH, defaultRole: 'door', hasOpenClose: true },
  { id: 52, title: 'wooden door', img: 'wooden-door',...SH, defaultRole: 'door', hasOpenClose: true },
  { id: 53, title: 'light fog',   img: 'light-fog',  ...SH, defaultRole: 'door' },
  { id: 54, title: 'dark fog',    img: 'dark-fog',   ...SH, defaultRole: 'door' },
].map(r => ({ ...r, game: 'gh2' }));

// ─── Monster Stats ────────────────────────────────────────────────────────────

const MONSTER_STATS = {
  'ancient artillery': {
    count: 6,
    levels: {
      0: { normal: 4, elite: 7 },
      1: { normal: 6, elite: 9 },
      2: { normal: 8, elite: 12 },
      3: { normal: 9, elite: 14 },
      4: { normal: 12, elite: 16 },
      5: { normal: 15, elite: 21 },
      6: { normal: 18, elite: 26 },
      7: { normal: 21, elite: 34 }
    }
  },

  'bandit archer': {
    count: 6,
    levels: {
      0: { normal: 4, elite: 6 },
      1: { normal: 5, elite: 7 },
      2: { normal: 6, elite: 9 },
      3: { normal: 6, elite: 10 },
      4: { normal: 8, elite: 10 },
      5: { normal: 9, elite: 12 },
      6: { normal: 9, elite: 13 },
      7: { normal: 12, elite: 17 }
    }
  },

  'bandit scout': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 7 },
      1: { normal: 6, elite: 8 },
      2: { normal: 7, elite: 9 },
      3: { normal: 10, elite: 12 },
      4: { normal: 11, elite: 14 },
      5: { normal: 11, elite: 15 },
      6: { normal: 16, elite: 18 },
      7: { normal: 19, elite: 22 }
    }
  },

  'black imp': {
    count: 10,
    levels: {
      0: { normal: 3, elite: 3 },
      1: { normal: 3, elite: 5 },
      2: { normal: 4, elite: 7 },
      3: { normal: 4, elite: 7 },
      4: { normal: 5, elite: 7 },
      5: { normal: 7, elite: 9 },
      6: { normal: 9, elite: 12 },
      7: { normal: 13, elite: 18 }
    }
  },

  'cave bear': {
    count: 4,
    levels: {
      0: { normal: 7, elite: 11 },
      1: { normal: 9, elite: 14 },
      2: { normal: 11, elite: 17 },
      3: { normal: 13, elite: 20 },
      4: { normal: 15, elite: 21 },
      5: { normal: 17, elite: 24 },
      6: { normal: 21, elite: 29 },
      7: { normal: 27, elite: 37 }
    }
  },

  'chaos demon': {
    count: 4,
    levels: {
      0: { normal: 7, elite: 10 },
      1: { normal: 8, elite: 12 },
      2: { normal: 11, elite: 14 },
      3: { normal: 12, elite: 18 },
      4: { normal: 14, elite: 21 },
      5: { normal: 16, elite: 26 },
      6: { normal: 20, elite: 33 },
      7: { normal: 25, elite: 39 }
    }
  },

  'city archer': {
    count: 6,
    levels: {
      0: { normal: 4, elite: 6 },
      1: { normal: 5, elite: 6 },
      2: { normal: 6, elite: 7 },
      3: { normal: 6, elite: 8 },
      4: { normal: 8, elite: 10 },
      5: { normal: 8, elite: 11 },
      6: { normal: 10, elite: 14 },
      7: { normal: 11, elite: 16 }
    }
  },

  'city guard': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 6 },
      1: { normal: 5, elite: 6 },
      2: { normal: 7, elite: 9 },
      3: { normal: 8, elite: 9 },
      4: { normal: 9, elite: 10 },
      5: { normal: 10, elite: 13 },
      6: { normal: 13, elite: 15 },
      7: { normal: 17, elite: 20 }
    }
  },

  'crystal rot': {
    count: 4,
    levels: {
      0: { normal: 5, elite: 8 },
      1: { normal: 6, elite: 9 },
      2: { normal: 7, elite: 11 },
      3: { normal: 10, elite: 16 },
      4: { normal: 11, elite: 18 },
      5: { normal: 13, elite: 21 },
      6: { normal: 18, elite: 29 },
      7: { normal: 21, elite: 33 }
    }
  },

  'cultist': {
    count: 6,
    levels: {
      0: { normal: 4, elite: 7 },
      1: { normal: 6, elite: 9 },
      2: { normal: 7, elite: 11 },
      3: { normal: 8, elite: 15 },
      4: { normal: 9, elite: 16 },
      5: { normal: 11, elite: 20 },
      6: { normal: 16, elite: 26 },
      7: { normal: 18, elite: 30 }
    }
  },

  'deep terror': {
    count: 10,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 4, elite: 6 },
      2: { normal: 4, elite: 7 },
      3: { normal: 5, elite: 8 },
      4: { normal: 7, elite: 9 },
      5: { normal: 7, elite: 11 },
      6: { normal: 9, elite: 13 },
      7: { normal: 9, elite: 16 }
    }
  },

  'earth demon': {
    count: 6,
    levels: {
      0: { normal: 7, elite: 10 },
      1: { normal: 9, elite: 13 },
      2: { normal: 12, elite: 18 },
      3: { normal: 13, elite: 20 },
      4: { normal: 15, elite: 21 },
      5: { normal: 17, elite: 25 },
      6: { normal: 21, elite: 32 },
      7: { normal: 25, elite: 42 }
    }
  },

  'flame demon': {
    count: 6,
    levels: {
      0: { normal: 2, elite: 3 },
      1: { normal: 2, elite: 3 },
      2: { normal: 3, elite: 4 },
      3: { normal: 3, elite: 5 },
      4: { normal: 3, elite: 5 },
      5: { normal: 4, elite: 6 },
      6: { normal: 4, elite: 7 },
      7: { normal: 6, elite: 9 }
    }
  },

  'forest imp': {
    count: 10,
    levels: {
      0: { normal: 1, elite: 4 },
      1: { normal: 2, elite: 5 },
      2: { normal: 2, elite: 6 },
      3: { normal: 3, elite: 7 },
      4: { normal: 3, elite: 7 },
      5: { normal: 4, elite: 8 },
      6: { normal: 5, elite: 10 },
      7: { normal: 8, elite: 14 }
    }
  },

  'frost demon': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 10 },
      1: { normal: 6, elite: 10 },
      2: { normal: 7, elite: 12 },
      3: { normal: 8, elite: 14 },
      4: { normal: 11, elite: 19 },
      5: { normal: 13, elite: 22 },
      6: { normal: 18, elite: 29 },
      7: { normal: 25, elite: 40 }
    }
  },

  'giant viper': {
    count: 10,
    levels: {
      0: { normal: 2, elite: 3 },
      1: { normal: 3, elite: 5 },
      2: { normal: 4, elite: 7 },
      3: { normal: 4, elite: 8 },
      4: { normal: 6, elite: 11 },
      5: { normal: 7, elite: 13 },
      6: { normal: 9, elite: 16 },
      7: { normal: 12, elite: 20 }
    }
  },

  'harrower infester': {
    count: 4,
    levels: {
      0: { normal: 6, elite: 12 },
      1: { normal: 7, elite: 12 },
      2: { normal: 8, elite: 14 },
      3: { normal: 10, elite: 17 },
      4: { normal: 12, elite: 19 },
      5: { normal: 12, elite: 21 },
      6: { normal: 15, elite: 27 },
      7: { normal: 18, elite: 32 }
    }
  },

  'hound': {
    count: 10,
    levels: {
      0: { normal: 4, elite: 6 },
      1: { normal: 4, elite: 6 },
      2: { normal: 6, elite: 7 },
      3: { normal: 8, elite: 8 },
      4: { normal: 9, elite: 11 },
      5: { normal: 10, elite: 13 },
      6: { normal: 14, elite: 17 },
      7: { normal: 17, elite: 23 }
    }
  },

  'inox archer': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 7 },
      1: { normal: 6, elite: 9 },
      2: { normal: 8, elite: 12 },
      3: { normal: 8, elite: 13 },
      4: { normal: 10, elite: 16 },
      5: { normal: 14, elite: 22 },
      6: { normal: 16, elite: 25 },
      7: { normal: 23, elite: 35 }
    }
  },

  'inox guard': {
    count: 6,
    levels: {
      0: { normal: 7, elite: 11 },
      1: { normal: 8, elite: 13 },
      2: { normal: 12, elite: 15 },
      3: { normal: 13, elite: 20 },
      4: { normal: 16, elite: 23 },
      5: { normal: 20, elite: 28 },
      6: { normal: 28, elite: 34 },
      7: { normal: 32, elite: 40 }
    }
  },

  'inox priest': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 7 },
      1: { normal: 7, elite: 10 },
      2: { normal: 8, elite: 12 },
      3: { normal: 11, elite: 16 },
      4: { normal: 12, elite: 18 },
      5: { normal: 15, elite: 24 },
      6: { normal: 20, elite: 32 },
      7: { normal: 25, elite: 36 }
    }
  },

  'living bones': {
    count: 10,
    levels: {
      0: { normal: 5, elite: 6 },
      1: { normal: 5, elite: 6 },
      2: { normal: 5, elite: 7 },
      3: { normal: 7, elite: 9 },
      4: { normal: 7, elite: 10 },
      5: { normal: 9, elite: 13 },
      6: { normal: 12, elite: 18 },
      7: { normal: 15, elite: 21 }
    }
  },

  'living corpse': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 10 },
      1: { normal: 8, elite: 11 },
      2: { normal: 10, elite: 15 },
      3: { normal: 11, elite: 15 },
      4: { normal: 12, elite: 19 },
      5: { normal: 14, elite: 21 },
      6: { normal: 18, elite: 31 },
      7: { normal: 26, elite: 36 }
    }
  },

  'living spirit': {
    count: 6,
    levels: {
      0: { normal: 2, elite: 3 },
      1: { normal: 2, elite: 3 },
      2: { normal: 2, elite: 3 },
      3: { normal: 3, elite: 4 },
      4: { normal: 3, elite: 5 },
      5: { normal: 4, elite: 6 },
      6: { normal: 5, elite: 8 },
      7: { normal: 7, elite: 11 }
    }
  },

  'lurker soldier': {
    count: 10,
    levels: {
      0: { normal: 2, elite: 4 },
      1: { normal: 4, elite: 5 },
      2: { normal: 5, elite: 7 },
      3: { normal: 6, elite: 9 },
      4: { normal: 7, elite: 10 },
      5: { normal: 9, elite: 13 },
      6: { normal: 11, elite: 16 },
      7: { normal: 14, elite: 21 }
    }
  },

  'night demon': {
    count: 8,
    levels: {
      0: { normal: 2, elite: 3 },
      1: { normal: 2, elite: 4 },
      2: { normal: 3, elite: 5 },
      3: { normal: 3, elite: 5 },
      4: { normal: 5, elite: 7 },
      5: { normal: 6, elite: 9 },
      6: { normal: 8, elite: 12 },
      7: { normal: 11, elite: 16 }
    }
  },

  'ooze': {
    count: 10,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 4, elite: 6 },
      2: { normal: 5, elite: 8 },
      3: { normal: 6, elite: 9 },
      4: { normal: 8, elite: 11 },
      5: { normal: 9, elite: 13 },
      6: { normal: 12, elite: 18 },
      7: { normal: 15, elite: 21 }
    }
  },

  'rending drake': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 9 },
      1: { normal: 7, elite: 11 },
      2: { normal: 9, elite: 14 },
      3: { normal: 11, elite: 17 },
      4: { normal: 13, elite: 20 },
      5: { normal: 16, elite: 25 },
      6: { normal: 20, elite: 31 },
      7: { normal: 26, elite: 41 }
    }
  },

  'savvas icestorm': {
    count: 4,
    levels: {
      0: { normal: 6, elite: 8 },
      1: { normal: 8, elite: 11 },
      2: { normal: 9, elite: 13 },
      3: { normal: 11, elite: 15 },
      4: { normal: 14, elite: 19 },
      5: { normal: 16, elite: 24 },
      6: { normal: 20, elite: 31 },
      7: { normal: 25, elite: 39 }
    }
  },

  'savvas lavaflow': {
    count: 4,
    levels: {
      0: { normal: 8, elite: 11 },
      1: { normal: 10, elite: 14 },
      2: { normal: 12, elite: 17 },
      3: { normal: 14, elite: 21 },
      4: { normal: 17, elite: 23 },
      5: { normal: 20, elite: 27 },
      6: { normal: 25, elite: 35 },
      7: { normal: 30, elite: 42 }
    }
  },

  'spitting drake': {
    count: 6,
    levels: {
      0: { normal: 5, elite: 9 },
      1: { normal: 7, elite: 11 },
      2: { normal: 9, elite: 14 },
      3: { normal: 11, elite: 17 },
      4: { normal: 13, elite: 20 },
      5: { normal: 16, elite: 25 },
      6: { normal: 20, elite: 31 },
      7: { normal: 26, elite: 41 }
    }
  },

  'stone construct': {
    count: 4,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 5, elite: 8 },
      2: { normal: 7, elite: 10 },
      3: { normal: 9, elite: 11 },
      4: { normal: 11, elite: 15 },
      5: { normal: 13, elite: 19 },
      6: { normal: 16, elite: 25 },
      7: { normal: 20, elite: 32 }
    }
  },

  'sun demon': {
    count: 6,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 4, elite: 6 },
      2: { normal: 5, elite: 7 },
      3: { normal: 6, elite: 9 },
      4: { normal: 7, elite: 11 },
      5: { normal: 9, elite: 14 },
      6: { normal: 11, elite: 18 },
      7: { normal: 14, elite: 23 }
    }
  },

  'vermling priest': {
    count: 6,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 4, elite: 6 },
      2: { normal: 5, elite: 8 },
      3: { normal: 6, elite: 10 },
      4: { normal: 7, elite: 12 },
      5: { normal: 9, elite: 15 },
      6: { normal: 12, elite: 20 },
      7: { normal: 15, elite: 25 }
    }
  },

  'vermling scout': {
    count: 8,
    levels: {
      0: { normal: 2, elite: 3 },
      1: { normal: 3, elite: 4 },
      2: { normal: 3, elite: 5 },
      3: { normal: 5, elite: 7 },
      4: { normal: 6, elite: 8 },
      5: { normal: 7, elite: 10 },
      6: { normal: 9, elite: 13 },
      7: { normal: 11, elite: 16 }
    }
  },

  'wind demon': {
    count: 6,
    levels: {
      0: { normal: 3, elite: 5 },
      1: { normal: 3, elite: 5 },
      2: { normal: 4, elite: 7 },
      3: { normal: 5, elite: 8 },
      4: { normal: 7, elite: 10 },
      5: { normal: 10, elite: 14 },
      6: { normal: 11, elite: 16 },
      7: { normal: 14, elite: 21 }
    }
  }
};

// ─── Monsters ─────────────────────────────────────────────────────────────────

const MONSTER_ROWS = [
  { id:   1, title: 'ancient artillery' },
  { id:   2, title: 'bandit archer'     },
  { id:   3, title: 'bandit scout'      },
  { id:   4, title: 'black imp'         },
  { id:   5, title: 'cave bear'         },
  { id:   6, title: 'chaos demon'       },
  { id:   7, title: 'city archer'       },
  { id:   8, title: 'city guard'        },
  { id:   9, title: 'crystal rot'       },
  { id:  10, title: 'cultist'           },
  { id:  11, title: 'deep terror'       },
  { id:  12, title: 'earth demon'       },
  { id:  13, title: 'flame demon'       },
  { id:  14, title: 'forest imp'        },
  { id:  15, title: 'frost demon'       },
  { id:  16, title: 'giant viper'       },
  { id:  17, title: 'harrower infester' },
  { id:  18, title: 'hound'            },
  { id:  19, title: 'inox archer'      },
  { id:  20, title: 'inox guard'       },
  { id:  21, title: 'inox priest'      },
  { id:  22, title: 'living bones'     },
  { id:  23, title: 'living corpse'    },
  { id:  24, title: 'living spirit'    },
  { id:  25, title: 'lurker soldier'   },
  { id:  26, title: 'night demon'      },
  { id:  27, title: 'ooze'             },
  { id:  28, title: 'rending drake'    },
  { id:  29, title: 'savvas icestorm'  },
  { id:  30, title: 'savvas lavaflow'  },
  { id:  31, title: 'spitting drake'   },
  { id:  32, title: 'stone construct'  },
  { id:  33, title: 'sun demon'        },
  { id:  34, title: 'vermling priest'  },
  { id:  35, title: 'vermling scout'   },
  { id:  36, title: 'wind demon'       },
  // ── Bosses ──────────────────────────────────────────────────────
  { id: 101, title: 'bandit commander',     boss: true },
  { id: 102, title: 'candlekeeper trice',   boss: true },
  { id: 103, title: 'first shield harmon',  boss: true },
  { id: 104, title: 'inox bodyguard',       boss: true },
  { id: 105, title: 'jekserah',             boss: true },
  { id: 106, title: 'merciless taskmaster', boss: true },
  { id: 107, title: 'the betrayer',         boss: true },
  { id: 108, title: 'the colorless',        boss: true },
  { id: 109, title: 'the dark rider',       boss: true },
  { id: 110, title: 'the elder drake',      boss: true },
  { id: 111, title: 'the gloom',            boss: true },
  { id: 112, title: 'the prime demon',      boss: true },
  { id: 113, title: 'the sightless eye',    boss: true },
  { id: 114, title: 'the winged horror',    boss: true },
].map(r => ({ ...SH, boss: false, game: 'gh2', ...r }));

// ─── Level-dependent stats ────────────────────────────────────────────────────

export default {
  id:               'gh',
  name:             'Gloomhaven',
  gridSize:         { cols: 40, rows: 50 },
  tiles:            TILE_ROWS,
  overlays:         OVERLAY_ROWS,
  monsters:         MONSTER_ROWS,
  mercenaryStats:   MERCENARY_STATS,
  monsterStats:     MONSTER_STATS,
};
