# AI Coding Rules for Warden's Debt

Core architectural constraints and conventions. Violations should be deliberate and documented.

## State Management

- **gameState is authoritative** — all game truth lives in `runtimeState.gameState`
- **Never store game logic in DOM** — data attributes are view-only, not state queries
- **Separate concerns**: gameState, viewState (UI selections), boardState (legacy)
- **Mutations go through actions** — use `updateWardensDebtGameStateViaAction()`
- **History is automatic** — don't call freezeWdHistory/commitWdHistory manually

## Actions & Input

- **Pure input handlers** — `wardensDebt/input.js` functions return action descriptors, never mutate
- **All mutations through actions** — game logic only in `wardensDebt/actions.js`
- **Actions are pure** — `(gameState, payload) → nextGameState`
- **No side effects** — save to URL and notify observers happen in runtime.js, not actions

## Definitions & Content

- **Content is immutable** — loaded from `core-set.json`, never modified at runtime
- **Runtime instances reference definitions by ID** — don't duplicate definition data
- **Schema validation on load** — `validateWardensDebtContent()` before use
- **No hard-coded values** — all card stats, costs, effects come from content layer

## Rendering

- **Renderer derives from state** — `render.js` reads state, never writes it
- **No rendering logic in game code** — keep `wardensDebt/*.js` free of SVG/DOM
- **Subscribe pattern for updates** — listeners notified after state changes
- **Selection state is ephemeral** — lives in `uiState`, not saved

## File Organization

```
scripts/
├── [UI Framework]   main.js, render.js, drag.js, sidebar.js, state.js, mobile.js
├── [Board Controls] controls.js
├── [Utilities]      hex.js, rotation.js, lzString.js
└── wardensDebt/     [Game logic only]
    ├── runtime.js, schema.js, content.js
    ├── actions.js, gameplay.js, input.js
    ├── elements.js, mapTiles.js, placement.js, areaMaps.js
    └── debugPanel.js, importSheets.mjs
```

## Code Style

- **Prefer pure functions** — no hidden globals, explicit parameters
- **Use descriptive names** — `wardensDebtConvictHealth` not `health`
- **Minimal comments** — code should be self-explanatory; comment the WHY, not the WHAT
- **Error handling at boundaries** — validate user input and external API responses only
- **No defensive coding** — trust internal code invariants

## Testing

- **Manual browser testing is primary** — load app, play, verify UI
- **Test in browser console** — inspect `getWardensDebtRuntime().gameState`
- **No unit test required** — focus on integration testing (does the feature work end-to-end?)
- **Verify after each phase** — drag, undo/redo, selection, sidebar, mobile UI

## Incremental Refactoring

- **One phase at a time** — complete, test, commit before starting next
- **Backward compatibility optional** — if old code is completely migrated, delete it
- **Aggressive cleanup** — remove orphaned code, unused imports, stale files
- **Document decisions** — if skipping a phase or changing architecture, update STATUS.md

## Do Not

- Amend published commits — create new commits instead
- Force push to main — always create a new branch, PR review, merge
- Skip hooks or verification — if a hook fails, fix the issue, not the hook
- Commit without testing — verify the app works before pushing
- Leave dead code — delete unused files/functions, don't comment them out
