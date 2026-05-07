const bg = null, dummy = null, jotl = null;
const SH = { left: 41, top: 35, w: 81, h: 70 };

const OVERLAY_ROWS = [
  [35, 'Destruction', 1, 1, 45, 39, bg],
  [36, 'Favorite', 1, 1, 45, 39, bg],
].map(r => ({ ...r, game: 'fh' }));


const TILE_ROWS = [
  [31, 'jl01', 17, 6, 133, 158, bg],
  [32, 'jl02', 17, 6, 136, 130, bg],
  [33, 'jl03', 17, 6, 130, 130, bg],
  [34, 'jl04', 17, 6, 150, 145, bg],
  [35, 'jl05', 17, 6, 120, 187, bg],
  [36, 'jl06', 17, 6, 37, 145, bg],
  [37, 'jl07', 17, 6, 154, 125, bg],
  [38, 'jl08', 17, 6, 145, 125, bg],
  [39, 'jl09', 17, 6, 130, 145, bg],
  [40, 'jl10', 17, 6, 136, 135, bg],
  [41, 'jl11', 17, 6, 136, 132, bg],
  [42, 'jl12', 17, 6, 50, 108, bg],
  [43, 'jl13', 17, 6, 145, 168, bg],
  [44, 'jl14', 17, 6, 140, 125, bg],
  [45, 'jl15', 17, 6, 145, 145, bg],
  [46, 'jl16', 17, 6, 65, 150, bg],
  [47, 'jl17', 17, 6, 136, 125, bg],
  [48, 'jl18', 17, 6, 38, 105, bg],
  [49, 'jl19', 17, 6, 95, 90, bg],
  [50, 'jl20', 17, 6, 120, 130, bg],
  [51, 'jl21', 17, 6, 65, 90, bg],
  [52, 'jl22', 17, 6, 130, 105, bg],
  [53, 'jl23', 17, 6, 130, 165, bg],
  [54, 'jl24', 17, 6, 68, 85, bg],
  [55, 'jl25', 17, 6, 145, 145, bg],
].map(r => ({ ...r, game: 'fh' }));



const MONSTER_STATS = {
  // Placeholder: Add monster level stats as needed
};

const MONSTER_ROWS = [
  [42, 'Stone Golem', 1, 1, 41, 35, bg, false, [dummy], false],
  [43, 'Black Sludge', 1, 1, 41, 35, bg, false, [dummy], false],
  [44, 'Black Imp', 1, 1, 41, 35, bg, false, [dummy], false],
  [45, 'Blood Monstrosity', 1, 1, 41, 35, bg, false, [dummy], false],
  [46, 'Blood Imp', 1, 1, 41, 35, bg, false, [dummy], false],
  [47, 'Chaos Demon', 1, 1, 41, 35, jotl, false, [dummy], false],
  [48, 'Giant Viper', 1, 1, 41, 35, bg, false, [dummy], false],
  [49, 'Living Corpse', 1, 1, 41, 35, bg, false, [dummy], false],
  [50, 'Living Spirit', 1, 1, 41, 35, bg, false, [dummy], false],
  [51, 'Rat Monstrosity', 1, 1, 41, 35, bg, false, [dummy], false],
  [52, 'Vermling Raider', 1, 1, 41, 35, bg, false, [dummy], false],
  [53, 'Vermling Scout ', 1, 1, 41, 35, bg, false, [dummy], false],
  [54, 'Zealot', 1, 1, 41, 35, bg, false, [dummy], false],
  // Bosses
  [21, 'Blood Horror', 1, 1, 41, 35, bg, false],
  [22, 'Blood Tumor', 1, 1, 41, 35, bg, false],
  [31, 'First of the Order', 1, 1, 41, 35, bg, false],
].map(r => ({ ...SH, boss: false, game: 'fh', ...r }));

export default {
  id: 'jotl',
  name: 'Jaws of the Lion',
  gridSize: { cols: 40, rows: 51 },
  tiles: TILE_ROWS,
  overlays: OVERLAY_ROWS,
  monsters: MONSTER_ROWS,
  monsterStats: MONSTER_STATS,
};
