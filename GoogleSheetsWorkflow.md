# Google Sheets Workflow

Use Google Sheets to edit `Wardens Debt` content data. Do not edit gameplay code for normal balancing changes.

## Goal

The intended pipeline is:

```text
Google Sheets -> workbook JSON export -> import script -> validated core-set.json -> app runtime
```

This means changing names, costs, HP, conditions, deck membership, and scenario setup should usually be a sheet edit only.

## Workbook Shape

The importer expects a workbook-style JSON object with one array per tab.

Current required tabs:

- `dice`
- `conditionTokens`
- `skillCards`
- `convictCards`
- `monsterCards`
- `eventCards`
- `itemCards`
- `agendaCards`
- `missionCards`
- `locationCards`
- `mapTiles`
- `decks`
- `scenarios`

The current sample export lives at:

- `HavenMap/data/wardens-debt/sheets/workbook.json`

## Column Format

Use simple cells wherever possible.

Recommended conventions:

- numeric fields: plain numbers in the sheet
- id-reference lists: comma-separated ids
- tags: comma-separated values
- `effects`: JSON array string in one cell

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

## Import Command

Generate runtime content from the workbook export with:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs
```

Optional custom paths:

```powershell
node HavenMap/scripts/wardensDebt/importSheets.mjs --input C:\path\to\workbook.json --output C:\path\to\core-set.json
```

The script:

- reads the workbook export
- normalizes comma-separated fields and numeric fields
- validates the generated content against the current schema
- writes `HavenMap/data/wardens-debt/core-set.json`

## Google Sheets Export Options

The importer is deliberately local-first. It does not call the Sheets API directly yet.

Recommended first workflow:

1. Maintain the design data in Google Sheets.
2. Export the workbook to a JSON file matching the tab names above.
3. Run `importSheets.mjs`.
4. Launch the app with the regenerated content.

Later, if needed, a direct sync step can be added. For now, keeping the import local keeps the workflow simpler and easier to debug.

## Why This Is Better Than Updating Code

Changing content should not require edits to:

- `schema.js`
- `gameplay.js`
- UI modules

Those files should only change when the data model or game logic changes. Balancing and content iteration should happen in Sheets and flow through the importer.
