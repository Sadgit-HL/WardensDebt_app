# MEMORY

## Project Identity
- Workspace root: `C:\Users\hansen\ai\WardensDebt_app`
- Current app folder: `C:\Users\hansen\ai\WardensDebt_app\HavenMap`
- New project working title: `Wardens Debt`
- Current repository state: this workspace still contains the finished `HavenMap` browser app as the implementation baseline, but `Wardens Debt` now also has active prototype code, schema, content, runtime actions, and temporary UI integrated into the existing shell.

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

## Existing Codebase Snapshot
- `HavenMap` is a vanilla `HTML/CSS/JavaScript ES modules` app with no build step or framework.
- Main UI shell is in `HavenMap/index.html`.
- Runtime state is centralized in `HavenMap/scripts/state.js`.
- The app already has:
  - A substantial sidebar/detail editor flow
  - Mobile-specific UI shell in `HavenMap/scripts/mobile.js`
  - SVG-based rendering and interaction patterns
  - Undo/redo and serialized local state
  - Data-table driven content loading for game assets
- This makes the codebase useful as an interaction/UI architecture reference, but much of the current domain model is still HavenMap-specific.

## Useful Reusable Ideas From HavenMap
- Centralized state store with one patch/update path.
- Separate persisted game state and ephemeral UI state.
- Data indices/maps for fast lookup by id/title.
- Add/inspect/edit workflow in a single side panel.
- Mobile shell that swaps desktop sidebar behavior for bottom-sheet style controls.
- Incremental, framework-free architecture that is easy to refactor in place.

## Things That Should Not Be Carried Over Uncritically
- Hex-grid assumptions.
- URL-hash serialization as the long-term save system.
- HavenMap object taxonomy: `tiles`, `overlays`, `monsters`, `mercenaries`, `summons`.
- Gloomhaven/Frosthaven asset path rules and game switching model.
- Domain-specific labels such as scenario level, standees, conditions, and elements unless Wardens Debt genuinely needs equivalents.

## Command/Environment Reminders
- `start.bat` exists at the workspace root and is inherited from the HavenMap setup.
- There is no package manager/build pipeline in the current app baseline.
- A first Wardens Debt data-model contract now exists:
  - content/state spec: `WardensDebtDataModel.md`
  - content validator/state factory: `HavenMap/scripts/wardensDebt/schema.js`
  - sample content pack: `HavenMap/data/wardens-debt/core-set.json`
- A first Wardens Debt runtime/UI loop now exists:
  - shared runtime store: `HavenMap/scripts/wardensDebt/runtime.js`
  - gameplay actions: `HavenMap/scripts/wardensDebt/gameplay.js`
  - sidebar integration for actors/stats/conditions: `HavenMap/scripts/sidebar.js`
  - bottom play bar for round flow, hands, active cards, and phase buttons: `HavenMap/scripts/elements.js`
- Useful available tools noted in prior project memory:
  - `rg`, `git`, `jq`, `fd`, `delta`, `ast-grep (sg)`
  - `http-server`, `lighthouse`, `playwright`
  - `magick`, `shellcheck`

## Working Rules For Future Sessions
- Treat `HavenMap` as legacy baseline code for migration, not as the desired final domain model.
- Migration strategy: keep and reuse old HavenMap objects/modules when they still provide useful behavior with low confusion; remove them only when they clearly block Wardens Debt concepts or create repeated translation overhead.
- Do not purge HavenMap infrastructure aggressively during the prototype phase.
- Prefer isolating Wardens Debt concepts clearly over broad cleanup refactors.
- Rename legacy concepts when that materially improves Wardens Debt clarity; batch-delete dead legacy pieces later once they are clearly unused.
- Treat `WardensDebtDataModel.md` plus `HavenMap/scripts/wardensDebt/schema.js` as the current source of truth for the new domain model until a later migration step intentionally revises it.
- Do not assume every rule needs full automation. If a rule is still changing often, prefer manual or lightly assisted handling unless repeated bookkeeping pain clearly justifies automation.
- Before implementing Wardens Debt features, identify whether a module is reusable, adaptable, or better replaced.
- Keep docs in sync with the migration from HavenMap toward Wardens Debt.
- Prefer data-model decisions first, UI skinning second, and asset massaging later.
- Support the user's learning goal alongside implementation:
  - explain why certain files, tools, or workflows were chosen when that choice is materially instructive
  - distinguish project-specific decisions from generally useful AI-coding patterns
  - keep explanations concise and tied to the current task rather than turning every response into a tutorial
  - emphasize repeatable workflow habits such as narrow task definition, grounding in local context, small testable changes, and explicit verification
- Current implemented round structure:
  - `start-round`
  - `event-phase`
  - `select-cards`
  - `fast-cards`
  - `enemy-phase`
  - `slow-cards`
  - `end-round`
- Current implemented card-flow rules:
  - skill cards can only be selected during `select-cards`
  - selected `fast` skills queue in `activeCards.fastSkills`
  - selected `slow` skills queue in `activeCards.slowSkills`
  - fast skills resolve in `fast-cards`
  - slow skills resolve in `slow-cards`
  - queued skills discard at `end-round`
  - shared common skill cards enter a convict's hand immediately when taken from a common deck
  - after use, those common cards discard to that convict's discard pile and enter the redraw loop from there
  - convict hand size is currently capped at `8`
- Current implemented phase automation:
  - entering `event-phase` automatically draws one event card per convict into the active area
