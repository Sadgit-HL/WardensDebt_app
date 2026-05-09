import {
  calculateWardensDebtDiceTotal,
  rollWardensDebtDie,
  rollWardensDebtDicePool,
} from './gameplay.js';
import {
  getWardensDebtRuntime,
  initWardensDebtRuntime,
  reloadWardensDebtRuntime,
  setWardensDebtGameState,
  subscribeWardensDebtRuntime,
} from './runtime.js';

function createPanelElement() {
  const panel = document.createElement('aside');
  panel.id = 'wd-debug-panel';
  panel.innerHTML = `
    <div class="wd-debug-card">
      <div class="wd-debug-header">
        <div>
          <div class="wd-debug-eyebrow">Wardens Debt</div>
          <h2 class="wd-debug-title">Dice Test</h2>
        </div>
        <button type="button" class="wd-debug-reset" id="wd-debug-reset">Reload</button>
        <button type="button" class="wd-debug-reset" id="wd-debug-clear-url">Clear URL</button>
      </div>
      <div class="wd-debug-status" id="wd-debug-status">Loading prototype content...</div>
      <div class="wd-debug-scenario" id="wd-debug-scenario"></div>
      <div class="wd-debug-total-wrap">
        <div class="wd-debug-total-label">Relevant outcome</div>
        <div class="wd-debug-total" id="wd-debug-total">0</div>
        <button type="button" class="wd-debug-roll-all" id="wd-debug-roll-all">Roll All Dice</button>
      </div>
      <div class="wd-debug-dice" id="wd-debug-dice"></div>
    </div>
  `;
  return panel;
}

function renderDice(diceEl, runtime, onRoll) {
  if (!runtime.gameState?.dicePool?.length) {
    diceEl.innerHTML = '<div class="wd-debug-empty">No dice configured for this scenario.</div>';
    return;
  }

  diceEl.innerHTML = '';
  runtime.gameState.dicePool.forEach((dieState, dieIndex) => {
    const dieCard = document.createElement('section');
    dieCard.className = 'wd-debug-die';

    const value = dieState.currentValue == null ? '—' : String(dieState.currentValue);
    dieCard.innerHTML = `
      <div class="wd-debug-die-top">
        <div>
          <div class="wd-debug-die-id">${dieState.dieId}</div>
          <div class="wd-debug-die-meta">${dieState.sides}-sided die</div>
        </div>
        <div class="wd-debug-die-value">${value}</div>
      </div>
      <button type="button" class="wd-debug-roll" data-die-index="${dieIndex}">Roll</button>
    `;

    dieCard.querySelector('button')?.addEventListener('click', () => onRoll(dieIndex));
    diceEl.appendChild(dieCard);
  });
}

function renderPanel(panel, runtime, statusMessage = '') {
  const statusEl = panel.querySelector('#wd-debug-status');
  const scenarioEl = panel.querySelector('#wd-debug-scenario');
  const totalEl = panel.querySelector('#wd-debug-total');
  const diceEl = panel.querySelector('#wd-debug-dice');

  if (!statusEl || !scenarioEl || !totalEl || !diceEl) return;

  if (runtime.status === 'loading') {
    statusEl.textContent = statusMessage || 'Loading prototype content...';
    scenarioEl.textContent = '';
    totalEl.textContent = '0';
    diceEl.innerHTML = '<div class="wd-debug-empty">Dice test loading.</div>';
    return;
  }

  if (runtime.status === 'error') {
    statusEl.textContent = statusMessage || `Failed to load Wardens Debt prototype: ${runtime.error}`;
    scenarioEl.textContent = '';
    totalEl.textContent = '0';
    diceEl.innerHTML = '<div class="wd-debug-empty">Dice test unavailable.</div>';
    return;
  }

  statusEl.textContent = statusMessage || 'Prototype loaded.';
  scenarioEl.textContent = `Scenario: ${runtime.scenarioName}`;
  totalEl.textContent = String(calculateWardensDebtDiceTotal(runtime.gameState));
  renderDice(diceEl, runtime, runtime.onRoll);
}

export async function initWardensDebtDebugPanel() {
  const panel = createPanelElement();
  document.body.appendChild(panel);

  const resetButton = panel.querySelector('#wd-debug-reset');
  const clearUrlButton = panel.querySelector('#wd-debug-clear-url');
  const rollAllButton = panel.querySelector('#wd-debug-roll-all');
  let statusMessage = '';

  function runtimeView() {
    const runtime = getWardensDebtRuntime();
    return {
      ...runtime,
      onRoll: dieIndex => {
        try {
          const currentRuntime = getWardensDebtRuntime();
          const result = rollWardensDebtDie(currentRuntime.gameState, currentRuntime.index, dieIndex);
          setWardensDebtGameState(result.gameState);
          statusMessage = `Rolled ${result.rolledValue} on ${result.dieId}. Total: ${result.total}.`;
          renderPanel(panel, runtimeView(), statusMessage);
        } catch (error) {
          statusMessage = error instanceof Error ? error.message : String(error);
          renderPanel(panel, runtimeView(), statusMessage);
        }
      },
    };
  }

  subscribeWardensDebtRuntime(() => {
    renderPanel(panel, runtimeView(), statusMessage);
  });

  renderPanel(panel, runtimeView(), 'Loading prototype content...');

  resetButton?.addEventListener('click', () => {
    statusMessage = 'Loading prototype content...';
    void reloadWardensDebtRuntime();
  });

  rollAllButton?.addEventListener('click', () => {
    try {
      const runtime = getWardensDebtRuntime();
      const result = rollWardensDebtDicePool(runtime.gameState, runtime.index);
      setWardensDebtGameState(result.gameState);
      statusMessage = `Rolled all dice. Total: ${result.total}.`;
      renderPanel(panel, runtimeView(), statusMessage);
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
      renderPanel(panel, runtimeView(), statusMessage);
    }
  });

  clearUrlButton?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('wd');
    location.replace(url.toString());
  });

  await initWardensDebtRuntime();
}
