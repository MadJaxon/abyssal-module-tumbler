import type { ReactNode } from 'react';
import { useTumbler } from '../store/useTumbler';

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <path fill="#d6453d" d="M16 2 L29 28 H3 Z" />
      <path fill="#07080b" d="M16 8 L24 26 H8 Z" />
      <path fill="#d4a056" d="M16 13 L20.5 24 H11.5 Z" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const uniqueCombinations = useTumbler((s) => s.uniqueCombinations);
  const setUnique = useTumbler((s) => s.setUnique);
  const balanceSets = useTumbler((s) => s.balanceSets);
  const setBalanceSets = useTumbler((s) => s.setBalanceSets);
  const balanceTarget = useTumbler((s) => s.balanceTarget);
  const setBalanceTarget = useTumbler((s) => s.setBalanceTarget);
  const denseTable = useTumbler((s) => s.denseTable);
  const setDenseTable = useTumbler((s) => s.setDenseTable);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-line bg-hull/90 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-[0.18em] text-ink">
                ABYSSAL TUMBLER
              </h1>
              <p className="text-xs tracking-wide text-muted">
                Match mutated modules to a fitting budget
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={denseTable}
              onChange={(e) => setDenseTable(e.target.checked)}
            />
            Dense table
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-line/70 px-5 py-2 text-sm text-muted">
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
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">{children}</main>
    </div>
  );
}
