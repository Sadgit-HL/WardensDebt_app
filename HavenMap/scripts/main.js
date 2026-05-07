import { init as initRender, renderAll, renderSelection, setGridLabelsVisible } from './render.js';
import { state, load, subscribe, undo, redo, canUndo, canRedo } from './state.js';
import { initControls, setZoom, setZoomAroundClient, getZoom, resetView, ZOOM_STEP, centerBoardPoint } from './controls.js';
import { initDrag }                                    from './drag.js';
import { initSidebar }                                 from './sidebar.js';
import { initElements, renderElements }                from './elements.js';
import { initMobile }                                  from './mobile.js';
import { HEX_W, HEX_H, COLS, ROWS, hexCenter }        from './hex.js';
import { clearSelection }                              from './uiState.js';
import { subscribeUI, uiState }                        from './uiState.js';
import { initWardensDebtRuntime, subscribeWardensDebtRuntime, wdUndo, wdRedo, canWdUndo, canWdRedo } from './wardensDebt/runtime.js';

document.addEventListener('DOMContentLoaded', () => {
  document.title = `Warden's Debt`;
  const svgEl = document.getElementById('board-svg');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  initRender(svgEl);

  const isMobileLayout = window.matchMedia('(max-width: 760px)').matches;
  const SIDEBAR_W = isMobileLayout ? 0 : 280;

  // Scale so ~20 columns fill the viewport width (excluding sidebar)
  const viewW = window.innerWidth - SIDEBAR_W;
  const scale = (viewW * 0.95) / (20 * HEX_W * 0.75);

  // Shift board left so row labels start at the SVG left edge.
  const col1CenterX      = Math.floor(HEX_W * 0.75) + HEX_W / 2;
  const rowLabelLeftEdge = col1CenterX - HEX_W / 2 - 28;
  const xOffset          = -(rowLabelLeftEdge * scale) + 2;

  // Base SVG dimensions to fit the full board at scale 1.
  const baseBoardW = (Math.floor(COLS * HEX_W * 0.75) + HEX_W) * scale + Math.abs(xOffset) + 20;
  const baseBoardH = (ROWS * HEX_H + HEX_H) * scale + 60;

  function applyZoom(z, focusClient = null) {
    const zoom = focusClient
      ? setZoomAroundClient(z, focusClient.x, focusClient.y)
      : setZoom(z);
    svgEl.style.width  = baseBoardW * zoom + 'px';
    svgEl.style.height = baseBoardH * zoom + 'px';
    const selectedHex = uiState.selectedHex;
    if (!focusClient && !window.matchMedia('(max-width: 760px)').matches && selectedHex) {
      const { x, y } = hexCenter(selectedHex.col, selectedHex.row);
      centerBoardPoint(x, y);
    }
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = Math.round(zoom * 100) + '%';
  }

  function defaultZoomForViewport() {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    if (!isMobile) return 1;
    const w = window.innerWidth;
    if (w <= 360) return 2.6;
    if (w <= 390) return 2.8;
    if (w <= 430) return 3.0;
    if (w <= 560) return 2.6;
    return 2.2;
  }

  initControls(svgEl, scale, xOffset);
  applyZoom(defaultZoomForViewport());
  initDrag(svgEl);
  initSidebar();
  initElements();
  initMobile();
  void initWardensDebtRuntime();

  function updateHistoryButtons() {
    if (undoBtn) undoBtn.disabled = !canWdUndo() && !canUndo();
    if (redoBtn) redoBtn.disabled = !canWdRedo() && !canRedo();
  }

  function performUndo() { return wdUndo() || undo(); }
  function performRedo() { return wdRedo() || redo(); }

  // Zoom buttons
  document.getElementById('zoom-in') ?.addEventListener('click', () => applyZoom(getZoom() + ZOOM_STEP));
  document.getElementById('zoom-out')?.addEventListener('click', () => applyZoom(getZoom() - ZOOM_STEP));
  undoBtn?.addEventListener('click', () => {
    if (performUndo()) clearSelection();
  });
  redoBtn?.addEventListener('click', () => {
    if (performRedo()) clearSelection();
  });

  // Mouse wheel zooms the board directly; page scrollbars are intentionally hidden.
  svgEl.addEventListener('wheel', e => {
    e.preventDefault();
    applyZoom(getZoom() + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), { x: e.clientX, y: e.clientY });
  }, { passive: false });

  window.addEventListener('keydown', e => {
    const target = e.target;
    const isTypingField = target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (isTypingField) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      if (performUndo()) {
        clearSelection();
        e.preventDefault();
      }
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      if (performRedo()) {
        clearSelection();
        e.preventDefault();
      }
    }
  });

  window.addEventListener('keydown', e => {
    const target = e.target;
    const isTypingField = target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (isTypingField || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '0') {
      applyZoom(resetView());
      e.preventDefault();
    }
  });

  // Re-render whenever state changes
  subscribe(() => { renderAll(); renderElements(); setGridLabelsVisible(state.showGridLabels); updateHistoryButtons(); });
  subscribeWardensDebtRuntime(() => { renderAll(); updateHistoryButtons(); });
  subscribeUI(() => { renderSelection(); });

  // Load from URL hash (triggers the subscriber above)
  clearSelection();
  load();
  updateHistoryButtons();

  // Also reload if user manually edits the URL hash
  window.addEventListener('hashchange', () => {
    clearSelection();
    load();
  });
});
