# Warden's Debt Glossary

Canonical definitions for precise communication about the codebase.

## Three Data Layers

### 1. Content (Definition)

Static game library — what cards, convicts, monsters exist.

**Source:** `WardensDebt/data/wardens-debt/core-set.json`

**Examples:**
- skillCard definitions (id, name, effects, timing)
- convictDef (base health, hand size, starter cards)
- scenarios (setup, player count)

**When to use:** "I want to change a card permanently" or "add a new monster type"

**API:** `content.skillCards`, `content.convictDefs`, `content.monsterDefs`, etc.

---

### 2. Runtime (Play Session)

Live game state during a playtest — what's happening RIGHT NOW.

**Source:** `runtimeState.gameState`

**Examples:**
- Current turn/phase
- Convict health and hand (right now)
- Active cards (event, agenda, etc.)
- Enemy positions
- Deck draw/discard piles

**When to use:** "A convict loses 2 health" or "advance to next phase"

**API:** `gameState.turn`, `gameState.convicts[i].currentHealth`, `gameState.activeCards.event`, etc.

---

### 3. View State

UI selections and ephemeral settings — what the player is looking at.

**Source:** `state` (persistent) and `uiState` (ephemeral)

**Examples:**
- Selected objects (which convict panel is open?)
- Grid label visibility toggle
- Sidebar panel state

**When to use:** "Show the convict inspector when clicked" or "remember the grid toggle"

**API:** `uiState.selected`, `state.showGridLabels`, etc.

---

## Core Object Types

### skillCard (Content)

```javascript
{
  id: 'common-brawler-swing',
  name: 'Brawler Swing',
  text: '...',
  timing: 'fast' | 'slow',      // when played
  role: 'starter' | 'common',    // deck type
  cost: 0,
  effects: [{ type: 'deal_damage', target: 'enemy', amount: 3 }],
  tags: ['print', 'component:card']
}
```

### convictDef (Content)

```javascript
{
  id: 'convict-brawler',
  name: 'The Brawler',
  health: 12,                    // base health
  handSize: 3,
  starterSkillCardIds: ['starter-brawler-punch', ...],
  tags: ['print']
}
```

### Convict (Runtime)

```javascript
{
  id: 'brawler-1',
  name: 'The Brawler',
  convictDefId: 'convict-brawler',
  currentHealth: 10,             // current health
  maxHealth: 12,
  handSize: 3,
  hand: ['common-brawler-swing', ...],
  drawPile: [...],
  discardPile: [...],
  banished: [],
  guards: 2,                     // guard tokens
  resources: { focus: 1 },
  conditions: ['weakened']
}
```

### monsterDef (Content)

```javascript
{
  id: 'monster-collector',
  name: 'The Collector',
  text: '...',
  health: 8,
  attack: 2,
  effects: [...],
  tags: ['print']
}
```

### Enemy (Runtime)

```javascript
{
  id: 'collector-1',             // unique instance
  monsterDefId: 'monster-collector',
  name: 'The Collector',
  currentHealth: 6,
  maxHealth: 8,
  attack: 2,
  conditions: [],
  zone: 'board' | 'reserve' | 'discard' | 'banished'
}
```

### scenario (Content)

```javascript
{
  id: 'intro-scenario',
  name: 'Introductory Game',
  playerSlots: 1,
  setup: {
    convictDefIds: ['convict-brawler'],
    commonSkillDeckIds: ['deck-common-skills'],
    monsterDeckId: 'deck-monsters',
    eventDeckId: 'deck-events',
    // ... optional deck IDs
    diceIds: ['die-blue', 'die-red'],
    conditionTokenIds: ['condition-poison', ...],
    startingResources: { focus: 0 }
  }
}
```

---

## Common Field Names

| Field | Layer | Type | Meaning |
|-------|-------|------|---------|
| `currentHealth` | runtime | number | Convict/Enemy current health |
| `maxHealth` | runtime | number | Convict/Enemy max health |
| `convictDefId` | runtime | string | Reference to convict definition |
| `monsterDefId` | runtime | string | Reference to monster definition |
| `timing` | content | 'fast' \| 'slow' | When skill is played |
| `role` | content | varies | Type (starter, common, elite, etc.) |
| `effect` | content | object | Card effect descriptor |
| `tags` | content | string[] | Print, component, grouping metadata |
| `id` | both | string | Unique identifier |
| `name` | both | string | Display name |

---

## Important Distinctions

### currentHealth vs maxHealth

- **Convict:** `currentHealth` and `maxHealth` (both unified)
- **Enemy:** `currentHealth` and `maxHealth` (both unified)
- **Gameplay:** reduce/increase `currentHealth` via actions

### cardId vs defId

- **Content layer:** `skillCard.id` (e.g., 'common-brawler-swing')
- **Runtime hand:** card id strings (e.g., `convict.hand = ['common-brawler-swing']`)
- **Instance references:** `convictDefId` (content reference) vs `id` (unique convict in play)
- **Instance references:** `monsterDefId` (content reference) vs `id` (unique enemy in play)

### Definition vs Instance

- **Definition:** unchanging game library entry (from content)
- **Instance:** runtime object referencing a definition
  - Example: one 'monster-collector' definition, but multiple 'collector-1', 'collector-2' instances

---

## Selection Terms (UI)

Used in `uiState.selected`:

- `kind: 'wd-convict'` — inspector shows convict stats, hand, conditions
- `kind: 'wd-enemy'` — inspector shows enemy stats, zone, conditions
- `idx` — array index (convict or enemy)

---

## Quick Reference

If you mean... | Use...
---|---
"The card definition" | `skillCard`, `monsterDef` (content)
"A card in someone's hand" | `convict.hand` array (runtime)
"A card being played" | `activeCards.fastSkills`, `activeCards.slowSkills` (runtime)
"Permanent game piece" | `skillCard.id` (content)
"Instance of that piece in play" | `convict` with `convictDefId` (runtime)
"The enemy that's here" | `enemy` with `monsterDefId` (runtime)
"How many monsters exist" | Count `monsterDefs` (content)
"How many enemies are alive" | Count enemies where `zone === 'board'` (runtime)
