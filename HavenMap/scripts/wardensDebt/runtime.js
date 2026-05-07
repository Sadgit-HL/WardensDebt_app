import { loadWardensDebtContent } from './content.js';
import {
  createWardensDebtGameState,
  validateWardensDebtGameState,
} from './schema.js';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from '../lzString.js';

const runtimeState = {
  status: 'idle',
  content: null,
  index: null,
  gameState: null,
  scenarioId: null,
  scenarioName: '',
  error: '',
};

const listeners = [];
let loadPromise = null;

// ─── WD undo / redo ───────────────────────────────────────────────────────────

const WD_HISTORY_LIMIT = 100;
const wdUndoHashes = [];
const wdRedoHashes = [];
let wdHistoryFrozen = false;
let wdPendingUndoEntry = null;

function wdEncode(gameState) {
  return gameState ? compressToEncodedURIComponent(JSON.stringify(gameState)) : null;
}

function wdDecode(encoded) {
  return JSON.parse(decompressFromEncodedURIComponent(encoded));
}

function saveWdToUrl() {
  const encoded = wdEncode(runtimeState.gameState);
  const url = new URL(location.href);
  if (encoded) url.searchParams.set('wd', encoded);
  else url.searchParams.delete('wd');
  history.replaceState(null, '', url.toString());
}

function pushWdUndo(encoded) {
  if (!encoded || wdUndoHashes[wdUndoHashes.length - 1] === encoded) return;
  wdUndoHashes.push(encoded);
  if (wdUndoHashes.length > WD_HISTORY_LIMIT) wdUndoHashes.shift();
}

function clearWdRedo() { wdRedoHashes.length = 0; }

function loadWdStateFromUrl() {
  const encoded = new URLSearchParams(location.search).get('wd');
  if (!encoded || !runtimeState.index) return;
  try {
    const saved = wdDecode(encoded);
    const v = validateWardensDebtGameState(saved, runtimeState.index);
    if (v.ok) runtimeState.gameState = saved;
  } catch (e) {
    console.warn('Could not restore WD state from URL:', e);
  }
}

export function captureWdHistory() {
  wdPendingUndoEntry = wdEncode(runtimeState.gameState);
}

export function freezeWdHistory() { wdHistoryFrozen = true; }

export function commitWdHistory() {
  if (wdPendingUndoEntry) {
    pushWdUndo(wdPendingUndoEntry);
    clearWdRedo();
    wdPendingUndoEntry = null;
  }
  wdHistoryFrozen = false;
}

export function wdUndo() {
  if (wdUndoHashes.length === 0 || runtimeState.status !== 'ready') return false;
  const current = wdEncode(runtimeState.gameState);
  const prev = wdUndoHashes.pop();
  wdRedoHashes.push(current);
  try {
    runtimeState.gameState = wdDecode(prev);
    saveWdToUrl();
    notifyWardensDebtRuntime();
    return true;
  } catch (e) {
    console.warn('WD undo failed:', e);
    wdUndoHashes.push(prev);
    wdRedoHashes.pop();
    return false;
  }
}

export function wdRedo() {
  if (wdRedoHashes.length === 0 || runtimeState.status !== 'ready') return false;
  const current = wdEncode(runtimeState.gameState);
  const next = wdRedoHashes.pop();
  wdUndoHashes.push(current);
  try {
    runtimeState.gameState = wdDecode(next);
    saveWdToUrl();
    notifyWardensDebtRuntime();
    return true;
  } catch (e) {
    console.warn('WD redo failed:', e);
    wdRedoHashes.push(next);
    wdUndoHashes.pop();
    return false;
  }
}

export function canWdUndo() { return wdUndoHashes.length > 0; }
export function canWdRedo() { return wdRedoHashes.length > 0; }

function notifyWardensDebtRuntime() {
  listeners.forEach(listener => listener(runtimeState));
}

function cloneRuntimeState() {
  return {
    ...runtimeState,
    gameState: runtimeState.gameState ? structuredClone(runtimeState.gameState) : null,
  };
}

function ensureRuntimeReady() {
  if (runtimeState.status !== 'ready' || !runtimeState.gameState || !runtimeState.index) {
    throw new Error('Wardens Debt runtime is not ready.');
  }
}

function validateAndCommitGameState(nextGameState) {
  ensureRuntimeReady();
  const validation = validateWardensDebtGameState(nextGameState, runtimeState.index);
  if (!validation.ok) {
    throw new Error(`Wardens Debt game state validation failed:\n${validation.issues.join('\n')}`);
  }
  if (!wdHistoryFrozen && runtimeState.gameState) {
    pushWdUndo(wdEncode(runtimeState.gameState));
    clearWdRedo();
  }
  runtimeState.gameState = nextGameState;
  saveWdToUrl();
  notifyWardensDebtRuntime();
  return cloneRuntimeState();
}

export function subscribeWardensDebtRuntime(listener) {
  listeners.push(listener);
}

export function getWardensDebtRuntime() {
  return cloneRuntimeState();
}

export async function initWardensDebtRuntime({ scenarioId = null } = {}) {
  if (runtimeState.status === 'ready' && runtimeState.gameState) {
    return cloneRuntimeState();
  }
  if (loadPromise) {
    return loadPromise;
  }

  runtimeState.status = 'loading';
  runtimeState.error = '';
  notifyWardensDebtRuntime();

  loadPromise = (async () => {
    try {
      const { content, index } = await loadWardensDebtContent();
      const scenario = scenarioId
        ? content.scenarios.find(entry => entry.id === scenarioId)
        : content.scenarios[0];

      if (!scenario) {
        throw new Error(scenarioId
          ? `Wardens Debt scenario "${scenarioId}" was not found.`
          : 'No Wardens Debt scenario found in content.');
      }

      runtimeState.content = content;
      runtimeState.index = index;
      runtimeState.scenarioId = scenario.id;
      runtimeState.scenarioName = scenario.name;
      runtimeState.gameState = createWardensDebtGameState(content, scenario.id);
      runtimeState.status = 'ready';
      runtimeState.error = '';
      loadWdStateFromUrl();
      notifyWardensDebtRuntime();
      return cloneRuntimeState();
    } catch (error) {
      runtimeState.status = 'error';
      runtimeState.error = error instanceof Error ? error.message : String(error);
      runtimeState.content = null;
      runtimeState.index = null;
      runtimeState.gameState = null;
      runtimeState.scenarioId = null;
      runtimeState.scenarioName = '';
      notifyWardensDebtRuntime();
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function reloadWardensDebtRuntime() {
  runtimeState.status = 'idle';
  return initWardensDebtRuntime();
}

export function setWardensDebtGameState(nextGameState) {
  return validateAndCommitGameState(nextGameState);
}

export function updateWardensDebtGameState(updater) {
  ensureRuntimeReady();
  const draft = structuredClone(runtimeState.gameState);
  const nextGameState = updater(draft) ?? draft;
  return validateAndCommitGameState(nextGameState);
}

export function updateWardensDebtConvict(convictIndex, updater) {
  return updateWardensDebtGameState(gameState => {
    const convict = gameState.convicts[convictIndex];
    if (!convict) {
      throw new Error(`Wardens Debt convict index ${convictIndex} is out of range.`);
    }
    gameState.convicts[convictIndex] = updater({ ...convict }) ?? convict;
    return gameState;
  });
}

export function updateWardensDebtEnemy(enemyIndex, updater) {
  return updateWardensDebtGameState(gameState => {
    const enemy = gameState.enemies[enemyIndex];
    if (!enemy) {
      throw new Error(`Wardens Debt enemy index ${enemyIndex} is out of range.`);
    }
    gameState.enemies[enemyIndex] = updater({ ...enemy }) ?? enemy;
    return gameState;
  });
}
