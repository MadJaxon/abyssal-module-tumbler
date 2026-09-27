import { describe, expect, it } from 'vitest';
import {
  calculateDpsIncrease,
  calculateDrainResistanceBonus,
  combinationSpan,
  findCombinations,
  makeResultsUnique,
  sort,
} from './calc';
import {
  emptyInventory,
  emptyNumModules,
  type BatteryModule,
  type DpsModule,
  type Module,
  type Result,
  type SmartbombModule,
  type WorkerCalcCombinationsData,
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

function signature(results: Result[]) {
  return results.map((row) => ({
    id: row.id,
    indexes: row.modules.map((module) => `${module.type}:${module.index}`),
    totalCpu: row.totalCpu,
    totalPg: row.totalPg,
    dpsIncrease: row.dpsIncrease,
  }));
}

/** The pre-change generator: every r from 0..k, cartesian product, then exact-count filter. */
function referenceSignature(
  modules: WorkerCalcCombinationsData['modules'],
  limits: { [key: string]: number },
  cpuBudget: number,
  pgBudget: number,
) {
  const keys = Object.keys(modules);
  const lists = keys.map((key) => {
    const limit = limits[key] ?? 0;
    const subsets: Module[][] = [];
    const arr = modules[key as keyof typeof modules];
    for (let r = 0; r <= Math.min(limit, arr.length); r++) {
      subsets.push(...combine(arr, r));
    }
    return subsets;
  });
  let acc: Module[][] = [[]];
  for (const curr of lists) {
    const next: Module[][] = [];
    for (const a of acc) {
      for (const b of curr) next.push([...a, ...b]);
    }
    acc = next;
  }
  const exact = acc.filter(
    (set) => !keys.some((type) => set.filter((module) => module.type === type).length !== (limits[type] ?? 0)),
  );
  // limits may name types the filter also checks; mirror the old Object.keys(limits) pass.
  const filtered = exact.filter(
    (set) =>
      !Object.keys(limits).some(
        (type) => set.filter((module) => module.type === type).length !== limits[type],
      ),
  );
  return filtered.flatMap((comb, id) => {
    const totalCpu = comb.reduce((sum, module) => sum + module.cpu, 0);
    const totalPg = comb.reduce((sum, module) => sum + module.pg, 0);
    if (totalCpu > cpuBudget || totalPg > pgBudget) return [];
    const scored = findCombinations({
      cpuBudget: totalCpu + 1,
      pgBudget: totalPg + 1,
      modules: oneComboInventory(comb),
      numModules: oneComboCounts(comb),
      sorts: [],
    }).results![0];
    return [
      {
        id,
        indexes: comb.map((module) => `${module.type}:${module.index}`),
        totalCpu,
        totalPg,
        dpsIncrease: scored.dpsIncrease,
      },
    ];
  });
}

function oneComboInventory(comb: Module[]): WorkerCalcCombinationsData['modules'] {
  const inventory = emptyInventory();
  for (const module of comb) {
    inventory[module.type].push(module);
  }
  return inventory;
}

function oneComboCounts(comb: Module[]): { [key: string]: number } {
  const counts = emptyNumModules();
  for (const module of comb) counts[module.type] += 1;
  return counts;
}

function combine(arr: Module[], r: number): Module[][] {
  if (r === 0) return [[]];
  if (arr.length < r) return [];
  const result: Module[][] = [];
  for (let i = 0; i <= arr.length - r; i++) {
    for (const tail of combine(arr.slice(i + 1), r - 1)) {
      result.push([arr[i], ...tail]);
    }
  }
  return result;
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

    const impossible = findCombinations({
      cpuBudget: 19,
      pgBudget: 200,
      modules,
      numModules,
      sorts: [],
    });
    expect(impossible.results).toEqual([]);

    const all = findCombinations({
      cpuBudget: 200,
      pgBudget: 200,
      modules,
      numModules,
      sorts: [],
    });
    expect(all.results).toHaveLength(3);
  });

  it('matches the original generator on ids and order, including budget misses', () => {
    const modules = emptyInventory();
    modules.dps = [
      dps(1, 1.2, 10, 100, 5),
      dps(2, 1.1, 8, 10, 5),
      dps(3, 1.05, 4, 10, 5),
    ];
    modules.sb = [1, 2, 3, 4, 5].map(
      (index) =>
        ({
          type: 'sb',
          name: `sb-${index}`,
          index,
          cpu: index === 1 ? 1000 : 1,
          pg: 1,
          activationCost: 10,
          activationTime: 10000,
          range: 5000,
          damage: 100,
        }) as SmartbombModule,
    );
    modules.battery = [
      {
        type: 'battery',
        name: 'unused',
        index: 1,
        cpu: 1,
        pg: 1,
        capacitorBonus: 10,
        drainResistanceBonus: -5,
      } as BatteryModule,
    ];
    const numModules = emptyNumModules();
    numModules.dps = 1;
    numModules.sb = 2;
    const data = {
      cpuBudget: 50,
      pgBudget: 50,
      modules,
      numModules,
      sorts: [],
    };
    const got = findCombinations(data);
    const expected = referenceSignature(modules, numModules, 50, 50);
    expect(signature(got.results!)).toEqual(expected);
    expect(expected[0].id).toBeGreaterThan(0);
  });

  it('keeps fits a negative-cost module pulls back under budget', () => {
    const modules = emptyInventory();
    modules.dps = [dps(1, 1.2, 10, 100, 1), dps(2, 1.1, 5, 10, 1)];
    modules.sb = [
      {
        type: 'sb',
        name: 'refund',
        index: 1,
        cpu: -95,
        pg: 1,
        activationCost: 10,
        activationTime: 10000,
        range: 1000,
        damage: 10,
      } as SmartbombModule,
      {
        type: 'sb',
        name: 'plain',
        index: 2,
        cpu: 0,
        pg: 1,
        activationCost: 10,
        activationTime: 10000,
        range: 1000,
        damage: 10,
      } as SmartbombModule,
    ];
    const numModules = emptyNumModules();
    numModules.dps = 1;
    numModules.sb = 1;
    const got = findCombinations({
      cpuBudget: 10,
      pgBudget: 10,
      modules,
      numModules,
      sorts: [],
    });
    expect(signature(got.results!)).toEqual(referenceSignature(modules, numModules, 10, 10));
    expect(got.results).toHaveLength(3);
    expect(got.results!.some((row) => row.modules.some((m) => m.index === 1 && m.type === 'dps'))).toBe(
      true,
    );
  });

  it('splits into the same fits as one pass', () => {
    const modules = emptyInventory();
    modules.dps = Array.from({ length: 18 }, (_, i) => dps(i + 1, 1.1, 5, 1, 1));
    modules.neut = Array.from({ length: 8 }, (_, i) => ({
      type: 'neut' as const,
      name: `neut-${i + 1}`,
      index: i + 1,
      cpu: 1,
      pg: i === 0 ? 500 : 1,
      activationCost: 10,
      activationTime: 5000,
      neutAmount: 20,
      range: 10000,
    }));
    const numModules = emptyNumModules();
    numModules.dps = 2;
    numModules.neut = 2;
    const input = {
      cpuBudget: 40,
      pgBudget: 40,
      modules,
      numModules,
      sorts: [],
    };
    const full = findCombinations(input);
    const span = combinationSpan(modules, numModules);
    expect('total' in span).toBe(true);
    if (!('total' in span)) return;
    const mid = Math.floor(span.total / 2);
    const left = findCombinations({ ...input, slice: { start: 0, end: mid } });
    const right = findCombinations({ ...input, slice: { start: mid, end: span.total } });
    expect(signature(left.results!.concat(right.results!))).toEqual(signature(full.results!));
    expect(full.results!.map((row) => row.id)).toEqual(
      referenceSignature(modules, numModules, 40, 40).map((row) => row.id),
    );
  });

  it('reports the exact-count product and refuses an unsafe one', () => {
    const modules = emptyInventory();
    modules.dps = Array.from({ length: 80 }, (_, i) => dps(i + 1, 1.1, 1));
    const five = emptyNumModules();
    five.dps = 5;
    const span = combinationSpan(modules, five);
    expect(span).toEqual({ total: 24_040_016 });

    const thirty = emptyNumModules();
    thirty.dps = 30;
    modules.dps = Array.from({ length: 60 }, (_, i) => dps(i + 1, 1.1, 1));
    const tooMany = findCombinations({
      cpuBudget: 100,
      pgBudget: 100,
      modules,
      numModules: thirty,
      sorts: [],
    });
    expect(tooMany.error).toMatch(/Too many combinations/);
    expect(tooMany.results).toBeUndefined();
  });

  it('scores a few hundred thousand fits without building the product up front', () => {
    const modules = emptyInventory();
    modules.dps = Array.from({ length: 25 }, (_, i) => dps(i + 1, 1.1, 5, 1, 1));
    modules.sb = Array.from({ length: 12 }, (_, i) => ({
      type: 'sb' as const,
      name: `sb-${i + 1}`,
      index: i + 1,
      cpu: 1,
      pg: 1,
      activationCost: 5,
      activationTime: 10000,
      range: 1000,
      damage: 50,
    }));
    const numModules = emptyNumModules();
    numModules.dps = 3;
    numModules.sb = 2;
    const started = performance.now();
    const got = findCombinations({
      cpuBudget: 100,
      pgBudget: 100,
      modules,
      numModules,
      sorts: [],
    });
    const elapsed = performance.now() - started;
    expect(got.results).toHaveLength(2300 * 66);
    expect(got.results![0].id).toBe(0);
    expect(got.results!.at(-1)!.id).toBe(2300 * 66 - 1);
    expect(elapsed).toBeLessThan(20_000);
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
