import {
  indexWardensDebtContent,
  validateWardensDebtContent,
} from './schema.js';

export const DEFAULT_WARDENS_DEBT_CONTENT_URL = 'data/wardens-debt/core-set.json';

export async function loadWardensDebtContent(url = DEFAULT_WARDENS_DEBT_CONTENT_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load Wardens Debt content from ${url}: ${response.status}`);
  }

  const content = await response.json();
  const validation = validateWardensDebtContent(content);
  if (!validation.ok) {
    throw new Error(`Wardens Debt content validation failed:\n${validation.issues.join('\n')}`);
  }

  return {
    content,
    index: indexWardensDebtContent(content),
  };
}
