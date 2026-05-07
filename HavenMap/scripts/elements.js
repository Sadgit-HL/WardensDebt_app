import {
  advanceWardensDebtPhase,
  drawWardensDebtDeckCard,
  drawWardensDebtConvictCard,
  playWardensDebtSkillCard,
  redrawWardensDebtConvictHand,
  resolveWardensDebtActiveCardToDiscard,
  retreatWardensDebtPhase,
  startNextWardensDebtRound,
  WARDENS_DEBT_PHASE_SEQUENCE,
} from './wardensDebt/gameplay.js';
import {
  getWardensDebtRuntime,
  setWardensDebtGameState,
  subscribeWardensDebtRuntime,
} from './wardensDebt/runtime.js';
import { state, patch } from './state.js';
import { ELEMENTS } from './games/common.js';
import { uiState, selectFromStack, subscribeUI } from './uiState.js';

let activeConvictIndex = 0;
let statusMessage = '';

export function cycleElement(index) {
  const els = [...state.elements];
  els[index] = (els[index] + 1) % 3;
  patch({ elements: els });
}

export function endOfRound() {
  const els = state.elements.map(value => Math.max(0, value - 1));
  patch({ elements: els });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syncActiveConvictWithSelection(runtime) {
  const selected = uiState.selected;
  if (selected?.kind === 'wd-convict' && Number.isInteger(selected.idx)) {
    activeConvictIndex = selected.idx;
    return;
  }

  const convictCount = runtime.gameState?.convicts?.length || 0;
  if (convictCount === 0) {
    activeConvictIndex = 0;
    return;
  }

  if (activeConvictIndex < 0 || activeConvictIndex >= convictCount) {
    activeConvictIndex = 0;
  }
}

function selectedTargetRef(runtime) {
  return {
    enemyIndex: 0,
    dieIndex: 0,
  };
}

function activeConvict(runtime) {
  syncActiveConvictWithSelection(runtime);
  return runtime.gameState?.convicts?.[activeConvictIndex] || null;
}

function cardDetails(runtime, cardId) {
  return runtime.index?.skillCardsById.get(cardId) || null;
}

const ACTIVE_DECK_GROUPS = [
  { deckGroup: 'monsterDeck', activeGroup: 'monster', label: 'Monster', indexKey: 'monsterCardsById' },
  { deckGroup: 'eventDeck', activeGroup: 'event', label: 'Event', indexKey: 'eventCardsById' },
  { deckGroup: 'itemDeck', activeGroup: 'item', label: 'Item', indexKey: 'itemCardsById' },
  { deckGroup: 'locationDeck', activeGroup: 'location', label: 'Location', indexKey: 'locationCardsById' },
  { deckGroup: 'agendaDeck', activeGroup: 'agenda', label: 'Agenda', indexKey: 'agendaCardsById' },
  { deckGroup: 'missionDeck', activeGroup: 'mission', label: 'Mission', indexKey: 'missionCardsById' },
];

function drawCountLabel(player) {
  return `Draw ${player.drawPile.length} · Hand ${player.hand.length} · Discard ${player.discardPile.length}`;
}

function activeCardDetails(runtime, config, cardId) {
  return runtime.index?.[config.indexKey]?.get(cardId) || null;
}

function queuedSkillSections(runtime) {
  const queueConfigs = [
    { key: 'fastSkills', label: 'Fast Skills' },
    { key: 'slowSkills', label: 'Slow Skills' },
  ];

  return queueConfigs.map(config => {
    const queue = runtime.gameState.activeCards?.[config.key] || [];
    const cardsHtml = queue.map((queuedCard, queueIndex) => {
      const convict = runtime.gameState.convicts?.[queuedCard.convictIndex];
      const card = cardDetails(runtime, queuedCard.cardId);
      return `
        <article class="wd-active-card">
          <div class="wd-active-card-top">
            <div class="wd-active-card-type">${escapeHtml(config.label)}</div>
            <div class="wd-queue-state${queuedCard.resolved ? ' is-resolved' : ''}">
              ${queuedCard.resolved ? 'Resolved' : 'Queued'}
            </div>
          </div>
          <div class="wd-active-card-title">${escapeHtml(card?.name || queuedCard.cardId)}</div>
          <div class="wd-active-card-text">${escapeHtml(convict?.name || `Convict ${queueIndex + 1}`)} · ${escapeHtml(card?.timing || '')}</div>
        </article>
      `;
    }).join('');

    return `
      <div class="wd-playbar-subhead">${config.label}</div>
      <div class="wd-playbar-hand">
        ${cardsHtml || `<div class="wd-playbar-empty">No ${config.label.toLowerCase()}.</div>`}
      </div>
    `;
  }).join('');
}

function formatPhaseName(phase) {
  return String(phase || '')
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ');
}

function renderLoading(playbar) {
  playbar.innerHTML = `
    <div class="wd-playbar wd-playbar--status">
      <div class="wd-playbar-copy">
        <div class="wd-playbar-eyebrow">Wardens Debt</div>
        <div class="wd-playbar-title">Loading playtest actions...</div>
      </div>
    </div>
  `;
}

function renderError(playbar, runtime) {
  playbar.innerHTML = `
    <div class="wd-playbar wd-playbar--status">
      <div class="wd-playbar-copy">
        <div class="wd-playbar-eyebrow">Wardens Debt</div>
        <div class="wd-playbar-title">Play bar unavailable</div>
        <div class="wd-playbar-meta">${escapeHtml(runtime.error || 'Unknown runtime error.')}</div>
      </div>
    </div>
  `;
}

function renderReady(playbar, runtime) {
  const convict = activeConvict(runtime);
  if (!convict) {
    playbar.innerHTML = `
      <div class="wd-playbar wd-playbar--status">
        <div class="wd-playbar-copy">
          <div class="wd-playbar-eyebrow">Wardens Debt</div>
          <div class="wd-playbar-title">No convicts in this scenario</div>
        </div>
      </div>
    `;
    return;
  }

  const commonDeckButtons = (runtime.gameState.decks.commonSkillDecks || []).map((deckState, deckIndex) => {
    const remaining = Array.isArray(deckState.drawPile) ? deckState.drawPile.length : 0;
    return `
      <button class="wd-playbar-mini-btn" data-wd-action="draw-common" data-deck-index="${deckIndex}" ${remaining > 0 ? '' : 'disabled'}>
        Gain Common ${deckIndex + 1} (${remaining})
      </button>
    `;
  }).join('');

  const activeDeckButtons = ACTIVE_DECK_GROUPS
    .filter(config => runtime.gameState.decks?.[config.deckGroup])
    .map(config => {
      const deckState = runtime.gameState.decks[config.deckGroup];
      const remaining = Array.isArray(deckState.drawPile) ? deckState.drawPile.length : 0;
      return `
        <button class="wd-playbar-mini-btn" data-wd-action="draw-active" data-deck-group="${config.deckGroup}" ${remaining > 0 ? '' : 'disabled'}>
          ${config.label} (${remaining})
        </button>
      `;
    }).join('');

  const handCards = convict.hand.map((cardId, handIndex) => {
    const card = cardDetails(runtime, cardId);
    const canSelectCard = runtime.gameState.turn.phase === 'select-cards';
    return `
      <article class="wd-skill-card">
        <div class="wd-skill-card-top">
          <div class="wd-skill-card-role">${escapeHtml(card?.timing || card?.role || 'skill')}</div>
          <button class="wd-skill-play-btn" data-wd-action="play-card" data-hand-index="${handIndex}" ${canSelectCard ? '' : 'disabled'}>Select</button>
        </div>
        <div class="wd-skill-card-title">${escapeHtml(card?.name || cardId)}</div>
        <div class="wd-skill-card-text">${escapeHtml(card?.text || '')}</div>
      </article>
    `;
  }).join('');

  const activeCards = ACTIVE_DECK_GROUPS.flatMap(config => {
    const cardIds = runtime.gameState.activeCards?.[config.activeGroup] || [];
    return cardIds.map((cardId, activeIndex) => {
      const card = activeCardDetails(runtime, config, cardId);
      return `
        <article class="wd-active-card">
          <div class="wd-active-card-top">
            <div class="wd-active-card-type">${escapeHtml(config.label)}</div>
            <button class="wd-skill-play-btn" data-wd-action="resolve-active" data-active-group="${config.activeGroup}" data-active-index="${activeIndex}">
              Resolve
            </button>
          </div>
          <div class="wd-active-card-title">${escapeHtml(card?.name || cardId)}</div>
          <div class="wd-active-card-text">${escapeHtml(card?.text || '')}</div>
        </article>
      `;
    });
  }).join('');

  playbar.innerHTML = `
    <div class="wd-playbar">
      <div class="wd-phase-bar">
        <div class="wd-phase-copy">
          <div class="wd-playbar-eyebrow">Round Structure</div>
          <div class="wd-playbar-title">Round ${runtime.gameState.turn.round}</div>
          <div class="wd-playbar-meta">Current phase: ${escapeHtml(formatPhaseName(runtime.gameState.turn.phase))}</div>
        </div>
        <div class="wd-phase-buttons">
          <button class="wd-playbar-mini-btn" data-wd-action="phase-prev">Previous Phase</button>
          <button class="wd-playbar-mini-btn" data-wd-action="phase-next">Next Phase</button>
          <button class="wd-playbar-mini-btn" data-wd-action="round-next">Next Round</button>
        </div>
      </div>
      <div class="wd-phase-track">
        ${WARDENS_DEBT_PHASE_SEQUENCE.map(phase => `
          <div class="wd-phase-chip${runtime.gameState.turn.phase === phase ? ' is-active' : ''}">
            ${escapeHtml(formatPhaseName(phase))}
          </div>
        `).join('')}
      </div>
      <div class="wd-playbar-top">
        <div class="wd-playbar-players">
          ${(runtime.gameState.convicts || []).map((entry, idx) => `
            <button class="wd-player-tab${idx === activeConvictIndex ? ' is-active' : ''}" data-wd-action="select-convict" data-convict-index="${idx}">
              ${escapeHtml(entry.name)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="wd-playbar-actions">
        <div class="wd-playbar-copy">
          <div class="wd-playbar-eyebrow">Convict</div>
          <div class="wd-playbar-title">${escapeHtml(convict.name)}</div>
          <div class="wd-playbar-meta">${drawCountLabel(convict)}</div>
        </div>
        <div class="wd-playbar-buttons">
          <button class="wd-playbar-btn" data-wd-action="draw-convict" ${(convict.drawPile.length || convict.discardPile.length) ? '' : 'disabled'}>Draw Starter</button>
          <button class="wd-playbar-btn" data-wd-action="redraw-hand" ${(convict.hand.length || convict.drawPile.length || convict.discardPile.length) ? '' : 'disabled'}>Redraw Hand</button>
          ${commonDeckButtons}
          ${activeDeckButtons}
        </div>
      </div>
      ${statusMessage ? `<div class="wd-playbar-status">${escapeHtml(statusMessage)}</div>` : ''}
      <div class="wd-playbar-subhead">Hand</div>
      <div class="wd-playbar-hand">
        ${handCards || '<div class="wd-playbar-empty">No skill cards in hand.</div>'}
      </div>
      ${queuedSkillSections(runtime)}
      <div class="wd-playbar-subhead">Active Cards</div>
      <div class="wd-playbar-hand">
        ${activeCards || '<div class="wd-playbar-empty">No active cards.</div>'}
      </div>
    </div>
  `;
}

export function renderElements() {
  const playbar = document.getElementById('wd-playbar');
  if (!playbar) return;

  const runtime = getWardensDebtRuntime();
  if (runtime.status === 'loading' || runtime.status === 'idle') {
    renderLoading(playbar);
    return;
  }
  if (runtime.status === 'error') {
    renderError(playbar, runtime);
    return;
  }
  renderReady(playbar, runtime);
}

function setStatus(message) {
  statusMessage = message;
  renderElements();
}

function handleAction(actionButton) {
  const action = actionButton.dataset.wdAction;
  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState || !runtime.index) return;

  try {
    syncActiveConvictWithSelection(runtime);
    if (action === 'select-convict') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      if (!Number.isInteger(convictIndex) || !runtime.gameState.convicts[convictIndex]) return;
      activeConvictIndex = convictIndex;
      selectFromStack('wd-convict', convictIndex);
      statusMessage = '';
      return;
    }

    if (action === 'phase-prev') {
      const result = retreatWardensDebtPhase(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      setStatus(`Moved to ${formatPhaseName(result.phase)} in round ${result.round}.`);
      return;
    }

    if (action === 'phase-next') {
      const result = advanceWardensDebtPhase(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      const drawnEventIds = result.automationResult?.eventDraws?.map(item => item.drawnCardId).filter(Boolean) || [];
      const resolvedSkillIds = result.automationResult?.resolvedSkills?.map(item => item.cardId).filter(Boolean) || [];
      const discardedSkillIds = result.automationResult?.discardedSkills?.map(item => item.cardId).filter(Boolean) || [];
      const parts = [];
      if (drawnEventIds.length) parts.push(`Event drew ${drawnEventIds.join(', ')}`);
      if (resolvedSkillIds.length) parts.push(`Resolved ${resolvedSkillIds.join(', ')}`);
      if (discardedSkillIds.length) parts.push(`Discarded ${discardedSkillIds.join(', ')}`);
      const extra = parts.length ? ` ${parts.join('. ')}.` : '';
      setStatus(`Moved to ${formatPhaseName(result.phase)} in round ${result.round}.${extra}`);
      return;
    }

    if (action === 'round-next') {
      const result = startNextWardensDebtRound(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      setStatus(`Started round ${result.round}.`);
      return;
    }

    if (action === 'draw-convict') {
      const result = drawWardensDebtConvictCard(runtime.gameState, runtime.index, activeConvictIndex, 1);
      setWardensDebtGameState(result.gameState);
      setStatus(`Drew ${result.drawnCount} card for ${runtime.gameState.convicts[activeConvictIndex].name}.`);
      return;
    }

    if (action === 'redraw-hand') {
      const result = redrawWardensDebtConvictHand(runtime.gameState, runtime.index, activeConvictIndex);
      setWardensDebtGameState(result.gameState);
      setStatus(`Redrew ${runtime.gameState.convicts[activeConvictIndex].name} to ${result.handCount} card(s).`);
      return;
    }

    if (action === 'draw-common') {
      const deckIndex = Number(actionButton.dataset.deckIndex);
      const result = drawWardensDebtDeckCard(runtime.gameState, runtime.index, {
        group: 'commonSkillDecks',
        index: deckIndex,
        convictIndex: activeConvictIndex,
      });
      setWardensDebtGameState(result.gameState);
      setStatus(`Added ${result.drawnCardId} to ${runtime.gameState.convicts[activeConvictIndex].name} hand.`);
      return;
    }

    if (action === 'draw-active') {
      const deckGroup = actionButton.dataset.deckGroup;
      if (!deckGroup) return;
      const result = drawWardensDebtDeckCard(runtime.gameState, runtime.index, { group: deckGroup });
      setWardensDebtGameState(result.gameState);
      setStatus(`Drew ${result.drawnCardId} into the active area.`);
      return;
    }

    if (action === 'play-card') {
      const handIndex = Number(actionButton.dataset.handIndex);
      const result = playWardensDebtSkillCard(
        runtime.gameState,
        runtime.index,
        activeConvictIndex,
        handIndex,
        selectedTargetRef(runtime)
      );
      setWardensDebtGameState(result.gameState);
      setStatus(`${runtime.gameState.convicts[activeConvictIndex].name} selected ${result.cardId} for ${result.timing}.`);
      return;
    }

    if (action === 'resolve-active') {
      const activeGroup = actionButton.dataset.activeGroup;
      const activeIndex = Number(actionButton.dataset.activeIndex);
      if (!activeGroup || !Number.isInteger(activeIndex)) return;
      const result = resolveWardensDebtActiveCardToDiscard(runtime.gameState, runtime.index, activeGroup, activeIndex);
      setWardensDebtGameState(result.gameState);
      setStatus(`Resolved ${result.cardId} to ${activeGroup} discard.`);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
}

export function initElements() {
  const playbar = document.getElementById('wd-playbar');
  if (!playbar) return;

  playbar.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-wd-action]');
    if (!actionButton) return;
    handleAction(actionButton);
  });

  subscribeWardensDebtRuntime(() => {
    statusMessage = '';
    renderElements();
  });
  subscribeUI(renderElements);
  renderElements();
}
