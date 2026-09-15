import Link from "next/link";

/*
 * DESIGN.md §4.
 *
 * frontend.md §3.8 specified a live "Base Mainnet: Block #19829312 (12ms)" readout and
 * "Executions Service: Healthy". Both are removed: §17 forbids a compiled-in chain
 * fact, and §0.7 forbids asserting a health state nothing measured. When the probes
 * exist (P1), this column renders their output. Until then it states the absence.
 *
 * The closing line is rewritten from frontend.md's "No financial guarantees…", which
 * trips the §18 vocabulary gate on the `guarantee` stem. See DECISIONS.md D-003.
 */
const COLUMNS = [
  {
    heading: "Protocol",
    links: [
      { label: "What is measured", href: "/verify" },
      { label: "Mechanism", href: "/#mechanism" },
      { label: "Endpoint records", href: "/endpoints" },
    ],
  },
  {
    heading: "Verify",
    links: [
      { label: "Re-derive in the browser", href: "/verify" },
      { label: "Receipts ledger", href: "/receipts" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t border-edge">
      <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="num text-sm font-semibold tracking-[0.18em] text-stark">QUITTANCE</p>
          <p className="mt-3 max-w-xs text-muted">
            Settles a payment for a paid endpoint only after the response has been checked
            against the requirements that endpoint itself advertised.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              {column.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-frost hover:text-stark">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Status</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>
              Network and execution-service status render from probe output. The probes are
              not implemented, so nothing is asserted here.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-edge">
        <p className="mx-auto max-w-[1280px] px-6 py-6 text-xs leading-relaxed text-muted">
          A deterministic, structural delivery ledger. Not a quality assessment, and not a
          financial assurance of any kind. Structural conformance is a low bar: an endpoint
          can pass every check here while returning content that is useless to the buyer.
        </p>
      </div>
    </footer>
  );
}
