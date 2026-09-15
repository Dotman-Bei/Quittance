/* §9 /endpoints — the directory. Fewer than 20 calls renders INSUFFICIENT SAMPLE. */
import Link from "next/link";
import { loadReceipts, summariseEndpoints, SAMPLE_FLOOR } from "@/lib/receipts";

export const dynamic = "force-dynamic";

export default async function EndpointsPage() {
  const { receipts } = await loadReceipts();
  const endpoints = summariseEndpoints(receipts);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-stark">Endpoints</h1>
        <p className="mt-2 max-w-3xl text-muted">
          Delivery records computed from receipts, not from seller-reported metadata. An
          endpoint page that hides its failures is the product failing, so non-discharges
          are shown in full. Below {SAMPLE_FLOOR} gated calls no percentage is shown.
        </p>
      </div>

      {endpoints.length === 0 ? (
        <div className="rounded-2xl border border-edge glass-card p-6">
          <p className="num text-stark">no endpoints yet</p>
          <p className="mt-2 text-muted">
            No endpoint has been called. This repository is at phase P1 and nothing has been
            called live, so there is no delivery record to compute.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge">
          <table className="hash-cell w-full border-collapse text-left">
            <caption className="sr-only">Endpoints by gated call count</caption>
            <thead>
              <tr className="border-b border-edge-strong bg-sunken">
                {["Host", "Gated calls", "Third party", "Discharged", "Checks available"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={e.host} className="border-b border-edge last:border-0">
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <Link
                      href={`/endpoints/${encodeURIComponent(e.host)}`}
                      className="num text-frost hover:text-stark"
                    >
                      {e.host}
                    </Link>
                  </th>
                  <td className="num px-3 py-3 text-frost">{e.calls}</td>
                  <td className="num px-3 py-3 text-frost">{e.thirdPartyCalls}</td>
                  <td className="num px-3 py-3 text-frost">
                    {e.calls < SAMPLE_FLOOR
                      ? "INSUFFICIENT SAMPLE"
                      : `${e.byState.DELIVERED_AS_ADVERTISED} of ${e.calls}`}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {[
                      e.checksAvailable.mimeType ? "mimeType" : null,
                      e.checksAvailable.schema ? "schema" : null,
                    ]
                      .filter((v) => v !== null)
                      .join(", ") || "status and body only"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
