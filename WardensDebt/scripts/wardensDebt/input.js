/**
 * wardensDebt/input.js
 *
 * Input pipeline: translate DOM events → action payloads.
 * Separates "what the user did" from "what the game should do".
 *
 * Each handler returns:
 * - { action: 'action-name', payload: {...} } to perform an action
 * - null if the input should be ignored
 *
 * Benefits:
 * - Input handling is testable (pure functions)
 * - Easy to add keyboard shortcuts, mobile buttons, AI moves
 * - Input and game logic are independent
 */

/**
 * Figure was clicked.
 * Returns action to select or move based on modifiers.
 */
export function onFigureClicked(figureId, kind) {
  if (!figureId || !kind) return null;
  return {
    action: 'select-figure',
    payload: { figureId, kind },
  };
}

/**
 * Figure was copied (via Alt+drag).
 * Returns copy action with new ID.
 */
export function onFigureCopied(figureId, copyId) {
  if (!figureId || !copyId) return null;
  return {
    action: 'copy-figure',
    payload: { figureId, copyId },
  };
}

/**
 * Figure was dropped at a new position.
 * Returns move action.
 */
export function onFigureMoved(figureId, cell) {
  if (!figureId || !cell) return null;
  return {
    action: 'move-figure',
    payload: { figureId, cell },
  };
}

/**
 * Figure was rotated (via R key).
 * Returns rotate action.
 */
export function onFigureRotated(figureId, angleStep) {
  if (!figureId || !Number.isInteger(angleStep)) return null;
  return {
    action: 'rotate-figure',
    payload: { figureId, angleStep },
  };
}

/**
 * Map tile was clicked.
 * Returns action to select.
 */
export function onMapTileClicked(tileId) {
  if (!tileId) return null;
  return {
    action: 'select-maptile',
    payload: { tileId },
  };
}

/**
 * Map tile was dragged to new position.
 * Returns move action.
 */
export function onMapTileMoved(tileId, x, y) {
  if (!tileId || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    action: 'move-maptile',
    payload: { tileId, x, y },
  };
}

/**
 * Map tile was rotated.
 * Returns rotate action.
 */
export function onMapTileRotated(tileId, angleStep) {
  if (!tileId || !Number.isInteger(angleStep)) return null;
  return {
    action: 'rotate-maptile',
    payload: { tileId, angleStep },
  };
}

/**
 * Board was panned (Space+drag).
 * Returns null since panning doesn't modify game state.
 */
export function onBoardPanned() {
  return null;
}

/**
 * Figure was deleted (Del key).
 * Returns delete action.
 */
export function onFigureDeleted(figureId) {
  if (!figureId) return null;
  return {
    action: 'delete-figure',
    payload: { figureId },
  };
}

/**
 * Map tile was deleted.
 * Returns delete action.
 */
export function onMapTileDeleted(tileId) {
  if (!tileId) return null;
  return {
    action: 'delete-maptile',
    payload: { tileId },
  };
}

/**
 * Figure stat was updated (from sidebar input).
 * Returns update action.
 */
export function onFigureStatChanged(convictIndex, field, value) {
  if (!Number.isInteger(convictIndex) || convictIndex < 0) return null;
  return {
    action: 'update-convict-stat',
    payload: { convictIndex, field, value },
  };
}

/**
 * Figure conditions were changed.
 * Returns update action.
 */
export function onFigureConditionsChanged(convictIndex, conditions) {
  if (!Number.isInteger(convictIndex) || convictIndex < 0 || !Array.isArray(conditions)) return null;
  return {
    action: 'update-convict-conditions',
    payload: { convictIndex, conditions },
  };
}
