import {
  cloneWardensDebtGameState,
  validateWardensDebtGameState,
} from './schema.js';

const MAX_PLAYER_HAND_SIZE = 8;
export const WARDENS_DEBT_PHASE_SEQUENCE = [
  'start-round',
  'event-phase',
  'select-cards',
  'fast-cards',
  'enemy-phase',
  'slow-cards',
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
  return phase === 'enemy-phase' ? 'enemies' : 'players';
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
      cardDestination: 'player-hand',
      activeGroup: null,
      deckRef: {
        group: 'commonSkillDecks',
        index: deckRef.index,
        playerIndex: deckRef.playerIndex,
      },
    };
  }

  const singletonGroups = new Set(['monsterDeck', 'eventDeck', 'itemDeck', 'locationDeck', 'agendaDeck', 'missionDeck']);
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

function resolvePlayer(nextState, playerIndex) {
  if (!Number.isInteger(playerIndex) || playerIndex < 0) {
    throw new Error('playerIndex must be a non-negative integer');
  }

  const player = nextState.players[playerIndex];
  if (!player) {
    throw new Error(`No player exists at index ${playerIndex}`);
  }

  if (!Array.isArray(player.hand)) {
    throw new Error(`Player ${playerIndex + 1} has no hand array`);
  }

  return player;
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

function resolveQueuedSkillPlayer(nextState, queuedCard) {
  const player = nextState.players[queuedCard.playerIndex];
  if (!player) {
    throw new Error(`No player exists at index ${queuedCard.playerIndex} for queued skill`);
  }
  return player;
}

function getPlayerHandLimit(player) {
  const configured = Number.isInteger(player?.handSize) ? player.handSize : MAX_PLAYER_HAND_SIZE;
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

function recyclePlayerDiscardPile(player, logEntries, randomIntInclusive) {
  if (!Array.isArray(player.discardPile) || player.discardPile.length === 0) return false;
  player.drawPile = shuffleCardIds(player.discardPile, randomIntInclusive);
  player.discardPile = [];
  logEntries.push(`Recycled ${player.name} discard pile into draw pile`);
  return true;
}

function drawCardsToPlayerHand(player, count, logEntries, randomIntInclusive = defaultRandomIntInclusive) {
  const drawCount = Math.max(0, count);
  for (let i = 0; i < drawCount; i += 1) {
    if (player.hand.length >= getPlayerHandLimit(player)) {
      break;
    }
    if (player.drawPile.length === 0) {
      const recycled = recyclePlayerDiscardPile(player, logEntries, randomIntInclusive);
      if (!recycled) break;
    }
    const nextCardId = player.drawPile.shift();
    if (!nextCardId) break;
    player.hand.push(nextCardId);
    logEntries.push(`Drew ${nextCardId} into ${player.name} hand`);
  }
}

function applySkillEffect(nextState, player, effect, logEntries, targetRef, randomIntInclusive) {
  switch (effect.type) {
    case 'deal_damage': {
      if (effect.target !== 'enemy') {
        throw new Error(`Unsupported deal_damage target "${effect.target}"`);
      }
      const enemy = resolveEnemy(nextState, targetRef?.enemyIndex ?? 0);
      enemy.currentHealth = Math.max(0, enemy.currentHealth - (effect.amount ?? 0));
      logEntries.push(`${player.name} dealt ${effect.amount ?? 0} damage to ${enemy.name}`);
      return;
    }
    case 'gain_guard': {
      if (effect.target !== 'self') {
        throw new Error(`Unsupported gain_guard target "${effect.target}"`);
      }
      player.guards += effect.amount ?? 0;
      logEntries.push(`${player.name} gained ${effect.amount ?? 0} guard`);
      return;
    }
    case 'draw_cards': {
      if (effect.target !== 'self') {
        throw new Error(`Unsupported draw_cards target "${effect.target}"`);
      }
      drawCardsToPlayerHand(player, effect.count ?? 0, logEntries, randomIntInclusive);
      return;
    }
    case 'apply_condition': {
      if (effect.target !== 'enemy') {
        throw new Error(`Unsupported apply_condition target "${effect.target}"`);
      }
      if (!effect.conditionId) {
        throw new Error('apply_condition requires conditionId');
      }
      const enemy = resolveEnemy(nextState, targetRef?.enemyIndex ?? 0);
      enemy.conditions.push(effect.conditionId);
      logEntries.push(`${player.name} applied ${effect.conditionId} to ${enemy.name}`);
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
      logEntries.push(`${player.name} rolled ${rolledValue} on ${dieState.dieId}`);
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
    monster: 'monsterDeck',
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

  const drawCount = Math.max(0, nextState.players?.length || 0);
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
  queue.forEach(queuedCard => {
    if (queuedCard.resolved) return;
    const player = resolveQueuedSkillPlayer(nextState, queuedCard);
    const card = contentIndex?.skillCardsById.get(queuedCard.cardId);
    if (!card) {
      throw new Error(`Unknown skill card "${queuedCard.cardId}"`);
    }

    const logEntries = [`${player.name} resolved ${queuedCard.cardId}`];
    for (const effect of card.effects) {
      applySkillEffect(nextState, player, effect, logEntries, { enemyIndex: 0, dieIndex: 0 }, randomIntInclusive);
    }
    nextState.log = [
      ...nextState.log,
      ...logEntries,
    ];
    queuedCard.resolved = true;
    resolvedCards.push({
      playerIndex: queuedCard.playerIndex,
      cardId: queuedCard.cardId,
    });
  });

  return resolvedCards;
}

function discardWardensDebtQueuedSkillCards(nextState) {
  const discardedCards = [];
  ['fastSkills', 'slowSkills'].forEach(queueName => {
    const queue = nextState.activeCards?.[queueName];
    if (!Array.isArray(queue) || queue.length === 0) return;
    queue.forEach(queuedCard => {
      const player = resolveQueuedSkillPlayer(nextState, queuedCard);
      player.discardPile.push(queuedCard.cardId);
      discardedCards.push({
        playerIndex: queuedCard.playerIndex,
        cardId: queuedCard.cardId,
      });
      nextState.log = [
        ...nextState.log,
        `${queuedCard.cardId} moved to ${player.name} discard pile at end of round`,
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

  const logEntries = [`Round ${round}: entered ${phase}`];
  const automationResult = {
    eventDraws: [],
    resolvedSkills: [],
    discardedSkills: [],
  };

  if (triggerAutomations && phase === 'event-phase') {
    automationResult.eventDraws = maybeTriggerEventPhaseDraw(nextState, contentIndex, logEntries);
  }
  if (triggerAutomations && phase === 'fast-cards') {
    automationResult.resolvedSkills = resolveWardensDebtQueuedSkillCards(nextState, contentIndex, 'fastSkills');
  }
  if (triggerAutomations && phase === 'slow-cards') {
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

export function calculateWardensDebtDiceTotal(gameState) {
  return gameState.dicePool.reduce((total, dieState) => {
    return total + (Number.isInteger(dieState.currentValue) ? dieState.currentValue : 0);
  }, 0);
}

export function advanceWardensDebtPhase(gameState, contentIndex) {
  const nextState = cloneWardensDebtGameState(gameState);
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

  if (cardDestination === 'player-hand') {
    const player = resolvePlayer(nextState, deckRef.playerIndex);
    if (player.hand.length >= getPlayerHandLimit(player)) {
      throw new Error(`${player.name} already has the maximum hand size of ${getPlayerHandLimit(player)}`);
    }
    player.hand.push(drawnCardId);
    destination = `${player.name} hand`;
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

export function drawWardensDebtPlayerCard(gameState, contentIndex, playerIndex, count = 1) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const player = resolvePlayer(nextState, playerIndex);
  const logEntries = [];
  const startingHandCount = player.hand.length;

  drawCardsToPlayerHand(player, count, logEntries, defaultRandomIntInclusive);

  if (player.hand.length === startingHandCount) {
    throw new Error(`${player.name} has no cards left to draw`);
  }

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'player draw');

  return {
    gameState: nextState,
    playerIndex,
    playerId: player.id,
    drawnCount: player.hand.length - startingHandCount,
    hand: [...player.hand],
    remainingDrawPileCount: player.drawPile.length,
  };
}

export function redrawWardensDebtPlayerHand(
  gameState,
  contentIndex,
  playerIndex,
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
  const player = resolvePlayer(nextState, playerIndex);
  const logEntries = [];
  const discardedCards = [...player.hand];

  if (discardedCards.length > 0) {
    player.discardPile.push(...discardedCards);
    player.hand = [];
    logEntries.push(`Discarded ${discardedCards.length} card(s) from ${player.name} hand`);
  }

  const drawCount = targetHandSize ?? player.handSize ?? 0;
  drawCardsToPlayerHand(player, drawCount, logEntries, randomIntInclusive);

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'player redraw');

  return {
    gameState: nextState,
    playerIndex,
    playerId: player.id,
    discardedCount: discardedCards.length,
    handCount: player.hand.length,
    remainingDrawPileCount: player.drawPile.length,
    remainingDiscardPileCount: player.discardPile.length,
  };
}

export function playWardensDebtSkillCard(
  gameState,
  contentIndex,
  playerIndex,
  handIndex,
  targetRef = {},
  randomIntInclusive = defaultRandomIntInclusive
) {
  if (gameState.turn?.phase !== 'select-cards') {
    throw new Error('Skill cards can only be played during the select-cards phase');
  }
  if (!Number.isInteger(handIndex) || handIndex < 0) {
    throw new Error('handIndex must be a non-negative integer');
  }

  if (typeof randomIntInclusive !== 'function') {
    throw new Error('randomIntInclusive must be a function');
  }

  const nextState = cloneWardensDebtGameState(gameState);
  const player = resolvePlayer(nextState, playerIndex);
  const cardId = player.hand[handIndex];

  if (!cardId) {
    throw new Error(`No skill card exists in ${player.name} hand at index ${handIndex}`);
  }

  const card = contentIndex?.skillCardsById.get(cardId);
  if (!card) {
    throw new Error(`Unknown skill card "${cardId}"`);
  }

  player.hand.splice(handIndex, 1);
  const queueName = card.timing === 'fast' ? 'fastSkills' : 'slowSkills';
  if (!Array.isArray(nextState.activeCards?.[queueName])) {
    throw new Error(`Active skill queue "${queueName}" is missing`);
  }
  nextState.activeCards[queueName].push({
    playerIndex,
    cardId,
    resolved: false,
  });
  const logEntries = [`${player.name} selected ${cardId} for ${card.timing} resolution`];

  nextState.log = [
    ...nextState.log,
    ...logEntries,
  ];

  validateNextState(nextState, contentIndex, 'skill play');

  return {
    gameState: nextState,
    playerIndex,
    playerId: player.id,
    cardId,
    timing: card.timing,
    handCount: player.hand.length,
    queueSize: nextState.activeCards[queueName].length,
  };
}
