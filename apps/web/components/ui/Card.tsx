import type { ReactNode } from "react";

/* §18 radii: 8 default, 12 featured. Element spacing 24px. */
export function Card({
  children,
  featured = false,
  className = "",
}: {
  children: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border border-rule bg-ink-raised p-element ${
        featured ? "rounded-featured" : "rounded-default"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-caption uppercase tracking-[0.14em] text-quiet">{children}</h3>
  );
}

/* §18 the one muted secondary is used for callouts only. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-default border-l-2 border-secondary bg-ink-sunken px-element py-3 text-plain">
      {children}
    </div>
  );
}
