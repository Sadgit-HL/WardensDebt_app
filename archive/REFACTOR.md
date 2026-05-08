# WardensDebt Architecture Refactoring

**Status:** In Progress | **Current Phase:** Planning | **Target Completion:** ~2 weeks

---

## Executive Summary

The codebase is **60-70% toward strong architecture**. The foundation is solid — state is centralized, rendering is derived, and game logic is separated. The main gaps are:

1. **Action abstraction missing** — game mutations are scattered; history capture is manual
2. **DOM leakage** — element data attributes used as state queries
3. **Dual history** — view state and game state have separate undo/redo systems

The next **2-3 weeks of incremental work** will close these gaps. Each phase is low-risk and can be done one at a time.

---

## Current Architecture State

### ✅ What's Working

| Component | Location | Status |
|-----------|----------|--------|
| **Definitions** | `wardensDebt/content.js`, `schema.js` | Clean separation ✓ |
| **Game State** | `wardensDebt/runtime.js` → `runtimeState.gameState` | Centralized ✓ |
| **UI State** | `uiState.js` | Separate, not serialized ✓ |
| **Rendering** | `render.js` | Reads from state, updates on subscribe ✓ |
| **Game Rules** | `wardensDebt/gameplay.js` | Pure functions, validation ✓ |

### ⚠️ What Needs Fixing

| Issue | Files | Why | Impact |
|-------|-------|-----|--------|
| No action abstraction | `drag.js`, `gameplay.js` | Game mutations are direct; history capture is manual | Hard to add features without bugs |
| DOM as query source | `drag.js` | Uses `node.dataset.wdKind` instead of `gameState` | Breaks if rendering changes; state diverges |
| Dual history systems | `state.js` + `wardensDebt/runtime.js` | View settings and game state have separate undo | Confusing to maintain; not unified |

---

## Refactoring Phases

Each phase is **independent and low-risk**. Complete them in order, but each can be done incrementally.

---

## Phase A: Introduce Action Abstraction

**Goal:** Centralize game mutations and history capture under one pattern.

**Why:** Manual `freezeWdHistory()`/`commitWdHistory()` calls are fragile. A unified action system makes history automatic, rules explicit, and features safer.

**Effort:** 2–3 days | **Risk:** Low

### Changes

#### A1: Create `wardensDebt/actions.js`

New file that exports a single pattern:

```javascript
// wardensDebt/actions.js

/**
 * Apply a named action to game state.
 * Handles mutation, validation, history capture, and notification.
 * 
 * Pattern:
 *   const nextState = applyAction(gameState, 'actionName', payload)
 */

export function applyAction(gameState, actionName, payload, runtimeState) {
  // 1. Look up action handler
  const handler = ACTIONS[actionName];
  if (!handler) throw new Error(`Unknown action: ${actionName}`);

  // 2. Apply mutation (handler is pure: gameState -> nextGameState)
  const nextState = handler(gameState, payload);

  // 3. Validate
  // validateWardensDebtGameState() called by updateWardensDebtGameState

  // 4. Return for caller to commit
  return nextState;
}

const ACTIONS = {
  'move-figure': (state, { figureId, cell }) => {
    return {
      ...state,
      board: {
        ...state.board,
        figurePositions: {
          ...(state.board.figurePositions || {}),
          [figureId]: cell,
        },
      },
    };
  },

  'draw-cards': (state, { convictIndex, count }) => {
    const nextState = structuredClone(state);
    const convict = nextState.convicts[convictIndex];
    if (!convict) throw new Error(`Invalid convict index`);
    // Call gameplay.drawCardsToConvictHand()
    drawCardsToConvictHand(convict, count, []);
    return nextState;
  },

  // ... other actions
};
```

**Acceptance Criteria:**
- [ ] `wardensDebt/actions.js` created with at least 3 actions
- [ ] Each action is pure: `(gameState, payload) -> nextGameState`
- [ ] All actions are listed in a `ACTIONS` map
- [ ] No side effects in action handlers

#### A2: Update `wardensDebt/runtime.js`

Modify `updateWardensDebtGameState()` to use actions:

```javascript
// Before
updateWardensDebtGameState(gameState => {
  gameState.board.figurePositions[figureId] = cell;
  return gameState;
});

// After
updateWardensDebtGameStateViaAction('move-figure', { figureId, cell });
```

New export:

```javascript
export function updateWardensDebtGameStateViaAction(actionName, payload) {
  const handler = runtimeState.status === 'ready' ? ACTION_HANDLERS[actionName] : null;
  if (!handler) throw new Error(`Unknown action: ${actionName}`);
  
  // Capture history before mutation
  captureWdHistory();
  
  // Apply action (which validates internally)
  const nextGameState = applyAction(runtimeState.gameState, actionName, payload);
  
  // Commit
  runtimeState.gameState = nextGameState;
  saveWdToUrl();
  commitWdHistory();
  notifyWardensDebtRuntime();
  return cloneRuntimeState();
}
```

**Acceptance Criteria:**
- [ ] `updateWardensDebtGameStateViaAction()` created
- [ ] History is captured/committed automatically
- [ ] Old `updateWardensDebtGameState()` still works (for gradual migration)
- [ ] Tests pass

#### A3: Migrate `drag.js` to use actions

```javascript
// Before
function setWardensDebtFigurePosition(figureId, cell) {
  updateWardensDebtGameState(gameState => {
    gameState.board.figurePositions[figureId] = cell;
    return gameState;
  });
}

// After
function setWardensDebtFigurePosition(figureId, cell) {
  updateWardensDebtGameStateViaAction('move-figure', { figureId, cell });
}
```

**Acceptance Criteria:**
- [ ] `drag.js` uses action-based mutations
- [ ] No manual `freezeWdHistory()`/`commitWdHistory()` calls in drag.js
- [ ] Drag operations still work (tested in browser)

---

## Phase B: Remove DOM as State Query

**Goal:** Stop using element data attributes (`node.dataset.wdKind`) to determine game state. Query `runtimeState.gameState` instead.

**Why:** Data attributes are implicit state. If rendering changes, they can drift or disappear. The source of truth should be explicit.

**Effort:** 2–3 days | **Risk:** Low

### Changes

#### B1: Refactor `drag.js` figure detection

```javascript
// Before
function wardensDebtFigureFromElement(el) {
  const kind = el.closest('.wd-figure').dataset.wdKind;
  const idx = Number(el.dataset.wdIdx);
  return { kind, idx };
}

// After
function wardensDebtFigureFromElement(el) {
  const figureEl = el.closest('.wd-figure');
  if (!figureEl) return null;
  
  const figureId = figureEl.dataset.wdId;
  const runtime = getWardensDebtRuntime();
  
  // Query the runtime state
  const convict = runtime.gameState?.convicts?.find(c => c.id === figureId);
  if (convict) {
    const idx = runtime.gameState.convicts.indexOf(convict);
    return { kind: 'wd-convict', idx, id: figureId };
  }
  
  const enemy = runtime.gameState?.enemies?.find(e => e.instanceId === figureId);
  if (enemy) {
    const idx = runtime.gameState.enemies.indexOf(enemy);
    return { kind: 'wd-enemy', idx, id: figureId };
  }
  
  return null;
}
```

**Acceptance Criteria:**
- [ ] `wardensDebtFigureFromElement()` queries `runtimeState.gameState`
- [ ] No longer relies on `dataset.wdKind`
- [ ] Drag operations still work

#### B2: Refactor map tile detection

Apply same pattern to `wardensDebtMapTileFromElement()`:

```javascript
// Query by id from runtime state instead of data attributes
```

**Acceptance Criteria:**
- [ ] `wardensDebtMapTileFromElement()` queries state
- [ ] Map tile drag/selection still works

#### B3: Audit remaining DOM queries

Search `drag.js` and other input handlers for:
- `node.dataset.*`
- `node.classList.contains()`
- Any implicit state in the DOM

Replace with explicit state queries.

**Acceptance Criteria:**
- [ ] Grep finds no game-logic queries on DOM
- [ ] All queries go through `runtimeState.gameState`

---

## Phase C: Consolidate History (Optional)

**Goal:** Unify undo/redo so view state and game state share one history system.

**Why:** Cleaner API, easier mental model. Currently undo/redo is split.

**Effort:** 1–2 days | **Risk:** Medium (touches undo/redo)

**Decision Point:** Only do this if undo/redo bugs appear. Can skip if current dual-system works.

### Changes (If Proceeding)

#### C1: Merge `state.js` and `wardensDebt/runtime.js` history

Unified history entry:

```javascript
const historyEntry = {
  viewState: { showGridLabels: ... },
  gameState: { ... },
  timestamp: Date.now(),
};
```

#### C2: Export unified `undo()` / `redo()` from `main.js`

**Acceptance Criteria:**
- [ ] Single undo/redo system
- [ ] View + game state change together
- [ ] Undo/redo buttons work for both
- [ ] Tests pass

---

## Phase D: Extract Input Pipeline (Optional)

**Goal:** Separate "click → identify figure" from "move figure" logic.

**Why:** Makes input handling testable, reusable, and easier to extend (keyboard, AI, etc.).

**Effort:** 3–4 days | **Risk:** Medium

**Decision Point:** Only do after Phase A is stable. Can skip if current drag.js is maintainable.

### If Proceeding

Create `wardensDebt/input.js`:

```javascript
// Translate input events → actions
export function onFigureClicked(figureId, modifiers) {
  // Returns an action or null
  return { action: 'select-figure', payload: { figureId } };
}

export function onFigureDragged(figureId, from, to) {
  return { action: 'move-figure', payload: { figureId, cell: to } };
}
```

Then `drag.js` calls these and applies actions.

---

## Completion Checklist

### Phase A: Action Abstraction (HIGH PRIORITY)
- [ ] `wardensDebt/actions.js` created
- [ ] At least 3 game actions defined (move, draw, etc.)
- [ ] `updateWardensDebtGameStateViaAction()` works
- [ ] `drag.js` migrated to use actions
- [ ] Browser tests pass: drag, undo/redo, history

### Phase B: Remove DOM Queries (HIGH PRIORITY)
- [ ] `wardensDebtFigureFromElement()` queries state
- [ ] `wardensDebtMapTileFromElement()` queries state
- [ ] All game logic queries removed from DOM
- [ ] Browser tests pass: selection, drag

### Phase C: Unified History (OPTIONAL)
- [ ] Decision made: proceed or defer
- [ ] If proceeding: history system merged
- [ ] Browser tests pass: undo/redo

### Phase D: Input Pipeline (OPTIONAL)
- [ ] Decision made: proceed or defer
- [ ] If proceeding: input handlers extracted
- [ ] Codebase is cleaner and more testable

---

## Testing Strategy

After each phase:

1. **Manual browser test** — open WardensDebt in dev server
   - Drag figures around
   - Undo/redo actions
   - Check sidebar updates
   - Verify state in browser console: `getWardensDebtRuntime().gameState`

2. **Check no regressions** — all existing features work
   - Selection still works
   - Mobile UI still works
   - Settings persist
   - URL state persists

3. **Code review** — before committing:
   - No direct DOM mutations of game state
   - All mutations go through actions (Phase A)
   - State queries use `runtimeState`, not DOM (Phase B)

---

## Reference: File Changes by Phase

### Phase A
- **Create:** `wardensDebt/actions.js`
- **Modify:** `wardensDebt/runtime.js`, `drag.js`
- **Keep:** All other files

### Phase B
- **Modify:** `drag.js`, `render.js` (if querying state)
- **Keep:** All other files

### Phase C (Optional)
- **Modify:** `state.js`, `wardensDebt/runtime.js`
- **Keep/Remove:** Consider removing dual-system

### Phase D (Optional)
- **Create:** `wardensDebt/input.js`
- **Modify:** `drag.js`
- **Keep:** All other files

---

## Notes

- **Do not rewrite everything at once.** Complete one phase, test in browser, commit, then move to the next.
- **Each phase stands alone.** You can pause after Phase B and have a much cleaner codebase. Phases C and D are polish.
- **Preserve undo/redo throughout.** Any mutation phase should ensure history works.
- **Test in the browser.** Type checking alone won't catch logic bugs.

---

## Progress Log

Log completion here as phases finish:

- [x] **Phase A** — Started: 2026-05-08 | Completed: 2026-05-08
  - Created action abstraction with 15 game actions
  - Migrated drag.js and sidebar.js to use updateWardensDebtGameStateViaAction()
  - Automatic history capture, no manual freeze/commit needed
- [x] **Phase B** — Started: 2026-05-08 | Completed: 2026-05-08
  - Refactored wardensDebtFigureFromElement() to query gameState
  - Refactored wardensDebtMapTileFromElement() to query gameState
  - Removed DOM as implicit state source
  - Fixed drag/pan by removing legacy history calls
- [x] **Phase C** — Skipped (too complex for marginal benefit)
  - Unified history was over-engineered
  - Separate systems working fine; not a bottleneck
- [x] **Phase D** — Started: 2026-05-08 | Completed: 2026-05-08
  - Created wardensDebt/input.js with pure input handlers
  - All game mutations flow through input pipeline
  - Input and game logic completely separated

---

## Related Documents

- `Restructure code.md` — conceptual guide for the refactoring principles
- `STATUS.md` — high-level project status
- Audit from 2026-05-08 — baseline assessment (in conversation history)
