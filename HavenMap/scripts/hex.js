// Flat-top even-q offset hex grid.
// Columns are 1-indexed (1 = A). Rows are 0-indexed.
// Even columns (2, 4, …) shift down by half a hex height.

export const HEX_W  = 90;   // hex width  (flat-to-flat = 90)
export const HEX_H  = 78;   // hex height (point-to-point ≈ 78)
export const COLS   = 40;
export const ROWS   = 50;

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Column number (1-based) → label string: 1→'A', 27→'AA', etc. */
export function colLabel(col) {
  const i = col - 1;
  let s = '';
  if (i >= 26) s += ALPHA[Math.floor(i / 26) - 1];
  return s + ALPHA[i % 26];
}

/** Pixel centre of hex (col 1-based, row 0-based). */
export function hexCenter(col, row) {
  const shift = (col % 2 === 0) ? HEX_H / 2 : 0;
  return {
    x: Math.floor(col * HEX_W * 0.75) + HEX_W / 2,
    y: row * HEX_H + HEX_H / 2 + shift,
  };
}

/**
 * Top-left pixel of an image whose anchor (hex centre) is at
 * (leftOff, topOff) pixels from the image's own top-left corner.
 */
export function imagePos(col, row, leftOff, topOff) {
  const c = hexCenter(col, row);
  return { x: c.x - leftOff, y: c.y - topOff };
}

/** SVG path string drawing hex outlines for a column/row range. */
export function buildGridPath(colMin = 1, colMax = COLS, rowMin = 0, rowMax = ROWS) {
  const r = HEX_W / 2;  // 45
  const h = HEX_H / 2;  // 39
  const segs = [];
  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      const { x: cx, y: cy } = hexCenter(col, row);
      segs.push(
        `M${cx+r},${cy}` +
        `L${cx+r/2},${cy+h}` +
        `L${cx-r/2},${cy+h}` +
        `L${cx-r},${cy}` +
        `L${cx-r/2},${cy-h}` +
        `L${cx+r/2},${cy-h}Z`
      );
    }
  }
  return segs.join('');
}

// ─── Multi-hex footprint ─────────────────────────────────────────────────────

const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

function neighborInDir(col, row, dir) {
  const odd = col % 2 === 1;
  switch (dir) {
    case 'N':  return { col,       row: row - 1 };
    case 'NE': return { col: col+1, row: row + (odd ? -1 : 0) };
    case 'SE': return { col: col+1, row: row + (odd ?  0 : 1) };
    case 'S':  return { col,       row: row + 1 };
    case 'SW': return { col: col-1, row: row + (odd ?  0 : 1) };
    case 'NW': return { col: col-1, row: row + (odd ? -1 : 0) };
    default:   return { col, row };
  }
}

/**
 * Returns [{col,row}, …] for all hexes occupied by an object whose
 * anchor is at (col,row), whose base footprint directions are in hexes
 * (e.g. ['S'] or ['S','SE']), and which has been rotated by angle degrees.
 */
export function footprintHexes(col, row, hexes, angle = 0) {
  const result = [{ col, row }];
  if (!hexes || hexes.length === 0) return result;
  const steps = Math.round(((angle % 360) + 360) % 360 / 60);
  for (const dir of hexes) {
    const rotated = DIRS[(DIRS.indexOf(dir) + steps) % 6];
    result.push(neighborInDir(col, row, rotated));
  }
  return result;
}

/** Find nearest hex centre to a pixel coordinate (used for drag-drop). */
export function pixelToHex(px, py) {
  const colEst = Math.round((px - HEX_W / 2) / (HEX_W * 0.75));
  let best = { col: 1, row: 0 };
  let bestDist = Infinity;
  for (let col = Math.max(1, colEst - 1); col <= Math.min(COLS, colEst + 2); col++) {
    const shift  = (col % 2 === 0) ? HEX_H / 2 : 0;
    const rowEst = Math.round((py - HEX_H / 2 - shift) / HEX_H);
    for (let row = Math.max(0, rowEst - 1); row <= Math.min(ROWS, rowEst + 1); row++) {
      const c = hexCenter(col, row);
      const d = (px - c.x) ** 2 + (py - c.y) ** 2;
      if (d < bestDist) { bestDist = d; best = { col, row }; }
    }
  }
  return best;
}
