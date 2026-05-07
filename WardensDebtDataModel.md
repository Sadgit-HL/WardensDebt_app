# Wardens Debt Data Model

This file defines the current `Wardens Debt` prototype domain model for the migration away from HavenMap.

## Scope

This is the contract for the early migration phase:

- authored content shape
- runtime game-state shape
- the boundary between static definitions and mutable play-session state

The model is intentionally placeholder-friendly. Names, text, and many balancing values can change often without affecting the architecture.

## Core Rule

Game rules and UI code must not hard-code card rows, deck contents, enemy stats, room setup, or dice behavior.

- Static content lives in `HavenMap/data/wardens-debt/core-set.json`
- Validation and state factories live in `HavenMap/scripts/wardensDebt/schema.js`

## Automation Scope

This repository is intended to reduce physical prototyping overhead, not to require full automation of every boardgame rule.

Current implementation policy:

- full automation is optional
- semi-automated playtesting is acceptable and preferred during active design
- manual state edits are allowed where they are fast and clear, especially for HP, conditions, and similar board-state bookkeeping

The architecture should therefore support both:

- automated flow where it clearly saves time
- direct manual adjustment where rules are still evolving or where bookkeeping is simple enough not to justify engine complexity

## Content Model

Content is now organized by explicit game element families rather than one generic `cards` bucket.

```js
{
  schemaVersion: '0.5.0',
  gameId: 'wardens-debt',
  contentVersion: 'prototype-core-set',
  dice: [],
  conditionTokens: [],
  skillCards: [],
  convictDefs: [],
  monsterCards: [],
  eventCards: [],
  itemCards: [],
  agendaCards: [],
  missionCards: [],
  locationCards: [],
  mapTiles: [],
  decks: [],
  scenarios: []
}
```

### Production Tags

Because the app is intended to support physical playtesting, content may also use **production tags** inside `tags`.

For now, this stays lightweight and tag-based.

Recommended production tag style:

- `print`
- `component:card`
- `component:token`
- `component:board`
- `print-group:starter-skill-cards`
- `print-group:condition-tokens`
- `print-group:map-tiles`

Use these tags for questions like:

- does this need to be printed?
- what kind of physical component is it?
- which print/export batch should it belong to?

For now:

- production info lives in `tags`
- decks and scenarios are usually logical setup objects, not printed components themselves
- if production requirements become more detailed later, they can move into a dedicated metadata object

<!--
Future option if tag-based production data becomes too limited:

production: {
  print: true,
  componentType: 'card',
  printGroup: 'starter-skill-cards',
  copies: 2,
  layoutTemplate: 'skill-card-standard'
}
-->

### Dice

Dice are authored definitions, not rolled values.

```js
{
  id: 'd6-basic',
  name: 'Basic D6',
  sides: 6
}
```

### Condition Tokens

Condition tokens are reusable status definitions.

```js
{
  id: 'marked',
  name: 'Marked',
  description: 'The next precise hit gains bonus damage.',
  tags: ['debuff', 'print', 'component:token', 'print-group:condition-tokens']
}
```

### Skill Cards

Skill cards are split into two roles:

- `starter`: tied to a specific convict
- `common`: drawn from one or more shared decks during play

```js
{
  id: 'convict-a-starter-strike',
  name: 'Placeholder Starter Strike',
  role: 'starter',
  timing: 'fast',
  convictDefId: 'convict-a',
  cost: 0,
  text: 'Deal 1 damage to an enemy.',
  tags: ['starter', 'attack', 'print', 'component:card', 'print-group:starter-skill-cards'],
  effects: [
    { type: 'deal_damage', target: 'enemy', amount: 1 }
  ]
}
```

### Convict Definitions

Convict definitions (`convictDefs`) define the playable heroes and their starting skill package.

```js
{
  id: 'convict-a',
  name: 'Placeholder Convict A',
  health: 10,
  handSize: 8,
  starterSkillCardIds: [
    'convict-a-starter-strike',
    'convict-a-starter-guard'
  ],
  tags: ['convict', 'frontline', 'print', 'component:card', 'print-group:convict-cards']
}
```

### Monster, Event, Item, Agenda, and Mission Cards

These remain separate content families because they evolve differently even if some fields overlap.

```js
{
  id: 'monster-collector',
  name: 'Placeholder Collector',
  health: 6,
  attack: 2,
  text: 'A basic enemy template for testing.',
  tags: ['monster', 'basic', 'print', 'component:card', 'print-group:monster-cards'],
  effects: [
    { type: 'deal_damage', target: 'convict', amount: 2 }
  ]
}
```

Agenda and mission cards now also exist as explicit content families. They currently use the same basic authored shape as other effect-bearing card families, but they are kept separate so future progression rules and scenario-goal rules can evolve independently.

### Location Cards and Map Tiles

Location cards define room-level setup and reference the tiles they use.

```js
{
  id: 'location-cell-block-a',
  name: 'Placeholder Cell Block',
  mapTileIds: ['tile-cell-a', 'tile-hall-a'],
  monsterCardIds: ['monster-collector'],
  tags: ['location', 'intro-room', 'print', 'component:card', 'print-group:location-cards']
}
```

Map tiles are reusable board pieces:

```js
{
  id: 'tile-cell-a',
  name: 'Placeholder Cell Tile',
  layoutKey: 'cell-a',
  tags: ['tile', 'room', 'print', 'component:board', 'print-group:map-tiles']
}
```

### Decks

Decks reference a single content family and stay explicitly typed.

Supported deck kinds right now:

- `common-skill`
- `monster`
- `event`
- `item`
- `location`
- `agenda`
- `mission`

```js
{
  id: 'common-skill-deck-a',
  name: 'Placeholder Common Skill Deck A',
  kind: 'common-skill',
  cardIds: ['common-brawler-swing', 'common-brawler-protect']
}
```

### Scenarios

Scenarios assemble the active content for a play session.

```js
{
  id: 'breach-the-ledger-vault',
  name: 'Placeholder Scenario One',
  playerSlots: 2,
  setup: {
    convictDefIds: ['convict-a', 'convict-b'],
    commonSkillDeckIds: ['common-skill-deck-a', 'common-skill-deck-b'],
    monsterDeckId: 'monster-deck-a',
    eventDeckId: 'event-deck-a',
    itemDeckId: 'item-deck-a',
    locationDeckId: 'location-deck-a',
    agendaDeckId: 'agenda-deck-a',
    missionDeckId: 'mission-deck-a',
    startingLocationCardId: 'location-cell-block-a',
    diceIds: ['d6-basic', 'd6-basic'],
    conditionTokenIds: ['marked', 'guarded'],
    startingResources: 0
  }
}
```

## Runtime Game State

Runtime state is derived from authored content plus a chosen scenario.

```js
{
  stateVersion: '0.2.0',
  contentVersion: 'prototype-core-set',
  scenarioId: 'breach-the-ledger-vault',
  turn: {
    round: 1,
    activeSide: 'convicts',
    phase: 'start-round'
  },
  dicePool: [],
  conditionSupply: [],
  convicts: [],
  enemies: [],
  decks: {},
  activeCards: {},
  board: {},
  zones: {},
  log: []
}
```

### Convicts

Convicts are runtime instances of selected convict definitions.

```js
{
  id: 'convict-1',
  name: 'Placeholder Convict A',
  convictDefId: 'convict-a',
  health: 10,
  maxHealth: 10,
  handSize: 8,
  starterSkillCardIds: ['convict-a-starter-strike', 'convict-a-starter-guard'],
  hand: [],
  drawPile: ['convict-a-starter-strike', 'convict-a-starter-guard'],
  discardPile: [],
  banished: [],
  resources: 0,
  guards: 0,
  conditions: []
}
```

### Shared Decks

Shared decks exist independently from convict starter cards.

```js
{
  commonSkillDecks: [
    {
      deckId: 'common-skill-deck-a',
      drawPile: ['common-brawler-swing', 'common-brawler-protect'],
      discardPile: []
    }
  ],
  monsterDeck: null,
  eventDeck: null,
  itemDeck: null,
  locationDeck: null,
  agendaDeck: null,
  missionDeck: null
}
```

This supports the rule that common skill cards are drawn from one or two shared decks during play, while starter skill cards remain tied to each convict.

Agenda and mission cards are also scenario stacks, but unlike random decks they are intended to be loaded in a fixed scenario-defined order.

### Board State

Board state tracks the active location and the tiles it references.

```js
{
  locationCardId: 'location-cell-block-a',
  mapTileIds: ['tile-cell-a', 'tile-hall-a']
}
```

## Why This Shape

- placeholder names are safe because references use stable ids
- starter skill cards and common skill decks are represented separately
- skill cards carry explicit `fast` or `slow` timing so selection and resolution can be phase-driven
- condition tokens and dice are first-class content, not ad hoc flags
- location cards and map tiles are separate so room setup can evolve without baking geometry into scenarios
- shared deck families remain explicit instead of being hidden behind one overloaded card schema
- production/export signals can be tracked immediately with simple tags

## Current Runtime Rules

The current prototype implements these rules:

- Convict hand size is capped at `8`.
- Redraw attempts to refill a convict hand to that configured size.
- If the personal draw pile is empty, the discard pile is recycled into the draw pile.
- Common skill cards are taken from shared common-skill decks and go directly into the convict hand.
- Once used or discarded, those common skill cards enter the owning convict's discard pile and can be redrawn later.
- Skill cards can only be selected during `select-cards`.
- Selected skills are queued into `activeCards.fastSkills` or `activeCards.slowSkills`.
- `fast` skills resolve during `fast-cards`.
- `slow` skills resolve during `slow-cards`.
- Both skill queues discard during `end-round`.
- Entering `event-phase` automatically draws one event card per convict into the active area.

## Immediate Implications

This still does not replace HavenMap's runtime, but it is a better target for the next steps:

1. Load and validate this broader content model.
2. Spawn runtime state from a scenario.
3. Continue tightening the playable loop around phase flow, queued skills, and active-card handling instead of broadening the schema speculatively.
