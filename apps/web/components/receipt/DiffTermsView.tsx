/*
 * frontend.md §3.5 — advertised versus observed comparator.
 *
 * The "Available?" column is required by DECISIONS.md D-002: without it, an endpoint
 * checked on four dimensions is compared against one checked on two, and the comparison
 * is meaningless.
 */
import type { AdvertisedTerms, ObservedResponse } from "@/lib/types";

type Row = {
  readonly field: string;
  readonly advertised: string;
  readonly observed: string;
  readonly available: string;
};

export function DiffTermsView({
  advertised,
  observed,
  maxLatencyMs,
  maxPriceAtomic,
}: {
  advertised: AdvertisedTerms;
  observed: ObservedResponse;
  maxLatencyMs: number;
  maxPriceAtomic: string;
}) {
  const rows: readonly Row[] = [
    {
      field: "HTTP status",
      advertised: "a successful response",
      observed: observed.httpStatus === null ? "no response" : String(observed.httpStatus),
      available: "always",
    },
    {
      field: "Body",
      advertised: "non-empty",
      observed: `${observed.bodyByteLength} bytes`,
      available: "always",
    },
    {
      field: "Content type",
      advertised: advertised.mimeType ?? "not advertised",
      observed: observed.contentType ?? "none declared",
      available: advertised.checksAvailable.mimeTypeAdvertised
        ? "advertised by the seller"
        : "NOT advertised — cannot mismatch",
    },
    {
      field: "Response schema",
      advertised: advertised.outputSchemaHash ?? "not advertised",
      observed: observed.schemaConformance,
      available: advertised.checksAvailable.schemaAdvertised
        ? "advertised by the seller"
        : "NOT advertised — cannot mismatch",
    },
    {
      field: "Latency",
      advertised: "no seller SLA exists in x402",
      observed: `${observed.latencyMs}ms against the buyer's ${maxLatencyMs}ms cap`,
      available: "buyer's cap only, never the seller's",
    },
    {
      field: "Price (atomic)",
      advertised: advertised.amountAtomic,
      observed: `buyer cap ${maxPriceAtomic}`,
      available: "always",
    },
    {
      field: "Payment window",
      advertised: `${advertised.maxTimeoutSeconds}s (maxTimeoutSeconds)`,
      observed: "not a verdict input",
      available: "upstream defines this as a payment window, not a response deadline",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge">
      <table className="hash-cell w-full min-w-[46rem] border-collapse text-left">
        <caption className="sr-only">Advertised terms compared with the observed response</caption>
        <thead>
          <tr className="border-b border-edge-strong bg-sunken">
            {["Field", "Advertised", "Observed", "Check available?"].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-b border-edge last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal text-frost">
                {row.field}
              </th>
              <td className="num px-3 py-2 text-frost">{row.advertised}</td>
              <td className="num px-3 py-2 text-frost">{row.observed}</td>
              <td className="px-3 py-2 text-xs text-muted">{row.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
