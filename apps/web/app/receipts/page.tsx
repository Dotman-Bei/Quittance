/* §9 /receipts — newest first. The empty state names the reason, not a spinner. */
import { loadReceipts } from "@/lib/receipts";
import { EvidenceTable, type EvidenceRow } from "@/components/dashboard/EvidenceTable";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const { receipts, unreadable } = await loadReceipts();

  const rows: readonly EvidenceRow[] = receipts.map((r) => ({
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
    <div className="grid gap-element">
      <div>
        <h1 className="text-loud">Receipts</h1>
        <p className="mt-2 max-w-3xl text-quiet">
          Every gated call, newest first. Non-discharges render identically to discharges:
          they are the record, not an error to dismiss. The verdict shown is re-derived
          here from each receipt&apos;s own committed inputs, not read from the file.
        </p>
        {unreadable > 0 ? (
          <p className="num mt-2 text-caption text-accent">
            {unreadable} receipt files could not be read and were skipped. This ledger is
            partial.
          </p>
        ) : null}
      </div>
      <EvidenceTable
        rows={rows}
        emptyReason="No receipt has been produced. This repository is at phase P1: nothing has been called live, so there is nothing to list."
      />
    </div>
  );
}
