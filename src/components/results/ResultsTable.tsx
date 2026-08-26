import type { ReactNode } from 'react';
import { useTumbler } from '../../store/useTumbler';
import { fmtNum } from '../../lib/format';
import { MODULE_LABELS, type Result, type TableSorter } from '../../types';
import { TypeIcon } from '../TypeIcon';

export function ResultsTable({
  rows,
  best,
}: {
  rows: Result[];
  best: Partial<Record<keyof Result, number>>;
}) {
  const numModules = useTumbler((s) => s.numModules);
  const sorts = useTumbler((s) => s.sorts);
  const toggleSort = useTumbler((s) => s.toggleSort);
  const modules = useTumbler((s) => s.modules);
  const hasCap =
    (numModules.neut ?? 0) > 0 ||
    (numModules.sb ?? 0) > 0 ||
    (numModules.ab ?? 0) > 0 ||
    (numModules.mwd ?? 0) > 0;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="sticky top-0 bg-hull">
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="border-b border-line px-3 py-2">Modules</th>
            <SortTh sorts={sorts} type="totalCpu" onClick={toggleSort}>
              CPU
            </SortTh>
            <SortTh sorts={sorts} type="totalPg" onClick={toggleSort}>
              PG
            </SortTh>
            {(numModules.dps ?? 0) > 0 && (
              <SortTh sorts={sorts} type="dpsIncrease" onClick={toggleSort}>
                DPS %
              </SortTh>
            )}
            {(numModules.sb ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="smartbombDps" onClick={toggleSort}>
                  SB DPS
                </SortTh>
                <SortTh sorts={sorts} type="smartbombGjs" onClick={toggleSort}>
                  SB GJ/s
                </SortTh>
                <th className="border-b border-line px-3 py-2">SB DPS/GJ</th>
                <SortTh sorts={sorts} type="smartbombRange" onClick={toggleSort}>
                  SB range
                </SortTh>
              </>
            )}
            {(numModules.neut ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="neutAmount" onClick={toggleSort}>
                  Neut/s
                </SortTh>
                <SortTh sorts={sorts} type="neutGjs" onClick={toggleSort}>
                  Neut GJ/s
                </SortTh>
                <th className="border-b border-line px-3 py-2">Neut/GJ</th>
                <SortTh sorts={sorts} type="neutRange" onClick={toggleSort}>
                  Neut range
                </SortTh>
              </>
            )}
            {(numModules.nos ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="nosAmount" onClick={toggleSort}>
                  NOS/s
                </SortTh>
                <SortTh sorts={sorts} type="nosRange" onClick={toggleSort}>
                  NOS range
                </SortTh>
              </>
            )}
            {(numModules.battery ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="capBonus" onClick={toggleSort}>
                  Cap
                </SortTh>
                <SortTh sorts={sorts} type="drainResistance" onClick={toggleSort}>
                  Drain resist
                </SortTh>
              </>
            )}
            {(numModules.ab ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="abVelocity" onClick={toggleSort}>
                  AB vel
                </SortTh>
                <SortTh sorts={sorts} type="abGj" onClick={toggleSort}>
                  AB GJ
                </SortTh>
              </>
            )}
            {(numModules.mwd ?? 0) > 0 && (
              <>
                <SortTh sorts={sorts} type="mwdVelocity" onClick={toggleSort}>
                  MWD vel
                </SortTh>
                <SortTh sorts={sorts} type="mwdGj" onClick={toggleSort}>
                  MWD GJ
                </SortTh>
                <SortTh sorts={sorts} type="mwdSignature" onClick={toggleSort}>
                  MWD sig
                </SortTh>
              </>
            )}
            {hasCap && (
              <SortTh sorts={sorts} type="totalGj" onClick={toggleSort}>
                Total GJ/s
              </SortTh>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((result) => (
            <tr key={result.id} className="odd:bg-panel/40">
              <td className="border-b border-line px-3 py-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  {result.modules.map((ref) => {
                    const full = modules[ref.type]?.find((m) => m.index === ref.index);
                    return (
                      <span key={`${ref.type}-${ref.index}`} className="flex items-center gap-1">
                        <TypeIcon typeId={full?.typeId ?? ref.typeId} type={ref.type} size={18} />
                        <span className="font-mono text-[11px] text-muted">
                          {MODULE_LABELS[ref.type]}:{ref.index}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </td>
              <Cell glow={best.totalCpu === result.totalCpu}>{fmtNum(result.totalCpu, 1)} tf</Cell>
              <Cell glow={best.totalPg === result.totalPg}>{fmtNum(result.totalPg, 1)} MW</Cell>
              {(numModules.dps ?? 0) > 0 && (
                <Cell glow={best.dpsIncrease === result.dpsIncrease}>
                  {fmtNum(result.dpsIncrease, 2)}%
                </Cell>
              )}
              {(numModules.sb ?? 0) > 0 && (
                <>
                  <Cell glow={best.smartbombDps === result.smartbombDps}>
                    {fmtNum(result.smartbombDps, 1)}
                  </Cell>
                  <Cell glow={best.smartbombGjs === result.smartbombGjs}>
                    {fmtNum(result.smartbombGjs, 1)}
                  </Cell>
                  <Cell>
                    {fmtNum(result.smartbombGjs ? result.smartbombDps / result.smartbombGjs : 0, 1)}
                  </Cell>
                  <Cell glow={best.smartbombRange === result.smartbombRange}>
                    {fmtNum(result.smartbombRange, 1)}
                  </Cell>
                </>
              )}
              {(numModules.neut ?? 0) > 0 && (
                <>
                  <Cell glow={best.neutAmount === result.neutAmount}>{fmtNum(result.neutAmount, 1)}</Cell>
                  <Cell glow={best.neutGjs === result.neutGjs}>{fmtNum(result.neutGjs, 1)}</Cell>
                  <Cell>{fmtNum(result.neutGjs ? result.neutAmount / result.neutGjs : 0, 1)}</Cell>
                  <Cell glow={best.neutRange === result.neutRange}>{fmtNum(result.neutRange, 1)}</Cell>
                </>
              )}
              {(numModules.nos ?? 0) > 0 && (
                <>
                  <Cell glow={best.nosAmount === result.nosAmount}>{fmtNum(result.nosAmount, 1)}</Cell>
                  <Cell glow={best.nosRange === result.nosRange}>{fmtNum(result.nosRange, 1)}</Cell>
                </>
              )}
              {(numModules.battery ?? 0) > 0 && (
                <>
                  <Cell glow={best.capBonus === result.capBonus}>{fmtNum(result.capBonus, 0)}</Cell>
                  <Cell glow={best.drainResistance === result.drainResistance}>
                    {fmtNum(result.drainResistance, 2)}%
                  </Cell>
                </>
              )}
              {(numModules.ab ?? 0) > 0 && (
                <>
                  <Cell glow={best.abVelocity === result.abVelocity}>{fmtNum(result.abVelocity, 2)}</Cell>
                  <Cell glow={best.abGj === result.abGj}>{fmtNum(result.abGj, 2)}</Cell>
                </>
              )}
              {(numModules.mwd ?? 0) > 0 && (
                <>
                  <Cell glow={best.mwdVelocity === result.mwdVelocity}>{fmtNum(result.mwdVelocity, 2)}</Cell>
                  <Cell glow={best.mwdGj === result.mwdGj}>{fmtNum(result.mwdGj, 2)}</Cell>
                  <Cell glow={best.mwdSignature === result.mwdSignature}>
                    {fmtNum(result.mwdSignature, 2)}%
                  </Cell>
                </>
              )}
              {hasCap && (
                <Cell glow={best.totalGj === result.totalGj}>{fmtNum(result.totalGj, 2)}</Cell>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortTh({
  type,
  sorts,
  onClick,
  children,
}: {
  type: TableSorter['key'];
  sorts: TableSorter[];
  onClick: (key: TableSorter['key']) => void;
  children: string;
}) {
  const sort = sorts.find((s) => s.key === type);
  const mark = !sort ? '·' : sort.direction === 'asc' ? '↑' : '↓';
  return (
    <th className="border-b border-line px-3 py-2">
      <button type="button" className="hover:text-ink" onClick={() => onClick(type)}>
        {children} <span className="text-ember">{mark}</span>
      </button>
    </th>
  );
}

function Cell({ children, glow }: { children: ReactNode; glow?: boolean }) {
  return (
    <td className={`border-b border-line px-3 py-1.5 font-mono ${glow ? 'text-amber' : ''}`}>
      {children}
    </td>
  );
}
