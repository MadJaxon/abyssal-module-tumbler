/** Cap heaps. Each worker holds its own copy of the module list and its slice of fits. */
export const MAX_CALC_WORKERS = 12;

// Below this, worker startup and merging cost more than the walk.
const MIN_COMBINATIONS_TO_SPLIT = 5_000_000;
const MIN_COMBINATIONS_PER_WORKER = 1_000_000;

/** How many workers a tumble is worth. Small searches stay on one core either way. */
export function workerCountFor(total: number, cores: number, enabled: boolean): number {
  const available = Number.isFinite(cores) ? Math.floor(cores) : 1;
  const usable = Math.max(1, Math.min(available, MAX_CALC_WORKERS));
  if (!enabled || usable < 2) return 1;
  if (!Number.isFinite(total)) return usable;
  if (total < MIN_COMBINATIONS_TO_SPLIT) return 1;
  const byWork = Math.max(1, Math.floor(total / MIN_COMBINATIONS_PER_WORKER));
  return Math.min(usable, byWork);
}

/** Contiguous [start, end) slices covering `total` with no gaps or overlap. */
export function splitRange(total: number, workers: number): { start: number; end: number }[] {
  if (total <= 0) return [{ start: 0, end: 0 }];
  const n = Math.max(1, Math.min(Math.floor(workers) || 1, total));
  const base = Math.floor(total / n);
  const extra = total % n;
  const spans: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i < n; i++) {
    const len = base + (i < extra ? 1 : 0);
    spans.push({ start, end: start + len });
    start += len;
  }
  return spans;
}
