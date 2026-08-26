import type { AbyssalModuleType } from '../types';
import { MODULE_TYPES } from '../types';

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let kUse = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= kUse; i++) {
    result = (result * (n - kUse + i)) / i;
  }
  return result;
}

/** UI-only estimate of fits after the exact-count filter. Does not change generation. */
export function estimateCombinationCount(
  inventoryCounts: Record<AbyssalModuleType, number>,
  numModules: { [key: string]: number },
): number {
  let total = 1;
  for (const type of MODULE_TYPES) {
    const n = inventoryCounts[type] ?? 0;
    const k = numModules[type] ?? 0;
    total *= binomial(n, k);
    if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) {
      return Number.POSITIVE_INFINITY;
    }
  }
  return Math.round(total);
}

export const COMBINATION_WARN_THRESHOLD = 250_000;
