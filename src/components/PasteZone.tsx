import { useCallback, useEffect, useRef, useState } from 'react';
import { useTumbler } from '../store/useTumbler';

const PLACEHOLDER =
  'Paste EVE chat with showinfo links — Ctrl+V anywhere, or drop text here.';

export function PasteZone() {
  const importFromChat = useTumbler((s) => s.importFromChat);
  const importStatus = useTumbler((s) => s.importStatus);
  const [local, setLocal] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const consume = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const added = await importFromChat(trimmed);
      if (added > 0) setLocal('');
    },
    [importFromChat],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target !== areaRef.current) {
        return;
      }
      const text = event.clipboardData?.getData('text') ?? '';
      if (text.includes('showinfo:')) {
        event.preventDefault();
        void consume(text);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [consume]);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={areaRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text.includes('showinfo:')) {
            e.preventDefault();
            void consume(text);
          }
        }}
        placeholder={PLACEHOLDER}
        rows={3}
        className="w-full resize-y border-dashed text-sm leading-relaxed placeholder:text-muted"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{importStatus}</span>
        <button
          type="button"
          className="rounded-sm bg-ember px-3 py-1.5 text-sm font-medium text-ink hover:bg-ember-dim"
          onClick={() => void consume(local)}
        >
          Import paste
        </button>
      </div>
    </div>
  );
}
