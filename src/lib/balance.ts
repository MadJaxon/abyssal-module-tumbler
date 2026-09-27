import type { Result, TableSorter } from '../types';

const TYPE_STRIDE = 1_000_000;
const EPS = 1e-6;
const TYPE_CODE: Record<string, number> = {
  dps: 1,
  sb: 2,
  neut: 3,
  nos: 4,
  battery: 5,
  ab: 6,
  mwd: 7,
};

type Fit = {
  result: Result;
  score: number;
  mods: number[];
  sig: string;
};

type Objective = { worst: number; avg: number };

function modId(type: string, index: number): number {
  return (TYPE_CODE[type] ?? 0) * TYPE_STRIDE + index;
}

function modType(id: number): number {
  return Math.floor(id / TYPE_STRIDE);
}

function signature(mods: number[]): string {
  return mods.join(',');
}

function objective(scores: number[], direction: 'asc' | 'desc'): Objective {
  let worst = scores[0] ?? 0;
  let sum = 0;
  for (const score of scores) {
    sum += score;
    if (direction === 'desc') worst = Math.min(worst, score);
    else worst = Math.max(worst, score);
  }
  return { worst, avg: scores.length ? sum / scores.length : 0 };
}

/** Descending: higher floor, then higher average. Ascending: lower ceiling, then lower average. */
function improves(next: Objective, prev: Objective, direction: 'asc' | 'desc'): boolean {
  if (direction === 'desc') {
    if (next.worst > prev.worst + EPS) return true;
    if (prev.worst > next.worst + EPS) return false;
    return next.avg > prev.avg + EPS;
  }
  if (next.worst < prev.worst - EPS) return true;
  if (prev.worst < next.worst - EPS) return false;
  return next.avg < prev.avg - EPS;
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state;
  };
}

function shuffle(fits: Fit[], seed: number): Fit[] {
  const next = fits.slice();
  const rand = lcg(seed);
  for (let i = next.length - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    const swap = next[i];
    next[i] = next[j];
    next[j] = swap;
  }
  return next;
}

function takeDisjoint(order: Fit[], target: number): Fit[] {
  const used = new Set<number>();
  const picked: Fit[] = [];
  for (const fit of order) {
    if (picked.length >= target) break;
    let clash = false;
    for (const mod of fit.mods) {
      if (used.has(mod)) {
        clash = true;
        break;
      }
    }
    if (clash) continue;
    picked.push(fit);
    for (const mod of fit.mods) used.add(mod);
  }
  return picked;
}

function rarityOrder(pool: Fit[], direction: 'asc' | 'desc'): Fit[] {
  const freq = new Map<number, number>();
  for (const fit of pool) {
    for (const mod of fit.mods) freq.set(mod, (freq.get(mod) ?? 0) + 1);
  }
  const cost = new Map<Fit, number>();
  for (const fit of pool) {
    let sum = 0;
    for (const mod of fit.mods) sum += freq.get(mod) ?? 0;
    cost.set(fit, sum);
  }
  return pool.slice().sort((a, b) => {
    const diff = (cost.get(a) ?? 0) - (cost.get(b) ?? 0);
    if (diff !== 0) return diff;
    return direction === 'desc' ? b.score - a.score : a.score - b.score;
  });
}

function replaced(mods: number[], from: number, to: number): number[] {
  const next = mods.map((mod) => (mod === from ? to : mod));
  next.sort((a, b) => a - b);
  return next;
}

function packScores(pack: Fit[]): number[] {
  return pack.map((fit) => fit.score);
}

function climb(seed: Fit[], bySig: Map<string, Fit>, universe: number[], direction: 'asc' | 'desc'): Fit[] {
  let current = seed.slice();
  for (let iter = 0; iter < 200; iter++) {
    let best = current;
    let bestObj = objective(packScores(current), direction);
    let improved = false;

    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const left = current[i].mods;
        const right = current[j].mods;
        for (const fromLeft of left) {
          for (const fromRight of right) {
            if (modType(fromLeft) !== modType(fromRight)) continue;
            const fitLeft = bySig.get(signature(replaced(left, fromLeft, fromRight)));
            const fitRight = bySig.get(signature(replaced(right, fromRight, fromLeft)));
            if (!fitLeft || !fitRight) continue;
            const trial = current.slice();
            trial[i] = fitLeft;
            trial[j] = fitRight;
            const next = objective(packScores(trial), direction);
            if (improves(next, bestObj, direction)) {
              best = trial;
              bestObj = next;
              improved = true;
            }
          }
        }
      }
    }

    const used = new Set<number>();
    for (const fit of current) for (const mod of fit.mods) used.add(mod);
    for (let i = 0; i < current.length; i++) {
      for (const from of current[i].mods) {
        const fromType = modType(from);
        for (const unused of universe) {
          if (used.has(unused) || modType(unused) !== fromType) continue;
          const fit = bySig.get(signature(replaced(current[i].mods, from, unused)));
          if (!fit) continue;
          const trial = current.slice();
          trial[i] = fit;
          const next = objective(packScores(trial), direction);
          if (improves(next, bestObj, direction)) {
            best = trial;
            bestObj = next;
            improved = true;
          }
        }
      }
    }

    if (!improved) break;
    current = best;
  }
  return current;
}

function prefer(a: Fit[], b: Fit[], direction: 'asc' | 'desc'): Fit[] {
  if (a.length !== b.length) return a.length > b.length ? a : b;
  if (a.length === 0) return a;
  const ao = objective(packScores(a), direction);
  const bo = objective(packScores(b), direction);
  return improves(bo, ao, direction) ? b : a;
}

/**
 * Pick `target` disjoint fits and level `key`.
 * Descending raises the weakest set, then the average. Ascending does the opposite.
 * The input order is not required; fits are indexed by their module set.
 */
export function balanceResults(
  results: Result[],
  key: keyof Result,
  direction: 'asc' | 'desc',
  target: number,
): { results: Result[]; achieved: number } {
  const want = Math.max(1, Math.floor(target));
  const bySig = new Map<string, Fit>();
  const universe = new Set<number>();
  for (const result of results) {
    const raw = result[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const mods = result.modules.map((module) => modId(module.type, module.index)).sort((a, b) => a - b);
    if (mods.length === 0) continue;
    const sig = signature(mods);
    if (bySig.has(sig)) continue;
    for (const mod of mods) universe.add(mod);
    bySig.set(sig, { result, score: raw, mods, sig });
  }
  const pool = [...bySig.values()];
  if (pool.length === 0 || want < 1) return { results: [], achieved: 0 };

  pool.sort((a, b) => (direction === 'desc' ? b.score - a.score : a.score - b.score));
  const universeList = [...universe];

  const seeds = [
    takeDisjoint(pool, want),
    takeDisjoint(rarityOrder(pool, direction), want),
    takeDisjoint(
      pool.slice().sort((a, b) => (direction === 'desc' ? a.score - b.score : b.score - a.score)),
      want,
    ),
  ];
  const band = pool.slice(0, Math.min(pool.length, 4000));
  for (let seed = 1; seed <= 4; seed++) seeds.push(takeDisjoint(shuffle(band, seed * 97), want));

  let best: Fit[] = [];
  for (const seed of seeds) {
    if (seed.length === 0) continue;
    const climbed = climb(seed, bySig, universeList, direction);
    best = prefer(best, climbed, direction);
  }

  best.sort((a, b) => (direction === 'desc' ? b.score - a.score : a.score - b.score));
  return { results: best.map((fit) => fit.result), achieved: best.length };
}

export function balanceNote(achieved: number, target: number, sorts: TableSorter[]): string | undefined {
  if (sorts.length === 0) return 'Sort by a column to balance sets.';
  if (achieved < target) {
    const noun = achieved === 1 ? 'set fits' : 'sets fit';
    return `Only ${achieved} disjoint ${noun} these modules (target ${target}).`;
  }
  return undefined;
}
