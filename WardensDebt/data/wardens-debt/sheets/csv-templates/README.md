# CSV Templates

These CSV files mirror the current workbook tab structure for Google Sheets setup.

There is also a master authoring table:

- `cards_master.csv`

Create one sheet tab for each CSV filename:

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

You can import each CSV into its matching Google Sheets tab, then publish those tabs and fill in `published-sheet.json`.

`cards_master.csv` is not consumed by the importer directly yet. It is an authoring helper for a future master-sheet workflow.
