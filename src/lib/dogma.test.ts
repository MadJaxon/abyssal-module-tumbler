import { describe, expect, it } from 'vitest';
import { parseDogmaResponseIntoModules } from './dogma';
import type { EsiItem } from './chatParser';

function item(
  attrs: { attribute_id: number; value: number }[],
  extra: Partial<EsiItem> = {},
): EsiItem {
  return {
    typeId: 1,
    itemId: '10',
    name: extra.name ?? 'test',
    dogma: {
      created_by: 1,
      mutator_type_id: 2,
      source_type_id: 3,
      dogma_effects: [],
      dogma_attributes: attrs,
    },
    ...extra,
  };
}

const cpuPg = [
  { attribute_id: 50, value: 30 },
  { attribute_id: 30, value: 5 },
];

describe('parseDogmaResponseIntoModules', () => {
  it('returns null without CPU/PG', () => {
    expect(parseDogmaResponseIntoModules([item([])])[0]).toBeNull();
  });

  it('classifies DPS before other types', () => {
    const classified = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 64, value: 1.2 },
        { attribute_id: 204, value: 0.9 },
        { attribute_id: 90, value: 50 },
        { attribute_id: 54, value: 8000 },
        { attribute_id: 73, value: 5000 },
      ]),
    ])[0];
    expect(classified?.type).toBe('dps');
    expect(classified && 'rofBonus' in classified && classified.rofBonus).toBeCloseTo(10);
  });

  it('classifies NOS, then neut, then smartbomb, then MWD, then AB, then battery', () => {
    const nos = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 73, value: 5000 },
        { attribute_id: 90, value: 40 },
        { attribute_id: 54, value: 6000 },
      ]),
    ])[0];
    const neut = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 73, value: 5000 },
        { attribute_id: 6, value: 20 },
        { attribute_id: 97, value: 80 },
        { attribute_id: 54, value: 7000 },
      ]),
    ])[0];
    const sb = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 6, value: 15 },
        { attribute_id: 73, value: 10000 },
        { attribute_id: 99, value: 5000 },
        { attribute_id: 114, value: 100 },
        { attribute_id: 118, value: 0 },
        { attribute_id: 117, value: 0 },
        { attribute_id: 116, value: 0 },
      ]),
    ])[0];
    const mwd = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 73, value: 10000 },
        { attribute_id: 6, value: 150 },
        { attribute_id: 20, value: 500 },
        { attribute_id: 554, value: 500 },
      ]),
    ])[0];
    const ab = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 73, value: 10000 },
        { attribute_id: 6, value: 20 },
        { attribute_id: 20, value: 130 },
      ]),
    ])[0];
    const battery = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 67, value: 400 },
        { attribute_id: 2267, value: -20 },
      ]),
    ])[0];

    expect(nos?.type).toBe('nos');
    expect(neut?.type).toBe('neut');
    expect(sb?.type).toBe('sb');
    expect(mwd?.type).toBe('mwd');
    expect(ab?.type).toBe('ab');
    expect(battery?.type).toBe('battery');
  });

  it('uses missile damage multiplier when turret multiplier is missing', () => {
    const classified = parseDogmaResponseIntoModules([
      item([
        ...cpuPg,
        { attribute_id: 213, value: 1.18 },
        { attribute_id: 204, value: 0.92 },
      ]),
    ])[0];
    expect(classified?.type).toBe('dps');
    expect(classified && 'dmgMulti' in classified && classified.dmgMulti).toBe(1.18);
  });
});
