# Google Sheets Workflow

Use Google Sheets to edit `Wardens Debt` content data. Do not edit gameplay code for normal balancing changes.

## Goal

The intended pipeline is:

```text
Google Sheets -> workbook JSON export or published CSV tabs -> import script -> validated core-set.json -> app runtime
```

This means changing names, costs, HP, conditions, deck membership, and scenario setup should usually be a sheet edit only.

## Workbook Shape

The importer expects a workbook-style JSON object with one array per tab.

Current required tabs:

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

The current local sample export lives at:

- `HavenMap/data/wardens-debt/sheets/workbook.json`

The published-sheet config template lives at:

- `HavenMap/data/wardens-debt/sheets/published-sheet.json`

## Column Format

Use simple cells wherever possible.

Recommended conventions:

- numeric fields: plain numbers in the sheet
- id-reference lists: comma-separated ids
- tags: comma-separated values
- `effects`: JSON array string in one cell
- optional id references: leave blank for `null`

Additional current conventions:

- `skillCards.timing`: required, use `fast` or `slow`
- `skillCards.convictDefId`: required for `starter` cards, blank for `common` cards
- `convictDefs.starterSkillCardIds`: comma-separated starter skill ids
- `decks.cardIds`: comma-separated ids from the matching content family
- Wardens Debt map areas should not be forced into hex coordinates. Area polygons can start in JSON/code fixtures; if moved into Sheets later, use a dedicated `mapAreas` tab rather than overloading `mapTiles`.

Examples:

```text
tags
starter,attack
```

```text
starterSkillCardIds
convict-a-starter-strike,convict-a-starter-guard
```

```json
[{"type":"deal_damage","target":"enemy","amount":1}]
```

```text
timing
fast
```

## Scenario Columns

`scenarios` rows currently flatten setup fields into columns. Use these headers:

- `id`
- `name`
- `playerSlots`
- `convictIds`
- `commonSkillDeckIds`
- `monsterDeckId`
- `eventDeckId`
- `itemDeckId`
- `locationDeckId`
- `agendaDeckId`
- `missionDeckId`
- `startingLocationCardId`
- `diceIds`
- `conditionTokenIds`
- `startingResources`

## Map Area Data

Wardens Debt map tiles are currently composite graphics with board-space figure placement.

Near-term recommendation:

- keep `mapTiles` simple in the main sheet
- author tile position and default figure placement in JSON/code fixtures while the UI model is being tested
- keep the tile handle interaction separate from the artwork body

Possible later `mapAreas` tab:

- `tileId`
- `areaId`
- `name`
- `polygonJson`
- `adjacentAreaIds`
- `tags`

The importer does not currently require this tab. Add it only if a later area-map rules layer becomes useful.

## Import Command

Generate runtime content from the local workbook export with:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs
```

Optional custom paths:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs --input C:\path\to\workbook.json --output C:\path\to\core-set.json
```

Generate runtime content from a published Google Sheet with:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs --published
```

Optional custom published config path:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs --published --published-config C:\path\to\published-sheet.json
```

The script:

- reads the workbook export
- or fetches each published CSV tab from Google Sheets
- normalizes comma-separated fields and numeric fields
- normalizes scenario setup into `scenario.setup`
- validates the generated content against the current schema
- writes `HavenMap/data/wardens-debt/core-set.json`

## Published Sheet Setup

The `--published` mode expects:

1. a published Google Sheet
2. the spreadsheet id
3. one published tab per required workbook tab
4. each tab's `gid` recorded in `published-sheet.json`

The importer builds CSV export URLs in this shape:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=TAB_GID
```

Each required tab should have a header row whose column names match the importer expectations for that content family.

## Google Sheets Export Options

The importer is deliberately local-first. It does not call the Sheets API directly yet.

Recommended first workflow:

1. Maintain the design data in Google Sheets.
2. Either:
   - export the workbook to a JSON file matching the tab names above, or
   - publish each tab and fill in `published-sheet.json`
3. Run `importSheets.mjs`.
4. Launch the app with the regenerated content.

This is still not a private Google Sheets API integration. `--published` uses public CSV export URLs, which is faster to adopt but only appropriate for non-secret prototype content.

## Why This Is Better Than Updating Code

Changing content should not require edits to:

- `schema.js`
- `gameplay.js`
- UI modules

Those files should only change when the data model or game logic changes. Balancing and content iteration should happen in Sheets and flow through the importer.

## Current Minimal Vertical Slice

The current sample workbook represents one small playable slice:

- 2 convict definitions
- 8 skill cards with explicit `fast`/`slow` timing
- 1 monster card
- 2 event cards
- 1 item card
- 2 agenda cards
- 2 mission cards
- 1 location card referencing 2 map tiles
- 1 scenario wiring those decks together

If you are testing the content pipeline, start by changing one of these values in the workbook export:

- a convict `health` or `handSize`
- a skill `cost`, `timing`, or `text`
- deck membership in `decks.cardIds`
- scenario setup fields such as `startingResources` or `commonSkillDeckIds`
