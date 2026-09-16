"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * A slide-over used by the evidence ledger's "Inspect" action.
 * Focus is moved into the panel on open and Escape closes it, so the ledger remains
 * operable from the keyboard alone.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/80"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-edge glass-card p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="num text-xs uppercase tracking-[0.14em] text-muted">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="num inline-flex min-h-[44px] items-center rounded-pill border border-edge px-4 py-2 text-xs text-muted hover:border-edge-strong hover:text-stark"
          >
            CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
