# Content Authoring Workflow

How to author game content via Google Sheets or local JSON.

## Current Status

Content is currently authored in `WardensDebt/data/wardens-debt/core-set.json` (manual edits) or via Google Sheets with the import tool.

## Workflow Pipeline

```
Google Sheets
    ↓
workbook JSON export or published CSV tabs
    ↓
importSheets.mjs (Node.js import script)
    ↓
core-set.json (validated)
    ↓
app runtime
```

## Quick Edit (Fastest)

For fast prototyping, edit `WardensDebt/data/wardens-debt/core-set.json` directly:

1. Open file in editor
2. Modify card stats, names, costs, effects, decks, scenarios
3. Save
4. Reload browser
5. App validates and reports issues in console

No tooling required — edit JSON, reload, test.

## Google Sheets Setup (Long-Term)

### 1. Create Workbook

Create a Google Sheets workbook with these tabs (one per content family):

- `diceDefs`
- `conditionDefs`
- `skillDefs`
- `convictDefs`
- `monsterDefs`
- `eventDefs`
- `itemDefs`
- `agendaDefs`
- `missionDefs`
- `locationDefs`
- `mapTileDefs`
- `decks`
- `scenarioDefs`

Each tab is a table with columns matching content fields. See `data-model.md` for field definitions.

### 2. Column Format

**Simple cells:**
- id, name, text → plain text
- health, cost → numbers
- timing, role → plain text (e.g., `fast`, `slow`)

**Lists (comma-separated):**
- tags: `starter, attack, print`
- cardIds: `skill-1, skill-2, skill-3`
- convictDefIds: `convict-a, convict-b`

**JSON arrays (in one cell):**
```json
[{"type":"deal_damage","target":"enemy","amount":1}]
```

### 3. Publish Sheets as JSON or CSV

#### Option A: CSV Export

1. File → Export → Each sheet as CSV
2. Save to `WardensDebt/data/wardens-debt/sheets/csv-templates/`

#### Option B: Published Sheets (Recommended)

1. Go to share menu → "Publish to web"
2. Export as JSON for each sheet
3. Update `WardensDebt/data/wardens-debt/sheets/published-sheet.json` with the public URLs
4. Run importer with `--published` flag

### 4. Run Import Script

From the workspace root:

```bash
# Using local workbook.json
node WardensDebt/scripts/wardensDebt/importSheets.mjs

# Using published Google Sheets
node WardensDebt/scripts/wardensDebt/importSheets.mjs --published
```

This:
1. Reads workbook JSON or published sheets
2. Validates structure
3. Writes `WardensDebt/data/wardens-debt/core-set.json`
4. Reports validation errors

### 5. Test in App

1. Reload browser
2. Check console for validation errors
3. Play through scenario
4. Repeat

## File References

- **Source workbook:** `WardensDebt/data/wardens-debt/sheets/workbook.json`
- **Published config:** `WardensDebt/data/wardens-debt/sheets/published-sheet.json`
- **Output:** `WardensDebt/data/wardens-debt/core-set.json`
- **CSV templates:** `WardensDebt/data/wardens-debt/sheets/csv-templates/`
- **Importer:** `WardensDebt/scripts/wardensDebt/importSheets.mjs`

## Validation

The importer and app both validate content:

- All referenced IDs must exist
- skillCards.timing must be `fast` or `slow`
- skillCards.role must be `starter` or `common`
- decks.kind must be one of the supported types
- scenarios.setup must reference existing definitions

Validation errors are reported in the browser console and import script output.

## Workflow Examples

### Add a New Skill Card

**Direct JSON edit:**
```json
{
  "id": "new-skill-1",
  "name": "New Skill",
  "role": "common",
  "timing": "fast",
  "cost": 0,
  "text": "...",
  "effects": [{"type": "deal_damage", "target": "enemy", "amount": 2}],
  "tags": ["common", "print"]
}
```

**Via Sheets:**
1. Open `skillCards` tab
2. Add row with above data
3. Export and run importer
4. Reload app

### Change a Convict's Health

**Direct JSON:** Edit `convictDefs[i].health`

**Via Sheets:** Edit `convictDefs` tab, health column. Run importer. Reload.

### Add a New Scenario

**Direct JSON:**
```json
{
  "id": "scenario-2",
  "name": "Advanced Game",
  "playerSlots": 2,
  "setup": {
    "convictDefIds": ["convict-a", "convict-b"],
    "commonSkillDeckIds": ["deck-common-skills"],
    "diceIds": ["d6-basic"],
    "conditionTokenIds": ["marked"],
    "startingResources": {"focus": 1}
  }
}
```

**Via Sheets:** Add row to `scenarios` tab with above data. Run importer. Reload.

## Future Improvements

- [ ] Web UI editor (no Sheets required)
- [ ] Database + API backend (Supabase, PostgreSQL)
- [ ] Live preview during editing
- [ ] Diff/version control for content changes
