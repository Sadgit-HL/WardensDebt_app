# MEMORY

## Project Identity
- Workspace root: `C:\Users\hansen\ai\WardensDebt_app`
- App folder: `C:\Users\hansen\ai\WardensDebt_app\WardensDebt` (renamed from HavenMap on 2026-05-08)
- Project: `Wardens Debt` (completed migration from legacy HavenMap baseline)
- Current state: Active prototype with complete action abstraction (Phase A), DOM decoupling (Phase B), and input pipeline extraction (Phase D). Architecture is ~80% toward strong design; Phase C (unified history) deliberately skipped as over-engineered.

## User Preferences
- Implement incrementally.
- Use the existing GUI/codebase as a practical starting point instead of rebuilding blindly.
- Keep strong desktop usability while preserving mobile viability.
- Responsive priority on smaller viewports: keep the `map` first and the `hand of cards` second; sidebar details and secondary controls should yield before those do.
- Stop at sensible checkpoints when visual/runtime verification is useful.
- Use the project as a way to learn efficient AI-assisted coding workflows, not just to ship features.
- Prefer brief, practical explanations of general workflow and decision-making when they help transfer skill.
- When making nontrivial changes, include a short note about the general engineering or AI-collaboration pattern behind the step when useful.

## Wardens Debt Product Direction
- Goal: a browser adaptation of a boardgame design for fast playtesting without physical prototypes.
- The game is expected to have many frequently changing components such as cards, stats, text, and balancing values.
- Core architectural rule from `Migration.md`: game engine logic must stay separate from game data.
- Prefer a data-driven design where changing content lives outside UI code.
- Automation target: prefer a semi-automated playtest tool, not a fully automated rules engine during active design.
- Manual intervention is acceptable when it is fast and low-risk, especially for mutable tabletop bookkeeping such as HP adjustment, condition placement/removal, piece movement, and similar state tweaks.
- Prioritize automation for repetitive bookkeeping, deck flow, dice rolling, and illegal-state prevention before attempting full effect automation.
- Recommended early content workflow: `Google Sheets -> JSON export -> validated data objects -> app UI/engine`.
- Recommended longer-term workflow: `database/custom editor` once content volume and balancing needs justify it.
- Card/effect data should use structured effect descriptors, not free-form executable code embedded in content rows.
- Wardens Debt map movement should use board-space coordinates, not HavenMap hex coordinates. A WD map tile is a composite graphic; figure positions may cross tile borders and tile handles are the only intended hit target for tile manipulation.

## Codebase Architecture (Current - Updated 2026-05-08)

**Tech Stack:**
- Vanilla `HTML/CSS/JavaScript ES modules` (no build, no framework)
- SVG-based rendering
- Centralized game state with undo/redo
- Data-driven content from JSON
- CSS Grid (main layout) + Flexbox (component layouts)

**Folder Structure (2026-05-08 - GUI Overhaul Complete):**
```
WardensDebt/
├── index.html (restructured with #game root, zone-based layout)
├── styles/
│   └── main.css (reorganized with layout foundations + component styles)
├── images/
├── scripts/
│   ├── [UI Framework] main.js, render.js, drag.js, sidebar.js, state.js, mobile.js, controls.js
│   └── wardensDebt/ [Game logic only]
│       ├── runtime.js, schema.js, content.js
│       ├── actions.js, gameplay.js, input.js
│       ├── elements.js (refactored for zone-based rendering)
│       └── mapTiles.js, placement.js, areaMaps.js, debugPanel.js
└── data/wardens-debt/core-set.json (game content)

Documentation Structure (2026-05-08):
├── README.md (user guide)
├── ai/
│   ├── AI_PROJECT.md (what the project IS)
│   ├── AI_RULES.md (coding rules - HIGHEST AUTHORITY)
│   └── MEMORY.md (this file)
├── docs/
│   ├── architecture/folder-structure.md (code org and data flow)
│   ├── reference/glossary.md (terminology)
│   ├── reference/data-model.md (content schema)
│   ├── reference/content-workflow.md (authoring)
│   └── sessions/ (disposable session notes)
└── archive/ (old docs for reference)
```

**Key Architectural Decisions:**
- State-driven: gameState is authoritative, rendering derived
- Action pattern: input → pure action → state mutation → notification
- No DOM as state: element data attributes are view-only
- History automatic: updateWardensDebtGameStateViaAction() captures before/after
- Content immutable: loaded from core-set.json, never mutated at runtime

## GUI Architecture (Redesigned 2026-05-08)

**Layout Zones (Full-Viewport):**
```
┌─────────────────────────────────────────────────┐
│ #top-bar (transparent flex groups)              │
│ Phase strip, dice, shared decks                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  #board-svg (full viewport overlay base)       │ #left-bar
│  Map, tiles, figures                            │ (Convict
│                                                 │  selector,
│                                                 │  center-left)
│                                                 │
│                                                 │ #info-panel
│                                                 │ (Selected obj
│                                                 │  info,
│                                                 │  center-right)
├─────────────────────────────────────────────────┤
│ #player-ui (transparent flex groups)            │
│ Hand | Convict Portrait | Active Cards          │
└─────────────────────────────────────────────────┘
```

**HTML Structure:**
- `#game` — root fixed-position viewport container
- `#board-svg` — full-viewport SVG base (z-index: 1)
- `#top-bar` — fixed top, transparent flex, controls grouped
- `#left-bar` — absolute overlay, left-center, convict toggles
- `#info-panel` — absolute overlay, right-center, transparent, scrollable
- `#player-ui` — fixed bottom, transparent flex, 3 sections:
  - `#hand-section` — flex, cards overlap left-to-right
  - `#convict-section` — fixed-size portrait + stats
  - `#active-section` — flex, queued cards overlap left-to-right

**CSS Architecture:**
- Grid for main layout zones (top/board/bottom)
- Flexbox for component internals
- Fixed positioning for overlays (left-bar, info-panel)
- Transparent backgrounds (board visible underneath)
- CSS variables for spacing (TBD during polish phase)
- Z-index layers: 1(board), 20(anchored), 30(overlays), 40(hover), 50(modals)

**Rendering Organization (elements.js):**
- `renderElements()` — orchestrator, calls zone renderers
- `renderConvictPortrait()` → #wd-playbar
- `renderHandCards()` → #hand-section
- `renderLeftBar()` → #left-bar
- `renderActiveStrip()` → #wd-active-strip
- `renderPhaseStrip()` → #wd-phase-strip
- `renderSharedDeckTopbar()` → #wd-shared-decks

**Interaction Model:**
- Click convict in left-bar → toggles active convict
- Hover cards → show full card detail (aspect-ratio fixed)
- Click hand card → play card (if phase allows)
- Click active card → resolve/remove (game logic)
- Click map object → select, show info in info-panel

## Launch & Development

**To run app:**
```bash
./start.bat  # Windows; opens http://localhost:8080/WardensDebt/
python3 -m http.server 8080  # macOS/Linux
```

**Documentation is now authoritative:**
- Start with: `README.md` (user guide) or `ai/AI_PROJECT.md` (what it is)
- Reference: `docs/reference/glossary.md` (terminology), `data-model.md`, `content-workflow.md`
- Architecture: `docs/architecture/folder-structure.md`
- Rules: `ai/AI_RULES.md` (HIGHEST AUTHORITY for coding)

**Key files for game content:**
- Schema/validation: `WardensDebt/scripts/wardensDebt/schema.js`
- Runtime state: `WardensDebt/scripts/wardensDebt/runtime.js`
- Game logic: `WardensDebt/scripts/wardensDebt/gameplay.js`
- Actions: `WardensDebt/scripts/wardensDebt/actions.js`
- Content: `WardensDebt/data/wardens-debt/core-set.json`

**Cleanup completed (2026-05-08):**
- Deleted `WardensDebt/scripts/games/` (orphaned HavenMap game definitions)
- Moved `elements.js` to `WardensDebt/scripts/wardensDebt/` (WD-specific UI)
- Renamed folder `HavenMap/` → `WardensDebt/` (correct branding)
- Updated all path references in docs, HTML, batch files

**Available tools:**
- `rg` (grep), `git`, `jq`, `fd`, `delta`, `ast-grep (sg)`
- `http-server`, `lighthouse`, `playwright`
- Node.js for content import script

## Refactoring Progress (Completed 2026-05-08)

**Phase A: Action Abstraction** ✅
- Created `wardensDebt/actions.js` with 15 game actions
- Each action: `(gameState, payload) → nextGameState` (pure)
- Auto-captures history (no manual freeze/commit)
- Migrated `drag.js`, `sidebar.js` to action-based API

**Phase B: Remove DOM as State** ✅
- Refactored `wardensDebtFigureFromElement()` to query gameState, not DOM data-attrs
- Refactored `wardensDebtMapTileFromElement()` similarly
- Removed all implicit DOM state queries in game logic

**Phase C: Unified History** ⏸️ SKIPPED
- Separate view/game undo/redo systems work fine
- Consolidation was over-engineered, not bottleneck
- Deliberately skipped per decision on 2026-05-08

**Phase D: Input Pipeline** ✅
- Created `wardensDebt/input.js` with pure event handlers
- Each handler: event → { action, payload } (or null)
- All mutations flow through this pipeline
- Input and game logic completely separated

**Phase E: GUI Overhaul** ✅ (2026-05-08)
- Removed `element-bar` wrapper and collapsed bottom-bar controls
- Restructured HTML with `#game` root and zone-based layout
- Redesigned with full-viewport board + transparent overlays
- Left-bar: convict selector (center-left), absolute positioned
- Info-panel: selected object info (center-right), absolute positioned
- Player UI: hand | portrait | active cards (bottom, transparent)
- Refactored `elements.js` with separate zone renderers
- Made `sidebar.js` gracefully handle missing sidebar (using info-panel now)
- Layout uses CSS Grid (main) + Flexbox (components)
- **Status:** Functional layout complete, polish phase pending

## Working Rules For Future Sessions

**Documentation & Memory:**
- Authority hierarchy: `ai/AI_RULES.md` > architecture docs > reference docs > archive
- Update `ai/MEMORY.md` after major changes to reflect current state
- Keep `README.md` and `docs/` in sync with code
- Archive old docs; don't delete (historical reference)

**Code Organization:**
- Wardens Debt logic goes in `wardensDebt/` (game-specific only)
- Root `scripts/` for UI framework (reusable across games)
- No game logic in rendering or input files (keep pure)
- All mutations through actions (no direct state edits)

**Development Workflow:**
- One phase/feature at a time; test in browser before commit
- Prefer small, testable changes over big rewrites
- Delete unused code aggressively (don't comment out)
- Avoid backward-compatibility shims; refactor and move on

**Testing & Verification:**
- Manual browser testing is primary verification
- Check `getWardensDebtRuntime().gameState` in console
- Test golden path + edge cases (drag, undo, selection, mobile)
- Don't commit without browser verification

**Data Model & Automation:**
- Source of truth: `docs/reference/data-model.md` + `wardensDebt/schema.js`
- Content is immutable JSON (loaded from `core-set.json`)
- Semi-automated playtesting: human judgment for ambiguous rules, automation for bookkeeping
- Don't hard-code values; all card stats/costs come from content

**Learning & Communication:**
- Support user's goal of learning efficient AI-assisted workflows
- Explain architectural patterns and decision-making (briefly, tied to task)
- Emphasize: narrow task definition, grounding in context, small testable changes, explicit verification
- Prefer brief, practical explanations over tutorials
## Game Rules (Implemented)

**Round Structure:**
- `start-round` → `event-phase` → `select-cards` → `fast-cards` → `enemy-phase` → `slow-cards` → `end-round`

**Card Flow:**
- Skill cards selected only during `select-cards`
- `fast` skills queue in `activeCards.fastSkills`, resolve in `fast-cards`
- `slow` skills queue in `activeCards.slowSkills`, resolve in `slow-cards`
- Queued skills discard at `end-round`
- Common skill cards enter hand immediately when taken from deck
- Discarded cards return to that convict's discard pile, enter redraw loop
- Convict hand cap: 8 cards

**Automation:**
- `event-phase` entry: auto-draw one event card per convict to active area
- Dice rolling: automated
- Deck flow: automated (draw/discard management)
- Effects: structured descriptors, not code
- Manual: HP adjustment, condition placement, piece movement, ambiguous rule resolution

**Map & Movement:**
- Uses board-space `x/y` placement (not hex)
- Map tiles are composite graphics; figures can cross borders
- Tile selection via handle-only affordance (not whole artwork)
- Area-map tracking: future feature, not assumed by current code
