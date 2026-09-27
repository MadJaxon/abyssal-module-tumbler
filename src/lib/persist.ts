import {
  emptyInventory,
  emptyNumModules,
  type TableSorter,
  type WorkerCalcCombinationsData,
} from '../types';

export const PERSIST_KEY = 'abyssal-tumbler:v1';

export type PersistedSlice = {
  modules: WorkerCalcCombinationsData['modules'];
  numModules: { [key: string]: number };
  cpuBudget: number;
  pgBudget: number;
  uniqueCombinations: boolean;
  /** When unique is on, level the first sort column across `balanceTarget` fits. */
  balanceSets: boolean;
  balanceTarget: number;
  sorts: TableSorter[];
  denseTable: boolean;
  /** Split large tumbles across workers. Small searches still use one. */
  parallelCalc: boolean;
};

export function defaultPersisted(): PersistedSlice {
  return {
    modules: emptyInventory(),
    numModules: emptyNumModules(),
    cpuBudget: 10000,
    pgBudget: 10000,
    uniqueCombinations: false,
    balanceSets: false,
    balanceTarget: 3,
    sorts: [],
    denseTable: false,
    parallelCalc: true,
  };
}

export function loadPersisted(): PersistedSlice | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
    const base = defaultPersisted();
    return {
      ...base,
      ...parsed,
      modules: { ...base.modules, ...parsed.modules },
      numModules: { ...base.numModules, ...parsed.numModules },
    };
  } catch {
    return null;
  }
}

export function savePersisted(slice: PersistedSlice): void {
  localStorage.setItem(PERSIST_KEY, JSON.stringify(slice));
}
