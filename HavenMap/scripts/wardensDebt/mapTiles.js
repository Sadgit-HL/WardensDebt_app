export const WARDENS_DEBT_MAP_TILES = {
  'tile-cell-a': {
    image: 'images/maptiles/0126.jpg',
    naturalWidth: 859,
    naturalHeight: 2534,
    x: 240,
    y: 80,
    width: 420,
  },
};

export function wardensDebtMapTileForId(tileId) {
  return WARDENS_DEBT_MAP_TILES[tileId] || null;
}
