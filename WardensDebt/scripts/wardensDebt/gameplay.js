import {
  cloneWardensDebtGameState,
  validateWardensDebtGameState,
  PHASE_CONFIG,
} from './schema.js';

const MAX_PLAYER_HAND_SIZE = 8;
export const WARDENS_DEBT_PHASE_SEQUENCE = [
  'upkeep',
  'events',
  'tactics',
  'fast-skills',
  'enemy-phase',
  'slow-skills',
  'end-round',
];

function defaultRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validateNextState(nextState, contentIndex, actionLabel) {
  const validation = validateWardensDebtGameState(nextState, contentIndex);
  if (!validation.ok) {
    throw new Error(`Wardens Debt game state validation failed after ${actionLabel}:\n${validation.issues.join('\n')}`);
  }
}

function activeSideForPhase(phase) {
  return phase === 'enemy-phase' ? 'enemies' : 'convicts';
}

function resolveDeckState(decksState, deckRef) {
  if (!deckRef || typeof deckRef !== 'object') {
    throw new Error('deckRef must be an object');
  }

  if (deckRef.group === 'commonSkillDecks') {
    if (!Number.isInteger(deckRef.index) || deckRef.index < 0) {
      throw new Error('deckRef.index must be a non-negative integer for commonSkillDecks');
    }

    const deckState = decksState.commonSkillDecks?.[deckRef.index];
    if (!deckState) {
      throw new Error(`No common skill deck exists at index ${deckRef.index}`);
    }

    return {
      deckState,
      deckLabel: `common skill deck ${deckRef.index + 1}`,
      cardDestination: 'convict-hand',
      activeGroup: null,
      deckRef: {
        group: 'commonSkillDecks',
        index: deckRef.index,
        convictIndex: deckRef.convictIndex,
      },
    };
  }

  const singletonGroups = new Set(['enemyDeck', 'eventDeck', 'itemDeck', 'locationDeck', 'agendaDeck', 'missionDeck']);
  if (!singletonGroups.has(deckRef.group)) {
    throw new Error(`Unsupported deck group "${deckRef.group}"`);
  }

  const deckState = decksState[deckRef.group];
  if (!deckState) {
    throw new Error(`No deck exists for group "${deckRef.group}"`);
  }

  return {
    deckState,
    deckLabel: deckRef.group,
    cardDestination: 'active-area',
    activeGroup: deckRef.group.replace('Deck', ''),
    deckRef: {
      group: deckRef.group,
    },
  };
}

function resolveConvict(nextState, convictIndex) {
  if (!Number.isInteger(convictIndex) || convictIndex < 0) {
    throw new Error('convictIndex must be a non-negative integer');
  }

  const convict = nextState.convicts[convictIndex];
  if (!convict) {
    throw new Error(`No convict exists at index ${convictIndex}`);
  }

  if (!Array.isArray(convict.hand)) {
    throw new Error(`Convict ${convictIndex + 1} has no hand array`);
  }

  return convict;
}

function resolveEnemy(nextState, enemyIndex) {
  if (!Number.isInteger(enemyIndex) || enemyIndex < 0) {
    throw new Error('enemyIndex must be a non-negative integer');
  }

  const enemy = nextState.enemies[enemyIndex];
  if (!enemy) {
    throw new Error(`No enemy exists at index ${enemyIndex}`);
  }

  return enemy;
}

function resolveQueuedSkillConvict(nextState, queuedCard) {
  const convict = nextState.convicts[queuedCard.convictIndex];
  if (!convict) {
    throw new Error(`No convict exists at index ${queuedCard.convictIndex} for queued skill`);
  }
  return convict;
}

function getConvictHandLimit(convict) {
  const configured = Number.isInteger(convict?.handSize) ? convict.handSize : MAX_PLAYER_HAND_SIZE;
  return Math.max(0, Math.min(MAX_PLAYER_HAND_SIZE, configured));
}

function shuffleCardIds(cardIds, randomIntInclusive) {
  const shuffled = [...cardIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIntInclusive(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function recycleConvictDiscardPile(convict, logEntries, randomIntInclusive) {
  if (!Array.isArray(convict.discardPile) || convict.discardPile.length === 0) return false;
  convict.drawPile = shuffleCardIds(convict.discardPile, randomIntInclusive);
  convict.discardPile = [];
  logEntries.push(`Recycled ${convict.name} discard pile into draw pile`);
  return true;
}

function drawCardsToConvictHand(convict, count, logEntries, randomIntInclusive = defaultRandomIntInclusive) {
  const drawCount = Math.max(0, count);
  for (let i = 0; i < drawCount; i += 1) {
    if (convict.hand.length >= getConvictHandLimit(convict)) {
      break;
    }
    if (convict.drawPile.length === 0) {
      const recycled = recycleConvictDiscardPile(convict, logEntries, randomIntInclusive);
      if (!recycled) break;
    }
    const nextCardId = convict.drawPile.shift();
    if (!nextCardId) break;
    convict.hand.push(nextCardId);
    logEntries.push(`Drew ${nextCardId} into ${convict.name} hand`);
  }
}

function applySkillEffect(nextState, convict, effect, logEntries, targetRef, randomIntInclusive) {
  switch (effect.type) {
    case 'deal_damage': {
      if (effect.target !== 'enemy') {
        throw new Error(`Unsupported deal_damage target "${effect.target}"`);
      }
      if (!nextState.enemies || nextState.enemies.length === 0) {
        logEntries.push(`${convict.name} would deal ${effect.amount ?? 0} damage, but no enemies present`);
        return;
      }
      const enemy = resolveEnemy(nextState, targetRef?.enemyIndex ?? 0);
      enemy.currentHealth = Math.max(0, enemy.currentHealth - (effect.amount ?? 0));
      logEntries.push(`${convict.name} dealt ${effect.amount ?? 0} damage to ${enemy.name}`);
      return;
    }
    case 'gain_guard': {
      if (effect.target !== 'self') {
        throw new Error(`Unsupported gain_guard target "${effect.target}"`);
      }
      convict.guards += effect.amount ?? 0;
      logEntries.push(`${convict.name} gained ${effect.amount ?? 0} guard`);
      return;
    }
    case 'draw_cards': {
      if (effect.target !== 'self') {
        throw new Error(`Unsupported draw_cards target "${effect.target}"`);
      }
      drawCardsToConvictHand(convict, effect.count ?? 0, logEntries, randomIntInclusive);
      return;
    }
    case 'apply_condition': {
      if (effect.target !== 'enemy') {
        throw new Error(`Unsupported apply_condition target "${effect.target}"`);
      }
      if (!effect.conditionId) {
        throw new Error('apply_condition requires conditionId');
      }
      if (!nextState.enemies || nextState.enemies.length === 0) {
        logEntries.push(`${convict.name} would apply ${effect.conditionId}, but no enemies present`);
        return;
      }
      const enemy = resolveEnemy(nextState, targetRef?.enemyIndex ?? 0);
      enemy.conditions.push(effect.conditionId);
      logEntries.push(`${convict.name} applied ${effect.conditionId} to ${enemy.name}`);
      return;
    }
    case 'roll_die': {
      if (effect.target !== 'self') {
        throw new Error(`Unsupported roll_die target "${effect.target}"`);
      }
      const dieIndex = Number.isInteger(targetRef?.dieIndex) ? targetRef.dieIndex : 0;
      const dieState = nextState.dicePool[dieIndex];
      if (!dieState) {
        throw new Error(`No die exists at index ${dieIndex}`);
      }
      const rolledValue = randomIntInclusive(1, dieState.sides);
      if (!Number.isInteger(rolledValue) || rolledValue < 1 || rolledValue > dieState.sides) {
        throw new Error(`Random roll must return an integer between 1 and ${dieState.sides}, got "${rolledValue}"`);
      }
      dieState.currentValue = rolledValue;
      logEntries.push(`${convict.name} rolled ${rolledValue} on ${dieState.dieId}`);
      return;
    }
    default:
      throw new Error(`Unsupported skill effect type "${effect.type}"`);
  }
}

function resolveActiveCardGroup(nextState, activeGroup) {
  const activeCards = nextState.activeCards?.[activeGroup];
  if (!Array.isArray(activeCards)) {
    throw new Error(`Active card area "${activeGroup}" is missing`);
  }

  const deckGroupMap = {
    enemy: 'enemyDeck',
    event: 'eventDeck',
    item: 'itemDeck',
    location: 'locationDeck',
    agenda: 'agendaDeck',
    mission: 'missionDeck',
  };

  const deckGroup = deckGroupMap[activeGroup];
  if (!deckGroup) {
    throw new Error(`No discard deck mapping exists for active group "${activeGroup}"`);
  }

  const deckState = nextState.decks?.[deckGroup];
  if (!deckState) {
    throw new Error(`No deck exists for active group "${activeGroup}"`);
  }

  if (!Array.isArray(deckState.discardPile)) {
    throw new Error(`Deck "${deckGroup}" has no discardPile`);
  }

  return {
    activeCards,
    deckState,
    deckGroup,
  };
}

function maybeTriggerEventPhaseDraw(nextState, contentIndex, logEntries) {
  const eventDeck = nextState.decks?.eventDeck;
  if (!eventDeck || !Array.isArray(eventDeck.drawPile) || eventDeck.drawPile.length === 0) {
    logEntries.push('No event card available for Event Phase');
    return [];
  }

  const drawCount = Math.max(0, nextState.convicts?.length || 0);
  const drawResults = [];

  for (let index = 0; index < drawCount; index += 1) {
    if (!nextState.decks?.eventDeck?.drawPile?.length) break;
    const drawResult = drawWardensDebtDeckCard(nextState, contentIndex, { group: 'eventDeck' });
    Object.assign(nextState, drawResult.gameState);
    drawResults.push(drawResult);
    logEntries.push(`Event Phase drew ${drawResult.drawnCardId}`);
  }

  if (drawResults.length === 0) {
    logEntries.push('No event card available for Event Phase');
  }

  return drawResults;
}

function resolveWardensDebtQueuedSkillCards(nextState, contentIndex, queueName, randomIntInclusive = defaultRandomIntInclusive) {
  const queue = nextState.activeCards?.[queueName];
  if (!Array.isArray(queue)) {
    throw new Error(`Active skill queue "${queueName}" is missing`);
  }

  const resolvedCards = [];
  for (const queuedCard of queue) {
    if (queuedCard.resolved) continue;
    const convict = resolveQueuedSkillConvict(nextState, queuedCard);
    const card = contentIndex?.skillDefsById.get(queuedCard.cardId);
    if (!card) {
      throw new Error(`Unknown skill card "${queuedCard.cardId}"`);
    }

    const logEntries = [`${convict.name} resolved ${queuedCard.cardId}`];
    let testEncountered = false;
    for (const effect of card.effects) {
      if (effect.type === 'test') {
        nextState.activeTest = {
          convictIndex: queuedCard.convictIndex,
          difficulty: effect.difficulty || 0,
          description: effect.description || 'Test',
          successEffects: effect.successEffects || [],
          failEffects: effect.failEffects || [],
          modifier: 0,
          sourceCardId: queuedCard.cardId,
        };
        logEntries.push(`${convict.name} encountered a test (difficulty ${effect.difficulty})`);
        testEncountered = true;
        break;
      }
      applySkillEffect(nextState, convict, effect, logEntries, { enemyIndex: 0, dieIndex: 0 }, randomIntInclusive);
    }

    nextState.log = [
      ...nextState.log,
      ...logEntries,
    ];

    if (testEncountered) {
      return resolvedCards;
    }

    queuedCard.resolved = true;
    resolvedCards.push({
      convictIndex: queuedCard.convictIndex,
      cardId: queuedCard.cardId,
    });
  }

  return resolvedCards;
}

function discardWardensDebtQueuedSkillCards(nextState) {
  const discardedCards = [];
  ['fastSkills', 'slowSkills'].forEach(queueName => {
    const queue = nextState.activeCards?.[queueName];
    if (!Array.isArray(queue) || queue.length === 0) return;
    queue.forEach(queuedCard => {
      const convict = resolveQueuedSkillConvict(nextState, queuedCard);
      convict.discardPile.push(queuedCard.cardId);
      discardedCards.push({
        convictIndex: queuedCard.convictIndex,
        cardId: queuedCard.cardId,
      });
      nextState.log = [
        ...nextState.log,
        `${queuedCard.cardId} moved to ${convict.name} discard pile at end of round`,
      ];
    });
    nextState.activeCards[queueName] = [];
  });

  return discardedCards;
}

function setWardensDebtPhase(nextState, contentIndex, phase, round, triggerAutomations) {
  if (!WARDENS_DEBT_PHASE_SEQUENCE.includes(phase)) {
    throw new Error(`Unsupported Wardens Debt phase "${phase}"`);
  }

  nextState.turn.round = round;
  nextState.turn.phase = phase;
  nextState.turn.activeSide = activeSideForPhase(phase);
  nextState.turn.phaseComplete = nextState.turn.phaseComplete.map(() => false);

  if (phase === 'upkeep') {
    nextState.convicts = nextState.convicts.map(c => ({ ...c, selectedTacticId: null }));
  }

  const phaseConfig = PHASE_CONFIG[phase];
  const initialSubphase = phaseConfig?.subphases?.[0] || null;
  nextState.turn.convictSubphases = nextState.turn.convictSubphases.map(() => initialSubphase);

  const logEntries = [`Round ${round}: entered ${phase}`];
  const automationResult = {
    eventDraws: [],
    resolvedSkills: [],
    discardedSkills: [],
  };

  if (triggerAutomations && phase === 'events') {
    automationResult.eventDraws = maybeTriggerEventPhaseDraw(nextState, contentIndex, logEntries);
  }
  if (triggerAutomations && phase === 'fast-skills') {
    automationResult.resolvedSkills = resolveWardensDebtQueuedSkillCards(nextState, contentIndex, 'fastSkills');
  }
  if (triggerAutomations && phase === 'slow-skills') {
    automationResult.resolvedSkills = resolveWardensDebtQueuedSkillCards(nextState, contentIndex, 'slowSkills');
  }
  if (triggerAutomations && phase === 'end-round') {
    automationResult.discardedSkills = discardWardensDebtQueuedSkillCards(nextState);
  }

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  return {
    logEntries,
    automationResult,
  };
}

function resolveWardensDebtTest(gameState, contentIndex, randomIntInclusive = defaultRandomIntInclusive) {
  const test = gameState.activeTest;
  if (!test) return { gameState, log: [] };

  const total = calculateWardensDebtDiceTotal(gameState) + test.modifier;
  const succeeded = total >= test.difficulty;
  const effects = succeeded ? test.successEffects : test.failEffects;

  const nextState = { ...gameState, activeTest: null };
  const logEntries = [
    `Test "${test.description}": rolled ${total - test.modifier} + modifier ${test.modifier} = ${total} vs difficulty ${test.difficulty} → ${succeeded ? 'SUCCESS' : 'FAIL'}`,
  ];

  const convict = nextState.convicts?.[test.convictIndex];
  if (!convict) return { gameState: nextState, log: logEntries };

  for (const effect of effects) {
    applySkillEffect(nextState, convict, effect, logEntries, { enemyIndex: 0, dieIndex: 0 }, randomIntInclusive);
  }

  const queue = nextState.activeCards?.fastSkills || [];
  for (const entry of queue) {
    if (entry.cardId === test.sourceCardId && entry.convictIndex === test.convictIndex) {
      entry.resolved = true;
    }
  }
  const slowQueue = nextState.activeCards?.slowSkills || [];
  for (const entry of slowQueue) {
    if (entry.cardId === test.sourceCardId && entry.convictIndex === test.convictIndex) {
      entry.resolved = true;
    }
  }

  return { gameState: nextState, log: logEntries };
}

export function resolveWardensDebtTestAndContinue(gameState, contentIndex) {
  const { gameState: nextState, log: testLog } = resolveWardensDebtTest(gameState, contentIndex);
  if (!nextState.activeTest && nextState.activeCards?.fastSkills) {
    const result = resolveWardensDebtQueuedSkillCards(nextState, contentIndex, 'fastSkills');
    return { gameState: nextState, log: [...testLog, ...nextState.log] };
  }
  return { gameState: nextState, log: testLog };
}

export function calculateWardensDebtDiceTotal(gameState) {
  return gameState.dicePool.reduce((total, dieState) => {
    return total + (Number.isInteger(dieState.currentValue) ? dieState.currentValue : 0);
  }, 0);
}

export function advanceWardensDebtConvictSubphase(gameState, convictIndex) {
  const nextState = cloneWardensDebtGameState(gameState);
  const phase = nextState.turn.phase;
  const phaseConfig = PHASE_CONFIG[phase];
  const currentSubphase = nextState.turn.convictSubphases[convictIndex];

  if (!phaseConfig?.subphases || phaseConfig.subphases.length === 0) {
    throw new Error(`Phase "${phase}" does not have subphases`);
  }

  const currentIdx = phaseConfig.subphases.indexOf(currentSubphase);
  if (currentIdx === -1) {
    throw new Error(`Convict ${convictIndex} is not in a valid subphase for phase "${phase}"`);
  }

  const isLastSubphase = currentIdx === phaseConfig.subphases.length - 1;
  if (isLastSubphase) {
    nextState.turn.convictSubphases[convictIndex] = null;
    nextState.turn.phaseComplete[convictIndex] = true;
  } else {
    nextState.turn.convictSubphases[convictIndex] = phaseConfig.subphases[currentIdx + 1];
  }

  return nextState;
}

export function advanceWardensDebtPhase(gameState, contentIndex) {
  const nextState = cloneWardensDebtGameState(gameState);
  if (nextState.turn.phaseComplete.some(isComplete => !isComplete)) {
    throw new Error('Cannot advance phase: not all convicts have completed the current phase');
  }
  const currentPhaseIndex = WARDENS_DEBT_PHASE_SEQUENCE.indexOf(nextState.turn.phase);
  if (currentPhaseIndex === -1) {
    throw new Error(`Current phase "${nextState.turn.phase}" is not supported`);
  }

  const wrapped = currentPhaseIndex === WARDENS_DEBT_PHASE_SEQUENCE.length - 1;
  const nextPhase = wrapped
    ? WARDENS_DEBT_PHASE_SEQUENCE[0]
    : WARDENS_DEBT_PHASE_SEQUENCE[currentPhaseIndex + 1];
  const nextRound = wrapped ? nextState.turn.round + 1 : nextState.turn.round;
  const { automationResult } = setWardensDebtPhase(nextState, contentIndex, nextPhase, nextRound, true);

  validateNextState(nextState, contentIndex, 'advance phase');

  return {
    gameState: nextState,
    phase: nextPhase,
    round: nextRound,
    automationResult,
  };
}

export function retreatWardensDebtPhase(gameState, contentIndex) {
  const nextState = cloneWardensDebtGameState(gameState);
  const currentPhaseIndex = WARDENS_DEBT_PHASE_SEQUENCE.indexOf(nextState.turn.phase);
  if (currentPhaseIndex === -1) {
    throw new Error(`Current phase "${nextState.turn.phase}" is not supported`);
  }

  const wrapped = currentPhaseIndex === 0;
  const nextPhase = wrapped
    ? WARDENS_DEBT_PHASE_SEQUENCE[WARDENS_DEBT_PHASE_SEQUENCE.length - 1]
    : WARDENS_DEBT_PHASE_SEQUENCE[currentPhaseIndex - 1];
  const nextRound = wrapped ? Math.max(1, nextState.turn.round - 1) : nextState.turn.round;
  setWardensDebtPhase(nextState, contentIndex, nextPhase, nextRound, false);

  validateNextState(nextState, contentIndex, 'retreat phase');

  return {
    gameState: nextState,
    phase: nextPhase,
    round: nextRound,
  };
}

export function startNextWardensDebtRound(gameState, contentIndex) {
  const nextState = cloneWardensDebtGameState(gameState);
  const nextRound = nextState.turn.round + 1;
  setWardensDebtPhase(nextState, contentIndex, WARDENS_DEBT_PHASE_SEQUENCE[0], nextRound, false);

  validateNextState(nextState, contentIndex, 'next round');

  return {
    gameState: nextState,
    phase: nextState.turn.phase,
    round: nextRound,
  };
}

export function rollWardensDebtDie(gameState, contentIndex, dieIndex, randomIntInclusive = defaultRandomIntInclusive) {
  if (!Number.isInteger(dieIndex) || dieIndex < 0) {
    throw new Error(`Die index must be a non-negative integer, got "${dieIndex}"`);
  }

  if (typeof randomIntInclusive !== 'function') {
    throw new Error('randomIntInclusive must be a function');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const dieState = nextState.dicePool[dieIndex];

  if (!dieState) {
    throw new Error(`No die exists at index ${dieIndex}`);
  }

  const sides = dieState.sides;
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error(`Die at index ${dieIndex} has invalid sides value "${sides}"`);
  }

  const rolledValue = randomIntInclusive(1, sides);
  if (!Number.isInteger(rolledValue) || rolledValue < 1 || rolledValue > sides) {
    throw new Error(`Random roll must return an integer between 1 and ${sides}, got "${rolledValue}"`);
  }

  dieState.currentValue = rolledValue;
  const total = calculateWardensDebtDiceTotal(nextState);
  nextState.log = [
    ...nextState.log,
    `Rolled ${rolledValue} on ${dieState.dieId}; total is now ${total}`,
  ];

  validateNextState(nextState, contentIndex, 'die roll');

  return {
    gameState: nextState,
    dieIndex,
    dieId: dieState.dieId,
    rolledValue,
    total,
  };
}

export function rollWardensDebtDicePool(gameState, contentIndex, randomIntInclusive = defaultRandomIntInclusive) {
  if (typeof randomIntInclusive !== 'function') {
    throw new Error('randomIntInclusive must be a function');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const rolledDice = nextState.dicePool.map((dieState, dieIndex) => {
    const sides = dieState.sides;
    if (!Number.isInteger(sides) || sides < 2) {
      throw new Error(`Die at index ${dieIndex} has invalid sides value "${sides}"`);
    }
    const rolledValue = randomIntInclusive(1, sides);
    if (!Number.isInteger(rolledValue) || rolledValue < 1 || rolledValue > sides) {
      throw new Error(`Random roll must return an integer between 1 and ${sides}, got "${rolledValue}"`);
    }
    dieState.currentValue = rolledValue;
    return {
      dieIndex,
      dieId: dieState.dieId,
      rolledValue,
    };
  });

  const total = calculateWardensDebtDiceTotal(nextState);
  nextState.log = [
    ...nextState.log,
    `Rolled dice pool for total ${total}`,
  ];

  validateNextState(nextState, contentIndex, 'dice pool roll');

  return {
    gameState: nextState,
    rolledDice,
    total,
  };
}

export function drawWardensDebtDeckCard(gameState, contentIndex, deckRef) {
  const nextState = cloneWardensDebtGameState(gameState);
  const {
    deckState,
    deckLabel,
    cardDestination,
    activeGroup,
    deckRef: normalizedDeckRef,
  } = resolveDeckState(nextState.decks, deckRef);

  if (!Array.isArray(deckState.drawPile)) {
    throw new Error(`Deck "${deckLabel}" has no drawPile`);
  }

  if (!Array.isArray(deckState.discardPile)) {
    throw new Error(`Deck "${deckLabel}" has no discardPile`);
  }

  if (deckState.drawPile.length === 0) {
    throw new Error(`Deck "${deckLabel}" is empty`);
  }

  const drawnCardId = deckState.drawPile.shift();
  let destination;

  if (cardDestination === 'convict-hand') {
    const convict = resolveConvict(nextState, deckRef.convictIndex);
    if (convict.hand.length >= getConvictHandLimit(convict)) {
      throw new Error(`${convict.name} already has the maximum hand size of ${getConvictHandLimit(convict)}`);
    }
    convict.hand.push(drawnCardId);
    destination = `${convict.name} hand`;
  } else {
    if (!Array.isArray(nextState.activeCards?.[activeGroup])) {
      throw new Error(`Active card area "${activeGroup}" is missing`);
    }
    nextState.activeCards[activeGroup].push(drawnCardId);
    destination = `${activeGroup} active area`;
  }

  nextState.log = [
    ...nextState.log,
    `Drew ${drawnCardId} from ${deckLabel} to ${destination}`,
  ];

  validateNextState(nextState, contentIndex, 'deck draw');

  return {
    gameState: nextState,
    deckRef: normalizedDeckRef,
    deckId: deckState.deckId,
    drawnCardId,
    destination,
    remainingDrawPileCount: deckState.drawPile.length,
  };
}

export function resolveWardensDebtActiveCardToDiscard(gameState, contentIndex, activeGroup, activeIndex = 0) {
  if (!Number.isInteger(activeIndex) || activeIndex < 0) {
    throw new Error('activeIndex must be a non-negative integer');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const { activeCards, deckState, deckGroup } = resolveActiveCardGroup(nextState, activeGroup);

  const cardId = activeCards[activeIndex];
  if (!cardId) {
    throw new Error(`No active ${activeGroup} card exists at index ${activeIndex}`);
  }

  activeCards.splice(activeIndex, 1);
  deckState.discardPile.push(cardId);
  nextState.log = [
    ...nextState.log,
    `Moved ${cardId} from ${activeGroup} active area to ${deckGroup} discard`,
  ];

  validateNextState(nextState, contentIndex, 'active card discard');

  return {
    gameState: nextState,
    activeGroup,
    activeIndex,
    deckId: deckState.deckId,
    cardId,
    discardCount: deckState.discardPile.length,
  };
}

const DECK_GROUP_TO_ACTIVE_GROUP = {
  enemyDeck: 'enemy',
  eventDeck: 'event',
  itemDeck: 'item',
  locationDeck: 'location',
  agendaDeck: 'agenda',
  missionDeck: 'mission',
};

export function refreshWardensDebtActiveDeck(gameState, contentIndex, deckGroup, count = 1) {
  const activeGroup = DECK_GROUP_TO_ACTIVE_GROUP[deckGroup];
  if (!activeGroup) throw new Error(`No active group mapping for deck "${deckGroup}"`);

  const nextState = cloneWardensDebtGameState(gameState);
  const deckState = nextState.decks?.[deckGroup];
  if (!deckState) throw new Error(`Deck "${deckGroup}" not found`);

  const activeCards = nextState.activeCards?.[activeGroup];
  if (!Array.isArray(activeCards)) throw new Error(`Active card area "${activeGroup}" is missing`);

  const discarded = activeCards.splice(0);
  deckState.discardPile.push(...discarded);

  if (deckState.drawPile.length === 0) throw new Error(`${deckGroup} draw pile is empty`);

  const drawCount = Math.min(count, deckState.drawPile.length);
  const drawnCardIds = deckState.drawPile.splice(0, drawCount);
  activeCards.push(...drawnCardIds);

  nextState.log = [
    ...nextState.log,
    `Refreshed ${activeGroup}: discarded [${discarded.join(', ')}], drew [${drawnCardIds.join(', ')}]`,
  ];

  validateNextState(nextState, contentIndex, 'refresh active deck');

  return { gameState: nextState, activeGroup, deckGroup, drawnCardIds, discarded };
}

export function drawWardensDebtConvictCard(gameState, contentIndex, convictIndex, count = 1) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const convict = resolveConvict(nextState, convictIndex);
  const logEntries = [];
  const startingHandCount = convict.hand.length;

  drawCardsToConvictHand(convict, count, logEntries, defaultRandomIntInclusive);

  if (convict.hand.length === startingHandCount) {
    throw new Error(`${convict.name} has no cards left to draw`);
  }

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'player draw');

  return {
    gameState: nextState,
    convictIndex,
    convictRuntimeId: convict.id,
    drawnCount: convict.hand.length - startingHandCount,
    hand: [...convict.hand],
    remainingDrawPileCount: convict.drawPile.length,
  };
}

export function redrawWardensDebtConvictHand(
  gameState,
  contentIndex,
  convictIndex,
  targetHandSize = null,
  randomIntInclusive = defaultRandomIntInclusive
) {
  if (targetHandSize != null && (!Number.isInteger(targetHandSize) || targetHandSize < 0)) {
    throw new Error('targetHandSize must be a non-negative integer when provided');
  }
  if (typeof randomIntInclusive !== 'function') {
    throw new Error('randomIntInclusive must be a function');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const convict = resolveConvict(nextState, convictIndex);
  const logEntries = [];
  const discardedCards = [...convict.hand];

  if (discardedCards.length > 0) {
    convict.discardPile.push(...discardedCards);
    convict.hand = [];
    logEntries.push(`Discarded ${discardedCards.length} card(s) from ${convict.name} hand`);
  }

  const drawCount = targetHandSize ?? convict.handSize ?? 0;
  drawCardsToConvictHand(convict, drawCount, logEntries, randomIntInclusive);

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'player redraw');

  return {
    gameState: nextState,
    convictIndex,
    convictRuntimeId: convict.id,
    discardedCount: discardedCards.length,
    handCount: convict.hand.length,
    remainingDrawPileCount: convict.drawPile.length,
    remainingDiscardPileCount: convict.discardPile.length,
  };
}

export function playWardensDebtSkillCard(
  gameState,
  contentIndex,
  convictIndex,
  handIndex,
  targetRef = {},
  randomIntInclusive = defaultRandomIntInclusive
) {
  if (gameState.turn?.phase !== 'tactics' || gameState.turn?.convictSubphases?.[convictIndex] !== 'select-skill-cards') {
    throw new Error('Skill cards can only be played during the select-skill-cards phase');
  }
  if (!Number.isInteger(handIndex) || handIndex < 0) {
    throw new Error('handIndex must be a non-negative integer');
  }

  if (typeof randomIntInclusive !== 'function') {
    throw new Error('randomIntInclusive must be a function');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const convict = resolveConvict(nextState, convictIndex);
  const cardId = convict.hand[handIndex];

  if (!cardId) {
    throw new Error(`No skill card exists in ${convict.name} hand at index ${handIndex}`);
  }

  const card = contentIndex?.skillDefsById.get(cardId);
  if (!card) {
    throw new Error(`Unknown skill card "${cardId}"`);
  }

  convict.hand.splice(handIndex, 1);
  const queueName = card.timing === 'fast' ? 'fastSkills' : 'slowSkills';
  if (!Array.isArray(nextState.activeCards?.[queueName])) {
    throw new Error(`Active skill queue "${queueName}" is missing`);
  }
  nextState.activeCards[queueName].push({
    convictIndex,
    cardId,
    resolved: false,
  });
  const logEntries = [`${convict.name} selected ${cardId} for ${card.timing} resolution`];

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'skill play');

  return {
    gameState: nextState,
    convictIndex,
    convictRuntimeId: convict.id,
    cardId,
    timing: card.timing,
    handCount: convict.hand.length,
    queueSize: nextState.activeCards[queueName].length,
  };
}

export function unplayWardensDebtSkillCard(
  gameState,
  contentIndex,
  convictIndex,
  queueName,
  queueIndex
) {
  if (gameState.turn?.phase !== 'tactics' || gameState.turn?.subphase !== 'select-skill-cards') {
    throw new Error('Cards can only be returned to hand during the select-skill-cards phase');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const convict = resolveConvict(nextState, convictIndex);
  const queue = nextState.activeCards?.[queueName];
  if (!Array.isArray(queue)) throw new Error(`Active skill queue "${queueName}" is missing`);

  const entry = queue[queueIndex];
  if (!entry || entry.convictIndex !== convictIndex) {
    throw new Error(`No card at queue index ${queueIndex} for this convict`);
  }

  queue.splice(queueIndex, 1);
  convict.hand.push(entry.cardId);

  validateNextState(nextState, contentIndex, 'unplay card');

  return { gameState: nextState, cardId: entry.cardId };
}

export function discardWardensDebtSkillCard(
  gameState,
  contentIndex,
  convictIndex,
  queueName,
  queueIndex
) {
  const phase = gameState.turn?.phase;
  if (queueName === 'fastSkills' && phase !== 'fast-skills') {
    throw new Error('Fast cards can only be discarded during the fast-skills phase');
  }
  if (queueName === 'slowSkills' && phase !== 'slow-skills') {
    throw new Error('Slow cards can only be discarded during the slow-skills phase');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const convict = resolveConvict(nextState, convictIndex);
  const queue = nextState.activeCards?.[queueName];
  if (!Array.isArray(queue)) throw new Error(`Active skill queue "${queueName}" is missing`);

  const entry = queue[queueIndex];
  if (!entry || entry.convictIndex !== convictIndex) {
    throw new Error(`No card at queue index ${queueIndex} for this convict`);
  }

  queue.splice(queueIndex, 1);
  convict.discardPile.push(entry.cardId);

  validateNextState(nextState, contentIndex, 'discard skill card');

  return { gameState: nextState, cardId: entry.cardId };
}
