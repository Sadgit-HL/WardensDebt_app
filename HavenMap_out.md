# HavenMap → WardensDebt Migration — Completed

## Status: DONE (2026-05-07)

All HavenMap feature code has been removed. The app is now a pure WardensDebt tool. ~900 lines of dead code removed across 8 files.

---

## What Was Removed Per File

### render.js (~973 → ~300 lines)
Removed all HavenMap render functions: `renderTiles`, `renderOverlays`, `renderMonsters`, `renderMercenaries`, `renderSummons`, all SVG image/label/mask helpers, the entire ring/role system, and the selection path system. `renderAll()` now just clears layers and calls `renderWardensDebtMap()`. Grid permanently hidden in `init()`.

### state.js (~360 → ~80 lines)
Removed all migration functions, b64 encoding, HavenMap state fields (tiles/monsters/overlays/etc.), `stateHash()`, `save()`. `emptyState()` returns only `{ showGridLabels: false }`. `applyHash()` only handles `#lz:` prefix and extracts `showGridLabels`.

### drag.js (~666 → ~380 lines)
Removed HavenMap object detection (`findAllObjects`, `sortByPriority`, `arrForKind`), hex-move (`moveSelectedTo`), drag highlight (`showHighlight`/`removeHighlight`), and all HavenMap click/drag paths in `onMousedown`/`onMousemove`/`onMouseup`. Empty-click fallback simplified to `selectWardensDebtEmptyCell()`.

### sidebar.js (~1960 → ~650 lines)
Removed HavenMap state helpers, role/HP context patching, stack ops, copy/paste system, combat stats panels, stack display panel, placement logic, all HavenMap add-panel tab builders and item lists. Settings panel simplified to grid labels toggle + shortcuts only.

### elements.js (~592 → ~575 lines)
Removed `cycleElement()` and `endOfRound()`. Removed `state`/`patch` and `ELEMENTS` imports. Entire WD playbar kept intact.

### mobile.js (~382 → ~175 lines)
Removed `elementsHtml()`, `selectedContext()`, `quickStatsHtml()`, `adjustQuickStat()`, `quickActionsHtml()`, `applyObjectAction()`, share button, end-round action, elements panel case. Removed all HavenMap imports. `selectionHtml()` rewritten for WD context.

### main.js (~147 → ~142 lines)
Removed `initLevel`/`renderLevel`/`initShare` imports and calls. `renderAll(state)` → `renderAll()` in both subscribers.

### uiState.js (~157 → ~130 lines)
Removed `selectHex()`, `showStack()`, `showStackWithSelection()`.

### index.html
Removed Elements mobile tab button (`data-mobile-panel="elements"`).

---

## Orphaned Files (no longer imported — safe to delete)

| File | Previously used by |
|------|--------------------|
| `level.js` | main.js `initLevel`/`renderLevel` |
| `share.js` | main.js `initShare`, sidebar.js share mode |
| `data.js` | render/drag/sidebar/mobile — all imports removed |
| `hp.js` | render.js, sidebar.js, mobile.js — all imports removed |

---

## What Was Kept

| File | Role |
|------|------|
| `wardensDebt/runtime.js` | WD state, undo/redo, URL persistence |
| `wardensDebt/schema.js` | WD content index + validation |
| `wardensDebt/placement.js` | WD grid snap, figure position lookup |
| `wardensDebt/mapTiles.js` | WD tile definitions |
| `wardensDebt/gameplay.js` | WD game logic |
| `hex.js` | Coordinate math |
| `controls.js` | Pan/zoom |
| `lzString.js` | LZ compression |
| `rotation.js` | ROTATION_STEP constant |

---

## Regression Checklist

1. WD figure drag + drop
2. Sidebar add panel (convicts/enemies/maptiles/objects tabs)
3. Undo/redo buttons
4. Settings panel (grid labels toggle)
5. Mobile layout (controls/selection/settings tabs)
6. URL persistence (`?wd=` query param survives hash changes)
