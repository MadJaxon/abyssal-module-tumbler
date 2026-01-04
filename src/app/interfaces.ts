export type AbyssalModuleType = 'dps'|'sb'|'neut'|'nos'|'battery'|'ab'|'mwd';

export interface Module {
  type: AbyssalModuleType;
  cpu: number;
  pg: number;
  index: number;
  itemId?: string;
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

export interface Result {
  id: number;
  modules: {
    type: AbyssalModuleType;
    index: number;
  }[];
  totalCpu: number;
  totalPg: number;
  dpsIncrease: number;
  smartbombDps: number;
  smartbombGjs: number;
  neutAmount: number;
  neutGjs: number;
  neutRange: number;
  nosAmount: number;
  nosRange: number;
}

export interface TableSorter {
  key: keyof Result;
  direction: 'asc' | 'desc';
}
