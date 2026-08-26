import { useState } from 'react';
import {
  AfterburnerModule,
  BatteryModule,
  DpsModule,
  MODULE_LABELS,
  MircowarpModule,
  NeutModule,
  NosModule,
  SmartbombModule,
  type Module,
} from '../../types';
import { fmtIsk, moduleStatChips, moduleTitle, mutamarketUrl } from '../../lib/format';
import { TypeIcon } from '../TypeIcon';
import { useTumbler } from '../../store/useTumbler';

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] text-muted">
      {label}
      <input
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : ''}
        className="w-full py-1 font-mono text-xs text-ink"
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function ModuleCard({ module }: { module: Module }) {
  const [editing, setEditing] = useState(false);
  const updateModule = useTumbler((s) => s.updateModule);
  const removeModule = useTumbler((s) => s.removeModule);
  const title = moduleTitle(module);
  const href = mutamarketUrl(module.itemId);
  const price = fmtIsk(module.estPrice);
  const chips = moduleStatChips(module);

  function patch(partial: Record<string, number>) {
    updateModule({ ...module, ...partial } as Module);
  }

  return (
    <article className="border border-line bg-panel p-2.5">
      <div className="flex gap-2.5">
        <TypeIcon typeId={module.typeId} type={module.type} title={title} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-ink hover:text-amber"
                >
                  {title}
                </a>
              ) : (
                <div className="truncate text-sm">{title}</div>
              )}
              {module.name?.trim() && (
                <div className="font-mono text-[11px] text-muted">
                  {MODULE_LABELS[module.type]} #{module.index}
                  {price ? ` · ${price}` : ''}
                </div>
              )}
              {!module.name?.trim() && price && (
                <div className="font-mono text-[11px] text-muted">{price}</div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-muted hover:text-ink"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? 'Done' : 'Edit'}
              </button>
              <button
                type="button"
                className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-danger hover:border-danger"
                onClick={() => removeModule(module.type, module.index)}
              >
                Remove
              </button>
            </div>
          </div>
          {!editing && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className="border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] text-muted"
                >
                  <span className="text-amber/80">{chip.label}</span> {chip.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {editing && <EditFields module={module} patch={patch} />}
    </article>
  );
}

function EditFields({
  module,
  patch,
}: {
  module: Module;
  patch: (partial: Record<string, number>) => void;
}) {
  const shared = (
    <>
      <Field label="CPU" value={module.cpu} onChange={(cpu) => patch({ cpu })} />
      <Field label="PG" value={module.pg} onChange={(pg) => patch({ pg })} />
    </>
  );
  switch (module.type) {
    case 'dps': {
      const m = module as DpsModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shared}
          <Field label="Dmg multi" value={m.dmgMulti} onChange={(dmgMulti) => patch({ dmgMulti })} />
          <Field label="RoF bonus %" value={m.rofBonus} onChange={(rofBonus) => patch({ rofBonus })} />
        </div>
      );
    }
    case 'sb': {
      const m = module as SmartbombModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shared}
          <Field label="Act. cost" value={m.activationCost} onChange={(activationCost) => patch({ activationCost })} />
          <Field label="Act. time" value={m.activationTime} onChange={(activationTime) => patch({ activationTime })} />
          <Field label="Range" value={m.range} onChange={(range) => patch({ range })} />
          <Field label="Damage" value={m.damage} onChange={(damage) => patch({ damage })} />
        </div>
      );
    }
    case 'neut': {
      const m = module as NeutModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shared}
          <Field label="Act. cost" value={m.activationCost} onChange={(activationCost) => patch({ activationCost })} />
          <Field label="Act. time" value={m.activationTime} onChange={(activationTime) => patch({ activationTime })} />
          <Field label="Neut amount" value={m.neutAmount} onChange={(neutAmount) => patch({ neutAmount })} />
          <Field label="Range" value={m.range} onChange={(range) => patch({ range })} />
        </div>
      );
    }
    case 'nos': {
      const m = module as NosModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shared}
          <Field label="Act. time" value={m.activationTime} onChange={(activationTime) => patch({ activationTime })} />
          <Field label="Drain" value={m.drainAmount} onChange={(drainAmount) => patch({ drainAmount })} />
          <Field label="Range" value={m.range} onChange={(range) => patch({ range })} />
        </div>
      );
    }
    case 'battery': {
      const m = module as BatteryModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shared}
          <Field label="Cap bonus" value={m.capacitorBonus} onChange={(capacitorBonus) => patch({ capacitorBonus })} />
          <Field
            label="Drain resist"
            value={m.drainResistanceBonus}
            onChange={(drainResistanceBonus) => patch({ drainResistanceBonus })}
          />
        </div>
      );
    }
    case 'ab': {
      const m = module as AfterburnerModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shared}
          <Field label="Act. cost" value={m.activationCost} onChange={(activationCost) => patch({ activationCost })} />
          <Field label="Velocity %" value={m.velocityBonus} onChange={(velocityBonus) => patch({ velocityBonus })} />
        </div>
      );
    }
    case 'mwd': {
      const m = module as MircowarpModule;
      return (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shared}
          <Field label="Act. cost" value={m.activationCost} onChange={(activationCost) => patch({ activationCost })} />
          <Field label="Velocity %" value={m.velocityBonus} onChange={(velocityBonus) => patch({ velocityBonus })} />
          <Field
            label="Sig modifier"
            value={m.signatureRadiusModifier}
            onChange={(signatureRadiusModifier) => patch({ signatureRadiusModifier })}
          />
        </div>
      );
    }
    default:
      return <div className="mt-2 grid grid-cols-2 gap-2">{shared}</div>;
  }
}
