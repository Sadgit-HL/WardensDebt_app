import { pixelToHex, hexCenter, HEX_W, HEX_H } from './hex.js';
import { uiState, selectObject, setMobileMoveMode, selectWardensDebtCell, selectWardensDebtEmptyCell, selectWardensDebtMapTile } from './uiState.js';
import { panBy, setZoomAroundClient, getZoom } from './controls.js';
import { getWardensDebtRuntime, updateWardensDebtGameStateViaAction } from './wardensDebt/runtime.js';
import { snapWardensDebtBoardPoint } from './wardensDebt/placement.js';
import { ROTATION_STEP } from './rotation.js';
import * as inputHandlers from './wardensDebt/input.js';

const SVG_NS         = 'http://www.w3.org/2000/svg';
const DRAG_THRESHOLD = 4;

let svgEl      = null;
let boardGroup = null;
let dragLayer  = null;

/**
 * Apply an input action to the game.
 * Handles validation and execution.
 */
function applyInputAction(action) {
  if (!action || !action.action) return false;
  try {
    updateWardensDebtGameStateViaAction(action.action, action.payload);
    return true;
  } catch (e) {
    console.warn(`Input action failed: ${action.action}`, e);
    return false;
  }
}

let mouseStart  = null;
let hasDragged  = false;
let dragging    = null;
let isCopying   = false;
let pointerInBoard = false;
let spaceHeld = false;
let panning = null;
let touchPan = null;
let pinch = null;
let touchStart = null;

export function initDrag(svg) {
  svgEl      = svg;
  boardGroup = svg.querySelector('#board-group');
  dragLayer  = svg.querySelector('#layer-drag');

  svg.addEventListener('mousedown', onMousedown);
  svg.addEventListener('mouseenter', () => { pointerInBoard = true; updatePanCursor(); });
  svg.addEventListener('mouseleave', () => { pointerInBoard = false; updatePanCursor(); });
  window.addEventListener('mousemove', onMousemove);
  window.addEventListener('mouseup',   onMouseup);
  svg.addEventListener('touchstart', onTouchstart, { passive: false });
  svg.addEventListener('touchmove', onTouchmove, { passive: false });
  svg.addEventListener('touchend', onTouchend, { passive: false });
  svg.addEventListener('touchcancel', onTouchend, { passive: false });
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('keyup', onKeyup);
}

function isMobileTouchLayout() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function isWardensDebtFigureSelection(sel = uiState.selected) {
  return sel?.kind === 'wd-convict' || sel?.kind === 'wd-enemy';
}

function wardensDebtFigureFromElement(el, runtime) {
  const node = el instanceof Element ? el.closest('.wd-figure') : null;
  if (!node) return null;
  const figureId = node.dataset.wdId;
  if (!figureId) return null;

  const rt = runtime || getWardensDebtRuntime();
  if (!rt?.gameState) return null;

  const convictIdx = rt.gameState.convicts?.findIndex(c => c.id === figureId);
  if (convictIdx !== undefined && convictIdx >= 0) {
    return { kind: 'wd-convict', idx: convictIdx, id: figureId };
  }

  const enemyIdx = rt.gameState.enemies?.findIndex(e => e.id === figureId);
  if (enemyIdx !== undefined && enemyIdx >= 0) {
    return { kind: 'wd-enemy', idx: enemyIdx, id: figureId };
  }

  return null;
}

function wardensDebtMapTileFromElement(el, runtime) {
  const handle = el instanceof Element ? el.closest('.wd-maptile-handle') : null;
  const node = handle?.closest('.wd-maptile') || null;
  if (!node) return null;
  const tileId = node.dataset.wdId;
  if (!tileId) return null;

  const rt = runtime || getWardensDebtRuntime();
  if (!rt?.gameState) return null;

  const tileIdx = rt.gameState.board?.mapTiles?.findIndex(t => t.id === tileId);
  if (tileIdx !== undefined && tileIdx >= 0) {
    return { kind: 'wd-maptile', idx: tileIdx, id: tileId };
  }

  return null;
}

function wdFigureIdForSelection(runtime, sel) {
  if (!isWardensDebtFigureSelection(sel)) return null;
  return sel.kind === 'wd-convict'
    ? (runtime.gameState?.convicts || [])[sel.idx]?.id
    : (runtime.gameState?.enemies || [])[sel.idx]?.id;
}

function setWardensDebtFigurePosition(figureId, cell) {
  if (!figureId || !cell) return false;
  const action = inputHandlers.onFigureMoved(figureId, cell);
  return action ? applyInputAction(action) : false;
}

function createWdFigureCopy(wdFigure) {
  const runtime = getWardensDebtRuntime();
  if (!runtime.gameState) return null;

  let newId = null;
  if (wdFigure.kind === 'wd-convict') {
    newId = `convict-${runtime.gameState.convicts.length + 1}`;
  } else {
    newId = `enemy-${runtime.gameState.enemies.length + 1}`;
  }

  const action = inputHandlers.onFigureCopied(wdFigure.id, newId);
  return action && applyInputAction(action) ? newId : null;
}

function setWardensDebtMapTilePosition(tileId, x, y) {
  if (!tileId) return false;
  const action = inputHandlers.onMapTileMoved(tileId, x, y);
  return action ? applyInputAction(action) : false;
}

function commitWardensDebtFigureMove(sel, x, y) {
  if (!isWardensDebtFigureSelection(sel)) return false;
  const wdRuntime = getWardensDebtRuntime();
  const id = wdFigureIdForSelection(wdRuntime, sel);
  if (!id) return false;
  const snapped = snapWardensDebtBoardPoint({ x, y });
  if (!snapped) return false;
  setWardensDebtFigurePosition(id, snapped);
  selectWardensDebtCell(snapped.x, snapped.y);
  return true;
}

// ─── Coordinate conversion ────────────────────────────────────────────────────

function toBoard(clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(boardGroup.getScreenCTM().inverse());
}

// ─── Cursor ───────────────────────────────────────────────────────────────────

function updatePanCursor() {
  if (panning) document.body.style.cursor = 'grabbing';
  else if (spaceHeld && pointerInBoard) document.body.style.cursor = 'grab';
  else document.body.style.cursor = '';
}

function rotateSelectedClockwise() {
  const sel = uiState.selected;

  if (sel?.kind === 'wd-convict' || sel?.kind === 'wd-enemy') {
    const runtime = getWardensDebtRuntime();
    if (runtime.status !== 'ready' || !runtime.gameState) return false;
    const isConvict = sel.kind === 'wd-convict';
    const actor = isConvict
      ? (runtime.gameState.convicts || [])[sel.idx]
      : (runtime.gameState.enemies || [])[sel.idx];
    if (!actor) return false;
    const figureId = isConvict ? actor.id : actor.id;
    const action = inputHandlers.onFigureRotated(figureId, ROTATION_STEP);
    return action ? applyInputAction(action) : false;
  }

  if (uiState.selectedWdMapTile?.id) {
    const tileId = uiState.selectedWdMapTile.id;
    const action = inputHandlers.onMapTileRotated(tileId, ROTATION_STEP);
    return action ? applyInputAction(action) : false;
  }

  return false;
}

function onKeydown(e) {
  const target = e.target;
  const isTypingField = target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  if (isTypingField) return;
  if (e.code === 'Space' && pointerInBoard) {
    spaceHeld = true;
    updatePanCursor();
    e.preventDefault();
    return;
  }
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !pointerInBoard) return;
  if (e.key.toLowerCase() !== 'r') return;
  if (rotateSelectedClockwise()) e.preventDefault();
}

function onKeyup(e) {
  if (e.code === 'Space') { spaceHeld = false; updatePanCursor(); }
}

// ─── Mouse handlers ───────────────────────────────────────────────────────────

function onMousedown(e) {
  if (e.button !== 0) return;
  const wdRuntime = getWardensDebtRuntime();
  const wdFigure = wardensDebtFigureFromElement(e.target, wdRuntime);
  const wdTile = wardensDebtMapTileFromElement(e.target, wdRuntime);

  if (wdTile) {
    const currentTile = wdRuntime.gameState?.board?.mapTiles?.find(tile => tile.id === wdTile.id) || null;
    if (spaceHeld) {
      panning = { clientX: e.clientX, clientY: e.clientY };
      updatePanCursor();
      e.preventDefault();
      return;
    }
    const boardPoint = toBoard(e.clientX, e.clientY);
    mouseStart = {
      clientX: e.clientX, clientY: e.clientY,
      wdMapTile: wdTile,
      wdTileOffsetX: currentTile ? boardPoint.x - currentTile.x : 0,
      wdTileOffsetY: currentTile ? boardPoint.y - currentTile.y : 0,
    };
    hasDragged = false;
    if (currentTile?.locked) {
      selectWardensDebtMapTile(wdTile.id);
      mouseStart = null;
    }
    e.preventDefault();
    return;
  }

  if (wdFigure) {
    const position = wdRuntime.gameState?.board?.figurePositions?.[wdFigure.id] || null;
    const boardPoint = toBoard(e.clientX, e.clientY);
    mouseStart = {
      clientX: e.clientX, clientY: e.clientY,
      wdFigure, wdOriginalPos: position ? { x: position.x, y: position.y } : null,
      x: boardPoint.x, y: boardPoint.y,
      wdDrop: null, alt: e.altKey,
    };
    hasDragged = false;
    if (position?.locked) {
      const convicts = wdRuntime.gameState?.convicts || [];
      const enemies = wdRuntime.gameState?.enemies || [];
      const actorIndex = wdFigure.kind === 'wd-convict'
        ? convicts.findIndex(c => c.id === wdFigure.id)
        : enemies.findIndex(e => e.id === wdFigure.id);
      if (actorIndex >= 0) selectObject(wdFigure.kind, actorIndex, Math.round(position.x) || 0, Math.round(position.y) || 0);
      mouseStart = null;
    }
    e.preventDefault();
    return;
  }

  if (uiState.mobileMoveMode && uiState.selected) {
    const { x, y } = toBoard(e.clientX, e.clientY);
    if (isWardensDebtFigureSelection() && commitWardensDebtFigureMove(uiState.selected, x, y)) return;
    return;
  }

  if (spaceHeld) {
    panning = { clientX: e.clientX, clientY: e.clientY };
    updatePanCursor();
    e.preventDefault();
    return;
  }

  const { x, y } = toBoard(e.clientX, e.clientY);
  mouseStart = { clientX: e.clientX, clientY: e.clientY, x, y };
  hasDragged = false;
}

function onMousemove(e) {
  if (panning) {
    e.preventDefault();
    const dx = e.clientX - panning.clientX;
    const dy = e.clientY - panning.clientY;
    panning = { clientX: e.clientX, clientY: e.clientY };
    panBy(dx, dy);
    return;
  }

  if (!mouseStart) return;

  if (!hasDragged) {
    const dx = e.clientX - mouseStart.clientX;
    const dy = e.clientY - mouseStart.clientY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;

    if (mouseStart.wdMapTile?.kind === 'wd-maptile') {
      hasDragged = true;
      dragging = mouseStart.wdMapTile;
      document.body.style.cursor = 'grabbing';
      return;
    }
    if (mouseStart.wdFigure) {
      hasDragged = true;
      isCopying = mouseStart.alt;
      if (isCopying) {
        const newId = createWdFigureCopy(mouseStart.wdFigure);
        dragging = newId ? { ...mouseStart.wdFigure, id: newId } : mouseStart.wdFigure;
      } else {
        dragging = mouseStart.wdFigure;
      }
      document.body.style.cursor = isCopying ? 'copy' : 'grabbing';
      return;
    }
    mouseStart = null;
    return;
  }

  const { x, y } = toBoard(e.clientX, e.clientY);
  if (mouseStart.wdMapTile?.kind === 'wd-maptile') {
    setWardensDebtMapTilePosition(mouseStart.wdMapTile.id, x - mouseStart.wdTileOffsetX, y - mouseStart.wdTileOffsetY);
    return;
  }
  if (mouseStart.wdFigure) {
    const snapped = snapWardensDebtBoardPoint({ x, y });
    if (snapped) { mouseStart.wdDrop = snapped; setWardensDebtFigurePosition(dragging.id, snapped); }
  }
}

function onMouseup(e) {
  if (panning) {
    e.preventDefault();
    panning = null;
    updatePanCursor();
    return;
  }
  if (!mouseStart) return;

  if (hasDragged && dragging) {
    updatePanCursor();
    const { x, y } = toBoard(e.clientX, e.clientY);

    if (dragging.kind === 'wd-maptile') {
      const sel = dragging;
      const nextX = x - (mouseStart.wdTileOffsetX || 0);
      const nextY = y - (mouseStart.wdTileOffsetY || 0);
      dragging = null; mouseStart = null; hasDragged = false;
      setWardensDebtMapTilePosition(sel.id, nextX, nextY);
      selectWardensDebtMapTile(sel.id);
      return;
    }

    if (dragging.kind === 'wd-convict' || dragging.kind === 'wd-enemy') {
      const figureId = dragging.id;
      dragging = null; mouseStart = null; hasDragged = false; isCopying = false;
      const pos = getWardensDebtRuntime().gameState?.board?.figurePositions?.[figureId];
      if (pos) selectWardensDebtCell(pos.x, pos.y);
      return;
    }

    dragging = null; mouseStart = null; hasDragged = false; isCopying = false;
  } else {
    const { x, y, wdMapTile, wdFigure } = mouseStart;
    mouseStart = null; hasDragged = false; isCopying = false;

    if (wdMapTile?.kind === 'wd-maptile') {
      selectWardensDebtMapTile(wdMapTile.id);
      return;
    }

    if (wdFigure) {
      const wdRuntime = getWardensDebtRuntime();
      const convicts = wdRuntime.gameState?.convicts || [];
      const enemies = wdRuntime.gameState?.enemies || [];
      const isConvict = wdFigure.kind === 'wd-convict';
      const actorIndex = isConvict
        ? convicts.findIndex(c => c.id === wdFigure.id)
        : enemies.findIndex(e => e.id === wdFigure.id);
      if (actorIndex >= 0) {
        selectObject(wdFigure.kind, actorIndex, 0, 0);
        if (!isConvict) {
          const pos = wdRuntime.gameState?.board?.figurePositions?.[wdFigure.id];
          if (pos) selectWardensDebtCell(pos.x, pos.y);
        }
      }
      return;
    }

    if (uiState.mobileMoveMode && uiState.selected) {
      if (isWardensDebtFigureSelection()) commitWardensDebtFigureMove(uiState.selected, x, y);
      return;
    }

    const snapped = snapWardensDebtBoardPoint({ x, y });
    if (snapped) selectWardensDebtEmptyCell(snapped.x, snapped.y);
  }
}

// ─── Touch handlers ───────────────────────────────────────────────────────────

function touchDistance(t0, t1) {
  return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
}

function onTouchstart(e) {
  if (!isMobileTouchLayout()) return;
  if (e.target.closest('#mobile-shell, #sidebar-panel, #settings-panel')) return;
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchPan = { clientX: t.clientX, clientY: t.clientY };
    touchStart = { clientX: t.clientX, clientY: t.clientY, moved: false };
    pinch = null;
  } else if (e.touches.length === 2) {
    touchPan = null; touchStart = null;
    pinch = { distance: touchDistance(e.touches[0], e.touches[1]), zoom: getZoom() };
    e.preventDefault();
  }
}

function onTouchmove(e) {
  if (!isMobileTouchLayout()) return;
  if (e.touches.length === 1 && touchPan) {
    const t = e.touches[0];
    const dx = t.clientX - touchPan.clientX;
    const dy = t.clientY - touchPan.clientY;
    if (touchStart && !touchStart.moved) {
      const totalDx = t.clientX - touchStart.clientX;
      const totalDy = t.clientY - touchStart.clientY;
      touchStart.moved = totalDx * totalDx + totalDy * totalDy >= DRAG_THRESHOLD * DRAG_THRESHOLD;
    }
    touchPan = { clientX: t.clientX, clientY: t.clientY };
    if (touchStart?.moved) { panBy(dx, dy); e.preventDefault(); }
  } else if (e.touches.length === 2 && pinch) {
    const nextDistance = touchDistance(e.touches[0], e.touches[1]);
    if (pinch.distance > 0) {
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setZoomAroundClient(pinch.zoom * (nextDistance / pinch.distance), midX, midY);
    }
    e.preventDefault();
  }
}

function onTouchend(e) {
  if (!isMobileTouchLayout()) return;
  if (e.touches.length === 0) {
    if (touchStart?.moved) e.preventDefault();
    touchPan = null; touchStart = null; pinch = null;
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    touchPan = { clientX: t.clientX, clientY: t.clientY };
    touchStart = { clientX: t.clientX, clientY: t.clientY, moved: false };
    pinch = null;
  }
}
