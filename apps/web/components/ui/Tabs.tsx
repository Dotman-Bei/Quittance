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
            className={`num rounded-chip border px-2.5 py-1 text-caption tracking-wide transition-colors ${
              selected
                ? "border-accent bg-accent-quiet text-accent"
                : "border-rule text-quiet hover:border-rule-strong hover:text-plain"
            }`}
          >
            {item.label}
            {item.count === undefined ? null : (
              <span className="ml-1.5 text-quiet">{item.count}</span>
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
