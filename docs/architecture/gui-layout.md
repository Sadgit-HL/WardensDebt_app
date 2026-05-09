# GUI Layout Architecture

Complete redesign of Warden's Debt UI completed 2026-05-08. Popover system added 2026-05-09.

## Overview

Full-viewport board-centric layout with transparent overlays. Game board (SVG) covers entire screen; all UI panels overlay on top with transparent backgrounds so the map remains visible.

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOP-BAR  (fixed top, full width, CSS grid: auto 1fr auto)            │
│ ┌────────────────┬──────────────────────┬────────────────────────┐   │
│ │ wd-monster-    │  wd-center-strips    │   wd-right-strips      │   │
│ │ strip          │  • wd-phase-strip    │ • wd-skill-strip       │   │
│ │ • Enemy types  │    Planning Phase ‹› │ • wd-deck-strip        │   │
│ │   hover info   │  • wd-counter-strip  │   Monster│Event│Item│  │   │
│ │                │    Doom / Debt       │   Location│Agenda│Mis│   │   │
│ └────────────────┴──────────────────────┴────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LEFT-BAR (fixed left,           BOARD (SVG, full viewport)          │
│  bottom aligned to player-ui)    Map tiles, figures, selections      │
│  • Other convict thumbnails                                          │
│  • + add-figure button                        INFO-PANEL             │
│  • ↺ clear-URL button                (fixed right, center overlay)   │
│                                      Add-figure panel when open      │
│                                                                      │
│                          POPOVER (fixed, anchored to selected object) │
│                          Full object info: HP, conditions, controls  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ PLAYER-UI  (fixed bottom, full width, CSS grid: 1fr auto 1fr)        │
│ ┌──────────────────┬─────────────────┬────────────────────────────┐  │
│ │  hand-section    │ convict-section │      active-section        │  │
│ │  Skill cards     │  (always        │  Active skill cards        │  │
│ │  in hand         │   centered)     │  for active convict        │  │
│ │  cards →right    │  Name, stats    │  ← return btn on each      │  │
│ └──────────────────┴─────────────────┴────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## HTML Structure

### Root Container
```html
<div id="game">
  <!-- Full-viewport board -->
  <svg id="board-svg">...</svg>

  <!-- Fixed top bar (CSS grid: auto 1fr auto) -->
  <div id="top-bar">
    <div id="wd-monster-strip"></div>     <!-- Monster type references (left) -->
    <div id="wd-center-strips">
      <div id="wd-phase-strip"></div>     <!-- Phase navigation: center -->
      <div id="wd-counter-strip"></div>   <!-- Doom / Debt counters: center -->
    </div>
    <div id="wd-right-strips">
      <div id="wd-skill-strip"></div>     <!-- Common skill deck (right) -->
      <div id="wd-deck-strip"></div>      <!-- Monster/Event/Item/Location/Agenda/Mission (right) -->
    </div>
  </div>

  <!-- Left overlay: convict selector + add button + clear-URL button -->
  <!-- bottom edge aligned to top of #player-ui via --player-ui-height CSS var -->
  <div id="left-bar-wrapper">
    <button id="clear-url-btn">↺</button>
    <div id="left-bar"></div>             <!-- thumbnails + + button rendered here -->
  </div>

  <!-- Anchored popover: appears near selected figure or map tile -->
  <div id="wd-popover" style="display:none"></div>

  <!-- Right-center overlay: add-figure panel when open, empty otherwise -->
  <div id="info-panel"></div>

  <!-- Fixed bottom bar (CSS grid: 1fr auto 1fr) -->
  <div id="player-ui">
    <div id="hand-section"></div>         <!-- left: cards align right -->
    <div id="convict-section">            <!-- center: always locked -->
      <div id="wd-playbar"></div>
    </div>
    <div id="active-section">            <!-- right: cards align left -->
      <div id="wd-active-strip"></div>
    </div>
  </div>
</div>
```

## CSS Layout Strategy

### Main Layout (CSS Grid)
```css
#game {
  position: fixed;
  inset: 0;  /* full viewport */
  display: grid;
  /* Implicit zones: top-bar, board, player-ui */
}

#board-svg {
  position: absolute;
  inset: 0;  /* full viewport */
  z-index: 1;
}
```

### Overlay Positioning (Fixed)
```css
#left-bar-wrapper {
  position: fixed;
  left: 12px;
  bottom: var(--player-ui-height, 120px);  /* bottom edge = top of player-ui */
  z-index: 30;
}

#info-panel {
  position: fixed;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: clamp(240px, 20vw, 340px);
  max-height: 70vh;
  overflow-y: auto;
  z-index: 30;
}

#wd-popover {
  position: fixed;
  width: 280px;
  z-index: 60;
  /* positioned dynamically via JS near selected object */
}
```

### Component Layouts (CSS Grid + Flexbox)
```css
/* Top bar: left-aligned monster strip | centered phase+counter | right-aligned skill+deck */
#top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;  /* left | center | right */
  align-items: center;
}

#wd-monster-strip {
  display: flex;
  gap: 6px;
  align-items: center;
}

#wd-center-strips {
  justify-self: center;
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Player-ui keeps the original 3-column centering pattern */
#player-ui {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

/* Left-bar positioned just above player-ui using CSS custom property */
#left-bar-wrapper {
  position: fixed;
  left: 12px;
  bottom: var(--player-ui-height, 120px);  /* set by ResizeObserver in elements.js */
}

#hand-section,
#active-section {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0px, -10%, 16px);  /* Negative gap for overlap */
  overflow: visible;             /* Required for upward hover panels */
}
```

## Z-Index Layering

| Z-Index | Layer | Elements |
|---------|-------|----------|
| 1 | Base | `#board-svg` (map, tiles, figures) |
| 10 | Board overlays | Selection highlights, drag previews |
| 20 | Anchored panels | `#top-bar`, `#player-ui` |
| 30 | Center overlays | `#left-bar`, `#info-panel` |
| 40 | Hover states | Expanded cards, highlights |
| 50 | Modals | Convict details window, dialogs |
| 60 | Popover | `#wd-popover` — above all overlays |

## Elements & Responsibilities

### #top-bar (Top Edge)
- **Position:** Fixed top, full-width
- **Background:** Semi-transparent with backdrop-filter blur
- **Layout:** CSS grid `auto 1fr auto` — left-aligned | center | right-aligned columns
- **Content:**
  - Left (`#wd-monster-strip`): Enemy type reference thumbnails with hover infobox (name, HP, attack)
  - Center (`#wd-center-strips`): 
    - `#wd-phase-strip` — current phase name + ‹/›/R+ navigation
    - `#wd-counter-strip` — Doom/Debt counters with ±
  - Right (`#wd-right-strips`):
    - `#wd-skill-strip` (common skill deck)
    - `#wd-deck-strip` (Monster/Event/Item/Location/Agenda/Mission decks); vertical separators after skill, monster, event, item, location

### #wd-monster-strip (Monster Type Reference)
- **Position:** Top-bar left section
- **Content:** Thumbnail for each unique enemy type currently on the board
- **Display:** Abbreviated name (first 3 chars) in compact 40×40 box
- **Interaction:** Hover shows infobox below with full name, HP, and attack values
- **Pattern:** Same hover-infobox pattern as active-cards in deck-strip
- **Purpose:** Quick reference of monster behavior rules during planning phases

### #left-bar-wrapper (Left Overlay)
- **Position:** Fixed left; `bottom` = `--player-ui-height` (tracks player-UI top edge via ResizeObserver)
- **Content:** ↺ clear-URL button + `#left-bar` (other convict thumbnails + `+` add-figure button)
- **Interaction:** Click thumbnail to switch active convict; click `+` to open add-figure panel in `#info-panel`
- **Z-order:** Above board, below modals

### #board-svg (Full Viewport)
- **Position:** Absolute, covers entire viewport
- **Content:** Map tiles, figures, effects, selections
- **Behavior:** SVG rendering target, interactive
- **Z-index:** 1 (base layer)

### #wd-popover (Anchored Object Popover)
- **Position:** Fixed, positioned dynamically near the selected object via `getBoundingClientRect()`
- **Trigger:** Clicking any convict, enemy, or map tile on the board
- **Content:** Full sidebar-style panel — type, name, HP counters, conditions, rotate/lock/delete toolbar
  - Convicts and enemies: `wardensDebtObjectPanel()` from sidebar.js
  - Map tiles: `wardensDebtMapTilePanel()` from sidebar.js
- **Click handler:** `handlePanelClick` (sidebar's handler — same as info-panel)
- **Placement logic:** Appears above the figure if space permits, below otherwise; clamped to viewport edges
- **Roster button:** Hidden via CSS (`#wd-popover .sp-panel-back { display: none }`)
- **Z-order:** z-index 60 — above all other overlays

### #info-panel (Right-Center Overlay)
- **Position:** Fixed right-center, overlays board
- **Content:** Add-figure panel when `uiState.addPanelOpen` is true; empty otherwise
- **Opened by:** `+` button in left-bar, or `open-add` action
- **Click handler:** `handlePanelClick` (sidebar's handler)
- **Z-order:** Above board, below modals

### #player-ui (Bottom Edge)
- **Position:** Fixed bottom, full-width
- **Background:** Completely transparent
- **Layout:** CSS grid `1fr auto 1fr` — convict-section always locked to center

#### #hand-section (Hand Cards) — left column
- **Content:** Skill cards in active convict's hand
- **Layout:** Flex row, cards align right; `overflow: visible` for upward hover panels
- **Interaction:** Hover shows full card detail (upward panel); click during `select-cards` phase moves card to active-section

#### #convict-section (Convict Portrait) — center column
- **Content:** Active convict name and stats
- **Layout:** Always centered regardless of sibling card count

#### #active-section (Active Skill Cards) — right column
- **Content:** Fast/slow skill cards queued by the active convict only
- **Layout:** Flex row, cards align left; `overflow: visible` for upward hover panels
- **Interaction:** Hover shows full card; during `select-cards` phase each card shows a ← return button to move it back to hand; during fast/slow phase, green frame indicates card can be discarded

## Rendering Pattern

Each zone has a dedicated renderer function in `elements.js`:

```javascript
renderElements() → {
  renderConvictPortrait()   // #wd-playbar
  renderHandCards()         // #hand-section
  renderLeftBar()           // #left-bar (convict thumbnails + + button)
  renderMonsterStrip()      // #wd-monster-strip (enemy type references)
  renderCounterStrip()      // #wd-counter-strip
  renderSkillStrip()        // #wd-skill-strip
  renderDeckStrip()         // #wd-deck-strip
  renderActiveStrip()       // #wd-active-strip
  renderObjectPopover()     // #wd-popover (convict / enemy / map tile)
  renderPhaseStrip()        // #wd-phase-strip
  renderDiceTray()          // dice pool
  renderInfoPanel()         // #info-panel (add-figure panel or empty)
}
```

**Pattern:** Each function:
1. Gets its target element by ID
2. Checks element exists (null-safe)
3. Reads from game state / uiState
4. Generates HTML
5. Sets `innerHTML`

**No rendering side effects:** Pure data → DOM generation.

## Event Handling

Two click handler systems co-exist:

### `handleContainerClick` (elements.js) — `data-wd-action`
Handles game-specific actions in player-UI zones:
- `#playbar`, `#hand-section`, `#active-section`, `#left-bar`, `#top-bar`
- Routes through `handleAction()` → game state mutations → `renderElements()`

### `handlePanelClick` (sidebar.js) — `data-action`
Handles inspector actions in overlay zones:
- `#wd-popover`, `#info-panel`
- Routes through sidebar's `handleAction()` → stat counters, conditions, rotate, lock, remove, add-figure

### Keyboard Shortcuts
Handled in `main.js`:
- `Del` / `Backspace`: delete selected convict, enemy, or map tile (respects locked state)
- `Ctrl+Z` / `Ctrl+Y`: undo/redo
- `0`: reset zoom

## Add-Figure Flow

1. User clicks `+` in left-bar → `openAddPanel()` → `uiState.addPanelOpen = true`
2. `renderInfoPanel()` shows `addPanel()` HTML in `#info-panel`
3. User clicks a figure or tile button → `wd-add-figure` action → `addWardensDebtPlaceholderFigure()`
4. If a cell is selected, figure is placed there; otherwise placed at board origin (0, 0)
5. Figure can be dragged to final position

## Transparency & Visibility

### Why Transparent Backgrounds?
Board map should always be visible behind UI. Transparent backgrounds + backdrop-filter blur allow:
- Visual continuity
- Awareness of board state while interacting with controls
- Reduced cognitive load

### Backdrop Filter
Used on `#top-bar` and `#wd-popover` for subtle blur when UI overlaps map:
```css
backdrop-filter: blur(8px);
```

## Sizing Decisions

### Fixed Heights
- Top-bar: `auto` (content-driven)
- Player-ui: fixed (all cards same height)
- Left-bar: flexible (grows with convict count)
- Popover: grows with content, no max-height (no scrollbar)

### Responsive Widths (clamp)
- Info-panel: `clamp(240px, 20vw, 340px)` — min/ideal/max
- Card gaps: `clamp(0px, -10%, 16px)` — overlap when tight
- Popover: fixed 280px

## References

- `ai/AI_RULES.md` — coding rules (state-driven, action-based)
- `docs/reference/glossary.md` — terminology (gameState vs viewState)
- `index.html` — actual HTML structure
- `styles/main.css` — CSS implementation
- `scripts/wardensDebt/elements.js` — rendering functions
- `scripts/sidebar.js` — inspector panels, add-figure panel, handlePanelClick
