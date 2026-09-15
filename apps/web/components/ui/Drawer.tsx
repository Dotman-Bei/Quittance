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
        className="absolute inset-0 bg-ink/80"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-rule bg-ink-raised p-element"
      >
        <div className="mb-element flex items-start justify-between gap-4">
          <h2 className="num text-caption uppercase tracking-[0.14em] text-quiet">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="num rounded-chip border border-rule px-2 py-0.5 text-caption text-quiet hover:border-rule-strong hover:text-loud"
          >
            CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
