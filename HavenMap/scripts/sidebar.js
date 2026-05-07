import {
  uiState, subscribeUI,
  toggleSection, openAddPanel, closeAddPanel, setAddTab,
  rememberAdd,
  closeMobileDetails,
  toggleCondPicker, closeCondPicker,
  deselectObject, selectFromStack,
  selectHex, selectObject, showStack, showStackWithSelection, clearSelection,
} from './uiState.js';
import { state, patch, subscribe } from './state.js';
import { getShareMode, setShareMode, SHARE_MODES } from './share.js';
import { assetPath, TILES, OVERLAY_OBJECTS, MONSTERS, MERCENARIES, SUMMONS, CONDITIONS, GAME_ID, GAME_REGISTRY, getMonsterStats, getMonsterCount, generateStandeeNum } from './data.js';
import { colLabel, footprintHexes, hexCenter } from './hex.js';
import { centerBoardPoint } from './controls.js';
import { displayCurrentHp, displayMaxHp } from './hp.js';
import {
  getWardensDebtRuntime,
  subscribeWardensDebtRuntime,
  updateWardensDebtEnemy,
  updateWardensDebtConvict,
} from './wardensDebt/runtime.js';

// ─── Kind → state key + data table ───────────────────────────────────────────

const KIND_MAP = {
  tile:      { stateKey: 'tiles',       data: TILES           },
  mercenary: { stateKey: 'mercenaries', data: MERCENARIES     },
  summon:    { stateKey: 'summons',     data: SUMMONS         },
  monster:   { stateKey: 'monsters',    data: MONSTERS        },
  overlay:   { stateKey: 'overlays',    data: OVERLAY_OBJECTS },
};

function arrForKind(kind)        { return state[KIND_MAP[kind]?.stateKey] || []; }
function patchKind(kind, newArr) { patch({ [KIND_MAP[kind].stateKey]: newArr }); }

const WARDENS_DEBT_KIND_MAP = {
  'wd-convict': { stateKey: 'convicts', label: 'Convict' },
  'wd-enemy':  { stateKey: 'enemies', label: 'Monster' },
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
  return runtime.index?.conditionTokensById.get(conditionId)?.name || conditionId;
}

function updateWardensDebtSelectedStat(kind, idx, field, newVal) {
  const value = Math.max(0, Number(newVal) || 0);
  if (kind === 'wd-convict') {
    return updateWardensDebtConvict(idx, convict => ({
      ...convict,
      [field === 'hp' ? 'health' : 'maxHealth']: value,
    }));
  }
  if (kind === 'wd-enemy') {
    return updateWardensDebtEnemy(idx, enemy => ({
      ...enemy,
      [field === 'hp' ? 'currentHealth' : 'maxHealth']: value,
    }));
  }
  return null;
}

function updateWardensDebtSelectedConditions(kind, idx, updater) {
  if (kind === 'wd-convict') {
    return updateWardensDebtConvict(idx, convict => ({
      ...convict,
      conditions: updater(Array.isArray(convict.conditions) ? convict.conditions : []),
    }));
  }
  if (kind === 'wd-enemy') {
    return updateWardensDebtEnemy(idx, enemy => ({
      ...enemy,
      conditions: updater(Array.isArray(enemy.conditions) ? enemy.conditions : []),
    }));
  }
  return null;
}

function hpContextPatch(kind, obj) {
  if (kind === 'monster') return { _hpLevel: state.CurrentLevel, _hpRole: obj.role || 'normal' };
  if (kind === 'mercenary') return { _hpLevel: obj.level != null ? Number(obj.level) : 0 };
  return {};
}

function maxHpContextPatch(kind, obj) {
  if (kind === 'monster') return { _maxhpLevel: state.CurrentLevel, _maxhpRole: obj.role || 'normal' };
  if (kind === 'mercenary') return { _maxhpLevel: obj.level != null ? Number(obj.level) : 0 };
  return {};
}

// Role labels shown as the object type in the inspect panel
const ROLE_LABEL = {
  corridor:         'Corridor',
  wall:             'Wall',
  ice:              'Ice Terrain',
  difficult:        'Difficult Terrain',
  hazardous:        'Hazardous Terrain',
  door:             'Door',
  trap:             'Trap',
  'pressure-plate': 'Pressure Plate',
  obstacle:         'Obstacle',
  objective:        'Objective',
  loot:             'Loot',
  element:          'Element',
  'scenario-aid':   'Scenario Aid',
  'class-overlay':  'Class Overlay',
};

const ROLE_COLOR = {
  corridor:         '#888888',
  wall:             '#444444',
  ice:              '#aaddff',
  difficult:        '#9944cc',
  hazardous:        '#ff8800',
  door:             '#4488ff',
  trap:             '#ff2222',
  'pressure-plate': '#888888',
  obstacle:         '#44aa44',
  objective:        '#ffcc00',
  'class-overlay':  '#5c3317',
  normal:           '#ffffff',
  elite:            '#ffcc00',
  // loot, element, scenario-aid, boss: no color
};

function roleDot(role, hollow = false) {
  const color = ROLE_COLOR[role];
  if (!hollow && color) return `<span class="sp-role-dot" style="background:${color}"></span>`;
  const border = color ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.30)';
  return `<span class="sp-role-dot" style="background:transparent;border:${border}"></span>`;
}

const OVERLAY_ROLES = [
  'corridor','wall','ice','difficult','hazardous',
  'trap','pressure-plate','obstacle','objective','loot','element','scenario-aid','class-overlay',
];

const STACK_KIND_PRIORITY = { mercenary: 0, monster: 0, overlay: 1, tile: 2, summon: 3 };
const SHORTCUTS = [
  ['A', 'Toggle add panel'],
  ['/', 'Focus add search'],
  ['Esc', 'Close panels or clear selection'],
  ['?', 'Open shortcuts'],
  ['Space+drag', 'Pan board'],
  ['Wheel', 'Zoom board'],
  ['0', 'Reset view'],
  ['H', 'Frame selected hex or object'],
  ['R', 'Rotate selected object'],
  ['L', 'Lock or unlock selected object'],
  ['Del / Backspace', 'Delete selected object'],
  ['E', 'Normal or elite monster'],
  ['+ / -', 'Adjust current HP'],
  ['[ / ]', 'Cycle stacked objects'],
  ['Shift+[ / ]', 'Move selected object in stack order'],
  ['Ctrl+C', 'Copy selected object'],
  ['Ctrl+V', 'Paste copied object to selected hex'],
  ['Ctrl+D', 'Duplicate selected object'],
  ['Alt+drag', 'Copy dragged object'],
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Y', 'Redo'],
  ['G', 'Toggle grid labels'],
];

let copiedObject = null;

function objectType(kind, obj) {
  if (kind === 'tile')      return 'Map Tile';
  if (kind === 'mercenary') return 'Mercenary';
  if (kind === 'summon')    return 'Summon';
  if (kind === 'monster')   return obj?.role === 'boss' ? 'Boss' : 'Monster';
  if (kind === 'overlay')   return ROLE_LABEL[obj?.role] || 'Overlay';
  return kind;
}

function objectName(kind, obj) {
  const entry = KIND_MAP[kind]?.data?.byId.get(Number(obj.id));
  return titleCase(entry?.title ?? `${objectType(kind, obj)} #${obj.id}`);
}

function objectImageSrc(kind, obj) {
  const entry = KIND_MAP[kind]?.data?.byId.get(Number(obj.id));
  if (!entry) return null;
  if (kind === 'mercenary') return assetPath.mercenary(entry.title);
  if (kind === 'summon')    return assetPath.summon(entry.title);
  if (kind === 'monster')   return assetPath.monster(entry);
  if (kind === 'overlay')   return assetPath.overlay(entry);
  if (kind === 'tile')      return assetPath.tile(entry, obj.side || '');
  return null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSidebar() {
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn   = document.getElementById('settings-btn');

  function buildSettingsPanel() {
    settingsPanel.innerHTML =
      `<div class="settings-section">` +
      `<div class="settings-label">Scenario</div>` +
      `<div class="sg-row sg-row--primary">` +
      `<span class="sg-row-label">Difficulty</span>` +
      `<div class="sg-difficulty">` +
      `<button class="sg-level-btn" id="level-dec" title="Decrease difficulty">−</button>` +
      `<span class="sg-level-value" id="level-label">${state.CurrentLevel}</span>` +
      `<button class="sg-level-btn" id="level-inc" title="Increase difficulty">+</button>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `<div class="settings-section">` +
      `<div class="settings-label">Game</div>` +
      `<label class="sg-select-wrap">` +
      `<select class="sg-select" id="game-select" title="Select game">` +
      GAME_REGISTRY.map(g =>
        `<option value="${g.id}"${g.id === GAME_ID ? ' selected' : ''}>${g.name}</option>`
      ).join('') +
      `</select>` +
      `</label>` +
      `</div>` +
      `<div class="settings-section">` +
      `<div class="settings-label">Display</div>` +
      `<button class="sg-row sg-toggle-row${state.showGridLabels ? ' active' : ''}" data-toggle="showGridLabels">` +
      `<span class="sg-row-label">Grid labels</span>` +
      `<span class="sg-switch" aria-hidden="true"></span>` +
      `</button>` +
      `<button class="sg-row sg-toggle-row${state.showObjectLabels ? ' active' : ''}" data-toggle="showObjectLabels">` +
      `<span class="sg-row-label">Object labels</span>` +
      `<span class="sg-switch" aria-hidden="true"></span>` +
      `</button>` +
      `</div>` +
      `<div class="settings-section">` +
      `<div class="settings-label">Share</div>` +
      `<label class="sg-select-wrap">` +
      `<select class="sg-select" id="share-mode-select" title="Select share link type">` +
      `<option value="${SHARE_MODES.ISGD}"${getShareMode() === SHARE_MODES.ISGD ? ' selected' : ''}>is.gd short URL</option>` +
      `<option value="${SHARE_MODES.LZ}"${getShareMode() === SHARE_MODES.LZ ? ' selected' : ''}>LZ-string local URL</option>` +
      `</select>` +
      `</label>` +
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
      const key = toggle.dataset.toggle;
      if (!key) return;
      patch({ [key]: !state[key] });
      buildSettingsPanel();
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action?.dataset.action === 'show-shortcuts') {
      showShortcutOverlay();
      return;
    }
  });

  settingsPanel.addEventListener('change', e => {
    const shareSelect = e.target.closest('#share-mode-select');
    if (shareSelect) {
      setShareMode(shareSelect.value);
      buildSettingsPanel();
      return;
    }

    const select = e.target.closest('#game-select');
    if (!select || select.value === GAME_ID) return;
    const hasContent = state.tiles.length || state.monsters.length || state.mercenaries.length || state.overlays.length;
    const target = GAME_REGISTRY.find(g => g.id === select.value);
    if (hasContent && !confirm(`Switch to ${target.name}? The current map will be cleared.`)) {
      select.value = GAME_ID;
      return;
    }
    location.href = location.pathname + '?game=' + select.value;
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
    settingsBtn.classList.toggle('active');
  });

  window.addEventListener('keydown', e => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const sel = uiState.selected;
    if (!sel) return;
    const arr = arrForKind(sel.kind);
    const obj = arr[sel.idx];
    if (!obj || obj.locked) return;
    e.preventDefault();
    deselectObject();
    patchKind(sel.kind, arr.filter((_, i) => i !== sel.idx));
  });

  window.addEventListener('keydown', e => {
    if (isTypingField(e.target)) return;

    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      showShortcutOverlay();
      e.preventDefault();
      return;
    }

    if (handleClipboardShortcut(e)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    if (key === 'escape') {
      if (document.getElementById('shortcut-overlay')?.classList.contains('open')) hideShortcutOverlay();
      else if (uiState.condPickerOpen) closeCondPicker();
      else if (uiState.addPanelOpen) closeAddPanel();
      else clearSelection();
      e.preventDefault();
    } else if (key === 'a') {
      if (uiState.selectedHex) {
        if (uiState.addPanelOpen) closeAddPanel();
        else openAddPanel();
        e.preventDefault();
      }
    } else if (key === '/') {
      if (uiState.addPanelOpen) {
        focusAddSearch();
        e.preventDefault();
      }
    } else if (key === 'l') {
      if (toggleSelectedLock()) e.preventDefault();
    } else if (key === 'e') {
      if (toggleSelectedMonsterRole()) e.preventDefault();
    } else if (key === '+' || key === '=') {
      if (adjustSelectedHp(1)) e.preventDefault();
    } else if (key === '-' || key === '_') {
      if (adjustSelectedHp(-1)) e.preventDefault();
    } else if (e.code === 'BracketLeft' || e.code === 'BracketRight' || key === '[' || key === ']') {
      const dir = (e.code === 'BracketRight' || key === ']') ? 1 : -1;
      const handled = e.shiftKey ? moveSelectedInKind(dir) : cycleStackSelection(dir);
      if (handled) e.preventDefault();
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
  panel.addEventListener('click', handlePanelClick);

  // ── Stack drag-to-reorder ────────────────────────────────────────────────────
  let stackDragSrc = null;

  panel.addEventListener('dragstart', e => {
    const item = e.target.closest('.sp-stack-item[draggable]');
    if (!item) return;
    stackDragSrc = { kind: item.dataset.selectKind, idx: Number(item.dataset.selectIdx), pos: Number(item.dataset.stackPos) };
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('is-dragging');
  });

  panel.addEventListener('dragend', e => {
    e.target.closest('.sp-stack-item')?.classList.remove('is-dragging');
    panel.querySelectorAll('.sp-stack-item').forEach(el => el.classList.remove('drag-over'));
    stackDragSrc = null;
  });

  panel.addEventListener('dragover', e => {
    const item = e.target.closest('.sp-stack-item[draggable]');
    if (!item || !stackDragSrc) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    panel.querySelectorAll('.sp-stack-item').forEach(el => el.classList.remove('drag-over'));
    item.classList.add('drag-over');
  });

  panel.addEventListener('drop', e => {
    const item = e.target.closest('.sp-stack-item[draggable]');
    if (!item || !stackDragSrc) return;
    e.preventDefault();
    const destKind = item.dataset.selectKind;
    const destIdx  = Number(item.dataset.selectIdx);
    const destPos  = Number(item.dataset.stackPos);
    if (stackDragSrc.kind !== destKind || stackDragSrc.idx === destIdx) return;
    // Reorder within the kind's state array
    const arr = [...arrForKind(stackDragSrc.kind)];
    const [moved] = arr.splice(stackDragSrc.idx, 1);
    const insertAt = destIdx > stackDragSrc.idx ? destIdx - 1 : destIdx;
    arr.splice(insertAt, 0, moved);
    patchKind(stackDragSrc.kind, arr);
  });

  // Stat card hover zoom
  const zoom = document.createElement('div');
  zoom.id = 'stat-card-zoom';
  document.body.appendChild(zoom);

  panel.addEventListener('mouseover', e => {
    const card = e.target.closest('.sp-stat-card');
    if (!card || !card.src) return;
    const zoomW = Number(card.dataset.zoomW) || 400;
    zoom.style.width = zoomW + 'px';
    zoom.innerHTML = `<img src="${card.src}" alt="">`;
    zoom.style.display = 'block';
    positionZoom(card, zoomW);
  });
  panel.addEventListener('mouseout', e => {
    if (!e.relatedTarget?.closest('#stat-card-zoom, .sp-stat-card')) zoom.style.display = 'none';
  });
  zoom.addEventListener('mouseout', e => {
    if (!e.relatedTarget?.closest('#stat-card-zoom, .sp-stat-card')) zoom.style.display = 'none';
  });

  function positionZoom(card, zoomW = 400) {
    const sidebarW = 280;
    const rect     = card.getBoundingClientRect();
    const top      = Math.min(Math.max(rect.top, 8), window.innerHeight - zoom.offsetHeight - 8);
    zoom.style.left = (window.innerWidth - sidebarW - zoomW) + 'px';
    zoom.style.top  = top + 'px';
  }
  panel.addEventListener('input', e => {
    if (e.target.id !== 'add-search') return;
    const pos = e.target.selectionStart;
    uiState.addPanelSearch = e.target.value;
    render();
    const input = document.getElementById('add-search');
    if (input) {
      input.focus();
      input.setSelectionRange(pos, pos);
    }
  });
  render();
}

function focusAddSearch() {
  const input = document.getElementById('add-search');
  if (!input) return;
  input.focus();
  input.select();
}

// ─── Event handling ───────────────────────────────────────────────────────────

function editCounter(span) {
  const field = span.dataset.field;
  const oldVal = span.textContent;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.value = oldVal;
  input.style.width = '50px';
  input.style.textAlign = 'center';

  span.setAttribute('data-editing', 'true');
  span.replaceWith(input);
  input.focus();
  input.select();

  function finalize() {
    const newVal = Math.max(0, Number(input.value) || 0);
    const sel = uiState.selected;
    if (sel) {
      if (isWardensDebtKind(sel.kind) && (field === 'hp' || field === 'maxhp')) {
        updateWardensDebtSelectedStat(sel.kind, sel.idx, field, newVal);
        return;
      }
      const arr = arrForKind(sel.kind);
      const obj = arr[sel.idx];
      if (obj) {
        patchKind(sel.kind, arr.map((x, i) => i === sel.idx ? {
          ...x,
          [field]: newVal,
          ...(field === 'hp' ? hpContextPatch(sel.kind, x) : {}),
          ...(field === 'maxhp' ? maxHpContextPatch(sel.kind, x) : {}),
        } : x));
      }
    }
  }

  input.addEventListener('blur', finalize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { finalize(); }
    if (e.key === 'Escape') { input.replaceWith(span); span.removeAttribute('data-editing'); }
  });
}

function handlePanelClick(e) {
  const editableCounter = e.target.closest('.sp-counter-editable');
  if (editableCounter && !editableCounter.hasAttribute('data-editing')) {
    editCounter(editableCounter);
    return;
  }

  const stackBtn = e.target.closest('.sp-stack-select[data-select-kind]');
  if (stackBtn) { selectFromStack(stackBtn.dataset.selectKind, Number(stackBtn.dataset.selectIdx)); return; }

  const tabBtn = e.target.closest('[data-set-tab]');
  if (tabBtn) { setAddTab(tabBtn.dataset.setTab); return; }

  const toggleBtn = e.target.closest('[data-toggle-section]');
  if (toggleBtn) { toggleSection(toggleBtn.dataset.toggleSection); return; }

  const placeBtn = e.target.closest('[data-place-kind]');
  if (placeBtn) { placeSomething(placeBtn.dataset.placeKind, Number(placeBtn.dataset.placeId)); return; }

  const addCond = e.target.closest('[data-add-cond]');
  if (addCond) { addCondition(addCond.dataset.addCond); closeCondPicker(); return; }

  const condToggle = e.target.closest('[data-action="toggle-cond-picker"]');
  if (condToggle) { toggleCondPicker(); return; }

  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) handleAction(actionBtn.dataset);
}

function addCondition(cond) {
  const sel = uiState.selected;
  if (!sel) return;
  if (isWardensDebtKind(sel.kind)) {
    const ctx = wardensDebtSelectionContext(sel);
    if (!ctx || !ctx.runtime.index?.conditionTokensById.has(cond)) return;
    const existing = Array.isArray(ctx.obj.conditions) ? ctx.obj.conditions : [];
    if (existing.includes(cond)) return;
    updateWardensDebtSelectedConditions(sel.kind, sel.idx, current => [...current, cond]);
    return;
  }
  if (sel.kind !== 'mercenary' && sel.kind !== 'summon' && sel.kind !== 'monster') return;
  const arr = arrForKind(sel.kind);
  const obj = arr[sel.idx];
  if (!obj) return;
  const existing = Array.isArray(obj.conditions) ? obj.conditions : [];
  if (existing.includes(cond)) return;
  patchKind(sel.kind, arr.map((x, i) => i === sel.idx ? { ...x, conditions: [...existing, cond] } : x));
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

function selectedObject() {
  const sel = uiState.selected;
  if (!sel) return null;
  if (isWardensDebtKind(sel.kind)) return wardensDebtSelectionContext(sel);
  const arr = arrForKind(sel.kind);
  const obj = arr[sel.idx];
  return obj ? { sel, arr, obj } : null;
}

function toggleSelectedLock() {
  const ctx = selectedObject();
  if (!ctx || isWardensDebtKind(ctx.sel.kind)) return false;
  patchKind(ctx.sel.kind, ctx.arr.map((x, i) => i === ctx.sel.idx ? { ...x, locked: !x.locked } : x));
  return true;
}

function toggleSelectedMonsterRole() {
  const ctx = selectedObject();
  if (!ctx || isWardensDebtKind(ctx.sel.kind) || ctx.sel.kind !== 'monster' || ctx.obj.role === 'boss') return false;
  const next = ctx.obj.role === 'elite' ? 'normal' : 'elite';
  patchKind('monster', ctx.arr.map((x, i) => i === ctx.sel.idx ? {
    ...x,
    role: next,
    _maxhpLevel: undefined,
    _maxhpRole: undefined,
    _hpLevel: undefined,
    _hpRole: undefined,
  } : x));
  return true;
}

function adjustSelectedHp(delta) {
  const ctx = selectedObject();
  if (!ctx) return false;
  if (isWardensDebtKind(ctx.sel.kind)) {
    const currentHp = ctx.sel.kind === 'wd-convict'
      ? Number(ctx.obj.health) || 0
      : Number(ctx.obj.currentHealth) || 0;
    updateWardensDebtSelectedStat(ctx.sel.kind, ctx.sel.idx, 'hp', currentHp + delta);
    return true;
  }
  const canTrackHp = ctx.sel.kind === 'mercenary' || ctx.sel.kind === 'summon' || ctx.sel.kind === 'monster' || ctx.obj.hp !== undefined;
  if (!canTrackHp) return false;
  const hp = Math.max(0, displayCurrentHp(ctx.sel.kind, ctx.obj) + delta);
  patchKind(ctx.sel.kind, ctx.arr.map((x, i) => i === ctx.sel.idx ? { ...x, hp, ...hpContextPatch(ctx.sel.kind, x) } : x));
  return true;
}

function stackAtSelectedHex() {
  const hex = uiState.selectedHex;
  if (!hex) return [];
  return findAllAt(hex.col, hex.row).sort((a, b) => (STACK_KIND_PRIORITY[a.kind] ?? 99) - (STACK_KIND_PRIORITY[b.kind] ?? 99));
}

function cycleStackSelection(delta) {
  const stack = stackAtSelectedHex();
  if (stack.length < 2) return false;
  const sel = uiState.selected;
  const cur = stack.findIndex(o => o.kind === sel?.kind && o.idx === sel?.idx);
  const next = stack[(cur + delta + stack.length) % stack.length] || stack[0];
  showStackWithSelection(stack, uiState.selectedHex.col, uiState.selectedHex.row, next.kind, next.idx);
  return true;
}

function moveSelectedInKind(delta) {
  const ctx = selectedObject();
  if (!ctx || isWardensDebtKind(ctx.sel.kind) || ctx.arr.length < 2) return false;
  const nextIdx = ctx.sel.idx + delta;
  if (nextIdx < 0 || nextIdx >= ctx.arr.length) return false;
  const arr = [...ctx.arr];
  const [moved] = arr.splice(ctx.sel.idx, 1);
  arr.splice(nextIdx, 0, moved);
  patchKind(ctx.sel.kind, arr);
  selectObject(ctx.sel.kind, nextIdx, Number(ctx.obj.x), Number(ctx.obj.y));
  return true;
}

function frameSelectedHex() {
  const hex = uiState.selectedHex;
  if (!hex) return false;
  const center = hexCenter(hex.col, hex.row);
  centerBoardPoint(center.x, center.y);
  return true;
}

function cloneForPlacement(kind, obj, hex) {
  const base = { ...obj, x: hex.col, y: hex.row, locked: false };
  if (kind !== 'monster') return base;
  const { standeeNum: _old, ...withoutStandee } = base;
  return { ...withoutStandee, standeeNum: generateStandeeNum(obj.id, state.monsters || []) };
}

function pasteCopiedObject(hex) {
  if (!copiedObject || !hex) return false;
  const arr = arrForKind(copiedObject.kind);
  const obj = cloneForPlacement(copiedObject.kind, copiedObject.obj, hex);
  patchKind(copiedObject.kind, [...arr, obj]);
  selectObject(copiedObject.kind, arr.length, hex.col, hex.row);
  return true;
}

function copySelectedObject() {
  const ctx = selectedObject();
  if (!ctx || isWardensDebtKind(ctx.sel.kind)) return false;
  const conditions = Array.isArray(ctx.obj.conditions) ? { conditions: [...ctx.obj.conditions] } : {};
  copiedObject = { kind: ctx.sel.kind, obj: { ...ctx.obj, ...conditions } };
  return true;
}

function handleClipboardShortcut(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
  const key = e.key.toLowerCase();
  if (key === 'c') {
    if (!copySelectedObject()) return false;
    e.preventDefault();
    return true;
  }
  if (key === 'v') {
    if (!pasteCopiedObject(uiState.selectedHex)) return false;
    e.preventDefault();
    return true;
  }
  if (key === 'd') {
    if (!copySelectedObject() || !pasteCopiedObject(uiState.selectedHex)) return false;
    e.preventDefault();
    return true;
  }
  return false;
}

function handleAction(dataset) {
  const action = dataset.action;
  if (action === 'back')      { deselectObject(); return; }
  if (action === 'open-add')  { openAddPanel(); return; }
  if (action === 'close-add') { closeAddPanel();  return; }
  if (action === 'close-mobile-details') { closeMobileDetails(); return; }
  if (action === 'wd-select') { selectFromStack(dataset.kind, Number(dataset.idx)); return; }
  if (action === 'wd-show-roster') { deselectObject(); return; }

  const sel = uiState.selected;
  if (!sel) return;
  if (isWardensDebtKind(sel.kind)) {
    const ctx = wardensDebtSelectionContext(sel);
    if (!ctx) return;

    const statMatch = action.match(/^stat-(hp|maxhp)-(inc|dec)$/);
    if (statMatch) {
      const field = statMatch[1];
      const delta = statMatch[2] === 'inc' ? 1 : -1;
      const currentValue = field === 'hp'
        ? (sel.kind === 'wd-convict' ? Number(ctx.obj.health) || 0 : Number(ctx.obj.currentHealth) || 0)
        : Number(ctx.obj.maxHealth) || 0;
      updateWardensDebtSelectedStat(sel.kind, sel.idx, field, currentValue + delta);
      return;
    }

    if (action === 'remove-condition') {
      updateWardensDebtSelectedConditions(sel.kind, sel.idx, conditions =>
        conditions.filter(conditionId => conditionId !== dataset.cond)
      );
    }
    return;
  }
  const { kind, idx } = sel;
  const arr = arrForKind(kind);
  const obj = arr[idx];
  if (!obj) return;

  const statMatch = action.match(/^stat-(level|hp|maxhp|xp|gold)-(inc|dec)$/);
  if (statMatch && (kind === 'mercenary' || kind === 'summon' || kind === 'monster' || (obj.hp !== undefined && (statMatch[1] === 'hp' || statMatch[1] === 'maxhp')))) {
    const field = statMatch[1];
    const delta = statMatch[2] === 'inc' ? 1 : -1;
    let newVal;

    if (field === 'level' && kind === 'mercenary') {
      // Mercenary levels: 1-9, wrap around
      const currentLevel = Number(obj.level) || 0;
      const nextLevel = currentLevel + delta;
      newVal = nextLevel > 9 ? 1 : nextLevel < 1 ? 9 : nextLevel;
      // When level changes, mark that maxhp needs to be reset
      patchKind(kind, arr.map((x, i) => i === idx ? { ...x, [field]: newVal, _maxhpLevel: undefined, _hpLevel: undefined } : x));
    } else if (field === 'maxhp' && kind === 'mercenary') {
      // Record the level this maxhp was set for
      newVal = Math.max(0, (displayMaxHp(kind, obj) || 0) + delta);
      const currentLevel = Number(obj.level) || 0;
      patchKind(kind, arr.map((x, i) => i === idx ? { ...x, [field]: newVal, _maxhpLevel: currentLevel } : x));
    } else if (field === 'maxhp' && kind === 'monster') {
      // Record the level and role this maxhp was set for
      newVal = Math.max(0, (displayMaxHp(kind, obj) || 0) + delta);
      const currentRole = obj.role || 'normal';
      patchKind(kind, arr.map((x, i) => i === idx ? { ...x, [field]: newVal, _maxhpLevel: state.CurrentLevel, _maxhpRole: currentRole } : x));
    } else if (field === 'hp' && (kind === 'mercenary' || kind === 'monster')) {
      newVal = Math.max(0, displayCurrentHp(kind, obj) + delta);
      patchKind(kind, arr.map((x, i) => i === idx ? { ...x, [field]: newVal, ...hpContextPatch(kind, x) } : x));
    } else {
      // All other fields: clamp to 0 minimum
      newVal = Math.max(0, (Number(obj[field]) || 0) + delta);
      patchKind(kind, arr.map((x, i) => i === idx ? { ...x, [field]: newVal } : x));
    }
    return;
  }

  if (action === 'hp-enable') {
    patchKind(kind, arr.map((x, i) => i === idx ? { ...x, hp: 0, maxhp: 0, ...hpContextPatch(kind, x), ...maxHpContextPatch(kind, x) } : x));
    return;
  }

  if (action === 'hp-disable') {
    patchKind(kind, arr.map((x, i) => { if (i !== idx) return x; const { hp: _h, maxhp: _m, ...rest } = x; return rest; }));
    return;
  }

  if (action === 'remove-condition' && (kind === 'mercenary' || kind === 'summon' || kind === 'monster')) {
    const conds = Array.isArray(obj.conditions) ? obj.conditions : [];
    patchKind(kind, arr.map((x, i) => i === idx ? { ...x, conditions: conds.filter(c => c !== dataset.cond) } : x));
    return;
  }

  if (action === 'rotate-cw' && !obj.locked) {
    patchKind(kind, arr.map((x, i) => i === idx ? { ...x, angle: ((Number(x.angle)||0) + 60) % 360 } : x));
  } else if (action === 'rotate-ccw' && !obj.locked) {
    patchKind(kind, arr.map((x, i) => i === idx ? { ...x, angle: ((Number(x.angle)||0) - 60 + 360) % 360 } : x));
  } else if (action === 'toggle-lock') {
    patchKind(kind, arr.map((x, i) => i === idx ? { ...x, locked: !x.locked } : x));
  } else if (action === 'toggle-role' && kind === 'monster' && obj.role !== 'boss') {
    const next = obj.role === 'normal' ? 'elite' : 'normal';
    patchKind('monster', arr.map((x, i) => i === idx ? { ...x, role: next, _maxhpLevel: undefined, _maxhpRole: undefined, _hpLevel: undefined, _hpRole: undefined } : x));
  } else if (action === 'toggle-door' && kind === 'overlay' && obj.role === 'door') {
    patchKind('overlay', arr.map((x, i) => i === idx ? { ...x, opened: !x.opened } : x));
  } else if (action === 'cycle-role' && kind === 'overlay') {
    const cur  = OVERLAY_ROLES.indexOf(obj.role);
    const next = OVERLAY_ROLES[(cur + 1) % OVERLAY_ROLES.length];
    patchKind('overlay', arr.map((x, i) => i === idx ? { ...x, role: next } : x));
  } else if (action === 'remove') {
    const hex = uiState.selectedHex;
    patchKind(kind, arr.filter((_, i) => i !== idx));
    if (hex) {
      const remaining = findAllAt(hex.col, hex.row);
      if      (remaining.length === 0) selectHex(hex.col, hex.row);
      else if (remaining.length === 1) selectObject(remaining[0].kind, remaining[0].idx, hex.col, hex.row);
      else                             showStack(remaining, hex.col, hex.row);
    } else {
      clearSelection();
    }
  }
}

function placeSomething(kind, id) {
  const hex = uiState.selectedHex;
  if (!hex) return;
  const base = { id, x: hex.col, y: hex.row, angle: 0, locked: false };
  rememberAdd(kind, id);

  if (kind === 'tile') {
    patch({ tiles: [...(state.tiles || []), { ...base, side: '' }] });
  } else if (kind === 'mercenary') {
    patch({ mercenaries: [...(state.mercenaries || []), { ...base, level: 1 }] });
  } else if (kind === 'summon') {
    patch({ summons: [...(state.summons || []), base] });
  } else if (kind === 'monster') {
    const entry = MONSTERS.byId.get(id);
    const role  = entry?.boss ? 'boss' : 'normal';
    const standeeNum = generateStandeeNum(id, state.monsters || []);
    patch({ monsters: [...(state.monsters || []), { ...base, role, standeeNum }] });
  } else if (kind === 'overlay') {
    const entry = OVERLAY_OBJECTS.byId.get(id);
    const role  = entry?.defaultRole || 'obstacle';
    const extra = role === 'door' ? { opened: false } : {};
    patch({ overlays: [...(state.overlays || []), { ...base, role, ...extra }] });
  }
}

function findAllAt(col, row) {
  const hits = [];
  for (const kind of Object.keys(KIND_MAP)) {
    arrForKind(kind).forEach((obj, i) => {
      if (!obj?.id) return;
      const data  = KIND_MAP[kind].data.byId.get(Number(obj.id));
      const hexes = footprintHexes(Number(obj.x), Number(obj.y), data?.hexes, Number(obj.angle) || 0);
      if (hexes.some(h => h.col === col && h.row === row)) hits.push({ kind, idx: i });
    });
  }
  return hits;
}

// ─── Top-level render ─────────────────────────────────────────────────────────

function render() {
  const panel = document.getElementById('sidebar-panel');
  const { selected, stack, selectedHex, addPanelOpen } = uiState;
  const wdRuntime = getWardensDebtRuntime();
  const sidebarW = window.matchMedia('(max-width: 760px)').matches
    ? '0px'
    : addPanelOpen ? '480px' : '280px';
  document.documentElement.style.setProperty('--sidebar-w', sidebarW);

  if (!selectedHex && !selected && stack.length === 0) {
    if (wdRuntime.status === 'loading' || wdRuntime.status === 'ready' || wdRuntime.status === 'error') {
      panel.innerHTML = wardensDebtRosterPanel(wdRuntime);
      return;
    }
    panel.innerHTML = hint('Select a hex') +
      `<div class="sp-divider"></div><button class="sp-add-btn" disabled>+</button>`;
    return;
  }

  if (addPanelOpen) {
    panel.innerHTML = addPanel();
    return;
  }

  let html = '';
  if (stack.length > 0) {
    html = stackPanel(stack);
  } else if (selected) {
    html = objectPanel(selected.kind, selected.idx);
  } else {
    const { col, row } = selectedHex;
    html = `<div class="sp-type">Hex</div><div class="sp-name">${colLabel(col)}${row}</div>`;
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

// ─── Inspect panels ───────────────────────────────────────────────────────────

function objectPanel(kind, idx) {
  if (isWardensDebtKind(kind)) return wardensDebtObjectPanel(kind, idx);
  const arr = arrForKind(kind);
  const obj = arr[idx];
  if (!obj) return hint('Click a hex to inspect it');

  const locked = Boolean(obj.locked);
  const angle  = Number(obj.angle) || 0;
  const hex    = uiState.selectedHex;
  const coord  = hex ? `${colLabel(hex.col)}${hex.row}` : '';
  const detail = [coord, angle ? `${angle}°` : ''].filter(Boolean).join(' · ');

  const backBtn = uiState.stack.length > 0
    ? `<button class="sp-panel-back" data-action="back">&#8592; Back</button>` : '';

  const lockCls = `sp-icon-btn${locked ? ' is-locked' : ''}`;
  const roleText = kind === 'monster'
    ? (obj.role === 'boss' ? 'Boss' : obj.role === 'elite' ? 'Elite' : 'Normal')
    : '';
  const monsterMeta = kind === 'monster'
    ? [
        coord ? `Hex ${coord}` : '',
        `Level ${state.CurrentLevel}`,
        obj.standeeNum != null ? `Standee ${obj.standeeNum}` : '',
      ].filter(Boolean).join(' · ')
    : detail;

  // Extra contextual buttons
  let extraBtn = '';
  if (kind === 'monster' && obj.role !== 'boss') {
    const isElite = obj.role === 'elite';
    extraBtn = `<button class="sp-icon-btn${isElite ? ' is-locked' : ''}" data-action="toggle-role" title="${isElite ? 'Elite → Normal' : 'Normal → Elite'}">${roleDot(obj.role)}</button>`;
  } else if (kind === 'overlay' && obj.role === 'door') {
    const isOpen = Boolean(obj.opened);
    extraBtn = `<button class="sp-icon-btn${isOpen ? ' is-locked' : ''}" data-action="toggle-door" title="${isOpen ? 'Close door' : 'Open door'}">${roleDot('door', isOpen)}</button>`;
  } else if (kind === 'overlay') {
    extraBtn = `<button class="sp-icon-btn" data-action="cycle-role" title="${ROLE_LABEL[obj.role] || obj.role}">${roleDot(obj.role)}</button>`;
  }

  const imgSrc = objectImageSrc(kind, obj);

  let statCardHtml = '';
  if (kind === 'monster') {
    const entry = KIND_MAP[kind].data.byId.get(Number(obj.id));
    if (entry) {
      const cardSrc = assetPath.monsterCard(entry, state.CurrentLevel);
      statCardHtml = `
        <div class="sp-card-section">
          <div class="sp-subhead">Stat Card</div>
          <img class="sp-stat-card" data-zoom-w="400" src="${cardSrc}" onerror="this.style.display='none'" alt="">
        </div>`;
    }
  } else if (kind === 'mercenary') {
    const entry = KIND_MAP[kind].data.byId.get(Number(obj.id));
    if (entry) {
      const cardSrc = assetPath.mercenaryMat(entry.title);
      statCardHtml = `
        <div class="sp-card-section">
          <div class="sp-subhead">Character Mat</div>
          <img class="sp-stat-card" data-zoom-w="700" src="${cardSrc}" onerror="this.style.display='none'" alt="">
        </div>`;
    }
  }

  const standeeCount = kind === 'monster' ? getMonsterCount(obj.id) : null;
  const standeesLine = standeeCount != null ? `<div class="sp-standees">Standees: ${standeeCount}</div>` : '';
  const monsterRoleChip = kind === 'monster'
    ? `<span class="sp-role-chip sp-role-chip--${obj.role || 'normal'}">${roleText}</span>`
    : '';

  return `
    ${backBtn}
    <div class="sp-obj-header sp-obj-header--selected${kind === 'monster' ? ' sp-obj-header--monster' : ''}">
      ${imgSrc ? `<img class="sp-obj-thumb" src="${imgSrc}" alt="">` : ''}
      <div class="sp-obj-info">
        <div class="sp-title-row">
          <div class="sp-type">${objectType(kind, obj)}</div>
          ${monsterRoleChip}
        </div>
        <div class="sp-name">${objectName(kind, obj)}</div>
        ${standeesLine}
        ${kind === 'monster' ? `<div class="sp-meta-line">${monsterMeta}</div>` : detail ? `<div class="sp-meta-line">${detail}</div>` : ''}
      </div>
    </div>
    <div class="sp-action-section">
      <div class="sp-subhead">Object</div>
      <div class="sp-toolbar">
        <button class="sp-icon-btn" data-action="rotate-ccw" ${locked ? 'disabled' : ''} title="Rotate CCW">&#8634;</button>
        <button class="sp-icon-btn" data-action="rotate-cw"  ${locked ? 'disabled' : ''} title="Rotate CW">&#8635;</button>
        ${extraBtn}
        <button class="${lockCls}" data-action="toggle-lock" title="${locked ? 'Unlock' : 'Lock'}">${locked ? '&#128274;' : '&#128275;'}</button>
        <button class="sp-icon-btn sp-icon-btn--danger" data-action="remove" title="Remove">&#215;</button>
      </div>
    </div>
    ${statCardHtml}
    ${(kind === 'mercenary' || kind === 'summon' || kind === 'monster') ? mercenaryStats(obj, kind) : optionalHp(kind, obj)}
  `;
}

function mercenaryStats(obj, kind = 'mercenary') {
  const isMercenary = kind === 'mercenary';
  const isMonster = kind === 'monster';
  const hp    = displayCurrentHp(kind, obj);
  const gold  = Number(obj.gold)  || 0;

  // Get level-based stats from game config
  let maxHp = displayMaxHp(kind, obj) || 0;
  let xp    = Number(obj.xp)    || 0;

  if (isMonster) {
    const isElite = obj.role === 'elite';
    const levelStats = getMonsterStats(obj.id, state.CurrentLevel, isElite);
    if (levelStats.xp != null) xp = levelStats.xp;
  }
  const conds     = Array.isArray(obj.conditions) ? obj.conditions : [];
  const available = CONDITIONS.map(c => c.title).filter(t => !conds.includes(t));

  const STAT_STYLE = {
    level:      { color: '#9a7f5e' },
    hp:         { color: '#c0392b' },
    maxhp:      { color: '#2e7d32' },
    xp:         { color: '#4a55b0' },
    gold:       { color: '#c07d00' },
    standeenum: { color: '#3d3d5c' },
  };

  const counter = (label, field, val) => {
    const s = STAT_STYLE[field] || {};
    return `
    <div class="sp-stat-tile sp-stat-tile--${field}" style="--stat-color:${s.color || 'rgba(255 255 255 / 0.35)'}">
      <span class="sp-stat-label"><span>${label}</span></span>
      <div class="sp-counter">
        <button class="sp-counter-btn" data-action="stat-${field}-dec">−</button>
        <span class="sp-counter-val sp-counter-editable" data-field="${field}" data-value="${val}">${val}</span>
        <button class="sp-counter-btn" data-action="stat-${field}-inc">+</button>
      </div>
    </div>`;
  };

  const readOnlyCounter = (label, field, val) => {
    const s = STAT_STYLE[field] || {};
    return `
    <div class="sp-stat-tile sp-stat-tile--readonly sp-stat-tile--${field}" style="--stat-color:${s.color || 'rgba(255 255 255 / 0.35)'}">
      <span class="sp-stat-label"><span>${label}</span></span>
      <div class="sp-counter sp-counter--readonly">
        <span class="sp-counter-val">${val}</span>
      </div>
    </div>`;
  };

  const levelRow = !isMonster
    ? counter('Level', 'level', obj.level != null ? Number(obj.level) : 0)
    : readOnlyCounter('Level', 'level', state.CurrentLevel);

  const standeeNumRow = isMonster && obj.standeeNum != null
    ? readOnlyCounter('Standee #', 'standeenum', obj.standeeNum)
    : '';

  const activeTiles = conds.map(c => `
    <div class="sp-cond-tile" title="${c}">
      <img class="sp-cond-img" src="${condImg(c)}" alt="${c}">
      <button class="sp-cond-remove" data-action="remove-condition" data-cond="${c}">×</button>
    </div>`).join('');

  const pickerTiles = available.map(t => `
    <div class="sp-cond-pick-tile" data-add-cond="${t}" title="${t}">
      <img class="sp-cond-img" src="${condImg(t)}" alt="${t}">
    </div>`).join('');

  const showConditionsHeader = isMonster || isMercenary;
  const framedStats = isMonster || isMercenary;

  return `
    <div class="sp-stats${framedStats ? ' sp-stats--monster' : ''}">
      ${framedStats ? `<div class="sp-subhead">Combat</div>` : ''}
      <div class="sp-stat-grid${isMonster ? ' sp-stat-grid--monster' : ''}${isMercenary ? ' sp-stat-grid--mercenary' : ''}">
        ${counter('HP', 'hp', hp)}
        ${isMonster ? levelRow : isMercenary ? levelRow : ''}
        ${counter('Max HP', 'maxhp', maxHp)}
        ${isMonster ? standeeNumRow : isMercenary ? counter('XP', 'xp', xp) : ''}
        ${isMercenary ? counter('Gold', 'gold', gold) : ''}
      </div>
      <div class="sp-cond-section">
        ${showConditionsHeader ? `<div class="sp-subhead sp-subhead--conditions">Conditions</div>` : ''}
        <div class="sp-cond-row">
          ${conds.length > 0 ? `<div class="sp-cond-active">${activeTiles}</div>` : ''}
          ${available.length > 0 ? `
            <button class="sp-cond-toggle${uiState.condPickerOpen ? ' is-open' : ''}"
                    data-action="toggle-cond-picker">+ Condition</button>` : ''}
        </div>
        ${uiState.condPickerOpen && available.length > 0 ? `
          <div class="sp-cond-picker">${pickerTiles}</div>` : ''}
      </div>
    </div>`;
}

function optionalHp(kind, obj) {
  if (obj.hp === undefined) {
    return `<button class="sp-add-btn" data-action="hp-enable">+ Track HP</button>`;
  }
  const hp    = Number(obj.hp)    || 0;
  const maxHp = Number(obj.maxhp) || 0;
  const counter = (label, field, val) => {
    const STAT_STYLE = {
      hp:    { color: '#c0392b' },
      maxhp: { color: '#2e7d32' },
    };
    const s = STAT_STYLE[field] || {};
    return `
    <div class="sp-stat-tile sp-stat-tile--${field}" style="--stat-color:${s.color || 'rgba(255 255 255 / 0.35)'}">
      <span class="sp-stat-label"><span>${label}</span></span>
      <div class="sp-counter">
        <button class="sp-counter-btn" data-action="stat-${field}-dec">−</button>
        <span class="sp-counter-val sp-counter-editable" data-field="${field}" data-value="${val}">${val}</span>
        <button class="sp-counter-btn" data-action="stat-${field}-inc">+</button>
      </div>
    </div>`;
  };
  return `
    <div class="sp-stats">
      <div class="sp-stat-grid">
        ${counter('HP', 'hp', hp)}
        ${counter('Max HP', 'maxhp', maxHp)}
      </div>
      <button class="sp-add-btn" data-action="hp-disable" style="margin-top:6px">− Remove HP tracking</button>
    </div>`;
}

function stackPanel(stack) {
  const { selectedHex } = uiState;
  const coord = selectedHex ? colLabel(selectedHex.col) + selectedHex.row : '';

  const sel   = uiState.selected;
  const items = [...stack].reverse().map(({ kind, idx }, stackPos) => {
    const obj        = arrForKind(kind)[idx];
    if (!obj?.id) return '';
    const isSelected = sel?.kind === kind && sel?.idx === idx;
    return `
      <div class="sp-stack-item${isSelected ? ' is-selected' : ''}" draggable="true"
           data-select-kind="${kind}" data-select-idx="${idx}" data-stack-pos="${stackPos}">
        <span class="sp-stack-drag-handle" title="Drag to reorder">⠿</span>
        <button class="sp-stack-select" data-select-kind="${kind}" data-select-idx="${idx}">
          <span class="sp-stack-info">
            <span class="sp-stack-type">${objectType(kind, obj)}</span>
            <span class="sp-stack-name">${objectName(kind, obj)}</span>
          </span>
          <span class="sp-stack-chevron">›</span>
        </button>
      </div>`;
  }).join('');

  return `
    <div class="sp-obj-header sp-obj-header--stack">
      <div class="sp-type">Select object</div>
      <div class="sp-name">${coord}</div>
    </div>
    <div class="sp-stack-list">${items}</div>
  `;
}

// ─── Add panel ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'monsters',    label: 'Monsters'    },
  { key: 'objects',     label: 'Objects'     },
  { key: 'tiles',       label: 'Map Tiles'   },
  { key: 'mercenaries', label: 'Mercenaries' },
  { key: 'summons',     label: 'Summons'     },
  { key: 'bosses',      label: 'Bosses'      },
];

const TAB_SECTIONS = {
  monsters: [
    { getItems: () => monsterItems(false) },
  ],
  bosses: [
    { getItems: () => monsterItems(true) },
  ],
  objects: [
    { label: 'Corridors',       getItems: () => overlayByRole('corridor')       },
    { label: 'Walls',           getItems: () => overlayByRole('wall')           },
    { label: 'Ice',             getItems: () => overlayByRole('ice')            },
    { label: 'Difficult',       getItems: () => overlayByRole('difficult')      },
    { label: 'Hazardous',       getItems: () => overlayByRole('hazardous')      },
    { label: 'Doors',           getItems: () => overlayByRole('door')           },
    { label: 'Traps',           getItems: () => overlayByRole('trap')           },
    { label: 'Pressure Plates', getItems: () => overlayByRole('pressure-plate') },
    { label: 'Obstacles',       getItems: () => overlayByRole('obstacle')       },
    { label: 'Objectives',      getItems: () => overlayByRole('objective')      },
    { label: 'Loot',            getItems: () => overlayByRole('loot')           },
    { label: 'Elements',        getItems: () => overlayByRole('element')        },
    { label: 'Scenario Aids',   getItems: () => overlayByRole('scenario-aid')   },
    { label: 'Class Overlays',  getItems: () => classOverlayItems()             },
  ],
  summons: [
    { label: 'Anaphi',          getItems: () => summonByMercenary('Anaphi') },
    { label: 'Banner Spear',    getItems: () => summonByMercenary('Banner Spear') },
    { label: 'Bladeswarm',      getItems: () => summonByMercenary('Bladeswarm') },
    { label: 'Boneshaper',      getItems: () => summonByMercenary('Boneshaper') },
    { label: 'Cassandra',       getItems: () => summonByMercenary('Cassandra') },
    { label: 'Deathwalker',     getItems: () => summonByMercenary('Deathwalker') },
    { label: 'Doomstalker',     getItems: () => summonByMercenary('Doomstalker') },
    { label: 'Elementalist',    getItems: () => summonByMercenary('Elementalist') },
    { label: 'H.I.V.E.',        getItems: () => summonByMercenary('H.I.V.E.') },
    { label: 'Infuser',         getItems: () => summonByMercenary('Infuser') },
    { label: 'Mindthief',       getItems: () => summonByMercenary('Mindthief') },
    { label: 'Pain Conduit',    getItems: () => summonByMercenary('Pain Conduit') },
    { label: 'Snowdancer',      getItems: () => summonByMercenary('Snowdancer') },
    { label: 'Soultether',      getItems: () => summonByMercenary('Soultether') },
    { label: 'Tinkerer',        getItems: () => summonByMercenary('Tinkerer') },
    { label: 'Trapper',         getItems: () => summonByMercenary('Trapper') },
    { label: 'Wildfury',        getItems: () => summonByMercenary('Wildfury') },
  ],
  tiles: [
    { getItems: () => tileItems(), grouped: true },
  ],
  mercenaries: [
    { label: 'Gloomhaven',       getItems: () => mercenaryBySource('Gloomhaven') },
    { label: 'Frosthaven',       getItems: () => mercenaryBySource('Frosthaven') },
    { label: 'Jaws of the Lion', getItems: () => mercenaryBySource('Jaws of the Lion') },
    { label: 'Mercenary Pack',   getItems: () => mercenaryBySource('Mercenary Pack') },
  ],
};

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function titleCase(s) {
  return s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1));
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
      <span class="sp-stack-chevron">${Number(convict.health) || 0}/${Number(convict.maxHealth) || 0}</span>
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

function wardensDebtObjectPanel(kind, idx) {
  const ctx = wardensDebtSelectionContext({ kind, idx });
  if (!ctx) return hint('Wardens Debt actor unavailable');

  const { runtime, obj } = ctx;
  const isConvict = kind === 'wd-convict';
  const conditions = Array.isArray(obj.conditions) ? obj.conditions : [];
  const available = [...(runtime.index?.conditionTokensById?.keys() || [])]
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

  const readOnlyCounter = (label, value, color) => `
    <div class="sp-stat-tile sp-stat-tile--readonly" style="--stat-color:${color}">
      <span class="sp-stat-label"><span>${label}</span></span>
      <div class="sp-counter sp-counter--readonly"><span class="sp-counter-val">${value}</span></div>
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

  const hpValue = isConvict ? Number(obj.health) || 0 : Number(obj.currentHealth) || 0;
  const extraTiles = isConvict
    ? [
        readOnlyCounter('Guard', Number(obj.guards) || 0, '#6b7da8'),
        readOnlyCounter('Resources', Number(obj.resources) || 0, '#9a7f5e'),
        readOnlyCounter('Hand', Array.isArray(obj.hand) ? obj.hand.length : 0, '#4a55b0'),
      ].join('')
    : [
        readOnlyCounter('Attack', Number(obj.attack) || 0, '#8f4c38'),
        readOnlyCounter('Zone', escHtml(obj.zone || 'board'), '#3d3d5c'),
      ].join('');

  return `
    <button class="sp-panel-back" data-action="wd-show-roster">&#8592; Roster</button>
    <div class="sp-obj-header sp-obj-header--selected${isConvict ? '' : ' sp-obj-header--monster'}">
      <div class="sp-obj-info">
        <div class="sp-title-row">
          <div class="sp-type">${isConvict ? 'Convict' : 'Monster'}</div>
        </div>
        <div class="sp-name">${escHtml(obj.name || (isConvict ? `Convict ${idx + 1}` : `Monster ${idx + 1}`))}</div>
        <div class="sp-meta-line">${escHtml(isConvict ? obj.convictDefId : obj.monsterCardId)}</div>
      </div>
    </div>
    <div class="sp-stats sp-stats--monster">
      <div class="sp-subhead">Combat</div>
      <div class="sp-stat-grid${isConvict ? ' sp-stat-grid--mercenary' : ' sp-stat-grid--monster'}">
        ${counter('HP', 'hp', hpValue, '#c0392b')}
        ${counter('Max HP', 'maxhp', Number(obj.maxHealth) || 0, '#2e7d32')}
        ${extraTiles}
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

function apItemBtn({ kind, id, label }) {
  const text = titleCase(label);
  return `<button class="ap-item-btn ap-item-btn--${kind}" data-place-kind="${kind}" data-place-id="${id}" title="${escHtml(text)}">${escHtml(text)}</button>`;
}

function renderTabBody(tab) {
  return (TAB_SECTIONS[tab] || []).map(({ label, getItems, grouped }) => {
    const items = getItems();
    if (!items.length) return '';
    let grid;
    if (grouped) {
      const groups = new Map();
      for (const item of items) {
        const prefix = item.label.split('-')[0];
        if (!groups.has(prefix)) groups.set(prefix, []);
        groups.get(prefix).push(item);
      }
      grid = [...groups.entries()].map(([prefix, grp]) =>
        `<div class="ap-section-label"><span>${escHtml(prefix)}</span><span>${grp.length}</span></div><div class="ap-grid">${grp.map(apItemBtn).join('')}</div>`
      ).join('');
    } else {
      grid = `<div class="ap-grid">${items.map(apItemBtn).join('')}</div>`;
    }
    return label ? `<div class="ap-section-label"><span>${escHtml(label)}</span><span>${items.length}</span></div>${grid}` : grid;
  }).join('');
}

function renderSearchBody(query) {
  const q = String(query || '').trim();
  if (!q) return '';

  const items = Object.values(TAB_SECTIONS)
    .flatMap(sections => sections.flatMap(({ getItems }) => getItems()))
    .filter(item => item.label.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!items.length) return `<div class="ap-empty">No results for "${escHtml(query)}"</div>`;
  return `<div class="ap-grid">${items.map(apItemBtn).join('')}</div>`;
}

function recentItems() {
  return uiState.recentAdds
    .map(({ kind, id }) => {
      const entry = KIND_MAP[kind]?.data?.byId.get(Number(id));
      return entry ? { kind, id, label: entry.title } : null;
    })
    .filter(Boolean);
}

function addPanel() {
  const hex    = uiState.selectedHex;
  const coord  = hex ? colLabel(hex.col) + hex.row : '';
  const search = uiState.addPanelSearch;
  const tab    = uiState.addPanelTab;
  const recent = recentItems();

  const tabsHtml = TABS.map(t =>
    `<button class="ap-tab${t.key === tab && !search ? ' is-active' : ''}" data-set-tab="${t.key}">${t.label}</button>`
  ).join('');

  const recentHtml = !search && recent.length
    ? `<div class="ap-section-label ap-section-label--recent"><span>Recent</span><span>${recent.length}</span></div><div class="ap-grid ap-grid--recent">${recent.map(apItemBtn).join('')}</div>`
    : '';
  const body = search ? renderSearchBody(search) : recentHtml + renderTabBody(tab);

  return `
    <div class="sp-add-header">
      <button class="sp-panel-back" data-action="close-add">&#8592;</button>
      <span class="sp-add-title">Add${coord ? ` to ${coord}` : ''}</span>
    </div>
    <div class="ap-sticky">
      <input id="add-search" class="ap-search" type="text"
             placeholder="Search…" value="${escHtml(search)}" autocomplete="off">
      <div class="ap-tabs">${tabsHtml}</div>
    </div>
    ${body}
  `;
}

// ─── Section item builders ────────────────────────────────────────────────────

function tileItems() {
  return [...TILES.byId.values()].map(t => ({ kind:'tile', id:t.id, label:t.title }));
}

function dataItems(tbl, kind) {
  return [...tbl.byId.values()].map(t => ({ kind, id:t.id, label:t.title }));
}

function monsterItems(bossOnly) {
  return [...MONSTERS.byId.values()]
    .filter(e => !!e.boss === bossOnly)
    .map(e => ({ kind:'monster', id:e.id, label:e.title }));
}

function overlayByRole(role) {
  return [...OVERLAY_OBJECTS.byId.values()]
    .filter(e => e.defaultRole === role && !e.classOverlay)
    .map(e => ({ kind:'overlay', id:e.id, label:e.title }));
}

function classOverlayItems() {
  return [...OVERLAY_OBJECTS.byId.values()]
    .filter(e => e.classOverlay)
    .map(e => ({ kind:'overlay', id:e.id, label:e.title }));
}

function mercenaryBySource(source) {
  return [...MERCENARIES.byId.values()]
    .filter(e => e.source === source)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(e => ({ kind:'mercenary', id:e.id, label:e.title }));
}

function summonByMercenary(mercenary) {
  return [...SUMMONS.byId.values()]
    .filter(e => e.mercenary === mercenary)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(e => ({ kind:'summon', id:e.id, label:e.title }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hint(text) { return `<div class="sp-hint">${text}</div>`; }

function condImg(name) {
  return `images/common/conditions/${name.toLowerCase().replace(/ /g, '_')}.png`;
}
