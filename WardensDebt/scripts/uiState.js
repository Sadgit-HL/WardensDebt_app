// UI-only state — not serialized to URL.

export const uiState = {
  selectedHex:      null,
  selectedCell:     null,
  selectedWdMapTile: null,
  selected:         null,
  stack:            [],
  expandedSections: new Set(),
  addPanelOpen:     false,
  addPanelTab:      'monsters',
  addPanelSearch:   '',
  recentAdds:       [],
  condPickerOpen:   false,
  mobilePanel:      'selection',
  mobileDetailsOpen:false,
  mobileMoveMode:   false,
  emptyClickMenu:   null,
};

const listeners = [];
export function subscribeUI(fn) { listeners.push(fn); }
export function notifyUI() { listeners.forEach(fn => fn()); }

export function selectObject(kind, idx, col, row) {
  uiState.selectedHex  = { col, row };
  uiState.selectedCell  = null;
  uiState.selectedWdMapTile = null;
  uiState.selected     = { kind, idx };
  uiState.stack        = [];
  uiState.addPanelOpen = false;
  uiState.mobilePanel  = 'selection';
  uiState.mobileDetailsOpen = false;
  uiState.mobileMoveMode = false;
  notifyUI();
}

export function selectFromStack(kind, idx) {
  uiState.selected = { kind, idx };
  uiState.selectedWdMapTile = null;
  uiState.stack    = [];
  notifyUI();
}

export function selectWardensDebtCell(x, y) {
  uiState.selectedHex = null;
  uiState.selectedCell = { x, y };
  uiState.stack = [];
  notifyUI();
}

export function selectWardensDebtEmptyCell(x, y) {
  uiState.selectedHex = null;
  uiState.selectedCell = { x, y };
  uiState.selectedWdMapTile = null;
  uiState.selected = null;
  uiState.stack = [];
  notifyUI();
}

export function selectWardensDebtMapTile(id) {
  uiState.selectedHex = null;
  uiState.selectedCell = null;
  uiState.selectedWdMapTile = id ? { id } : null;
  uiState.selected = null;
  uiState.stack = [];
  uiState.addPanelOpen = false;
  uiState.mobilePanel = 'selection';
  uiState.mobileDetailsOpen = false;
  uiState.mobileMoveMode = false;
  notifyUI();
}

export function deselectObject() {
  uiState.selected = null;
  notifyUI();
}

export function clearSelection() {
  uiState.selectedHex  = null;
  uiState.selectedCell  = null;
  uiState.selectedWdMapTile = null;
  uiState.selected     = null;
  uiState.stack        = [];
  uiState.addPanelOpen = false;
  uiState.mobileDetailsOpen = false;
  uiState.mobileMoveMode = false;
  notifyUI();
}

export function toggleSection(key) {
  if (uiState.expandedSections.has(key)) uiState.expandedSections.delete(key);
  else                                    uiState.expandedSections.add(key);
  notifyUI();
}

export function openAddPanel()  { uiState.addPanelOpen = true; uiState.mobileDetailsOpen = false; uiState.addPanelTab = 'monsters'; uiState.addPanelSearch = ''; notifyUI(); }
export function closeAddPanel() { uiState.addPanelOpen = false; uiState.addPanelSearch = ''; notifyUI(); }
export function setAddTab(tab)  { uiState.addPanelTab = tab; uiState.addPanelSearch = ''; notifyUI(); }
export function rememberAdd(kind, id) {
  uiState.recentAdds = [
    { kind, id: Number(id) },
    ...uiState.recentAdds.filter(item => !(item.kind === kind && Number(item.id) === Number(id))),
  ].slice(0, 6);
  notifyUI();
}
export function toggleCondPicker() { uiState.condPickerOpen = !uiState.condPickerOpen; notifyUI(); }
export function closeCondPicker()  { uiState.condPickerOpen = false; notifyUI(); }
export function setMobilePanel(panel) {
  uiState.mobilePanel = panel;
  uiState.mobileDetailsOpen = false;
  uiState.addPanelOpen = false;
  uiState.addPanelSearch = '';
  notifyUI();
}
export function openMobileDetails()  { uiState.mobileDetailsOpen = true; notifyUI(); }
export function closeMobileDetails() { uiState.mobileDetailsOpen = false; notifyUI(); }
export function setMobileMoveMode(active) { uiState.mobileMoveMode = Boolean(active); notifyUI(); }
