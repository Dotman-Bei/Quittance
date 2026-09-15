"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * DESIGN.md §4. frontend.md §3.1 specified a "Base Mainnet // KeeperHub Live" pill with
 * a pulsing green LED. Both are removed:
 *   - §18 forbids green anywhere in the palette.
 *   - §17 forbids a compiled-in network name, and §0.7 forbids asserting a liveness
 *     state that nothing measured. A status claim must come from a probe or be absent.
 * It is absent. See DECISIONS.md D-003, conflicts 1 and 4.
 */
const TABS = [
  { href: "/", label: "Overview" },
  { href: "/receipts", label: "Receipts" },
  { href: "/endpoints", label: "Endpoints" },
  { href: "/verify", label: "Verify" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-rule">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4"
      >
        <Link href="/" className="num text-body font-semibold tracking-[0.18em] text-loud">
          QUITTANCE
        </Link>

        <ul className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`num inline-block rounded-chip border px-2.5 py-1 text-caption uppercase tracking-[0.12em] transition-colors ${
                    active
                      ? "border-accent bg-accent-quiet text-accent"
                      : "border-transparent text-quiet hover:text-plain"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto">
          <Link
            href="/verify"
            className="num rounded-default border border-rule px-3 py-1.5 text-caption uppercase tracking-[0.12em] text-plain hover:border-rule-strong hover:text-loud"
          >
            Re-derive a receipt
          </Link>
        </div>
      </nav>
    </header>
  );
}
