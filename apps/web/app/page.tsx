/*
 * §9 Landing: thesis in three sentences, mechanism block, live evidence table with real
 * hashes. The failure state is an evidence table that is empty and labelled "no runs
 * yet", never hidden.
 */
import Link from "next/link";
import { loadReceipts } from "@/lib/receipts";
import { MechanismStepper } from "@/components/dashboard/MechanismStepper";
import { SummaryStats } from "@/components/dashboard/SummaryStats";
import { EvidenceTable, type EvidenceRow } from "@/components/dashboard/EvidenceTable";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { receipts, unreadable } = await loadReceipts();

  const rows: readonly EvidenceRow[] = receipts.slice(0, 25).map((r) => ({
    leaf: r.leaf,
    startedAt: r.receipt.request.startedAt,
    host: r.receipt.advertised.host,
    amountAtomic: r.receipt.advertised.amountAtomic,
    latencyMs: r.receipt.observed.latencyMs,
    maxLatencyMs: r.receipt.intent.maxLatencyMs,
    state: r.reDerived,
    publishedState: r.receipt.publishedVerdict,
    agrees: r.agrees,
    runId: r.receipt.run.keeperhubRunId,
    txHash: r.receipt.run.dischargeTxHash,
    label: r.receipt.run.label,
    mimeTypeAdvertised: r.receipt.advertised.checksAvailable.mimeTypeAdvertised,
    schemaAdvertised: r.receipt.advertised.checksAvailable.schemaAdvertised,
  }));

  return (
    <div className="grid gap-12">
      <section className="grid gap-6">
        <h1 className="display max-w-5xl text-5xl sm:text-6xl lg:text-7xl">
          Delivery measured at the moment of delivery, by something that is not the seller.
        </h1>
        <div className="max-w-2xl space-y-3 text-base text-frost">
          <p>
            Agents already pay per call over x402. Nothing measures whether the call was
            answered.
          </p>
          <p>
            Quittance checks the response against the terms the endpoint itself advertised,
            and hands the settlement to KeeperHub.
          </p>
          <p>
            The result is a per-endpoint delivery record that no seller can edit and any
            stranger can re-derive.
          </p>
        </div>
        {/* §18 the one signature motif, used once, on this page only. */}
        <div className="signature-rule" aria-hidden />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/verify" variant="volt">
            Re-derive a receipt
          </ButtonLink>
          <ButtonLink href="/receipts">Open the ledger</ButtonLink>
        </div>
      </section>

      <section className="grid gap-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-muted">Live evidence</h2>
        <SummaryStats receipts={receipts} unreadable={unreadable} />
      </section>

      <section id="mechanism" className="grid gap-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-muted">Mechanism</h2>
        <MechanismStepper />
      </section>

      <section id="how-it-works" className="grid gap-6">
        <h2 className="text-xs uppercase tracking-[0.14em] text-muted">How it works</h2>
        <HowItWorks />
      </section>

      <section className="grid gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs uppercase tracking-[0.14em] text-muted">
            Evidence ledger
          </h2>
          <Link href="/receipts" className="text-xs text-muted hover:text-stark">
            All receipts
          </Link>
        </div>
        <EvidenceTable
          rows={rows}
          emptyReason="No receipt has been produced. This repository is at phase P1: the verdict function and the verifier exist and are property-tested, but no live call has been made and no discharge has executed. Every claim in the ledger sits at rung R0."
        />
      </section>
    </div>
  );
}
