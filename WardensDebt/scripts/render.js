import { hexCenter, buildGridPath, colLabel, COLS, ROWS, HEX_W, HEX_H } from './hex.js';
import { uiState, selectWardensDebtCell } from './uiState.js';
import { getWardensDebtRuntime } from './wardensDebt/runtime.js';
import { wardensDebtFigurePosition, WARDENS_DEBT_GRID_SIZE } from './wardensDebt/placement.js';
import { wardensDebtMapTileForId } from './wardensDebt/mapTiles.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let layerGrid, layerTiles, layerOverlays, layerFigures, layerSelection, svgDefs, layerGridLabels;

export function init(svgEl) {
  layerGrid      = svgEl.querySelector('#layer-grid');
  layerTiles     = svgEl.querySelector('#layer-tiles');
  layerOverlays  = svgEl.querySelector('#layer-overlays');
  layerFigures   = svgEl.querySelector('#layer-figures');
  layerSelection = svgEl.querySelector('#layer-selection');
  svgDefs = document.createElementNS(SVG_NS, 'defs');
  svgEl.prepend(svgDefs);
  if (layerGrid) layerGrid.style.display = 'none';
  drawGrid();
}

// ─── Grid ────────────────────────────────────────────────────────────────────

function gridLabel(text, cx, cy) {
  const fs = 14, px = 5, py = 3;
  const bw = Math.ceil(text.length * fs * 0.65 + px * 2);
  const bh = fs + py * 2;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', cx - bw / 2); rect.setAttribute('y', cy - bh / 2);
  rect.setAttribute('width', bw);      rect.setAttribute('height', bh);
  rect.setAttribute('rx', 4);
  rect.setAttribute('fill', 'rgba(255,255,255,0.10)');
  g.appendChild(rect);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', cx); t.setAttribute('y', cy);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('font-size', fs);
  t.setAttribute('font-family', 'sans-serif');
  t.setAttribute('font-weight', '700');
  t.setAttribute('fill', 'rgba(255,255,255,0.80)');
  t.setAttribute('pointer-events', 'none');
  t.setAttribute('user-select', 'none');
  t.textContent = text;
  g.appendChild(t);
  return g;
}

function drawGrid() {
  const bgPath = document.createElementNS(SVG_NS, 'path');
  bgPath.setAttribute('d', buildGridPath(-4, COLS + 6, -4, ROWS + 6));
  bgPath.setAttribute('class', 'hex-outline hex-outline--extended');
  layerGrid.appendChild(bgPath);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', buildGridPath());
  path.setAttribute('class', 'hex-outline');
  layerGrid.appendChild(path);

  layerGridLabels = document.createElementNS(SVG_NS, 'g');
  layerGridLabels.setAttribute('id', 'grid-labels');
  layerGrid.appendChild(layerGridLabels);

  for (let col = 1; col <= COLS; col++) {
    const { x, y } = hexCenter(col, 0);
    layerGridLabels.appendChild(gridLabel(colLabel(col), x, y - HEX_H / 2 - 10));
  }
  for (let row = 0; row <= ROWS; row++) {
    const { x, y } = hexCenter(1, row);
    layerGridLabels.appendChild(gridLabel(String(row), x - HEX_W / 2 - 14, y));
  }
}

export function setGridLabelsVisible(visible) {
  if (layerGridLabels) layerGridLabels.style.display = visible ? '' : 'none';
}

// ─── Layer helpers ────────────────────────────────────────────────────────────

function clearLayer(layer) {
  while (layer.lastChild) layer.removeChild(layer.lastChild);
}

function clearSelectionLayer() {
  if (layerSelection) clearLayer(layerSelection);
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderAll() {
  clearLayer(layerTiles);
  clearLayer(layerOverlays);
  clearLayer(layerFigures);
  renderWardensDebtMap();
  renderSelection();
}

export function renderSelection() {
  clearSelectionLayer();
}

// ─── WD rendering ─────────────────────────────────────────────────────────────

const WD_FIGURE_RADIUS = 32;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function figureInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2) || '?';
}

function wdBadge(parent, { x, y, w, h, text, color }) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  rect.setAttribute('rx', h / 2);
  rect.setAttribute('fill', color); rect.setAttribute('opacity', '0.90');
  rect.setAttribute('pointer-events', 'none');
  parent.appendChild(rect);
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', x + w / 2); t.setAttribute('y', y + h / 2);
  t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('font-size', '9'); t.setAttribute('font-family', 'sans-serif');
  t.setAttribute('fill', 'white'); t.setAttribute('font-weight', '600');
  t.setAttribute('pointer-events', 'none');
  t.textContent = text;
  parent.appendChild(t);
}

function appendSvgText(parent, { text, x, y, className, fill = 'rgba(255,255,255,0.88)', fontSize = 13 }) {
  const node = document.createElementNS(SVG_NS, 'text');
  node.setAttribute('x', x); node.setAttribute('y', y);
  node.setAttribute('text-anchor', 'middle');
  node.setAttribute('dominant-baseline', 'middle');
  node.setAttribute('font-family', 'sans-serif');
  node.setAttribute('font-size', fontSize);
  node.setAttribute('font-weight', '800');
  node.setAttribute('fill', fill);
  node.setAttribute('paint-order', 'stroke');
  node.setAttribute('stroke', 'rgba(0,0,0,0.72)');
  node.setAttribute('stroke-width', '3');
  node.setAttribute('class', className);
  node.textContent = text;
  parent.appendChild(node);
}

function renderWdFigureMarker(parent, { x, y, label, kind, locked = false, hp = 0, maxHp = 0, conditions = [] }) {
  const color = kind === 'enemy' ? '#e35f5f' : '#72ab84';
  const r = WD_FIGURE_RADIUS;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('opacity', locked ? '0.72' : '1');
  parent.appendChild(group);

  const halo = document.createElementNS(SVG_NS, 'circle');
  halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', r);
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', hexToRgba(color, 0.20));
  halo.setAttribute('stroke-width', '10');
  halo.setAttribute('pointer-events', 'none');
  group.appendChild(halo);

  const body = document.createElementNS(SVG_NS, 'circle');
  body.setAttribute('cx', x); body.setAttribute('cy', y); body.setAttribute('r', r);
  body.setAttribute('fill', 'rgba(10,10,30,0.84)');
  body.setAttribute('stroke', hexToRgba(color, 0.88));
  body.setAttribute('stroke-width', '3');
  body.setAttribute('pointer-events', 'all');
  group.appendChild(body);

  appendSvgText(group, { text: label, x, y: y + 1, className: 'wd-figure-label', fill: 'rgba(255,255,255,0.94)', fontSize: 14 });

  const badgeH = 13, badgeGap = 2, fs = 9;
  const hpBadges = [
    { text: `♡ ${maxHp}`, color: '#2e7d32' },
    { text: `♥ ${hp}`,    color: '#c0392b' },
  ].filter(b => { const n = parseInt(b.text.split(' ')[1]); return !isNaN(n) && n > 0; });
  const totalHpH = hpBadges.length * badgeH + Math.max(0, hpBadges.length - 1) * badgeGap;
  hpBadges.forEach(({ text: bt, color: bc }, i) => {
    const bw = Math.ceil(bt.length * fs * 0.62 + 8);
    wdBadge(group, { x: x - r - 3 - bw, y: y - totalHpH / 2 + i * (badgeH + badgeGap), w: bw, h: badgeH, text: bt, color: bc });
  });

  const COND_COLORS = { marked: '#7a4a9e', guarded: '#2e5f7d' };
  const COND_ABBR   = { marked: 'MK', guarded: 'GD' };
  const condBadges = conditions.slice(0, 5).map(cond => ({
    text: COND_ABBR[cond] || cond.slice(0, 2).toUpperCase(),
    color: COND_COLORS[cond] || '#4a4a6a',
  }));
  const totalCondH = condBadges.length * badgeH + Math.max(0, condBadges.length - 1) * badgeGap;
  condBadges.forEach(({ text: ct, color: cc }, i) => {
    const bw = Math.ceil(ct.length * fs * 0.62 + 8);
    wdBadge(group, { x: x + r + 3, y: y - totalCondH / 2 + i * (badgeH + badgeGap), w: bw, h: badgeH, text: ct, color: cc });
  });
}

function renderWardensDebtMap() {
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState || !runtime.index) return;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'wd-map');

  const boardTiles = runtime.gameState.board?.mapTiles || [];
  const resolvedTiles = boardTiles.map((boardTile, idx) => {
    const base = wardensDebtMapTileForId(boardTile.id);
    if (!base) return null;
    return { ...base, ...boardTile, idx };
  }).filter(Boolean);

  resolvedTiles.forEach(tile => {
    const tileH = tile.width * tile.naturalHeight / tile.naturalWidth;
    const cx = tile.x + tile.width / 2;
    const cy = tile.y + tileH / 2;
    const cellSize = (tile.width / tile.naturalWidth) * WARDENS_DEBT_GRID_SIZE;

    const tileMarker = document.createElementNS(SVG_NS, 'g');
    tileMarker.setAttribute('class', 'wd-maptile');
    tileMarker.dataset.wdKind = 'maptile';
    tileMarker.dataset.wdId = tile.id;
    tileMarker.dataset.wdIdx = String(tile.idx);
    tileMarker.setAttribute('transform', `rotate(${Number(tile.angle) || 0} ${cx} ${cy})`);

    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('href', tile.image);
    image.setAttribute('x', tile.x);
    image.setAttribute('y', tile.y);
    image.setAttribute('width', tile.width);
    image.setAttribute('height', tileH);
    image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    image.setAttribute('pointer-events', 'none');
    tileMarker.appendChild(image);

    const cols = Math.ceil(tile.width / cellSize);
    const rows = Math.ceil(tileH / cellSize);
    const segs = [];
    for (let c = 0; c <= cols; c++) {
      const lx = tile.x + c * cellSize;
      segs.push(`M${lx},${tile.y}V${tile.y + tileH}`);
    }
    for (let r = 0; r <= rows; r++) {
      const ly = tile.y + r * cellSize;
      segs.push(`M${tile.x},${ly}H${tile.x + tile.width}`);
    }
    const gridPath = document.createElementNS(SVG_NS, 'path');
    gridPath.setAttribute('d', segs.join(''));
    gridPath.setAttribute('fill', 'none');
    gridPath.setAttribute('stroke', 'none');
    gridPath.setAttribute('stroke-width', '0.5');
    gridPath.setAttribute('pointer-events', 'none');
    tileMarker.appendChild(gridPath);

    const tileOutline = document.createElementNS(SVG_NS, 'rect');
    tileOutline.setAttribute('x', tile.x);
    tileOutline.setAttribute('y', tile.y);
    tileOutline.setAttribute('width', tile.width);
    tileOutline.setAttribute('height', tileH);
    tileOutline.setAttribute('fill', 'none');
    tileOutline.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    tileOutline.setAttribute('stroke-width', '2');
    tileOutline.setAttribute('pointer-events', 'none');
    tileMarker.appendChild(tileOutline);

    const tileHandle = document.createElementNS(SVG_NS, 'circle');
    tileHandle.setAttribute('class', 'wd-maptile-handle');
    tileHandle.setAttribute('cx', tile.x + 16);
    tileHandle.setAttribute('cy', tile.y + 16);
    tileHandle.setAttribute('r', 10);
    tileHandle.setAttribute('fill', 'rgba(0,0,0,0.4)');
    tileHandle.setAttribute('stroke', 'rgba(255,255,255,0.35)');
    tileHandle.setAttribute('stroke-width', '2');
    tileHandle.setAttribute('pointer-events', 'all');
    tileHandle.style.cursor = tile.locked ? 'pointer' : 'grab';
    tileMarker.appendChild(tileHandle);

    group.appendChild(tileMarker);
  });

  const figures = [
    ...(runtime.gameState.convicts || []).map((convict) => {
      const def = runtime.index?.convictDefsById?.get(convict.convictDefId);
      return {
        id: convict.id,
        label: figureInitials(def?.name || convict.convictDefId),
        kind: 'convict',
        hp: Number(convict.currentHealth) || 0,
        maxHp: Number(convict.maxHealth) || 0,
        conditions: Array.isArray(convict.conditions) ? convict.conditions : [],
      };
    }),
    ...(runtime.gameState.enemies || []).map((enemy, index) => {
      const card = runtime.index?.enemyDefsById?.get(enemy.enemyDefId);
      return {
        id: enemy.id,
        label: figureInitials(card?.name || enemy.enemyDefId) + (index + 1),
        kind: 'enemy',
        hp: Number(enemy.currentHealth) || 0,
        maxHp: Number(enemy.maxHealth) || 0,
        conditions: Array.isArray(enemy.conditions) ? enemy.conditions : [],
      };
    }),
  ];

  figures.forEach(figure => {
    const position = wardensDebtFigurePosition(runtime, figure.id);
    if (!position) return;
    const figureIsSelected = uiState.selected?.kind === (figure.kind === 'convict' ? 'wd-convict' : 'wd-enemy')
      && uiState.selected?.idx === (figure.kind === 'convict'
        ? (runtime.gameState.convicts || []).findIndex(c => c.id === figure.id)
        : (runtime.gameState.enemies || []).findIndex(e => e.id === figure.id));
    const marker = document.createElementNS(SVG_NS, 'g');
    marker.setAttribute('class', `wd-figure${figureIsSelected ? ' is-selected' : ''}`);
    marker.style.cursor = 'grab';
    marker.dataset.wdKind = figure.kind;
    marker.dataset.wdId = figure.id;
    marker.dataset.wdIdx = figure.kind === 'convict'
      ? String((runtime.gameState.convicts || []).findIndex(c => c.id === figure.id))
      : String((runtime.gameState.enemies || []).findIndex(e => e.id === figure.id));
    renderWdFigureMarker(marker, {
      x: position.x, y: position.y,
      label: figure.label,
      kind: figure.kind === 'convict' ? 'convict' : 'enemy',
      locked: Boolean(position.locked),
      hp: figure.hp, maxHp: figure.maxHp,
      conditions: figure.conditions,
    });
    group.appendChild(marker);
  });

  if (group.hasChildNodes()) {
    layerTiles.appendChild(group);
  }
}
