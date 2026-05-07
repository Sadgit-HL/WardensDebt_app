# Wardens Debt Terminology Reference

This file is a practical glossary for giving precise implementation requests against the current codebase.

The repo uses **three different data layers**:

1. **HavenMap board state**
   This is the generic map/object state in `HavenMap/scripts/state.js`.
2. **Wardens Debt content**
   This is the static card/setup data in `HavenMap/data/wardens-debt/core-set.json`.
3. **Wardens Debt runtime state**
   This is the live playtest state created by `createWardensDebtGameState()` in `HavenMap/scripts/wardensDebt/schema.js`.

If a request is vague across those layers, it is easy to change the wrong thing.

## Before The Details: The 3 Layers In Simple Words

Think of the app as having **three boxes**:

1. **Board state**
   This is: what is currently placed on the map right now.
2. **Content**
   This is: the library of game pieces and cards the app knows about.
3. **Runtime**
   This is: the current Wardens Debt play session in progress.

An easy real-world comparison:

- **Content** is the rulebook plus the stack of printed cards in the box.
- **Board state** is the table layout: where monsters, doors, and characters are physically placed.
- **Runtime** is the current campaign turn being played: who has how much health, which cards are in hand, which phase the round is in.

Another simple comparison:

- **Content** = all possible ingredients in the kitchen
- **Board state** = what is currently laid out on the counter
- **Runtime** = what is happening in the meal right now

### Very short version

If you want to change:

- what exists in the game library -> **content**
- what is physically placed on the map -> **board state**
- what is happening in the current Wardens Debt session -> **runtime**

### Three concrete examples

Example 1:

- "This convict should start with 12 health in every future game."
- That is a **content** change.
- Why: you are changing the definition of the convict card itself.

Example 2:

- "Move this monster to another hex and mark it elite."
- That is a **board state** change.
- Why: you are changing a thing that is currently placed on the map.

Example 3:

- "Player 1 should lose 2 health right now during this test run."
- That is a **runtime** change.
- Why: you are changing the live state of the current Wardens Debt session.

### The easiest way to choose the right layer

Ask this question:

- "Am I changing the game definition, the map layout, or the current session?"

Then map it like this:

- game definition -> **content**
- map layout -> **board state**
- current session -> **runtime**

## 1. HavenMap Board State

Plain meaning:

- Board state is the stuff you can point at on the map and say "this is placed here right now."
- It is mostly about position, rotation, lock state, role, and visible counters on map objects.

Use board state when your request sounds like:

- "put this on the map"
- "move that"
- "rotate this"
- "open that door"
- "make this monster elite"
- "set this placed monster to 3 HP"

Top-level board state lives in `state` and contains:

- `tiles`
- `mercenaries`
- `summons`
- `monsters`
- `overlays`
- `questObjectives`
- `elements`
- `showGridLabels`
- `showObjectLabels`
- `CurrentLevel`
- `mapGame`
- `mapVersion`

Important point:

- There is **no single `objects` array** in persisted state.
- In sidebar/UI language, "objects" usually means **overlay objects**, which are stored in `state.overlays`.

### Board object kinds

The main selectable board kinds are:

- `tile`
- `mercenary`
- `summon`
- `monster`
- `overlay`

These kinds map to arrays like this:

- `tile` -> `state.tiles`
- `mercenary` -> `state.mercenaries`
- `summon` -> `state.summons`
- `monster` -> `state.monsters`
- `overlay` -> `state.overlays`

### Common board object fields

Most placed board objects use:

- `id`
- `x`
- `y`
- `angle`
- `locked`

Meaning:

- `id`: definition id from the data tables
- `x`, `y`: hex position
- `angle`: rotation in degrees, usually in 60 degree steps
- `locked`: whether dragging/rotation is blocked

### Fields by board kind

`tile`:

- `side`

`mercenary`:

- `level`
- optional `hp`
- optional `maxhp`
- optional `xp`
- optional `gold`
- optional `conditions`

`summon`:

- optional `hp`
- optional `maxhp`
- optional `conditions`

`monster`:

- `role`
- `standeeNum`
- optional `hp`
- optional `maxhp`
- optional `conditions`

`overlay`:

- `role`
- `opened` for doors only

### Important board terms

- `role` on monsters means `normal`, `elite`, or `boss`
- `role` on overlays means types like `door`, `trap`, `obstacle`, `loot`, `objective`, `corridor`, `wall`, `ice`, `difficult`, `hazardous`, `pressure-plate`, `element`, `scenario-aid`
- `standeeNum` is the monster standee number
- `CurrentLevel` is the global scenario level used for monster stats

### What to say instead of vague board requests

Avoid:

- "change HP counter on that thing"
- "make the object elite"
- "open the token"

Use:

- "Set `state.monsters[i].hp` to 6"
- "Change `state.monsters[i].role` from `normal` to `elite`"
- "Toggle `state.overlays[i].opened` on the selected door"
- "Increment `state.mercenaries[i].level`"

### Important correction to older wording

`counterHP` is **not** a current data field in this repo.

If you mean the generic map layer:

- use `hp`
- use `maxhp`

If you mean Wardens Debt runtime:

- convict HP is `health`
- enemy HP is `currentHealth`
- both use `maxHealth`

### Wardens Debt area maps versus HavenMap hexes

HavenMap board state is currently hex-position based. Wardens Debt does not use that rules model.

The current Wardens Debt prototype uses **board-space coordinates** for figures and a selectable maptile handle for tile placement. Figures can cross tile borders on composite maps, so tile boundaries should not be treated as movement fences.

Use board-space language for Wardens Debt requests:

- "Move `enemy-1` to board point `512, 384`"
- "Let the figure cross the border between map tiles"
- "Select the tile by its handle, not by the whole artwork"

Avoid hex language for Wardens Debt rules:

- "Move this enemy to hex 4,7"
- "Attack a target within 3 hexes"
- "Snap the convict to the hex grid"

Current Wardens Debt runtime concept:

- `board.figurePositions[figureId] = { x, y }`
- figures are UI-snapped to board/grid points only
- tile selection uses `selectedWdMapTile`

Future area-graph concepts can still be introduced later if the design needs them, but they are not part of the current playtest model.

## 2. Wardens Debt Content

Plain meaning:

- Content is the master data.
- It defines what cards, convicts, monsters, decks, and scenarios exist at all.
- If you start a fresh game later, content changes still matter there too.

Use content when your request sounds like:

- "change this card permanently"
- "add a new card"
- "change a convict's base health"
- "change which monsters belong to this location"
- "make this scenario start with different setup"

Wardens Debt content is the static game definition. It is not the same as the live runtime state.

Top-level content collections:

- `dice`
- `conditionTokens`
- `skillCards`
- `convictDefs`
- `monsterCards`
- `eventCards`
- `itemCards`
- `agendaCards`
- `missionCards`
- `locationCards`
- `mapTiles`
- `decks`
- `scenarios`

Also present:

- `schemaVersion`
- `gameId`
- `contentVersion`

### Core content object types

`skillCard`:

- `id`
- `name`
- `text`
- `effects`
- `tags`
- `role`
- `cost`
- `timing`
- optional `convictDefId`

Important values:

- `role`: `starter` or `common`
- `timing`: `fast` or `slow`

`convictDef`:

- `id`
- `name`
- `health`
- `handSize`
- `starterSkillCardIds`
- `tags`

`monsterCard`:

- `id`
- `name`
- `text`
- `effects`
- `tags`
- `health`
- `attack`

`eventCard`, `itemCard`, `agendaCard`, `missionCard`:

- `id`
- `name`
- `text`
- `effects`
- `tags`

`itemCard` also has:

- `cost`

`locationCard`:

- `id`
- `name`
- `mapTileIds`
- `monsterCardIds`
- `tags`

`mapTile`:

- `id`
- `name`
- `layoutKey`
- optional `areas`
- `tags`

`deck`:

- `id`
- `name`
- `kind`
- `cardIds`

Supported `deck.kind` values:

- `common-skill`
- `monster`
- `event`
- `item`
- `location`
- `agenda`
- `mission`

`scenario`:

- `id`
- `name`
- `playerSlots`
- `setup`

`scenario.setup` contains:

- `convictDefIds`
- `commonSkillDeckIds`
- optional `monsterDeckId`
- optional `eventDeckId`
- optional `itemDeckId`
- optional `locationDeckId`
- optional `agendaDeckId`
- optional `missionDeckId`
- optional `startingLocationCardId`
- `diceIds`
- `conditionTokenIds`
- `startingResources`

### Production Tags In Content

Because this project is meant to support physical playtesting, some content also carries production/export meaning inside `tags`.

This is still part of the **content layer**, because it describes the game library, not the current session.

Current production tag style:

- `print`
- `component:card`
- `component:token`
- `component:board`
- `print-group:starter-skill-cards`
- `print-group:condition-tokens`
- `print-group:map-tiles`

Meaning:

- `print`: this thing is expected to become a physical component
- `component:*`: what kind of physical thing it is
- `print-group:*`: which export/print batch it belongs to

Use content-layer requests for this, for example:

- "Add `print` to all location cards"
- "Change this token tag from `component:token` to something else"
- "Put common skill cards in `print-group:common-skill-cards`"

### Effects terminology

Card effects use objects with fields like:

- `type`
- `target`
- optional `amount`
- optional `count`
- optional `conditionId`

Current supported `effect.type` values:

- `deal_damage`
- `heal`
- `draw_cards`
- `gain_guard`
- `summon_unit`
- `apply_condition`
- `roll_die`

### What to say for content changes

Avoid:

- "buff that convict"
- "change one of the common cards"
- "make the prison event draw more"

Use:

- "Set `convictDefs[0].health` to 12"
- "Change skill card `common-brawler-swing` so `timing` is `fast`"
- "Append an effect to `eventCards[i].effects`"
- "Set `decks[i].kind` to `agenda`"
- "Add `monsterCardIds` entry `monster-collector` to location card `location-cell-block-a`"

## 3. Wardens Debt Runtime State

Plain meaning:

- Runtime is the live Wardens Debt play session.
- It tracks what is happening during the current test game.
- If you reload or start a new game, runtime can reset, but content remains the same.

Use runtime when your request sounds like:

- "right now, during play"
- "convict 1 loses health"
- "draw a card into hand"
- "move this card to discard"
- "advance to enemy phase"
- "add 1 guard this turn"

This is the live game state used during playtesting.

Top-level runtime state fields:

- `stateVersion`
- `contentVersion`
- `scenarioId`
- `turn`
- `dicePool`
- `conditionSupply`
- `convicts`
- `enemies`
- `decks`
- `activeCards`
- `board`
- `zones`
- `log`

### Turn state

`turn` contains:

- `round`
- `activeSide`
- `phase`

Supported `turn.activeSide` values:

- `convicts`
- `enemies`

Supported `turn.phase` values:

- `start-round`
- `event-phase`
- `select-cards`
- `fast-cards`
- `enemy-phase`
- `slow-cards`
- `end-round`

### Convicts

Each runtime convict object contains:

- `id`
- `name`
- `convictDefId`
- `health`
- `maxHealth`
- `handSize`
- `starterSkillCardIds`
- `hand`
- `drawPile`
- `discardPile`
- `banished`
- `resources`
- `guards`
- `conditions`

Important point:

- runtime convicts use `health` and `maxHealth`
- they do **not** use `hp` and `maxhp`

### Enemies

Each runtime enemy object contains:

- `instanceId`
- `monsterCardId`
- `name`
- `currentHealth`
- `maxHealth`
- `attack`
- `conditions`
- `zone`

Important point:

- runtime enemies use `currentHealth`
- they do **not** use `hp`

### Runtime decks

`decks` contains:

- `commonSkillDecks`
- `monsterDeck`
- `eventDeck`
- `itemDeck`
- `locationDeck`
- `agendaDeck`
- `missionDeck`

Each deck state contains:

- `deckId`
- `drawPile`
- `discardPile`

### Active cards

`activeCards` contains:

- `monster`
- `event`
- `item`
- `location`
- `agenda`
- `mission`
- `fastSkills`
- `slowSkills`

Important distinction:

- `monster`, `event`, `item`, `location`, `agenda`, `mission` are arrays of **card ids**
- `fastSkills` and `slowSkills` are arrays of **queued skill objects**

Each queued skill object contains:

- `convictIndex`
- `cardId`
- `resolved`

### Board and zones

`board` contains:

- `locationCardId`
- `mapTileIds`
- `figurePositions`

`zones` contains:

- `board`
- `reserve`
- `discard`
- `banished`

These zone arrays hold **enemy `instanceId` values**, not monster card ids.

For Wardens Debt playtesting, prefer board-space `x/y` placement over HavenMap `x/y` hex coordinates. The tile body is passive; use `selectedWdMapTile` for the small handle-only tile affordance.

## 4. UI Selection Terms

The sidebar also has Wardens Debt selection kinds:

- `wd-convict`
- `wd-enemy`

These are UI selection identifiers, not persisted runtime object types.

Use them when talking about sidebar behavior, for example:

- "When `selected.kind === 'wd-convict'`, show `resources` before `hand`"
- "Add a button to `wd-enemy` panels to move `zone` from `board` to `reserve`"

## 5. Good Request Patterns

These are examples of precise requests that fit the current code.

### Board layer

- "Set selected `monster.hp` to 3"
- "Add `conditions: ['Poison']` to the selected `summon`"
- "When placing an `overlay` with `role === 'door'`, initialize `opened: false`"
- "Show `standeeNum` in the monster header"

### Wardens Debt content layer

- "Add a new `skillCard` with `role: 'common'` and `timing: 'fast'`"
- "Set `convictDefs` entry `convict-a` to `handSize: 3`"
- "Append `apply_condition` to `eventCards[i].effects`"
- "Add a new `deck` with `kind: 'mission'`"

### Wardens Debt runtime layer

- "Set `convicts[0].health` to 5"
- "Increase `convicts[1].guards` by 1"
- "Move card id `agenda-secure-route` from `activeCards.agenda` to `decks.agendaDeck.discardPile`"
- "Set `enemies[0].currentHealth` to 2"
- "Push a queued card into `activeCards.fastSkills`"
- "Set `turn.phase` to `enemy-phase`"

## 6. Fast Translation Cheatsheet

If you mean:

- "HP counter on a map monster" -> `monster.hp`
- "HP counter on a Wardens Debt convict" -> `convict.health`
- "HP counter on a Wardens Debt enemy" -> `enemy.currentHealth`
- "max HP on a map token" -> `maxhp`
- "max HP in Wardens Debt runtime" -> `maxHealth`
- "a placed object on the map" -> usually `tile`, `mercenary`, `summon`, `monster`, or `overlay`
- "an object in the Objects tab" -> usually an `overlay`
- "the card definition" -> content layer card like `skillCard` or `monsterCard`
- "the card currently in play" -> runtime `activeCards.*` or a deck `drawPile` / `discardPile`

## 7. Best Way To Phrase Future Requests

When possible, include all three parts:

1. **layer**
2. **object path**
3. **operation**

Template:

`In [board/content/runtime], change [exact field path] to [new value].`

Examples:

- `In runtime, set convicts[0].health to 7.`
- `In content, change skillCards id common-brawler-swing timing to fast.`
- `In board state, set the selected monster role to elite.`
