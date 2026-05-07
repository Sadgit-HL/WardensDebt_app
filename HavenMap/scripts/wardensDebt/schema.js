export const WARDENS_DEBT_CONTENT_SCHEMA_VERSION = '0.5.0';
import { wardensDebtMapTileForId } from './mapTiles.js';

export const WARDENS_DEBT_STATE_VERSION = '0.2.0';

const DECK_KINDS = new Set(['common-skill', 'monster', 'event', 'item', 'location', 'agenda', 'mission']);
const EFFECT_TYPES = new Set([
  'deal_damage',
  'heal',
  'draw_cards',
  'gain_guard',
  'summon_unit',
  'apply_condition',
  'roll_die',
]);
const TURN_SIDES = new Set(['convicts', 'enemies']);
const SKILL_TIMINGS = new Set(['fast', 'slow']);
const TURN_PHASES = new Set([
  'start-round',
  'event-phase',
  'select-cards',
  'fast-cards',
  'enemy-phase',
  'slow-cards',
  'end-round',
]);
const ZONE_NAMES = new Set(['board', 'reserve', 'discard', 'banished']);

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushIssue(issues, path, message) {
  issues.push(`${path}: ${message}`);
}

function validateStringArray(values, path, issues) {
  if (!Array.isArray(values)) {
    pushIssue(issues, path, 'must be an array');
    return false;
  }

  values.forEach((value, index) => {
    if (!isNonEmptyString(value)) {
      pushIssue(issues, `${path}[${index}]`, 'must be a non-empty string');
    }
  });

  return true;
}

function validatePointMap(values, path, issues) {
  if (!isPlainObject(values)) {
    pushIssue(issues, path, 'must be an object');
    return false;
  }

  Object.entries(values).forEach(([key, value]) => {
    const itemPath = `${path}.${key}`;
    if (!isPlainObject(value)) {
      pushIssue(issues, itemPath, 'must be an object');
      return;
    }
    if (!isNonNegativeInteger(value.x)) pushIssue(issues, `${itemPath}.x`, 'must be a non-negative integer');
    if (!isNonNegativeInteger(value.y)) pushIssue(issues, `${itemPath}.y`, 'must be a non-negative integer');
  });

  return true;
}

function validateMapTiles(values, path, issues, contentIndex) {
  if (!Array.isArray(values)) {
    pushIssue(issues, path, 'must be an array');
    return false;
  }

  values.forEach((tile, index) => {
    const tilePath = `${path}[${index}]`;
    if (!isPlainObject(tile)) {
      pushIssue(issues, tilePath, 'must be an object');
      return;
    }
    if (!isNonEmptyString(tile.id)) pushIssue(issues, `${tilePath}.id`, 'must be a non-empty string');
    else if (contentIndex && !contentIndex.mapTilesById.has(tile.id)) pushIssue(issues, `${tilePath}.id`, `references unknown map tile "${tile.id}"`);
    if (!isNonNegativeInteger(tile.x)) pushIssue(issues, `${tilePath}.x`, 'must be a non-negative integer');
    if (!isNonNegativeInteger(tile.y)) pushIssue(issues, `${tilePath}.y`, 'must be a non-negative integer');
  });

  return true;
}

function defaultWardensDebtPoint(tile, index, kind, total) {
  const width = tile?.naturalWidth || 1000;
  const height = tile?.naturalHeight || 1000;
  const step = Math.max(48, Math.floor(height / Math.max(3, total + 2)));
  const centerX = kind === 'enemy' ? width * 0.62 : width * 0.38;
  const baseY = kind === 'enemy' ? height * 0.18 : height * 0.82;
  const direction = kind === 'enemy' ? 1 : -1;
  const offset = Math.min(index, 4) * step;
  return {
    x: Math.max(0, Math.min(width, Math.round(centerX + (index % 2 === 0 ? -32 : 32)))),
    y: Math.max(0, Math.min(height, Math.round(baseY + direction * offset))),
  };
}

function validateUniqueIds(items, path, issues) {
  const seen = new Set();

  items.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(item)) return;
    if (!isNonEmptyString(item.id)) return;
    if (seen.has(item.id)) {
      pushIssue(issues, `${itemPath}.id`, `duplicates "${item.id}"`);
      return;
    }
    seen.add(item.id);
  });
}

function validateTaggable(item, path, issues) {
  validateStringArray(item.tags, `${path}.tags`, issues);
}

function validateEffect(effect, path, issues) {
  if (!isPlainObject(effect)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(effect.type)) {
    pushIssue(issues, `${path}.type`, 'must be a non-empty string');
  } else if (!EFFECT_TYPES.has(effect.type)) {
    pushIssue(issues, `${path}.type`, `unsupported effect type "${effect.type}"`);
  }

  if (!isNonEmptyString(effect.target)) {
    pushIssue(issues, `${path}.target`, 'must be a non-empty string');
  }

  if (effect.amount != null && !isNonNegativeInteger(effect.amount)) {
    pushIssue(issues, `${path}.amount`, 'must be a non-negative integer when provided');
  }

  if (effect.count != null && !isNonNegativeInteger(effect.count)) {
    pushIssue(issues, `${path}.count`, 'must be a non-negative integer when provided');
  }

  if (effect.conditionId != null && !isNonEmptyString(effect.conditionId)) {
    pushIssue(issues, `${path}.conditionId`, 'must be a non-empty string when provided');
  }
}

function validateCardLike(card, path, issues) {
  if (!isPlainObject(card)) {
    pushIssue(issues, path, 'must be an object');
    return false;
  }

  if (!isNonEmptyString(card.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(card.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonEmptyString(card.text)) pushIssue(issues, `${path}.text`, 'must be a non-empty string');

  if (!Array.isArray(card.effects)) {
    pushIssue(issues, `${path}.effects`, 'must be an array');
  } else {
    card.effects.forEach((effect, index) => validateEffect(effect, `${path}.effects[${index}]`, issues));
  }

  validateTaggable(card, path, issues);
  return true;
}

function validateDice(die, path, issues) {
  if (!isPlainObject(die)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(die.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(die.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonNegativeInteger(die.sides) || die.sides < 2) {
    pushIssue(issues, `${path}.sides`, 'must be an integer greater than or equal to 2');
  }
}

function validateConditionToken(token, path, issues) {
  if (!isPlainObject(token)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(token.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(token.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonEmptyString(token.description)) pushIssue(issues, `${path}.description`, 'must be a non-empty string');
  validateTaggable(token, path, issues);
}

function validateSkillCard(card, convictDefIds, conditionIds, path, issues) {
  if (!validateCardLike(card, path, issues)) return;

  if (!isNonEmptyString(card.role)) {
    pushIssue(issues, `${path}.role`, 'must be a non-empty string');
  } else if (!new Set(['starter', 'common']).has(card.role)) {
    pushIssue(issues, `${path}.role`, `unsupported skill role "${card.role}"`);
  }

  if (!isNonNegativeInteger(card.cost)) pushIssue(issues, `${path}.cost`, 'must be a non-negative integer');

  if (!isNonEmptyString(card.timing)) {
    pushIssue(issues, `${path}.timing`, 'must be a non-empty string');
  } else if (!SKILL_TIMINGS.has(card.timing)) {
    pushIssue(issues, `${path}.timing`, `unsupported skill timing "${card.timing}"`);
  }

  if (card.role === 'starter') {
    if (!isNonEmptyString(card.convictDefId)) {
      pushIssue(issues, `${path}.convictDefId`, 'must be a non-empty string for starter skill cards');
    } else if (!convictDefIds.has(card.convictDefId)) {
      pushIssue(issues, `${path}.convictDefId`, `references unknown convict definition "${card.convictDefId}"`);
    }
  } else if (card.convictDefId != null && !isNonEmptyString(card.convictDefId)) {
    pushIssue(issues, `${path}.convictDefId`, 'must be a non-empty string when provided');
  }

  card.effects.forEach((effect, index) => {
    if (isNonEmptyString(effect.conditionId) && !conditionIds.has(effect.conditionId)) {
      pushIssue(issues, `${path}.effects[${index}].conditionId`, `references unknown condition "${effect.conditionId}"`);
    }
  });
}

function validateConvictDef(card, skillCardIds, path, issues) {
  if (!isPlainObject(card)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(card.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(card.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonNegativeInteger(card.health)) pushIssue(issues, `${path}.health`, 'must be a non-negative integer');
  if (!isNonNegativeInteger(card.handSize)) pushIssue(issues, `${path}.handSize`, 'must be a non-negative integer');

  if (!validateStringArray(card.starterSkillCardIds, `${path}.starterSkillCardIds`, issues)) {
    return;
  }

  card.starterSkillCardIds.forEach((cardId, index) => {
    if (isNonEmptyString(cardId) && !skillCardIds.has(cardId)) {
      pushIssue(issues, `${path}.starterSkillCardIds[${index}]`, `references unknown skill card "${cardId}"`);
    }
  });

  validateTaggable(card, path, issues);
}

function validateMonsterCard(card, path, issues) {
  if (!validateCardLike(card, path, issues)) return;
  if (!isNonNegativeInteger(card.health)) pushIssue(issues, `${path}.health`, 'must be a non-negative integer');
  if (!isNonNegativeInteger(card.attack)) pushIssue(issues, `${path}.attack`, 'must be a non-negative integer');
}

function validateEventCard(card, conditionIds, path, issues) {
  if (!validateCardLike(card, path, issues)) return;
  card.effects.forEach((effect, index) => {
    if (isNonEmptyString(effect.conditionId) && !conditionIds.has(effect.conditionId)) {
      pushIssue(issues, `${path}.effects[${index}].conditionId`, `references unknown condition "${effect.conditionId}"`);
    }
  });
}

function validateItemCard(card, conditionIds, path, issues) {
  if (!validateCardLike(card, path, issues)) return;
  if (!isNonNegativeInteger(card.cost)) pushIssue(issues, `${path}.cost`, 'must be a non-negative integer');
  card.effects.forEach((effect, index) => {
    if (isNonEmptyString(effect.conditionId) && !conditionIds.has(effect.conditionId)) {
      pushIssue(issues, `${path}.effects[${index}].conditionId`, `references unknown condition "${effect.conditionId}"`);
    }
  });
}

function validateAgendaCard(card, conditionIds, path, issues) {
  if (!validateCardLike(card, path, issues)) return;
  card.effects.forEach((effect, index) => {
    if (isNonEmptyString(effect.conditionId) && !conditionIds.has(effect.conditionId)) {
      pushIssue(issues, `${path}.effects[${index}].conditionId`, `references unknown condition "${effect.conditionId}"`);
    }
  });
}

function validateMissionCard(card, conditionIds, path, issues) {
  if (!validateCardLike(card, path, issues)) return;
  card.effects.forEach((effect, index) => {
    if (isNonEmptyString(effect.conditionId) && !conditionIds.has(effect.conditionId)) {
      pushIssue(issues, `${path}.effects[${index}].conditionId`, `references unknown condition "${effect.conditionId}"`);
    }
  });
}

function validateLocationCard(card, mapTileIds, monsterCardIds, path, issues) {
  if (!isPlainObject(card)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(card.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(card.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');

  if (!validateStringArray(card.mapTileIds, `${path}.mapTileIds`, issues)) {
    return;
  }

  card.mapTileIds.forEach((mapTileId, index) => {
    if (isNonEmptyString(mapTileId) && !mapTileIds.has(mapTileId)) {
      pushIssue(issues, `${path}.mapTileIds[${index}]`, `references unknown map tile "${mapTileId}"`);
    }
  });

  if (!validateStringArray(card.monsterCardIds, `${path}.monsterCardIds`, issues)) {
    return;
  }

  card.monsterCardIds.forEach((monsterCardId, index) => {
    if (isNonEmptyString(monsterCardId) && !monsterCardIds.has(monsterCardId)) {
      pushIssue(issues, `${path}.monsterCardIds[${index}]`, `references unknown monster card "${monsterCardId}"`);
    }
  });

  validateTaggable(card, path, issues);
}

function validateMapTile(tile, path, issues) {
  if (!isPlainObject(tile)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(tile.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(tile.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonEmptyString(tile.layoutKey)) pushIssue(issues, `${path}.layoutKey`, 'must be a non-empty string');
  validateTaggable(tile, path, issues);
}

function validateDeck(deck, deckIdsByKind, path, issues) {
  if (!isPlainObject(deck)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(deck.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(deck.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');

  if (!isNonEmptyString(deck.kind)) {
    pushIssue(issues, `${path}.kind`, 'must be a non-empty string');
  } else if (!DECK_KINDS.has(deck.kind)) {
    pushIssue(issues, `${path}.kind`, `unsupported deck kind "${deck.kind}"`);
  }

  if (!validateStringArray(deck.cardIds, `${path}.cardIds`, issues)) {
    return;
  }

  const allowedIds = deckIdsByKind.get(deck.kind) || new Set();
  deck.cardIds.forEach((cardId, index) => {
    if (isNonEmptyString(cardId) && !allowedIds.has(cardId)) {
      pushIssue(issues, `${path}.cardIds[${index}]`, `references unknown card "${cardId}" for deck kind "${deck.kind}"`);
    }
  });
}

function validateScenario(scenario, refs, path, issues) {
  if (!isPlainObject(scenario)) {
    pushIssue(issues, path, 'must be an object');
    return;
  }

  if (!isNonEmptyString(scenario.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
  if (!isNonEmptyString(scenario.name)) pushIssue(issues, `${path}.name`, 'must be a non-empty string');
  if (!isNonNegativeInteger(scenario.playerSlots)) pushIssue(issues, `${path}.playerSlots`, 'must be a non-negative integer');

  if (!isPlainObject(scenario.setup)) {
    pushIssue(issues, `${path}.setup`, 'must be an object');
    return;
  }

  if (!validateStringArray(scenario.setup.convictDefIds, `${path}.setup.convictDefIds`, issues)) return;
  scenario.setup.convictDefIds.forEach((convictDefId, index) => {
    if (isNonEmptyString(convictDefId) && !refs.convictDefIds.has(convictDefId)) {
      pushIssue(issues, `${path}.setup.convictDefIds[${index}]`, `references unknown convict definition "${convictDefId}"`);
    }
  });

  if (!validateStringArray(scenario.setup.commonSkillDeckIds, `${path}.setup.commonSkillDeckIds`, issues)) return;
  scenario.setup.commonSkillDeckIds.forEach((deckId, index) => {
    if (isNonEmptyString(deckId) && !refs.commonSkillDeckIds.has(deckId)) {
      pushIssue(issues, `${path}.setup.commonSkillDeckIds[${index}]`, `references unknown common skill deck "${deckId}"`);
    }
  });

  const optionalDeckRefs = [
    ['monsterDeckId', refs.monsterDeckIds],
    ['eventDeckId', refs.eventDeckIds],
    ['itemDeckId', refs.itemDeckIds],
    ['agendaDeckId', refs.agendaDeckIds],
    ['missionDeckId', refs.missionDeckIds],
  ];

  optionalDeckRefs.forEach(([field, allowedIds]) => {
    const value = scenario.setup[field];
    if (value == null) return;
    if (!isNonEmptyString(value)) {
      pushIssue(issues, `${path}.setup.${field}`, 'must be a non-empty string when provided');
    } else if (!allowedIds.has(value)) {
      pushIssue(issues, `${path}.setup.${field}`, `references unknown ${field}`);
    }
  });

  if (scenario.setup.locationDeckId != null) {
    if (!isNonEmptyString(scenario.setup.locationDeckId)) {
      pushIssue(issues, `${path}.setup.locationDeckId`, 'must be a non-empty string when provided');
    } else if (!refs.locationDeckIds.has(scenario.setup.locationDeckId)) {
      pushIssue(issues, `${path}.setup.locationDeckId`, 'references unknown location deck');
    }
  }

  if (scenario.setup.startingLocationCardId != null) {
    if (!isNonEmptyString(scenario.setup.startingLocationCardId)) {
      pushIssue(issues, `${path}.setup.startingLocationCardId`, 'must be a non-empty string when provided');
    } else if (!refs.locationCardIds.has(scenario.setup.startingLocationCardId)) {
      pushIssue(issues, `${path}.setup.startingLocationCardId`, 'references unknown location card');
    }
  }

  if (!validateStringArray(scenario.setup.diceIds, `${path}.setup.diceIds`, issues)) return;
  scenario.setup.diceIds.forEach((dieId, index) => {
    if (isNonEmptyString(dieId) && !refs.diceIds.has(dieId)) {
      pushIssue(issues, `${path}.setup.diceIds[${index}]`, `references unknown die "${dieId}"`);
    }
  });

  if (!validateStringArray(scenario.setup.conditionTokenIds, `${path}.setup.conditionTokenIds`, issues)) return;
  scenario.setup.conditionTokenIds.forEach((tokenId, index) => {
    if (isNonEmptyString(tokenId) && !refs.conditionIds.has(tokenId)) {
      pushIssue(issues, `${path}.setup.conditionTokenIds[${index}]`, `references unknown condition token "${tokenId}"`);
    }
  });

  if (!isNonNegativeInteger(scenario.setup.startingResources)) {
    pushIssue(issues, `${path}.setup.startingResources`, 'must be a non-negative integer');
  }
}

export function validateWardensDebtContent(content) {
  const issues = [];

  if (!isPlainObject(content)) {
    return { ok: false, issues: ['root: content must be an object'] };
  }

  if (content.schemaVersion !== WARDENS_DEBT_CONTENT_SCHEMA_VERSION) {
    pushIssue(issues, 'schemaVersion', `must equal "${WARDENS_DEBT_CONTENT_SCHEMA_VERSION}"`);
  }

  if (!isNonEmptyString(content.gameId)) pushIssue(issues, 'gameId', 'must be a non-empty string');
  if (!isNonEmptyString(content.contentVersion)) pushIssue(issues, 'contentVersion', 'must be a non-empty string');

  const collectionNames = [
    'dice',
    'conditionTokens',
    'skillCards',
    'convictDefs',
    'monsterCards',
    'eventCards',
    'itemCards',
    'agendaCards',
    'missionCards',
    'locationCards',
    'mapTiles',
    'decks',
    'scenarios',
  ];

  collectionNames.forEach(name => {
    if (!Array.isArray(content[name])) pushIssue(issues, name, 'must be an array');
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  collectionNames.forEach(name => validateUniqueIds(content[name], name, issues));

  content.dice.forEach((die, index) => validateDice(die, `dice[${index}]`, issues));
  content.conditionTokens.forEach((token, index) => validateConditionToken(token, `conditionTokens[${index}]`, issues));

  const convictDefIds = new Set(content.convictDefs.map(card => card.id).filter(isNonEmptyString));
  const conditionIds = new Set(content.conditionTokens.map(token => token.id).filter(isNonEmptyString));
  const mapTileIds = new Set(content.mapTiles.map(tile => tile.id).filter(isNonEmptyString));
  const monsterCardIds = new Set(content.monsterCards.map(card => card.id).filter(isNonEmptyString));

  content.skillCards.forEach((card, index) =>
    validateSkillCard(card, convictDefIds, conditionIds, `skillCards[${index}]`, issues)
  );

  const skillCardIds = new Set(content.skillCards.map(card => card.id).filter(isNonEmptyString));
  content.convictDefs.forEach((card, index) =>
    validateConvictDef(card, skillCardIds, `convictDefs[${index}]`, issues)
  );
  content.monsterCards.forEach((card, index) => validateMonsterCard(card, `monsterCards[${index}]`, issues));
  content.eventCards.forEach((card, index) =>
    validateEventCard(card, conditionIds, `eventCards[${index}]`, issues)
  );
  content.itemCards.forEach((card, index) =>
    validateItemCard(card, conditionIds, `itemCards[${index}]`, issues)
  );
  content.agendaCards.forEach((card, index) =>
    validateAgendaCard(card, conditionIds, `agendaCards[${index}]`, issues)
  );
  content.missionCards.forEach((card, index) =>
    validateMissionCard(card, conditionIds, `missionCards[${index}]`, issues)
  );
  content.mapTiles.forEach((tile, index) => validateMapTile(tile, `mapTiles[${index}]`, issues));
  content.locationCards.forEach((card, index) =>
    validateLocationCard(card, mapTileIds, monsterCardIds, `locationCards[${index}]`, issues)
  );

  const deckIdsByKind = new Map([
    ['common-skill', new Set(content.skillCards.filter(card => card.role === 'common').map(card => card.id))],
    ['monster', monsterCardIds],
    ['event', new Set(content.eventCards.map(card => card.id).filter(isNonEmptyString))],
    ['item', new Set(content.itemCards.map(card => card.id).filter(isNonEmptyString))],
    ['location', new Set(content.locationCards.map(card => card.id).filter(isNonEmptyString))],
    ['agenda', new Set(content.agendaCards.map(card => card.id).filter(isNonEmptyString))],
    ['mission', new Set(content.missionCards.map(card => card.id).filter(isNonEmptyString))],
  ]);

  content.decks.forEach((deck, index) => validateDeck(deck, deckIdsByKind, `decks[${index}]`, issues));

  const refs = {
    convictDefIds,
    commonSkillDeckIds: new Set(content.decks.filter(deck => deck.kind === 'common-skill').map(deck => deck.id)),
    monsterDeckIds: new Set(content.decks.filter(deck => deck.kind === 'monster').map(deck => deck.id)),
    eventDeckIds: new Set(content.decks.filter(deck => deck.kind === 'event').map(deck => deck.id)),
    itemDeckIds: new Set(content.decks.filter(deck => deck.kind === 'item').map(deck => deck.id)),
    locationDeckIds: new Set(content.decks.filter(deck => deck.kind === 'location').map(deck => deck.id)),
    agendaDeckIds: new Set(content.decks.filter(deck => deck.kind === 'agenda').map(deck => deck.id)),
    missionDeckIds: new Set(content.decks.filter(deck => deck.kind === 'mission').map(deck => deck.id)),
    locationCardIds: new Set(content.locationCards.map(card => card.id).filter(isNonEmptyString)),
    diceIds: new Set(content.dice.map(die => die.id).filter(isNonEmptyString)),
    conditionIds,
  };

  content.scenarios.forEach((scenario, index) =>
    validateScenario(scenario, refs, `scenarios[${index}]`, issues)
  );

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function indexWardensDebtContent(content) {
  return {
    diceById: new Map(content.dice.map(item => [item.id, item])),
    conditionTokensById: new Map(content.conditionTokens.map(item => [item.id, item])),
    skillCardsById: new Map(content.skillCards.map(item => [item.id, item])),
    convictDefsById: new Map(content.convictDefs.map(item => [item.id, item])),
    monsterCardsById: new Map(content.monsterCards.map(item => [item.id, item])),
    eventCardsById: new Map(content.eventCards.map(item => [item.id, item])),
    itemCardsById: new Map(content.itemCards.map(item => [item.id, item])),
    agendaCardsById: new Map(content.agendaCards.map(item => [item.id, item])),
    missionCardsById: new Map(content.missionCards.map(item => [item.id, item])),
    locationCardsById: new Map(content.locationCards.map(item => [item.id, item])),
    mapTilesById: new Map(content.mapTiles.map(item => [item.id, item])),
    decksById: new Map(content.decks.map(item => [item.id, item])),
    scenariosById: new Map(content.scenarios.map(item => [item.id, item])),
  };
}

function buildDeckState(deck) {
  return {
    deckId: deck.id,
    drawPile: [...deck.cardIds],
    discardPile: [],
  };
}

function buildEmptyActiveCards() {
  return {
    monster: [],
    event: [],
    item: [],
    location: [],
    agenda: [],
    mission: [],
    fastSkills: [],
    slowSkills: [],
  };
}

function validateQueuedSkillCards(queue, path, issues, contentIndex, convictCount) {
  if (!Array.isArray(queue)) {
    pushIssue(issues, path, 'must be an array');
    return;
  }

  queue.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isPlainObject(entry)) {
      pushIssue(issues, entryPath, 'must be an object');
      return;
    }
    if (!isNonNegativeInteger(entry.convictIndex) || entry.convictIndex >= convictCount) {
      pushIssue(issues, `${entryPath}.convictIndex`, 'must reference a valid convict index');
    }
    if (!isNonEmptyString(entry.cardId)) {
      pushIssue(issues, `${entryPath}.cardId`, 'must be a non-empty string');
    } else if (contentIndex && !contentIndex.skillCardsById.has(entry.cardId)) {
      pushIssue(issues, `${entryPath}.cardId`, `references unknown skill card "${entry.cardId}"`);
    }
    if (typeof entry.resolved !== 'boolean') {
      pushIssue(issues, `${entryPath}.resolved`, 'must be a boolean');
    }
  });
}

export function createWardensDebtGameState(content, scenarioId) {
  const index = indexWardensDebtContent(content);
  const scenario = index.scenariosById.get(scenarioId);

  if (!scenario) {
    throw new Error(`Unknown Wardens Debt scenario "${scenarioId}"`);
  }

  const convicts = scenario.setup.convictDefIds.map((convictDefId, convictIndex) => {
    const convictDef = index.convictDefsById.get(convictDefId);
    const starterSkillCardIds = convictDef ? [...convictDef.starterSkillCardIds] : [];

    return {
      id: `convict-${convictIndex + 1}`,
      name: convictDef?.name || `Convict ${convictIndex + 1}`,
      convictDefId,
      health: convictDef?.health ?? 0,
      maxHealth: convictDef?.health ?? 0,
      handSize: convictDef?.handSize ?? 0,
      starterSkillCardIds,
      hand: [],
      drawPile: [...starterSkillCardIds],
      discardPile: [],
      banished: [],
      resources: scenario.setup.startingResources,
      guards: 0,
      conditions: [],
    };
  });

  const activeLocationCard = scenario.setup.startingLocationCardId
    ? index.locationCardsById.get(scenario.setup.startingLocationCardId)
    : null;
  const activeMapTile = activeLocationCard?.mapTileIds?.length
    ? wardensDebtMapTileForId(activeLocationCard.mapTileIds[0])
    : null;
  const mapTileId = activeLocationCard?.mapTileIds?.[0] || null;

  const enemies = (activeLocationCard?.monsterCardIds || []).map((monsterCardId, enemyIndex) => {
    const monsterCard = index.monsterCardsById.get(monsterCardId);
    return {
      instanceId: `enemy-${enemyIndex + 1}`,
      monsterCardId,
      name: monsterCard?.name || monsterCardId,
      currentHealth: monsterCard?.health ?? 0,
      maxHealth: monsterCard?.health ?? 0,
      attack: monsterCard?.attack ?? 0,
      conditions: [],
      zone: 'board',
    };
  });

  return {
    stateVersion: WARDENS_DEBT_STATE_VERSION,
    contentVersion: content.contentVersion,
    scenarioId: scenario.id,
    turn: {
      round: 1,
      activeSide: 'convicts',
      phase: 'start-round',
    },
    dicePool: scenario.setup.diceIds.map(dieId => {
      const die = index.diceById.get(dieId);
      return {
        dieId,
        sides: die?.sides ?? 0,
        currentValue: null,
      };
    }),
    conditionSupply: [...scenario.setup.conditionTokenIds],
    convicts,
    enemies,
    decks: {
      commonSkillDecks: scenario.setup.commonSkillDeckIds
        .map(deckId => index.decksById.get(deckId))
        .filter(Boolean)
        .map(buildDeckState),
      monsterDeck: scenario.setup.monsterDeckId ? buildDeckState(index.decksById.get(scenario.setup.monsterDeckId)) : null,
      eventDeck: scenario.setup.eventDeckId ? buildDeckState(index.decksById.get(scenario.setup.eventDeckId)) : null,
      itemDeck: scenario.setup.itemDeckId ? buildDeckState(index.decksById.get(scenario.setup.itemDeckId)) : null,
      locationDeck: scenario.setup.locationDeckId ? buildDeckState(index.decksById.get(scenario.setup.locationDeckId)) : null,
      agendaDeck: scenario.setup.agendaDeckId ? buildDeckState(index.decksById.get(scenario.setup.agendaDeckId)) : null,
      missionDeck: scenario.setup.missionDeckId ? buildDeckState(index.decksById.get(scenario.setup.missionDeckId)) : null,
    },
    activeCards: buildEmptyActiveCards(),
    board: {
      locationCardId: activeLocationCard?.id || null,
      mapTileIds: activeLocationCard ? [...activeLocationCard.mapTileIds] : [],
      mapTiles: mapTileId
        ? [{ id: mapTileId, x: activeMapTile?.x ?? 240, y: activeMapTile?.y ?? 80, angle: 0, locked: false }]
        : [],
      figurePositions: Object.fromEntries([
        ...convicts.map((convict, index) => {
          const point = defaultWardensDebtPoint(activeMapTile, index, 'convict', convicts.length);
          return [convict.id, activeMapTile ? { x: (activeMapTile.x || 0) + point.x, y: (activeMapTile.y || 0) + point.y } : point];
        }),
        ...enemies.map((enemy, index) => {
          const point = defaultWardensDebtPoint(activeMapTile, index, 'enemy', enemies.length);
          return [enemy.instanceId, activeMapTile ? { x: (activeMapTile.x || 0) + point.x, y: (activeMapTile.y || 0) + point.y } : point];
        }),
      ]),
    },
    zones: {
      board: [...enemies.map(enemy => enemy.instanceId)],
      reserve: [],
      discard: [],
      banished: [],
    },
    log: [],
  };
}

export function validateWardensDebtGameState(gameState, contentIndex) {
  const issues = [];

  if (!isPlainObject(gameState)) {
    return { ok: false, issues: ['root: game state must be an object'] };
  }

  if (gameState.stateVersion !== WARDENS_DEBT_STATE_VERSION) {
    pushIssue(issues, 'stateVersion', `must equal "${WARDENS_DEBT_STATE_VERSION}"`);
  }

  if (!isNonEmptyString(gameState.contentVersion)) pushIssue(issues, 'contentVersion', 'must be a non-empty string');
  if (!isNonEmptyString(gameState.scenarioId)) pushIssue(issues, 'scenarioId', 'must be a non-empty string');

  if (!isPlainObject(gameState.turn)) {
    pushIssue(issues, 'turn', 'must be an object');
  } else {
    if (!isNonNegativeInteger(gameState.turn.round)) pushIssue(issues, 'turn.round', 'must be a non-negative integer');
    if (!isNonEmptyString(gameState.turn.activeSide) || !TURN_SIDES.has(gameState.turn.activeSide)) {
      pushIssue(issues, 'turn.activeSide', 'must be a supported side');
    }
    if (!isNonEmptyString(gameState.turn.phase) || !TURN_PHASES.has(gameState.turn.phase)) {
      pushIssue(issues, 'turn.phase', 'must be a supported phase');
    }
  }

  if (!Array.isArray(gameState.dicePool)) pushIssue(issues, 'dicePool', 'must be an array');
  if (!Array.isArray(gameState.conditionSupply)) pushIssue(issues, 'conditionSupply', 'must be an array');
  if (!Array.isArray(gameState.convicts)) pushIssue(issues, 'convicts', 'must be an array');
  if (!Array.isArray(gameState.enemies)) pushIssue(issues, 'enemies', 'must be an array');
  if (!isPlainObject(gameState.decks)) pushIssue(issues, 'decks', 'must be an object');
  if (!isPlainObject(gameState.activeCards)) pushIssue(issues, 'activeCards', 'must be an object');
  if (!isPlainObject(gameState.board)) pushIssue(issues, 'board', 'must be an object');
  if (!isPlainObject(gameState.zones)) pushIssue(issues, 'zones', 'must be an object');
  if (!Array.isArray(gameState.log)) pushIssue(issues, 'log', 'must be an array');

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  gameState.dicePool.forEach((dieState, index) => {
    const path = `dicePool[${index}]`;
    if (!isPlainObject(dieState)) {
      pushIssue(issues, path, 'must be an object');
      return;
    }
    if (!isNonEmptyString(dieState.dieId)) pushIssue(issues, `${path}.dieId`, 'must be a non-empty string');
    else if (contentIndex && !contentIndex.diceById.has(dieState.dieId)) pushIssue(issues, `${path}.dieId`, `references unknown die "${dieState.dieId}"`);
    if (!isNonNegativeInteger(dieState.sides)) pushIssue(issues, `${path}.sides`, 'must be a non-negative integer');
    if (dieState.currentValue != null && !isNonNegativeInteger(dieState.currentValue)) {
      pushIssue(issues, `${path}.currentValue`, 'must be a non-negative integer when provided');
    } else if (isNonNegativeInteger(dieState.currentValue) && dieState.currentValue > dieState.sides) {
      pushIssue(issues, `${path}.currentValue`, 'must be less than or equal to the number of sides');
    } else if (isNonNegativeInteger(dieState.currentValue) && dieState.currentValue < 1) {
      pushIssue(issues, `${path}.currentValue`, 'must be greater than or equal to 1 when provided');
    }
  });

  gameState.conditionSupply.forEach((tokenId, index) => {
    if (!isNonEmptyString(tokenId)) {
      pushIssue(issues, `conditionSupply[${index}]`, 'must be a non-empty string');
    } else if (contentIndex && !contentIndex.conditionTokensById.has(tokenId)) {
      pushIssue(issues, `conditionSupply[${index}]`, `references unknown condition token "${tokenId}"`);
    }
  });

  gameState.convicts.forEach((convict, index) => {
    const path = `convicts[${index}]`;
    if (!isPlainObject(convict)) {
      pushIssue(issues, path, 'must be an object');
      return;
    }
    if (!isNonEmptyString(convict.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
    if (!isNonEmptyString(convict.convictDefId)) pushIssue(issues, `${path}.convictDefId`, 'must be a non-empty string');
    else if (contentIndex && !contentIndex.convictDefsById.has(convict.convictDefId)) pushIssue(issues, `${path}.convictDefId`, `references unknown convict definition "${convict.convictDefId}"`);
    ['starterSkillCardIds', 'drawPile', 'conditions'].forEach(key => {
      if (!validateStringArray(convict[key], `${path}.${key}`, issues)) return;
      if (contentIndex && ['starterSkillCardIds', 'drawPile'].includes(key)) {
        convict[key].forEach((cardId, cardIndex) => {
          if (isNonEmptyString(cardId) && !contentIndex.skillCardsById.has(cardId)) {
            pushIssue(issues, `${path}.${key}[${cardIndex}]`, `references unknown skill card "${cardId}"`);
          }
        });
      }
      if (contentIndex && key === 'conditions') {
        convict[key].forEach((conditionId, conditionIndex) => {
          if (isNonEmptyString(conditionId) && !contentIndex.conditionTokensById.has(conditionId)) {
            pushIssue(issues, `${path}.${key}[${conditionIndex}]`, `references unknown condition token "${conditionId}"`);
          }
        });
      }
    });

    ['hand', 'discardPile', 'banished'].forEach(key => {
      if (!validateStringArray(convict[key], `${path}.${key}`, issues)) return;
      convict[key].forEach((cardId, cardIndex) => {
        if (!isNonEmptyString(cardId)) return;
        const isSkillCard = contentIndex?.skillCardsById.has(cardId);
        if (!isSkillCard) {
          pushIssue(issues, `${path}.${key}[${cardIndex}]`, `references unknown skill card "${cardId}"`);
        }
      });
    });
  });

  const enemyIds = new Set();
  gameState.enemies.forEach((enemy, index) => {
    const path = `enemies[${index}]`;
    if (!isPlainObject(enemy)) {
      pushIssue(issues, path, 'must be an object');
      return;
    }
    if (!isNonEmptyString(enemy.instanceId)) pushIssue(issues, `${path}.instanceId`, 'must be a non-empty string');
    else enemyIds.add(enemy.instanceId);
    if (!isNonEmptyString(enemy.monsterCardId)) pushIssue(issues, `${path}.monsterCardId`, 'must be a non-empty string');
    else if (contentIndex && !contentIndex.monsterCardsById.has(enemy.monsterCardId)) pushIssue(issues, `${path}.monsterCardId`, `references unknown monster card "${enemy.monsterCardId}"`);
    if (!validateStringArray(enemy.conditions, `${path}.conditions`, issues)) return;
  });

  if (!Array.isArray(gameState.decks.commonSkillDecks)) {
    pushIssue(issues, 'decks.commonSkillDecks', 'must be an array');
  }

  const activeCardGroups = [
    ['monster', contentIndex?.monsterCardsById],
    ['event', contentIndex?.eventCardsById],
    ['item', contentIndex?.itemCardsById],
    ['location', contentIndex?.locationCardsById],
    ['agenda', contentIndex?.agendaCardsById],
    ['mission', contentIndex?.missionCardsById],
  ];

  activeCardGroups.forEach(([groupName, indexMap]) => {
    if (!validateStringArray(gameState.activeCards[groupName], `activeCards.${groupName}`, issues)) return;
    gameState.activeCards[groupName].forEach((cardId, cardIndex) => {
      if (isNonEmptyString(cardId) && indexMap && !indexMap.has(cardId)) {
        pushIssue(issues, `activeCards.${groupName}[${cardIndex}]`, `references unknown ${groupName} card "${cardId}"`);
      }
    });
  });

  validateQueuedSkillCards(gameState.activeCards.fastSkills, 'activeCards.fastSkills', issues, contentIndex, gameState.convicts.length);
  validateQueuedSkillCards(gameState.activeCards.slowSkills, 'activeCards.slowSkills', issues, contentIndex, gameState.convicts.length);

  if (!isNonEmptyString(gameState.board.locationCardId) && gameState.board.locationCardId !== null) {
    pushIssue(issues, 'board.locationCardId', 'must be a non-empty string or null');
  }

  if (!validateStringArray(gameState.board.mapTileIds, 'board.mapTileIds', issues)) {
    return { ok: false, issues };
  }

  if (!validateMapTiles(gameState.board.mapTiles, 'board.mapTiles', issues, contentIndex)) {
    return { ok: false, issues };
  }

  if (gameState.board.figurePositions != null && !validatePointMap(gameState.board.figurePositions, 'board.figurePositions', issues)) {
    return { ok: false, issues };
  }

  gameState.board.mapTileIds.forEach((mapTileId, index) => {
    if (isNonEmptyString(mapTileId) && contentIndex && !contentIndex.mapTilesById.has(mapTileId)) {
      pushIssue(issues, `board.mapTileIds[${index}]`, `references unknown map tile "${mapTileId}"`);
    }
  });

  ZONE_NAMES.forEach(zoneName => {
    if (!validateStringArray(gameState.zones[zoneName], `zones.${zoneName}`, issues)) return;
    gameState.zones[zoneName].forEach((instanceId, index) => {
      if (isNonEmptyString(instanceId) && !enemyIds.has(instanceId)) {
        pushIssue(issues, `zones.${zoneName}[${index}]`, `references unknown enemy instance "${instanceId}"`);
      }
    });
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function cloneWardensDebtGameState(gameState) {
  return clone(gameState);
}
