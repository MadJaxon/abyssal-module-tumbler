import { beforeEach, describe, expect, it } from 'vitest';
import { defaultPersisted, loadPersisted, PERSIST_KEY, savePersisted } from './persist';

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips inventory JSON', () => {
    const slice = defaultPersisted();
    slice.cpuBudget = 420;
    slice.pgBudget = 38;
    slice.uniqueCombinations = true;
    slice.numModules.dps = 3;
    slice.modules.dps = [
      { type: 'dps', name: 'dps-1', index: 1, cpu: 10, pg: 10, dmgMulti: 1.2, rofBonus: 10 } as never,
    ];
    savePersisted(slice);
    expect(localStorage.getItem(PERSIST_KEY)).toContain('"cpuBudget":420');
    const loaded = loadPersisted();
    expect(loaded?.cpuBudget).toBe(420);
    expect(loaded?.pgBudget).toBe(38);
    expect(loaded?.uniqueCombinations).toBe(true);
    expect(loaded?.numModules.dps).toBe(3);
    expect(loaded?.modules.dps).toHaveLength(1);
    expect(loaded?.modules.sb).toEqual([]);
  });

  it('returns null when empty', () => {
    expect(loadPersisted()).toBeNull();
  });

  it('turns multiple cores on when an older save has no flag', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ cpuBudget: 12 }));
    const loaded = loadPersisted();
    expect(loaded?.parallelCalc).toBe(true);
    expect(loaded?.balanceSets).toBe(false);
    expect(loaded?.balanceTarget).toBe(3);
    expect(loaded?.cpuBudget).toBe(12);
  });
});
