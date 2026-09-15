/*
 * §9 /receipt/:hash — the full receipt, the advertised terms it was judged against, and
 * the exact command to re-derive it. A non-discharge renders identically to a discharge.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReceipts } from "@/lib/receipts";
import { VerdictBadge, verdictMeaning, attribution } from "@/components/dashboard/VerdictBadge";
import { ReceiptViewer } from "@/components/receipt/ReceiptViewer";
import { DiffTermsView } from "@/components/receipt/DiffTermsView";
import { CliReDerive } from "@/components/receipt/CliReDerive";
import { Card, CardTitle, Callout } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const ATTRIBUTION_TEXT = {
  seller: "This state describes the seller's response.",
  operator: "This state describes OUR failure, not the seller's. It never enters an endpoint's delivery record.",
  "buyer-caps": "This state is measured against the buyer's own caps, not against anything the seller promised.",
} as const;

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const { receipts } = await loadReceipts();
  const found = receipts.find((r) => r.leaf === hash);
  if (found === undefined) notFound();

  const { receipt, reDerived, agrees } = found;

  return (
    <div className="grid gap-12">
      <div className="grid gap-6">
        <Link href="/receipts" className="text-xs text-muted hover:text-stark">
          ← All receipts
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <VerdictBadge state={reDerived} />
          {receipt.run.label === "THIRD_PARTY" ? null : (
            <span className="num rounded-pill border border-electric px-2 py-0.5 text-xs text-electric">
              {receipt.run.label.replace("_", " ")}
            </span>
          )}
        </div>
        <p className="max-w-3xl text-frost">{verdictMeaning(reDerived)}</p>
        <p className="max-w-3xl text-xs text-muted">
          {ATTRIBUTION_TEXT[attribution(reDerived)]}
        </p>

        {agrees ? null : (
          <Callout>
            <p className="num text-stark">
              This receipt does not re-derive. It publishes {receipt.publishedVerdict}; an
              independent re-derivation from its own committed inputs yields {reDerived}.
            </p>
            <p className="mt-2 text-frost">
              The mismatch is the finding. It is shown here as prominently as agreement
              would be.
            </p>
          </Callout>
        )}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <Card>
            <CardTitle>Structured facts</CardTitle>
            <dl className="mt-3 grid gap-2">
              {[
                ["Receipt leaf", found.leaf],
                ["Endpoint host", receipt.advertised.host],
                ["x402 version", String(receipt.advertised.x402Version)],
                ["Scheme", receipt.advertised.scheme],
                ["Network", receipt.advertised.network],
                ["Amount (atomic)", receipt.advertised.amountAtomic],
                ["Response sha256", receipt.observed.bodySha256 ?? "none"],
                ["Advertised terms sha256", receipt.advertised.rawTermsHash],
                ["Request sha256", receipt.request.requestSha256],
                ["Retention", receipt.intent.retain === "none" ? "hash-only" : "full"],
              ].map(([term, value]) => (
                <div key={term} className="border-b border-edge pb-2 last:border-0">
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted">{term}</dt>
                  <dd className="num mt-1 break-all text-frost">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>Execution</CardTitle>
            <dl className="mt-3 grid gap-2">
              <div className="border-b border-edge pb-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                  KeeperHub run id
                </dt>
                <dd className="num mt-1 break-all text-frost">
                  {receipt.run.keeperhubRunId ?? "none recorded"}
                </dd>
              </div>
              <div className="border-b border-edge pb-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                  Discharge transaction
                </dt>
                <dd className="num mt-1 break-all text-frost">
                  {receipt.run.dischargeTxHash ?? "none — no discharge executed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                  Which leg KeeperHub executed
                </dt>
                <dd className="mt-1 text-frost">
                  The discharge leg only, buyer to gate. The purchase leg, gate to seller,
                  was broadcast by the seller&apos;s own facilitator and is not a KeeperHub
                  execution.
                </dd>
              </div>
            </dl>
          </Card>
          <CliReDerive leaf={found.leaf} />
        </div>
      </section>

      <section className="grid gap-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-muted">
          Advertised against observed
        </h2>
        <DiffTermsView
          advertised={receipt.advertised}
          observed={receipt.observed}
          maxLatencyMs={receipt.intent.maxLatencyMs}
          maxPriceAtomic={receipt.intent.maxPriceAtomic}
        />
      </section>

      <section className="grid gap-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-muted">Canonical receipt</h2>
        <ReceiptViewer receipt={receipt} />
      </section>
    </div>
  );
}
