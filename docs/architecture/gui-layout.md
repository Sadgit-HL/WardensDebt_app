# GUI Layout Architecture

Complete redesign of Warden's Debt UI completed 2026-05-08.

## Overview

Full-viewport board-centric layout with transparent overlays. Game board (SVG) covers entire screen; all UI panels overlay on top with transparent backgrounds so the map remains visible.

## Layout Zones

```
┌─────────────────────────────────────────────────────┐
│ TOP-BAR (fixed top, full width)                     │
│ • Phase strip, dice controls, shared decks          │
├─────────────────────────────────────────────────────┤
│                                                     │
│           BOARD (SVG, full viewport)                │ LEFT-BAR
│  ┌──────────────────────────────────────┐           │ (absolute
│  │ Map tiles, figures, selections       │           │  overlay,
│  │ All game objects rendered here       │           │  center-
│  │                                      │           │  left)
│  └──────────────────────────────────────┘           │
│                                                     │
│                                                     │ INFO-PANEL
│                                                     │ (absolute
│                                                     │  overlay,
│                                                     │  center-
├─────────────────────────────────────────────────────┤ right)
│ PLAYER-UI (fixed bottom, full width, transparent)  │
│ ┌─────────────┬──────────┬──────────────────────┐   │
│ │ Hand Cards  │ Convict  │ Active Queued Cards  │   │
│ │ (flex)      │ Portrait │ (flex)               │   │
│ └─────────────┴──────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## HTML Structure

### Root Container
```html
<div id="game">
  <!-- Full-viewport board -->
  <svg id="board-svg">...</svg>
  
  <!-- Fixed top bar -->
  <div id="top-bar" aria-label="Game controls and phase">
    <div id="wd-phase-strip"></div>
    <div id="wd-shared-decks"></div>
  </div>
  
  <!-- Left-center overlay: Convict selector -->
  <div id="left-bar" aria-label="Convict selector">
    <!-- Renders: other convict thumbnails -->
  </div>
  
  <!-- Right-center overlay: Object info -->
  <div id="info-panel" aria-label="Object information">
    <!-- Renders: selected map object details -->
  </div>
  
  <!-- Bottom bar: Player controls and cards -->
  <div id="player-ui" aria-label="Player cards and convict">
    <div id="hand-section"></div>
    <div id="convict-section">
      <div id="wd-playbar"></div>
    </div>
    <div id="active-section">
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
#left-bar {
  position: fixed;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
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
```

### Component Layouts (Flexbox)
```css
#top-bar {
  display: flex;
  gap: 10px;
}

#player-ui {
  display: flex;
  gap: 10px;
}

#hand-section,
#active-section {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0px, -10%, 16px);  /* Negative gap for overlap */
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
| 60 | Debug | Debug panels |

## Elements & Responsibilities

### #top-bar (Top Edge)
- **Position:** Fixed top, full-width
- **Background:** Transparent with backdrop-filter blur
- **Content:** 
  - Phase strip (round/phase display)
  - Shared decks (draw buttons)
- **Behavior:** Horizontal flex layout, groups left/right/center

### #left-bar (Left-Center Overlay)
- **Position:** Absolute, left-center, overlays board
- **Content:** Max 3 convict thumbnails (other convicts)
- **Interaction:** Click to toggle active convict
- **Sizing:** Fixed width, vertical flex layout
- **Z-order:** Above board, below modals

### #board-svg (Full Viewport)
- **Position:** Absolute, covers entire viewport
- **Content:** Map tiles, figures, effects, selections
- **Behavior:** SVG rendering target, interactive
- **Z-index:** 1 (base layer)

### #info-panel (Right-Center Overlay)
- **Position:** Absolute, right-center, overlays board
- **Content:** Info about selected map objects
- **Background:** Completely transparent
- **Sizing:** Responsive width (clamp), fixed max-height, scrollable
- **Z-order:** Above board, below modals

### #player-ui (Bottom Edge)
- **Position:** Fixed bottom, full-width
- **Background:** Completely transparent
- **Layout:** Flex with 3 sections (left/center/right)

#### #hand-section (Hand Cards)
- **Content:** Skill cards in convict's hand
- **Layout:** Flex row, wrapping, overlapping when space tight
- **Interaction:** Hover shows full card, click plays card
- **Z-order:** Cards overlap left→right

#### #convict-section (Convict Portrait)
- **Content:** Active convict portrait + stats + controls
- **Layout:** Fixed-size centered component
- **Interaction:** Hover shows full info, click opens convict details window
- **Sizing:** Fixed height (matches hand card height)

#### #active-section (Active Cards)
- **Content:** Queued skills + active shared cards
- **Layout:** Flex row, wrapping, overlapping
- **Interaction:** Hover shows full card, click resolves/removes
- **Z-order:** Cards overlap left→right

## Responsive Design Strategy

### Desktop-First Approach
Current layout is desktop-optimized:
- Board fills remaining space
- Overlays positioned at screen center
- Bottom bar full-width
- All zones using `clamp()` for flexible sizing

### Mobile Adaptation (Planned, Not Implemented)
When implementing mobile:
1. Change grid-template-areas (rearrange zones)
2. Adjust overlay positioning (may stack instead of center)
3. Adjust flex-direction (vertical for narrow screens)
4. Adjust sizing (smaller cards, narrower panels)

**Key principle:** Use CSS media queries only; no JavaScript layout changes.

## Rendering Pattern

Each zone has dedicated renderer function in `elements.js`:

```javascript
renderElements() → {
  renderConvictPortrait()     // #wd-playbar
  renderHandCards()           // #hand-section
  renderLeftBar()             // #left-bar
  renderActiveStrip()         // #wd-active-strip
  renderPhaseStrip()          // #wd-phase-strip
  renderSharedDeckTopbar()    // #wd-shared-decks
}
```

**Pattern:** Each function:
1. Gets its target element by ID
2. Checks element exists (null-safe)
3. Reads from game state
4. Generates HTML
5. Sets `innerHTML`

**No rendering side effects:** Pure data → DOM generation.

## Event Handling

Click handlers attached to zone containers:
- `#playbar` → card/convict actions
- `#hand-section` → play card
- `#active-section` → resolve active card
- `#left-bar` → toggle convict
- `#top-bar` → phase/dice/deck controls

All handlers routed through `handleAction()`:
1. Find `[data-wd-action]` attribute
2. Get action name + payload data
3. Call appropriate action function
4. Update game state
5. Call `renderElements()` (re-render all zones)

## Transparency & Visibility

### Why Transparent Backgrounds?
Board map should always be visible behind UI. Transparent backgrounds + backdrop-filter blur allow:
- Visual continuity
- Awareness of board state while interacting with controls
- Reduced cognitive load (less "popping" between screens)

### Backdrop Filter
Used on `#top-bar` for subtle blur effect when UI overlaps text/map:
```css
backdrop-filter: blur(8px);
```

## Sizing Decisions

### Fixed Heights
- Top-bar: `auto` (content-driven)
- Player-ui: Fixed (all cards same height)
- Left-bar: Flexible (3 convict max)
- Info-panel: Fixed max-height (scrollable content)

### Responsive Widths (clamp)
- Info-panel: `clamp(240px, 20vw, 340px)` — min/ideal/max
- Card gaps: `clamp(0px, -10%, 16px)` — overlap when tight

**Rationale:** Fixed heights avoid layout shift; responsive widths adapt to viewport.

## Outstanding Tasks (Polish Phase)

1. **Styling component-level:**
   - Left-bar: convict thumbnail cards (size, spacing, hover)
   - Hand cards: sizing, overlap behavior, hover expansion
   - Convict portrait: stats layout, health display
   - Active cards: visual distinction, sizing

2. **Top-bar layout:**
   - Spacing between phase/dice/decks groups
   - Alignment and visual hierarchy
   - Responsive behavior

3. **Info-panel styling:**
   - Content layout (object name, stats, actions)
   - Scrollbar styling
   - Empty state

4. **Overall polish:**
   - Color scheme and contrast
   - Typography hierarchy
   - Spacing consistency
   - Animation/transition timing

## References

- `ai/MEMORY.md` — project current state
- `ai/AI_RULES.md` — coding rules (state-driven, action-based)
- `docs/reference/glossary.md` — terminology (gameState vs viewState)
- `index.html` — actual HTML structure
- `styles/main.css` — CSS implementation
- `scripts/wardensDebt/elements.js` — rendering functions
