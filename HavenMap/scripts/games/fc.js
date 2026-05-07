const bg = null, dummy = null;
const SH = { left: 41, top: 35, w: 81, h: 70 };

const MONSTER_STATS = {
  // Placeholder: Add monster level stats as needed
};

const MONSTER_ROWS = [
  [37, 'Aesther Ashblade', 1, 1, 41, 35, bg, false, [dummy], false],
  [38, 'Aesther Scout', 1, 1, 41, 35, bg, false, [dummy], false],
  [39, 'Valrath Savage', 1, 1, 41, 35, bg, false, [dummy], false],
  [40, 'Valrath Tracker', 1, 1, 41, 35, bg, false, [dummy], false],
  // Bosses
  [14, 'Human Commander', 1, 1, 41, 35, bg, false],
  [15, 'Manifestation of Corruption', 1, 1, 41, 35, bg, false],
  [16, 'Valrath Commander', 1, 1, 41, 35, bg, false],
  [17, 'Selah Naberis', 1, 1, 41, 35, bg, false],
  [18, 'Sraka the_Wise', 1, 1, 41, 35, bg, false],
  [19, 'The Steel Lion', 1, 1, 41, 35, bg, false],
  [20, 'Uyart Ikkuma', 1, 1, 41, 35, bg, false],
].map(r => ({ ...SH, boss: false, game: 'fh', ...r }));

export default {
  id: 'fc',
  name: 'Forgotten Circles',
  base: 'gh',
  tiles: [],
  overlays: [],
  monsters: MONSTER_ROWS,
  monsterStats: MONSTER_STATS,
};
