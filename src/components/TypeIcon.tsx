import { typeIconUrl } from '../lib/format';
import { MODULE_LABELS, type AbyssalModuleType } from '../types';

export function TypeIcon({
  typeId,
  type,
  title = '',
  size = 32,
}: {
  typeId?: number | string;
  type?: AbyssalModuleType;
  title?: string;
  size?: number;
}) {
  const src = typeIconUrl(typeId);
  if (!src) {
    const short = type ? MODULE_LABELS[type].slice(0, 3).toUpperCase() : '—';
    return (
      <div
        className="flex shrink-0 items-center justify-center border border-line bg-raised font-display font-semibold tracking-wide text-amber"
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.28) }}
        title={title}
      >
        {short}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      title={title}
      width={size}
      height={size}
      className="shrink-0 border border-line bg-void object-contain"
    />
  );
}
