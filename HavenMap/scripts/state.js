import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from './lzString.js';

function emptyState() {
  return { showGridLabels: false };
}

export const state = emptyState();

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

const HISTORY_LIMIT = 100;
const undoHashes = [];
const redoHashes = [];

function stateJson() {
  return JSON.stringify(state);
}

export function compressedStateHash() {
  return '#lz:' + compressToEncodedURIComponent(stateJson());
}

export function compressedStateUrl() {
  return location.origin + location.pathname + location.search + compressedStateHash();
}

function setUrlHash(hash) {
  const url = new URL(location.href);
  url.hash = (hash && hash !== '#') ? hash : '';
  history.replaceState(null, '', url.toString());
}

function pushUndo(json) {
  if (undoHashes[undoHashes.length - 1] !== json) undoHashes.push(json);
  if (undoHashes.length > HISTORY_LIMIT) undoHashes.shift();
}

function clearRedo() {
  redoHashes.length = 0;
}

function applyHash(hash) {
  const normalized = hash && hash !== '#' ? hash : '';
  Object.assign(state, emptyState());
  if (normalized.startsWith('#lz:')) {
    try {
      const raw = JSON.parse(decompressFromEncodedURIComponent(normalized.slice(4)));
      if (raw && typeof raw.showGridLabels === 'boolean') state.showGridLabels = raw.showGridLabels;
    } catch { /* start empty */ }
  }
  setUrlHash(normalized);
}

export function patch(partial) {
  const before = stateJson();
  Object.assign(state, partial);
  const after = stateJson();
  if (after === before) return;
  pushUndo(before);
  clearRedo();
  setUrlHash('#lz:' + compressToEncodedURIComponent(after));
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
  const current = stateJson();
  const prev = undoHashes.pop();
  redoHashes.push(current);
  Object.assign(state, emptyState(), JSON.parse(prev));
  setUrlHash('#lz:' + compressToEncodedURIComponent(prev));
  notify();
  return true;
}

export function redo() {
  if (redoHashes.length === 0) return false;
  const current = stateJson();
  const next = redoHashes.pop();
  pushUndo(current);
  Object.assign(state, emptyState(), JSON.parse(next));
  setUrlHash('#lz:' + compressToEncodedURIComponent(next));
  notify();
  return true;
}

export function canUndo() { return undoHashes.length > 0; }
export function canRedo() { return redoHashes.length > 0; }
