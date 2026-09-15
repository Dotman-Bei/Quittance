import type { ReactNode } from "react";

/* frontend.txt §1 surface hierarchy and §4C frosted glass container. */
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
    <div className={`glass-card p-6 ${featured ? "rounded-4xl" : "rounded-3xl"} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs uppercase tracking-[0.16em] text-muted">{children}</h3>;
}

/*
 * A callout. Electric green is used as a structural edge here, never as a verdict signal
 * (D-013) — callouts carry limitations and disclosures, which are the opposite of reassurance.
 */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-3xl border-l-2 border-l-electric px-6 py-4 text-frost">
      {children}
    </div>
  );
}
