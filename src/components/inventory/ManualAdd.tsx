import { useState, type FormEvent } from 'react';
import { MODULE_LABELS, MODULE_TYPES, type AbyssalModuleType, type Module } from '../../types';
import { useTumbler } from '../../store/useTumbler';

const FIELDS: Record<AbyssalModuleType, { key: string; label: string }[]> = {
  dps: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'dmgMulti', label: 'Dmg multi' },
    { key: 'rofBonus', label: 'RoF %' },
  ],
  sb: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'activationCost', label: 'Act. cost' },
    { key: 'activationTime', label: 'Act. time' },
    { key: 'range', label: 'Range' },
    { key: 'damage', label: 'Damage' },
  ],
  neut: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'activationCost', label: 'Act. cost' },
    { key: 'activationTime', label: 'Act. time' },
    { key: 'neutAmount', label: 'Neut' },
    { key: 'range', label: 'Range' },
  ],
  nos: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'activationTime', label: 'Act. time' },
    { key: 'drainAmount', label: 'Drain' },
    { key: 'range', label: 'Range' },
  ],
  battery: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'capacitorBonus', label: 'Cap bonus' },
    { key: 'drainResistanceBonus', label: 'Drain resist' },
  ],
  ab: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'activationCost', label: 'Act. cost' },
    { key: 'velocityBonus', label: 'Velocity %' },
  ],
  mwd: [
    { key: 'cpu', label: 'CPU' },
    { key: 'pg', label: 'PG' },
    { key: 'activationCost', label: 'Act. cost' },
    { key: 'velocityBonus', label: 'Velocity %' },
    { key: 'signatureRadiusModifier', label: 'Sig modifier' },
  ],
};

export function ManualAdd() {
  const addModules = useTumbler((s) => s.addModules);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AbyssalModuleType>('dps');
  const [values, setValues] = useState<Record<string, string>>({});
  const [name, setName] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed: Record<string, number> = {};
    for (const field of FIELDS[type]) {
      parsed[field.key] = parseFloat(values[field.key] ?? '');
      if (!Number.isFinite(parsed[field.key])) return;
    }
    addModules([
      {
        type,
        name: name.trim(),
        index: -1,
        ...parsed,
      } as Module,
    ]);
    setValues({});
    setName('');
  }

  if (!open) {
    return (
      <button
        type="button"
        className="w-full rounded-sm border border-dashed border-line py-2 text-xs text-muted hover:border-line-bright hover:text-ink"
        onClick={() => setOpen(true)}
      >
        Add a module manually
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Manual add</span>
        <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] text-muted">
          Type
          <select
            value={type}
            className="text-sm text-ink"
            onChange={(e) => {
              setType(e.target.value as AbyssalModuleType);
              setValues({});
            }}
          >
            {MODULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {MODULE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-muted">
          Name
          <input value={name} className="text-sm" onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS[type].map((field) => (
          <label key={field.key} className="flex flex-col gap-0.5 text-[11px] text-muted">
            {field.label}
            <input
              type="number"
              step="any"
              required
              value={values[field.key] ?? ''}
              className="font-mono text-sm text-ink"
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="mt-3 w-full rounded-sm bg-teal/80 px-3 py-1.5 text-sm font-medium text-void hover:bg-teal"
      >
        Add {MODULE_LABELS[type]}
      </button>
    </form>
  );
}
