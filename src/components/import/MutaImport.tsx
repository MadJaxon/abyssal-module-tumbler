import { useState } from 'react';
import { isMutaMarketTypeUrl } from '../../lib/mutamarket';
import { useTumbler } from '../../store/useTumbler';

export function MutaImport() {
  const importFromMuta = useTumbler((s) => s.importFromMuta);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      await importFromMuta(url.trim());
      if (isMutaMarketTypeUrl(url)) setUrl('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        MutaMarket type URL
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          disabled={busy}
          placeholder="https://mutamarket.com/modules/type/…"
          className="min-w-0 flex-1 text-sm"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <button
          type="button"
          disabled={busy}
          className="rounded-sm border border-line bg-raised px-3 py-1.5 text-sm text-ink hover:border-line-bright disabled:opacity-50"
          onClick={() => void submit()}
        >
          {busy ? 'Loading…' : 'Add'}
        </button>
      </div>
    </div>
  );
}
