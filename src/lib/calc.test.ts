import { describe, expect, it } from 'vitest';
import {
  calculateDpsIncrease,
  calculateDrainResistanceBonus,
  findCombinations,
  makeResultsUnique,
  sort,
} from './calc';
import {
  emptyInventory,
  emptyNumModules,
  type DpsModule,
  type Result,
  type SmartbombModule,
} from '../types';

function dps(index: number, dmgMulti: number, rofBonus: number, cpu = 10, pg = 10): DpsModule {
  return {
    type: 'dps',
    name: `dps-${index}`,
    index,
    cpu,
    pg,
    dmgMulti,
    rofBonus,
  };
}

describe('calculateDpsIncrease', () => {
  it('matches the original single-module formula', () => {
    const totalDmg = 1 + 0.2 * 1;
    const totalCycle = 1 - 0.1 * 1;
    const expected = (totalDmg * (1 / totalCycle) - 1) * 100;
    expect(calculateDpsIncrease([dps(1, 1.2, 10)])).toBe(expected);
  });

  it('applies strongest-first stacking with exp(-(i/2.67)^2)', () => {
    const p0 = Math.exp(-Math.pow(0 / 2.67, 2));
    const p1 = Math.exp(-Math.pow(1 / 2.67, 2));
    const totalDmg = (1 + 0.25 * p0) * (1 + 0.15 * p1);
    const totalCycle = (1 - 0.12 * p0) * (1 - 0.08 * p1);
    const expected = (totalDmg * (1 / totalCycle) - 1) * 100;
    expect(calculateDpsIncrease([dps(1, 1.25, 12), dps(2, 1.15, 8)])).toBe(expected);
  });

  it('sorts bonuses descending before penalizing', () => {
    const weakerFirst = calculateDpsIncrease([dps(1, 1.15, 8), dps(2, 1.25, 12)]);
    const strongerFirst = calculateDpsIncrease([dps(1, 1.25, 12), dps(2, 1.15, 8)]);
    expect(weakerFirst).toBe(strongerFirst);
  });
});

describe('calculateDrainResistanceBonus', () => {
  it('returns negative stacked resistance like the original', () => {
    const p0 = Math.exp(-Math.pow(0 / 2.67, 2));
    const p1 = Math.exp(-Math.pow(1 / 2.67, 2));
    const totalDrainMulti = (1 - 0.2 * p0) * (1 - 0.1 * p1);
    const expected = -(1 - totalDrainMulti) * 100;
    expect(
      calculateDrainResistanceBonus([
        {
          type: 'battery',
          name: 'a',
          index: 1,
          cpu: 10,
          pg: 10,
          capacitorBonus: 100,
          drainResistanceBonus: -20,
        },
        {
          type: 'battery',
          name: 'b',
          index: 2,
          cpu: 10,
          pg: 10,
          capacitorBonus: 80,
          drainResistanceBonus: -10,
        },
      ]),
    ).toBe(expected);
  });
});

describe('findCombinations', () => {
  it('emits an error when no slots are requested', () => {
    const data = findCombinations({
      cpuBudget: 100,
      pgBudget: 100,
      modules: emptyInventory(),
      numModules: emptyNumModules(),
      sorts: [],
    });
    expect(data.error).toBe('Please enter valid budget and number of modules.');
    expect(data.results).toBeUndefined();
  });

  it('keeps only exact-count combinations within CPU/PG', () => {
    const modules = emptyInventory();
    modules.dps = [dps(1, 1.2, 10), dps(2, 1.15, 8), dps(3, 1.1, 5, 90, 10)];
    const numModules = emptyNumModules();
    numModules.dps = 2;

    const within = findCombinations({
      cpuBudget: 30,
      pgBudget: 30,
      modules,
      numModules,
      sorts: [],
    });
    expect(within.results).toHaveLength(1);
    expect(within.results![0].modules.map((m) => m.index).sort()).toEqual([1, 2]);
    expect(within.results![0].dpsIncrease).toBe(
      calculateDpsIncrease([modules.dps[0] as DpsModule, modules.dps[1] as DpsModule]),
    );
    expect(within.results![0].totalCpu).toBe(20);
    expect(within.results![0].totalPg).toBe(20);

    const all = findCombinations({
      cpuBudget: 200,
      pgBudget: 200,
      modules,
      numModules,
      sorts: [],
    });
    expect(all.results).toHaveLength(3);
  });

  it('aggregates smartbomb DPS/GJ and average range like the original', () => {
    const modules = emptyInventory();
    modules.sb = [
      {
        type: 'sb',
        name: 'sb1',
        index: 1,
        cpu: 10,
        pg: 10,
        activationCost: 20,
        activationTime: 10000,
        range: 6000,
        damage: 300,
      } as SmartbombModule,
      {
        type: 'sb',
        name: 'sb2',
        index: 2,
        cpu: 10,
        pg: 10,
        activationCost: 10,
        activationTime: 5000,
        range: 4000,
        damage: 100,
      } as SmartbombModule,
    ];
    const numModules = emptyNumModules();
    numModules.sb = 2;
    const data = findCombinations({
      cpuBudget: 100,
      pgBudget: 100,
      modules,
      numModules,
      sorts: [],
    });
    const row = data.results![0];
    expect(row.smartbombDps).toBe(300 / 10 + 100 / 5);
    expect(row.smartbombGjs).toBe(20 / 10 + 10 / 5);
    expect(row.smartbombRange).toBe(5000);
    expect(row.totalGj).toBe(row.smartbombGjs);
  });
});

describe('makeResultsUnique + sort', () => {
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

  it('keeps the first non-overlapping result in current order', () => {
    const unique = makeResultsUnique([
      result(1, [['dps', 1], ['dps', 2]], 30),
      result(2, [['dps', 1], ['dps', 3]], 20),
      result(3, [['dps', 4], ['dps', 5]], 10),
    ]);
    expect(unique.map((r) => r.id)).toEqual([1, 3]);
  });

  it('sorts descending then applies uniqueness', () => {
    const sorted = sort({
      results: [
        result(1, [['dps', 1], ['dps', 2]], 10),
        result(2, [['dps', 1], ['dps', 3]], 40),
        result(3, [['dps', 4], ['dps', 5]], 20),
      ],
      sorts: [{ key: 'dpsIncrease', direction: 'desc' }],
      makeUnique: true,
    });
    expect(sorted.results.map((r) => r.id)).toEqual([2, 3]);
  });
});
