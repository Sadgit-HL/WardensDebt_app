# GPT Working Guide for Wardens Debt

This file is the handoff context for future GPT/Codex sessions in this workspace.

## Workspace

- Session root: `C:\Users\hansen\ai\WardensDebt_app`
- Current implementation folder: `HavenMap\`
- Planning transcript: `Migration.md`
- Memory file: `MEMORY.md`
- Launch script: `start.bat`
- A dedicated git repository now exists at the workspace root for the Wardens Debt app project.

## What This Project Is Now

`Wardens Debt` is the new target project. The intended product is a browser adaptation of a boardgame design to support efficient playtesting without physical prototypes.

As of `2026-05-06`, the actual runnable app is still structurally `HavenMap`, a finished browser-based SVG board editor/helper for the Gloomhaven/Frosthaven family, but Wardens Debt is no longer only planning material. The current task state is therefore:

- Product direction is Wardens Debt.
- Implementation baseline is HavenMap.
- Wardens Debt now has an active prototype runtime, content pack, gameplay actions, and temporary UI layered into the existing shell.
- The next major job remains migration/refactoring, not feature polish on the old HavenMap domain model.

## Current Step-1 Status

Roadmap step 1 has now been started in code, not just in notes.

Current source-of-truth files for the first Wardens Debt model:

- `WardensDebtDataModel.md`
- `HavenMap/scripts/wardensDebt/schema.js`
- `HavenMap/data/wardens-debt/core-set.json`

What is defined there now:

- a versioned content schema for distinct content families
- a versioned runtime game-state shape separate from authored content
- a validator for content packs
- a factory that creates prototype runtime state from a chosen scenario
- a shared runtime store used by both the debug panel and the reused HavenMap UI shell
- gameplay actions for dice, draws, redraws, active-card resolution, skill selection, and phase progression

This is still an early vertical-slice model. It is intentionally narrow and should be refined through the first playable loop rather than expanded speculatively.

## Direction From Migration.md

The planning transcript establishes these architectural priorities:

- Keep rules/mechanics code separate from content data.
- Do not hard-code card values, text, costs, stats, or effects into components.
- Start data-driven.
- Use structured effect descriptors instead of arbitrary code in content rows.
- Preferred early-stage content workflow:

```text
Google Sheets -> JSON export -> validation -> game engine -> UI
```

- Preferred longer-term content workflow:

```text
PostgreSQL/Supabase + custom editor
```

This means future work should prioritize a clean Wardens Debt data model and content ingestion path before deep UI rewrites.

## Playtesting Automation Policy

The current product goal is efficient digital playtesting, not a full video-game-style automation layer.

Working guidance:

- Prefer a semi-automated playtest tool over a fully automated rules engine while the boardgame is still changing frequently.
- Manual intervention is acceptable when it is quick, visible, and low-risk:
  - reducing or restoring HP
  - adding or removing condition markers
  - moving pieces
  - resolving ambiguous or still-evolving effects
- Automation should first target repeated bookkeeping and error prevention:
  - deck draw/play/discard flow
  - dice rolling
  - state validation
  - turn/phase reminders
  - common effect helpers for stable effects

The practical threshold is simple: automate what repeatedly slows tests down or causes mistakes; keep frequently changing or judgment-heavy rules manual until the design settles.

## What The Existing Codebase Actually Is

The current app under `HavenMap\` is a vanilla web app:

- `index.html`
- `styles/main.css`
- `scripts/*.js` ES modules
- no framework
- no bundler
- no package manager

Key confirmed implementation details:

- `HavenMap/index.html` defines a large SVG board, a right sidebar, a bottom action bar, and a mobile shell.
- `HavenMap/scripts/main.js` wires together render, controls, drag, sidebar, elements, level, share, and mobile modules.
- `HavenMap/scripts/state.js` is the central state store and persists runtime data in the URL hash using Base64-encoded JSON.
- `HavenMap/scripts/sidebar.js` contains a large amount of reusable inspector/editor interaction logic:
  - selection-aware side panel rendering
  - object actions
  - add/search flows
  - quick stat editing
  - keyboard shortcuts
  - stack selection/reordering
- `HavenMap/scripts/mobile.js` already provides a separate mobile interaction shell with panel switching and quick actions.
- `HavenMap/scripts/data.js` and `scripts/games/*.js` use table-driven game data rather than hard-coding everything directly in render logic.
- `HavenMap/scripts/wardensDebt/content.js` loads a Wardens Debt content pack and validates it through the new schema module.

## Reusable Architectural Pieces

These parts are likely useful during migration:

- Vanilla JS module structure with low tooling overhead.
- Centralized state updates through `patch(...)`.
- Split between persisted app state and ephemeral UI state.
- Inspector/add-panel interaction model.
- Mobile-specific controls already separated into their own module.
- Data lookup tables and content indexing patterns.
- Simple local-server workflow via `start.bat`.

## Legacy/HavenMap-Specific Assumptions

These are embedded in the current app and should be treated as migration targets, not Wardens Debt design decisions:

- Hex-board spatial model. Wardens Debt now uses board-space placement for figures and a handle-only tile interaction model; tile borders are not movement fences.
- SVG rendering pipeline centered on map tiles and figures.
- URL-hash save format as the primary persistence mechanism.
- Domain arrays:
  - `tiles`
  - `overlays`
  - `monsters`
  - `mercenaries`
  - `summons`
- Gloomhaven-family terminology and assets.
- Scenario-level, standee, condition, and element systems.

## Current Functional Baseline

If the app is launched today, it is still structurally HavenMap, but the bottom bar and sidebar now expose a Wardens Debt prototype loop.

Confirmed baseline behavior from the current code/docs:

- Board-centric SVG rendering.
- Right sidebar for inspect/add/settings.
- Bottom toolbar shell now hosts a Wardens Debt play bar rather than the old desktop element tray.
- Mobile shell with tabs for controls, elements, selection, and settings.
- Undo/redo supported in state.
- Keyboard shortcuts and object manipulation flows already implemented.
- Data tables and local image assets drive the current game-specific content.
- Wardens Debt prototype behavior currently includes:
  - shared runtime loading from `core-set.json`
  - sidebar actor roster plus manual HP/condition editing for convicts and enemies
  - bottom-bar player hand/actions
  - active-card display and resolve-to-discard actions
  - phase controls with automatic event draw in `event-phase`
  - queued `fast` and `slow` skill resolution by phase

Current design decision for Wardens Debt maps:

- Do not force Wardens Debt map tiles into HavenMap's hex grid.
- A Wardens Debt map tile is currently treated as a composite board graphic with a selectable handle.
- Runtime figure placement uses board-space coordinates in `board.figurePositions`.
- Figures can cross tile borders on composite maps.
- Future area-graph rules remain optional and should only be added if playtesting needs them.

## Recommended Migration Strategy

The practical path forward is:

1. Decide the new Wardens Debt domain model.
2. Decide the first external content source format.
3. Build a validation/import layer for Wardens Debt content.
4. Replace HavenMap-specific state shape with Wardens Debt entities.
5. Add a Wardens Debt area-map layer only if playtesting later proves the need; do not block the current board-space model on it.
6. Reuse/adapt the existing editor and mobile interaction patterns around the new entities.
7. Remove or replace hex/map/SVG assumptions only after the new playtest loop is clear.

In practice, the first concrete code task should probably be one of:

- refine the Wardens Debt data schema through a tiny playable slice
- create local JSON fixtures that mirror the intended Google Sheets schema
- replace the current default state structure with a Wardens Debt prototype state
- identify which existing UI modules remain useful after the new state shape is introduced

## Roadmap

Use this sequence unless a later planning decision explicitly changes it:

1. Define the Wardens Debt core data model and stop depending on HavenMap's domain entities as the conceptual baseline.
   Status as of `2026-05-06`: started. The first versioned content contract and runtime-state contract now exist, but they are not wired into the main app state yet.
2. Create local JSON fixtures for a tiny vertical slice such as a couple of cards, a minimal scenario state, and one or two entities.
3. Build a validation and import layer around that content model.
4. Introduce a Wardens Debt prototype state shape in the existing state store while preserving the good architecture patterns:
   - centralized updates
   - clear separation between persisted state and ephemeral UI state
   - indexed lookups for fast access
5. Implement one real playtest loop using the sample content.
6. Reuse or adapt the existing sidebar, editor, and mobile-shell interaction patterns around the new state where they still fit.
7. Remove HavenMap-specific assumptions deliberately rather than wrapping them forever:
   - hex and map assumptions
   - tile-bound figure constraints
   - SVG board-centric rendering assumptions
   - HavenMap entity taxonomy
   - URL-hash persistence as the long-term save model
   - Gloomhaven and Frosthaven labels or assets
8. After the prototype loop is stable, expand content tooling and decide whether JSON export remains sufficient or whether a database and custom editor are justified.

The key checkpoint is Phase 5 above. Until there is a working Wardens Debt playtest loop, avoid large cosmetic rewrites or broad cleanup work that does not reduce migration risk.

## Current Wardens Debt Prototype Rules

Current implemented round structure:

1. `start-round`
2. `event-phase`
3. `select-cards`
4. `fast-cards`
5. `enemy-phase`
6. `slow-cards`
7. `end-round`

Current implemented card flow:

- Players begin with starter cards in their personal decks.
- Common skill cards are taken from one or more shared common-skill decks.
- Taking a common skill card puts it directly into the player hand.
- Skill cards can only be selected during `select-cards`.
- Selected `fast` cards queue for `fast-cards`.
- Selected `slow` cards queue for `slow-cards`.
- Queued skills resolve automatically in their matching phase.
- Both fast and slow queued skills discard at `end-round`.
- Discarded cards recycle into the personal draw pile during redraw/draw flow.
- Player hand size is currently capped at `8`.

Current implemented phase automation:

- Entering `event-phase` automatically draws one event card per convict into `activeCards.event`.
- Event, item, agenda, mission, monster, and location cards can be manually resolved from the active area into their own discard piles.

The exact field names may still evolve, but these rules are now implemented rather than speculative.

## How To Run The Current Baseline

From the workspace root:

```bat
start.bat
```

The launch behavior is inherited from HavenMap. The current app serves the workspace and opens the HavenMap UI in a browser.

## Verification

There is still no formal automated test suite in this workspace.

For JavaScript syntax checks on the current baseline:

```powershell
Get-ChildItem HavenMap\scripts -Recurse -Filter *.js | ForEach-Object { node -c $_.FullName }
```

Manual verification today still means testing HavenMap behavior unless/until Wardens Debt code is introduced.

## Immediate Next-Step Recommendation

Before substantial UI changes, introduce Wardens Debt-specific content and state in a small vertical slice:

- one or two example cards
- one import/validation path
- one simple playtest interaction loop

That work should begin with Phase 1 of the roadmap:

- define the first Wardens Debt schema
- create matching local JSON fixtures
- wire those fixtures through a minimal validation/import path

That will reveal which parts of HavenMap are truly reusable and which should be replaced.
