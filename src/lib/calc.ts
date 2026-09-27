// Stacking penalties, aggregation, uniqueness, and sort order are a verbatim
// port of old_project/src/app/abyssal-tumbler/calculations.worker.ts.
// Enumeration is order-equivalent to that worker (same fits, same ids) but
// walks the exact-count product directly so large inventories are not built
// up front. onProgress replaces in-worker postMessage.

import { balanceNote, balanceResults } from './balance';
import {
  AfterburnerModule,
  BatteryModule,
  DpsModule,
  MircowarpModule,
  Module,
  NeutModule,
  NosModule,
  Result,
  ResultModule,
  SmartbombModule,
  TableSorter,
  WorkerCalcCombinationsData,
  WorkerSortData,
} from '../types';

function compareResults(a: Result, b: Result, sorts: TableSorter[]): number {
  for (const sorter of sorts) {
    const valA = a[sorter.key];
    const valB = b[sorter.key];

    if (valA == null && valB == null) continue;
    if (valA == null) return sorter.direction === 'asc' ? -1 : 1;
    if (valB == null) return sorter.direction === 'asc' ? 1 : -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      if (valA < valB) return sorter.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sorter.direction === 'asc' ? 1 : -1;
      continue;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sorter.direction === 'asc' ? -1 : 1;
    if (strA > strB) return sorter.direction === 'asc' ? 1 : -1;
  }
  return 0;
}

export function sort(data: WorkerSortData): WorkerSortData {
  if (data.sorts.length > 0) {
    data.results.sort((a, b) => compareResults(a, b, data.sorts));
  }
  if (data.balanceSets && data.makeUnique) {
    const target = Math.max(1, Math.min(99, Math.floor(data.balanceTarget ?? 3)));
    const primary = data.sorts[0];
    const sample = data.results[0]?.[primary?.key];
    if (!primary || (data.results.length > 0 && typeof sample !== 'number')) {
      data.results = makeResultsUnique(data.results);
      data.balanceNote = 'Sort by a column to balance sets.';
      return data;
    }
    const balanced = balanceResults(data.results, primary.key, primary.direction, target);
    balanced.results.sort((a, b) => compareResults(a, b, data.sorts));
    data.results = balanced.results;
    data.balanceNote = balanceNote(balanced.achieved, target, data.sorts);
    return data;
  }
  data.balanceNote = undefined;
  if (data.makeUnique) data.results = makeResultsUnique(data.results);
  return data;
}

export function makeResultsUnique(results: Result[]) {
  let usedItems: { type: string; index: number }[] = [];
  return results.filter((result) => {
    let notUsed = true;
    const resultItems: { type: string; index: number }[] = [];
    result.modules.forEach((module) => {
      if (
        usedItems.some((item) => item.type === module.type && item.index === module.index)
      ) {
        notUsed = false;
      }
      resultItems.push({
        type: module.type,
        index: module.index,
      });
    });
    if (notUsed) {
      usedItems = usedItems.concat(resultItems);
    }
    return notUsed;
  });
}

const TOO_MANY =
  'Too many combinations to enumerate. Lower how many of each module type are selected.';

/** Fast-path budget margin. Float noise on a handful of fitting numbers is far below this. */
const BUDGET_SLACK = 1e-4;

type Axis = {
  modules: Module[];
  n: number;
  k: number;
  count: number;
  comb: number[];
  cpu: number;
  pg: number;
};

function binomial(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let use = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= use; i++) {
    const prod = result * (n - use + i);
    if (!Number.isSafeInteger(prod)) return Number.POSITIVE_INFINITY;
    result = prod / i;
    if (!Number.isSafeInteger(result)) return Number.POSITIVE_INFINITY;
  }
  return result;
}

function buildAxes(modules: Record<string, Module[]>, limits: Record<string, number>): Axis[] {
  const axes: Axis[] = [];
  for (const key of Object.keys(modules)) {
    const k = limits[key] ?? 0;
    if (k <= 0) continue;
    const list = modules[key] ?? [];
    axes.push({
      modules: list,
      n: list.length,
      k,
      count: binomial(list.length, k),
      comb: [],
      cpu: 0,
      pg: 0,
    });
  }
  return axes;
}

/** Size of the exact-count product. `{ total: 0 }` means nothing to score. */
export function combinationSpan(
  modules: Record<string, Module[]>,
  limits: Record<string, number>,
): { total: number } | { error: string } {
  const axes = buildAxes(modules, limits);
  if (axes.length === 0) return { total: 0 };
  if (axes.some((axis) => axis.count === 0)) return { total: 0 };
  let total = 1;
  for (const axis of axes) {
    if (!Number.isFinite(axis.count)) return { error: TOO_MANY };
    total *= axis.count;
    if (!Number.isSafeInteger(total)) return { error: TOO_MANY };
  }
  return { total };
}

function axisLowerBound(modules: Module[], k: number): { cpu: number; pg: number } {
  const cpus: number[] = [];
  const pgs: number[] = [];
  for (const module of modules) {
    cpus.push(module.cpu);
    pgs.push(module.pg);
  }
  cpus.sort((a, b) => a - b);
  pgs.sort((a, b) => a - b);
  let cpu = 0;
  let pg = 0;
  for (let i = 0; i < k; i++) {
    cpu += cpus[i];
    pg += pgs[i];
  }
  return { cpu, pg };
}

/** True when every exact-count fit is over budget, so the walk can be skipped. */
function cheapestExceedsBudget(
  axes: Axis[],
  cpuBudget: number,
  pgBudget: number,
): boolean {
  let cpu = 0;
  let pg = 0;
  for (const axis of axes) {
    const bound = axisLowerBound(axis.modules, axis.k);
    cpu += bound.cpu;
    pg += bound.pg;
  }
  return cpu > cpuBudget + BUDGET_SLACK || pg > pgBudget + BUDGET_SLACK;
}

function costsAreNonNegative(modules: Record<string, Module[]>): boolean {
  for (const key of Object.keys(modules)) {
    for (const module of modules[key] ?? []) {
      if (module.cpu < 0 || module.pg < 0) return false;
    }
  }
  return true;
}

function loadCost(axis: Axis): void {
  let cpu = 0;
  let pg = 0;
  const mods = axis.modules;
  const comb = axis.comb;
  for (let i = 0; i < comb.length; i++) {
    const module = mods[comb[i]];
    cpu += module.cpu;
    pg += module.pg;
  }
  axis.cpu = cpu;
  axis.pg = pg;
}

/** Lexicographic unrank. Matches the old recursive combinations() order. */
function unrankLex(n: number, k: number, rank: number): number[] {
  if (k === 0) return [];
  const comb: number[] = [];
  let remaining = k;
  let index = 0;
  let left = rank;
  while (remaining > 0) {
    if (index >= n) throw new Error('combination rank out of range');
    const block = binomial(n - index - 1, remaining - 1);
    if (block > left) {
      comb.push(index);
      index += 1;
      remaining -= 1;
    } else {
      left -= block;
      index += 1;
    }
  }
  return comb;
}

function assignRank(axis: Axis, rank: number): void {
  axis.comb = unrankLex(axis.n, axis.k, rank);
  loadCost(axis);
}

function nextLex(comb: number[], n: number): boolean {
  const k = comb.length;
  if (k === 0) return false;
  let i = k - 1;
  while (i >= 0 && comb[i] === n - k + i) i--;
  if (i < 0) return false;
  comb[i] += 1;
  for (let j = i + 1; j < k; j++) comb[j] = comb[j - 1] + 1;
  return true;
}

function stepAxis(axis: Axis): boolean {
  if (!nextLex(axis.comb, axis.n)) return false;
  loadCost(axis);
  return true;
}

function seek(axes: Axis[], flat: number): void {
  let rest = flat;
  for (let i = axes.length - 1; i >= 0; i--) {
    const rank = rest % axes[i].count;
    rest = Math.floor(rest / axes[i].count);
    assignRank(axes[i], rank);
  }
}

function step(axes: Axis[]): boolean {
  for (let i = axes.length - 1; i >= 0; i--) {
    if (stepAxis(axes[i])) return true;
    assignRank(axes[i], 0);
  }
  return false;
}

function chosenModules(axes: Axis[]): Module[] {
  const out: Module[] = [];
  for (const axis of axes) {
    const mods = axis.modules;
    const comb = axis.comb;
    for (let i = 0; i < comb.length; i++) out.push(mods[comb[i]]);
  }
  return out;
}

/**
 * Visit exact-count combinations whose flat index is in [start, end).
 * Ids are that flat index, including combinations rejected for CPU/PG,
 * matching the original forEach index.
 */
function enumerateRange(
  axes: Axis[],
  start: number,
  end: number,
  cpuBudget: number,
  pgBudget: number,
  prune: boolean,
  onHit: (modules: Module[], id: number) => void,
): void {
  if (axes.length === 0 || !(start < end)) return;
  const suffix = new Array<number>(axes.length + 1);
  suffix[axes.length] = 1;
  for (let i = axes.length - 1; i >= 0; i--) {
    suffix[i] = suffix[i + 1] * axes[i].count;
  }
  const total = suffix[0];
  if (start >= total) return;
  if (end > total) end = total;

  seek(axes, start);
  let id = start;
  while (id < end) {
    let cpu = 0;
    let pg = 0;
    let pruneAt = -1;
    if (prune) {
      for (let i = 0; i < axes.length; i++) {
        cpu += axes[i].cpu;
        pg += axes[i].pg;
        if (cpu > cpuBudget + BUDGET_SLACK || pg > pgBudget + BUDGET_SLACK) {
          pruneAt = i;
          break;
        }
      }
    } else {
      for (let i = 0; i < axes.length; i++) {
        cpu += axes[i].cpu;
        pg += axes[i].pg;
      }
    }

    if (pruneAt >= 0) {
      const period = suffix[pruneAt + 1];
      const skip = period - (id % period);
      if (skip > 1) {
        if (id + skip > end) return;
        id += skip;
        if (id >= end) return;
        seek(axes, id);
        continue;
      }
    } else if (cpu <= cpuBudget - BUDGET_SLACK && pg <= pgBudget - BUDGET_SLACK) {
      onHit(chosenModules(axes), id);
    } else if (cpu <= cpuBudget + BUDGET_SLACK && pg <= pgBudget + BUDGET_SLACK) {
      const mods = chosenModules(axes);
      const totalCpu = mods.reduce((sum, module) => sum + module.cpu, 0);
      const totalPg = mods.reduce((sum, module) => sum + module.pg, 0);
      if (totalCpu <= cpuBudget && totalPg <= pgBudget) onHit(mods, id);
    }

    id += 1;
    if (id >= end) return;
    if (!step(axes)) return;
  }
}

function evaluateCombination(comb: Module[], id: number): Result {
  const totalCpu = comb.reduce((sum, m) => sum + m.cpu, 0);
  const totalPg = comb.reduce((sum, m) => sum + m.pg, 0);
  const dpsIncrease = calculateDpsIncrease(comb.filter((m) => m.type === 'dps') as DpsModule[]);

  const smartbombs = comb.filter((m) => m.type === 'sb') as SmartbombModule[];
  const smartbombDps = smartbombs.reduce((carry: number, current) => {
    return carry + current.damage / (current.activationTime / 1000);
  }, 0);
  const smartbombGjs = smartbombs.reduce((carry: number, current) => {
    return carry + current.activationCost / (current.activationTime / 1000);
  }, 0);
  const smartbombRange =
    smartbombs.length === 0
      ? 0
      : smartbombs.reduce((carry: number, current) => {
          return carry + current.range;
        }, 0) / smartbombs.length;

  const neuts = comb.filter((m) => m.type === 'neut') as NeutModule[];
  const neutAmount = neuts.reduce((carry: number, current) => {
    return carry + current.neutAmount / (current.activationTime / 1000);
  }, 0);
  const neutGjs = neuts.reduce((carry: number, current) => {
    return carry + current.activationCost / (current.activationTime / 1000);
  }, 0);
  const neutRange =
    neuts.length === 0
      ? 0
      : neuts.reduce((carry: number, current) => {
          return carry + current.range;
        }, 0) / neuts.length;

  const noses = comb.filter((m) => m.type === 'nos') as NosModule[];
  const nosAmount = noses.reduce((carry: number, current) => {
    return carry + current.drainAmount / (current.activationTime / 1000);
  }, 0);
  const nosRange =
    noses.length === 0
      ? 0
      : noses.reduce((carry: number, current) => {
          return carry + current.range;
        }, 0) / noses.length;

  const batteries = comb.filter((m) => m.type === 'battery') as BatteryModule[];
  const capBonus = batteries.reduce((carry: number, current) => {
    return carry + current.capacitorBonus;
  }, 0);
  const drainResistance = calculateDrainResistanceBonus(batteries);

  const aferburners = comb.filter((m) => m.type === 'ab') as AfterburnerModule[];
  const abVelocity = Math.max(...aferburners.map((ab) => ab.velocityBonus));
  const abGj = Math.max(...aferburners.map((ab) => ab.activationCost));

  const mwds = comb.filter((m) => m.type === 'mwd') as MircowarpModule[];
  const mwdVelocity = Math.max(...mwds.map((ab) => ab.velocityBonus));
  const mwdGj = Math.max(...mwds.map((ab) => ab.activationCost));
  const mwdSignature = Math.max(...mwds.map((ab) => ab.signatureRadiusModifier));

  const totalGj = Math.max(0, smartbombGjs) + Math.max(0, neutGjs) + Math.max(0, abGj, mwdGj);

  return {
    id,
    modules: comb.map((m) => ({
      type: m.type,
      index: m.index,
      itemId: m.itemId,
      typeId: m.typeId,
    })) as ResultModule[],
    totalCpu,
    totalPg,
    dpsIncrease,
    smartbombDps,
    smartbombGjs,
    smartbombRange,
    neutAmount,
    neutGjs,
    neutRange,
    nosAmount,
    nosRange,
    capBonus,
    drainResistance,
    abVelocity,
    abGj,
    mwdVelocity,
    mwdGj,
    mwdSignature,
    totalGj,
  };
}

export function findCombinations(
  data: WorkerCalcCombinationsData,
  onProgress?: (count: number) => void,
): WorkerCalcCombinationsData {
  const totalModules = Object.keys(data.numModules).reduce((sum: number, type) => {
    sum += data.numModules[type];
    return sum;
  }, 0);

  if (!data.cpuBudget || !data.pgBudget || !data.numModules || totalModules <= 0) {
    data.error = 'Please enter valid budget and number of modules.';
    return data;
  }

  const span = combinationSpan(data.modules, data.numModules);
  if ('error' in span) {
    data.error = span.error;
    return data;
  }

  const results: Result[] = [];
  const axes = buildAxes(data.modules, data.numModules);
  if (span.total === 0 || axes.some((axis) => axis.count === 0)) {
    onProgress?.(0);
    data.results = results;
    return data;
  }
  const start = data.slice?.start ?? 0;
  const end = data.slice?.end ?? span.total;
  if (cheapestExceedsBudget(axes, data.cpuBudget, data.pgBudget)) {
    onProgress?.(0);
    data.results = results;
    return data;
  }
  let valid = 0;
  enumerateRange(
    axes,
    start,
    end,
    data.cpuBudget,
    data.pgBudget,
    costsAreNonNegative(data.modules),
    (comb, id) => {
      results.push(evaluateCombination(comb, id));
      valid += 1;
      if ((valid & 1023) === 0) onProgress?.(valid);
    },
  );
  onProgress?.(valid);
  data.results = results;
  return data;
}

export function calculateDpsIncrease(modules: DpsModule[]): number {
  let dmgBonuses: number[] = modules.map((m) => m.dmgMulti - 1);
  let rofBonuses: number[] = modules.map((m) => m.rofBonus / 100); // Fractional reductions

  // Sort descending for strongest first
  dmgBonuses.sort((a, b) => b - a);
  rofBonuses.sort((a, b) => b - a);

  // Damage multipliers (product of (1 + penalized bonus))
  let totalDmg = 1.0;
  for (let i = 0; i < dmgBonuses.length; i++) {
    const penalty = Math.exp(-Math.pow(i / 2.67, 2));
    totalDmg *= 1 + dmgBonuses[i] * penalty;
  }

  // Cycle time multipliers (product of (1 - penalized reduction)), then invert for DPS from RoF
  let totalCycle = 1.0;
  for (let i = 0; i < rofBonuses.length; i++) {
    const penalty = Math.exp(-Math.pow(i / 2.67, 2));
    totalCycle *= 1 - rofBonuses[i] * penalty;
  }
  const totalRof = totalCycle > 0 ? 1 / totalCycle : 1; // Avoid division by zero

  const dpsMulti = totalDmg * totalRof;
  return (dpsMulti - 1) * 100;
}

export function calculateDrainResistanceBonus(modules: BatteryModule[]): number {
  let resistBonuses: number[] = modules.map((m) => Math.abs(m.drainResistanceBonus) / 100); // Absolute fractional resistances
  // Sort descending for strongest first (largest absolute value)
  resistBonuses.sort((a, b) => b - a);
  // Drain multiplier (product of (1 - penalized resistance))
  let totalDrainMulti = 1.0;
  for (let i = 0; i < resistBonuses.length; i++) {
    const penalty = Math.exp(-Math.pow(i / 2.67, 2));
    totalDrainMulti *= 1 - resistBonuses[i] * penalty;
  }
  const effectiveResistance = (1 - totalDrainMulti) * 100; // Positive % resistance
  return -effectiveResistance; // Return as negative to match in-game display
}
