// Game data aggregator. Selects a game config based on the ?game= URL param,
// merges expansion configs with their base game, then builds indices.

import { MERCENARY_ROWS, SUMMON_ROWS, CLASS_OVERLAY_ROWS, CONDITIONS, ELEMENTS } from './games/common.js';
import fhConfig   from './games/fh.js';
import ghConfig   from './games/gh.js';
import jotlConfig from './games/jotl.js';
import csConfig   from './games/cs.js';
import fcConfig   from './games/fc.js';

export { CONDITIONS, ELEMENTS };

// ─── Game registry ───────────────────────────────────────────────────────────

export const GAME_REGISTRY = [
  { id: 'gh',   name: 'Gloomhaven'        },
  { id: 'fh',   name: 'Frosthaven'        },
  { id: 'jotl', name: 'Jaws of the Lion'  },
  { id: 'fc',   name: 'Forgotten Circles', base: 'gh' },
  { id: 'cs',   name: 'Crimson Scales',    base: 'gh' },
];

const GAME_CONFIGS = { fh: fhConfig, gh: ghConfig, jotl: jotlConfig, cs: csConfig, fc: fcConfig };

function resolveConfig(cfg) {
  if (!cfg.base) return cfg;
  const base = GAME_CONFIGS[cfg.base];
  return {
    ...cfg,
    gridSize: cfg.gridSize ?? base.gridSize,
    tiles:    [...base.tiles,    ...cfg.tiles],
    overlays: [...base.overlays, ...cfg.overlays],
    monsters: [...base.monsters, ...cfg.monsters],
    monsterStats: { ...base.monsterStats, ...cfg.monsterStats },
    mercenaryStats: { ...base.mercenaryStats, ...cfg.mercenaryStats },
  };
}

const gameParam  = new URLSearchParams(location.search).get('game') || 'gh';
const gameConfig = resolveConfig(GAME_CONFIGS[gameParam] ?? ghConfig);

export const GAME_ID   = gameConfig.id;
export const GAME_NAME = gameConfig.name;

// ─── Asset path helpers ─────────────────────────────────────────────────────

function urlize(s)    { return s.replace(/ /g, '_').toLowerCase(); }
function tileUrl(entry, side = '') {
  const title = entry.title + side;
  if (entry.game === 'gh2') return title.replace(/ /g, '_');
  return urlize(title);
}
function hyphenize(s) { return s.replace(/ /g, '-').toLowerCase(); }

export const assetPath = {
  tile       : (entry, side = '') => `images/${entry.game}/tiles/${tileUrl(entry, side)}.png`,
  overlay    : (entry, opened)    => {
    if (entry.classOverlay) return `images/common/class_overlays/${entry.img}.png`;
    if (entry.game === 'gh2' && entry.hasOpenClose)
      return `images/gh2/overlays/${entry.img}-${opened ? 'open' : 'close'}.png`;
    return `images/${entry.game}/overlays/${entry.img}${opened ? '-open' : ''}.png`;
  },
  monster    : (entry)            => `images/${entry.game}/monsters/hex/${urlize(entry.title)}.png`,
  monsterCard: (entry, level)     => `images/${entry.game}/monsters/stats/${urlize(entry.title)}_${level}.png`,
  mercenary  : (title)            => `images/common/mercenaries/${urlize(title)}.png`,
  mercenaryMat: (title)           => `images/common/mercenary_mats/${urlize(title)}.png`,
  summon     : (title)            => `images/common/summons/${urlize(title)}.png`,
};

// ─── Level-dependent stats lookup ───────────────────────────────────────────

export function getMonsterStats(monsterId, level, elite = false) {
  const monster = MONSTERS.byId.get(Number(monsterId));
  if (!monster) return {};
  const levelStats = gameConfig.monsterStats?.[monster.title]?.levels?.[level];
  if (!levelStats) return {};
  return { maxHp: elite ? levelStats.elite : levelStats.normal };
}

export function getMercenaryStats(mercenaryId, level) {
  const stats = gameConfig.mercenaryStats?.[mercenaryId]?.[level];
  return stats || {};
}

export function getMonsterCount(monsterId) {
  const monster = MONSTERS.byId.get(Number(monsterId));
  if (!monster) return null;
  return gameConfig.monsterStats?.[monster.title]?.count ?? null;
}

export function generateStandeeNum(monsterId, existingMonsters) {
  const count = getMonsterCount(monsterId);
  if (!count) return null;
  const monster = MONSTERS.byId.get(Number(monsterId));
  if (!monster) return null;

  // Find all standee numbers already used for this monster type
  const usedNums = new Set();
  for (const m of existingMonsters) {
    if (Number(m.id) === Number(monsterId) && m.standeeNum != null) {
      usedNums.add(Number(m.standeeNum));
    }
  }

  // Find available numbers from 1 to count
  const available = [];
  for (let i = 1; i <= count; i++) {
    if (!usedNums.has(i)) available.push(i);
  }

  // Return random available number, or null if all are used
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function makeIndex(rows) {
  const byId = new Map(), byTitle = new Map();
  for (const r of rows) { byId.set(r.id, r); byTitle.set(r.title, r); }
  return { byId, byTitle };
}

// ─── Indices ─────────────────────────────────────────────────────────────────

export const TILES           = makeIndex(gameConfig.tiles);
export const OVERLAY_OBJECTS = makeIndex([...gameConfig.overlays, ...CLASS_OVERLAY_ROWS]);
export const MONSTERS        = makeIndex(gameConfig.monsters);
export const MERCENARIES     = makeIndex(MERCENARY_ROWS);
export const SUMMONS         = makeIndex(SUMMON_ROWS);
