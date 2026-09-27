import type { ReactNode } from 'react';

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
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-hull/90 px-5 py-3 backdrop-blur">
        <Mark />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[0.18em] text-ink">
            ABYSSAL TUMBLER
          </h1>
          <p className="text-xs tracking-wide text-muted">Match mutated modules to a fitting budget</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">{children}</main>
    </div>
  );
}
