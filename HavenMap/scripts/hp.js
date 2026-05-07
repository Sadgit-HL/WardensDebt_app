import { getMercenaryStats, getMonsterStats } from './data.js';
import { state } from './state.js';

export function displayMonsterMaxHp(obj) {
  const isElite = obj.role === 'elite';
  const currentRole = obj.role || 'normal';
  const levelStats = getMonsterStats(obj.id, state.CurrentLevel, isElite);
  const maxhpLevel = obj._maxhpLevel != null ? obj._maxhpLevel : -1;
  const maxhpRole = obj._maxhpRole != null ? obj._maxhpRole : '';

  if (state.CurrentLevel !== maxhpLevel || currentRole !== maxhpRole) {
    return levelStats.maxHp != null ? levelStats.maxHp : null;
  }
  if (obj.maxhp != null) return Number(obj.maxhp);
  return levelStats.maxHp != null ? levelStats.maxHp : null;
}

export function displayMercenaryMaxHp(obj) {
  const objLevel = obj.level != null ? Number(obj.level) : 0;
  const levelStats = getMercenaryStats(obj.id, objLevel);

  if (objLevel !== obj._maxhpLevel) {
    return levelStats.maxHp != null ? levelStats.maxHp : null;
  }
  if (obj.maxhp != null) return Number(obj.maxhp);
  return levelStats.maxHp != null ? levelStats.maxHp : null;
}

export function displayMaxHp(kind, obj) {
  if (kind === 'monster') return displayMonsterMaxHp(obj);
  if (kind === 'mercenary') return displayMercenaryMaxHp(obj);
  return obj.maxhp != null ? Number(obj.maxhp) : null;
}

export function displayCurrentHp(kind, obj) {
  if (kind === 'monster') {
    const currentRole = obj.role || 'normal';
    const hasHpContext = obj._hpLevel != null || obj._hpRole != null;
    const contextMatches = state.CurrentLevel === obj._hpLevel && currentRole === obj._hpRole;
    if (hasHpContext && contextMatches && obj.hp != null) return Number(obj.hp);
    if (hasHpContext && !contextMatches) return displayMonsterMaxHp(obj) ?? 0;
    return obj.hp != null ? Number(obj.hp) : displayMonsterMaxHp(obj) ?? 0;
  }

  if (kind === 'mercenary') {
    const objLevel = obj.level != null ? Number(obj.level) : 0;
    const hasHpContext = obj._hpLevel != null;
    if (hasHpContext && objLevel === obj._hpLevel && obj.hp != null) return Number(obj.hp);
    if (hasHpContext && objLevel !== obj._hpLevel) return displayMercenaryMaxHp(obj) ?? 0;
    return obj.hp != null ? Number(obj.hp) : displayMercenaryMaxHp(obj) ?? 0;
  }

  return Number(obj.hp) || 0;
}
