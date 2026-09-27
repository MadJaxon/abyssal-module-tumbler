import { describe, expect, it } from 'vitest';
import { splitRange, workerCountFor } from './parallelPlan';

describe('workerCountFor', () => {
  it('stays on one core when the toggle is off or the search is small', () => {
    expect(workerCountFor(1_000_000, 8, false)).toBe(1);
    expect(workerCountFor(7_999, 8, true)).toBe(1);
    expect(workerCountFor(100_000, 1, true)).toBe(1);
  });

  it('splits large searches across the machine, capped', () => {
    expect(workerCountFor(5_000_000, 8, true)).toBe(5);
    expect(workerCountFor(24_000_000, 4, true)).toBe(4);
    expect(workerCountFor(1_000_000, 8, true)).toBe(1);
    expect(workerCountFor(80_000_000, 32, true)).toBe(12);
    expect(workerCountFor(Number.POSITIVE_INFINITY, 8, true)).toBe(8);
  });
});

describe('splitRange', () => {
  it('covers the index space without gaps or overlap', () => {
    const spans = splitRange(5, 2);
    expect(spans).toEqual([
      { start: 0, end: 3 },
      { start: 3, end: 5 },
    ]);
    const many = splitRange(100, 7);
    expect(many[0].start).toBe(0);
    expect(many[many.length - 1].end).toBe(100);
    for (let i = 1; i < many.length; i++) {
      expect(many[i].start).toBe(many[i - 1].end);
    }
  });

  it('returns an empty slice when there is nothing to score', () => {
    expect(splitRange(0, 4)).toEqual([{ start: 0, end: 0 }]);
  });
});
