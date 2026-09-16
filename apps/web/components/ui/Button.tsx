import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

/* frontend.txt §4B — the primary Volt button, and a glass secondary. */
type Variant = "volt" | "glass";

const BASE =
  "inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  volt: "bg-volt text-black hover:bg-[#b5f005] shadow-volt-sm hover:shadow-volt",
  glass: "bg-surface-2 text-stark border border-edge-volt backdrop-blur-xl hover:border-volt/40",
};

export function Button({
  variant = "glass",
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({
  href,
  variant = "glass",
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
