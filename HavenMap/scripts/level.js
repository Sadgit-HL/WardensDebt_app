import { state, patch, subscribe } from './state.js';

export function renderLevel() {
  const label = document.getElementById('level-label');
  if (label) label.textContent = state.CurrentLevel;
}

export function initLevel() {
  renderLevel();
  subscribe(renderLevel);
  document.getElementById('settings-panel')?.addEventListener('click', e => {
    if (e.target.closest('#level-dec')) {
      patch({ CurrentLevel: Math.max(0, state.CurrentLevel - 1) });
    } else if (e.target.closest('#level-inc')) {
      patch({ CurrentLevel: Math.min(7, state.CurrentLevel + 1) });
    }
  });
}
