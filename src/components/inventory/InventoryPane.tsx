import { useEffect } from 'react';
import { MODULE_LABELS, MODULE_TYPES } from '../../types';
import { useTumbler } from '../../store/useTumbler';
import { PasteZone } from '../PasteZone';
import { MutaImport } from '../import/MutaImport';
import { ManualAdd } from './ManualAdd';
import { ModuleCard } from './ModuleCard';

const SAMPLE =
  '[21:01:12] Capsuleer > <url=showinfo:78621//1048013997699>Abyssal Vorton Tuning System</url>';

export function InventoryPane() {
  const modules = useTumbler((s) => s.modules);
  const activeType = useTumbler((s) => s.activeType);
  const setActiveType = useTumbler((s) => s.setActiveType);
  const clearInventory = useTumbler((s) => s.clearInventory);
  const errorMessage = useTumbler((s) => s.errorMessage);

  const total = MODULE_TYPES.reduce((sum, type) => sum + modules[type].length, 0);
  const populated = MODULE_TYPES.filter((type) => modules[type].length > 0);
  const showingAdd = activeType === 'add';
  const visibleTypes = activeType === 'all' || showingAdd ? MODULE_TYPES : [activeType];
  const visible = showingAdd ? [] : visibleTypes.flatMap((type) => modules[type]);

  useEffect(() => {
    if (activeType !== 'all' && activeType !== 'add' && modules[activeType].length === 0) {
      setActiveType('all');
    }
  }, [activeType, modules, setActiveType]);

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-line bg-hull/60 lg:w-[26.5rem] lg:border-r lg:border-b-0">
      <div className="shrink-0 space-y-3 border-b border-line p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg tracking-[0.14em] text-ink">INVENTORY</h2>
          {total > 0 && (
            <button type="button" className="text-xs text-muted hover:text-danger" onClick={clearInventory}>
              Clear all
            </button>
          )}
        </div>
        <PasteZone />
        <MutaImport />
        {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
        <TypeChip
          label={`All (${total})`}
          active={activeType === 'all'}
          onClick={() => setActiveType('all')}
        />
        {populated.map((type) => (
          <TypeChip
            key={type}
            label={`${MODULE_LABELS[type]} (${modules[type].length})`}
            active={activeType === type}
            onClick={() => setActiveType(type)}
          />
        ))}
        <TypeChip label="Add module" active={showingAdd} onClick={() => setActiveType('add')} />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {showingAdd && <ManualAdd />}
        {!showingAdd && total === 0 && (
          <div className="border border-dashed border-line bg-panel/40 p-4 text-sm leading-relaxed text-muted">
            <p>
              Paste mutated modules from EVE chat. The client copies them as{' '}
              <code className="font-mono text-amber">showinfo</code> links; the tumbler reads CPU, PG, and
              mutated stats from ESI and classifies them.
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted/80">{SAMPLE}</p>
          </div>
        )}
        {!showingAdd &&
          visible.map((module) => (
            <ModuleCard key={`${module.type}-${module.index}`} module={module} />
          ))}
      </div>
    </aside>
  );
}

function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-sm border px-2 py-1 text-[11px] tracking-wide ${
        active
          ? 'border-ember bg-ember/20 text-ink'
          : 'border-line bg-transparent text-muted hover:border-line-bright hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}
