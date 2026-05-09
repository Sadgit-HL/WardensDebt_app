import {
  uiState, subscribeUI,
  toggleSection, openAddPanel, closeAddPanel, setAddTab,
  closeMobileDetails,
  toggleCondPicker, closeCondPicker,
  selectFromStack,
  clearSelection,
  selectWardensDebtMapTile,
} from './uiState.js';
import { state, patch, subscribe } from './state.js';
import { centerBoardPoint } from './controls.js';
import { ROTATION_STEP } from './rotation.js';
import {
  getWardensDebtRuntime,
  subscribeWardensDebtRuntime,
  updateWardensDebtGameStateViaAction,
} from './wardensDebt/runtime.js';
import { wardensDebtFigurePosition } from './wardensDebt/placement.js';
import { WARDENS_DEBT_MAP_TILES } from './wardensDebt/mapTiles.js';

// ─── WD kind helpers ──────────────────────────────────────────────────────────

const WARDENS_DEBT_KIND_MAP = {
  'wd-convict': { stateKey: 'convicts', label: 'Convict' },
  'wd-enemy':   { stateKey: 'enemies',  label: 'Monster' },
};

const WARDENS_DEBT_PLACEHOLDERS = {
  convict: { name: 'Placeholder Convict', color: '#72ab84' },
  enemy:   { name: 'Placeholder Enemy',   color: '#e35f5f' },
  maptile: { name: 'Placeholder Maptile', color: '#b7a06a' },
};

function isWardensDebtKind(kind) {
  return Boolean(WARDENS_DEBT_KIND_MAP[kind]);
}

function wardensDebtSelectionContext(sel = uiState.selected) {
  if (!sel || !isWardensDebtKind(sel.kind)) return null;
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState) return null;
  const stateKey = WARDENS_DEBT_KIND_MAP[sel.kind].stateKey;
  const arr = runtime.gameState[stateKey] || [];
  const obj = arr[sel.idx];
  return obj ? { sel, runtime, arr, obj, stateKey } : null;
}

function wardensDebtConditionLabel(runtime, conditionId) {
  return runtime.index?.conditionDefsById.get(conditionId)?.name || conditionId;
}

function updateWardensDebtMapTile(tileId, updater) {
  const runtime = getWardensDebtRuntime();
  const tile = (runtime.gameState?.board?.mapTiles || []).find(t => t.id === tileId);
  if (!tile) return null;
  const updates = updater({ ...tile });
  return updateWardensDebtGameStateViaAction('update-maptile', { tileId, updates });
}

function deleteWardensDebtMapTile(tileId) {
  return updateWardensDebtGameStateViaAction('delete-maptile', { tileId });
}

function updateWardensDebtFigurePosition(figureId, updater) {
  const runtime = getWardensDebtRuntime();
  const current = runtime.gameState?.board?.figurePositions?.[figureId] || { x: 0, y: 0 };
  const updated = updater({ ...current });
  return updateWardensDebtGameStateViaAction('move-figure', { figureId, cell: updated });
}

function deleteWardensDebtFigure(figureId) {
  return updateWardensDebtGameStateViaAction('delete-figure', { figureId });
}

function addWardensDebtPlaceholderFigure(kind, defId) {
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState || !runtime.index) return false;

  const cellSelection = uiState.selectedCell;
  const position = cellSelection
    ? { x: Math.max(0, Math.round(Number(cellSelection.x) || 0)), y: Math.max(0, Math.round(Number(cellSelection.y) || 0)) }
    : { x: 0, y: 0 };

  if (kind === 'convict') {
    const source = (defId && runtime.index.convictDefsById.get(defId))
      || [...runtime.index.convictDefsById.values()][0];
    if (!source) return false;
    const nextIndex = runtime.gameState.convicts.length + 1;
    const convictId = `convict-${nextIndex}`;
    const convict = {
      id: convictId,
      name: `${WARDENS_DEBT_PLACEHOLDERS.convict.name} ${nextIndex}`,
      convictDefId: source.id,
      currentHealth: source.health ?? 0,
      maxHealth: source.health ?? 0,
      handSize: source.handSize ?? 0,
      starterSkillCardIds: [...(source.starterSkillCardIds || [])],
      hand: [], drawPile: [], discardPile: [], banished: [],
      resources: 0, guards: 0, conditions: [],
    };
    return updateWardensDebtGameStateViaAction('add-convict', { convictId, convict, position });
  }

  if (kind === 'enemy') {
    const source = (defId && runtime.index.enemyDefsById.get(defId))
      || [...runtime.index.enemyDefsById.values()][0];
    if (!source) return false;
    const nextIndex = runtime.gameState.enemies.length + 1;
    const enemyId = `enemy-${nextIndex}`;
    const enemy = {
      id: enemyId,
      enemyDefId: source.id,
      name: `${WARDENS_DEBT_PLACEHOLDERS.enemy.name} ${nextIndex}`,
      currentHealth: source.health ?? 0,
      maxHealth: source.health ?? 0,
      attack: source.attack ?? 0,
      conditions: [], zone: 'board',
    };
    return updateWardensDebtGameStateViaAction('add-enemy', { enemyId, enemy, position });
  }

  return false;
}

function addWardensDebtPlaceholderMapTile(tileId) {
  if (!tileId || !WARDENS_DEBT_MAP_TILES[tileId]) return false;
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState) return false;
  const def = WARDENS_DEBT_MAP_TILES[tileId];
  const cell = uiState.selectedCell;
  const x = cell ? Math.round(cell.x) : def.x;
  const y = cell ? Math.round(cell.y) : def.y;

  return updateWardensDebtGameStateViaAction('add-maptile', { tileId, x, y });
}

function updateWardensDebtSelectedStat(kind, idx, field, newVal) {
  const value = Math.max(0, Number(newVal) || 0);
  if (kind === 'wd-convict') {
    return updateWardensDebtGameStateViaAction('update-convict-stat', { convictIndex: idx, field, value });
  }
  if (kind === 'wd-enemy') {
    return updateWardensDebtGameStateViaAction('update-enemy-stat', { enemyIndex: idx, field, value });
  }
  return null;
}

function updateWardensDebtSelectedConditions(kind, idx, updater) {
  if (kind === 'wd-convict') {
    const runtime = getWardensDebtRuntime();
    const convict = (runtime.gameState?.convicts || [])[idx];
    if (!convict) return null;
    const conditions = updater(Array.isArray(convict.conditions) ? convict.conditions : []);
    return updateWardensDebtGameStateViaAction('update-convict-conditions', { convictIndex: idx, conditions });
  }
  if (kind === 'wd-enemy') {
    const runtime = getWardensDebtRuntime();
    const enemy = (runtime.gameState?.enemies || [])[idx];
    if (!enemy) return null;
    const conditions = updater(Array.isArray(enemy.conditions) ? enemy.conditions : []);
    return updateWardensDebtGameStateViaAction('update-enemy-conditions', { enemyIndex: idx, conditions });
  }
  return null;
}

const SHORTCUTS = [
  ['A', 'Toggle add panel'],
  ['/', 'Focus add search'],
  ['Esc', 'Close panels or clear selection'],
  ['?', 'Open shortcuts'],
  ['Space+drag', 'Pan board'],
  ['Wheel', 'Zoom board'],
  ['0', 'Reset view'],
  ['H', 'Frame selected object'],
  ['R', 'Rotate selected object'],
  ['L', 'Lock or unlock selected object'],
  ['Del / Backspace', 'Delete selected object'],
  ['Alt+drag', 'Copy dragged figure'],
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Y', 'Redo'],
];

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSidebar() {
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn   = document.getElementById('settings-btn');

  // Skip if sidebar elements don't exist (using new layout with info-panel)
  if (!settingsPanel || !settingsBtn) return;

  function buildSettingsPanel() {
    settingsPanel.innerHTML =
      `<div class="settings-section">` +
      `<div class="settings-label">Display</div>` +
      `<button class="sg-row sg-toggle-row${state.showGridLabels ? ' active' : ''}" data-toggle="showGridLabels">` +
      `<span class="sg-row-label">Grid labels</span>` +
      `<span class="sg-switch" aria-hidden="true"></span>` +
      `</button>` +
      `</div>` +
      `<div class="settings-section">` +
      `<div class="settings-label">Help</div>` +
      `<button class="sg-row sg-help-row" data-action="show-shortcuts">` +
      `<span class="sg-row-label">Keyboard shortcuts</span>` +
      `<span class="sg-help-key">?</span>` +
      `</button>` +
      `</div>`;
  }

  buildSettingsPanel();

  settingsPanel.addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      patch({ [toggle.dataset.toggle]: !state[toggle.dataset.toggle] });
      buildSettingsPanel();
      return;
    }
    if (e.target.closest('[data-action="show-shortcuts"]')) {
      showShortcutOverlay();
    }
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
    settingsBtn.classList.toggle('active');
  });

  window.addEventListener('keydown', e => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (uiState.selectedWdMapTile?.id) {
      const tileId = uiState.selectedWdMapTile.id;
      const runtime = getWardensDebtRuntime();
      const tile = runtime.gameState?.board?.mapTiles?.find(t => t.id === tileId);
      if (tile?.locked) return;
      e.preventDefault();
      deleteWardensDebtMapTile(tileId);
      clearSelection();
      return;
    }

    const sel = uiState.selected;
    if (!sel || !isWardensDebtKind(sel.kind)) return;
    const ctx = wardensDebtSelectionContext(sel);
    if (!ctx) return;
    const figureId = sel.kind === 'wd-convict' ? ctx.obj.id : ctx.obj.id;
    const pos = ctx.runtime.gameState?.board?.figurePositions?.[figureId];
    if (pos?.locked) return;
    e.preventDefault();
    deleteWardensDebtFigure(figureId);
    clearSelection();
  });

  window.addEventListener('keydown', e => {
    if (isTypingField(e.target)) return;

    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      showShortcutOverlay();
      e.preventDefault();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    if (key === 'escape') {
      if (document.getElementById('shortcut-overlay')?.classList.contains('open')) hideShortcutOverlay();
      else if (uiState.condPickerOpen) closeCondPicker();
      else if (uiState.addPanelOpen) closeAddPanel();
      else clearSelection();
      e.preventDefault();
    } else if (key === 'a') {
      if (uiState.selectedHex || uiState.selectedCell) {
        if (uiState.addPanelOpen) closeAddPanel();
        else openAddPanel();
        e.preventDefault();
      }
    } else if (key === '/') {
      if (uiState.addPanelOpen) { focusAddSearch(); e.preventDefault(); }
    } else if (key === 'l') {
      if (toggleSelectedLock()) e.preventDefault();
    } else if (key === '+' || key === '=') {
      if (adjustSelectedHp(1)) e.preventDefault();
    } else if (key === '-' || key === '_') {
      if (adjustSelectedHp(-1)) e.preventDefault();
    } else if (key === 'g') {
      patch({ showGridLabels: !state.showGridLabels });
      buildSettingsPanel();
      e.preventDefault();
    } else if (key === 'h') {
      if (frameSelectedHex()) e.preventDefault();
    }
  });

  subscribeUI(render);
  subscribe(render);
  subscribeWardensDebtRuntime(render);
  const panel = document.getElementById('sidebar-panel');
  if (panel) {
    panel.addEventListener('click', handlePanelClick);
      panel.addEventListener('input', e => {
        if (e.target.id !== 'add-search') return;
        const pos = e.target.selectionStart;
        uiState.addPanelSearch = e.target.value;
        render();
        const input = document.getElementById('add-search');
        if (input) { input.focus(); input.setSelectionRange(pos, pos); }
      });
  }

  render();
}

function focusAddSearch() {
  const input = document.getElementById('add-search');
  if (!input) return;
  input.focus(); input.select();
}

// ─── Event handling ───────────────────────────────────────────────────────────

function editCounter(span) {
  const field = span.dataset.field;
  const oldVal = span.textContent;
  const input = document.createElement('input');
  input.type = 'number'; input.min = '0'; input.value = oldVal;
  input.style.width = '50px'; input.style.textAlign = 'center';
  span.setAttribute('data-editing', 'true');
  span.replaceWith(input);
  input.focus(); input.select();

  function finalize() {
    const newVal = Math.max(0, Number(input.value) || 0);
    const sel = uiState.selected;
    if (sel && isWardensDebtKind(sel.kind) && (field === 'hp' || field === 'maxhp')) {
      updateWardensDebtSelectedStat(sel.kind, sel.idx, field, newVal);
    }
  }
  input.addEventListener('blur', finalize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finalize();
    if (e.key === 'Escape') { input.replaceWith(span); span.removeAttribute('data-editing'); }
  });
}

export function handlePanelClick(e) {
  const editableCounter = e.target.closest('.sp-counter-editable');
  if (editableCounter && !editableCounter.hasAttribute('data-editing')) {
    editCounter(editableCounter);
    return;
  }

  const tabBtn = e.target.closest('[data-set-tab]');
  if (tabBtn) { setAddTab(tabBtn.dataset.setTab); return; }

  const toggleBtn = e.target.closest('[data-toggle-section]');
  if (toggleBtn) { toggleSection(toggleBtn.dataset.toggleSection); return; }

  const addCond = e.target.closest('[data-add-cond]');
  if (addCond) { addCondition(addCond.dataset.addCond); closeCondPicker(); return; }

  const condToggle = e.target.closest('[data-action="toggle-cond-picker"]');
  if (condToggle) { toggleCondPicker(); return; }

  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) handleAction(actionBtn.dataset);
}

function addCondition(cond) {
  const sel = uiState.selected;
  if (!sel || !isWardensDebtKind(sel.kind)) return;
  const ctx = wardensDebtSelectionContext(sel);
  if (!ctx || !ctx.runtime.index?.conditionDefsById.has(cond)) return;
  const existing = Array.isArray(ctx.obj.conditions) ? ctx.obj.conditions : [];
  if (existing.includes(cond)) return;
  updateWardensDebtSelectedConditions(sel.kind, sel.idx, current => [...current, cond]);
}

function isTypingField(target) {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function showShortcutOverlay() {
  let overlay = document.getElementById('shortcut-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'shortcut-overlay';
    overlay.innerHTML = `
      <div class="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
        <div class="shortcut-header">
          <h2 id="shortcut-title">Shortcuts</h2>
          <button class="shortcut-close" type="button" aria-label="Close shortcuts">×</button>
        </div>
        <div class="shortcut-list">
          ${SHORTCUTS.map(([key, label]) =>
            `<div class="shortcut-row"><kbd>${escHtml(key)}</kbd><span>${escHtml(label)}</span></div>`
          ).join('')}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('.shortcut-close')) hideShortcutOverlay();
    });
  }
  overlay.classList.add('open');
}

function hideShortcutOverlay() {
  document.getElementById('shortcut-overlay')?.classList.remove('open');
}

function toggleSelectedLock() {
  if (uiState.selectedWdMapTile?.id) {
    updateWardensDebtMapTile(uiState.selectedWdMapTile.id, tile => ({ ...tile, locked: !tile.locked }));
    return true;
  }
  const sel = uiState.selected;
  if (!sel || !isWardensDebtKind(sel.kind)) return false;
  const ctx = wardensDebtSelectionContext(sel);
  if (!ctx) return false;
  const figureId = sel.kind === 'wd-convict' ? ctx.obj.id : ctx.obj.id;
  updateWardensDebtFigurePosition(figureId, pos => ({ ...pos, locked: !pos.locked }));
  return true;
}

function adjustSelectedHp(delta) {
  const sel = uiState.selected;
  if (!sel || !isWardensDebtKind(sel.kind)) return false;
  const ctx = wardensDebtSelectionContext(sel);
  if (!ctx) return false;
  const currentHp = Number(ctx.obj.currentHealth) || 0;
  updateWardensDebtSelectedStat(sel.kind, sel.idx, 'hp', currentHp + delta);
  return true;
}

function frameSelectedHex() {
  if (uiState.selectedCell) {
    centerBoardPoint(uiState.selectedCell.x, uiState.selectedCell.y);
    return true;
  }
  if (uiState.selectedWdMapTile?.id) {
    const runtime = getWardensDebtRuntime();
    const tile = (runtime.gameState?.board?.mapTiles || []).find(t => t.id === uiState.selectedWdMapTile.id);
    if (tile) { centerBoardPoint(tile.x, tile.y); return true; }
  }
  return false;
}

function handleAction(dataset) {
  const action = dataset.action;
  if (action === 'open-add')  { openAddPanel(); return; }
  if (action === 'close-add') { closeAddPanel(); return; }
  if (action === 'close-mobile-details') { closeMobileDetails(); return; }
  if (action === 'wd-select') { selectFromStack(dataset.kind, Number(dataset.idx)); return; }
  if (action === 'wd-show-roster') { clearSelection(); return; }
  if (action === 'wd-add-figure') {
    addWardensDebtPlaceholderFigure(dataset.figureKind, dataset.figureDefId);
    return;
  }
  if (action === 'wd-add-maptile') {
    addWardensDebtPlaceholderMapTile(dataset.tileId);
    return;
  }
  if (action === 'wd-rotate-ccw' || action === 'wd-rotate-cw' || action === 'wd-toggle-lock' || action === 'wd-remove-maptile') {
    const selectedTile = uiState.selectedWdMapTile;
    if (!selectedTile?.id) return;
    if (action === 'wd-rotate-ccw' || action === 'wd-rotate-cw') {
      updateWardensDebtMapTile(selectedTile.id, tile => ({
        ...tile,
        angle: ((Number(tile.angle) || 0) + (action === 'wd-rotate-cw' ? ROTATION_STEP : -ROTATION_STEP) + 360) % 360,
      }));
      return;
    }
    if (action === 'wd-toggle-lock') {
      updateWardensDebtMapTile(selectedTile.id, tile => ({ ...tile, locked: !tile.locked }));
      return;
    }
    if (action === 'wd-remove-maptile') {
      deleteWardensDebtMapTile(selectedTile.id);
      clearSelection();
      return;
    }
  }

  const sel = uiState.selected;
  if (!sel || !isWardensDebtKind(sel.kind)) return;
  const ctx = wardensDebtSelectionContext(sel);
  if (!ctx) return;

  const statMatch = action.match(/^stat-(hp|maxhp)-(inc|dec)$/);
  if (statMatch) {
    const field = statMatch[1];
    const delta = statMatch[2] === 'inc' ? 1 : -1;
    const currentValue = field === 'hp'
      ? Number(ctx.obj.currentHealth) || 0
      : Number(ctx.obj.maxHealth) || 0;
    updateWardensDebtSelectedStat(sel.kind, sel.idx, field, currentValue + delta);
    return;
  }

  if (action === 'remove-condition') {
    updateWardensDebtSelectedConditions(sel.kind, sel.idx, conditions =>
      conditions.filter(conditionId => conditionId !== dataset.cond)
    );
    return;
  }

  if (action === 'rotate-ccw' || action === 'rotate-cw' || action === 'toggle-lock' || action === 'remove') {
    const figureId = sel.kind === 'wd-convict' ? ctx.obj.id : ctx.obj.id;
    const current = ctx.runtime.gameState?.board?.figurePositions?.[figureId] || {};
    if (action === 'rotate-ccw' || action === 'rotate-cw') {
      if (current.locked) return;
      updateWardensDebtFigurePosition(figureId, pos => ({
        ...pos,
        angle: ((Number(pos.angle) || 0) + (action === 'rotate-cw' ? ROTATION_STEP : -ROTATION_STEP) + 360) % 360,
      }));
      return;
    }
    if (action === 'toggle-lock') {
      updateWardensDebtFigurePosition(figureId, pos => ({ ...pos, locked: !pos.locked }));
      return;
    }
    if (action === 'remove') {
      if (current.locked) return;
      deleteWardensDebtFigure(figureId);
      clearSelection();
    }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const panel = document.getElementById('sidebar-panel');

  // Skip if sidebar doesn't exist (using new layout with info-panel)
  if (!panel) return;

  const { selected, selectedWdMapTile, addPanelOpen } = uiState;
  const wdRuntime = getWardensDebtRuntime();
  const sidebarW = window.matchMedia('(max-width: 760px)').matches
    ? '0px'
    : addPanelOpen ? '480px' : '280px';
  document.documentElement.style.setProperty('--sidebar-w', sidebarW);

  if (addPanelOpen) {
    panel.innerHTML = addPanel();
    return;
  }

  if (!uiState.selectedHex && !uiState.selectedCell && !selectedWdMapTile && !selected) {
    panel.innerHTML = wardensDebtRosterPanel(wdRuntime);
    return;
  }

  let html = '';
  if (selectedWdMapTile) {
    html = wardensDebtMapTilePanel(wdRuntime, selectedWdMapTile.id);
  } else if (selected) {
    html = objectPanel(selected.kind, selected.idx);
  } else if (uiState.selectedCell) {
    html = `<div class="sp-obj-header sp-obj-header--stack"><div class="sp-name">CELL EMPTY</div></div>`;
  }

  if (selected && isWardensDebtKind(selected.kind)) {
    html += `<div class="sp-divider"></div><button class="sp-add-btn" data-action="wd-show-roster">Wardens Debt Roster</button>`;
  } else {
    html += `<div class="sp-divider"></div><button class="sp-add-btn" data-action="open-add">+</button>`;
  }
  if (uiState.mobileDetailsOpen && !uiState.addPanelOpen) {
    html += `<div class="sp-divider"></div><button class="sp-add-btn" data-action="close-mobile-details">Close</button>`;
  }
  panel.innerHTML = html;
}

// ─── Object panels ────────────────────────────────────────────────────────────

function objectPanel(kind, idx) {
  if (isWardensDebtKind(kind)) return wardensDebtObjectPanel(kind, idx);
  return hint('Select a figure or map tile');
}

function wardensDebtRosterPanel(runtime) {
  if (runtime.status === 'loading') {
    return `
      <div class="sp-obj-header sp-obj-header--stack">
        <div class="sp-type">Wardens Debt</div>
        <div class="sp-name">Loading</div>
      </div>
      <div class="sp-meta-line">Loading prototype scenario...</div>
    `;
  }
  if (runtime.status === 'error') {
    return `
      <div class="sp-obj-header sp-obj-header--stack">
        <div class="sp-type">Wardens Debt</div>
        <div class="sp-name">Runtime error</div>
      </div>
      <div class="sp-meta-line">${escHtml(runtime.error || 'Unknown runtime error.')}</div>
    `;
  }
  if (runtime.status !== 'ready' || !runtime.gameState) {
    return hint('Wardens Debt runtime unavailable');
  }

  const convicts = runtime.gameState.convicts.map((convict, idx) => `
    <button class="sp-stack-select sp-wd-roster-btn" data-action="wd-select" data-kind="wd-convict" data-idx="${idx}">
      <span class="sp-stack-info">
        <span class="sp-stack-type">Convict</span>
        <span class="sp-stack-name">${escHtml(convict.name)}</span>
      </span>
      <span class="sp-stack-chevron">${Number(convict.currentHealth) || 0}/${Number(convict.maxHealth) || 0}</span>
    </button>
  `).join('');

  const enemies = runtime.gameState.enemies.map((enemy, idx) => `
    <button class="sp-stack-select sp-wd-roster-btn" data-action="wd-select" data-kind="wd-enemy" data-idx="${idx}">
      <span class="sp-stack-info">
        <span class="sp-stack-type">Monster</span>
        <span class="sp-stack-name">${escHtml(enemy.name)}</span>
      </span>
      <span class="sp-stack-chevron">${Number(enemy.currentHealth) || 0}/${Number(enemy.maxHealth) || 0}</span>
    </button>
  `).join('');

  return `
    <div class="sp-obj-header sp-obj-header--stack">
      <div class="sp-type">Wardens Debt</div>
      <div class="sp-name">${escHtml(runtime.scenarioName || 'Prototype Scenario')}</div>
    </div>
    <div class="sp-subhead">Convicts</div>
    <div class="sp-stack-list">${convicts || '<div class="sp-meta-line">No convicts in the current scenario.</div>'}</div>
    <div class="sp-subhead">Monsters</div>
    <div class="sp-stack-list">${enemies || '<div class="sp-meta-line">No monsters in the current scenario.</div>'}</div>
  `;
}

export function wardensDebtObjectPanel(kind, idx) {
  const ctx = wardensDebtSelectionContext({ kind, idx });
  if (!ctx) return hint('Wardens Debt actor unavailable');

  const { runtime, obj } = ctx;
  const isConvict = kind === 'wd-convict';
  const conditions = Array.isArray(obj.conditions) ? obj.conditions : [];
  const position = wardensDebtFigurePosition(runtime, isConvict ? obj.id : obj.id);
  const locked = Boolean(position?.locked);
  const angle = Number(position?.angle) || 0;
  const available = [...(runtime.index?.conditionDefsById?.keys() || [])]
    .filter(conditionId => !conditions.includes(conditionId));

  const counter = (label, field, value, color) => `
    <div class="sp-stat-tile sp-stat-tile--${field}" style="--stat-color:${color}">
      <span class="sp-stat-label"><span>${label}</span></span>
      <div class="sp-counter">
        <button class="sp-counter-btn" data-action="stat-${field}-dec">−</button>
        <span class="sp-counter-val sp-counter-editable" data-field="${field}" data-value="${value}">${value}</span>
        <button class="sp-counter-btn" data-action="stat-${field}-inc">+</button>
      </div>
    </div>`;

  const activeConditions = conditions.map(conditionId => `
    <div class="sp-wd-condition">
      <span class="sp-wd-condition-name">${escHtml(wardensDebtConditionLabel(runtime, conditionId))}</span>
      <button class="sp-cond-remove" data-action="remove-condition" data-cond="${conditionId}">×</button>
    </div>
  `).join('');

  const availableConditions = available.map(conditionId => `
    <button class="sp-wd-condition-pick" data-add-cond="${conditionId}">
      ${escHtml(wardensDebtConditionLabel(runtime, conditionId))}
    </button>
  `).join('');

  const hpValue = Number(obj.currentHealth) || 0;

  return `
    <button class="sp-panel-back" data-action="wd-show-roster">&#8592; Roster</button>
    <div class="sp-obj-header sp-obj-header--selected${isConvict ? '' : ' sp-obj-header--enemy'}">
      <div class="sp-obj-info">
        <div class="sp-title-row">
          <div class="sp-type">${isConvict ? 'Convict' : 'Enemy'}</div>
        </div>
        <div class="sp-name">${escHtml(obj.name || (isConvict ? `Convict ${idx + 1}` : `Enemy ${idx + 1}`))}</div>
        <div class="sp-meta-line">${escHtml(isConvict ? obj.convictDefId : obj.enemyDefId)}${angle ? ` · ${angle}°` : ''}</div>
      </div>
    </div>
    <div class="sp-action-section">
      <div class="sp-subhead">Object</div>
      <div class="sp-toolbar">
        <button class="sp-icon-btn" data-action="rotate-ccw" ${locked ? 'disabled' : ''} title="Rotate CCW">&#8634;</button>
        <button class="sp-icon-btn" data-action="rotate-cw" ${locked ? 'disabled' : ''} title="Rotate CW">&#8635;</button>
        <button class="sp-icon-btn${locked ? ' is-locked' : ''}" data-action="toggle-lock" title="${locked ? 'Unlock' : 'Lock'}">${locked ? '&#128274;' : '&#128275;'}</button>
        <button class="sp-icon-btn sp-icon-btn--danger" data-action="remove" title="Remove" ${locked ? 'disabled' : ''}>&#215;</button>
      </div>
    </div>
    <div class="sp-stats sp-stats--enemy">
      <div class="sp-subhead">Combat</div>
      <div class="sp-stat-grid${isConvict ? ' sp-stat-grid--mercenary' : ' sp-stat-grid--enemy'}">
        ${counter('HP', 'hp', hpValue, '#c0392b')}
        ${counter('Max HP', 'maxhp', Number(obj.maxHealth) || 0, '#2e7d32')}
      </div>
      <div class="sp-cond-section">
        <div class="sp-subhead sp-subhead--conditions">Conditions</div>
        <div class="sp-cond-row">
          ${conditions.length > 0 ? `<div class="sp-wd-condition-list">${activeConditions}</div>` : '<div class="sp-meta-line">No conditions.</div>'}
          ${available.length > 0 ? `
            <button class="sp-cond-toggle${uiState.condPickerOpen ? ' is-open' : ''}" data-action="toggle-cond-picker">+ Condition</button>
          ` : ''}
        </div>
        ${uiState.condPickerOpen && available.length > 0 ? `
          <div class="sp-wd-condition-picker">${availableConditions}</div>
        ` : ''}
      </div>
    </div>
  `;
}

export function wardensDebtMapTilePanel(runtime, tileId) {
  if (runtime.status !== 'ready' || !runtime.gameState) return hint('Wardens Debt runtime unavailable');
  const mapTile = (runtime.gameState.board?.mapTiles || []).find(tile => tile.id === tileId) || null;
  if (!mapTile) return hint('Map tile unavailable');
  const locked = Boolean(mapTile.locked);

  return `
    <button class="sp-panel-back" data-action="wd-show-roster">&#8592; Roster</button>
    <div class="sp-obj-header sp-obj-header--selected">
      <div class="sp-obj-info">
        <div class="sp-title-row"><div class="sp-type">Maptile</div></div>
        <div class="sp-name">${escHtml(mapTile.id)}</div>
        <div class="sp-meta-line">${escHtml(`${Math.round(mapTile.x)}, ${Math.round(mapTile.y)}`)}</div>
      </div>
    </div>
    <div class="sp-stats sp-stats--monster">
      <div class="sp-subhead">Placement</div>
      <div class="sp-meta-line">Drag the tile on the map to reposition it.</div>
      <div class="sp-subhead">Object</div>
      <div class="sp-toolbar">
        <button class="sp-icon-btn" data-action="wd-rotate-ccw" ${locked ? 'disabled' : ''} title="Rotate CCW">&#8634;</button>
        <button class="sp-icon-btn" data-action="wd-rotate-cw" ${locked ? 'disabled' : ''} title="Rotate CW">&#8635;</button>
        <button class="sp-icon-btn${locked ? ' is-locked' : ''}" data-action="wd-toggle-lock" title="${locked ? 'Unlock' : 'Lock'}">${locked ? '&#128274;' : '&#128275;'}</button>
        <button class="sp-icon-btn sp-icon-btn--danger" data-action="wd-remove-maptile" title="Remove" ${locked ? 'disabled' : ''}>&#215;</button>
      </div>
    </div>
  `;
}

// ─── Add panel ────────────────────────────────────────────────────────────────

const WD_TABS = [
  { key: 'convicts', label: 'Convicts'  },
  { key: 'enemies',  label: 'Enemies'   },
  { key: 'objects',  label: 'Objects'   },
  { key: 'maptiles', label: 'Map Tiles' },
];
const WD_TAB_KEYS = new Set(WD_TABS.map(t => t.key));

function wdConvictsTabBody(runtime, placement) {
  const defs = [...runtime.index.convictDefsById.values()];
  if (!defs.length) return hint('No convict definitions found.');
  return `
    <div class="ap-grid">
      ${defs.map(def => `<button class="ap-item-btn ap-item-btn--figure" data-action="wd-add-figure" data-figure-kind="convict" data-figure-def-id="${escHtml(def.id)}" title="${escHtml(def.name)}">${escHtml(def.name)}</button>`).join('')}
    </div>
  `;
}

function wdEnemiesTabBody(runtime, placement) {
  const cards = [...runtime.index.enemyDefsById.values()];
  if (!cards.length) return hint('No enemy cards found.');
  return `
    <div class="ap-grid">
      ${cards.map(card => `<button class="ap-item-btn ap-item-btn--figure" data-action="wd-add-figure" data-figure-kind="enemy" data-figure-def-id="${escHtml(card.id)}" title="${escHtml(card.name)}">${escHtml(card.name)}</button>`).join('')}
    </div>
  `;
}

function wdObjectsTabBody(runtime) {
  const items = [...runtime.index.itemDefsById.values()];
  if (!items.length) return hint('No item cards found.');
  return `
    <div class="ap-grid">
      ${items.map(item => `<button class="ap-item-btn" title="${escHtml(item.name)}" disabled>${escHtml(item.name)}</button>`).join('')}
    </div>
  `;
}

function wdMapTilesTabBody() {
  return `
    <div class="ap-grid">
      ${Object.keys(WARDENS_DEBT_MAP_TILES).map(tileId => {
        const label = tileId.replace('tile-', '');
        return `<button class="ap-item-btn ap-item-btn--tile" data-action="wd-add-maptile" data-tile-id="${tileId}" title="${escHtml(label)}">${escHtml(label)}</button>`;
      }).join('')}
    </div>
  `;
}

function wdSearchBody(query, runtime, placement) {
  const q = query.toLowerCase();
  const results = [];
  for (const def of runtime.index.convictDefsById.values()) {
    if (def.name.toLowerCase().includes(q))
      results.push(`<button class="ap-item-btn ap-item-btn--figure" data-action="wd-add-figure" data-figure-kind="convict" data-figure-def-id="${escHtml(def.id)}">${escHtml(def.name)}</button>`);
  }
  for (const card of runtime.index.enemyDefsById.values()) {
    if (card.name.toLowerCase().includes(q))
      results.push(`<button class="ap-item-btn ap-item-btn--figure" data-action="wd-add-figure" data-figure-kind="enemy" data-figure-def-id="${escHtml(card.id)}">${escHtml(card.name)}</button>`);
  }
  for (const tileId of Object.keys(WARDENS_DEBT_MAP_TILES)) {
    const label = tileId.replace('tile-', '');
    if (label.toLowerCase().includes(q))
      results.push(`<button class="ap-item-btn ap-item-btn--tile" data-action="wd-add-maptile" data-tile-id="${tileId}">${escHtml(label)}</button>`);
  }
  if (!results.length) return `<div class="ap-empty">No results for "${escHtml(query)}"</div>`;
  return `<div class="ap-grid">${results.join('')}</div>`;
}

export function addPanel() {
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState) return hint('Wardens Debt runtime unavailable');

  const cellSelection = uiState.selectedCell;
  const placement = cellSelection
    ? { x: Math.round(cellSelection.x), y: Math.round(cellSelection.y) }
    : null;
  const cellLabel = placement ? `${placement.x}, ${placement.y}` : 'No cell selected — placed at origin';

  const search = uiState.addPanelSearch;
  const rawTab = uiState.addPanelTab;
  const tab = WD_TAB_KEYS.has(rawTab) ? rawTab : 'convicts';

  const tabsHtml = WD_TABS.map(t =>
    `<button class="ap-tab${t.key === tab && !search ? ' is-active' : ''}" data-set-tab="${t.key}">${t.label}</button>`
  ).join('');

  let body = '';
  if (search)              body = wdSearchBody(search, runtime, placement);
  else if (tab === 'convicts') body = wdConvictsTabBody(runtime, placement);
  else if (tab === 'enemies')  body = wdEnemiesTabBody(runtime, placement);
  else if (tab === 'objects')  body = wdObjectsTabBody(runtime);
  else if (tab === 'maptiles') body = wdMapTilesTabBody();

  return `
    <div class="sp-add-header">
      <button class="sp-panel-back" data-action="close-add">&#8592;</button>
      <span class="sp-add-title">Add</span>
    </div>
    <div class="sp-obj-header sp-obj-header--stack">
      <div class="sp-type">Wardens Debt</div>
      <div class="sp-name">${escHtml(cellLabel)}</div>
    </div>
    <div class="ap-sticky">
      <input id="add-search" class="ap-search" type="text"
             placeholder="Search…" value="${escHtml(search)}" autocomplete="off">
      <div class="ap-tabs" style="grid-template-columns:repeat(4,1fr)">${tabsHtml}</div>
    </div>
    ${body}
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hint(text) { return `<div class="sp-hint">${text}</div>`; }

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
