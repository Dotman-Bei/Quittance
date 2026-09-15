"use client";

import type { ReactNode } from "react";

export type TabItem = { readonly id: string; readonly label: string; readonly count?: number };

/* §18 chip radius 2px. No active-state colour semantics beyond the one accent. */
export function Tabs({
  items,
  active,
  onSelect,
  label,
}: {
  items: readonly TabItem[];
  active: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            className={`num rounded-pill border px-2.5 py-1 text-xs tracking-wide transition-colors ${
              selected
                ? "border-volt bg-surface-3 text-volt"
                : "border-edge text-muted hover:border-edge-strong hover:text-frost"
            }`}
          >
            {item.label}
            {item.count === undefined ? null : (
              <span className="ml-1.5 text-muted">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, id }: { children: ReactNode; id: string }) {
  return (
    <div role="tabpanel" id={id}>
      {children}
    </div>
  );
}
