export const WARDENS_DEBT_MAP_TILES = {
  'tile-02a': { image: 'images/maptiles/02a.webp', naturalWidth: 415, naturalHeight: 1114, x: 240, y: 80, width: 208 },
  'tile-03a': { image: 'images/maptiles/03a.webp', naturalWidth: 833, naturalHeight: 697,  x: 240, y: 80, width: 417 },
  'tile-04a': { image: 'images/maptiles/04a.webp', naturalWidth: 413, naturalHeight: 1247, x: 240, y: 80, width: 207 },
  'tile-04b': { image: 'images/maptiles/04b.webp', naturalWidth: 415, naturalHeight: 1250, x: 240, y: 80, width: 208 },
  'tile-07b': { image: 'images/maptiles/07b.webp', naturalWidth: 415, naturalHeight: 1252, x: 240, y: 80, width: 208 },
  'tile-08a': { image: 'images/maptiles/08a.webp', naturalWidth: 415, naturalHeight: 1253, x: 240, y: 80, width: 208 },
  'tile-08b': { image: 'images/maptiles/08b.webp', naturalWidth: 411, naturalHeight: 1254, x: 240, y: 80, width: 206 },
  'tile-09b': { image: 'images/maptiles/09b.webp', naturalWidth: 415, naturalHeight: 1253, x: 240, y: 80, width: 208 },
  'tile-10a': { image: 'images/maptiles/10a.webp', naturalWidth: 832, naturalHeight: 410,  x: 240, y: 80, width: 416 },
  'tile-10b': { image: 'images/maptiles/10b.webp', naturalWidth: 834, naturalHeight: 418,  x: 240, y: 80, width: 417 },
  'tile-11b': { image: 'images/maptiles/11b.webp', naturalWidth: 1251, naturalHeight: 414, x: 240, y: 80, width: 626 },
  'tile-12a': { image: 'images/maptiles/12a.webp', naturalWidth: 413, naturalHeight: 834,  x: 240, y: 80, width: 207 },
  'tile-12b': { image: 'images/maptiles/12b.webp', naturalWidth: 414, naturalHeight: 834,  x: 240, y: 80, width: 207 },
  'tile-14b': { image: 'images/maptiles/14b.webp', naturalWidth: 705, naturalHeight: 717,  x: 240, y: 80, width: 353 },
  'tile-15a': { image: 'images/maptiles/15a.webp', naturalWidth: 414, naturalHeight: 835,  x: 240, y: 80, width: 207 },
  'tile-15b': { image: 'images/maptiles/15b.webp', naturalWidth: 414, naturalHeight: 838,  x: 240, y: 80, width: 207 },
  'tile-16a': { image: 'images/maptiles/16a.webp', naturalWidth: 1249, naturalHeight: 1241, x: 240, y: 80, width: 625 },
  'tile-41b': { image: 'images/maptiles/41b.webp', naturalWidth: 859, naturalHeight: 2534, x: 240, y: 80, width: 430 },
};

export function wardensDebtMapTileForId(tileId) {
  return WARDENS_DEBT_MAP_TILES[tileId] || null;
}
