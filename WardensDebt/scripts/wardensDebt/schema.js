export const WARDENS_DEBT_CONTENT_SCHEMA_VERSION = '0.5.0';
import { wardensDebtMapTileForId } from './mapTiles.js';

export const WARDENS_DEBT_STATE_VERSION = '0.2.0';

export const PHASE_CONFIG = {
  'upkeep': {
    subphases: null,
    notification: { title: 'Upkeep', body: 'Doom increases. Check Mission and Agenda card effects. Special enemy and convict upkeep effects trigger.' }
  },
  'events': {
    subphases: null,
    notification: { title: 'Events', body: 'Draw 1 Event card per convict. Resolve event effects — enemies activate, tests may be triggered.' }
  },
  'tactics': {
    subphases: ['select-tactic', 'select-skill-cards'],
    notification: { title: 'Tactics', body: 'Select a tactic and skill cards for each convict.' },
    subphaseNotifications: {
      'select-tactic': { title: 'Select Tactic', body: 'Choose and resolve your tactic for this round.' },
      'select-skill-cards': { title: 'Select Skill Cards', body: 'Select skill cards from your hand to queue for this round.' }
    }
  },
  'fast-skills': {
    subphases: null,
    notification: { title: 'Fast Skills', body: 'Play fast skill cards from the active area. Resolve effects and tests. Hand cards can modify tests.' }
  },
  'enemy-phase': {
    subphases: null,
    notification: { title: 'Enemy Phase', body: 'Perform enemy actions as shown on activated Enemy cards.' }
  },
  'slow-skills': {
    subphases: null,
    notification: { title: 'Slow Skills', body: 'Play slow skill cards from the active area. Resolve effects and tests. Hand cards can modify tests.' }
  },
  'end-round': {
    subphases: null,
    notification: { title: 'End of Round', body: 'Resolve end-of-round effects on cards. Prepare for the next round.' }
  },
};

const DECK_KINDS = new Set(['common-skill', 'enemy', 'event', 'item', 'location', 'agenda', 'mission']);
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
  'upkeep',
  'events',
  'tactics',
  'fast-skills',
  'enemy-phase',
  'slow-skills',
  'end-round',
]);
const TURN_SUBPHASES = new Set([
  'select-tactic',
  'select-skill-cards',
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
    else if (contentIndex && !contentIndex.mapTileDefsById.has(tile.id)) pushIssue(issues, `${tilePath}.id`, `references unknown map tile "${tile.id}"`);
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

function validateConvictDef(card, skillDefIds, path, issues) {
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
    if (isNonEmptyString(cardId) && !skillDefIds.has(cardId)) {
      pushIssue(issues, `${path}.starterSkillCardIds[${index}]`, `references unknown skill card "${cardId}"`);
    }
  });

  validateTaggable(card, path, issues);
}

function validateEnemyCard(card, path, issues) {
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

function validateLocationCard(card, mapTileIds, enemyCardIds, path, issues) {
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

  if (!validateStringArray(card.enemyCardIds, `${path}.enemyCardIds`, issues)) {
    return;
  }

  card.enemyCardIds.forEach((enemyCardId, index) => {
    if (isNonEmptyString(enemyCardId) && !enemyCardIds.has(enemyCardId)) {
      pushIssue(issues, `${path}.enemyCardIds[${index}]`, `references unknown enemy card "${enemyCardId}"`);
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
    ['enemyDeckId', refs.enemyDeckIds],
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

  if (!validateStringArray(scenario.setup.diceDefIds, `${path}.setup.diceDefIds`, issues)) return;
  scenario.setup.diceDefIds.forEach((dieId, index) => {
    if (isNonEmptyString(dieId) && !refs.diceIds.has(dieId)) {
      pushIssue(issues, `${path}.setup.diceDefIds[${index}]`, `references unknown die "${dieId}"`);
    }
  });

  if (!validateStringArray(scenario.setup.conditionDefIds, `${path}.setup.conditionDefIds`, issues)) return;
  scenario.setup.conditionDefIds.forEach((tokenId, index) => {
    if (isNonEmptyString(tokenId) && !refs.conditionIds.has(tokenId)) {
      pushIssue(issues, `${path}.setup.conditionDefIds[${index}]`, `references unknown condition token "${tokenId}"`);
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
    'diceDefs',
    'conditionDefs',
    'skillDefs',
    'convictDefs',
    'enemyDefs',
    'eventDefs',
    'itemDefs',
    'agendaDefs',
    'missionDefs',
    'locationDefs',
    'mapTileDefs',
    'deckDefs',
    'scenarioDefs',
  ];

  collectionNames.forEach(name => {
    if (!Array.isArray(content[name])) pushIssue(issues, name, 'must be an array');
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  collectionNames.forEach(name => validateUniqueIds(content[name], name, issues));

  content.diceDefs.forEach((die, index) => validateDice(die, `dice[${index}]`, issues));
  content.conditionDefs.forEach((token, index) => validateConditionToken(token, `conditionTokens[${index}]`, issues));

  const convictDefIds = new Set(content.convictDefs.map(card => card.id).filter(isNonEmptyString));
  const conditionIds = new Set(content.conditionDefs.map(token => token.id).filter(isNonEmptyString));
  const mapTileIds = new Set(content.mapTileDefs.map(tile => tile.id).filter(isNonEmptyString));
  const enemyDefIds = new Set(content.enemyDefs.map(card => card.id).filter(isNonEmptyString));

  content.skillDefs.forEach((card, index) =>
    validateSkillCard(card, convictDefIds, conditionIds, `skillCards[${index}]`, issues)
  );

  const skillDefIds = new Set(content.skillDefs.map(card => card.id).filter(isNonEmptyString));
  content.convictDefs.forEach((card, index) =>
    validateConvictDef(card, skillDefIds, `convictDefs[${index}]`, issues)
  );
  content.enemyDefs.forEach((card, index) => validateEnemyCard(card, `enemyDefs[${index}]`, issues));
  content.eventDefs.forEach((card, index) =>
    validateEventCard(card, conditionIds, `eventCards[${index}]`, issues)
  );
  content.itemDefs.forEach((card, index) =>
    validateItemCard(card, conditionIds, `itemCards[${index}]`, issues)
  );
  content.agendaDefs.forEach((card, index) =>
    validateAgendaCard(card, conditionIds, `agendaCards[${index}]`, issues)
  );
  content.missionDefs.forEach((card, index) =>
    validateMissionCard(card, conditionIds, `missionCards[${index}]`, issues)
  );
  content.mapTileDefs.forEach((tile, index) => validateMapTile(tile, `mapTiles[${index}]`, issues));
  content.locationDefs.forEach((card, index) =>
    validateLocationCard(card, mapTileIds, enemyDefIds, `locationCards[${index}]`, issues)
  );

  const deckIdsByKind = new Map([
    ['common-skill', new Set(content.skillDefs.filter(card => card.role === 'common').map(card => card.id))],
    ['enemy', enemyDefIds],
    ['event', new Set(content.eventDefs.map(card => card.id).filter(isNonEmptyString))],
    ['item', new Set(content.itemDefs.map(card => card.id).filter(isNonEmptyString))],
    ['location', new Set(content.locationDefs.map(card => card.id).filter(isNonEmptyString))],
    ['agenda', new Set(content.agendaDefs.map(card => card.id).filter(isNonEmptyString))],
    ['mission', new Set(content.missionDefs.map(card => card.id).filter(isNonEmptyString))],
  ]);

  content.deckDefs.forEach((deck, index) => validateDeck(deck, deckIdsByKind, `decks[${index}]`, issues));

  const refs = {
    convictDefIds,
    commonSkillDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'common-skill').map(deck => deck.id)),
    enemyDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'enemy').map(deck => deck.id)),
    eventDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'event').map(deck => deck.id)),
    itemDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'item').map(deck => deck.id)),
    locationDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'location').map(deck => deck.id)),
    agendaDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'agenda').map(deck => deck.id)),
    missionDeckIds: new Set(content.deckDefs.filter(deck => deck.kind === 'mission').map(deck => deck.id)),
    locationCardIds: new Set(content.locationDefs.map(card => card.id).filter(isNonEmptyString)),
    diceIds: new Set(content.diceDefs.map(die => die.id).filter(isNonEmptyString)),
    conditionIds,
  };

  content.scenarioDefs.forEach((scenario, index) =>
    validateScenario(scenario, refs, `scenarios[${index}]`, issues)
  );

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function indexWardensDebtContent(content) {
  return {
    diceDefsById: new Map(content.diceDefs.map(item => [item.id, item])),
    conditionDefsById: new Map(content.conditionDefs.map(item => [item.id, item])),
    skillDefsById: new Map(content.skillDefs.map(item => [item.id, item])),
    convictDefsById: new Map(content.convictDefs.map(item => [item.id, item])),
    enemyDefsById: new Map(content.enemyDefs.map(item => [item.id, item])),
    eventDefsById: new Map(content.eventDefs.map(item => [item.id, item])),
    itemDefsById: new Map(content.itemDefs.map(item => [item.id, item])),
    agendaDefsById: new Map(content.agendaDefs.map(item => [item.id, item])),
    missionDefsById: new Map(content.missionDefs.map(item => [item.id, item])),
    locationDefsById: new Map(content.locationDefs.map(item => [item.id, item])),
    mapTileDefsById: new Map(content.mapTileDefs.map(item => [item.id, item])),
    deckDefsById: new Map(content.deckDefs.map(item => [item.id, item])),
    scenarioDefsById: new Map(content.scenarioDefs.map(item => [item.id, item])),
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
    enemy: [],
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
    } else if (contentIndex && !contentIndex.skillDefsById.has(entry.cardId)) {
      pushIssue(issues, `${entryPath}.cardId`, `references unknown skill card "${entry.cardId}"`);
    }
    if (typeof entry.resolved !== 'boolean') {
      pushIssue(issues, `${entryPath}.resolved`, 'must be a boolean');
    }
  });
}

export function createWardensDebtGameState(content, scenarioId) {
  const index = indexWardensDebtContent(content);
  const scenario = index.scenarioDefsById.get(scenarioId);

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
      currentHealth: convictDef?.health ?? 0,
      maxHealth: convictDef?.health ?? 0,
      handSize: convictDef?.handSize ?? 0,
      starterSkillCardIds,
      hand: [...starterSkillCardIds],
      drawPile: [],
      discardPile: [],
      banished: [],
      resources: scenario.setup.startingResources,
      guards: 0,
      conditions: [],
    };
  });

  const activeLocationCard = scenario.setup.startingLocationCardId
    ? index.locationDefsById.get(scenario.setup.startingLocationCardId)
    : null;
  const activeMapTile = activeLocationCard?.mapTileIds?.length
    ? wardensDebtMapTileForId(activeLocationCard.mapTileIds[0])
    : null;
  const mapTileId = activeLocationCard?.mapTileIds?.[0] || null;

  const enemies = (activeLocationCard?.enemyCardIds || []).map((enemyCardId, enemyIndex) => {
    const enemyCard = index.enemyDefsById.get(enemyCardId);
    return {
      id: `enemy-${enemyIndex + 1}`,
      enemyDefId: enemyCardId,
      name: enemyCard?.name || enemyCardId,
      currentHealth: enemyCard?.health ?? 0,
      maxHealth: enemyCard?.health ?? 0,
      attack: enemyCard?.attack ?? 0,
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
      phase: 'upkeep',
      convictSubphases: convicts.map(() => null),
      phaseComplete: convicts.map(() => false),
    },
    dicePool: scenario.setup.diceDefIds.map(dieId => {
      const die = index.diceDefsById.get(dieId);
      return {
        dieId,
        sides: die?.sides ?? 0,
        currentValue: null,
      };
    }),
    conditionSupply: [...scenario.setup.conditionDefIds],
    convicts,
    enemies,
    decks: {
      commonSkillDecks: scenario.setup.commonSkillDeckIds
        .map(deckId => index.deckDefsById.get(deckId))
        .filter(Boolean)
        .map(buildDeckState),
      enemyDeck: (() => {
        const deck = scenario.setup.enemyDeckId ? index.deckDefsById.get(scenario.setup.enemyDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
      eventDeck: (() => {
        const deck = scenario.setup.eventDeckId ? index.deckDefsById.get(scenario.setup.eventDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
      itemDeck: (() => {
        const deck = scenario.setup.itemDeckId ? index.deckDefsById.get(scenario.setup.itemDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
      locationDeck: (() => {
        const deck = scenario.setup.locationDeckId ? index.deckDefsById.get(scenario.setup.locationDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
      agendaDeck: (() => {
        const deck = scenario.setup.agendaDeckId ? index.deckDefsById.get(scenario.setup.agendaDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
      missionDeck: (() => {
        const deck = scenario.setup.missionDeckId ? index.deckDefsById.get(scenario.setup.missionDeckId) : null;
        return deck ? buildDeckState(deck) : null;
      })(),
    },
    activeCards: buildEmptyActiveCards(),
    counters: { doom: 0, debt: 0 },
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
          return [enemy.id, activeMapTile ? { x: (activeMapTile.x || 0) + point.x, y: (activeMapTile.y || 0) + point.y } : point];
        }),
      ]),
    },
    zones: {
      board: [...enemies.map(enemy => enemy.id)],
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
    if (!Array.isArray(gameState.turn.convictSubphases)) {
      pushIssue(issues, 'turn.convictSubphases', 'must be an array');
    } else {
      gameState.turn.convictSubphases.forEach((subphase, index) => {
        if (subphase !== null && (!isNonEmptyString(subphase) || !TURN_SUBPHASES.has(subphase))) {
          pushIssue(issues, `turn.convictSubphases[${index}]`, 'must be null or a supported subphase');
        }
      });
      if (gameState.turn.convictSubphases.length !== (gameState.convicts?.length ?? 0)) {
        pushIssue(issues, 'turn.convictSubphases', `must have ${gameState.convicts?.length ?? 0} entries (one per convict)`);
      }
    }
    if (!Array.isArray(gameState.turn.phaseComplete)) {
      pushIssue(issues, 'turn.phaseComplete', 'must be an array');
    } else {
      gameState.turn.phaseComplete.forEach((isComplete, index) => {
        if (typeof isComplete !== 'boolean') {
          pushIssue(issues, `turn.phaseComplete[${index}]`, 'must be a boolean');
        }
      });
      if (gameState.turn.phaseComplete.length !== (gameState.convicts?.length ?? 0)) {
        pushIssue(issues, 'turn.phaseComplete', `must have ${gameState.convicts?.length ?? 0} entries (one per convict)`);
      }
    }
  }

  if (!Array.isArray(gameState.dicePool)) pushIssue(issues, 'dicePool', 'must be an array');
  if (!Array.isArray(gameState.conditionSupply)) pushIssue(issues, 'conditionSupply', 'must be an array');
  if (!Array.isArray(gameState.convicts)) pushIssue(issues, 'convicts', 'must be an array');
  if (!Array.isArray(gameState.enemies)) pushIssue(issues, 'enemies', 'must be an array');
  if (!isPlainObject(gameState.decks)) pushIssue(issues, 'decks', 'must be an object');
  if (!isPlainObject(gameState.activeCards)) pushIssue(issues, 'activeCards', 'must be an object');
  if (!isPlainObject(gameState.counters)) pushIssue(issues, 'counters', 'must be an object');
  else {
    if (!isNonNegativeInteger(gameState.counters.doom)) pushIssue(issues, 'counters.doom', 'must be a non-negative integer');
    if (!isNonNegativeInteger(gameState.counters.debt)) pushIssue(issues, 'counters.debt', 'must be a non-negative integer');
  }
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
    else if (contentIndex && !contentIndex.diceDefsById.has(dieState.dieId)) pushIssue(issues, `${path}.dieId`, `references unknown die "${dieState.dieId}"`);
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
    } else if (contentIndex && !contentIndex.conditionDefsById.has(tokenId)) {
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
          if (isNonEmptyString(cardId) && !contentIndex.skillDefsById.has(cardId)) {
            pushIssue(issues, `${path}.${key}[${cardIndex}]`, `references unknown skill card "${cardId}"`);
          }
        });
      }
      if (contentIndex && key === 'conditions') {
        convict[key].forEach((conditionId, conditionIndex) => {
          if (isNonEmptyString(conditionId) && !contentIndex.conditionDefsById.has(conditionId)) {
            pushIssue(issues, `${path}.${key}[${conditionIndex}]`, `references unknown condition token "${conditionId}"`);
          }
        });
      }
    });

    ['hand', 'discardPile', 'banished'].forEach(key => {
      if (!validateStringArray(convict[key], `${path}.${key}`, issues)) return;
      convict[key].forEach((cardId, cardIndex) => {
        if (!isNonEmptyString(cardId)) return;
        const isSkillCard = contentIndex?.skillDefsById.has(cardId);
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
    if (!isNonEmptyString(enemy.id)) pushIssue(issues, `${path}.id`, 'must be a non-empty string');
    else enemyIds.add(enemy.id);
    if (!isNonEmptyString(enemy.enemyDefId)) pushIssue(issues, `${path}.enemyDefId`, 'must be a non-empty string');
    else if (contentIndex && !contentIndex.enemyDefsById.has(enemy.enemyDefId)) pushIssue(issues, `${path}.enemyDefId`, `references unknown enemy definition "${enemy.enemyDefId}"`);
    if (!validateStringArray(enemy.conditions, `${path}.conditions`, issues)) return;
  });

  if (!Array.isArray(gameState.decks.commonSkillDecks)) {
    pushIssue(issues, 'decks.commonSkillDecks', 'must be an array');
  }

  const activeCardGroups = [
    ['enemy', contentIndex?.enemyDefsById],
    ['event', contentIndex?.eventDefsById],
    ['item', contentIndex?.itemDefsById],
    ['location', contentIndex?.locationDefsById],
    ['agenda', contentIndex?.agendaDefsById],
    ['mission', contentIndex?.missionDefsById],
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
    if (isNonEmptyString(mapTileId) && contentIndex && !contentIndex.mapTileDefsById.has(mapTileId)) {
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
