import { subscribe, undo, redo, canUndo, canRedo } from './state.js';
import { uiState, subscribeUI, setMobilePanel, openAddPanel, closeAddPanel, openMobileDetails, closeMobileDetails, setMobileMoveMode } from './uiState.js';
import { setZoom, getZoom, resetView, ZOOM_STEP } from './controls.js';

function controlsHtml() {
  return `
    <div class="mobile-panel-row mobile-panel-row--controls">
      <button class="mobile-btn" data-mobile-action="undo" ${canUndo() ? '' : 'disabled'}>Undo</button>
      <button class="mobile-btn" data-mobile-action="redo" ${canRedo() ? '' : 'disabled'}>Redo</button>
      <button class="mobile-icon-btn" data-mobile-action="zoom-out">-</button>
      <span class="mobile-zoom">${Math.round(getZoom() * 100)}%</span>
      <button class="mobile-icon-btn" data-mobile-action="zoom-in">+</button>
      <button class="mobile-btn" data-mobile-action="reset">Reset</button>
    </div>`;
}

function selectionHtml() {
  const canAdd = Boolean(uiState.selectedHex || uiState.selectedCell);
  const canMove = Boolean(uiState.selected);
  const detailsLabel = uiState.mobileDetailsOpen ? 'Close' : 'Details';
  const hasSelection = Boolean(uiState.selected || uiState.selectedCell || uiState.selectedHex);
  return `
    <div class="mobile-selection${uiState.mobileMoveMode ? ' is-moving' : ''}">
      <div class="mobile-selection-copy">
        <div class="mobile-eyebrow">Selection</div>
        <div class="mobile-title">${uiState.mobileMoveMode ? 'Tap destination' : (uiState.selected ? 'Figure selected' : 'Select a figure')}</div>
        <div class="mobile-meta">${uiState.mobileMoveMode ? 'Move mode active' : 'Tap the board to inspect or add'}</div>
      </div>
      <div class="mobile-selection-actions">
        <button class="mobile-btn" data-mobile-action="move" ${canMove ? '' : 'disabled'}>${uiState.mobileMoveMode ? 'Cancel' : 'Move'}</button>
        <button class="mobile-btn" data-mobile-action="details" ${hasSelection ? '' : 'disabled'}>${detailsLabel}</button>
        <button class="mobile-btn mobile-btn--accent" data-mobile-action="add" ${canAdd ? '' : 'disabled'}>Add</button>
      </div>
    </div>`;
}

function settingsHtml() {
  return `
    <div class="mobile-selection">
      <div class="mobile-selection-copy">
        <div class="mobile-eyebrow">Settings</div>
        <div class="mobile-title">Game and display</div>
        <div class="mobile-meta">Opens as a scrollable overlay</div>
      </div>
      <button class="mobile-btn mobile-btn--accent" data-mobile-action="settings">Open</button>
    </div>`;
}

function render() {
  document.body.classList.toggle('mobile-details-open', uiState.mobileDetailsOpen);
  document.body.classList.toggle('mobile-add-open', uiState.addPanelOpen);
  document.body.classList.toggle('mobile-settings-open', document.getElementById('settings-panel')?.classList.contains('open') || false);
  const panel = document.getElementById('mobile-panel');
  if (!panel) return;
  const active = uiState.mobilePanel || 'selection';
  panel.innerHTML =
    active === 'controls' ? controlsHtml() :
    active === 'settings' ? settingsHtml() :
    selectionHtml();

  document.querySelectorAll('[data-mobile-panel]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mobilePanel === active);
  });
}

function openSettings() {
  closeAddPanel();
  closeMobileDetails();
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn = document.getElementById('settings-btn');
  settingsPanel?.classList.add('open');
  settingsBtn?.classList.add('active');
  document.body.classList.add('mobile-settings-open');
}

function closeSettings() {
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn = document.getElementById('settings-btn');
  settingsPanel?.classList.remove('open');
  settingsBtn?.classList.remove('active');
  document.body.classList.remove('mobile-settings-open');
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function hasMobileOverlay() {
  return Boolean(uiState.addPanelOpen || uiState.mobileDetailsOpen || document.getElementById('settings-panel')?.classList.contains('open'));
}

function closeTopMobileOverlay() {
  if (document.getElementById('settings-panel')?.classList.contains('open')) {
    closeSettings();
    return true;
  }
  if (uiState.addPanelOpen) {
    closeAddPanel();
    return true;
  }
  if (uiState.mobileDetailsOpen) {
    closeMobileDetails();
    return true;
  }
  return false;
}

export function initMobile() {
  const shell = document.getElementById('mobile-shell');
  if (!shell) return;
  window.addEventListener('resize', render);
  const sidebarPanel = document.getElementById('sidebar-panel');

  sidebarPanel?.addEventListener('click', e => {
    if (!isMobileLayout()) return;
    if (!uiState.addPanelOpen && !uiState.mobileDetailsOpen) return;
    e.stopPropagation();
  });

  shell.addEventListener('click', e => {
    const tab = e.target.closest('[data-mobile-panel]');
    if (tab) {
      e.stopPropagation();
      const panel = tab.dataset.mobilePanel;
      closeSettings();
      setMobilePanel(panel);
      if (panel === 'settings') openSettings();
      return;
    }

    const action = e.target.closest('[data-mobile-action]')?.dataset.mobileAction;
    if (!action) return;
    if (action === 'undo') undo();
    else if (action === 'redo') redo();
    else if (action === 'zoom-out') setZoom(getZoom() - ZOOM_STEP);
    else if (action === 'zoom-in') setZoom(getZoom() + ZOOM_STEP);
    else if (action === 'reset') resetView();
    else if (action === 'add') {
      e.stopPropagation();
      closeMobileDetails();
      closeSettings();
      openAddPanel();
    }
    else if (action === 'details') {
      e.stopPropagation();
      if (uiState.mobileDetailsOpen) {
        closeMobileDetails();
      } else {
        closeAddPanel();
        closeSettings();
        setMobileMoveMode(false);
        openMobileDetails();
      }
    }
    else if (action === 'move') {
      e.stopPropagation();
      closeAddPanel();
      closeSettings();
      closeMobileDetails();
      setMobileMoveMode(!uiState.mobileMoveMode);
    }
    else if (action === 'settings') openSettings();
    render();
  });

  document.addEventListener('click', e => {
    if (!isMobileLayout()) return;
    if (e.target.closest('[data-action="close-mobile-details"]')) {
      closeMobileDetails();
      return;
    }
    if (uiState.addPanelOpen && e.target.closest('#sidebar-panel')) return;
    const settingsOpen = document.getElementById('settings-panel')?.classList.contains('open');
    if (settingsOpen) {
      if (e.target.closest('#settings-panel, #settings-btn')) return;
      closeSettings();
      return;
    }
    if (!hasMobileOverlay()) return;
    if (e.target.closest('#sidebar-panel, #mobile-shell, #settings-btn')) return;
    closeTopMobileOverlay();
  });

  window.addEventListener('keydown', e => {
    if (!isMobileLayout() || e.key !== 'Escape') return;
    if (!closeTopMobileOverlay()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    document.body.classList.toggle('mobile-settings-open', document.getElementById('settings-panel')?.classList.contains('open') || false);
  });

  subscribe(render);
  subscribeUI(render);
  render();
}
