# Warden's Debt Data Model

Content structure and schema version contract.

## Schema Version

Current: `0.5.0`

See `WardensDebt/data/wardens-debt/core-set.json` for the live schema.

## Content Families

All content is organized by type (not a flat "cards" bucket):

```javascript
{
  schemaVersion: '0.5.0',
  gameId: 'wardens-debt',
  contentVersion: 'prototype-core-set',
  
  // Core definitions
  diceDefs: [...],
  conditionDefs: [...],
  skillDefs: [...],
  convictDefs: [...],
  monsterDefs: [...],
  
  // Card families
  eventDefs: [...],
  itemDefs: [...],
  agendaDefs: [...],
  missionDefs: [...],
  locationDefs: [...],
  
  // Board/scenario
  mapTileDefs: [...],
  deckDefs: [...],
  scenarioDefs: [...]
}
```

## Core Objects

### diceDefs

```javascript
{
  id: 'd6-basic',
  name: 'Basic D6',
  sides: 6
}
```

### conditionDefs

```javascript
{
  id: 'marked',
  name: 'Marked',
  description: '...',
  tags: ['debuff', 'print', 'component:token']
}
```

### skillDefs

```javascript
{
  id: 'convict-a-starter-strike',
  name: 'Strike',
  role: 'starter' | 'common',      // deck type
  timing: 'fast' | 'slow',         // when played
  convictDefId: 'convict-a',       // required for starter, blank for common
  cost: 0,
  text: '...',
  effects: [
    { type: 'deal_damage', target: 'enemy', amount: 1 }
  ],
  tags: ['starter', 'attack', 'print', 'component:card']
}
```

Supported effect types: `deal_damage`, `heal`, `draw_cards`, `gain_guard`, `summon_unit`, `apply_condition`, `roll_die`, `test`, `modify_test`

**Test Effect** (new):
```javascript
{
  type: 'test',
  target: 'self' | 'enemy' | 'convict',
  description: 'Strength Test',
  difficulty: 8,
  modifier: 0,                    // Optional test modifier
  effectTable: [
    {
      range: [1, 4],
      description: 'Weak (fail)',
      effects: [{ type: 'gain_guard', target: 'self', amount: 1 }]
    },
    {
      range: [5, 8],
      description: 'Average (success)',
      effects: [{ type: 'deal_damage', target: 'enemy', amount: 2 }]
    },
    {
      range: [9, 12],
      description: 'Strong (success)',
      effects: [{ type: 'deal_damage', target: 'enemy', amount: 3 }]
    }
  ]
}
```

Tests pause card resolution and display a modal with:
- Dice pool (individual die buttons + "Roll All")
- Test difficulty and total calculation
- Modifier controls (+/- buttons)
- Effect table showing each outcome range with probability percentages
- Current result highlighted in the table
- "Done" button to resolve and apply outcome effects

### convictDefs

```javascript
{
  id: 'convict-brawler',
  name: 'The Brawler',
  health: 12,
  handSize: 3,
  starterSkillCardIds: ['skill-1', 'skill-2'],
  tags: ['print']
}
```

### monsterDefs

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

### eventDefs, itemDefs, agendaDefs, missionDefs

```javascript
{
  id: 'event-prisoner-revolt',
  name: 'Prisoner Revolt',
  text: '...',
  effects: [...],
  tags: ['print', 'component:card']
}
```

### locationDefs

```javascript
{
  id: 'location-cell-block-a',
  name: 'Cell Block A',
  mapTileIds: ['tile-cell-block-a'],
  monsterCardIds: ['monster-collector', 'monster-guard'],
  tags: ['print']
}
```

### mapTileDefs

```javascript
{
  id: 'tile-cell-block-a',
  name: 'Cell Block A',
  layoutKey: 'grid-2x2',          // visual layout reference
  areas: [...],                   // optional area definitions (future)
  tags: ['print', 'component:board']
}
```

### deckDefs

```javascript
{
  id: 'deck-common-skills',
  name: 'Common Skills',
  kind: 'common-skill' | 'monster' | 'event' | 'item' | 'location' | 'agenda' | 'mission',
  cardIds: ['skill-1', 'skill-2', ...]
}
```

### scenarioDefs

```javascript
{
  id: 'intro-scenario',
  name: 'Introductory Game',
  playerSlots: 1,
  setup: {
    convictDefIds: ['convict-brawler'],
    commonSkillDeckIds: ['deck-common-skills'],
    monsterDeckId: 'deck-monsters',       // optional
    eventDeckId: 'deck-events',          // optional
    itemDeckId: 'deck-items',            // optional
    locationDeckId: 'deck-locations',    // optional
    agendaDeckId: 'deck-agenda',         // optional
    missionDeckId: 'deck-missions',      // optional
    startingLocationCardId: null,         // optional
    diceDefIds: ['d6-basic'],
    conditionDefIds: ['marked', 'weakened'],
    startingResources: { focus: 0 }
  }
}
```

## Runtime State

Live game session state during play. Access via `getWardensDebtRuntime().gameState` in browser console.

```javascript
{
  stateVersion: '0.2.0',
  contentVersion: 'prototype-core-set',
  scenarioId: 'intro-scenario',
  
  // Turn structure
  turn: {
    round: 1,
    activeSide: 'convicts' | 'enemies',
    phase: 'upkeep' | 'events' | 'tactics' | 'fast-skills' | 'enemy-phase' | 'slow-skills' | 'end-round',
    subphase: 'select-tactic' | 'select-skill-cards' | null  // Only during 'tactics' phase
  },
  
  // Dice and conditions
  dicePool: [
    { dieId: 'd6-basic', sides: 6, currentValue: null }
  ],
  conditionSupply: ['marked', 'guarded', ...],  // Available tokens to place
  
  // Active test (if a test is currently being resolved)
  activeTest: {
    source: {
      type: 'skill-card' | 'event' | 'enemy' | 'phase' | 'ability',
      sourceId: 'event-prisoner-revolt',     // Card or effect ID
      convictIndex: 0                         // Optional, for convict-specific tests
    },
    description: 'Strength Test',
    difficulty: 8,
    modifier: 0,
    effectTable: [
      { range: [1, 4], description: 'Weak (fail)', effects: [...] },
      { range: [5, 8], description: 'Average (success)', effects: [...] },
      { range: [9, 12], description: 'Strong (success)', effects: [...] }
    ],
    successEffects: [...],        // Applied if test passes (total >= difficulty)
    failEffects: [...]            // Applied if test fails (total < difficulty)
  } | null,
  
  // Convict instances (1+ per scenario)
  convicts: [
    {
      id: 'convict-1',
      name: 'The Brawler',
      convictDefId: 'convict-brawler',  // Reference to content definition
      currentHealth: 10,
      maxHealth: 12,
      handSize: 3,
      starterSkillCardIds: ['skill-1', 'skill-2'],
      hand: [],
      drawPile: ['skill-1', 'skill-2'],
      discardPile: [],
      banished: [],
      resources: { focus: 0 },
      guards: 0,
      conditions: ['marked']  // Applied condition token IDs
    }
  ],
  
  // Enemy instances (setup depends on location)
  enemies: [
    {
      id: 'enemy-1',
      monsterDefId: 'monster-collector',  // Reference to content definition
      name: 'The Collector',
      currentHealth: 6,
      maxHealth: 8,
      attack: 2,
      conditions: [],
      zone: 'board' | 'reserve' | 'discard' | 'banished'
    }
  ],
  
  // Card deck states
  decks: {
    commonSkillDecks: [  // May have multiple
      {
        deckId: 'deck-common-skills',
        drawPile: ['skill-3', 'skill-4', ...],
        discardPile: []
      }
    ],
    monsterDeck: { deckId: '...', drawPile: [...], discardPile: [...] } | null,
    eventDeck: { deckId: '...', ... } | null,
    itemDeck: { deckId: '...', ... } | null,
    locationDeck: { deckId: '...', ... } | null,
    agendaDeck: { deckId: '...', ... } | null,
    missionDeck: { deckId: '...', ... } | null
  },
  
  // Cards currently active in play
  activeCards: {
    enemy: [],                    // Enemy cards in play
    event: [],                    // Event cards in play
    item: [],                     // Item cards in play
    location: [],                 // Location cards in play
    agenda: [],                   // Agenda cards in play
    mission: [],                  // Mission cards in play
    fastSkills: [
      { convictIndex: 0, cardId: 'convict-a-starter-strike', resolved: false }
    ],
    slowSkills: [
      { convictIndex: 0, cardId: 'convict-a-starter-guard', resolved: false }
    ]
  },
  
  // Tactic selection (during tactics phase)
  selectedTactics: {
    [convictIndex]: 'tactic-id' | null
  },
  
  // Event tracking during event phase
  activeEventIndex: 0 | null,    // Which event card is currently active
  
  // Board state
  board: {
    locationCardId: 'location-cell-block-a' | null,
    mapTileIds: ['tile-cell-block-a'],
    mapTileDefs: [
      { id: 'tile-cell-block-a', x: 240, y: 80, angle: 0, locked: false }
    ],
    figurePositions: {
      'convict-1': { x: 400, y: 600 },
      'convict-2': { x: 450, y: 600 },
      'enemy-1': { x: 800, y: 300 }
    }
  },
  
  // Zone tracking (legacy; being phased out)
  zones: {
    board: ['enemy-1'],
    reserve: [],
    discard: [],
    banished: []
  },
  
  // Action log (optional)
  log: []
}
```

**Key relationships:**
- `convicts[i].convictDefId` → `content.convictDefs[...].id`
- `enemies[j].monsterDefId` → `content.monsterDefs[...].id`
- `board.locationCardId` → `content.locationDefs[...].id`
- `decks.*.deckId` → `content.deckDefs[...].id`

## Core Rules

1. **No hard-coded values** — all card stats, costs, effects come from content
2. **ID-based references** — runtime objects reference content by `id`, not by copying
3. **Immutable after load** — content never changes during runtime
4. **Validation on load** — `schema.js` validates entire content on app startup

## Production Tags

Content supports tags for manufacturing/export:

- `print` — this component should be printed
- `component:card` — physical card
- `component:token` — token/counter
- `component:board` — board/tile
- `print-group:starter-skill-cards` — export batch grouping

Use tags to query: "what needs to be printed?" or "which batch?"

## Adding New Objects

### Naming Conventions

**Definition references (content layer):**
- Use `{Entity}DefId` for character/unit definitions: `convictDefId`, `monsterDefId`
- Use `{Entity}Id` for ID references: `deckId`, `dieId`, `cardId`
- Arrays: `{Entities}Ids` (plural): `convictDefIds`, `starterSkillCardIds`, `diceDefsIds`

**Instance properties (runtime layer):**
- `id` — unique instance identifier (e.g., `'convict-1'`, `'enemy-1'`)
- `currentHealth` — current health (uniform across convicts and enemies)
- `maxHealth` — maximum health (uniform across convicts and enemies)
- `{Entity}DefId` — reference to definition (e.g., `convictDefId`, `monsterDefId`)

**Example: Adding a "trap" object family:**

1. **Content** (`core-set.json`):
```javascript
{
  "trapDefs": [
    {
      "id": "trap-spikes",
      "name": "Floor Spikes",
      "damage": 2,
      "tags": ["print"]
    }
  ]
}
```

2. **Runtime** (instance with state):
```javascript
// In activeCards.traps
{ id: 'trap-1', trapDefId: 'trap-spikes', x: 100, y: 200, triggered: false }
```

3. **Validation** (`schema.js`):
```javascript
// Add to indexWardensDebtContent()
trapDefsById: new Map(content.trapDefs.map(c => [c.id, c]))

// Add to validateWardensDebtContent()
content.trapDefs.forEach((card, i) => validateTrapCard(card, `trapDefs[${i}]`, issues))
```

### Adding New Content

1. Add definition to appropriate family in `core-set.json`
2. Add validation function and index in `schema.js`
3. Add ID reference to relevant decks or scenarios (if needed)
4. Ensure all referenced IDs exist (validation will catch misses)
5. Reload browser (app will validate and report issues)
6. Update `docs/reference/data-model.md` with schema documentation

## Future Improvements

- [ ] Support for published Google Sheets tabs (see `content-workflow.md`)
- [ ] Custom editor for content (database-backed)
- [ ] Area-map definitions (currently tile-only)
- [ ] Advanced effect syntax (currently simple descriptors)
