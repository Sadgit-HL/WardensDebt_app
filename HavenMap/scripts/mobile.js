import { state, patch, subscribe, undo, redo, canUndo, canRedo } from './state.js';
import { uiState, subscribeUI, setMobilePanel, openAddPanel, closeAddPanel, openMobileDetails, closeMobileDetails, setMobileMoveMode } from './uiState.js';
import { setZoom, getZoom, resetView, ZOOM_STEP } from './controls.js';
import { cycleElement, endOfRound } from './elements.js';
import { ELEMENTS } from './games/common.js';
import { TILES, OVERLAY_OBJECTS, MONSTERS, MERCENARIES, SUMMONS } from './data.js';
import { colLabel } from './hex.js';
import { displayCurrentHp } from './hp.js';

const KIND_TABLE = {
  tile: TILES,
  overlay: OVERLAY_OBJECTS,
  monster: MONSTERS,
  mercenary: MERCENARIES,
  summon: SUMMONS,
};
const STATE_KEY = {
  tile: 'tiles',
  overlay: 'overlays',
  monster: 'monsters',
  mercenary: 'mercenaries',
  summon: 'summons',
};

function titleCase(s) {
  return String(s || '').replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1));
}

function selectedLabel() {
  const hex = uiState.selectedHex;
  const coord = hex ? `${colLabel(hex.col)}${hex.row}` : '';
  if (uiState.selected) {
    const { kind, idx } = uiState.selected;
    const key = STATE_KEY[kind];
    const obj = state[key]?.[idx];
    const entry = obj ? KIND_TABLE[kind]?.byId.get(Number(obj.id)) : null;
    return {
      eyebrow: kind === 'overlay' ? (obj?.role || 'overlay') : kind,
      title: titleCase(entry?.title || kind),
      meta: coord ? `Hex ${coord}` : '',
      hasSelection: true,
    };
  }
  if (uiState.stack.length) {
    return { eyebrow: 'Stack', title: `${uiState.stack.length} objects`, meta: coord, hasSelection: true };
  }
  if (hex) {
    return { eyebrow: 'Hex', title: coord, meta: 'Ready to add objects', hasSelection: true };
  }
  return { eyebrow: 'Selection', title: 'Select a hex', meta: 'Tap the board to inspect or add', hasSelection: false };
}

function selectedContext() {
  const sel = uiState.selected;
  if (!sel) return null;
  const key = STATE_KEY[sel.kind];
  const arr = state[key] || [];
  const obj = arr[sel.idx];
  return obj ? { sel, key, arr, obj } : null;
}

function quickStatsHtml() {
  const ctx = selectedContext();
  if (!ctx) return '';
  const { sel, obj } = ctx;
  const canHp = sel.kind === 'mercenary' || sel.kind === 'summon' || sel.kind === 'monster' || obj.hp !== undefined;
  const rows = [];
  if (canHp) rows.push({ key: 'hp', label: 'HP', value: displayCurrentHp(sel.kind, obj) });
  if (sel.kind === 'mercenary' || sel.kind === 'summon') {
    rows.push({ key: 'xp', label: 'XP', value: Number(obj.xp) || 0 });
    rows.push({ key: 'gold', label: 'Gold', value: Number(obj.gold) || 0 });
  }
  if (!rows.length) return '';
  return `<div class="mobile-quick-stats">
    ${rows.map(row => `
      <div class="mobile-stat mobile-stat--${row.key}">
        <span>${row.label}</span>
        <button class="mobile-stat-btn" data-mobile-stat="${row.key}" data-delta="-1">-</button>
        <strong>${row.value}</strong>
        <button class="mobile-stat-btn" data-mobile-stat="${row.key}" data-delta="1">+</button>
      </div>
    `).join('')}
  </div>`;
}

function adjustQuickStat(field, delta) {
  const ctx = selectedContext();
  if (!ctx) return;
  const base = field === 'hp' ? displayCurrentHp(ctx.sel.kind, ctx.obj) : Number(ctx.obj[field]) || 0;
  const value = Math.max(0, base + delta);
  const hpContext = field === 'hp' && ctx.sel.kind === 'monster'
    ? { _hpLevel: state.CurrentLevel, _hpRole: ctx.obj.role || 'normal' }
    : field === 'hp' && ctx.sel.kind === 'mercenary'
      ? { _hpLevel: ctx.obj.level != null ? Number(ctx.obj.level) : 0 }
      : {};
  patch({ [ctx.key]: ctx.arr.map((item, i) => i === ctx.sel.idx ? { ...item, [field]: value, ...hpContext } : item) });
}

function quickActionsHtml() {
  const ctx = selectedContext();
  if (!ctx) return '';
  const { sel, obj } = ctx;
  const locked = Boolean(obj.locked);
  const buttons = [
    `<button class="mobile-mini-btn" data-mobile-object-action="rotate-ccw" ${locked ? 'disabled' : ''}>↺</button>`,
    `<button class="mobile-mini-btn" data-mobile-object-action="rotate-cw" ${locked ? 'disabled' : ''}>↻</button>`,
  ];
  if (sel.kind === 'monster' && obj.role !== 'boss') {
    buttons.push(`<button class="mobile-mini-btn mobile-mini-btn--role" data-mobile-object-action="toggle-role">${obj.role === 'elite' ? 'Elite' : 'Normal'}</button>`);
  }
  if (sel.kind === 'overlay' && obj.role === 'door') {
    buttons.push(`<button class="mobile-mini-btn mobile-mini-btn--role" data-mobile-object-action="toggle-door">${obj.opened ? 'Open' : 'Closed'}</button>`);
  }
  buttons.push(`<button class="mobile-mini-btn${locked ? ' is-active' : ''}" data-mobile-object-action="toggle-lock">${locked ? 'Locked' : 'Lock'}</button>`);
  buttons.push(`<button class="mobile-mini-btn mobile-mini-btn--danger" data-mobile-object-action="remove" ${locked ? 'disabled' : ''}>Delete</button>`);
  return `<div class="mobile-quick-actions">${buttons.join('')}</div>`;
}

function applyObjectAction(action) {
  const ctx = selectedContext();
  if (!ctx) return;
  const { sel, key, arr, obj } = ctx;
  if (action === 'toggle-lock') {
    patch({ [key]: arr.map((item, i) => i === sel.idx ? { ...item, locked: !item.locked } : item) });
    return;
  }
  if (obj.locked) return;
  if (action === 'rotate-ccw' || action === 'rotate-cw') {
    const delta = action === 'rotate-cw' ? 60 : -60;
    patch({ [key]: arr.map((item, i) => i === sel.idx ? { ...item, angle: ((Number(item.angle) || 0) + delta + 360) % 360 } : item) });
  } else if (action === 'toggle-role' && sel.kind === 'monster' && obj.role !== 'boss') {
    patch({ [key]: arr.map((item, i) => i === sel.idx ? {
      ...item,
      role: item.role === 'elite' ? 'normal' : 'elite',
      _maxhpLevel: undefined,
      _maxhpRole: undefined,
      _hpLevel: undefined,
      _hpRole: undefined,
    } : item) });
  } else if (action === 'toggle-door' && sel.kind === 'overlay' && obj.role === 'door') {
    patch({ [key]: arr.map((item, i) => i === sel.idx ? { ...item, opened: !item.opened } : item) });
  } else if (action === 'remove') {
    patch({ [key]: arr.filter((_, i) => i !== sel.idx) });
  }
}

function controlsHtml() {
  return `
    <div class="mobile-panel-row mobile-panel-row--controls">
      <button class="mobile-btn" data-mobile-action="undo" ${canUndo() ? '' : 'disabled'}>Undo</button>
      <button class="mobile-btn" data-mobile-action="redo" ${canRedo() ? '' : 'disabled'}>Redo</button>
      <button class="mobile-icon-btn" data-mobile-action="zoom-out">-</button>
      <span class="mobile-zoom">${Math.round(getZoom() * 100)}%</span>
      <button class="mobile-icon-btn" data-mobile-action="zoom-in">+</button>
      <button class="mobile-btn" data-mobile-action="reset">Reset</button>
      <button class="mobile-btn mobile-btn--accent" data-mobile-action="share">BGG</button>
    </div>`;
}

function elementsHtml() {
  return `
    <div class="mobile-panel-row mobile-panel-row--elements">
      <div class="mobile-elements">
        ${ELEMENTS.map(({ key, label, color }, i) => {
          const value = state.elements?.[i] || 0;
          return `<button class="mobile-el-tile" data-mobile-element="${i}" data-state="${value}" title="${label}" style="--el-color:${color}">
            <img src="images/common/elements/${key}.png" alt="${label}">
          </button>`;
        }).join('')}
      </div>
      <button class="mobile-icon-btn mobile-end-round" data-mobile-action="end-round" title="End Round">↻</button>
    </div>`;
}

function selectionHtml() {
  const sel = selectedLabel();
  const canAdd = Boolean(uiState.selectedHex);
  const ctx = selectedContext();
  const canMove = Boolean(uiState.selected && ctx?.obj && !ctx.obj.locked);
  const detailsLabel = uiState.mobileDetailsOpen ? 'Close' : 'Details';
  return `
    <div class="mobile-selection${uiState.mobileMoveMode ? ' is-moving' : ''}">
      <div class="mobile-selection-copy">
        <div class="mobile-eyebrow">${sel.eyebrow}</div>
        <div class="mobile-title">${uiState.mobileMoveMode ? 'Tap destination hex' : sel.title}</div>
        <div class="mobile-meta">${uiState.mobileMoveMode ? 'Move mode active' : sel.meta}</div>
      </div>
      <div class="mobile-selection-actions">
        <button class="mobile-btn" data-mobile-action="move" ${canMove ? '' : 'disabled'}>${uiState.mobileMoveMode ? 'Cancel' : 'Move'}</button>
        <button class="mobile-btn" data-mobile-action="details" ${sel.hasSelection ? '' : 'disabled'}>${detailsLabel}</button>
        <button class="mobile-btn mobile-btn--accent" data-mobile-action="add" ${canAdd ? '' : 'disabled'}>Add</button>
      </div>
      ${quickStatsHtml()}
      ${quickActionsHtml()}
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
    active === 'elements' ? elementsHtml() :
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

    const elementBtn = e.target.closest('[data-mobile-element]');
    if (elementBtn) {
      cycleElement(Number(elementBtn.dataset.mobileElement));
      return;
    }

    const statBtn = e.target.closest('[data-mobile-stat]');
    if (statBtn) {
      adjustQuickStat(statBtn.dataset.mobileStat, Number(statBtn.dataset.delta) || 0);
      return;
    }

    const objectAction = e.target.closest('[data-mobile-object-action]');
    if (objectAction) {
      applyObjectAction(objectAction.dataset.mobileObjectAction);
      return;
    }

    const action = e.target.closest('[data-mobile-action]')?.dataset.mobileAction;
    if (!action) return;
    if (action === 'undo') undo();
    else if (action === 'redo') redo();
    else if (action === 'zoom-out') setZoom(getZoom() - ZOOM_STEP);
    else if (action === 'zoom-in') setZoom(getZoom() + ZOOM_STEP);
    else if (action === 'reset') resetView();
    else if (action === 'share') document.getElementById('share-btn')?.click();
    else if (action === 'end-round') endOfRound();
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
