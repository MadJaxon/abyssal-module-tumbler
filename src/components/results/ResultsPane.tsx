import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { MODULE_LABELS, MODULE_TYPES, type Result } from '../../types';
import { useTumbler } from '../../store/useTumbler';
import { ResultRow } from './ResultRow';
import { ResultsTable } from './ResultsTable';

const SORT_KEYS: { key: keyof Result; label: string; when: (num: { [k: string]: number }) => boolean }[] = [
  { key: 'dpsIncrease', label: 'DPS %', when: (n) => (n.dps ?? 0) > 0 },
  { key: 'totalCpu', label: 'CPU', when: () => true },
  { key: 'totalPg', label: 'PG', when: () => true },
  { key: 'smartbombDps', label: 'SB DPS', when: (n) => (n.sb ?? 0) > 0 },
  { key: 'neutAmount', label: 'Neut/s', when: (n) => (n.neut ?? 0) > 0 },
  { key: 'nosAmount', label: 'NOS/s', when: (n) => (n.nos ?? 0) > 0 },
  { key: 'capBonus', label: 'Cap', when: (n) => (n.battery ?? 0) > 0 },
  { key: 'drainResistance', label: 'Resist', when: (n) => (n.battery ?? 0) > 0 },
  { key: 'abVelocity', label: 'AB vel', when: (n) => (n.ab ?? 0) > 0 },
  { key: 'mwdVelocity', label: 'MWD vel', when: (n) => (n.mwd ?? 0) > 0 },
  { key: 'totalGj', label: 'GJ/s', when: (n) => (n.sb ?? 0) + (n.neut ?? 0) + (n.ab ?? 0) + (n.mwd ?? 0) > 0 },
];

export function ResultsPane() {
  const displayed = useTumbler((s) => s.displayedResults);
  const denseTable = useTumbler((s) => s.denseTable);
  const numModules = useTumbler((s) => s.numModules);
  const sorts = useTumbler((s) => s.sorts);
  const toggleSort = useTumbler((s) => s.toggleSort);
  const balanceNoteText = useTumbler((s) => s.balanceNote);
  const isCalculating = useTumbler((s) => s.isCalculating);
  const parentRef = useRef<HTMLDivElement>(null);

  const best = useMemo(() => bestInColumn(displayed), [displayed]);

  const virtualizer = useVirtualizer({
    count: displayed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const slotHint = MODULE_TYPES.filter((t) => (numModules[t] ?? 0) > 0)
    .map((t) => `${numModules[t]}× ${MODULE_LABELS[t]}`)
    .join(' · ');

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-void/40">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
        <h2 className="font-display text-lg tracking-[0.14em]">
          RESULTS{' '}
          <span className="font-mono text-sm text-muted">
            {displayed.length.toLocaleString()}
            {slotHint ? ` · ${slotHint}` : ''}
          </span>
        </h2>
        <div className="flex flex-wrap gap-1">
          {SORT_KEYS.filter((k) => k.when(numModules)).map((k) => {
            const sort = sorts.find((s) => s.key === k.key);
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => toggleSort(k.key)}
                className={`rounded-sm border px-2 py-1 text-[11px] ${
                  sort ? 'border-ember text-ink' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {k.label}
                {sort ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            );
          })}
        </div>
        {balanceNoteText && (
          <p className="w-full text-xs text-amber">{balanceNoteText}</p>
        )}
      </div>

      {displayed.length === 0 && !isCalculating && (
        <div className="m-4 border border-dashed border-line bg-panel/30 p-6 text-sm text-muted">
          Set how many of each module belong in the fit, then calculate. Combinations that exceed CPU or
          PG are dropped; stacking penalties on DPS and drain resistance match the original tumbler.
        </div>
      )}

      {denseTable && displayed.length > 0 && <ResultsTable rows={displayed} best={best} />}

      {!denseTable && displayed.length > 0 && (
        <div ref={parentRef} className="min-h-0 flex-1 overflow-auto px-3 py-2">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((item) => {
              const result = displayed[item.index];
              return (
                <div
                  key={result.id}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${item.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  <ResultRow result={result} best={best} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function bestInColumn(rows: Result[]): Partial<Record<keyof Result, number>> {
  const keys: (keyof Result)[] = [
    'dpsIncrease',
    'smartbombDps',
    'neutAmount',
    'nosAmount',
    'capBonus',
    'abVelocity',
    'mwdVelocity',
  ];
  const mins: (keyof Result)[] = ['totalCpu', 'totalPg', 'totalGj', 'drainResistance'];
  const best: Partial<Record<keyof Result, number>> = {};
  if (rows.length === 0) return best;
  for (const key of keys) {
    best[key] = Math.max(...rows.map((r) => Number(r[key])));
  }
  for (const key of mins) {
    const values = rows.map((r) => Number(r[key])).filter(Number.isFinite);
    if (values.length) best[key] = Math.min(...values);
  }
  return best;
}