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
};

const listeners = [];
export function subscribeUI(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

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
  notify();
}

export function selectFromStack(kind, idx) {
  uiState.selected = { kind, idx };
  uiState.selectedWdMapTile = null;
  uiState.stack    = [];
  notify();
}

export function selectWardensDebtCell(x, y) {
  uiState.selectedHex = null;
  uiState.selectedCell = { x, y };
  uiState.stack = [];
  notify();
}

export function selectWardensDebtEmptyCell(x, y) {
  uiState.selectedHex = null;
  uiState.selectedCell = { x, y };
  uiState.selectedWdMapTile = null;
  uiState.selected = null;
  uiState.stack = [];
  notify();
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
  notify();
}

export function deselectObject() {
  uiState.selected = null;
  notify();
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
  notify();
}

export function toggleSection(key) {
  if (uiState.expandedSections.has(key)) uiState.expandedSections.delete(key);
  else                                    uiState.expandedSections.add(key);
  notify();
}

export function openAddPanel()  { uiState.addPanelOpen = true; uiState.mobileDetailsOpen = false; uiState.addPanelTab = 'monsters'; uiState.addPanelSearch = ''; notify(); }
export function closeAddPanel() { uiState.addPanelOpen = false; uiState.addPanelSearch = ''; notify(); }
export function setAddTab(tab)  { uiState.addPanelTab = tab; uiState.addPanelSearch = ''; notify(); }
export function rememberAdd(kind, id) {
  uiState.recentAdds = [
    { kind, id: Number(id) },
    ...uiState.recentAdds.filter(item => !(item.kind === kind && Number(item.id) === Number(id))),
  ].slice(0, 6);
  notify();
}
export function toggleCondPicker() { uiState.condPickerOpen = !uiState.condPickerOpen; notify(); }
export function closeCondPicker()  { uiState.condPickerOpen = false; notify(); }
export function setMobilePanel(panel) {
  uiState.mobilePanel = panel;
  uiState.mobileDetailsOpen = false;
  uiState.addPanelOpen = false;
  uiState.addPanelSearch = '';
  notify();
}
export function openMobileDetails()  { uiState.mobileDetailsOpen = true; notify(); }
export function closeMobileDetails() { uiState.mobileDetailsOpen = false; notify(); }
export function setMobileMoveMode(active) { uiState.mobileMoveMode = Boolean(active); notify(); }
