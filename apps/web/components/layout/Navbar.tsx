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
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav
        aria-label="Primary"
        className="glass mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 rounded-pill px-6 py-3"
      >
        {/* frontend.txt §4A logo mark, carrying this product's initial. */}
        <Link href="/" className="flex select-none items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-volt text-base font-black text-black shadow-volt-sm">
            Q
          </span>
          <span className="text-xl font-bold tracking-tight text-stark">Quittance</span>
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
                  className={`inline-block rounded-pill px-3.5 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-surface-3 text-volt shadow-volt-sm"
                      : "text-frost/70 hover:text-stark"
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
            className="rounded-2xl bg-volt px-5 py-2 text-sm font-semibold text-black shadow-volt-sm transition-all hover:shadow-volt active:scale-95"
          >
            Re-derive a receipt
          </Link>
        </div>
      </nav>
    </header>
  );
}
