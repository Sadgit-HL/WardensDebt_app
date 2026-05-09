import {
  advanceWardensDebtPhase,
  drawWardensDebtDeckCard,
  drawWardensDebtConvictCard,
  playWardensDebtSkillCard,
  unplayWardensDebtSkillCard,
  discardWardensDebtSkillCard,
  redrawWardensDebtConvictHand,
  refreshWardensDebtActiveDeck,
  rollWardensDebtDie,
  rollWardensDebtDicePool,
  retreatWardensDebtPhase,
  startNextWardensDebtRound,
} from './gameplay.js';
import {
  getWardensDebtRuntime,
  setWardensDebtGameState,
  updateWardensDebtGameStateViaAction,
  subscribeWardensDebtRuntime,
} from './runtime.js';
import { uiState, selectFromStack, subscribeUI, openAddPanel, closeAddPanel, clearSelection } from '../uiState.js';
import { addPanel, handlePanelClick, wardensDebtObjectPanel, wardensDebtMapTilePanel } from '../sidebar.js';

let activeConvictIndex = 0;

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
  return runtime.index?.skillDefsById.get(cardId) || null;
}

const ACTIVE_DECK_GROUPS = [
  { deckGroup: 'enemyDeck', activeGroup: 'enemy', label: 'Enemy', indexKey: 'enemyDefsById', hasSep: true },
  { deckGroup: 'eventDeck', activeGroup: 'event', label: 'Event', indexKey: 'eventDefsById', perConvict: true, hasSep: true },
  { deckGroup: 'itemDeck', activeGroup: 'item', label: 'Item', indexKey: 'itemDefsById', hasSep: true },
  { deckGroup: 'locationDeck', activeGroup: 'location', label: 'Location', indexKey: 'locationDefsById', hasHover: true, hasSep: true },
  { deckGroup: 'agendaDeck', activeGroup: 'agenda', label: 'Agenda', indexKey: 'agendaDefsById', hasHover: true },
  { deckGroup: 'missionDeck', activeGroup: 'mission', label: 'Mission', indexKey: 'missionDefsById', hasHover: true },
];

function cardHoverDetailHtml(card, activeGroup) {
  const parts = [];
  if (card.text) parts.push(`<div class="wd-hover-text">${escapeHtml(card.text)}</div>`);
  if (activeGroup === 'location') {
    if (card.mapTileIds?.length) parts.push(`<div class="wd-hover-meta">Tiles: ${escapeHtml(card.mapTileIds.join(', '))}</div>`);
    if (card.enemyCardIds?.length) parts.push(`<div class="wd-hover-meta">Enemies: ${escapeHtml(card.enemyCardIds.join(', '))}</div>`);
  }
  if (card.effects?.length) {
    const fx = card.effects.map(e =>
      `<div class="wd-hover-effect">${escapeHtml(e.type)}: ${escapeHtml(e.target)}${e.amount != null ? ` (${e.amount})` : ''}</div>`
    ).join('');
    parts.push(`<div class="wd-hover-effects">${fx}</div>`);
  }
  return parts.length ? parts.join('') : '<div class="wd-hover-text">—</div>';
}

function skillCardHoverDetailHtml(card) {
  const parts = [];
  const meta = [card.timing, card.role, card.cost != null ? `Cost ${card.cost}` : null].filter(Boolean);
  if (meta.length) parts.push(`<div class="wd-hover-meta">${escapeHtml(meta.join(' · '))}</div>`);
  if (card.text) parts.push(`<div class="wd-hover-text">${escapeHtml(card.text)}</div>`);
  if (card.effects?.length) {
    const fx = card.effects.map(e =>
      `<div class="wd-hover-effect">${escapeHtml(e.type)}: ${escapeHtml(e.target)}${e.amount != null ? ` (${e.amount})` : ''}</div>`
    ).join('');
    parts.push(`<div class="wd-hover-effects">${fx}</div>`);
  }
  return parts.length ? parts.join('') : '<div class="wd-hover-text">—</div>';
}




function queuedSkillSections(runtime) {
  const queueConfigs = [
    { key: 'fastSkills', label: 'Fast Skills' },
    { key: 'slowSkills', label: 'Slow Skills' },
  ];

  const phase = runtime.gameState.turn?.phase;
  const canUnplay = phase === 'select-cards';
  const canDiscardFast = phase === 'fast-cards';

  return queueConfigs.map(config => {
    const fullQueue = runtime.gameState.activeCards?.[config.key] || [];
    const entries = fullQueue
      .map((qc, realIndex) => ({ qc, realIndex }))
      .filter(({ qc }) => qc.convictIndex === activeConvictIndex);
    if (!entries.length) return '';

    const canDiscard = (canDiscardFast && config.key === 'fastSkills') || (phase === 'slow-cards' && config.key === 'slowSkills');

    const cardsHtml = entries.map(({ qc: queuedCard, realIndex }) => {
      const card = cardDetails(runtime, queuedCard.cardId);
      const returnBtn = canUnplay
        ? `<button class="wd-active-card-return" data-wd-action="unplay-card" data-queue-name="${escapeHtml(config.key)}" data-queue-index="${realIndex}" title="Return to hand">&#8592;</button>`
        : '';
      const discardAttrs = canDiscard
        ? `data-wd-action="discard-card" data-queue-name="${escapeHtml(config.key)}" data-queue-index="${realIndex}"`
        : '';
      return `
        <div class="wd-card-hover-wrapper">
          <article class="wd-active-card${canDiscard ? ' is-playable' : ''}" ${discardAttrs}>
            ${returnBtn}
            <div class="wd-active-card-type">${escapeHtml(config.label)}</div>
            <div class="wd-active-card-title">${escapeHtml(card?.name || queuedCard.cardId)}</div>
            <div class="wd-active-card-text">${escapeHtml(card?.timing || '')}</div>
          </article>
          <div class="wd-card-hover wd-card-hover--up">
            <div class="wd-hover-title">${escapeHtml(card?.name || queuedCard.cardId)}</div>
            ${card ? skillCardHoverDetailHtml(card) : ''}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="wd-playbar-hand">${cardsHtml}</div>`;
  }).join('');
}

function formatPhaseName(phase) {
  return String(phase || '')
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ');
}

function renderLeftBar(runtime) {
  const leftBar = document.getElementById('left-bar');
  if (!leftBar) return;

  if (runtime.status !== 'ready' || !runtime.gameState?.convicts) {
    leftBar.innerHTML = '';
    return;
  }

  const otherConvicts = runtime.gameState.convicts.filter((_, idx) => idx !== activeConvictIndex);
  const html = otherConvicts.map((convict, idx) => {
    const originalIdx = runtime.gameState.convicts.indexOf(convict);
    return `
      <button class="wd-convict-thumb" data-wd-action="toggle-convict" data-convict-index="${originalIdx}" title="${escapeHtml(convict.name)}">
        <div class="wd-thumb-name">${escapeHtml(convict.name)}</div>
        <div class="wd-thumb-stats">${convict.currentHealth}/${convict.maxHealth}</div>
      </button>
    `;
  }).join('');

  leftBar.innerHTML = html;
}

function renderEnemyStrip(runtime) {
  const strip = document.getElementById('wd-enemy-strip');
  if (!strip) return;

  const enemies = runtime.gameState?.enemies || [];
  if (enemies.length === 0) {
    strip.innerHTML = '';
    return;
  }

  const seenDefIds = new Set();
  const uniqueEnemies = [];

  for (const enemy of enemies) {
    if (!seenDefIds.has(enemy.enemyDefId)) {
      seenDefIds.add(enemy.enemyDefId);
      const def = runtime.index?.enemyDefsById?.get(enemy.enemyDefId);
      if (def) {
        uniqueEnemies.push({ ...def, id: enemy.enemyDefId });
      }
    }
  }

  strip.innerHTML = uniqueEnemies.map(def => `
    <div class="wd-enemy-thumb-wrapper">
      <div class="wd-enemy-thumb">${escapeHtml((def.name || def.id).slice(0, 3))}</div>
      <div class="wd-enemy-thumb-hover">
        <div class="wd-hover-title">${escapeHtml(def.name || def.id)}</div>
        <div class="wd-hover-text">HP: ${def.health ?? '—'}</div>
        <div class="wd-hover-text">ATK: ${def.attack ?? '—'}</div>
      </div>
    </div>
  `).join('');
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
    phaseStrip.innerHTML = '';
    return;
  }

  phaseStrip.innerHTML = `
    <div class="wd-phase-current">${escapeHtml(formatPhaseName(runtime.gameState.turn.phase))}</div>
    <div class="wd-phase-buttons">
      <button class="wd-playbar-mini-btn" data-wd-action="phase-prev" title="Previous Phase" aria-label="Previous Phase">‹</button>
      <button class="wd-playbar-mini-btn" data-wd-action="phase-next" title="Next Phase" aria-label="Next Phase">›</button>
      <button class="wd-playbar-mini-btn" data-wd-action="round-next" title="Next Round" aria-label="Next Round">R+</button>
    </div>
  `;
}

function renderCounterStrip(runtime) {
  const counterStrip = document.getElementById('wd-counter-strip');
  if (!counterStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    counterStrip.innerHTML = '';
    return;
  }

  const { doom, debt } = runtime.gameState.counters || { doom: 0, debt: 0 };

  counterStrip.innerHTML = `
    <div class="wd-counter">
      <div class="wd-counter-label">Doom</div>
      <div class="wd-counter-controls">
        <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="doom" data-delta="-1">−</button>
        <div class="wd-counter-value">${doom}</div>
        <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="doom" data-delta="1">+</button>
      </div>
    </div>
    <div class="wd-counter">
      <div class="wd-counter-label">Debt</div>
      <div class="wd-counter-controls">
        <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="debt" data-delta="-1">−</button>
        <div class="wd-counter-value">${debt}</div>
        <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="debt" data-delta="1">+</button>
      </div>
    </div>
  `;
}

function renderSkillStrip(runtime) {
  const skillStrip = document.getElementById('wd-skill-strip');
  if (!skillStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    skillStrip.innerHTML = '';
    return;
  }

  const decks = runtime.gameState.decks?.commonSkillDecks || [];

  const groupsHtml = decks.map((deckState, deckIndex) => {
    const remaining = deckState.drawPile?.length ?? 0;

    return `
      <div class="wd-deck-group">
        <div class="wd-deck-label">Common ${decks.length > 1 ? deckIndex + 1 : ''}</div>
        <div class="wd-deck-active-cards"><div class="wd-deck-active-empty">—</div></div>
        <button class="wd-deck-draw-btn" data-wd-action="draw-common" data-deck-index="${deckIndex}" ${remaining > 0 ? '' : 'disabled'}>
          Draw
        </button>
      </div>
    `;
  }).join('');

  skillStrip.innerHTML = groupsHtml || '';
}

function renderDeckStrip(runtime) {
  const deckStrip = document.getElementById('wd-deck-strip');
  if (!deckStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    deckStrip.innerHTML = '';
    return;
  }

  const groupsHtml = ACTIVE_DECK_GROUPS
    .filter(config => runtime.gameState.decks?.[config.deckGroup])
    .map(config => {
      const deckState = runtime.gameState.decks[config.deckGroup];
      const activeCardIds = runtime.gameState.activeCards?.[config.activeGroup] || [];
      const remaining = deckState.drawPile?.length ?? 0;

      const activeCardsHtml = activeCardIds.length
        ? activeCardIds.map(cardId => {
            const card = runtime.index?.[config.indexKey]?.get(cardId);
            const nameHtml = `<div class="wd-deck-active-card">${escapeHtml(card?.name || cardId)}</div>`;
            if (!config.hasHover || !card) return nameHtml;
            return `
              <div class="wd-deck-active-card-wrapper">
                ${nameHtml}
                <div class="wd-deck-active-card-hover">
                  <div class="wd-hover-title">${escapeHtml(card.name)}</div>
                  ${cardHoverDetailHtml(card, config.activeGroup)}
                </div>
              </div>`;
          }).join('')
        : `<div class="wd-deck-active-empty">—</div>`;

      return `
        <div class="wd-deck-group${config.hasSep ? ' wd-deck-group--sep' : ''}">
          <div class="wd-deck-label">${escapeHtml(config.label)}</div>
          <div class="wd-deck-active-cards">${activeCardsHtml}</div>
          <button class="wd-deck-draw-btn" data-wd-action="refresh-active-deck" data-deck-group="${config.deckGroup}" ${config.perConvict ? 'data-per-convict="1"' : ''} ${remaining > 0 ? '' : 'disabled'}>
            Draw
          </button>
        </div>
      `;
    }).join('');

  deckStrip.innerHTML = groupsHtml || '';
}

function renderActiveStrip(runtime) {
  const activeStrip = document.getElementById('wd-active-strip');
  if (!activeStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    activeStrip.innerHTML = '';
    return;
  }

  activeStrip.innerHTML = queuedSkillSections(runtime);
}

function renderInfoPanel() {
  const panel = document.getElementById('info-panel');
  if (!panel) return;
  if (uiState.addPanelOpen) {
    panel.innerHTML = addPanel();
  } else {
    panel.innerHTML = '';
  }
}

function renderObjectPopover(runtime) {
  const popover = document.getElementById('wd-popover');
  if (!popover) return;

  if (uiState.emptyClickMenu) {
    const { clientX, clientY } = uiState.emptyClickMenu;
    const W = 36;
    const left = Math.max(8, Math.min(clientX - W / 2, window.innerWidth - W - 8));
    const top = Math.max(8, clientY + 8);
    popover.style.cssText = `display:block;left:${left}px;top:${top}px;width:${W}px;`;
    popover.innerHTML = `
      <div class="wd-ctx-menu">
        <button class="wd-ctx-item" data-wd-action="open-add">+</button>
      </div>`;
    return;
  }

  if (runtime.status !== 'ready' || !runtime.gameState) {
    popover.style.display = 'none';
    return;
  }

  const sel = uiState.selected;
  const mapTile = uiState.selectedWdMapTile;

  let anchorId = null;
  let html = null;

  if (sel?.kind === 'wd-convict' || sel?.kind === 'wd-enemy') {
    const arr = sel.kind === 'wd-convict' ? runtime.gameState.convicts : runtime.gameState.enemies;
    const obj = arr?.[sel.idx];
    if (!obj) { popover.style.display = 'none'; return; }
    anchorId = obj.id;
    html = wardensDebtObjectPanel(sel.kind, sel.idx);
  } else if (mapTile?.id) {
    anchorId = mapTile.id;
    html = wardensDebtMapTilePanel(runtime, mapTile.id);
  } else {
    popover.style.display = 'none';
    return;
  }

  const anchorEl = document.querySelector(`[data-wd-id="${CSS.escape(anchorId)}"]`);
  const rect = anchorEl?.getBoundingClientRect();
  if (!rect) { popover.style.display = 'none'; return; }

  const W = 280;
  const estimatedH = 320;
  let left = rect.left + rect.width / 2 - W / 2;
  const above = rect.top - estimatedH - 8 >= 8;
  const top = above ? rect.top - estimatedH - 8 : rect.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth - W - 8));

  popover.style.cssText = `display:block;left:${left}px;top:${top}px;`;
  popover.innerHTML = html;
}

function renderConvictPortrait(playbar, runtime) {
  const convict = activeConvict(runtime);
  if (!convict) {
    playbar.innerHTML = `
      <div class="wd-playbar wd-playbar--status">
        <div class="wd-playbar-copy">
          <div class="wd-playbar-eyebrow">Wardens Debt</div>
          <div class="wd-playbar-title">No convicts</div>
        </div>
      </div>
    `;
    return;
  }

  playbar.innerHTML = `
    <div class="wd-convict-portrait">
      <div class="wd-portrait-copy">
        <div class="wd-portrait-eyebrow">Convict</div>
        <div class="wd-portrait-title">${escapeHtml(convict.name)}</div>
      </div>
    </div>
  `;
}

function renderHandCards(runtime) {
  const handSection = document.getElementById('hand-section');
  if (!handSection) return;

  const convict = activeConvict(runtime);
  if (!convict || !convict.hand.length) {
    handSection.innerHTML = '';
    return;
  }

  const canPlay = runtime.gameState.turn.phase === 'select-cards';

  const handCards = convict.hand.map((cardId, handIndex) => {
    const card = cardDetails(runtime, cardId);
    return `
      <div class="wd-card-hover-wrapper">
        <article class="wd-skill-card${canPlay ? ' is-playable' : ''}" data-wd-action="play-card" data-hand-index="${handIndex}">
          <div class="wd-skill-card-top">
            <div class="wd-skill-card-role">${escapeHtml(card?.timing || card?.role || 'skill')}</div>
          </div>
          <div class="wd-skill-card-title">${escapeHtml(card?.name || cardId)}</div>
          <div class="wd-skill-card-text">${escapeHtml(card?.text || '')}</div>
        </article>
        <div class="wd-card-hover wd-card-hover--up">
          <div class="wd-hover-title">${escapeHtml(card?.name || cardId)}</div>
          ${card ? skillCardHoverDetailHtml(card) : ''}
        </div>
      </div>
    `;
  }).join('');

  handSection.innerHTML = handCards;
}


export function renderElements() {
  const playbar = document.getElementById('wd-playbar');
  if (!playbar) return;

  const runtime = getWardensDebtRuntime();

  if (runtime.status === 'loading' || runtime.status === 'idle') {
    renderLoading(playbar);
    renderHandCards(runtime);
    renderLeftBar(runtime);
    renderEnemyStrip(runtime);
    renderCounterStrip(runtime);
    renderSkillStrip(runtime);
    renderDeckStrip(runtime);
    renderActiveStrip(runtime);
    renderObjectPopover(runtime);
    renderPhaseStrip(runtime);
    renderDiceTray(runtime);
    renderInfoPanel();
    return;
  }

  if (runtime.status === 'error') {
    renderError(playbar, runtime);
    renderHandCards(runtime);
    renderLeftBar(runtime);
    renderEnemyStrip(runtime);
    renderCounterStrip(runtime);
    renderSkillStrip(runtime);
    renderDeckStrip(runtime);
    renderActiveStrip(runtime);
    renderObjectPopover(runtime);
    renderPhaseStrip(runtime);
    renderDiceTray(runtime);
    renderInfoPanel();
    return;
  }

  renderConvictPortrait(playbar, runtime);
  renderHandCards(runtime);
  renderLeftBar(runtime);
  renderEnemyStrip(runtime);
  renderCounterStrip(runtime);
  renderSkillStrip(runtime);
  renderDeckStrip(runtime);
  renderActiveStrip(runtime);
  renderObjectPopover(runtime);
  renderPhaseStrip(runtime);
  renderDiceTray(runtime);
  renderInfoPanel();
}

function handleAction(actionButton) {
  uiState.emptyClickMenu = null;
  const action = actionButton.dataset.wdAction;

  if (action === 'open-add') {
    openAddPanel();
    return;
  }


  const runtime = getWardensDebtRuntime();
  if (runtime.status !== 'ready' || !runtime.gameState || !runtime.index) return;

  try {
    syncActiveConvictWithSelection(runtime);

    if (action === 'toggle-convict') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      if (!Number.isInteger(convictIndex) || !runtime.gameState.convicts[convictIndex]) return;
      activeConvictIndex = convictIndex;
      selectFromStack('wd-convict', convictIndex);
      renderElements();
      return;
    }

    if (action === 'select-convict') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      if (!Number.isInteger(convictIndex) || !runtime.gameState.convicts[convictIndex]) return;
      activeConvictIndex = convictIndex;
      selectFromStack('wd-convict', convictIndex);
      return;
    }

    if (action === 'phase-prev') {
      const result = retreatWardensDebtPhase(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'phase-next') {
      const result = advanceWardensDebtPhase(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'round-next') {
      const result = startNextWardensDebtRound(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'draw-convict') {
      const result = drawWardensDebtConvictCard(runtime.gameState, runtime.index, activeConvictIndex, 1);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'redraw-hand') {
      const result = redrawWardensDebtConvictHand(runtime.gameState, runtime.index, activeConvictIndex);
      setWardensDebtGameState(result.gameState);
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
      return;
    }

    if (action === 'refresh-active-deck') {
      const deckGroup = actionButton.dataset.deckGroup;
      if (!deckGroup) return;
      const count = actionButton.dataset.perConvict
        ? runtime.gameState.convicts?.length || 1
        : 1;
      const result = refreshWardensDebtActiveDeck(runtime.gameState, runtime.index, deckGroup, count);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'adjust-counter') {
      const counter = actionButton.dataset.counter;
      const delta = Number(actionButton.dataset.delta);
      if (!counter || !Number.isInteger(delta)) return;
      updateWardensDebtGameStateViaAction('adjust-counter', { counter, delta });
      return;
    }


    if (action === 'roll-die') {
      const dieIndex = Number(actionButton.dataset.dieIndex);
      if (!Number.isInteger(dieIndex)) return;
      const result = rollWardensDebtDie(runtime.gameState, runtime.index, dieIndex);
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'roll-all-dice') {
      const result = rollWardensDebtDicePool(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
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
      return;
    }

    if (action === 'unplay-card') {
      const queueName = actionButton.dataset.queueName;
      const queueIndex = Number(actionButton.dataset.queueIndex);
      if (!queueName || !Number.isInteger(queueIndex)) return;
      const result = unplayWardensDebtSkillCard(
        runtime.gameState,
        runtime.index,
        activeConvictIndex,
        queueName,
        queueIndex
      );
      setWardensDebtGameState(result.gameState);
      return;
    }

    if (action === 'discard-card') {
      const queueName = actionButton.dataset.queueName;
      const queueIndex = Number(actionButton.dataset.queueIndex);
      if (!queueName || !Number.isInteger(queueIndex)) return;
      const result = discardWardensDebtSkillCard(
        runtime.gameState,
        runtime.index,
        activeConvictIndex,
        queueName,
        queueIndex
      );
      setWardensDebtGameState(result.gameState);
      return;
    }
  } catch (error) {
    console.error(error);
  }
}

export function initElements() {
  const playbar = document.getElementById('wd-playbar');
  const handSection = document.getElementById('hand-section');
  const activeSection = document.getElementById('active-section');
  const leftBar = document.getElementById('left-bar');
  const topBar = document.getElementById('top-bar');
  if (!playbar) return;

  const playerUi = document.getElementById('player-ui');
  if (playerUi) {
    const updatePlayerUiHeight = () => {
      document.documentElement.style.setProperty('--player-ui-height', `${playerUi.offsetHeight}px`);
    };
    updatePlayerUiHeight();
    new ResizeObserver(updatePlayerUiHeight).observe(playerUi);
  }

  const handleContainerClick = event => {
    const actionButton = event.target.closest('[data-wd-action]');
    if (!actionButton) return;
    handleAction(actionButton);
  };

  playbar?.addEventListener('click', handleContainerClick);
  handSection?.addEventListener('click', handleContainerClick);
  activeSection?.addEventListener('click', handleContainerClick);
  leftBar?.addEventListener('click', handleContainerClick);
  topBar?.addEventListener('click', handleContainerClick);

  const popover = document.getElementById('wd-popover');
  popover?.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-wd-action]');
    if (actionButton) { handleAction(actionButton); return; }
    handlePanelClick(event);
  });

  const infoPanel = document.getElementById('info-panel');
  if (infoPanel) {
    infoPanel.addEventListener('click', handlePanelClick);
    infoPanel.addEventListener('input', e => {
      if (e.target.id !== 'add-search') return;
      const pos = e.target.selectionStart;
      uiState.addPanelSearch = e.target.value;
      renderElements();
      const input = document.getElementById('add-search');
      if (input) { input.focus(); input.setSelectionRange(pos, pos); }
    });
  }

  subscribeWardensDebtRuntime(renderElements);
  subscribeUI(renderElements);
  renderElements();
}
