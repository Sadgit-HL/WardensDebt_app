# Wardens Debt Cheat Sheet

Use this when writing requests for changes.

## The 3 Buckets

### 1. Map Layer

Use this when you mean:

- something placed on the map
- a hex position
- rotation
- a door
- a token
- a visible monster/mercenary/summon on the board

Typical words:

- `monster`
- `mercenary`
- `summon`
- `overlay`
- `tile`
- `hp`
- `maxhp`
- `role`
- `opened`

Examples:

- `In map layer, move the selected monster to C5.`
- `In map layer, set the selected monster role to elite.`
- `In map layer, set the selected monster hp to 3.`
- `In map layer, open the selected door.`

### 2. Game Library

Use this when you mean:

- card definitions
- convict definitions
- monster card definitions
- scenario setup
- permanent game data

Typical words:

- `skillCard`
- `convictDef`
- `monsterCard`
- `eventCard`
- `itemCard`
- `agendaCard`
- `missionCard`
- `locationCard`
- `deck`
- `scenario`

Examples:

- `In game library, set convictDef convict-a health to 12.`
- `In game library, change skill card common-brawler-swing timing to fast.`
- `In game library, add a new mission card.`
- `In game library, change location card location-cell-block-a monsterCardIds.`

Production/export requests also belong here.

Typical production tags:

- `print`
- `component:card`
- `component:token`
- `component:board`
- `print-group:starter-skill-cards`
- `print-group:condition-tokens`
- `print-group:map-tiles`

Examples:

- `In game library, add tag print to all mission cards.`
- `In game library, set this item card tags to include component:card.`
- `In game library, move this token from print-group:condition-tokens to another print group.`

### 3. Wardens Debt Session

Use this when you mean:

- the current WD playtest session
- cards in hand
- draw pile / discard pile
- current convict health
- current enemy health
- round / phase
- guards / resources / conditions

Typical words:

- `convicts`
- `enemies`
- `health`
- `currentHealth`
- `maxHealth`
- `hand`
- `drawPile`
- `discardPile`
- `activeCards`
- `turn.phase`

Examples:

- `In Wardens Debt session, set convicts[0].health to 7.`
- `In Wardens Debt session, set enemies[0].currentHealth to 2.`
- `In Wardens Debt session, advance turn.phase to enemy-phase.`
- `In Wardens Debt session, move agenda-secure-route to decks.agendaDeck.discardPile.`

## Fast Translation

If you mean:

- "HP on a map monster" -> `hp`
- "max HP on a map monster" -> `maxhp`
- "HP on a WD convict" -> `health`
- "HP on a WD enemy" -> `currentHealth`
- "max HP in WD session" -> `maxHealth`
- "door open/closed" -> `opened`
- "normal/elite/boss" -> `role`

## Good Request Formula

Best pattern:

`In [map layer / game library / Wardens Debt session], change [thing] to [value].`

Examples:

- `In map layer, set selected monster hp to 4.`
- `In game library, set convictDef convict-a handSize to 3.`
- `In Wardens Debt session, give convicts[1] 1 guard.`

## Best Terms To Use

Prefer these terms:

- `map layer`
- `game library`
- `Wardens Debt session`
- `hp`
- `maxhp`
- `health`
- `currentHealth`
- `maxHealth`
- `role`
- `opened`
- `hand`
- `drawPile`
- `discardPile`
- `activeCards`
- `print`
- `component:card`
- `component:token`
- `component:board`
- `print-group:*`

Avoid these vague terms when possible:

- `thing`
- `object`
- `counter`
- `that card`
- `that monster`
- `change HP somehow`
