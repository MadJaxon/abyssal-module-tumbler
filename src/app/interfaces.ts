export type AbyssalModuleType = 'dps'|'sb'|'neut'|'nos'|'battery'|'ab'|'mwd';

export interface Module {
  type: AbyssalModuleType;
  name: string;
  cpu: number;
  pg: number;
  index: number;
  typeId?: number;
  itemId?: string;
  estPrice?: number;
}
export interface ActiveModule extends Module {
  activationCost: number;
  activationTime: number;
}

export interface DpsModule extends Module {
  dmgMulti: number;
  rofBonus: number;
}

export interface NosModule extends Module {
  activationTime: number;
  range: number;
  drainAmount: number;
}

export interface NeutModule extends ActiveModule {
  range: number;
  neutAmount: number;
}

export interface SmartbombModule extends ActiveModule {
  range: number;
  damage: number;
}

export interface BatteryModule extends Module {
  capacitorBonus: number;
  drainResistanceBonus: number;
}

export interface AfterburnerModule extends ActiveModule {
  velocityBonus: number;
}

export interface MircowarpModule extends AfterburnerModule {
  signatureRadiusModifier: number;
}

export interface ResultModule {
  type: AbyssalModuleType;
  index: number;
  typeId?: string;
  itemId?: string;
}

export interface Result {
  id: number;
  modules: ResultModule[];
  totalCpu: number;
  totalPg: number;
  dpsIncrease: number;
  smartbombDps: number;
  smartbombGjs: number;
  smartbombRange: number;
  neutAmount: number;
  neutGjs: number;
  neutRange: number;
  nosAmount: number;
  nosRange: number;
  capBonus: number;
  drainResistance: number;
  abVelocity: number
  abGj: number;
  mwdVelocity: number;
  mwdGj: number;
  mwdSignature: number;
  totalGj: number;
}

export interface TableSorter {
  key: keyof Result;
  direction: 'asc' | 'desc';
}

export interface WorkerSortData {
  results: Result[];
  sorts: TableSorter[];
  makeUnique: boolean;
}

export interface WorkerCalcCombinationsData {
  cpuBudget: number,
  pgBudget: number,
  modules: {
    dps: Module[],
    sb: Module[],
    neut: Module[],
    nos: Module[],
    battery: Module[],
    ab: Module[],
    mwd: Module[]
  },
  numModules: {[key: string]: number},
  sorts: TableSorter[],
  error?: string,
  results?: Result[]
}

export interface WorkerCommand {
  action: 'findCombinations'|'sort';
  data: WorkerSortData|WorkerCalcCombinationsData|null|number;
}

export interface WorkerResult extends WorkerCommand {
  action: 'findCombinations'|'sort';
  isUpdate: boolean;
  error?: string;
}
