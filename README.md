# Warden's Debt — Digital Playtesting Environment

Browser-based playtesting tool for the Warden's Debt boardgame design.

## Quick Start

```bash
# Windows
./start.bat

# macOS/Linux
python3 -m http.server 8080
# Then open http://localhost:8080/WardensDebt/
```

## Project Structure

```
WardensDebt/
├── index.html              # Main page
├── scripts/
│   ├── main.js             # Entry point
│   ├── render.js           # SVG rendering
│   ├── drag.js             # Input handling
│   ├── sidebar.js          # Inspector UI
│   ├── state.js            # View state (settings, selection)
│   ├── uiState.js          # Ephemeral UI state
│   ├── controls.js         # Board zoom/rotate/pan
│   └── wardensDebt/        # Game logic
│       ├── runtime.js      # Game state container
│       ├── schema.js       # Content validation
│       ├── content.js      # Content loader
│       ├── actions.js      # Pure game mutations
│       ├── gameplay.js     # Game rules
│       ├── input.js        # Input event handlers
│       └── elements.js     # Playbar UI
├── styles/main.css
└── images/                 # Assets

docs/
├── architecture/           # System design docs
├── reference/              # Glossary, data model
└── sessions/               # Session notes (disposable)

data/wardens-debt/
├── core-set.json           # Game content (loaded at runtime)
└── sheets/                 # Google Sheets authoring workflow
```

## Core Concepts

### Three Data Layers

1. **Game Content** — Static definitions (cards, scenarios, convicts)
   - Location: `WardensDebt/data/wardens-debt/core-set.json`
   - Immutable at runtime

2. **Game State** — Live play session
   - Location: `runtimeState.gameState`
   - Current turn, hand, discard piles, active cards, etc.
   - Managed by `wardensDebt/runtime.js`

3. **View State** — UI selections and settings
   - Location: `state` (settings) and `uiState` (selections)
   - Separate from game logic, ephemeral

See `docs/reference/glossary.md` for precise terminology.

### Action Pattern

All game mutations flow through pure actions:

```javascript
// Input handler (pure, no side effects)
wardensDebt/input.js:
  onFigureMoved(figureId, cell) → { action: 'move-figure', payload: {...} }

// Action dispatcher (automatic history)
wardensDebt/runtime.js:
  updateWardensDebtGameStateViaAction('move-figure', payload)

// Pure mutation (no side effects)
wardensDebt/actions.js:
  ACTIONS['move-figure'](gameState, payload) → nextGameState
```

## Playing a Game

1. Open http://localhost:8080/WardensDebt/
2. App loads default scenario from `core-set.json`
3. Select convicts/enemies in sidebar
4. Use bottom playbar to:
   - Advance phase
   - Roll dice
   - Draw cards
   - Play skills
5. Use Undo (↶) to revert
6. All state persists in URL (`?wd=...`)

## Development

### Running Tests

Load the app, then in browser console:

```javascript
// Check game state
getWardensDebtRuntime().gameState

// Test an action
updateWardensDebtGameStateViaAction('move-figure', { figureId: 'c1', cell: { x: 100, y: 200 } })

// Check UI state
uiState
```

### Modifying Game Content

Edit `WardensDebt/data/wardens-debt/core-set.json` and reload.

For Google Sheets workflow, see `docs/reference/content-workflow.md`.

### Adding a Game Action

1. Define action in `wardensDebt/actions.js`:
   ```javascript
   'my-action': (gameState, payload) => {
     // return mutated gameState
   }
   ```

2. Add input handler in `wardensDebt/input.js`:
   ```javascript
   export function onMyAction(data) {
     return { action: 'my-action', payload: {...} }
   }
   ```

3. Wire in `drag.js` or `elements.js`:
   ```javascript
   const result = onMyAction(...)
   if (result) updateWardensDebtGameStateViaAction(result.action, result.payload)
   ```

## Documentation

- `ai/AI_PROJECT.md` — Project overview (this)
- `ai/AI_RULES.md` — Coding rules and constraints
- `docs/architecture/` — System design (state, rendering, etc.)
- `docs/reference/glossary.md` — Terminology (content vs runtime vs board state)
- `docs/reference/data-model.md` — Data structure reference
- `docs/reference/content-workflow.md` — Google Sheets import process

## Current Status

- ✅ Phases A, B, D complete (action abstraction, input pipeline)
- ⏸️ Phase C skipped (unified history not worth complexity)
- 🔄 Folder structure reorganized
- 🔄 Legacy code cleaned

See `STATUS.md` for detailed roadmap and history.

## Key Decisions

- **No framework** — Vanilla JS for simplicity and transparency
- **No bundler** — Modules loaded directly by browser
- **State-driven UI** — Renderer derives from state, not vice versa
- **Immutable content** — Game definitions never change at runtime
- **Pure actions** — All mutations testable functions
- **Semi-automated** — Human judgment for ambiguous rules, automation for bookkeeping

## Contact & Contributing

This is a playtesting tool. Feedback and improvements welcome.

For AI-assisted development, see `ai/MEMORY.md`.
