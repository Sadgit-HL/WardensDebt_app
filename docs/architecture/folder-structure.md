# Project Folder Structure

Overview of the codebase organization and purpose of each directory.

**Note:** GUI layout was redesigned 2026-05-08. See `gui-layout.md` for detailed layout architecture. This document covers file organization.

## Root

```
C:\Users\hansen\ai\WardensDebt_app\
├── README.md                  Main project guide
├── STATUS.md                  Roadmap and historical status
├── start.bat                  Launch script (Windows)
├── git.bat                    Git wrapper (Windows)
├── .gitignore
├── ai/                        AI-specific instructions
├── docs/                      Project documentation
├── WardensDebt/               Main app code and assets
├── data/                      Game content (moved to WardensDebt/data/)
└── archive/                   Old documentation (reference only)
```

## ai/

**AI instruction files. Authoritative for this project.**

```
ai/
├── AI_PROJECT.md              What the project IS (one-page summary)
├── AI_RULES.md                Coding rules and architectural constraints
└── MEMORY.md                  AI session memory (cross-session context)
```

Priority: `AI_RULES.md` > `AI_PROJECT.md` > architecture docs

## docs/

**Project documentation. Reference and explanation.**

```
docs/
├── architecture/              System design (how things work)
│   ├── folder-structure.md    This file
│   ├── state-system.md        [Future] state management
│   └── rendering-pipeline.md  [Future] SVG rendering
├── reference/                 Lookup and reference
│   ├── glossary.md            Terminology (content vs runtime vs board)
│   ├── data-model.md          Content schema reference
│   └── content-workflow.md    How to author/import content
└── sessions/                  Session notes (disposable, historical)
    └── [date-notes].md        Temporary session work
```

## WardensDebt/

**Main application.**

```
WardensDebt/
├── index.html                 Main page
├── styles/
│   └── main.css
├── images/
│   ├── maptiles/              Map tile graphics
│   ├── common/                Shared assets (mercenaries, conditions, elements)
│   └── [other assets]
├── scripts/
│   ├── main.js                Entry point
│   ├── render.js              SVG rendering pipeline
│   ├── drag.js                Mouse/touch input
│   ├── sidebar.js             Inspector UI
│   ├── state.js               View state (settings, selection)
│   ├── uiState.js             Ephemeral UI state
│   ├── mobile.js              Mobile shell
│   ├── controls.js            Board zoom/rotate/pan
│   ├── [utilities]            hex.js, rotation.js, lzString.js
│   └── wardensDebt/           Game-specific code (see below)
└── data/
    └── wardens-debt/
        ├── core-set.json      Game content (loaded at runtime)
        └── sheets/            Authoring workflow files
            ├── workbook.json  Local content export
            ├── published-sheet.json  Google Sheets config
            ├── csv-templates/ CSV mirrors of Sheets tabs
            └── [other metadata]
```

## WardensDebt/scripts/ (Detail)

### Root level (UI Framework)

Inherited from original HavenMap. Reusable across game types.

```
main.js          Entry point, wires everything
render.js        SVG rendering (reads gameState, updates DOM)
drag.js          Input handling (mouse/touch, drag-drop)
sidebar.js       Inspector/editor UI
state.js         View settings (grid labels, etc)
uiState.js       Ephemeral UI state (selections, panels)
mobile.js        Mobile interaction shell
controls.js      Board zoom/rotate/pan
hex.js, rotation.js, lzString.js  Utilities
```

### wardensDebt/ (Game Logic)

Warden's Debt specific. Pure game logic, no UI.

```
runtime.js       Game state container, undo/redo, content loading
schema.js        Content validation and state factories
content.js       Content loader
actions.js       Pure game mutations (move, draw, play, etc)
gameplay.js      Game rules (phase advancement, effects, etc)
input.js         Input event handlers (click → action translation)
elements.js      Playbar UI (phase controls, dice, cards)
mapTiles.js      Map tile rendering and interaction
placement.js     Figure positioning logic
areaMaps.js      Area-map utilities
debugPanel.js    Development tools
importSheets.mjs Node.js script to import content from Google Sheets
```

## Data Flow

```
index.html
    ↓
main.js (entry point)
    ↓
wardensDebt/content.js (loads core-set.json)
    ↓
wardensDebt/schema.js (validates)
    ↓
wardensDebt/runtime.js (game state container)
    ↓
render.js (reads gameState, updates SVG)
    ↓
Input: drag.js, sidebar.js, elements.js
    ↓
wardensDebt/input.js (pure event handlers)
    ↓
wardensDebt/actions.js (pure mutations)
    ↓
wardensDebt/runtime.js (history, validation, notification)
    ↓
[cycle repeats]
```

## Key Principles

- **UI Framework (root)**: General-purpose, reusable
- **Game Logic (wardensDebt/)**: Data-driven, no UI code
- **Separation**: Rendering doesn't mutate; mutations don't render
- **State**: Centralized, immutable at load, derived rendering

## Adding New Files

**New game feature?** → `wardensDebt/` (or new action/rule)

**New UI component?** → Root `scripts/` (or `wardensDebt/elements.js` if WD-specific)

**New utility?** → Root `scripts/` (or `wardensDebt/` if WD-only)

**New content?** → `WardensDebt/data/wardens-debt/core-set.json`

**New doc?** → `docs/` (reference or architecture)

**Session notes?** → `docs/sessions/` (date-prefixed, disposable)
