export const WARDENS_DEBT_GRID_SIZE = 32;

export function wardensDebtFigurePosition(runtime, figureId) {
  const positions = runtime?.gameState?.board?.figurePositions || {};
  const pos = positions[figureId];
  return isWardensDebtPoint(pos) ? pos : null;
}

export function isWardensDebtPoint(value) {
  return Boolean(value)
    && typeof value === 'object'
    && Number.isFinite(Number(value.x))
    && Number.isFinite(Number(value.y));
}

export function clampWardensDebtPoint(point, tile) {
  if (!tile) return null;
  const x = Math.max(0, Math.min(tile.naturalWidth, Math.round(Number(point?.x) || 0)));
  const y = Math.max(0, Math.min(tile.naturalHeight, Math.round(Number(point?.y) || 0)));
  return { x, y };
}

export function snapWardensDebtBoardPoint(point) {
  if (!point) return null;
  return {
    x: Math.max(0, Math.round((Number(point.x) || 0) / WARDENS_DEBT_GRID_SIZE) * WARDENS_DEBT_GRID_SIZE),
    y: Math.max(0, Math.round((Number(point.y) || 0) / WARDENS_DEBT_GRID_SIZE) * WARDENS_DEBT_GRID_SIZE),
  };
}

export function snapWardensDebtPoint(point, tile) {
  if (!tile) return null;
  const raw = clampWardensDebtPoint(point, tile);
  if (!raw) return null;
  const x = Math.max(0, Math.min(tile.naturalWidth, Math.round(raw.x / WARDENS_DEBT_GRID_SIZE) * WARDENS_DEBT_GRID_SIZE));
  const y = Math.max(0, Math.min(tile.naturalHeight, Math.round(raw.y / WARDENS_DEBT_GRID_SIZE) * WARDENS_DEBT_GRID_SIZE));
  return { x, y };
}

export function wardensDebtPointToSvg(tile, point) {
  if (!tile || !isWardensDebtPoint(point)) return null;
  const scale = tile.width / tile.naturalWidth;
  return {
    x: tile.x + Number(point.x) * scale,
    y: tile.y + Number(point.y) * scale,
  };
}

export function wardensDebtSvgToPoint(tile, x, y) {
  if (!tile) return null;
  const scale = tile.width / tile.naturalWidth;
  const local = {
    x: (Number(x) - tile.x) / scale,
    y: (Number(y) - tile.y) / scale,
  };
  return snapWardensDebtPoint(local, tile);
}
