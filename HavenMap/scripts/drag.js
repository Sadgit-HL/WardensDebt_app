import { pixelToHex, hexCenter, footprintHexes, HEX_W, HEX_H, COLS, ROWS } from './hex.js';
import { state, patch } from './state.js';
import { uiState, selectHex, selectObject, showStack, showStackWithSelection, setMobileMoveMode } from './uiState.js';
import { TILES, OVERLAY_OBJECTS, MONSTERS, MERCENARIES, SUMMONS, generateStandeeNum } from './data.js';
import { panBy, setZoomAroundClient, getZoom } from './controls.js';

const SVG_NS         = 'http://www.w3.org/2000/svg';
const DRAG_THRESHOLD = 4;

// Lower number = higher priority for auto-selection
const KIND_PRIORITY = { mercenary: 0, monster: 0, overlay: 1, tile: 2 };
function sortByPriority(objects) {
  return [...objects].sort((a, b) => (KIND_PRIORITY[a.kind] ?? 99) - (KIND_PRIORITY[b.kind] ?? 99));
}

let svgEl      = null;
let boardGroup = null;
let dragLayer  = null;

let mouseStart  = null;
let hasDragged  = false;
let dragging    = null;
let isCopying   = false;
let highlightEl = null;
let pointerInBoard = false;
let spaceHeld = false;
let panning = null;
let touchPan = null;
let pinch = null;
let touchStart = null;

// Maps kind → state array key.
const STATE_KEY = {
  tile:      'tiles',
  mercenary: 'mercenaries',
  summon:    'summons',
  monster:   'monsters',
  overlay:   'overlays',
};

const DATA_TABLE = {
  tile:      TILES,
  mercenary: MERCENARIES,
  summon:    SUMMONS,
  monster:   MONSTERS,
  overlay:   OVERLAY_OBJECTS,
};

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

function moveSelectedTo(col, row) {
  const sel = uiState.selected;
  if (!sel) return false;
  const arr = arrForKind(sel.kind);
  const obj = arr[sel.idx];
  if (!obj || obj.locked) return false;
  const nextCol = Math.max(1, Math.min(COLS, col));
  const nextRow = Math.max(0, Math.min(ROWS, row));
  patch({ [STATE_KEY[sel.kind]]: arr.map((item, i) => i === sel.idx ? { ...item, x: nextCol, y: nextRow } : item) });
  setMobileMoveMode(false);
  selectObject(sel.kind, sel.idx, nextCol, nextRow);
  return true;
}

// ─── Coordinate conversion ────────────────────────────────────────────────────

function toBoard(clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(boardGroup.getScreenCTM().inverse());
}

// ─── Hex highlight ────────────────────────────────────────────────────────────

function hexPath(col, row) {
  const { x: cx, y: cy } = hexCenter(col, row);
  const r = HEX_W / 2, h = HEX_H / 2;
  return `M${cx+r},${cy}L${cx+r/2},${cy+h}L${cx-r/2},${cy+h}` +
         `L${cx-r},${cy}L${cx-r/2},${cy-h}L${cx+r/2},${cy-h}Z`;
}

function showHighlight(col, row) {
  if (!highlightEl) {
    highlightEl = document.createElementNS(SVG_NS, 'path');
    highlightEl.setAttribute('class', 'drag-highlight');
    dragLayer.appendChild(highlightEl);
  }
  highlightEl.setAttribute('d', hexPath(col, row));
}

function removeHighlight() {
  if (highlightEl) { highlightEl.remove(); highlightEl = null; }
}

// ─── Object detection ─────────────────────────────────────────────────────────

function arrForKind(kind) { return state[STATE_KEY[kind]] || []; }

function findAllObjects(col, row) {
  const hits = [];
  for (const kind of Object.keys(STATE_KEY)) {
    arrForKind(kind).forEach((obj, i) => {
      if (!obj?.id) return;
      const data  = DATA_TABLE[kind]?.byId.get(Number(obj.id));
      const hexes = footprintHexes(Number(obj.x), Number(obj.y), data?.hexes, Number(obj.angle) || 0);
      if (hexes.some(h => h.col === col && h.row === row))
        hits.push({ kind, idx: i });
    });
  }
  return hits;
}

function isDraggable(token) {
  if (!token) return false;
  return !arrForKind(token.kind)[token.idx]?.locked;
}

function updatePanCursor() {
  if (panning) {
    document.body.style.cursor = 'grabbing';
  } else if (spaceHeld && pointerInBoard) {
    document.body.style.cursor = 'grab';
  } else {
    document.body.style.cursor = '';
  }
}

function rotateSelectedClockwise() {
  const sel = uiState.selected;
  if (!sel) return false;
  const arr = arrForKind(sel.kind);
  const obj = arr[sel.idx];
  if (!obj || obj.locked) return false;
  patch({
    [STATE_KEY[sel.kind]]: arr.map((item, i) =>
      i === sel.idx ? { ...item, angle: ((Number(item.angle) || 0) + 60) % 360 } : item
    ),
  });
  return true;
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
  if (e.code === 'Space') {
    spaceHeld = false;
    updatePanCursor();
  }
}

// ─── Mouse handlers ───────────────────────────────────────────────────────────

function onMousedown(e) {
  if (e.button !== 0) return;
  if (uiState.mobileMoveMode && uiState.selected) {
    const { x, y } = toBoard(e.clientX, e.clientY);
    const { col, row } = pixelToHex(x, y);
    if (moveSelectedTo(col, row)) e.preventDefault();
    return;
  }
  if (spaceHeld) {
    panning = { clientX: e.clientX, clientY: e.clientY };
    updatePanCursor();
    e.preventDefault();
    return;
  }
  const { x, y } = toBoard(e.clientX, e.clientY);
  const { col, row } = pixelToHex(x, y);
  const allObjects = findAllObjects(col, row);

  // Prefer the currently selected object; otherwise grab the highest-priority object.
  const sel       = uiState.selected;
  const preferred = sel && allObjects.find(o => o.kind === sel.kind && o.idx === sel.idx);
  const token     = preferred ?? (allObjects.length > 0 ? sortByPriority(allObjects)[0] : null);

  mouseStart = { clientX: e.clientX, clientY: e.clientY, col, row, token, allObjects, alt: e.altKey };
  hasDragged = false;
  if (isDraggable(token)) e.preventDefault();
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
    if (!isDraggable(mouseStart.token)) { mouseStart = null; return; }
    hasDragged = true;
    dragging  = mouseStart.token;
    isCopying = mouseStart.alt;
    document.body.style.cursor = isCopying ? 'copy' : 'grabbing';
  }

  const { x, y } = toBoard(e.clientX, e.clientY);
  const { col, row } = pixelToHex(x, y);
  showHighlight(col, row);
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
    // ── Drag: commit object move ──────────────────────────────────────────────
    updatePanCursor();
    const { x, y } = toBoard(e.clientX, e.clientY);
    const snapped = pixelToHex(x, y);
    const col = Math.max(1, Math.min(COLS, snapped.col));
    const row = Math.max(0, Math.min(ROWS, snapped.row));
    const { kind, idx } = dragging;
    dragging   = null;
    mouseStart = null;
    hasDragged = false;
    removeHighlight();

    const arr = arrForKind(kind);
    if (arr[idx]) {
      if (isCopying) {
        let copied = { ...arr[idx], x: col, y: row };
        if (kind === 'monster') {
          // Exclude old standeeNum and generate a new unique one
          const { standeeNum: _old, ...withoutStandee } = arr[idx];
          copied = { ...withoutStandee, x: col, y: row, standeeNum: generateStandeeNum(arr[idx].id, arr) };
        }
        patch({ [STATE_KEY[kind]]: [...arr, copied] });
      } else {
        patch({ [STATE_KEY[kind]]: arr.map((o, i) => i === idx ? { ...o, x: col, y: row } : o) });
      }
    }
    isCopying = false;

  } else {
    // ── Click: select object(s) or hex ────────────────────────────────────────
    const { col, row, allObjects } = mouseStart;
    mouseStart = null;
    hasDragged = false;
    isCopying  = false;

    if (uiState.mobileMoveMode && uiState.selected) {
      moveSelectedTo(col, row);
      return;
    }

    if (allObjects.length === 0) {
      selectHex(col, row);
    } else if (allObjects.length === 1) {
      selectObject(allObjects[0].kind, allObjects[0].idx, col, row);
    } else {
      const sorted  = sortByPriority(allObjects);
      const sel     = uiState.selected;
      const sameHex = uiState.selectedHex?.col === col && uiState.selectedHex?.row === row;
      const curIdx  = sameHex
        ? sorted.findIndex(o => o.kind === sel?.kind && o.idx === sel?.idx)
        : -1;
      const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % sorted.length;
      const next    = sorted[nextIdx];
      showStackWithSelection(sorted, col, row, next.kind, next.idx);
    }
  }
}

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
    touchPan = null;
    touchStart = null;
    pinch = {
      distance: touchDistance(e.touches[0], e.touches[1]),
      zoom: getZoom(),
    };
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
    if (touchStart?.moved) {
      panBy(dx, dy);
      e.preventDefault();
    }
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
    touchPan = null;
    touchStart = null;
    pinch = null;
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    touchPan = { clientX: t.clientX, clientY: t.clientY };
    touchStart = { clientX: t.clientX, clientY: t.clientY, moved: false };
    pinch = null;
  }
}
