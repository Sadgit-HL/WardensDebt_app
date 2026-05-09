import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WARDENS_DEBT_CONTENT_SCHEMA_VERSION,
  validateWardensDebtContent,
} from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WORKBOOK_PATH = path.resolve(
  __dirname,
  '../../data/wardens-debt/sheets/workbook.json'
);
const DEFAULT_PUBLISHED_CONFIG_PATH = path.resolve(
  __dirname,
  '../../data/wardens-debt/sheets/published-sheet.json'
);
const DEFAULT_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../data/wardens-debt/core-set.json'
);

const TAB_NAMES = [
  'dice',
  'conditionTokens',
  'skillCards',
  'convictDefs',
  'enemyCards',
  'eventCards',
  'itemCards',
  'agendaCards',
  'missionCards',
  'locationCards',
  'mapTiles',
  'decks',
  'scenarios',
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_WORKBOOK_PATH,
    publishedConfig: DEFAULT_PUBLISHED_CONFIG_PATH,
    output: DEFAULT_OUTPUT_PATH,
    source: 'file',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') {
      args.input = path.resolve(argv[++i]);
    } else if (arg === '--output') {
      args.output = path.resolve(argv[++i]);
    } else if (arg === '--published-config') {
      args.publishedConfig = path.resolve(argv[++i]);
    } else if (arg === '--published') {
      args.source = 'published';
    }
  }

  return args;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let currentLine = '';
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === '"') {
      const nextChar = normalized[index + 1];
      if (inQuotes && nextChar === '"') {
        currentLine += '""';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      currentLine += char;
      continue;
    }

    if (char === '\n' && !inQuotes) {
      rows.push(parseCsvLine(currentLine));
      currentLine = '';
      continue;
    }

    currentLine += char;
  }

  if (currentLine.length > 0) {
    rows.push(parseCsvLine(currentLine));
  }

  return rows.filter(row => row.some(cell => String(cell).trim().length > 0));
}

function csvRowsToObjects(rows, tabName) {
  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map(header => String(header).trim());

  if (normalizedHeaders.some(header => !header)) {
    throw new Error(`Published sheet tab "${tabName}" has an empty header cell`);
  }

  return dataRows.map(row => {
    const record = {};
    normalizedHeaders.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
}

function buildPublishedCsvUrl(spreadsheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

async function loadPublishedWorkbook(configPath) {
  const configRaw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(configRaw);
  const spreadsheetId = asNonEmptyString(config.spreadsheetId);

  if (!spreadsheetId) {
    throw new Error(`Published sheet config "${configPath}" must include a non-empty "spreadsheetId"`);
  }

  if (!config.tabs || typeof config.tabs !== 'object' || Array.isArray(config.tabs)) {
    throw new Error(`Published sheet config "${configPath}" must include a "tabs" object`);
  }

  const workbook = {
    meta: {
      schemaVersion: config.meta?.schemaVersion || WARDENS_DEBT_CONTENT_SCHEMA_VERSION,
      gameId: config.meta?.gameId || 'wardens-debt',
      contentVersion: config.meta?.contentVersion || 'prototype-core-set',
    },
  };

  for (const tabName of TAB_NAMES) {
    const gid = asNonEmptyString(config.tabs[tabName]);
    if (!gid) {
      throw new Error(`Published sheet config "${configPath}" is missing a gid for tab "${tabName}"`);
    }

    const url = buildPublishedCsvUrl(spreadsheetId, gid);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load published sheet tab "${tabName}" from ${url}: ${response.status}`);
    }

    const csv = await response.text();
    workbook[tabName] = csvRowsToObjects(parseCsv(csv), tabName);
  }

  return workbook;
}

function asNonEmptyString(value) {
  if (value == null) return undefined;
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : undefined;
}

function parseInteger(value, fallback = undefined) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return Math.trunc(value);
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  const stringValue = asNonEmptyString(value);
  if (!stringValue) return [];

  if (stringValue.startsWith('[')) {
    const parsed = JSON.parse(stringValue);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected JSON array, got "${stringValue}"`);
    }
    return parsed.map(item => String(item).trim()).filter(Boolean);
  }

  return stringValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseEffects(value) {
  if (Array.isArray(value)) return value;
  const stringValue = asNonEmptyString(value);
  if (!stringValue) return [];
  const parsed = JSON.parse(stringValue);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected effects JSON array, got "${stringValue}"`);
  }
  return parsed;
}

function optionalDeckId(value) {
  return asNonEmptyString(value) ?? null;
}

function mapDiceRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    sides: parseInteger(row.sides, 6),
  };
}

function mapConditionTokenRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    description: String(row.description).trim(),
    tags: parseStringArray(row.tags),
  };
}

function mapSkillCardRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    role: String(row.role).trim(),
    timing: String(row.timing).trim(),
    convictDefId: asNonEmptyString(row.convictDefId ?? row.convictId),
    cost: parseInteger(row.cost, 0),
    text: String(row.text).trim(),
    tags: parseStringArray(row.tags),
    effects: parseEffects(row.effects),
  };
}

function mapConvictDefRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    health: parseInteger(row.health, 0),
    handSize: parseInteger(row.handSize, 0),
    starterSkillCardIds: parseStringArray(row.starterSkillCardIds),
    tags: parseStringArray(row.tags),
  };
}

function mapEnemyCardRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    health: parseInteger(row.health, 0),
    attack: parseInteger(row.attack, 0),
    text: String(row.text).trim(),
    tags: parseStringArray(row.tags),
    effects: parseEffects(row.effects),
  };
}

function mapEffectCardRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    text: String(row.text).trim(),
    tags: parseStringArray(row.tags),
    effects: parseEffects(row.effects),
  };
}

function mapItemCardRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    cost: parseInteger(row.cost, 0),
    text: String(row.text).trim(),
    tags: parseStringArray(row.tags),
    effects: parseEffects(row.effects),
  };
}

function mapLocationCardRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    mapTileIds: parseStringArray(row.mapTileIds),
    enemyCardIds: parseStringArray(row.enemyCardIds),
    tags: parseStringArray(row.tags),
  };
}

function mapMapTileRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    layoutKey: String(row.layoutKey).trim(),
    tags: parseStringArray(row.tags),
  };
}

function mapDeckRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    kind: String(row.kind).trim(),
    cardIds: parseStringArray(row.cardIds),
  };
}

function mapScenarioRow(row) {
  return {
    id: String(row.id).trim(),
    name: String(row.name).trim(),
    playerSlots: parseInteger(row.playerSlots, 0),
    setup: {
      convictDefIds: parseStringArray(row.convictDefIds ?? row.convictIds),
      commonSkillDeckIds: parseStringArray(row.commonSkillDeckIds),
      enemyDeckId: optionalDeckId(row.enemyDeckId),
      eventDeckId: optionalDeckId(row.eventDeckId),
      itemDeckId: optionalDeckId(row.itemDeckId),
      locationDeckId: optionalDeckId(row.locationDeckId),
      agendaDeckId: optionalDeckId(row.agendaDeckId),
      missionDeckId: optionalDeckId(row.missionDeckId),
      startingLocationCardId: optionalDeckId(row.startingLocationCardId),
      diceIds: parseStringArray(row.diceIds),
      conditionTokenIds: parseStringArray(row.conditionTokenIds),
      startingResources: parseInteger(row.startingResources, 0),
    },
  };
}

function requireArrayTab(workbook, tabName) {
  const value = workbook[tabName];
  if (!Array.isArray(value)) {
    throw new Error(`Workbook tab "${tabName}" must be an array`);
  }
  return value;
}

function buildContent(workbook) {
  return {
    schemaVersion: workbook.meta?.schemaVersion || WARDENS_DEBT_CONTENT_SCHEMA_VERSION,
    gameId: workbook.meta?.gameId || 'wardens-debt',
    contentVersion: workbook.meta?.contentVersion || 'prototype-core-set',
    dice: requireArrayTab(workbook, 'dice').map(mapDiceRow),
    conditionTokens: requireArrayTab(workbook, 'conditionTokens').map(mapConditionTokenRow),
    skillCards: requireArrayTab(workbook, 'skillCards').map(mapSkillCardRow),
    convictDefs: requireArrayTab(workbook, 'convictDefs').map(mapConvictDefRow),
    enemyDefs: requireArrayTab(workbook, 'enemyCards').map(mapEnemyCardRow),
    eventCards: requireArrayTab(workbook, 'eventCards').map(mapEffectCardRow),
    itemCards: requireArrayTab(workbook, 'itemCards').map(mapItemCardRow),
    agendaCards: requireArrayTab(workbook, 'agendaCards').map(mapEffectCardRow),
    missionCards: requireArrayTab(workbook, 'missionCards').map(mapEffectCardRow),
    locationCards: requireArrayTab(workbook, 'locationCards').map(mapLocationCardRow),
    mapTiles: requireArrayTab(workbook, 'mapTiles').map(mapMapTileRow),
    decks: requireArrayTab(workbook, 'decks').map(mapDeckRow),
    scenarios: requireArrayTab(workbook, 'scenarios').map(mapScenarioRow),
  };
}

async function main() {
  const { input, output, publishedConfig, source } = parseArgs(process.argv.slice(2));
  const workbook =
    source === 'published'
      ? await loadPublishedWorkbook(publishedConfig)
      : JSON.parse(await fs.readFile(input, 'utf8'));

  for (const tabName of TAB_NAMES) {
    requireArrayTab(workbook, tabName);
  }

  const content = buildContent(workbook);
  const validation = validateWardensDebtContent(content);
  if (!validation.ok) {
    throw new Error(`Generated content failed validation:\n${validation.issues.join('\n')}`);
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

  if (source === 'published') {
    console.log(`Imported published sheet workbook using ${publishedConfig}`);
  } else {
    console.log(`Imported workbook ${input}`);
  }
  console.log(`Generated content ${output}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
