import { useState } from 'react';
import { MODULE_LABELS, type Result } from '../../types';
import { writeClipboard } from '../../lib/clipboard';
import { fmtNum, moduleTitle, mutamarketUrl } from '../../lib/format';
import { TypeIcon } from '../TypeIcon';
import { useTumbler } from '../../store/useTumbler';

export function ResultRow({
  result,
  best,
  dense = false,
}: {
  result: Result;
  best: Partial<Record<keyof Result, number>>;
  dense?: boolean;
}) {
  const modules = useTumbler((s) => s.modules);
  const numModules = useTumbler((s) => s.numModules);
  const cpuBudget = useTumbler((s) => s.cpuBudget);
  const pgBudget = useTumbler((s) => s.pgBudget);
  const expanded = useTumbler((s) => s.expandedResultId === result.id);
  const setExpanded = useTumbler((s) => s.setExpanded);
  const leftoverCpu = cpuBudget - result.totalCpu;
  const leftoverPg = pgBudget - result.totalPg;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const resolved = result.modules.map((ref) => {
    const full = modules[ref.type]?.find((m) => m.index === ref.index);
    return { ref, full };
  });

  async function copy() {
    const lines = resolved.map(({ ref, full }) => {
      const title = full ? moduleTitle(full) : `${MODULE_LABELS[ref.type]} #${ref.index}`;
      const url = mutamarketUrl(ref.itemId ?? full?.itemId);
      return url ? `${title}\n${url}` : title;
    });
    lines.push(
      `CPU ${fmtNum(result.totalCpu, 1)} tf (${fmtNum(leftoverCpu, 1)} left) · PG ${fmtNum(result.totalPg, 1)} MW (${fmtNum(leftoverPg, 1)} left)`,
    );
    if (numModules.dps > 0) lines.push(`DPS +${fmtNum(result.dpsIncrease, 2)}%`);
    try {
      await writeClipboard(lines.join('\n'));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1600);
  }

  return (
    <article className={`border border-line ${expanded ? 'bg-panel' : 'bg-hull/40'} ${dense ? 'text-[12px]' : ''}`}>
      <button
        type="button"
        className={`flex w-full items-center text-left hover:bg-raised/60 ${
          dense ? 'gap-2 px-2 py-1' : 'gap-3 px-3 py-2'
        }`}
        onClick={() => setExpanded(expanded ? null : result.id)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1">
            {resolved.map(({ ref, full }) => (
              <TypeIcon
                key={`${ref.type}-${ref.index}`}
                typeId={full?.typeId ?? ref.typeId}
                type={ref.type}
                title={full ? moduleTitle(full) : `${MODULE_LABELS[ref.type]} #${ref.index}`}
                size={dense ? 18 : 28}
              />
            ))}
          </div>
          <span className={`truncate font-mono text-muted ${dense ? 'text-[10px]' : 'hidden text-[11px] md:inline'}`}>
            {resolved
              .map(({ ref }) => `${MODULE_LABELS[ref.type]} #${ref.index}`)
              .join(' · ')}
          </span>
        </div>
        <Metric
          dense={dense}
          label="CPU left"
          value={`${fmtNum(leftoverCpu, 1)} tf`}
          glow={best.totalCpu === result.totalCpu}
        />
        <Metric
          dense={dense}
          label="PG left"
          value={`${fmtNum(leftoverPg, 1)} MW`}
          glow={best.totalPg === result.totalPg}
        />
        {numModules.dps > 0 && (
          <Metric
            dense={dense}
            label="DPS"
            value={`+${fmtNum(result.dpsIncrease, 2)}%`}
            glow={best.dpsIncrease === result.dpsIncrease}
          />
        )}
        {numModules.sb > 0 && (
          <Metric
            dense={dense}
            label="SB DPS"
            value={fmtNum(result.smartbombDps, 1)}
            glow={best.smartbombDps === result.smartbombDps}
          />
        )}
        {numModules.neut > 0 && (
          <Metric
            dense={dense}
            label="Neut/s"
            value={fmtNum(result.neutAmount, 1)}
            glow={best.neutAmount === result.neutAmount}
          />
        )}
        {numModules.nos > 0 && (
          <Metric
            dense={dense}
            label="NOS/s"
            value={fmtNum(result.nosAmount, 1)}
            glow={best.nosAmount === result.nosAmount}
          />
        )}
        {numModules.battery > 0 && (
          <Metric
            dense={dense}
            label="Cap"
            value={fmtNum(result.capBonus, 0)}
            glow={best.capBonus === result.capBonus}
          />
        )}
        {(numModules.sb > 0 || numModules.neut > 0 || numModules.ab > 0 || numModules.mwd > 0) && (
          <Metric
            dense={dense}
            label="GJ/s"
            value={fmtNum(result.totalGj, 2)}
            glow={best.totalGj === result.totalGj}
          />
        )}
      </button>
      {expanded && (
        <div className={`border-t border-line ${dense ? 'px-2 py-2' : 'px-3 py-3'}`}>
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              className="rounded-sm border border-line px-2 py-1 text-xs text-muted hover:text-ink"
              onClick={(event) => {
                event.stopPropagation();
                void copy();
              }}
            >
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy combination'}
            </button>
          </div>
          <ul className={`grid sm:grid-cols-2 ${dense ? 'gap-1' : 'gap-2'}`}>
            {resolved.map(({ ref, full }) => {
              const href = mutamarketUrl(ref.itemId ?? full?.itemId);
              const title = full ? moduleTitle(full) : `${MODULE_LABELS[ref.type]} #${ref.index}`;
              return (
                <li key={`${ref.type}-${ref.index}`} className={`flex items-center gap-2 ${dense ? 'text-xs' : 'text-sm'}`}>
                  <TypeIcon typeId={full?.typeId ?? ref.typeId} type={ref.type} title={title} size={dense ? 18 : 24} />
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="hover:text-amber">
                      {title}
                    </a>
                  ) : (
                    <span>{title}</span>
                  )}
                  <span className="font-mono text-[11px] text-muted">
                    {MODULE_LABELS[ref.type]} #{ref.index}
                    {full ? ` · ${fmtNum(full.cpu, 1)} tf · ${fmtNum(full.pg, 1)} MW` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <dl className={`grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-muted sm:grid-cols-4 ${dense ? 'mt-2 text-[11px]' : 'mt-3 text-xs'}`}>
            <Stat label="Total CPU" value={`${fmtNum(result.totalCpu, 2)} tf`} />
            <Stat label="Total PG" value={`${fmtNum(result.totalPg, 2)} MW`} />
            {numModules.dps > 0 && <Stat label="DPS increase" value={`${fmtNum(result.dpsIncrease, 2)}%`} />}
            {numModules.sb > 0 && (
              <>
                <Stat label="SB DPS" value={fmtNum(result.smartbombDps, 1)} />
                <Stat label="SB GJ/s" value={fmtNum(result.smartbombGjs, 1)} />
                <Stat
                  label="SB DPS/GJ"
                  value={fmtNum(result.smartbombGjs ? result.smartbombDps / result.smartbombGjs : 0, 1)}
                />
                <Stat label="SB range" value={fmtNum(result.smartbombRange, 1)} />
              </>
            )}
            {numModules.neut > 0 && (
              <>
                <Stat label="Neut/s" value={fmtNum(result.neutAmount, 1)} />
                <Stat label="Neut GJ/s" value={fmtNum(result.neutGjs, 1)} />
                <Stat
                  label="Neut/GJ"
                  value={fmtNum(result.neutGjs ? result.neutAmount / result.neutGjs : 0, 1)}
                />
                <Stat label="Neut range" value={fmtNum(result.neutRange, 1)} />
              </>
            )}
            {numModules.nos > 0 && (
              <>
                <Stat label="NOS/s" value={fmtNum(result.nosAmount, 1)} />
                <Stat label="NOS range" value={fmtNum(result.nosRange, 1)} />
              </>
            )}
            {numModules.battery > 0 && (
              <>
                <Stat label="Cap bonus" value={fmtNum(result.capBonus, 0)} />
                <Stat label="Drain resist" value={`${fmtNum(result.drainResistance, 2)}%`} />
              </>
            )}
            {numModules.ab > 0 && (
              <>
                <Stat label="AB velocity" value={fmtNum(result.abVelocity, 2)} />
                <Stat label="AB GJ" value={fmtNum(result.abGj, 2)} />
              </>
            )}
            {numModules.mwd > 0 && (
              <>
                <Stat label="MWD velocity" value={fmtNum(result.mwdVelocity, 2)} />
                <Stat label="MWD GJ" value={fmtNum(result.mwdGj, 2)} />
                <Stat label="MWD sig" value={`${fmtNum(result.mwdSignature, 2)}%`} />
              </>
            )}
          </dl>
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  glow,
  dense,
}: {
  label: string;
  value: string;
  glow?: boolean;
  dense?: boolean;
}) {
  if (dense) {
    return (
      <div className={`hidden shrink-0 font-mono text-[11px] sm:block ${glow ? 'text-amber' : 'text-ink'}`}>
        <span className="mr-1 uppercase tracking-wide text-muted">{label}</span>
        {value}
      </div>
    );
  }
  return (
    <div className={`hidden min-w-20 text-right sm:block ${glow ? 'text-amber' : 'text-ink'}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-muted/80">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
