// SVG rendering engine — reads from state, redraws all layers.

import { hexCenter, imagePos, buildGridPath, colLabel, footprintHexes, COLS, ROWS, HEX_W, HEX_H } from './hex.js';
import { assetPath, TILES, OVERLAY_OBJECTS, MONSTERS, MERCENARIES, SUMMONS } from './data.js';
import { state } from './state.js';
import { uiState, selectWardensDebtCell, selectFromStack } from './uiState.js';
import { displayCurrentHp, displayMaxHp } from './hp.js';
import { getWardensDebtRuntime } from './wardensDebt/runtime.js';
import { wardensDebtFigurePosition, WARDENS_DEBT_GRID_SIZE } from './wardensDebt/placement.js';
import { wardensDebtMapTileForId } from './wardensDebt/mapTiles.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let layerGrid, layerTiles, layerOverlays, layerFigures, layerSelection, svgDefs, layerGridLabels;

export function init(svgEl) {
  layerGrid     = svgEl.querySelector('#layer-grid');
  layerTiles    = svgEl.querySelector('#layer-tiles');
  layerOverlays = svgEl.querySelector('#layer-overlays');
  layerFigures  = svgEl.querySelector('#layer-figures');
  layerSelection = svgEl.querySelector('#layer-selection');
  svgDefs = document.createElementNS(SVG_NS, 'defs');
  svgEl.prepend(svgDefs);
  drawGrid();
}

// ─── Ring colours ────────────────────────────────────────────────────────────

const ROLE_RING = {
  corridor:         { type:'single', color:'#888888' },
  wall:             { type:'single', color:'#444444' },
  ice:              { type:'single', color:'#aaddff' },
  difficult:        { type:'single', color:'#9944cc' },
  hazardous:        { type:'single', color:'#ff8800' },
  door:             { type:'single', color:'#4488ff' },
  trap:             { type:'single', color:'#ff2222' },
  'pressure-plate': { type:'single', color:'#888888' },
  obstacle:         { type:'single', color:'#44aa44' },
  objective:        { type:'single', color:'#ffcc00' },
  'class-overlay':  { type:'single', color:'#5c3317' },
  normal:           { type:'double', inner:'#cc0000', outer:'#ffffff' },
  elite:            { type:'double', inner:'#cc0000', outer:'#ffcc00' },
  boss:             { type:'double', inner:'#cc0000', outer:'#111111' },
  // loot, shadow, element, scenario-aid: no ring
};

// Roles that render on the overlay layer (floor level); rest go to figures layer.
const FLOOR_ROLES = new Set(['corridor','wall','ice','difficult','hazardous','door']);

// ─── Grid ────────────────────────────────────────────────────────────────────

function gridLabel(text, cx, cy) {
  const fs   = 14;
  const px   = 5;
  const py   = 3;
  const bw   = Math.ceil(text.length * fs * 0.65 + px * 2);
  const bh   = fs + py * 2;
  const rx   = 4;
  const bg   = 'rgba(255,255,255,0.10)';
  const fill = 'rgba(255,255,255,0.80)';
  const fw   = '700';

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', cx - bw / 2); rect.setAttribute('y', cy - bh / 2);
  rect.setAttribute('width', bw);      rect.setAttribute('height', bh);
  rect.setAttribute('rx', rx);
  rect.setAttribute('fill', bg);
  g.appendChild(rect);

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', cx);             t.setAttribute('y', cy);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('font-size', fs);
  t.setAttribute('font-family', 'sans-serif');
  t.setAttribute('font-weight', fw);
  t.setAttribute('fill', fill);
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

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function svgImage(href, col, row, leftOff, topOff, angle = 0, w = null, h = null) {
  const pos  = imagePos(col, row, leftOff, topOff);
  const cent = hexCenter(col, row);
  const img  = document.createElementNS(SVG_NS, 'image');
  img.setAttribute('href', href);
  img.setAttribute('x', pos.x);
  img.setAttribute('y', pos.y);
  if (angle !== 0)
    img.setAttribute('transform', `rotate(${angle} ${cent.x} ${cent.y})`);
  if (w !== null && h !== null) {
    img.setAttribute('width', w);
    img.setAttribute('height', h);
  } else {
    const preload = new Image();
    preload.onload  = function () { img.setAttribute('width', this.naturalWidth); img.setAttribute('height', this.naturalHeight); };
    preload.onerror = function () { console.warn('Image not found:', href); };
    preload.src = href;
  }
  return img;
}

function svgLabel(text, col, row) {
  const { x: cx, y: cy } = hexCenter(col, row);
  const fs = 9, px = 4, py = 3;
  const bw = Math.ceil(text.length * fs * 0.6 + px * 2);
  const bh = fs + py * 2;
  const bx = cx - bw / 2;
  const by = cy + HEX_H / 2 - bh * 0.75;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', bx);  rect.setAttribute('y', by);
  rect.setAttribute('width', bw);  rect.setAttribute('height', bh);
  rect.setAttribute('rx', 2);
  rect.setAttribute('fill', '#000');
  rect.setAttribute('stroke', 'rgba(255,255,255,0.4)');
  rect.setAttribute('stroke-width', '1');

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', cx);  t.setAttribute('y', by + bh / 2);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('font-size', fs);
  t.setAttribute('font-family', 'monospace');
  t.setAttribute('fill', 'white');
  t.setAttribute('pointer-events', 'none');
  t.textContent = text;

  g.appendChild(rect);
  g.appendChild(t);
  return g;
}

function svgStatsLabel(hp, xp, gold, col, row, maxHp = null, standeeNum = null) {
  const { x: cx, y: cy } = hexCenter(col, row);

  const badges = [
    { symbol: '#', value: standeeNum, color: '#3d3d5c' },
    { symbol: '♡', value: maxHp, color: '#2e7d32' },
    { symbol: '♥', value: hp,    color: '#c0392b' },
    { symbol: '★', value: xp,    color: '#4a55b0' },
    { symbol: '●', value: gold,  color: '#c07d00' },
  ].filter(b => b.value !== null && b.value !== undefined && b.value !== 0);

  if (badges.length === 0) return document.createElementNS(SVG_NS, 'g');

  const fs = 10, badgeH = 15, gap = 2;
  const totalH = badges.length * badgeH + (badges.length - 1) * gap;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');

  badges.forEach(({ symbol, value, color }, i) => {
    const label = `${symbol} ${value}`;
    const bw    = Math.ceil(label.length * fs * 0.62 + 6);
    const bx    = cx - HEX_W * 0.22 - bw;
    const by    = cy - totalH / 2 + i * (badgeH + gap);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', bx);      rect.setAttribute('y', by);
    rect.setAttribute('width', bw);  rect.setAttribute('height', badgeH);
    rect.setAttribute('rx', badgeH / 2);
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', '0.88');
    g.appendChild(rect);

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', bx + bw / 2);
    t.setAttribute('y', by + badgeH / 2);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', fs);
    t.setAttribute('font-family', 'sans-serif');
    t.setAttribute('fill', 'white');
    t.setAttribute('font-weight', '600');
    t.setAttribute('pointer-events', 'none');
    t.textContent = label;
    g.appendChild(t);
  });

  return g;
}

function svgConditions(conditions, col, row) {
  if (!conditions || conditions.length === 0) return null;
  const { x: cx, y: cy } = hexCenter(col, row);
  const size = 24, gap = -10;
  const totalH = conditions.length * size + (conditions.length - 1) * gap;
  const topY   = cy - totalH / 2;

  // Right border of a flat-top hex slopes inward: at vertical offset dy from center,
  // the boundary x = cx + HEX_W/2 - (HEX_W/4 / (HEX_H/2)) * |dy|
  const slope = (HEX_W / 4) / (HEX_H / 2);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');

  conditions.forEach((cond, i) => {
    const iconY      = topY + i * (size + gap);
    const iconCenterY = iconY + size / 2;
    const dy         = Math.abs(iconCenterY - cy);
    const borderX    = cx + HEX_W / 2 - slope * dy;
    const iconX      = borderX - size * 0.9;

    const img = document.createElementNS(SVG_NS, 'image');
    img.setAttribute('href', `images/common/conditions/${cond.toLowerCase().replace(/ /g, '_')}.png`);
    img.setAttribute('x', iconX);
    img.setAttribute('y', iconY);
    img.setAttribute('width', size);
    img.setAttribute('height', size);
    g.appendChild(img);
  });

  return g;
}

function clearLayer(layer) {
  while (layer.lastChild) layer.removeChild(layer.lastChild);
}

function clearSelectionLayer() {
  if (layerSelection) clearLayer(layerSelection);
}

const SELECTION_COLOR = '#8ad8ff';
const SELECTION_OUTER = 'rgba(138, 216, 255, 0.16)';
const SELECTION_INNER = 'rgba(138, 216, 255, 0.72)';

function selectionPath(hexList) {
  if (!hexList || hexList.length === 0) return '';
  if (hexList.length === 1) {
    const { col, row } = hexList[0];
    return hexRingPath(col, row, 0.985);
  }
  return mergedFootprintPath(hexList);
}

function drawSelection(layer, d, outerWidth = 10, innerWidth = 3.25) {
  if (!d) return;
  const halo = document.createElementNS(SVG_NS, 'path');
  halo.setAttribute('d', d);
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', SELECTION_OUTER);
  halo.setAttribute('stroke-width', String(outerWidth));
  halo.setAttribute('stroke-linejoin', 'round');
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('pointer-events', 'none');
  layer.appendChild(halo);

  const ring = document.createElementNS(SVG_NS, 'path');
  ring.setAttribute('d', d);
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', SELECTION_INNER);
  ring.setAttribute('stroke-width', String(innerWidth));
  ring.setAttribute('stroke-linejoin', 'round');
  ring.setAttribute('stroke-linecap', 'round');
  ring.setAttribute('pointer-events', 'none');
  layer.appendChild(ring);

  const tint = document.createElementNS(SVG_NS, 'path');
  tint.setAttribute('d', d);
  tint.setAttribute('fill', 'rgba(138, 216, 255, 0.05)');
  tint.setAttribute('stroke', 'none');
  tint.setAttribute('pointer-events', 'none');
  layer.appendChild(tint);
}

function objectHexes(kind, obj) {
  const table = {
    tile: TILES,
    overlay: OVERLAY_OBJECTS,
    monster: MONSTERS,
    mercenary: MERCENARIES,
    summon: SUMMONS,
  }[kind];
  const data = table?.byId.get(Number(obj?.id));
  if (!data) return null;
  return footprintHexes(Number(obj.x), Number(obj.y), data.hexes, Number(obj.angle) || 0);
}

function renderSelectionPath(kind, obj) {
  const hexList = objectHexes(kind, obj);
  if (!hexList) return;
  const d = selectionPath(hexList);
  if (!d) return;
  drawSelection(layerSelection, d, hexList.length > 1 ? 10.5 : 9.5, hexList.length > 1 ? 3.1 : 3);
}

export function renderSelection() {
  if (!layerSelection) return;
  clearSelectionLayer();

  const sel = uiState.selected;
  if (sel) {
    const arr = {
      tile: state.tiles,
      overlay: state.overlays,
      monster: state.monsters,
      mercenary: state.mercenaries,
      summon: state.summons,
    }[sel.kind] || [];
    const obj = arr[sel.idx];
    if (obj) {
      renderSelectionPath(sel.kind, obj);
      return;
    }
  }

  if (uiState.selectedHex) {
    const { col, row } = uiState.selectedHex;
    drawSelection(layerSelection, hexRingPath(col, row, 0.985), 9.5, 3);
  }

}

// ─── Ring rendering ───────────────────────────────────────────────────────────

function mergedFootprintPath(hexList, dy = 0, dx = 0) {
  const rnd = v => Math.round(v);
  function hverts(col, row) {
    // Use exact (untruncated) centre so diagonal neighbours round shared vertices identically.
    // hexCenter() floors the x, causing ±0.5 px errors on odd columns that break edge matching.
    const cx = col * HEX_W * 0.75 + HEX_W / 2;
    const cy = row * HEX_H + HEX_H / 2 + (col % 2 === 0 ? HEX_H / 2 : 0);
    const r = HEX_W / 2, h = HEX_H / 2;
    return [
      [rnd(cx+r),   rnd(cy)  ],
      [rnd(cx+r/2), rnd(cy+h)],
      [rnd(cx-r/2), rnd(cy+h)],
      [rnd(cx-r),   rnd(cy)  ],
      [rnd(cx-r/2), rnd(cy-h)],
      [rnd(cx+r/2), rnd(cy-h)],
    ];
  }
  const edgeMap = new Map();
  for (const { col, row } of hexList) {
    const verts = hverts(col, row);
    for (let i = 0; i < 6; i++) {
      const a = verts[i], b = verts[(i+1)%6];
      const key = [a, b].map(v => v.join(',')).sort().join('|');
      if (!edgeMap.has(key)) edgeMap.set(key, { a, b, count: 0 });
      edgeMap.get(key).count++;
    }
  }
  const boundary = [...edgeMap.values()].filter(e => e.count === 1);
  if (!boundary.length) return '';
  const poly = [boundary[0].a, boundary[0].b];
  const used = new Set([0]);
  while (used.size < boundary.length) {
    const tail = poly[poly.length - 1].join(',');
    let found = false;
    for (let i = 0; i < boundary.length; i++) {
      if (used.has(i)) continue;
      if (boundary[i].a.join(',') === tail) { poly.push(boundary[i].b); used.add(i); found = true; break; }
      if (boundary[i].b.join(',') === tail) { poly.push(boundary[i].a); used.add(i); found = true; break; }
    }
    if (!found) break;
  }
  return 'M' + poly.map(([x, y]) => `${x + dx},${y + dy}`).join('L') + 'Z';
}

function hexRingPath(col, row, scale, dy = 0, dx = 0) {
  const { x: cx, y: cy } = hexCenter(col, row);
  const r = (HEX_W / 2) * scale;
  const h = (HEX_H / 2) * scale;
  const ox = cx + dx, oy = cy + dy;
  return `M${ox+r},${oy}` +
         `L${ox+r/2},${oy+h}` +
         `L${ox-r/2},${oy+h}` +
         `L${ox-r},${oy}` +
         `L${ox-r/2},${oy-h}` +
         `L${ox+r/2},${oy-h}Z`;
}

const ROLE_ICON = {
  corridor:         'corridor.png',
  wall:             'wall.png',
  ice:              'icy.png',
  difficult:        'difficult.png',
  hazardous:        'hazardous.png',
  door:             'door.png',
  trap:             'trap.png',
  'pressure-plate': 'pressure-plate.png',
  obstacle:         'obstacle.png',
  objective:        'objective.png',
  'class-overlay':  'class-overlay.png',
};

const ICON_SIZE = 22;

function drawRoleIcon(layer, col, row, role, dy = 0, dx = 0) {
  const file = ROLE_ICON[role];
  if (!file) return;
  const { x: cx, y: cy } = hexCenter(col, row);
  const ix = cx - ICON_SIZE / 2 + dx;
  const iy = cy + HEX_H / 2 - ICON_SIZE + dy;
  const img = document.createElementNS(SVG_NS, 'image');
  img.setAttribute('href', `images/common/icons/${file}`);
  img.setAttribute('x', ix);
  img.setAttribute('y', iy);
  img.setAttribute('width', ICON_SIZE);
  img.setAttribute('height', ICON_SIZE);
  img.setAttribute('pointer-events', 'none');
  layer.appendChild(img);
}

function drawRing(layer, col, row, color, scale, width, dy = 0, dx = 0) {
  const el = document.createElementNS(SVG_NS, 'path');
  el.setAttribute('d', hexRingPath(col, row, scale, dy, dx));
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', width);
  el.setAttribute('pointer-events', 'none');
  layer.appendChild(el);
}

function renderRing(layer, col, row, role, dy = 0, dx = 0) {
  const ring = ROLE_RING[role];
  if (!ring) return;
  if (ring.type === 'single') {
    drawRing(layer, col, row, ring.color, 0.93, 3.75, dy, dx);
  } else {
    drawRing(layer, col, row, ring.outer, 0.85, 3, dy, dx);
  }
  drawRoleIcon(layer, col, row, role, dy, dx);
}

function renderFootprintRing(layer, hexList, role, dy = 0, dx = 0) {
  if (hexList.length === 1) { renderRing(layer, hexList[0].col, hexList[0].row, role, dy, dx); return; }
  const ring = ROLE_RING[role];
  if (!ring) return;
  const d = mergedFootprintPath(hexList, dy, dx);
  if (!d) return;
  const el = document.createElementNS(SVG_NS, 'path');
  el.setAttribute('d', d);
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', ring.type === 'single' ? ring.color : ring.outer);
  el.setAttribute('stroke-width', '3.75');
  el.setAttribute('pointer-events', 'none');
  layer.appendChild(el);
  drawRoleIcon(layer, hexList[0].col, hexList[0].row, role, dy, dx);
}

// ─── Anchor marker (map tiles) ───────────────────────────────────────────────

function anchorMarker(col, row) {
  const { x: cx, y: cy } = hexCenter(col, row);
  const r = 7;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');
  g.setAttribute('opacity', '0.6');

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', cx);  circle.setAttribute('cy', cy);
  circle.setAttribute('r', r);
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'white');
  circle.setAttribute('stroke-width', '1.5');

  const hLine = document.createElementNS(SVG_NS, 'line');
  hLine.setAttribute('x1', cx-r);  hLine.setAttribute('y1', cy);
  hLine.setAttribute('x2', cx+r);  hLine.setAttribute('y2', cy);
  hLine.setAttribute('stroke', 'white');  hLine.setAttribute('stroke-width', '1.5');

  const vLine = document.createElementNS(SVG_NS, 'line');
  vLine.setAttribute('x1', cx);  vLine.setAttribute('y1', cy-r);
  vLine.setAttribute('x2', cx);  vLine.setAttribute('y2', cy+r);
  vLine.setAttribute('stroke', 'white');  vLine.setAttribute('stroke-width', '1.5');

  g.appendChild(circle);  g.appendChild(hLine);  g.appendChild(vLine);
  return g;
}

// ─── Render from state ────────────────────────────────────────────────────────

export function renderAll(state) {
  const wdRuntime = getWardensDebtRuntime();
  if (layerGrid) layerGrid.style.display = wdRuntime.status === 'ready' ? 'none' : '';
  clearLayer(layerTiles);
  clearLayer(layerOverlays);
  clearLayer(layerFigures);

  renderTiles(state.tiles);
  renderWardensDebtMap();
  renderOverlays(state.overlays);
  renderMonsters(state.monsters);
  renderMercenaries(state.mercenaries);
  renderSummons(state.summons);
  renderSelection();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const WD_FIGURE_RADIUS = 32;

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

function renderWdFigureMarker(parent, { x, y, label, kind, locked = false, hp = 0, maxHp = 0, conditions = [] }) {
  const color = kind === 'enemy' ? '#e35f5f' : '#72ab84';
  const r = WD_FIGURE_RADIUS;
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('opacity', locked ? '0.72' : '1');
  parent.appendChild(group);

  // Glow outer halo
  const halo = document.createElementNS(SVG_NS, 'circle');
  halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', r);
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', hexToRgba(color, 0.20));
  halo.setAttribute('stroke-width', '10');
  halo.setAttribute('pointer-events', 'none');
  group.appendChild(halo);

  // Main body
  const body = document.createElementNS(SVG_NS, 'circle');
  body.setAttribute('cx', x); body.setAttribute('cy', y); body.setAttribute('r', r);
  body.setAttribute('fill', 'rgba(10,10,30,0.84)');
  body.setAttribute('stroke', hexToRgba(color, 0.88));
  body.setAttribute('stroke-width', '3');
  body.setAttribute('pointer-events', 'all');
  group.appendChild(body);

  // Label
  appendSvgText(group, { text: label, x, y: y + 1, className: 'wd-figure-label', fill: 'rgba(255,255,255,0.94)', fontSize: 14 });

  // HP badges — left side, stacked vertically
  const badgeH = 13, badgeGap = 2, fs = 9;
  const hpBadges = [
    { text: `♡ ${maxHp}`, color: '#2e7d32' },
    { text: `♥ ${hp}`,    color: '#c0392b' },
  ].filter(b => {
    const n = parseInt(b.text.split(' ')[1]);
    return !isNaN(n) && n > 0;
  });
  const totalHpH = hpBadges.length * badgeH + Math.max(0, hpBadges.length - 1) * badgeGap;
  hpBadges.forEach(({ text: bt, color: bc }, i) => {
    const bw = Math.ceil(bt.length * fs * 0.62 + 8);
    wdBadge(group, {
      x: x - r - 3 - bw,
      y: y - totalHpH / 2 + i * (badgeH + badgeGap),
      w: bw, h: badgeH, text: bt, color: bc,
    });
  });

  // Condition badges — right side, stacked vertically
  const COND_COLORS = { marked: '#7a4a9e', guarded: '#2e5f7d' };
  const COND_ABBR   = { marked: 'MK', guarded: 'GD' };
  const condBadges = conditions.slice(0, 5).map(cond => ({
    text: COND_ABBR[cond] || cond.slice(0, 2).toUpperCase(),
    color: COND_COLORS[cond] || '#4a4a6a',
  }));
  const totalCondH = condBadges.length * badgeH + Math.max(0, condBadges.length - 1) * badgeGap;
  condBadges.forEach(({ text: ct, color: cc }, i) => {
    const bw = Math.ceil(ct.length * fs * 0.62 + 8);
    wdBadge(group, {
      x: x + r + 3,
      y: y - totalCondH / 2 + i * (badgeH + badgeGap),
      w: bw, h: badgeH, text: ct, color: cc,
    });
  });
}

function appendSvgText(parent, { text, x, y, className, fill = 'rgba(255,255,255,0.88)', fontSize = 13 }) {
  const node = document.createElementNS(SVG_NS, 'text');
  node.setAttribute('x', x);
  node.setAttribute('y', y);
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

function renderWardensDebtMap() {
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState || !runtime.index) return;

  const boardTiles = runtime.gameState.board?.mapTiles || [];
  if (!boardTiles.length) return;

  const resolvedTiles = boardTiles.map((boardTile, idx) => {
    const base = wardensDebtMapTileForId(boardTile.id);
    if (!base) return null;
    return { ...base, ...boardTile, idx };
  }).filter(Boolean);

  if (!resolvedTiles.length) return;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'wd-map');

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
    ...(runtime.gameState.convicts || []).map((convict, index) => {
      const def = runtime.index?.convictDefsById?.get(convict.convictDefId);
      return {
        id: convict.id,
        label: figureInitials(def?.name || convict.convictDefId),
        kind: 'convict',
        hp: Number(convict.health) || 0,
        maxHp: Number(convict.maxHealth) || 0,
        conditions: Array.isArray(convict.conditions) ? convict.conditions : [],
      };
    }),
    ...(runtime.gameState.enemies || []).map((enemy, index) => {
      const card = runtime.index?.monsterCardsById?.get(enemy.monsterCardId);
      return {
        id: enemy.instanceId,
        label: figureInitials(card?.name || enemy.monsterCardId) + (index + 1),
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
    const figureKind = figure.kind === 'convict' ? 'convict' : 'enemy';
    const figureIsSelected = uiState.selected?.kind === (figure.kind === 'convict' ? 'wd-convict' : 'wd-enemy')
      && uiState.selected?.idx === (figure.kind === 'convict'
        ? (runtime.gameState.convicts || []).findIndex(convict => convict.id === figure.id)
        : (runtime.gameState.enemies || []).findIndex(enemy => enemy.instanceId === figure.id));
    const marker = document.createElementNS(SVG_NS, 'g');
    marker.setAttribute('class', `wd-figure${figureIsSelected ? ' is-selected' : ''}`);
    marker.style.cursor = 'grab';
    marker.dataset.wdKind = figure.kind;
    marker.dataset.wdId = figure.id;
    marker.dataset.wdIdx = figure.kind === 'convict'
      ? String((runtime.gameState.convicts || []).findIndex(convict => convict.id === figure.id))
      : String((runtime.gameState.enemies || []).findIndex(enemy => enemy.instanceId === figure.id));
    renderWdFigureMarker(marker, {
      x: position.x,
      y: position.y,
      label: figure.label,
      kind: figureKind,
      locked: Boolean(position.locked),
      hp: figure.hp,
      maxHp: figure.maxHp,
      conditions: figure.conditions,
    });
    group.appendChild(marker);
  });

  layerTiles.appendChild(group);
}

function renderTiles(tiles) {
  if (!tiles) return;
  for (const t of tiles) {
    const data = TILES.byId.get(Number(t.id));
    if (!data) continue;
    const col = Number(t.x), row = Number(t.y);
    const angle = Number(t.angle) || 0;
    layerTiles.appendChild(svgImage(assetPath.tile(data, t.side || ''), col, row, data.left, data.top, angle));
    layerTiles.appendChild(anchorMarker(col, row));
  }
}

const STACK_OFFSET_X = 5; // px shift per depth level (horizontal)
const STACK_OFFSET_Y = 5; // px shift per depth level (vertical)

function hexMaskPath(col, row, dx, dy) {
  const { x: cx, y: cy } = hexCenter(col, row);
  const r = HEX_W / 2, h = HEX_H / 2;
  const ox = cx + dx, oy = cy + dy;
  return `M${ox+r},${oy}L${ox+r/2},${oy+h}L${ox-r/2},${oy+h}` +
         `L${ox-r},${oy}L${ox-r/2},${oy-h}L${ox+r/2},${oy-h}Z`;
}

let maskUid = 0;

function renderOverlays(overlays) {
  if (!overlays) return;

  // Remove stale masks from previous render.
  while (svgDefs.firstChild) svgDefs.removeChild(svgDefs.firstChild);

  // First pass: compute maxDepth per hex and record role at each depth.
  const hexCount = new Map();
  const hexRoles = new Map(); // key -> array of roles in stack order
  for (const o of overlays) {
    const key = `${o.x},${o.y}`;
    hexCount.set(key, (hexCount.get(key) ?? -1) + 1);
    if (!hexRoles.has(key)) hexRoles.set(key, []);
    hexRoles.get(key).push(o.role);
  }
  const hexDepth = new Map();

  for (const o of overlays) {
    const data = OVERLAY_OBJECTS.byId.get(Number(o.id));
    if (!data) continue;
    const col      = Number(o.x), row = Number(o.y);
    const angle    = Number(o.angle) || 0;
    const layer    = FLOOR_ROLES.has(o.role) ? layerOverlays : layerFigures;
    const key      = `${o.x},${o.y}`;
    const depth    = hexCount.get(key) > 0 ? (hexDepth.get(key) ?? 0) : 0;
    const maxDepth = hexCount.get(key);
    hexDepth.set(key, depth + 1);

    const dx = depth * STACK_OFFSET_X;
    const dy = depth * STACK_OFFSET_Y;
    const doorScale = (o.role === 'door' && data.game === 'gh2') ? 0.9 : 1;
    const imgW = data.w != null ? data.w * doorScale : null;
    const imgH = data.h != null ? data.h * doorScale : null;
    const imgL = data.w != null ? data.left - data.w * (1 - doorScale) / 2 : data.left;
    const imgT = data.h != null ? data.top  - data.h * (1 - doorScale) / 2 : data.top;
    const img = svgImage(assetPath.overlay(data, !!o.opened), col, row,
      imgL - dx, imgT - dy, angle, imgW, imgH);

    // Wrap in a group; apply a mask to hide the area covered by higher objects.
    // Loot tokens stack fully visible (no masking).
    const g = document.createElementNS(SVG_NS, 'g');
    if (depth < maxDepth && o.role !== 'loot') {
      const maskId = `sm-${maskUid++}`;
      const mask   = document.createElementNS(SVG_NS, 'mask');
      mask.setAttribute('id', maskId);

      const wp = document.createElementNS(SVG_NS, 'path');
      wp.setAttribute('d', hexMaskPath(col, row, dx, dy));
      wp.setAttribute('fill', 'white');
      mask.appendChild(wp);

      const roles = hexRoles.get(key);
      for (let d = depth + 1; d <= maxDepth; d++) {
        if (roles[d] === 'loot') continue;
        const bp = document.createElementNS(SVG_NS, 'path');
        bp.setAttribute('d', hexMaskPath(col, row, d * STACK_OFFSET_X, d * STACK_OFFSET_Y));
        bp.setAttribute('fill', 'black');
        mask.appendChild(bp);
      }

      svgDefs.appendChild(mask);
      g.setAttribute('mask', `url(#${maskId})`);
    }

    g.appendChild(img);
    renderFootprintRing(g, footprintHexes(col, row, data.hexes, angle), o.role, dy, dx);
    layer.appendChild(g);

    if (o.hp !== undefined || o.maxhp !== undefined) {
      layer.appendChild(svgStatsLabel(Number(o.hp) || 0, null, null, col, row,
        o.maxhp != null ? Number(o.maxhp) : null));
    }
  }
}

function renderMonsters(monsters) {
  if (!monsters) return;
  monsters.forEach((m, i) => {
    const data = MONSTERS.byId.get(Number(m.id));
    if (!data) return;
    const col = Number(m.x), row = Number(m.y);
    const angle = Number(m.angle) || 0;
    const img = svgImage(assetPath.monster(data), col, row, data.left, data.top, angle);
    img.dataset.kind    = 'monster';
    img.dataset.idx     = i;
    img.dataset.leftOff = data.left;
    img.dataset.topOff  = data.top;
    layerFigures.appendChild(img);
    renderRing(layerFigures, col, row, m.role);
    if (state.showObjectLabels) layerFigures.appendChild(svgLabel(colLabel(col) + row, col, row));

    const displayMaxhp = displayMaxHp('monster', m);
    const displayHp = displayCurrentHp('monster', m);

    layerFigures.appendChild(svgStatsLabel(
      displayHp, null, null, col, row, displayMaxhp, m.standeeNum
    ));
    const condEl = svgConditions(Array.isArray(m.conditions) ? m.conditions : [], col, row);
    if (condEl) layerFigures.appendChild(condEl);
  });
}

function renderMercenaries(mercenaries) {
  if (!mercenaries) return;
  mercenaries.forEach((h, i) => {
    if (!h || !h.id) return;
    const data = MERCENARIES.byId.get(Number(h.id));
    if (!data) return;
    const col = Number(h.x), row = Number(h.y);
    if (!(col >= 1)) return;
    const angle = Number(h.angle) || 0;
    const img = svgImage(assetPath.mercenary(data.title), col, row, data.left, data.top, angle);
    img.dataset.kind    = 'mercenary';
    img.dataset.idx     = i;
    img.dataset.leftOff = data.left;
    img.dataset.topOff  = data.top;
    layerFigures.appendChild(img);
    if (state.showObjectLabels) layerFigures.appendChild(svgLabel(colLabel(col) + row, col, row));

    const displayMaxhp = displayMaxHp('mercenary', h);
    const displayHp = displayCurrentHp('mercenary', h);

    layerFigures.appendChild(svgStatsLabel(
      displayHp, Number(h.xp) || 0, Number(h.gold) || 0, col, row,
      displayMaxhp
    ));
    const condEl = svgConditions(Array.isArray(h.conditions) ? h.conditions : [], col, row);
    if (condEl) layerFigures.appendChild(condEl);
  });
}

function renderSummons(summons) {
  if (!summons) return;
  summons.forEach((h, i) => {
    if (!h || !h.id) return;
    const data = SUMMONS.byId.get(Number(h.id));
    if (!data) return;
    const col = Number(h.x), row = Number(h.y);
    if (!(col >= 1)) return;
    const angle = Number(h.angle) || 0;
    const img = svgImage(assetPath.summon(data.title), col, row, data.left, data.top, angle);
    img.dataset.kind    = 'summon';
    img.dataset.idx     = i;
    img.dataset.leftOff = data.left;
    img.dataset.topOff  = data.top;
    layerFigures.appendChild(img);
    if (state.showObjectLabels) layerFigures.appendChild(svgLabel(colLabel(col) + row, col, row));
    layerFigures.appendChild(svgStatsLabel(
      Number(h.hp) || 0, Number(h.xp) || 0, Number(h.gold) || 0, col, row,
      h.maxhp != null ? Number(h.maxhp) : null
    ));
    const condEl = svgConditions(Array.isArray(h.conditions) ? h.conditions : [], col, row);
    if (condEl) layerFigures.appendChild(condEl);
  });
}
