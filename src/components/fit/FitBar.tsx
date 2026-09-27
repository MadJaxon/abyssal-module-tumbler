import { MODULE_LABELS, MODULE_TYPES } from '../../types';
import { COMBINATION_WARN_THRESHOLD, estimateCombinationCount } from '../../lib/estimate';
import { fmtNum, inventoryCount } from '../../lib/format';
import { workerCountFor } from '../../lib/parallelPlan';
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
  const cancelCalculation = useTumbler((s) => s.cancelCalculation);
  const isCalculating = useTumbler((s) => s.isCalculating);
  const calcProgress = useTumbler((s) => s.calcProgress);
  const calcCores = useTumbler((s) => s.calcCores);
  const parallelCalc = useTumbler((s) => s.parallelCalc);
  const setParallelCalc = useTumbler((s) => s.setParallelCalc);
  const pendingEstimate = useTumbler((s) => s.pendingEstimate);
  const confirmPending = useTumbler((s) => s.confirmPending);
  const cancelPending = useTumbler((s) => s.cancelPending);
  const displayed = useTumbler((s) => s.displayedResults);
  const expandedResultId = useTumbler((s) => s.expandedResultId);

  const estimate = estimateCombinationCount(inventoryCount(modules), numModules);
  const cores = typeof navigator === 'undefined' ? 1 : navigator.hardwareConcurrency || 1;
  const plannedCores = workerCountFor(estimate, cores, parallelCalc);
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCalculating}
              className="rounded-sm bg-ember px-5 py-2 font-display text-lg tracking-[0.12em] text-ink hover:bg-ember-dim disabled:opacity-60"
              onClick={() => calculate(false)}
            >
              {isCalculating
                ? calcProgress === -1
                  ? 'SORTING…'
                  : `TUMBLING… ${calcProgress.toLocaleString()}${
                      calcCores > 1 ? ` · ${calcCores} cores` : ''
                    }`
                : 'CALCULATE'}
            </button>
            {isCalculating && (
              <button
                type="button"
                className="rounded-sm border border-line px-2 py-1 text-xs text-muted hover:text-ink"
                onClick={cancelCalculation}
              >
                Cancel
              </button>
            )}
          </div>
          <span className="text-[11px] text-muted">
            ~{Number.isFinite(estimate) ? estimate.toLocaleString() : '∞'} combinations
            {estimate > COMBINATION_WARN_THRESHOLD ? ' — large' : ''}
            {parallelCalc && plannedCores > 1 && Number.isFinite(estimate)
              ? ` · ${plannedCores} cores`
              : ''}
          </span>
          <label
            className="flex cursor-pointer items-center gap-2 text-[11px] normal-case tracking-normal text-muted"
            title="Split tumbles of about 5 million combinations and up across CPU cores. Smaller searches stay on one core, where starting extra workers costs more than it saves."
          >
            <input
              type="checkbox"
              checked={parallelCalc}
              disabled={isCalculating}
              onChange={(e) => setParallelCalc(e.target.checked)}
            />
            Multiple cores{cores > 1 ? ` (${cores})` : ''}
          </label>
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
            This will evaluate about {pendingEstimate.toLocaleString()} combinations and may take a
            while. Continue?
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
