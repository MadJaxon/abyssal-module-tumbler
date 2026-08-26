import { MODULE_LABELS, MODULE_TYPES } from '../../types';
import { COMBINATION_WARN_THRESHOLD, estimateCombinationCount } from '../../lib/estimate';
import { fmtNum, inventoryCount } from '../../lib/format';
import { useTumbler } from '../../store/useTumbler';

export function FitBar() {
  const cpuBudget = useTumbler((s) => s.cpuBudget);
  const pgBudget = useTumbler((s) => s.pgBudget);
  const setCpuBudget = useTumbler((s) => s.setCpuBudget);
  const setPgBudget = useTumbler((s) => s.setPgBudget);
  const modules = useTumbler((s) => s.modules);
  const numModules = useTumbler((s) => s.numModules);
  const setNumModules = useTumbler((s) => s.setNumModules);
  const calculate = useTumbler((s) => s.calculate);
  const isCalculating = useTumbler((s) => s.isCalculating);
  const calcProgress = useTumbler((s) => s.calcProgress);
  const pendingEstimate = useTumbler((s) => s.pendingEstimate);
  const confirmPending = useTumbler((s) => s.confirmPending);
  const cancelPending = useTumbler((s) => s.cancelPending);
  const displayed = useTumbler((s) => s.displayedResults);
  const expandedResultId = useTumbler((s) => s.expandedResultId);

  const estimate = estimateCombinationCount(inventoryCount(modules), numModules);
  const selected =
    displayed.find((r) => r.id === expandedResultId) ?? displayed[0] ?? null;
  const leftoverCpu = selected ? cpuBudget - selected.totalCpu : null;
  const leftoverPg = selected ? pgBudget - selected.totalPg : null;

  return (
    <section className="shrink-0 border-b border-line bg-hull/80 px-4 py-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted">
          CPU budget (tf)
          <input
            type="number"
            value={cpuBudget}
            className="w-32 font-mono text-sm"
            onChange={(e) => setCpuBudget(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted">
          Powergrid (MW)
          <input
            type="number"
            value={pgBudget}
            className="w-32 font-mono text-sm"
            onChange={(e) => setPgBudget(parseFloat(e.target.value) || 0)}
          />
        </label>
        {selected && leftoverCpu != null && leftoverPg != null && (
          <div className="flex flex-col gap-1 text-xs text-muted">
            <span>
              Leftover on highlighted fit:{' '}
              <span className="font-mono text-teal">
                {fmtNum(leftoverCpu, 1)} tf · {fmtNum(leftoverPg, 1)} MW
              </span>
            </span>
            <FitMeter used={selected.totalCpu} max={cpuBudget} />
            <FitMeter used={selected.totalPg} max={pgBudget} />
          </div>
        )}
        <div className="ml-auto flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={isCalculating}
            className="rounded-sm bg-ember px-5 py-2 font-display text-lg tracking-[0.12em] text-ink hover:bg-ember-dim disabled:opacity-60"
            onClick={() => calculate(false)}
          >
            {isCalculating
              ? calcProgress === -1
                ? 'SORTING…'
                : `TUMBLING… ${calcProgress.toLocaleString()}`
              : 'CALCULATE'}
          </button>
          <span className="text-[11px] text-muted">
            ~{Number.isFinite(estimate) ? estimate.toLocaleString() : '∞'} combinations
            {estimate > COMBINATION_WARN_THRESHOLD ? ' — large' : ''}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {MODULE_TYPES.map((type) => {
          const have = modules[type].length;
          const need = numModules[type] ?? 0;
          if (have === 0 && need === 0) return null;
          return (
            <div key={type} className="flex items-center gap-1 border border-line bg-panel px-2 py-1">
              <span className="text-[11px] text-muted">{MODULE_LABELS[type]}</span>
              <button
                type="button"
                className="px-1 text-muted hover:text-ink"
                onClick={() => setNumModules(type, need - 1)}
              >
                −
              </button>
              <span className="min-w-6 text-center font-mono text-sm">{need}</span>
              <button
                type="button"
                className="px-1 text-muted hover:text-ink"
                onClick={() => setNumModules(type, need + 1)}
              >
                +
              </button>
              <span className="text-[11px] text-muted">/ {have}</span>
            </div>
          );
        })}
      </div>

      {pendingEstimate != null && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-ember/60 bg-ember/10 px-3 py-2 text-sm">
          <p>
            This will evaluate about {pendingEstimate.toLocaleString()} combinations and may stall the
            tab. Continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-sm border border-line px-3 py-1 text-muted hover:text-ink"
              onClick={cancelPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-sm bg-ember px-3 py-1 text-ink hover:bg-ember-dim"
              onClick={confirmPending}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FitMeter({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="h-1.5 w-48 overflow-hidden bg-raised">
      <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
    </div>
  );
}
