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
      {/*
        This bar is sticky, so its height is spent at every scroll position, not once.
        Wrapping was letting it reach 232px on a 375px phone: the logo on one line, the
        four tabs across two more, and the call to action pushed onto a fourth by ml-auto.
        No horizontal overflow, so the responsive suite passed it, which is why that suite
        now asserts a height ceiling as well.

        Below sm it collapses to one row: the mark without the wordmark, and the tabs in a
        single track that scrolls inside itself. The "Re-derive a receipt" button is hidden
        there rather than shrunk, because it goes to /verify and the Verify tab beside it
        already does, so on a phone it was costing a row to say the same thing twice.
      */}
      <nav
        aria-label="Primary"
        className="glass mx-auto flex max-w-[1280px] items-center gap-x-3 gap-y-3 rounded-pill px-3 py-2 sm:flex-wrap sm:gap-x-6 sm:px-6 sm:py-3"
      >
        {/* frontend.txt §4A logo mark, carrying this product's initial. */}
        <Link href="/" className="flex min-h-[44px] shrink-0 select-none items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-volt text-base font-black text-black shadow-volt-sm">
            Q
          </span>
          <span className="hidden text-xl font-bold tracking-tight text-stark sm:inline">
            Quittance
          </span>
        </Link>

        <ul className="nav-track flex min-w-0 flex-1 gap-1 overflow-x-auto sm:flex-none sm:flex-wrap sm:gap-1.5 sm:overflow-x-visible">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            /*
             * shrink-0 is load-bearing. globals.css sets `min-width: 0` on every flex child
             * to stop wide content pushing the page sideways, and that same rule let these
             * tabs compress below their own text inside the scrolling track, overlapping the
             * labels. They keep their width and the track scrolls instead.
             */
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-pill px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
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

        {/*
          Restored at lg, not at sm. At 768 the mark, the wordmark, four tabs and this button
          together overrun the bar by a little under 20px, and the bar answers by wrapping to
          126px. lg is the first width where all four fit on one line with room to spare.
        */}
        <div className="ml-auto hidden lg:block">
          <Link
            href="/verify"
            className="inline-flex min-h-[44px] items-center rounded-2xl bg-volt px-5 py-2 text-sm font-semibold text-black shadow-volt-sm transition-all hover:shadow-volt active:scale-95"
          >
            Re-derive a receipt
          </Link>
        </div>
      </nav>
    </header>
  );
}
