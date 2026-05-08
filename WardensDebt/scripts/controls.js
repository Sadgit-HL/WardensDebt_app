// Rotate controls for the SVG board.
// All transforms are applied to #board-group via a CSS transform string.

const ROT_STEP  = 60;    // degrees per rotate click (hex-aligned)
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 5.0;
const ZOOM_STEP = 0.1;

const view = { rot: 0, scale: 1, zoom: 1, panX: 0, panY: 0 };

let boardGroup = null;
let svgEl      = null;
let xOffset    = 0;

function applyTransform() {
  boardGroup.setAttribute('transform',
    `translate(${xOffset + view.panX} ${30 + view.panY}) scale(${view.scale * view.zoom}) rotate(${view.rot})`);
}

export function initControls(svg, scale, leftOffset = 0) {
  svgEl      = svg;
  boardGroup = svg.querySelector('#board-group');
  view.scale = scale;
  xOffset    = leftOffset;
  applyTransform();

  const btn = id => document.getElementById(id);

  const cw  = btn('btn-rotate-cw');
  const ccw = btn('btn-rotate-ccw');
  if (cw)  cw .addEventListener('click', () => { view.rot = (view.rot + ROT_STEP) % 360; applyTransform(); });
  if (ccw) ccw.addEventListener('click', () => { view.rot = (view.rot - ROT_STEP + 360) % 360; applyTransform(); });
}

export function setZoom(z) {
  view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  applyTransform();
  return view.zoom;
}

export function setZoomAroundClient(z, clientX, clientY) {
  if (!svgEl || !boardGroup) return setZoom(z);

  const pointer = svgEl.createSVGPoint();
  pointer.x = clientX;
  pointer.y = clientY;
  const boardPoint = pointer.matrixTransform(boardGroup.getScreenCTM().inverse());

  view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  applyTransform();

  const anchored = svgEl.createSVGPoint();
  anchored.x = boardPoint.x;
  anchored.y = boardPoint.y;
  const screenPoint = anchored.matrixTransform(boardGroup.getScreenCTM());
  view.panX += clientX - screenPoint.x;
  view.panY += clientY - screenPoint.y;
  applyTransform();

  return view.zoom;
}

export function getZoom() { return view.zoom; }
export function panBy(dx, dy) {
  view.panX += dx;
  view.panY += dy;
  applyTransform();
}

export function resetView() {
  view.rot = 0;
  view.zoom = 1;
  view.panX = 0;
  view.panY = 0;
  applyTransform();
  return view.zoom;
}

export function centerBoardPoint(x, y) {
  if (!svgEl) return;
  const scale = view.scale * view.zoom;
  const sidebarW = window.matchMedia('(max-width: 760px)').matches
    ? 0
    : Number(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').replace('px', '')) || 280;
  const targetX = (window.innerWidth - sidebarW) / 2;
  const targetY = (window.innerHeight - 64) / 2;
  view.panX = targetX - xOffset - x * scale;
  view.panY = targetY - 30 - y * scale;
  applyTransform();
}
export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP };
