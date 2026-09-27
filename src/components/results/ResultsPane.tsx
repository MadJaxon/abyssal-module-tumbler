import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';
import { MODULE_LABELS, MODULE_TYPES, type Result } from '../../types';
import { useTumbler } from '../../store/useTumbler';
import { ResultRow } from './ResultRow';

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
  const setDenseTable = useTumbler((s) => s.setDenseTable);
  const uniqueCombinations = useTumbler((s) => s.uniqueCombinations);
  const setUnique = useTumbler((s) => s.setUnique);
  const balanceSets = useTumbler((s) => s.balanceSets);
  const setBalanceSets = useTumbler((s) => s.setBalanceSets);
  const balanceTarget = useTumbler((s) => s.balanceTarget);
  const setBalanceTarget = useTumbler((s) => s.setBalanceTarget);
  const numModules = useTumbler((s) => s.numModules);
  const sorts = useTumbler((s) => s.sorts);
  const toggleSort = useTumbler((s) => s.toggleSort);
  const balanceNoteText = useTumbler((s) => s.balanceNote);
  const expandedResultId = useTumbler((s) => s.expandedResultId);
  const isCalculating = useTumbler((s) => s.isCalculating);
  const parentRef = useRef<HTMLDivElement>(null);

  const best = useMemo(() => bestInColumn(displayed), [displayed]);

  const virtualizer = useVirtualizer({
    count: displayed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (denseTable ? 32 : 64),
    overscan: 12,
  });

  useEffect(() => {
    // virtualizer is a stable store; listing it retriggers measure forever.
    virtualizer.measure();
  }, [expandedResultId, denseTable, displayed.length]);

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
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-2 text-sm text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={uniqueCombinations}
            onChange={(e) => setUnique(e.target.checked)}
          />
          Unique modules across results
        </label>
        {uniqueCombinations && (
          <label
            className="flex cursor-pointer items-center gap-2"
            title="Pick this many disjoint fits and level the first sort column across them. Descending raises the weakest fit; ascending lowers the strongest. The ordinary unique list still gives the best modules to the first fit."
          >
            <input
              type="checkbox"
              checked={balanceSets}
              onChange={(e) => setBalanceSets(e.target.checked)}
            />
            Balance sets
          </label>
        )}
        {uniqueCombinations && balanceSets && (
          <label className="flex items-center gap-2">
            Target
            <input
              type="number"
              min={1}
              max={99}
              value={balanceTarget}
              className="compact-num"
              onChange={(e) => setBalanceTarget(parseInt(e.target.value, 10))}
            />
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={denseTable}
            onChange={(e) => setDenseTable(e.target.checked)}
          />
          Dense table
        </label>
      </div>

      {displayed.length === 0 && !isCalculating && (
        <div className="m-4 border border-dashed border-line bg-panel/30 p-6 text-sm text-muted">
          Set how many of each module belong in the fit, then calculate. Combinations that exceed CPU or
          PG are dropped; stacking penalties on DPS and drain resistance match the original tumbler.
        </div>
      )}

      {displayed.length > 0 && (
        <div ref={parentRef} className={`min-h-0 flex-1 overflow-auto ${denseTable ? 'px-2 py-1' : 'px-3 py-2'}`}>
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
                    paddingBottom: denseTable ? 2 : 8,
                  }}
                >
                  <ResultRow result={result} best={best} dense={denseTable} />
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