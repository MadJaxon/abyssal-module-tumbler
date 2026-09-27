import { create } from 'zustand';
import {
  emptyInventory,
  emptyNumModules,
  MODULE_TYPES,
  type AbyssalModuleType,
  type Module,
  type Result,
  type TableSorter,
  type WorkerCalcCombinationsData,
  type WorkerResult,
  type WorkerSortData,
} from '../types';
import { parseModulesFromChat } from '../lib/chatParser';
import { parseDogmaResponseIntoModules } from '../lib/dogma';
import { updateDogmaAttributes } from '../lib/esi';
import { getMutamarketModules } from '../lib/mutamarket';
import { combinationSpan } from '../lib/calc';
import { COMBINATION_WARN_THRESHOLD, estimateCombinationCount } from '../lib/estimate';
import { inventoryCount } from '../lib/format';
import { splitRange, workerCountFor } from '../lib/parallelPlan';
import { defaultPersisted, loadPersisted, savePersisted, type PersistedSlice } from '../lib/persist';
import { runWorker, runWorkerPool, type WorkerHandle } from '../lib/workerClient';

function nextIndex(collection: Module[]): number {
  let index = 1;
  const indizes = collection.map((m) => m.index);
  while (indizes.includes(index)) {
    index++;
  }
  return index;
}

function usedItemIds(modules: WorkerCalcCombinationsData['modules']): string[] {
  return MODULE_TYPES.flatMap((type) => modules[type].map((m) => m.itemId ?? '0'));
}

function persistSlice(state: PersistedSlice): void {
  savePersisted({
    modules: state.modules,
    numModules: state.numModules,
    cpuBudget: state.cpuBudget,
    pgBudget: state.pgBudget,
    uniqueCombinations: state.uniqueCombinations,
    balanceSets: state.balanceSets,
    balanceTarget: state.balanceTarget,
    sorts: state.sorts,
    denseTable: state.denseTable,
    parallelCalc: state.parallelCalc,
  });
}

const hydrated = loadPersisted() ?? defaultPersisted();

let handle: WorkerHandle | null = null;
let runToken = 0;

type TumblerState = PersistedSlice & {
  results: Result[];
  displayedResults: Result[];
  isCalculating: boolean;
  calcProgress: number;
  calcCores: number;
  errorMessage: string;
  balanceNote: string;
  importStatus: string;
  expandedResultId: number | null;
  activeType: AbyssalModuleType | 'all' | 'add';
  pendingEstimate: number | null;
  addModules: (incoming: Module[]) => void;
  removeModule: (type: AbyssalModuleType, index: number) => void;
  updateModule: (module: Module) => void;
  setNumModules: (type: AbyssalModuleType, count: number) => void;
  setCpuBudget: (value: number) => void;
  setPgBudget: (value: number) => void;
  setUnique: (value: boolean) => void;
  setBalanceSets: (value: boolean) => void;
  setBalanceTarget: (value: number) => void;
  setParallelCalc: (value: boolean) => void;
  toggleSort: (key: TableSorter['key']) => void;
  setDenseTable: (value: boolean) => void;
  setActiveType: (type: AbyssalModuleType | 'all' | 'add') => void;
  setExpanded: (id: number | null) => void;
  importFromChat: (text: string) => Promise<number>;
  importFromMuta: (url: string) => Promise<number>;
  calculate: (force?: boolean) => void;
  confirmPending: () => void;
  cancelPending: () => void;
  cancelCalculation: () => void;
  clearInventory: () => void;
};

export const useTumbler = create<TumblerState>((set, get) => ({
  ...hydrated,
  results: [],
  displayedResults: [],
  isCalculating: false,
  calcProgress: 0,
  calcCores: 0,
  errorMessage: '',
  balanceNote: '',
  importStatus: '',
  expandedResultId: null,
  activeType: 'all',
  pendingEstimate: null,

  addModules: (incoming) => {
    set((state) => {
      const modules = { ...state.modules };
      const used = usedItemIds(modules);
      for (const type of MODULE_TYPES) {
        modules[type] = [...modules[type]];
      }
      for (const module of incoming) {
        if (module.itemId && used.includes(module.itemId)) continue;
        const collection = modules[module.type];
        if (!collection) continue;
        const copy = { ...module, index: nextIndex(collection) };
        collection.push(copy);
        if (copy.itemId) used.push(copy.itemId);
      }
      persistSlice({ ...state, modules });
      return { modules };
    });
  },

  removeModule: (type, index) => {
    set((state) => {
      const modules = {
        ...state.modules,
        [type]: state.modules[type].filter((m) => m.index !== index),
      };
      persistSlice({ ...state, modules });
      return { modules };
    });
  },

  updateModule: (module) => {
    set((state) => {
      const modules = {
        ...state.modules,
        [module.type]: state.modules[module.type].map((m) =>
          m.index === module.index ? { ...m, ...module } : m,
        ),
      };
      persistSlice({ ...state, modules });
      return { modules };
    });
  },

  setNumModules: (type, count) => {
    set((state) => {
      const numModules = { ...state.numModules, [type]: Math.max(0, count) };
      persistSlice({ ...state, numModules });
      return { numModules };
    });
  },

  setCpuBudget: (cpuBudget) => {
    set((state) => {
      persistSlice({ ...state, cpuBudget });
      return { cpuBudget };
    });
  },

  setPgBudget: (pgBudget) => {
    set((state) => {
      persistSlice({ ...state, pgBudget });
      return { pgBudget };
    });
  },

  setUnique: (uniqueCombinations) => {
    set((state) => {
      persistSlice({ ...state, uniqueCombinations });
      return { uniqueCombinations };
    });
    const { results, sorts } = get();
    if (results.length) {
      runSort(get, set, results, sorts);
    }
  },

  setBalanceSets: (balanceSets) => {
    set((state) => {
      persistSlice({ ...state, balanceSets });
      return { balanceSets };
    });
    const { results, sorts } = get();
    if (results.length) runSort(get, set, results, sorts);
  },

  setBalanceTarget: (value) => {
    const balanceTarget = Math.max(1, Math.min(99, Math.floor(value) || 1));
    set((state) => {
      persistSlice({ ...state, balanceTarget });
      return { balanceTarget };
    });
    const { results, sorts, balanceSets, uniqueCombinations } = get();
    if (results.length && balanceSets && uniqueCombinations) runSort(get, set, results, sorts);
  },

  setParallelCalc: (parallelCalc) => {
    set((state) => {
      persistSlice({ ...state, parallelCalc });
      return { parallelCalc };
    });
  },

  toggleSort: (key) => {
    const current = get().sorts;
    const existing = current.find((s) => s.key === key);
    let sorts: TableSorter[];
    if (!existing) {
      sorts = [...current, { key, direction: 'desc' }];
    } else if (existing.direction === 'desc') {
      sorts = current.map((s) => (s.key === key ? { ...s, direction: 'asc' } : s));
    } else {
      sorts = current.filter((s) => s.key !== key);
    }
    set((state) => {
      persistSlice({ ...state, sorts });
      return { sorts };
    });
    const { results } = get();
    if (results.length) {
      runSort(get, set, results, sorts);
    }
  },

  setDenseTable: (denseTable) => {
    set((state) => {
      persistSlice({ ...state, denseTable });
      return { denseTable };
    });
  },

  setActiveType: (activeType) => set({ activeType }),
  setExpanded: (expandedResultId) => set({ expandedResultId }),

  importFromChat: async (text) => {
    const items = parseModulesFromChat(text);
    if (!items || items.length === 0) {
      set({ errorMessage: 'No showinfo links found in the pasted text.' });
      return 0;
    }
    const used = usedItemIds(get().modules);
    const fresh = items.filter((item) => !used.includes(item.itemId));
    if (fresh.length === 0) {
      set({ importStatus: 'Those modules are already in the inventory.' });
      return 0;
    }
    set({ importStatus: `Fetching ${fresh.length} module${fresh.length === 1 ? '' : 's'} from ESI…`, errorMessage: '' });
    try {
      const updated = await updateDogmaAttributes(fresh);
      const classified = parseDogmaResponseIntoModules(updated).filter((m): m is Module => m !== null);
      const skipped = fresh.length - classified.length;
      get().addModules(classified);
      set({
        importStatus:
          skipped > 0
            ? `Imported ${classified.length}, skipped ${skipped} unsupported type${skipped === 1 ? '' : 's'}.`
            : `Imported ${classified.length} module${classified.length === 1 ? '' : 's'}.`,
      });
      return classified.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ESI error';
      set({ errorMessage: message, importStatus: '' });
      return 0;
    }
  },

  importFromMuta: async (url) => {
    set({ importStatus: 'Loading MutaMarket results…', errorMessage: '' });
    try {
      const modules = await getMutamarketModules(url);
      if (modules === null) {
        set({ importStatus: '', errorMessage: 'Paste a MutaMarket type-search URL.' });
        return 0;
      }
      get().addModules(modules);
      set({
        importStatus: `Imported ${modules.length} module${modules.length === 1 ? '' : 's'} from MutaMarket.`,
      });
      return modules.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MutaMarket error';
      set({ errorMessage: message, importStatus: '' });
      return 0;
    }
  },

  calculate: (force = false) => {
    const state = get();
    const totalSlots = Object.values(state.numModules).reduce((sum, n) => sum + n, 0);
    if (!state.cpuBudget || !state.pgBudget || totalSlots <= 0) {
      set({ errorMessage: 'Please enter valid budget and number of modules.' });
      return;
    }
    for (const type of MODULE_TYPES) {
      const need = state.numModules[type] ?? 0;
      if (need > state.modules[type].length) {
        set({
          errorMessage: `Need ${need} ${type} modules but only ${state.modules[type].length} are in inventory.`,
        });
        return;
      }
    }
    const estimate = estimateCombinationCount(inventoryCount(state.modules), state.numModules);
    if (!force && estimate > COMBINATION_WARN_THRESHOLD) {
      set({ pendingEstimate: estimate, errorMessage: '' });
      return;
    }
    startCalculation(get, set);
  },

  confirmPending: () => {
    set({ pendingEstimate: null });
    startCalculation(get, set);
  },

  cancelPending: () => set({ pendingEstimate: null }),

  cancelCalculation: () => {
    runToken += 1;
    handle?.terminate();
    handle = null;
    set({ isCalculating: false, calcProgress: 0, calcCores: 0 });
  },

  clearInventory: () => {
    const modules = emptyInventory();
    const numModules = emptyNumModules();
    set((state) => {
      persistSlice({ ...state, modules, numModules });
      return { modules, numModules, results: [], displayedResults: [], expandedResultId: null };
    });
  },
}));

function failCalc(
  set: (partial: Partial<TumblerState>) => void,
  errorMessage: string,
) {
  set({ errorMessage, isCalculating: false, calcProgress: 0, calcCores: 0 });
}

function startCalculation(
  get: () => TumblerState,
  set: (partial: Partial<TumblerState>) => void,
) {
  const token = ++runToken;
  const state = get();
  handle?.terminate();

  const span = combinationSpan(state.modules, state.numModules);
  if ('error' in span) {
    set({
      isCalculating: false,
      calcProgress: 0,
      calcCores: 0,
      errorMessage: span.error,
      results: [],
      displayedResults: [],
      expandedResultId: null,
    });
    return;
  }

  const cores = typeof navigator === 'undefined' ? 1 : navigator.hardwareConcurrency || 1;
  const slices = splitRange(span.total, workerCountFor(span.total, cores, state.parallelCalc));
  const progress = new Array<number>(slices.length).fill(0);
  const partials: Result[][] = new Array(slices.length);
  let finished = 0;

  set({
    isCalculating: true,
    calcProgress: 0,
    calcCores: slices.length,
    results: [],
    displayedResults: [],
    errorMessage: '',
    balanceNote: '',
    expandedResultId: null,
  });

  const shared = {
    modules: state.modules,
    sorts: state.sorts,
    numModules: state.numModules,
    cpuBudget: state.cpuBudget,
    pgBudget: state.pgBudget,
  };

  handle = runWorkerPool(
    slices.map((slice) => ({
      action: 'findCombinations' as const,
      data: { ...shared, slice },
    })),
    (index, event) => {
      if (token !== runToken) return true;
      if (event.error) {
        failCalc(set, event.error);
        handle?.terminate();
        return true;
      }
      if (event.action !== 'findCombinations') return true;
      if (event.isUpdate) {
        progress[index] = event.data as number;
        let sum = 0;
        for (const count of progress) sum += count;
        set({ calcProgress: sum });
        return false;
      }
      const payload = event.data as WorkerCalcCombinationsData | null;
      if (payload?.error) {
        failCalc(set, payload.error);
        handle?.terminate();
        return true;
      }
      partials[index] = payload?.results ?? [];
      finished += 1;
      if (finished < slices.length) return true;
      const results = partials.flat();
      set({ results, calcProgress: results.length });
      runSort(get, set, results, get().sorts);
      return true;
    },
    (message) => {
      if (token !== runToken) return;
      failCalc(set, message);
    },
  );
}

function runSort(
  get: () => TumblerState,
  set: (partial: Partial<TumblerState>) => void,
  results: Result[],
  sorts: TableSorter[],
) {
  const token = ++runToken;
  handle?.terminate();
  set({ isCalculating: true, calcProgress: -1 });
  handle = runWorker(
    {
      action: 'sort',
      data: {
        results,
        sorts,
        makeUnique: get().uniqueCombinations,
        balanceSets: get().balanceSets,
        balanceTarget: get().balanceTarget,
      } satisfies WorkerSortData,
    },
    (event) => {
      if (token !== runToken) return true;
      if (event.error) {
        failCalc(set, event.error);
        return true;
      }
      const payload = event.data as WorkerSortData;
      set({
        displayedResults: payload.results,
        balanceNote: payload.balanceNote ?? '',
        isCalculating: false,
        calcProgress: 0,
        calcCores: 0,
      });
      return true;
    },
    (message) => {
      if (token !== runToken) return;
      failCalc(set, message);
    },
  );
}
