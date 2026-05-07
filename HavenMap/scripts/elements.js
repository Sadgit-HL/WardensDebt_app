import {
  advanceWardensDebtPhase,
  drawWardensDebtDeckCard,
  drawWardensDebtConvictCard,
  playWardensDebtSkillCard,
  redrawWardensDebtConvictHand,
  rollWardensDebtDie,
  rollWardensDebtDicePool,
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
import { uiState, selectFromStack, subscribeUI } from './uiState.js';

let activeConvictIndex = 0;
let statusMessage = '';
let playbarExpanded = false;
let selectedActiveCardRef = null;

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

function sharedDeckButtons(runtime) {
  return ACTIVE_DECK_GROUPS
    .filter(config => runtime.gameState.decks?.[config.deckGroup])
    .map(config => {
      const deckState = runtime.gameState.decks[config.deckGroup];
      const remaining = Array.isArray(deckState.drawPile) ? deckState.drawPile.length : 0;
      return `
        <button class="wd-shared-deck-btn" data-wd-action="draw-active" data-deck-group="${config.deckGroup}" ${remaining > 0 ? '' : 'disabled'}>
          <span class="wd-shared-deck-label">${config.label}</span>
          <span class="wd-shared-deck-count">${remaining}</span>
        </button>
      `;
    }).join('');
}

function queuedSkillSections(runtime) {
  const queueConfigs = [
    { key: 'fastSkills', label: 'Fast Skills' },
    { key: 'slowSkills', label: 'Slow Skills' },
  ];

  return queueConfigs.map(config => {
    const queue = runtime.gameState.activeCards?.[config.key] || [];
    if (!queue.length) return '';

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
        ${cardsHtml}
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

function renderDiceTray(runtime) {
  const diceTray = document.getElementById('wd-dice-tray');
  if (!diceTray) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    diceTray.innerHTML = '<div class="wd-tray-empty">Dice loading</div>';
    return;
  }

  const dicePool = runtime.gameState.dicePool || [];
  const diceTotal = dicePool.reduce((total, dieState) => {
    return total + (Number.isInteger(dieState.currentValue) ? dieState.currentValue : 0);
  }, 0);

  const diceHtml = dicePool.map((dieState, dieIndex) => `
    <button class="wd-tray-die" type="button" data-wd-action="roll-die" data-die-index="${dieIndex}" title="Roll ${escapeHtml(dieState.dieId)}" aria-label="Roll ${escapeHtml(dieState.dieId)}">
      <span class="wd-tray-die-value">${escapeHtml(dieState.currentValue ?? '•')}</span>
    </button>
  `).join('');

  diceTray.innerHTML = `
    <div class="wd-tray-total" title="Dice total">${diceTotal}</div>
    ${diceHtml || '<div class="wd-tray-empty">No dice</div>'}
    ${dicePool.length ? '<button class="wd-tray-roll-all" type="button" data-wd-action="roll-all-dice" title="Roll all dice">Roll</button>' : ''}
  `;
}

function renderPhaseStrip(runtime) {
  const phaseStrip = document.getElementById('wd-phase-strip');
  if (!phaseStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    phaseStrip.innerHTML = `
      <div class="wd-phase-strip-copy">
        <div class="wd-playbar-eyebrow">Round Structure</div>
        <div class="wd-playbar-title">Loading phases</div>
      </div>
    `;
    return;
  }

  phaseStrip.innerHTML = `
    <div class="wd-phase-strip-copy">
      <div class="wd-playbar-eyebrow">Round ${runtime.gameState.turn.round}</div>
      <div class="wd-playbar-meta">${escapeHtml(formatPhaseName(runtime.gameState.turn.phase))}</div>
    </div>
    <div class="wd-phase-track">
      ${WARDENS_DEBT_PHASE_SEQUENCE.map(phase => `
        <div class="wd-phase-chip${runtime.gameState.turn.phase === phase ? ' is-active' : ''}">
          ${escapeHtml(formatPhaseName(phase))}
        </div>
      `).join('')}
    </div>
    <div class="wd-phase-buttons">
      <button class="wd-playbar-mini-btn" data-wd-action="phase-prev" title="Previous Phase" aria-label="Previous Phase">‹</button>
      <button class="wd-playbar-mini-btn" data-wd-action="phase-next" title="Next Phase" aria-label="Next Phase">›</button>
      <button class="wd-playbar-mini-btn" data-wd-action="round-next" title="Next Round" aria-label="Next Round">R+</button>
    </div>
  `;
}

function renderSharedDeckTopbar(runtime) {
  const sharedDecks = document.getElementById('wd-shared-decks');
  if (!sharedDecks) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    sharedDecks.innerHTML = `
      <div class="wd-playbar-meta">Decks loading</div>
    `;
    return;
  }

  sharedDecks.innerHTML = `
    <div class="wd-shared-deck-list" aria-label="Shared decks">
      ${sharedDeckButtons(runtime) || '<div class="wd-playbar-empty">No shared decks.</div>'}
    </div>
  `;
}

function renderActiveStrip(runtime) {
  const activeStrip = document.getElementById('wd-active-strip');
  if (!activeStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    activeStrip.innerHTML = '';
    return;
  }

  let selectedDetailHtml = '';

  const groupsHtml = ACTIVE_DECK_GROUPS.map(config => {
    const cardIds = runtime.gameState.activeCards?.[config.activeGroup] || [];
    if (!cardIds.length) return '';

    const chipsHtml = cardIds.map((cardId, activeIndex) => {
      const card = activeCardDetails(runtime, config, cardId);
      const isSelected = selectedActiveCardRef?.activeGroup === config.activeGroup
        && selectedActiveCardRef?.activeIndex === activeIndex;
      if (isSelected) {
        selectedDetailHtml = `
          <article class="wd-active-strip-detail">
            <div class="wd-active-strip-detail-top">
              <div>
                <div class="wd-active-strip-type">${escapeHtml(config.label)}</div>
                <div class="wd-active-strip-detail-title">${escapeHtml(card?.name || cardId)}</div>
              </div>
              <button class="wd-active-strip-resolve" data-wd-action="resolve-active" data-active-group="${config.activeGroup}" data-active-index="${activeIndex}">Resolve</button>
            </div>
            ${card?.text ? `<div class="wd-active-strip-detail-text">${escapeHtml(card.text)}</div>` : ''}
          </article>
        `;
      }
      return `
        <button class="wd-active-strip-chip${isSelected ? ' is-selected' : ''}" data-wd-ui-action="select-active-card" data-active-group="${config.activeGroup}" data-active-index="${activeIndex}" title="${escapeHtml(card?.name || cardId)}">
          <span class="wd-active-strip-type">${escapeHtml(config.label)}</span>
          <span class="wd-active-strip-name">${escapeHtml(card?.name || cardId)}</span>
        </button>
      `;
    }).join('');

    return `<div class="wd-active-strip-group">${chipsHtml}</div>`;
  }).join('');

  activeStrip.innerHTML = groupsHtml
    ? `
      <div class="wd-active-strip-list" aria-label="Active shared cards">${groupsHtml}</div>
      ${selectedDetailHtml}
    `
    : '';
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

  playbar.innerHTML = `
    <div class="wd-playbar">
      <div class="wd-playbar-top">
        <div class="wd-playbar-players">
          ${(runtime.gameState.convicts || []).map((entry, idx) => `
            <button class="wd-player-tab${idx === activeConvictIndex ? ' is-active' : ''}" data-wd-action="select-convict" data-convict-index="${idx}">
              ${escapeHtml(entry.name)}
            </button>
          `).join('')}
        </div>
        <div class="wd-playbar-copy">
          <div class="wd-playbar-eyebrow">Convict</div>
          <div class="wd-playbar-title">${escapeHtml(convict.name)}</div>
          <div class="wd-playbar-meta">${drawCountLabel(convict)}</div>
        </div>
        <div class="wd-playbar-buttons">
          <button class="wd-playbar-btn" data-wd-action="draw-convict" ${(convict.drawPile.length || convict.discardPile.length) ? '' : 'disabled'}>Draw Starter</button>
          <button class="wd-playbar-btn" data-wd-action="redraw-hand" ${(convict.hand.length || convict.drawPile.length || convict.discardPile.length) ? '' : 'disabled'}>Redraw Hand</button>
          ${commonDeckButtons}
        </div>
      </div>
      ${statusMessage ? `<div class="wd-playbar-status">${escapeHtml(statusMessage)}</div>` : ''}
      ${handCards ? `
        <div class="wd-playbar-subhead">Hand</div>
        <div class="wd-playbar-hand">
          ${handCards}
        </div>
      ` : ''}
      ${queuedSkillSections(runtime)}
    </div>
  `;
}

function syncPlaybarExpandedState() {
  const elementBar = document.getElementById('element-bar');
  const toggle = document.getElementById('wd-playbar-toggle');
  elementBar?.classList.toggle('is-compact', !playbarExpanded);
  elementBar?.classList.toggle('is-expanded', playbarExpanded);
  if (toggle) {
    toggle.setAttribute('aria-expanded', playbarExpanded ? 'true' : 'false');
    toggle.textContent = playbarExpanded ? 'Hide Player Board' : 'Player Board';
  }
}

export function renderElements() {
  const playbar = document.getElementById('wd-playbar');
  if (!playbar) return;

  const runtime = getWardensDebtRuntime();
  if (runtime.status === 'loading' || runtime.status === 'idle') {
    renderLoading(playbar);
    renderSharedDeckTopbar(runtime);
    renderActiveStrip(runtime);
    renderPhaseStrip(runtime);
    renderDiceTray(runtime);
    syncPlaybarExpandedState();
    return;
  }
  if (runtime.status === 'error') {
    renderError(playbar, runtime);
    renderSharedDeckTopbar(runtime);
    renderActiveStrip(runtime);
    renderPhaseStrip(runtime);
    renderDiceTray(runtime);
    syncPlaybarExpandedState();
    return;
  }
  renderReady(playbar, runtime);
  renderSharedDeckTopbar(runtime);
  renderActiveStrip(runtime);
  renderPhaseStrip(runtime);
  renderDiceTray(runtime);
  syncPlaybarExpandedState();
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

    if (action === 'roll-die') {
      const dieIndex = Number(actionButton.dataset.dieIndex);
      if (!Number.isInteger(dieIndex)) return;
      const result = rollWardensDebtDie(runtime.gameState, runtime.index, dieIndex);
      setWardensDebtGameState(result.gameState);
      setStatus(`Rolled ${result.rolledValue} on ${result.dieId}. Total: ${result.total}.`);
      return;
    }

    if (action === 'roll-all-dice') {
      const result = rollWardensDebtDicePool(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      setStatus(`Rolled all dice. Total: ${result.total}.`);
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
      selectedActiveCardRef = null;
      setWardensDebtGameState(result.gameState);
      setStatus(`Resolved ${result.cardId} to ${activeGroup} discard.`);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
}

export function initElements() {
  const playbar = document.getElementById('wd-playbar');
  const elementBar = document.getElementById('element-bar');
  const topbar = document.getElementById('wd-topbar');
  if (!playbar || !elementBar) return;

  const handleContainerClick = event => {
    const uiButton = event.target.closest('[data-wd-ui-action]');
    if (uiButton?.dataset.wdUiAction === 'toggle-playbar') {
      playbarExpanded = !playbarExpanded;
      syncPlaybarExpandedState();
      return;
    }
    if (uiButton?.dataset.wdUiAction === 'select-active-card') {
      const activeGroup = uiButton.dataset.activeGroup;
      const activeIndex = Number(uiButton.dataset.activeIndex);
      if (!activeGroup || !Number.isInteger(activeIndex)) return;
      const isSameSelection = selectedActiveCardRef?.activeGroup === activeGroup
        && selectedActiveCardRef?.activeIndex === activeIndex;
      selectedActiveCardRef = isSameSelection ? null : { activeGroup, activeIndex };
      renderElements();
      return;
    }

    const actionButton = event.target.closest('[data-wd-action]');
    if (!actionButton) return;
    handleAction(actionButton);
  };

  elementBar.addEventListener('click', handleContainerClick);
  topbar?.addEventListener('click', handleContainerClick);

  subscribeWardensDebtRuntime(() => {
    statusMessage = '';
    renderElements();
  });
  subscribeUI(renderElements);
  renderElements();
  syncPlaybarExpandedState();
}
