import {
  MODULE_LABELS,
  type AbyssalModuleType,
  type AfterburnerModule,
  type BatteryModule,
  type DpsModule,
  type MircowarpModule,
  type Module,
  type NeutModule,
  type NosModule,
  type SmartbombModule,
} from '../types';

export function fmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtIsk(n: number | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000_000) return `${fmtNum(n / 1_000_000_000, 2)}b ISK`;
  return `${fmtNum(n / 1_000_000, 0)}m ISK`;
}

export function typeIconUrl(typeId: number | string | undefined): string | null {
  if (typeId == null || typeId === '') return null;
  return `https://images.evetech.net/types/${typeId}/icon`;
}

export function mutamarketUrl(itemId: string | undefined): string | null {
  if (!itemId) return null;
  return `https://mutamarket.com/modules/${itemId}`;
}

export function moduleTitle(module: Pick<Module, 'name' | 'type' | 'index'>): string {
  const name = module.name?.trim();
  const label = `${MODULE_LABELS[module.type]} #${module.index}`;
  return name ? `${name}` : label;
}

export function moduleStatChips(module: Module): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [
    { label: 'CPU', value: `${fmtNum(module.cpu, 2)} tf` },
    { label: 'PG', value: `${fmtNum(module.pg, 2)} MW` },
  ];
  switch (module.type) {
    case 'dps': {
      const m = module as DpsModule;
      chips.push({ label: 'Dmg', value: `×${fmtNum(m.dmgMulti, 3)}` });
      chips.push({ label: 'RoF', value: `${fmtNum(m.rofBonus, 2)}%` });
      break;
    }
    case 'sb': {
      const m = module as SmartbombModule;
      chips.push({ label: 'Dmg', value: fmtNum(m.damage, 0) });
      chips.push({ label: 'Cycle', value: `${fmtNum(m.activationTime / 1000, 2)}s` });
      chips.push({ label: 'Range', value: `${fmtNum(m.range, 0)} m` });
      break;
    }
    case 'neut': {
      const m = module as NeutModule;
      chips.push({ label: 'Neut', value: `${fmtNum(m.neutAmount, 0)} GJ` });
      chips.push({ label: 'Range', value: `${fmtNum(m.range, 0)} m` });
      break;
    }
    case 'nos': {
      const m = module as NosModule;
      chips.push({ label: 'Drain', value: `${fmtNum(m.drainAmount, 0)} GJ` });
      chips.push({ label: 'Range', value: `${fmtNum(m.range, 0)} m` });
      break;
    }
    case 'battery': {
      const m = module as BatteryModule;
      chips.push({ label: 'Cap', value: `+${fmtNum(m.capacitorBonus, 0)}` });
      chips.push({ label: 'Resist', value: `${fmtNum(m.drainResistanceBonus, 2)}%` });
      break;
    }
    case 'ab': {
      const m = module as AfterburnerModule;
      chips.push({ label: 'Vel', value: `${fmtNum(m.velocityBonus, 1)}%` });
      chips.push({ label: 'Cap', value: `${fmtNum(m.activationCost, 1)} GJ` });
      break;
    }
    case 'mwd': {
      const m = module as MircowarpModule;
      chips.push({ label: 'Vel', value: `${fmtNum(m.velocityBonus, 1)}%` });
      chips.push({ label: 'Sig', value: `${fmtNum(m.signatureRadiusModifier, 1)}%` });
      break;
    }
    default:
      break;
  }
  return chips;
}

export function inventoryCount(
  modules: Record<AbyssalModuleType, Module[]>,
): Record<AbyssalModuleType, number> {
  return {
    dps: modules.dps.length,
    sb: modules.sb.length,
    neut: modules.neut.length,
    nos: modules.nos.length,
    battery: modules.battery.length,
    ab: modules.ab.length,
    mwd: modules.mwd.length,
  };
}
