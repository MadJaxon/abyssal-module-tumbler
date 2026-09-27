import { describe, expect, it } from 'vitest';
import { balanceResults } from './balance';
import { makeResultsUnique, sort } from './calc';
import type { Result } from '../types';

function result(id: number, pairs: [string, number][], dpsIncrease: number): Result {
  return {
    id,
    modules: pairs.map(([type, index]) => ({
      type: type as Result['modules'][number]['type'],
      index,
    })),
    totalCpu: 0,
    totalPg: 0,
    dpsIncrease,
    smartbombDps: 0,
    smartbombGjs: 0,
    smartbombRange: 0,
    neutAmount: 0,
    neutGjs: 0,
    neutRange: 0,
    nosAmount: 0,
    nosRange: 0,
    capBonus: 0,
    drainResistance: 0,
    abVelocity: 0,
    abGj: 0,
    mwdVelocity: 0,
    mwdGj: 0,
    mwdSignature: 0,
    totalGj: 0,
  };
}

function pairsFromValues(values: number[]): Result[] {
  const fits: Result[] = [];
  let id = 1;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      fits.push(result(id++, [['dps', i + 1], ['dps', j + 1]], values[i] + values[j]));
    }
  }
  return fits;
}

function minScore(rows: Result[]): number {
  return Math.min(...rows.map((row) => row.dpsIncrease));
}

function maxScore(rows: Result[]): number {
  return Math.max(...rows.map((row) => row.dpsIncrease));
}

function disjoint(rows: Result[]): boolean {
  const used = new Set<string>();
  for (const row of rows) {
    for (const module of row.modules) {
      const key = `${module.type}:${module.index}`;
      if (used.has(key)) return false;
      used.add(key);
    }
  }
  return true;
}

describe('balanceResults', () => {
  it('raises the weakest set above the greedy unique pick', () => {
    const values = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const fits = pairsFromValues(values);
    const greedy = makeResultsUnique(
      fits.slice().sort((a, b) => b.dpsIncrease - a.dpsIncrease),
    ).slice(0, 5);
    const balanced = balanceResults(fits, 'dpsIncrease', 'desc', 5);

    expect(greedy.map((row) => row.dpsIncrease)).toEqual([39, 35, 31, 27, 23]);
    expect(balanced.achieved).toBe(5);
    expect(disjoint(balanced.results)).toBe(true);
    expect(minScore(balanced.results)).toBe(31);
    expect(minScore(balanced.results)).toBeGreaterThan(minScore(greedy));
  });

  it('lowers the strongest set when sorting ascending', () => {
    const fits = pairsFromValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const greedy = makeResultsUnique(fits.slice().sort((a, b) => a.dpsIncrease - b.dpsIncrease)).slice(0, 3);
    const balanced = balanceResults(fits, 'dpsIncrease', 'asc', 3);

    expect(maxScore(greedy)).toBe(11);
    expect(balanced.achieved).toBe(3);
    expect(disjoint(balanced.results)).toBe(true);
    expect(maxScore(balanced.results)).toBe(7);
  });

  it('stops at how many disjoint sets actually fit', () => {
    const fits = [
      result(1, [['dps', 1], ['dps', 2]], 10),
      result(2, [['dps', 3], ['dps', 4]], 8),
    ];
    const balanced = balanceResults(fits, 'dpsIncrease', 'desc', 6);
    expect(balanced.achieved).toBe(2);
    expect(disjoint(balanced.results)).toBe(true);
  });

  it('swaps modules of the same type across multi-module fits', () => {
    const fits = [
      result(1, [['dps', 1], ['sb', 1]], 5),
      result(2, [['dps', 2], ['sb', 2]], 5),
      result(3, [['dps', 1], ['sb', 2]], 100),
      result(4, [['dps', 2], ['sb', 1]], 0),
    ];
    const balanced = balanceResults(fits, 'dpsIncrease', 'desc', 2);
    expect(balanced.achieved).toBe(2);
    expect(minScore(balanced.results)).toBe(5);
    expect(disjoint(balanced.results)).toBe(true);
  });
});

describe('sort balance flag', () => {
  it('keeps the greedy unique order when balance is off', () => {
    const sorted = sort({
      results: [
        result(1, [['dps', 1], ['dps', 2]], 10),
        result(2, [['dps', 1], ['dps', 3]], 40),
        result(3, [['dps', 4], ['dps', 5]], 20),
      ],
      sorts: [{ key: 'dpsIncrease', direction: 'desc' }],
      makeUnique: true,
    });
    expect(sorted.results.map((row) => row.id)).toEqual([2, 3]);
    expect(sorted.balanceNote).toBeUndefined();
  });

  it('asks for a sort column before balancing', () => {
    const sorted = sort({
      results: [result(1, [['dps', 1]], 10), result(2, [['dps', 2]], 4)],
      sorts: [],
      makeUnique: true,
      balanceSets: true,
      balanceTarget: 2,
    });
    expect(sorted.balanceNote).toBe('Sort by a column to balance sets.');
  });

  it('reports when the target does not fit', () => {
    const sorted = sort({
      results: [
        result(1, [['dps', 1], ['dps', 2]], 10),
        result(2, [['dps', 3], ['dps', 4]], 8),
      ],
      sorts: [{ key: 'dpsIncrease', direction: 'desc' }],
      makeUnique: true,
      balanceSets: true,
      balanceTarget: 6,
    });
    expect(sorted.results).toHaveLength(2);
    expect(sorted.balanceNote).toMatch(/target 6/);
  });
});
