import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "quiet";

const BASE =
  "inline-flex items-center gap-2 rounded-default border px-3 py-1.5 text-body transition-colors";

const VARIANTS: Record<Variant, string> = {
  primary: "border-accent bg-accent-quiet text-accent hover:bg-accent hover:text-ink",
  quiet: "border-rule bg-transparent text-plain hover:border-rule-strong hover:text-loud",
};

export function Button({
  variant = "quiet",
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({
  href,
  variant = "quiet",
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
