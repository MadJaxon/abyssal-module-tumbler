/// <reference lib="webworker" />

import {
  AfterburnerModule,
  BatteryModule,
  DpsModule, MircowarpModule, Module,
  NeutModule,
  NosModule,
  Result, ResultModule,
  SmartbombModule,
  WorkerCommand, WorkerCalcCombinationsData,
  WorkerResult, WorkerSortData
} from '../interfaces';

addEventListener('message', (event: MessageEvent<WorkerCommand>) => {
  // console.log('Received message', event.data);
  switch (event.data.action) {
    case 'findCombinations':
      postMessage(<WorkerResult>{
        action: event.data.action,
        data: findCombinations(event.data.data as WorkerCalcCombinationsData),
        isUpdate: false
      });
      break;
    case 'sort':
      postMessage(<WorkerResult>{
        action: event.data.action,
        data: sort(event.data.data as WorkerSortData),
        isUpdate: false
      });
      break;
    default:
      postMessage(<WorkerResult>{
        action: 'sort',
        data: null,
        error: 'unknown action',
        isUpdate: false
      });
  }
});

function sort(data: WorkerSortData): WorkerSortData {
  if (Object.values(data.sorts).length === 0) {
    data.results = data.makeUnique ? makeResultsUnique(data.results) : data.results;
    return data;
  }
  const sorted = data.results.sort((a, b) => {
    for (const sorter of Object.values(data.sorts)) {
      let valA = a[sorter.key];
      let valB = b[sorter.key];

      // Handle null/undefined
      if (valA == null && valB == null) continue;
      if (valA == null) return sorter.direction === 'asc' ? -1 : 1;
      if (valB == null) return sorter.direction === 'asc' ? 1 : -1;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA < valB) return sorter.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sorter.direction === 'asc' ? 1 : -1;
        continue;
      }

      // Fallback to string comparison for other types
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sorter.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sorter.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  data.results = data.makeUnique ? makeResultsUnique(sorted) : sorted;
  return data;
}


function makeResultsUnique(results: Result[]) {
  let usedItems: {type: string; index: number}[] = [];
  return results.filter(result => {
    let notUsed = true;
    const resultItems: {type: string; index: number}[] = [];
    result.modules.forEach(module => {
      if (usedItems.some(
        item =>
          item.type === module.type &&
          item.index === module.index
      )) {
        notUsed = false;
      }
      resultItems.push({
        type: module.type,
        index: module.index
      });
    });
    if (notUsed) {
      usedItems = usedItems.concat(resultItems);
    }
    return notUsed;
  });
}


function findCombinations(data: WorkerCalcCombinationsData) {
  const totalModules = Object.keys(data.numModules).reduce((sum: number, type) => {
      sum += data.numModules[type];
      return sum;
    },
    0
  );

  if (!data.cpuBudget || !data.pgBudget || !data.numModules || totalModules <= 0) {
    data.error = 'Please enter valid budget and number of modules.';
    return;
  }
  const results: Result[] = [];

  const combinations = generateLimitedCombinations(data.modules, data.numModules);
  combinations.forEach((comb, index) => {
    const totalCpu = comb.reduce((sum, m) => sum + m.cpu, 0);
    const totalPg = comb.reduce((sum, m) => sum + m.pg, 0);
    if (totalCpu <= data.cpuBudget && totalPg <= data.pgBudget) {
      const dpsIncrease = calculateDpsIncrease(comb.filter(m => m.type === 'dps') as DpsModule[]);

      const smartbombs = comb.filter(m => m.type === 'sb') as SmartbombModule[];
      const smartbombDps = smartbombs.reduce((carry: number, current)=> {
        return carry + (current.damage / (current.activationTime / 1000));
      }, 0);
      const smartbombGjs = smartbombs.reduce((carry: number, current)=> {
        return carry + (current.activationCost / (current.activationTime / 1000));
      }, 0);
      const smartbombRange = smartbombs.length === 0 ? 0 : smartbombs.reduce((carry: number, current)=> {
        return carry + current.range;
      }, 0) / smartbombs.length;

      const neuts = comb.filter(m => m.type === 'neut') as NeutModule[];
      const neutAmount = neuts.reduce((carry: number, current)=> {
        return carry + (current.neutAmount / (current.activationTime / 1000));
      }, 0);
      const neutGjs = neuts.reduce((carry: number, current)=> {
        return carry + (current.activationCost / (current.activationTime / 1000));
      }, 0);
      const neutRange = neuts.length === 0 ? 0 : neuts.reduce((carry: number, current)=> {
        return carry + current.range;
      }, 0) / neuts.length;

      const noses = comb.filter(m => m.type === 'nos') as NosModule[];
      const nosAmount = noses.reduce((carry: number, current)=> {
        return carry + (current.drainAmount / (current.activationTime / 1000));
      }, 0);
      const nosRange = noses.length === 0 ? 0 : noses.reduce((carry: number, current)=> {
        return carry + current.range;
      }, 0) / noses.length;

      const batteries = comb.filter(m => m.type === 'battery') as BatteryModule[];
      const capBonus = batteries.reduce((carry: number, current)=> {
        return carry + current.capacitorBonus;
      }, 0);
      const drainResistance = calculateDrainResistanceBonus(batteries);

      const aferburners = comb.filter(m => m.type === 'ab') as AfterburnerModule[];
      const abVelocity = Math.max(...aferburners.map(ab=> ab.velocityBonus));
      const abGj = Math.max(...aferburners.map(ab=> ab.activationCost));

      const mwds = comb.filter(m => m.type === 'mwd') as MircowarpModule[];
      const mwdVelocity = Math.max(...mwds.map(ab=> ab.velocityBonus));
      const mwdGj = Math.max(...mwds.map(ab=> ab.activationCost));
      const mwdSignature = Math.max(...mwds.map(ab=> ab.signatureRadiusModifier));


      const totalGj = Math.max(0, smartbombGjs) + Math.max(0, neutGjs) + Math.max(0, abGj, mwdGj);

      results.push({
        id: index,
        modules: comb.map(m => ({type: m.type, index: m.index, itemId: m.itemId, typeId: m.typeId})) as ResultModule[],
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
        totalGj
      });
      postMessage(<WorkerResult>{
        action: 'findCombinations',
        data: results.length,
        isUpdate: true
      });
    }
  });

  data.results = results;

  return data;
}


// First, define a function to generate all combinations of size r from an array
function combinations(arr: Module[], r: number): Module[][] {
  if (r === 0) {
    return [[]];
  }
  if (arr.length < r) {
    return [];
  }
  const result: Module[][] = [];
  for (let i = 0; i <= arr.length - r; i++) {
    const head = arr[i];
    const tails = combinations(arr.slice(i + 1), r - 1);
    for (const tail of tails) {
      result.push([head, ...tail]);
    }
  }
  return result;
}

// Then, define a function for the Cartesian product that concatenates subsets
function cartesianProduct(subsetLists: Module[][][]): Module[][] {
  return subsetLists.reduce((acc: Module[][], curr: Module[][]) => {
    const res: Module[][] = [];
    for (const a of acc) {
      for (const b of curr) {
        res.push([...a, ...b]);
      }
    }
    return res;
  }, [[]]);
}

// Now, the main function to generate all limited combinations
function generateLimitedCombinations(data: Record<string, Module[]>, limits: Record<string, number>): Module[][] {
  const allSubsets: Record<string, any[][]> = {};
  const keys = Object.keys(data);

  for (const key of keys) {
    const arr = data[key];
    const limit = limits[key] ?? 0; // Default to 0 if no limit specified
    const subsets: any[][] = [];
    for (let r = 0; r <= Math.min(limit, arr.length); r++) {
      // chunking as a workaround for javascripts maximum function arguments limitation
      const chunkSize = 100;
      const combinationsArray = combinations(arr, r);
      for (let i = 0; i < combinationsArray.length; i += chunkSize) {
        const chunk = combinationsArray.slice(i, i + chunkSize);
        subsets.push(...chunk);
      }
    }
    allSubsets[key] = subsets;
  }

  const subsetLists = keys.map(key => allSubsets[key]);
  const maxFilteredCombinations = cartesianProduct(subsetLists);
  return maxFilteredCombinations.filter(set =>
    !Object.keys(limits).some(type =>
      set.filter(set => set.type === type)
        .length !== limits[type]
    )
  );
}

function calculateDpsIncrease(modules: DpsModule[]): number {
  let dmgBonuses: number[] = modules.map(m => m.dmgMulti - 1);
  let rofBonuses: number[] = modules.map(m => m.rofBonus / 100); // Fractional reductions

  // Sort descending for strongest first
  dmgBonuses.sort((a, b) => b - a);
  rofBonuses.sort((a, b) => b - a);

  // Damage multipliers (product of (1 + penalized bonus))
  let totalDmg = 1.0;
  for (let i = 0; i < dmgBonuses.length; i++) {
    const penalty = Math.exp( - Math.pow(i / 2.67, 2) );
    totalDmg *= (1 + dmgBonuses[i] * penalty);
  }

  // Cycle time multipliers (product of (1 - penalized reduction)), then invert for DPS from RoF
  let totalCycle = 1.0;
  for (let i = 0; i < rofBonuses.length; i++) {
    const penalty = Math.exp( - Math.pow(i / 2.67, 2) );
    totalCycle *= (1 - rofBonuses[i] * penalty);
  }
  const totalRof = (totalCycle > 0) ? 1 / totalCycle : 1; // Avoid division by zero

  const dpsMulti = totalDmg * totalRof;
  return (dpsMulti - 1) * 100;
}


function calculateDrainResistanceBonus(modules: BatteryModule[]): number {
  let resistBonuses: number[] = modules.map(m => Math.abs(m.drainResistanceBonus) / 100); // Absolute fractional resistances
// Sort descending for strongest first (largest absolute value)
  resistBonuses.sort((a, b) => b - a);
// Drain multiplier (product of (1 - penalized resistance))
  let totalDrainMulti = 1.0;
  for (let i = 0; i < resistBonuses.length; i++) {
    const penalty = Math.exp( - Math.pow(i / 2.67, 2) );
    totalDrainMulti *= (1 - resistBonuses[i] * penalty);
  }
  const effectiveResistance = (1 - totalDrainMulti) * 100; // Positive % resistance
  return -effectiveResistance; // Return as negative to match in-game display
}
