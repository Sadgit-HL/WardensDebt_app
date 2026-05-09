/**
 * wardensDebt/actions.js
 *
 * Pure action handlers for game state mutations.
 * Each action is: (gameState, payload) => nextGameState
 *
 * No side effects, no validation, no history management.
 * The runtime layer handles validation and history capture.
 */

import { snapWardensDebtBoardPoint } from './placement.js';
import { PHASE_CONFIG } from './schema.js';

export const ACTIONS = {
  // ─── Figure Movement ────────────────────────────────────────────────────────

  'move-figure': (gameState, { figureId, cell }) => {
    if (!figureId || !cell) return gameState;
    const current = gameState.board?.figurePositions?.[figureId] || {};
    const snapped = snapWardensDebtBoardPoint(cell);
    return {
      ...gameState,
      board: {
        ...gameState.board,
        figurePositions: {
          ...(gameState.board?.figurePositions || {}),
          [figureId]: { ...current, ...snapped },
        },
      },
    };
  },

  'rotate-figure': (gameState, { figureId, angleStep }) => {
    if (!figureId) return gameState;
    const current = gameState.board?.figurePositions?.[figureId] || {};
    if (current.locked) return gameState;
    const newAngle = ((Number(current.angle) || 0) + angleStep) % 360;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        figurePositions: {
          ...(gameState.board?.figurePositions || {}),
          [figureId]: { ...current, angle: newAngle },
        },
      },
    };
  },

  'copy-figure': (gameState, { figureId, copyId }) => {
    const nextState = structuredClone(gameState);
    const pos = nextState.board?.figurePositions?.[figureId];
    if (!pos) return gameState;

    const convict = (nextState.convicts || []).find(c => c.id === figureId);
    if (convict) {
      nextState.convicts = [...nextState.convicts, { ...convict, id: copyId }];
      nextState.board.figurePositions = { ...(nextState.board.figurePositions || {}), [copyId]: { ...pos } };
      return nextState;
    }

    const enemy = (nextState.enemies || []).find(e => e.id === figureId);
    if (enemy) {
      nextState.enemies = [...nextState.enemies, { ...enemy, id: copyId }];
      nextState.zones = { ...nextState.zones, board: [...(nextState.zones.board || []), copyId] };
      nextState.board.figurePositions = { ...(nextState.board.figurePositions || {}), [copyId]: { ...pos } };
      return nextState;
    }

    return gameState;
  },

  // ─── Map Tile Movement ──────────────────────────────────────────────────────

  'move-maptile': (gameState, { tileId, x, y }) => {
    if (!tileId) return gameState;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        mapTiles: (gameState.board?.mapTiles || []).map(tile =>
          tile.id === tileId ? { ...tile, x: Math.round(x), y: Math.round(y) } : tile
        ),
      },
    };
  },

  'rotate-maptile': (gameState, { tileId, angleStep }) => {
    if (!tileId) return gameState;
    const tile = (gameState.board?.mapTiles || []).find(t => t.id === tileId);
    if (tile?.locked) return gameState;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        mapTiles: (gameState.board?.mapTiles || []).map(t =>
          t.id === tileId ? { ...t, angle: ((Number(t.angle) || 0) + angleStep) % 360 } : t
        ),
      },
    };
  },

  // ─── Map Tile Management ────────────────────────────────────────────────────

  'add-maptile': (gameState, { tileId, x, y }) => {
    if (!tileId) return gameState;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        mapTileIds: [...(gameState.board?.mapTileIds || []), tileId],
        mapTiles: [
          ...(gameState.board?.mapTiles || []),
          { id: tileId, x, y, angle: 0, locked: false },
        ],
        figurePositions: gameState.board?.figurePositions || {},
      },
    };
  },

  'delete-maptile': (gameState, { tileId }) => {
    if (!tileId) return gameState;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        mapTiles: (gameState.board?.mapTiles || []).filter(tile => tile.id !== tileId),
        mapTileIds: (gameState.board?.mapTileIds || []).filter(id => id !== tileId),
      },
    };
  },

  'update-maptile': (gameState, { tileId, updates }) => {
    if (!tileId || !updates) return gameState;
    return {
      ...gameState,
      board: {
        ...gameState.board,
        mapTiles: (gameState.board?.mapTiles || []).map(tile =>
          tile.id === tileId ? { ...tile, ...updates } : tile
        ),
      },
    };
  },

  // ─── Figure Management ──────────────────────────────────────────────────────

  'add-convict': (gameState, { convictId, convict, position }) => {
    if (!convictId || !convict) return gameState;
    return {
      ...gameState,
      convicts: [...(gameState.convicts || []), { ...convict, id: convictId }],
      board: {
        ...gameState.board,
        figurePositions: {
          ...(gameState.board?.figurePositions || {}),
          ...(position && { [convictId]: position }),
        },
      },
    };
  },

  'add-enemy': (gameState, { enemyId, enemy, position }) => {
    if (!enemyId || !enemy) return gameState;
    const nextState = {
      ...gameState,
      enemies: [...(gameState.enemies || []), { ...enemy, instanceId: enemyId }],
      zones: {
        ...gameState.zones,
        board: [...(gameState.zones?.board || []), enemyId],
      },
      board: {
        ...gameState.board,
        figurePositions: {
          ...(gameState.board?.figurePositions || {}),
          ...(position && { [enemyId]: position }),
        },
      },
    };
    return nextState;
  },

  'delete-figure': (gameState, { figureId }) => {
    if (!figureId) return gameState;
    const nextState = {
      ...gameState,
      convicts: (gameState.convicts || []).filter(c => c.id !== figureId),
      enemies: (gameState.enemies || []).filter(e => e.id !== figureId),
      zones: {
        ...gameState.zones,
        board: (gameState.zones?.board || []).filter(id => id !== figureId),
      },
    };
    if (nextState.board?.figurePositions) {
      const { [figureId]: _removed, ...rest } = nextState.board.figurePositions;
      nextState.board.figurePositions = rest;
    }
    return nextState;
  },

  // ─── Global Counters ────────────────────────────────────────────────────────

  'adjust-counter': (gameState, { counter, delta }) => {
    if (counter !== 'doom' && counter !== 'debt') return gameState;
    const current = gameState.counters?.[counter] ?? 0;
    const next = Math.max(0, current + delta);
    return { ...gameState, counters: { ...gameState.counters, [counter]: next } };
  },

  // ─── Figure Stats ───────────────────────────────────────────────────────────

  'update-convict-stat': (gameState, { convictIndex, field, value }) => {
    if (!Number.isInteger(convictIndex) || convictIndex < 0) return gameState;
    const convict = (gameState.convicts || [])[convictIndex];
    if (!convict) return gameState;
    const numValue = Math.max(0, Number(value) || 0);
    const nextConvicts = [...gameState.convicts];
    nextConvicts[convictIndex] = {
      ...convict,
      [field === 'hp' ? 'health' : 'maxHealth']: numValue,
    };
    return { ...gameState, convicts: nextConvicts };
  },

  'update-enemy-stat': (gameState, { enemyIndex, field, value }) => {
    if (!Number.isInteger(enemyIndex) || enemyIndex < 0) return gameState;
    const enemy = (gameState.enemies || [])[enemyIndex];
    if (!enemy) return gameState;
    const numValue = Math.max(0, Number(value) || 0);
    const nextEnemies = [...gameState.enemies];
    nextEnemies[enemyIndex] = {
      ...enemy,
      [field === 'hp' ? 'currentHealth' : 'maxHealth']: numValue,
    };
    return { ...gameState, enemies: nextEnemies };
  },

  'update-convict-conditions': (gameState, { convictIndex, conditions }) => {
    if (!Number.isInteger(convictIndex) || convictIndex < 0) return gameState;
    const convict = (gameState.convicts || [])[convictIndex];
    if (!convict) return gameState;
    const nextConvicts = [...gameState.convicts];
    nextConvicts[convictIndex] = { ...convict, conditions };
    return { ...gameState, convicts: nextConvicts };
  },

  'update-enemy-conditions': (gameState, { enemyIndex, conditions }) => {
    if (!Number.isInteger(enemyIndex) || enemyIndex < 0) return gameState;
    const enemy = (gameState.enemies || [])[enemyIndex];
    if (!enemy) return gameState;
    const nextEnemies = [...gameState.enemies];
    nextEnemies[enemyIndex] = { ...enemy, conditions };
    return { ...gameState, enemies: nextEnemies };
  },

  // ─── Phase Completion ────────────────────────────────────────────────────────

  'complete-phase': (gameState, { convictIndex }) => {
    if (!Number.isInteger(convictIndex) || convictIndex < 0) return gameState;
    const phaseComplete = [...gameState.turn.phaseComplete];
    phaseComplete[convictIndex] = true;
    return {
      ...gameState,
      turn: { ...gameState.turn, phaseComplete },
    };
  },

  'complete-subphase': (gameState, { convictIndex }) => {
    if (!Number.isInteger(convictIndex) || convictIndex < 0) return gameState;
    const convictSubphases = [...gameState.turn.convictSubphases];
    const phaseComplete = [...gameState.turn.phaseComplete];
    const currentSubphase = convictSubphases[convictIndex];

    if (!currentSubphase) return gameState;

    const phase = gameState.turn.phase;
    const phaseConfig = PHASE_CONFIG[phase];

    if (!phaseConfig?.subphases) return gameState;

    const currentIdx = phaseConfig.subphases.indexOf(currentSubphase);
    if (currentIdx === -1) return gameState;

    const isLastSubphase = currentIdx === phaseConfig.subphases.length - 1;
    if (isLastSubphase) {
      convictSubphases[convictIndex] = null;
      phaseComplete[convictIndex] = true;
    } else {
      convictSubphases[convictIndex] = phaseConfig.subphases[currentIdx + 1];
    }

    return {
      ...gameState,
      turn: { ...gameState.turn, convictSubphases, phaseComplete },
    };
  },

  'complete-phase-all': (gameState) => {
    const phaseComplete = gameState.turn.phaseComplete.map(() => true);
    return {
      ...gameState,
      turn: { ...gameState.turn, phaseComplete },
    };
  },
};

/**
 * Apply an action to game state.
 * Returns the new state, or the original state if action not found.
 */
export function applyAction(gameState, actionName, payload) {
  const handler = ACTIONS[actionName];
  if (!handler) {
    console.warn(`Unknown action: ${actionName}`);
    return gameState;
  }
  return handler(gameState, payload) || gameState;
}
