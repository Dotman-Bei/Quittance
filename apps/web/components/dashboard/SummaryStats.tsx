/*
 * DESIGN.md §5 — the replacement for frontend.md's Bento grid.
 *
 * frontend.md §3.2 specified four hero cards with values baked in: 12,482.50 USDC,
 * 94.2%, 184ms, 48 Live Hosts. None of them ships. A judge opening a landing page
 * showing 94.2% settlement success against a repository whose every claim sits at R0
 * would be looking at a fabricated number on the front page of a project whose thesis
 * is that asserted metrics are worthless. See DECISIONS.md D-003, conflict 3.
 *
 * Every figure here is computed from the receipt corpus. With no runs, the grid renders
 * one line: "no runs yet".
 */
import { SAMPLE_FLOOR, type StoredReceipt } from "@/lib/receipts";
import { Card, CardTitle } from "@/components/ui/Card";

export function SummaryStats({
  receipts,
  unreadable,
}: {
  receipts: readonly StoredReceipt[];
  unreadable: number;
}) {
  if (receipts.length === 0) {
    return (
      <Card featured>
        <CardTitle>Live evidence</CardTitle>
        <p className="num mt-3 text-stark">no runs yet</p>
        <p className="mt-3 text-muted">
          Nothing has been executed. Every claim in the ledger sits at rung R0, asserted in
          a document. This panel fills in from the receipt corpus and shows nothing until
          there is something to show.
        </p>
      </Card>
    );
  }

  const thirdParty = receipts.filter((r) => r.receipt.run.label === "THIRD_PARTY");
  const baseline = receipts.filter((r) => r.receipt.run.label === "PROJECT_BASELINE");
  const fixture = receipts.filter((r) => r.receipt.run.label === "LOCAL_FIXTURE");

  const discharged = thirdParty.filter((r) => r.reDerived === "DELIVERED_AS_ADVERTISED").length;
  const operator = receipts.filter(
    (r) => r.reDerived === "GATE_ERROR" || r.reDerived === "SETTLEMENT_FAILED",
  ).length;

  /* §9 fewer than 20 calls renders INSUFFICIENT SAMPLE, not a percentage. */
  const rate =
    thirdParty.length >= SAMPLE_FLOOR
      ? `${((discharged / thirdParty.length) * 100).toFixed(1)}%`
      : "INSUFFICIENT SAMPLE";

  const disagreements = receipts.filter((r) => !r.agrees).length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardTitle>Third-party gated calls</CardTitle>
        <p className="num mt-2 text-2xl text-stark">{thirdParty.length}</p>
        <p className="mt-2 text-xs text-muted">
          Counted separately from our own endpoint. Never summed into a headline.
        </p>
      </Card>

      <Card>
        <CardTitle>Discharged, third party</CardTitle>
        <p className="num mt-2 text-2xl text-stark">{rate}</p>
        <p className="mt-2 text-xs text-muted">
          {discharged} discharged of {thirdParty.length}. Below {SAMPLE_FLOOR} calls no
          percentage is shown.{" "}
          <span className="text-frost">
            Read the shortfall carefully: most non-discharges we have recorded were caused by
            our own malformed requests, not by sellers failing.
          </span>
        </p>
      </Card>

      <Card>
        <CardTitle>PROJECT_BASELINE calls</CardTitle>
        <p className="num mt-2 text-2xl text-stark">{baseline.length}</p>
        <p className="mt-2 text-xs text-muted">
          Our own endpoint. Not third-party adoption and not market demand.
        </p>
      </Card>

      <Card>
        <CardTitle>Our failures</CardTitle>
        <p className="num mt-2 text-2xl text-stark">{operator}</p>
        <p className="mt-2 text-xs text-muted">
          Gate errors and settlement failures. Never folded into any endpoint&apos;s
          delivery record.
        </p>
      </Card>

      {fixture.length > 0 || unreadable > 0 || disagreements > 0 ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Card>
            <CardTitle>Corpus notes</CardTitle>
            <ul className="mt-2 space-y-1 text-muted">
              {fixture.length > 0 ? (
                <li className="num">LOCAL FIXTURE rows in corpus: {fixture.length}</li>
              ) : null}
              {unreadable > 0 ? (
                <li className="num">
                  Unreadable receipt files skipped: {unreadable}. The corpus is partial.
                </li>
              ) : null}
              {disagreements > 0 ? (
                <li className="num text-volt">
                  Receipts whose published verdict does not re-derive: {disagreements}
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
