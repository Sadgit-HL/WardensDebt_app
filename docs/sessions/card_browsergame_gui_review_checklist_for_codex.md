# Card Browser Game GUI Architecture Review

## Purpose

This document is intended to help compare an existing browser game codebase against a modern DOM-based GUI architecture for a card game.

The goal is not to rewrite everything immediately, but to:

- identify reusable systems
- detect architectural bottlenecks
- evaluate GUI scalability
- improve maintainability
- improve UX responsiveness
- simplify future feature additions

Stack assumptions:

- HTML
- CSS
- Vanilla JavaScript
- ES Modules
- Pure DOM rendering

---

# High-Level Recommendations

## Recommended Core Philosophy

The GUI should:

- render game state
- NOT contain game state
- separate logic from visuals
- separate interaction from rendering
- use modular systems
- use CSS transforms for animation
- avoid direct DOM querying as gameplay logic

Recommended direction:

```text
Game State -> Renderer -> DOM
```

Avoid:

```text
DOM -> Game Logic
```

---

# Recommended Project Structure

## Suggested Modular Structure

```text
src/
  core/
    gameState.js
    eventBus.js
    turnManager.js
    actionResolver.js

  ui/
    boardRenderer.js
    handRenderer.js
    cardRenderer.js
    hudRenderer.js
    modalRenderer.js

  input/
    dragSystem.js
    hoverSystem.js
    clickSystem.js

  animation/
    animationManager.js
    cardAnimations.js
    effectAnimations.js

  systems/
    targetingSystem.js
    combatSystem.js
    effectSystem.js

  data/
    cards.js
    keywords.js

  utils/
    dom.js
    math.js
    helpers.js
```

---

# Existing Codebase Comparison Checklist

## 1. State Management

### Questions

- Is gameplay state centralized?
- Is state duplicated in DOM attributes?
- Are cards represented as data objects?
- Are game systems reading directly from HTML?
- Is there a clean turn/action flow?

### Recommended Direction

Use plain JS objects for all gameplay.

Example:

```js
const gameState = {
  players: [],
  board: [],
  stack: [],
  turn: 1
};
```

Avoid gameplay logic based on:

```js
querySelector()
innerHTML
classList.contains()
dataset values as authoritative state
```

---

# 2. Rendering Architecture

## Recommended Pattern

Renderer functions should:

- receive state
- generate/update DOM
- avoid gameplay logic

Example:

```js
renderHand(playerState);
renderBoard(boardState);
```

### Check Existing Code For

- giant render functions
- inline styles everywhere
- duplicated card creation code
- direct DOM mutations spread across systems
- rendering mixed with gameplay calculations

### Ideal Goal

A card should be renderable from pure data:

```js
renderCard(cardData)
```

---

# 3. DOM Structure

## Recommended Layout Hierarchy

```html
<div id="game">
  <div id="background"></div>

  <div id="enemy-ui"></div>

  <div id="board-area"></div>

  <div id="player-ui"></div>

  <div id="fx-layer"></div>

  <div id="modal-layer"></div>
</div>
```

---

# 4. CSS Architecture

## Recommended Organization

```text
css/
  base/
  layout/
  components/
  animations/
  themes/
```

---

## Recommended Practices

### Use

- CSS Grid for global layout
- Flexbox for card rows
- CSS variables
- transform animations
- transition timing consistency
- reusable utility classes

### Avoid

- excessive absolute positioning
- magic pixel values everywhere
- layout changes during animations
- animating width/height when transform works
- deeply nested selectors

---

# 5. Animation System

## Recommended Animation Strategy

Prefer:

```css
transform
opacity
filter
```

Avoid expensive layout-triggering animations.

---

## Recommended Animation Architecture

```js
animateCardPlay(cardEl, targetSlot);
animateDamage(unitEl, amount);
animateDraw(cardEl);
```

Animations should:

- be isolated
- not contain gameplay logic
- support interruption/cancellation
- avoid hardcoded timing dependencies

---

# 6. Input Handling

## Recommended Systems

Separate:

- hover handling
- drag handling
- targeting
- click interactions
- keyboard shortcuts

Example:

```text
hoverSystem
 dragSystem
 targetingSystem
```

---

## Recommended Interaction Model

### Hover

- enlarge card
- raise z-index
- optionally tilt toward cursor

### Drag

- preview targets
- highlight valid targets
- snap or animate release

### Mobile

If mobile support is planned:

- avoid hover-only information
- support tap-to-select
- support drag alternatives

---

# 7. Layering System

## Recommended Z-Index Layers

```text
0 background
1 board
2 cards
3 hover cards
4 drag previews
5 effects
6 UI overlays
7 modals
8 debug tools
```

A defined layering system prevents future CSS chaos.

---

# 8. Card Component Design

## Recommended Card Anatomy

```html
<div class="card">
  <div class="card-cost"></div>
  <img class="card-art">
  <div class="card-title"></div>
  <div class="card-text"></div>
  <div class="card-stats"></div>
</div>
```

---

## Questions For Existing Code

- Are cards reusable components?
- Is card HTML duplicated?
- Are effects attached cleanly?
- Is card scaling responsive?
- Is hover behavior centralized?

---

# 9. Performance Considerations

## Recommended Practices

### Prefer

- transform animations
- requestAnimationFrame for advanced effects
- document fragments
- event delegation
- CSS containment where useful

### Avoid

- forced reflow loops
- repeated querySelector calls during gameplay
- rebuilding entire boards every frame
- excessive shadow blur effects
- layout thrashing

---

# 10. Event Architecture

## Recommended Direction

Use a centralized event flow.

Example:

```js
emit("CARD_PLAYED", payload);
emit("TURN_STARTED", payload);
```

Benefits:

- cleaner decoupling
- easier debugging
- animation synchronization
- replay systems
- easier multiplayer synchronization

---

# 11. Responsiveness

## Questions

- Is the game desktop-only?
- Does the UI scale proportionally?
- Are cards readable at smaller resolutions?
- Is the hand fan responsive?

---

## Recommended Strategy

Use:

```css
clamp()
minmax()
vw/vh carefully
aspect-ratio
```

Avoid fixed-size assumptions.

---

# 12. Accessibility

Even games benefit from accessibility.

Recommended:

- semantic buttons
- keyboard support
- reduced-motion mode
- readable contrast
- scalable text

---

# 13. Debugging Tools

## Strong Recommendation

Build internal debug tools early.

Examples:

- state inspector
- FPS monitor
- animation toggles
- event logger
- card spawn panel
- turn simulator

These massively accelerate development.

---

# 14. Suggested Refactor Priorities

If the existing codebase is messy, prioritize:

1. state separation
2. renderer isolation
3. card component standardization
4. event architecture
5. animation cleanup
6. input system cleanup
7. CSS restructuring

Do NOT attempt a full rewrite immediately.

---

# 15. Common Anti-Patterns

## Watch For

### DOM as source of truth

```js
if (cardEl.classList.contains("dead"))
```

### Massive global scripts

```js
window.currentCard
```

### Gameplay inside animation callbacks

```js
setTimeout(() => applyDamage(), 500)
```

### Hardcoded UI assumptions

```js
cards[5]
```

### Inline style mutation everywhere

```js
el.style.left = ...
```

---

# 16. Recommended GUI Priorities For Card Games

## Most Important

1. readability
2. responsiveness
3. hover clarity
4. board clarity
5. animation feedback
6. interaction clarity
7. information hierarchy

Visual polish should come AFTER clarity.

---

# 17. Suggested Questions For Codex Analysis

Use these prompts against the existing codebase:

## Architecture

- Which systems are tightly coupled?
- Which systems are reusable?
- Which modules violate separation of concerns?
- Which files are doing too many things?

## Rendering

- Is rendering centralized?
- Are cards reusable components?
- Are there excessive DOM mutations?

## Performance

- What causes layout thrashing?
- Which animations are expensive?
- Are there unnecessary rerenders?

## Maintainability

- Which systems are hardest to extend?
- Which files should be split?
- Which systems should become event-driven?

## UX

- Is gameplay information visually prioritized?
- Are interactions discoverable?
- Are hover/drag systems intuitive?

---

# 18. Ideal End Goal

A maintainable architecture where:

- game logic is independent from rendering
- cards are reusable components
- animations are modular
- rendering is predictable
- interactions are isolated
- systems communicate via events
- new cards/features can be added safely
- the GUI scales cleanly over time

---

# Final Recommendation

Do not optimize for perfection immediately.

The best long-term architecture for a DOM-based card game is:

- simple
- modular
- event-driven
- renderer-based
- data-first

The biggest long-term wins usually come from:

- clean state management
- isolated rendering
- reusable card components
- disciplined animation systems
- avoiding DOM-driven gameplay logic

