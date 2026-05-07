const bg = null, dummy = null;
const SH = { left: 41, top: 35, w: 81, h: 70 };

const MONSTER_STATS = {
  // Placeholder: Add monster level stats as needed
};

const OVERLAY_ROWS = [
  // ── Obstacles ────────────────────────────────────────────────────
  [37, 'Bombard', 1, 1, 45, 39, bg],
  [38, 'Spark', 1, 1, 45, 39, bg],
  [24, 'Ladder', 1, 1, 45, 39, bg],
].map(r => ({ ...r, game: 'fh' }));

const MONSTER_ROWS = [
  [55, 'Water Spirit', 1, 1, 41, 35, bg, false, [dummy], false],
  [56, 'Smoke Spirit', 1, 1, 41, 35, bg, false, [dummy], false],
  [57, 'Gnashing Drake', 1, 1, 41, 35, bg, false, [dummy], false],
  [25, 'Vermling Scavanger', 1, 1, 41, 35, bg, false],
  // Bosses
  [24, 'Shardrender', 1, 1, 41, 35, bg, false],
  [25, 'Talo', 1, 1, 41, 35, bg, false],
  [23, 'Harrower Bugflute', 1, 1, 41, 35, bg, false],
  [26, 'Valrath Vanquisher', 1, 1, 41, 35, bg, false],
  [27, 'Goremyon Shatter Mind', 1, 1, 41, 35, bg, false],
  [28, 'Inox Bloodguard', 1, 1, 41, 35, bg, false],
  [29, 'Ruinmaw', 1, 1, 41, 35, bg, false],
  [30, 'Terrorscale Drake', 1, 1, 41, 35, bg, false],
  [59, 'Ravenous Gharial', 1, 1, 41, 35, bg, false, [dummy], false],
].map(r => ({ ...SH, boss: false, game: 'fh', ...r }));

export default {
  id: 'cs',
  name: 'Crimson Scales',
  base: 'gh',
  tiles: [],
  overlays: OVERLAY_ROWS,
  monsters: MONSTER_ROWS,
  monsterStats: MONSTER_STATS,
};
