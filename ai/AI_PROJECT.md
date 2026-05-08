# Warden's Debt Project Overview

**Browser-based boardgame playtesting environment.**

## What This Is

A digital playtesting tool for the Warden's Debt boardgame design. Supports rapid iteration on game rules, mechanics, and content without physical prototypes.

## Tech Stack

- HTML, CSS, Vanilla JavaScript (ES modules)
- No framework, no bundler, no package manager
- Single-player SVG board interface
- JSON-based game content and state
- Git-based version control

## Core Architecture

- **State**: Centralized game state, derived rendering
- **Content**: Immutable static game definitions (cards, scenarios, etc.)
- **Runtime**: Live play session state
- **Input**: Pure event handlers → actions → mutations
- **UI**: Separate view state from game state

## Key Files

- `WardensDebt/scripts/wardensDebt/runtime.js` - game state management
- `WardensDebt/scripts/wardensDebt/schema.js` - content validation
- `WardensDebt/data/wardens-debt/core-set.json` - game content
- `WardensDebt/scripts/main.js` - UI entry point

## Current Status (2026-05-08)

- ✅ Action abstraction (Phase A) - completed
- ✅ DOM decoupled from state (Phase B) - completed
- ✅ Input pipeline extracted (Phase D) - completed
- ⏸️ Unified history (Phase C) - skipped (not worth complexity)
- 🔄 Folder structure reorganized
- 🔄 Legacy code cleaned (games/ folder removed)

## Primary Goals

1. Support efficient playtesting before physical manufacturing
2. Keep rules/mechanics separate from content data
3. Maintain data-driven architecture (Google Sheets → JSON → runtime)
4. Semi-automated tool (human judgment for ambiguous rules)

## How To Run

```bash
./start.bat
```

Opens http://localhost:8080/WardensDebt/ in your browser.

## Next Steps

1. Stabilize playtest loop with current content
2. Refine data model through playtesting
3. Expand content authoring workflow
4. Consider database + custom editor for longer-term content management
