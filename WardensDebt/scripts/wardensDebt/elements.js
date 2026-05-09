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
  resolveWardensDebtTestAndContinue,
  calculateWardensDebtDiceTotal,
  WARDENS_DEBT_PHASE_SEQUENCE,
} from './gameplay.js';
import { PHASE_CONFIG } from './schema.js';
import {
  getWardensDebtRuntime,
  setWardensDebtGameState,
  updateWardensDebtGameStateViaAction,
  subscribeWardensDebtRuntime,
} from './runtime.js';
import { uiState, selectFromStack, subscribeUI, openAddPanel, closeAddPanel, clearSelection, openSettings, closeSettings, openSkillPick, closeSkillPick } from '../uiState.js';
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
  const subphase = runtime.gameState.turn?.subphase;
  const hasActiveTest = runtime.gameState?.activeTest !== null;
  const canUnplay = subphase === 'select-skill-cards' && !hasActiveTest;
  const canDiscardFast = phase === 'fast-skills' && !hasActiveTest;

  return queueConfigs.map(config => {
    const fullQueue = runtime.gameState.activeCards?.[config.key] || [];
    const entries = fullQueue
      .map((qc, realIndex) => ({ qc, realIndex }))
      .filter(({ qc }) => qc.convictIndex === activeConvictIndex);
    if (!entries.length) return '';

    const canDiscard = (canDiscardFast && config.key === 'fastSkills') || (phase === 'slow-skills' && config.key === 'slowSkills');

    const cardsHtml = entries.map(({ qc: queuedCard, realIndex }) => {
      const card = cardDetails(runtime, queuedCard.cardId);
      const hasTestEffect = card?.effects?.some(e => e.type === 'test');
      const isTestPending = hasActiveTest && runtime.gameState.activeTest?.sourceCardId === queuedCard.cardId;

      const returnBtn = canUnplay && !hasTestEffect
        ? `<button class="wd-active-card-return" data-wd-action="unplay-card" data-queue-name="${escapeHtml(config.key)}" data-queue-index="${realIndex}" title="Return to hand">&#8592;</button>`
        : '';

      const cardAttrs = hasTestEffect
        ? `data-wd-action="trigger-test" data-queue-name="${escapeHtml(config.key)}" data-queue-index="${realIndex}"`
        : (canDiscard ? `data-wd-action="discard-card" data-queue-name="${escapeHtml(config.key)}" data-queue-index="${realIndex}"` : '');

      const cardClass = isTestPending ? ' is-test-pending' : (canDiscard ? ' is-playable' : '');

      return `
        <div class="wd-card-hover-wrapper">
          <article class="wd-active-card${cardClass}" ${cardAttrs}>
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

function formatPhaseDisplay(phase) {
  return formatPhaseName(phase);
}

function renderPhaseNotification(runtime) {
  const panel = document.getElementById('phase-notification');
  if (!panel) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    panel.innerHTML = '';
    return;
  }

  const { phase, convictSubphases } = runtime.gameState.turn;
  const subphase = convictSubphases?.[activeConvictIndex] || null;
  const config = PHASE_CONFIG[phase];
  if (!config?.notification) {
    panel.innerHTML = '';
    return;
  }

  const { title, body } = config.notification;
  let html = `
    <div class="wd-notif-card">
      <div class="wd-notif-title">${escapeHtml(title)}</div>
      <div class="wd-notif-body">${escapeHtml(body)}</div>
    </div>`;

  if (subphase && config.subphaseNotifications?.[subphase]) {
    const sub = config.subphaseNotifications[subphase];
    html += `
    <div class="wd-notif-card is-subphase">
      <div class="wd-notif-title">${escapeHtml(sub.title)}</div>
      <div class="wd-notif-body">${escapeHtml(sub.body)}</div>
    </div>`;
  }

  panel.innerHTML = html;
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

  strip.querySelectorAll('.wd-enemy-thumb-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', (e) => {
      const hoverBox = wrapper.querySelector('.wd-enemy-thumb-hover');
      if (!hoverBox) return;
      const rect = hoverBox.getBoundingClientRect();
      const overflow = rect.right - window.innerWidth + 8;
      if (overflow > 0) {
        hoverBox.style.left = `${-overflow}px`;
      } else {
        hoverBox.style.left = '0';
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      const hoverBox = wrapper.querySelector('.wd-enemy-thumb-hover');
      if (hoverBox) hoverBox.style.left = '0';
    });
  });
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
  const diceTotal = calculateWardensDebtDiceTotal(runtime.gameState);
  const activeTest = runtime.gameState.activeTest;

  const diceHtml = dicePool.map((dieState, dieIndex) => `
    <button class="wd-tray-die" type="button" data-wd-action="roll-die" data-die-index="${dieIndex}" title="Roll ${escapeHtml(dieState.dieId)}" aria-label="Roll ${escapeHtml(dieState.dieId)}">
      <span class="wd-tray-die-value">${escapeHtml(dieState.currentValue ?? '•')}</span>
    </button>
  `).join('');

  const testContext = activeTest ? `
    <div class="wd-test-context">
      <div class="wd-test-label">${escapeHtml(activeTest.description)}</div>
      <div class="wd-test-info">
        <span>Difficulty: ${activeTest.difficulty}</span>
        <span>Total: ${diceTotal}${activeTest.modifier ? ` + ${activeTest.modifier}` : ''} = ${diceTotal + activeTest.modifier}</span>
      </div>
      <button class="wd-test-resolve" type="button" data-wd-action="resolve-test">Resolve Test</button>
    </div>
  ` : '';

  diceTray.innerHTML = `
    <div class="wd-tray-total" title="Dice total">${diceTotal}</div>
    ${diceHtml || '<div class="wd-tray-empty">No dice</div>'}
    ${dicePool.length ? '<button class="wd-tray-roll-all" type="button" data-wd-action="roll-all-dice" title="Roll all dice">Roll</button>' : ''}
    ${testContext}
  `;
}

function renderPhaseStrip(runtime) {
  const phaseStrip = document.getElementById('wd-phase-strip');
  if (!phaseStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    phaseStrip.innerHTML = '';
    return;
  }

  const { phase, phaseComplete } = runtime.gameState.turn;
  const allDone = phaseComplete.every(done => done);
  const disabledAttr = !allDone ? 'disabled' : '';

  phaseStrip.innerHTML = `
    <div class="wd-phase-current">${escapeHtml(formatPhaseDisplay(phase))}</div>
    <div class="wd-phase-buttons">
      <button class="wd-playbar-mini-btn" data-wd-action="phase-prev" title="Previous Phase" aria-label="Previous Phase">‹</button>
    </div>
  `;
}

function renderPhaseActions(runtime) {
  const panel = document.getElementById('phase-actions');
  if (!panel) return;

  // Hide phase-actions when add panel is open or test is pending
  if (uiState.addPanelOpen || (runtime.gameState?.activeTest)) {
    panel.innerHTML = '';
    return;
  }

  if (runtime.status !== 'ready' || !runtime.gameState) {
    panel.innerHTML = '';
    return;
  }

  const { phase, convictSubphases, phaseComplete } = runtime.gameState.turn;
  const convicts = runtime.gameState.convicts || [];

  let html = '';

  // For non-tactics phases: show single button to mark all convicts done (simultaneous action)
  if (phase !== 'tactics') {
    const allDone = phaseComplete.every(done => done);
    html += `<div class="wd-phase-action-card">
      <button class="wd-phase-complete-all" data-wd-action="complete-phase-all" ${allDone ? 'disabled' : ''}>Complete Phase</button>
    </div>`;
  }

  // For tactics phase only: show subphase buttons for active convict + completion status
  if (phase === 'tactics') {
    const activeConvict = convicts[activeConvictIndex];

    // Show subphase button for active convict if not yet done
    if (activeConvict && !phaseComplete[activeConvictIndex]) {
      const currentSubphase = convictSubphases[activeConvictIndex];
      const buttonLabel = currentSubphase === 'select-tactic'
        ? 'Tactics selected and resolved'
        : 'Skills selected';

      const tacticRequired = currentSubphase === 'select-tactic' && !activeConvict.selectedTacticId;

      html += `<div class="wd-phase-action-card">
        <button class="wd-convict-subphase-next" data-wd-action="complete-subphase" data-convict-index="${activeConvictIndex}" ${tacticRequired ? 'disabled' : ''}>${buttonLabel}</button>
      </div>`;
    }

    // Show completion status panel only to the active convict if they are waiting (already completed)
    const activeConvictIsWaiting = phaseComplete[activeConvictIndex];
    if (activeConvictIsWaiting) {
      html += '<div class="wd-phase-action-card"><div class="wd-phase-action-title">Completion</div>';
      convicts.forEach((convict, idx) => {
        const done = phaseComplete[idx];
        const checkmark = done ? ' ✓' : '';
        html += `<div class="wd-completion-status">${escapeHtml(convict.name || `Convict ${idx + 1}`)}${checkmark}</div>`;
      });
      html += '</div>';
    }
  }

  panel.innerHTML = html;
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
        <div class="wd-counter-value">${doom}</div>
        <div class="wd-counter-buttons">
          <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="doom" data-delta="1" title="Increase">↑</button>
          <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="doom" data-delta="-1" title="Decrease">↓</button>
        </div>
      </div>
    </div>
    <div class="wd-counter">
      <div class="wd-counter-label">Debt</div>
      <div class="wd-counter-controls">
        <div class="wd-counter-value">${debt}</div>
        <div class="wd-counter-buttons">
          <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="debt" data-delta="1" title="Increase">↑</button>
          <button class="wd-counter-btn" data-wd-action="adjust-counter" data-counter="debt" data-delta="-1" title="Decrease">↓</button>
        </div>
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

  deckStrip.querySelectorAll('.wd-deck-active-card-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', (e) => {
      const hoverBox = wrapper.querySelector('.wd-deck-active-card-hover');
      if (!hoverBox) return;
      const rect = hoverBox.getBoundingClientRect();
      const overflow = rect.right - window.innerWidth + 8;
      if (overflow > 0) {
        hoverBox.style.left = `${-overflow}px`;
      } else {
        hoverBox.style.left = '0';
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      const hoverBox = wrapper.querySelector('.wd-deck-active-card-hover');
      if (hoverBox) hoverBox.style.left = '0';
    });
  });
}

function renderTacticsStrip(runtime) {
  const tacticsStrip = document.getElementById('wd-tactics-strip');
  const tacticsSection = document.getElementById('tactics-section');
  const activeSection = document.getElementById('active-section');
  if (!tacticsStrip || !tacticsSection || !activeSection) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    tacticsSection.classList.add('hidden');
    activeSection.classList.remove('hidden');
    tacticsStrip.innerHTML = '';
    return;
  }

  const phase = runtime.gameState?.turn?.phase;
  const subphase = runtime.gameState?.turn?.convictSubphases?.[activeConvictIndex];

  // Show tactics section only in tactics 3.1 (select-tactic phase)
  const showTactics = phase === 'tactics' && subphase === 'select-tactic';

  tacticsSection.classList.toggle('hidden', !showTactics);
  activeSection.classList.toggle('hidden', showTactics);

  if (!showTactics) {
    tacticsStrip.innerHTML = '';
    return;
  }

  const STUB_TACTICS = [
    { id: 'tactic-charge',  name: 'Charge',  text: 'Move toward the nearest enemy and attack.' },
    { id: 'tactic-guard',   name: 'Guard',   text: 'Hold position and gain a defensive bonus.' },
    { id: 'tactic-retreat', name: 'Retreat', text: 'Fall back and prepare for the next round.' },
  ];

  const convict = runtime.gameState.convicts[activeConvictIndex];
  const selected = convict?.selectedTacticId;

  tacticsStrip.innerHTML = STUB_TACTICS.map(t => `
    <button
      class="wd-tactic-btn${selected === t.id ? ' is-selected' : ''}"
      data-wd-action="select-tactic"
      data-convict-index="${activeConvictIndex}"
      data-tactic-id="${escapeHtml(t.id)}"
      title="${escapeHtml(t.text)}"
    >
      <div class="wd-tactic-name">${escapeHtml(t.name)}</div>
      <div class="wd-tactic-text">${escapeHtml(t.text)}</div>
    </button>
  `).join('');
}

function renderActiveStrip(runtime) {
  const activeStrip = document.getElementById('wd-active-strip');
  if (!activeStrip) return;

  if (runtime.status !== 'ready' || !runtime.gameState) {
    activeStrip.innerHTML = '';
    return;
  }

  activeStrip.innerHTML = queuedSkillSections(runtime);

  activeStrip.querySelectorAll('.wd-card-hover-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', (e) => {
      const hoverBox = wrapper.querySelector('.wd-card-hover');
      if (!hoverBox) return;
      const rect = hoverBox.getBoundingClientRect();
      const overflow = rect.right - window.innerWidth + 8;
      if (overflow > 0) {
        hoverBox.style.left = `${-overflow}px`;
      } else {
        hoverBox.style.left = '0';
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      const hoverBox = wrapper.querySelector('.wd-card-hover');
      if (hoverBox) hoverBox.style.left = '0';
    });
  });
}

function renderSettingsButton(runtime) {
  const section = document.getElementById('settings-section');
  if (!section) return;
  section.innerHTML = `
    <button class="wd-settings-btn" data-wd-action="open-settings" title="Settings" aria-label="Settings">⚙</button>
  `;
}

function renderSettingsModal(runtime) {
  const overlay = document.getElementById('settings-modal-overlay');
  const modal = document.getElementById('settings-modal');
  if (!overlay || !modal) return;

  if (!uiState.settingsOpen) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'flex';
  modal.innerHTML = `
    <div class="wd-settings-header">
      <h2>Settings</h2>
      <button class="wd-settings-close" data-wd-action="close-settings" aria-label="Close settings">✕</button>
    </div>
    <div class="wd-settings-content">
      <button class="wd-settings-option" data-wd-action="reset-url">Reset URL</button>
    </div>
  `;
}

function renderSkillPickPanel(runtime) {
  const overlay = document.getElementById('skill-pick-overlay');
  const panel = document.getElementById('skill-pick-panel');
  if (!overlay || !panel) return;

  if (!uiState.skillPickOpen) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'flex';

  const offeredCardIds = uiState.skillPickOfferedCards || [];
  const cardDefs = offeredCardIds
    .map(id => ({ id, def: runtime.index?.skillDefsById?.get(id) }))
    .filter(({ def }) => def);

  const cardGrid = cardDefs
    .map(({ id, def }) => {
      const isSelected = uiState.skillPickSelectedCard === id;
      const hoverHtml = skillCardHoverDetailHtml(def);
      return `
        <div class="skill-pick-card${isSelected ? ' selected' : ''}" data-wd-action="skill-pick-select" data-card-id="${escapeHtml(id)}">
          <div class="skill-pick-card-title">${escapeHtml(def.name)}</div>
          <div class="wd-card-hover" style="display:none">
            ${hoverHtml}
          </div>
        </div>
      `;
    })
    .join('');

  const confirmDisabled = !uiState.skillPickSelectedCard ? 'disabled' : '';
  panel.innerHTML = `
    <h3 style="margin: 0 0 12px 0;">Select a Skill Card</h3>
    <div class="skill-pick-grid">
      ${cardGrid}
    </div>
    <div class="skill-pick-actions">
      <button data-wd-action="skill-pick-cancel" type="button">Cancel</button>
      <button data-wd-action="skill-pick-confirm" type="button" ${confirmDisabled}>Confirm</button>
    </div>
  `;
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
    const W = 48;
    const left = Math.max(8, Math.min(clientX - W / 2, window.innerWidth - W - 8));
    const top = Math.max(8, clientY + 8);
    popover.style.cssText = `display:block;left:${left}px;top:${top}px;width:${W}px;`;
    popover.innerHTML = `
      <div class="wd-ctx-menu">
        <button class="wd-ctx-item" data-wd-action="open-add" title="Add figure">+</button>
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

  const canPlay = runtime.gameState.turn.convictSubphases[activeConvictIndex] === 'select-skill-cards';

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

  handSection.querySelectorAll('.wd-card-hover-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', (e) => {
      const hoverBox = wrapper.querySelector('.wd-card-hover');
      if (!hoverBox) return;
      const rect = hoverBox.getBoundingClientRect();
      const overflow = rect.right - window.innerWidth + 8;
      if (overflow > 0) {
        hoverBox.style.left = `${-overflow}px`;
      } else {
        hoverBox.style.left = '0';
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      const hoverBox = wrapper.querySelector('.wd-card-hover');
      if (hoverBox) hoverBox.style.left = '0';
    });
  });
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
    renderTacticsStrip(runtime);
    renderActiveStrip(runtime);
    renderObjectPopover(runtime);
    renderPhaseStrip(runtime);
    renderPhaseNotification(runtime);
    renderPhaseActions(runtime);
    renderDiceTray(runtime);
    renderInfoPanel();
    renderSkillPickPanel(runtime);
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
    renderTacticsStrip(runtime);
    renderActiveStrip(runtime);
    renderObjectPopover(runtime);
    renderPhaseStrip(runtime);
    renderPhaseNotification(runtime);
    renderPhaseActions(runtime);
    renderDiceTray(runtime);
    renderInfoPanel();
    renderSkillPickPanel(runtime);
    return;
  }

  renderConvictPortrait(playbar, runtime);
  renderHandCards(runtime);
  renderLeftBar(runtime);
  renderEnemyStrip(runtime);
  renderCounterStrip(runtime);
  renderSkillStrip(runtime);
  renderDeckStrip(runtime);
  renderTacticsStrip(runtime);
  renderActiveStrip(runtime);
  renderSettingsButton(runtime);
  renderSettingsModal(runtime);
  renderSkillPickPanel(runtime);
  renderObjectPopover(runtime);
  renderPhaseStrip(runtime);
  renderPhaseNotification(runtime);
  renderPhaseActions(runtime);
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

  if (action === 'open-settings') {
    openSettings();
    return;
  }

  if (action === 'close-settings') {
    closeSettings();
    return;
  }

  if (action === 'reset-url') {
    const url = new URL(location.href);
    url.searchParams.delete('wd');
    location.replace(url.toString());
    return;
  }

  if (action === 'skill-pick-select') {
    const cardId = actionButton.dataset.cardId;
    if (!cardId) return;
    uiState.skillPickSelectedCard = cardId;
    renderElements();
    return;
  }

  if (action === 'skill-pick-confirm') {
    const runtime = getWardensDebtRuntime();
    if (runtime.status !== 'ready' || !runtime.gameState) return;
    const deckIndex = uiState.skillPickDeckIndex;
    const chosenCardId = uiState.skillPickSelectedCard;
    const offeredCardIds = uiState.skillPickOfferedCards;
    if (!Number.isInteger(deckIndex) || !chosenCardId || !offeredCardIds?.length) return;
    updateWardensDebtGameStateViaAction('take-skill-card', {
      deckIndex,
      convictIndex: activeConvictIndex,
      chosenCardId,
      offeredCardIds,
    });
    closeSkillPick();
    return;
  }

  if (action === 'skill-pick-cancel') {
    closeSkillPick();
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

    if (action === 'complete-phase') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      updateWardensDebtGameStateViaAction('complete-phase', { convictIndex });
      return;
    }

    if (action === 'complete-subphase') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      const { phase, convictSubphases, phaseComplete } = runtime.gameState.turn;
      const phaseConfig = PHASE_CONFIG[phase];
      const currentSubphase = convictSubphases[convictIndex];

      if (!phaseConfig?.subphases || !currentSubphase) return;

      const currentIdx = phaseConfig.subphases.indexOf(currentSubphase);
      if (currentIdx === -1) return;

      // Apply the subphase advance
      const newConvictSubphases = [...convictSubphases];
      const newPhaseComplete = [...phaseComplete];
      const isLastSubphase = currentIdx === phaseConfig.subphases.length - 1;

      if (isLastSubphase) {
        newConvictSubphases[convictIndex] = null;
        newPhaseComplete[convictIndex] = true;
      } else {
        newConvictSubphases[convictIndex] = phaseConfig.subphases[currentIdx + 1];
      }

      const stateAfterSubphase = {
        ...runtime.gameState,
        turn: { ...runtime.gameState.turn, convictSubphases: newConvictSubphases, phaseComplete: newPhaseComplete },
      };

      // If all convicts are done, auto-advance phase
      if (newPhaseComplete.every(done => done)) {
        try {
          const result = advanceWardensDebtPhase(stateAfterSubphase, runtime.index);
          setWardensDebtGameState(result.gameState);
        } catch (e) {
          console.warn('Phase automation failed:', e.message);
          // Advance phase anyway by manually setting it without automation
          const currentPhaseIndex = WARDENS_DEBT_PHASE_SEQUENCE.indexOf(stateAfterSubphase.turn.phase);
          const nextPhaseIndex = currentPhaseIndex === WARDENS_DEBT_PHASE_SEQUENCE.length - 1 ? 0 : currentPhaseIndex + 1;
          const nextPhase = WARDENS_DEBT_PHASE_SEQUENCE[nextPhaseIndex];
          const phaseConfig = PHASE_CONFIG[nextPhase];
          const nextRound = nextPhaseIndex === 0 ? stateAfterSubphase.turn.round + 1 : stateAfterSubphase.turn.round;

          const phaseAdvancedState = {
            ...stateAfterSubphase,
            turn: {
              ...stateAfterSubphase.turn,
              phase: nextPhase,
              round: nextRound,
              phaseComplete: stateAfterSubphase.convicts.map(() => false),
              convictSubphases: stateAfterSubphase.convicts.map(() => phaseConfig?.subphases?.[0] || null),
            },
          };
          setWardensDebtGameState(phaseAdvancedState);
        }
      } else {
        setWardensDebtGameState(stateAfterSubphase);
      }
      return;
    }

    if (action === 'complete-phase-all') {
      // Apply complete-phase-all action: mark all convicts done
      const phaseComplete = runtime.gameState.turn.phaseComplete.map(() => true);
      const stateAfterAction = {
        ...runtime.gameState,
        turn: { ...runtime.gameState.turn, phaseComplete },
      };

      // Auto-advance phase
      try {
        const result = advanceWardensDebtPhase(stateAfterAction, runtime.index);
        setWardensDebtGameState(result.gameState);
      } catch (e) {
        console.warn('Phase advancement blocked:', e.message);
        // If advance fails, at least update the phase completion
        setWardensDebtGameState(stateAfterAction);
      }
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
      const deck = runtime.gameState.decks?.commonSkillDecks?.[deckIndex];
      if (deck && deck.drawPile.length > 0) {
        const offered = deck.drawPile.slice(0, 4);
        openSkillPick(deckIndex, offered);
      }
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

    if (action === 'select-tactic') {
      const convictIndex = Number(actionButton.dataset.convictIndex);
      const tacticId = actionButton.dataset.tacticId;
      if (!Number.isInteger(convictIndex) || !tacticId) return;
      updateWardensDebtGameStateViaAction('select-tactic', { convictIndex, tacticId });
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

    if (action === 'trigger-test') {
      const queueName = actionButton.dataset.queueName;
      const queueIndex = Number(actionButton.dataset.queueIndex);
      const queue = runtime.gameState.activeCards?.[queueName];
      const queuedCard = queue?.[queueIndex];
      if (!queuedCard) return;

      const card = cardDetails(runtime, queuedCard.cardId);
      const testEffect = card?.effects?.find(e => e.type === 'test');
      if (!testEffect) return;

      const nextState = structuredClone(runtime.gameState);
      nextState.activeTest = {
        convictIndex: queuedCard.convictIndex,
        difficulty: testEffect.difficulty || 0,
        description: testEffect.description || 'Test',
        successEffects: testEffect.successEffects || [],
        failEffects: testEffect.failEffects || [],
        modifier: 0,
        sourceCardId: queuedCard.cardId,
      };
      setWardensDebtGameState(nextState);
      return;
    }

    if (action === 'resolve-test') {
      if (!runtime.gameState.activeTest) return;
      const { gameState: nextState } = resolveWardensDebtTestAndContinue(runtime.gameState, runtime.index);
      setWardensDebtGameState(nextState);
      return;
    }

    if (action === 'add-test-modifier') {
      if (!runtime.gameState.activeTest) return;
      const handIndex = Number(actionButton.dataset.handIndex);
      const modifierAmount = Number(actionButton.dataset.modifierAmount);
      if (!Number.isInteger(handIndex) || !Number.isInteger(modifierAmount)) return;
      updateWardensDebtGameStateViaAction('add-test-modifier', {
        convictIndex: activeConvictIndex,
        handIndex,
        modifierAmount,
      });
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
      if (runtime.gameState?.activeTest) return;
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
      if (runtime.gameState?.activeTest) return;
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
  document.getElementById('tactics-section')?.addEventListener('click', handleContainerClick);
  leftBar?.addEventListener('click', handleContainerClick);
  topBar?.addEventListener('click', handleContainerClick);
  document.getElementById('settings-section')?.addEventListener('click', handleContainerClick);
  document.getElementById('wd-dice-tray')?.addEventListener('click', handleContainerClick);

  const settingsModal = document.getElementById('settings-modal');
  const settingsOverlay = document.getElementById('settings-modal-overlay');
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', event => {
      if (event.target === settingsOverlay) {
        closeSettings();
      }
    });
  }
  settingsModal?.addEventListener('click', handleContainerClick);

  const skillPickPanel = document.getElementById('skill-pick-panel');
  const skillPickOverlay = document.getElementById('skill-pick-overlay');
  if (skillPickOverlay) {
    skillPickOverlay.addEventListener('click', event => {
      if (event.target === skillPickOverlay) {
        closeSkillPick();
      }
    });
  }
  skillPickPanel?.addEventListener('click', handleContainerClick);

  document.getElementById('phase-actions')?.addEventListener('click', handleContainerClick);

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
