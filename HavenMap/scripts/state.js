// State management and URL hash serialisation.
// mapVersion history:
//   null / '1.0.0' — original FrosthavenMap1 (titles, separate arrays)
//   '2.0.0'        — FrosthavenMap2 pre-consolidation (9 kinds, numeric ids)
//   '3.0.0'        — 4 kinds: tiles/mercenaries/monsters/overlays (consolidated)
//   '4.0.0'        — current: new local image assets, simplified overlay IDs

import { TILES, OVERLAY_OBJECTS, MONSTERS, MERCENARIES } from './data.js';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from './lzString.js';

// ─── Base64 (matches the original Base64.js encoder exactly) ────────────────

const B64_KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function b64encode(input) {
  let utf = '';
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 128) {
      utf += String.fromCharCode(c);
    } else if (c < 2048) {
      utf += String.fromCharCode((c >> 6) | 192, (c & 63) | 128);
    } else {
      utf += String.fromCharCode((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
  }
  let out = '', i = 0;
  while (i < utf.length) {
    const c1 = utf.charCodeAt(i++);
    const c2 = utf.charCodeAt(i++);
    const c3 = utf.charCodeAt(i++);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = isNaN(c3) ? 64 : (c3 & 63);
    out += B64_KEY[e1] + B64_KEY[e2] + B64_KEY[e3] + B64_KEY[e4];
  }
  return out;
}

function b64decode(input) {
  input = input.replace(/[^A-Za-z0-9+/=]/g, '');
  let out = '', i = 0;
  while (i < input.length) {
    const e1 = B64_KEY.indexOf(input[i++]);
    const e2 = B64_KEY.indexOf(input[i++]);
    const e3 = B64_KEY.indexOf(input[i++]);
    const e4 = B64_KEY.indexOf(input[i++]);
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    out += String.fromCharCode(c1);
    if (e3 !== 64) out += String.fromCharCode(c2);
    if (e4 !== 64) out += String.fromCharCode(c3);
  }
  let str = '', j = 0;
  const bytes = out;
  while (j < bytes.length) {
    const c = bytes.charCodeAt(j);
    if (c < 128) { str += String.fromCharCode(c); j++; }
    else if (c > 191 && c < 224) {
      str += String.fromCharCode(((c & 31) << 6) | (bytes.charCodeAt(j+1) & 63));
      j += 2;
    } else {
      str += String.fromCharCode(((c & 15) << 12) | ((bytes.charCodeAt(j+1) & 63) << 6) | (bytes.charCodeAt(j+2) & 63));
      j += 3;
    }
  }
  return str;
}

// ─── Default / empty state ───────────────────────────────────────────────────

function emptyState() {
  return {
    mapVersion:      '4.0.0',
    mapGame:         'FrostHaven',
    CurrentLevel:    0,
    tiles:           [],
    mercenaries:     [],
    summons:         [],
    monsters:        [],
    overlays:        [],
    questObjectives: {},
    elements:        [0, 0, 0, 0, 0, 0], // fire ice air earth light dark — 0=inert 1=waning 2=strong
    showGridLabels:  false,
    showObjectLabels: true,
  };
}

// ─── Migration ───────────────────────────────────────────────────────────────

function findIdByTitle(index, title) {
  return index.byTitle.get(title)?.id ?? 0;
}

function migrateV1Titles(raw) {
  // Convert string titles to numeric ids using byFileTitle (prefixed) or byTitle
  const conv = (arr, index) => arr && arr.forEach(e => {
    if (!e.id) e.id = findIdByTitle(index, e.title);
  });

  // Tiles and mercenaries use clean titles
  conv(raw.tiles,   TILES);
  conv(raw.heroes,  MERCENARIES);

  // V1 overlay title lookup not supported; entries without ids are dropped in V3 migration

  // Monsters: title without suffix
  if (raw.monsters) raw.monsters.forEach(m => {
    if (!m.id) {
      const base = (m.title || '').replace(' elite','').replace(' normal','');
      const suf  = (m.title || '').replace(base, '');
      m.id = findIdByTitle(MONSTERS, base) + suf;
    }
  });
  if (raw.lieutenants) raw.lieutenants.forEach(b => {
    if (!b.id) b.id = findIdByTitle(MONSTERS, b.title) - 100; // original boss id
  });
}

function migrateToV3(raw) {
  const overlays = [];

  const pushOverlay = (id, obj, role, extra = {}) => {
    overlays.push({
      id, x: Number(obj.x), y: Number(obj.y),
      angle: Number(obj.angle) || 0, locked: !!obj.locked,
      role, ...extra,
    });
  };

  (raw.overlaytiles || []).forEach(o => {
    if (!o?.id) return;
    const id = Number(o.id);
    const entry = OVERLAY_OBJECTS.byId.get(id);
    pushOverlay(id, o, entry?.defaultRole || 'obstacle');
  });

  (raw.doors || []).forEach(d => {
    if (!d?.id) return;
    pushOverlay(100 + Number(d.id), d, 'door', { opened: !!d.opened });
  });

  (raw.maptokens || []).forEach(t => {
    if (!t?.id) return;
    const id = 200 + Number(t.id);
    const entry = OVERLAY_OBJECTS.byId.get(id);
    pushOverlay(id, t, entry?.defaultRole || 'obstacle');
  });

  (raw.familiars || []).forEach(f => {
    if (!f?.id) return;
    const id = 300 + Number(f.id);
    const entry = OVERLAY_OBJECTS.byId.get(id);
    pushOverlay(id, f, entry?.defaultRole || 'obstacle');
  });

  (raw.villagers || []).forEach(v => {
    if (!v?.id) return;
    pushOverlay(400 + Number(v.id), v, 'obstacle');
  });

  const monsters = [];

  (raw.monsters || []).forEach(m => {
    if (!m?.id) return;
    const idStr  = String(m.id);
    const isElite = idStr.includes(' elite');
    const baseId  = parseInt(idStr);
    if (!baseId) return;
    monsters.push({
      id: baseId, x: Number(m.x), y: Number(m.y),
      angle: Number(m.angle) || 0, locked: !!m.locked,
      role: isElite ? 'elite' : 'normal',
    });
  });

  (raw.lieutenants || []).forEach(b => {
    if (!b?.id) return;
    monsters.push({
      id: 100 + Number(b.id), x: Number(b.x), y: Number(b.y),
      angle: Number(b.angle) || 0, locked: !!b.locked,
      role: 'boss',
    });
  });

  return {
    mapVersion:      '3.0.0',
    mapGame:         raw.mapGame || 'FrostHaven',
    CurrentLevel:    raw.CurrentLevel || 0,
    tiles:           raw.tiles || [],
    mercenaries:     (raw.heroes || []).filter(h => h?.id),
    monsters,
    overlays,
    questObjectives: raw.questObjectives || {},
  };
}

// V3 overlay id → V4 overlay id  (undefined = no equivalent, drop the entry)
const V3_TO_V4_OVERLAY = {
   1:19,  2:38,  3: 1,  4:26,  5: 2,  6:27,  7:21,  8: 4,  9:29,
  10:17, 11: 3, 12:28, 13: 5, 14:41, 15:35, 16:12, 17:36, 18:13,
  19:10, 20:34, 21: 9,        23:31, 24:32, 25: 7, 26:33, 27: 8,
  28: 5, 29: 6, 30:30, 31:43,
  101:51, 102:52, 103:53, 104:54,
  201:14, 202:15, 203:16, 204:17, 205:18, 206:19, 207:37, 208:38,
  209:39, 210:40, 211:20, 212:11, 213:35, 214:21, 215:22, 216:23,
  217:24, 218:25, 219:32, 220:33, 221:12, 222:36, 223:13, 224:41,
  225:42,
  308:18, 309:19, 310:37, 311:38, 312:39, 313:20, 314:11,
  315:35, 316:21, 317:10, 318:22, 320:14,
};

function migrateToV4(raw) {
  raw.overlays = (raw.overlays || []).reduce((acc, o) => {
    const newId = V3_TO_V4_OVERLAY[Number(o.id)];
    if (newId != null) acc.push({ ...o, id: newId });
    return acc;
  }, []);
  raw.mapVersion = '4.0.0';
  return raw;
}

function migrate(raw) {
  if (raw.mapVersion == null || raw.mapVersion === '1.0.0') {
    raw.heroes = [1,2,3,4].map(i => raw['hero' + i] || {id:0});
    [1,2,3,4].forEach(i => delete raw['hero' + i]);
    if (raw.mapVersion == null && raw.monsters) {
      raw.monsters.forEach(m => {
        if (m.master === true)  m.title = (m.title || '') + ' elite';
        else                    m.title = (m.title || '') + ' normal';
      });
    }
    if (raw.mapVersion == null && raw.doors) {
      raw.doors.forEach(d => { d.direction = d.vertical ? 'V' : 'H'; });
    }
    migrateV1Titles(raw);
  }

  if (!Array.isArray(raw.overlays)) {
    raw = migrateToV3(raw);
  }

  if (raw.mapVersion === '3.0.0') {
    raw = migrateToV4(raw);
  }

  return raw;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const state = emptyState();

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

const HISTORY_LIMIT = 100;
const undoHashes = [];
const redoHashes = [];

function stateHash() {
  return '#' + b64encode(JSON.stringify(state));
}

export function compressedStateHash() {
  return '#lz:' + compressToEncodedURIComponent(JSON.stringify(state));
}

export function compressedStateUrl() {
  return location.origin + location.pathname + location.search + compressedStateHash();
}

function setUrlHash(hash) {
  const url = hash && hash !== '#' ? hash : (location.pathname + location.search);
  history.replaceState(null, '', url);
}

function pushUndo(hash) {
  if (undoHashes[undoHashes.length - 1] !== hash) undoHashes.push(hash);
  if (undoHashes.length > HISTORY_LIMIT) undoHashes.shift();
}

function clearRedo() {
  redoHashes.length = 0;
}

function applyHash(hash) {
  const normalized = hash && hash !== '#' ? hash : '';
  if (!normalized) {
    Object.assign(state, emptyState());
  } else {
    try {
      const rawJson  = normalized.startsWith('#lz:')
        ? decompressFromEncodedURIComponent(normalized.slice(4))
        : b64decode(normalized);
      const raw      = JSON.parse(rawJson);
      const migrated = migrate(raw);
      Object.assign(state, emptyState(), migrated);
    } catch (e) {
      console.warn('Could not parse URL hash, starting empty.', e);
      Object.assign(state, emptyState());
    }
  }
  setUrlHash(normalized);
}

export function patch(partial) {
  const beforeHash = stateHash();
  Object.assign(state, partial);
  const afterHash = stateHash();
  if (afterHash === beforeHash) return;
  pushUndo(beforeHash);
  clearRedo();
  setUrlHash(afterHash);
  notify();
}

export function load() {
  undoHashes.length = 0;
  clearRedo();
  applyHash(location.hash);
  notify();
}

export function undo() {
  if (undoHashes.length === 0) return false;
  const currentHash = stateHash();
  const nextHash = undoHashes.pop();
  redoHashes.push(currentHash);
  applyHash(nextHash);
  notify();
  return true;
}

export function redo() {
  if (redoHashes.length === 0) return false;
  const currentHash = stateHash();
  const nextHash = redoHashes.pop();
  pushUndo(currentHash);
  applyHash(nextHash);
  notify();
  return true;
}

export function canUndo() {
  return undoHashes.length > 0;
}

export function canRedo() {
  return redoHashes.length > 0;
}

export function save() {
  setUrlHash(stateHash());
}
