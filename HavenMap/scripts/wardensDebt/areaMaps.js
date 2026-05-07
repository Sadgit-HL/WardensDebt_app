export const WARDENS_DEBT_AREA_MAPS = {
  'tile-cell-a': {
    image: 'images/maptiles/0126.jpg',
    naturalWidth: 859,
    naturalHeight: 2534,
    x: 240,
    y: 80,
    width: 420,
    areas: [
      {
        id: 'upper-room',
        polygon: [[24, 18], [836, 18], [836, 890], [24, 890]],
        adjacentAreaIds: ['street'],
      },
      {
        id: 'street',
        polygon: [[8, 900], [850, 900], [850, 1680], [8, 1680]],
        adjacentAreaIds: ['upper-room', 'lower-room'],
      },
      {
        id: 'lower-room',
        polygon: [[24, 1690], [836, 1690], [836, 2510], [24, 2510]],
        adjacentAreaIds: ['street'],
      },
    ],
  },
};

export function wardensDebtAreaMapForTile(tileId) {
  return WARDENS_DEBT_AREA_MAPS[tileId] || null;
}

export function wardensDebtAreaById(tileId, areaId) {
  return wardensDebtAreaMapForTile(tileId)?.areas.find(area => area.id === areaId) || null;
}

export function wardensDebtAreaIndex(tileId, areaId) {
  return wardensDebtAreaMapForTile(tileId)?.areas.findIndex(area => area.id === areaId) ?? -1;
}

export function sameWardensDebtArea(figureA, figureB, figureAreas = {}) {
  return Boolean(figureA && figureB && figureAreas[figureA] && figureAreas[figureA] === figureAreas[figureB]);
}

export function adjacentWardensDebtAreas(tileId, areaIdA, areaIdB) {
  const area = wardensDebtAreaById(tileId, areaIdA);
  return Boolean(area && area.adjacentAreaIds?.includes(areaIdB));
}

export function reachableWardensDebtAreas(tileId, startAreaId, range = 1) {
  const areaMap = wardensDebtAreaMapForTile(tileId);
  if (!areaMap || !startAreaId || range < 0) return [];

  const byId = new Map(areaMap.areas.map(area => [area.id, area]));
  const seen = new Set([startAreaId]);
  const queue = [{ areaId: startAreaId, distance: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (current.distance >= range) continue;
    const area = byId.get(current.areaId);
    for (const nextAreaId of area?.adjacentAreaIds || []) {
      if (seen.has(nextAreaId)) continue;
      seen.add(nextAreaId);
      queue.push({ areaId: nextAreaId, distance: current.distance + 1 });
    }
  }

  return [...seen].filter(areaId => areaId !== startAreaId);
}

export function wardensDebtFiguresInArea(areaId, figures = [], figureAreas = {}) {
  return figures.filter(figure => figureAreas[figure.id] === areaId);
}
