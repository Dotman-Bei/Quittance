/*
 * §9 /endpoints/:host — calls, discharges, non-discharges by reason, window.
 * Fewer than 20 calls renders "insufficient sample", not a percentage.
 */
import Link from "next/link";
import { loadReceipts, summariseEndpoints, SAMPLE_FLOOR } from "@/lib/receipts";
import { VERDICT_STATES } from "@/lib/types";
import { VerdictBadge } from "@/components/dashboard/VerdictBadge";
import { Card, CardTitle, Callout } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function EndpointPage({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const { host: raw } = await params;
  const host = decodeURIComponent(raw);
  const { receipts } = await loadReceipts();
  const record = summariseEndpoints(receipts).find((e) => e.host === host);

  if (record === undefined) {
    return (
      <div className="grid gap-element">
        <Link href="/endpoints" className="text-caption text-quiet hover:text-loud">
          ← All endpoints
        </Link>
        <h1 className="num text-loud">{host}</h1>
        <div className="rounded-default border border-rule bg-ink-raised p-element">
          <p className="num text-loud">no gated calls recorded</p>
          <p className="mt-2 text-quiet">
            No receipt in the ledger names this host. That is not a statement about the
            endpoint; it means we have not called it.
          </p>
        </div>
      </div>
    );
  }

  /* §14 our failures are counted separately and never folded into the delivery record. */
  const sellerAttributed = record.calls - record.operatorAttributed;
  const belowFloor = sellerAttributed < SAMPLE_FLOOR;

  return (
    <div className="grid gap-section">
      <div className="grid gap-element">
        <Link href="/endpoints" className="text-caption text-quiet hover:text-loud">
          ← All endpoints
        </Link>
        <h1 className="num text-loud">{host}</h1>
        {belowFloor ? (
          <Callout>
            <p className="num text-loud">INSUFFICIENT SAMPLE ({sellerAttributed} calls)</p>
            <p className="mt-2 text-plain">
              Fewer than {SAMPLE_FLOOR} gated calls attributable to this endpoint. Counts are
              shown; no rate is computed, because a rate over this many calls would be noise
              presented as a measurement.
            </p>
          </Callout>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Gated calls</CardTitle>
          <p className="num mt-2 text-2xl text-loud">{record.calls}</p>
        </Card>
        <Card>
          <CardTitle>Third party</CardTitle>
          <p className="num mt-2 text-2xl text-loud">{record.thirdPartyCalls}</p>
          <p className="mt-2 text-caption text-quiet">
            {record.baselineCalls} PROJECT_BASELINE calls excluded from this figure.
          </p>
        </Card>
        <Card>
          <CardTitle>Discharged</CardTitle>
          <p className="num mt-2 text-2xl text-loud">
            {belowFloor
              ? String(record.byState.DELIVERED_AS_ADVERTISED)
              : `${((record.byState.DELIVERED_AS_ADVERTISED / sellerAttributed) * 100).toFixed(1)}%`}
          </p>
        </Card>
        <Card>
          <CardTitle>First seen</CardTitle>
          <p className="num mt-2 text-plain">{record.firstSeen ?? "unknown"}</p>
        </Card>
      </section>

      <section className="grid gap-element">
        <h2 className="text-caption uppercase tracking-[0.14em] text-quiet">
          Reason codes
        </h2>
        <p className="max-w-3xl text-quiet">
          Every state, including the ones with a count of zero. A record that lists only its
          successes is not a record.
        </p>
        <ul className="grid gap-2">
          {VERDICT_STATES.map((state) => (
            <li
              key={state}
              className="flex flex-wrap items-center justify-between gap-3 rounded-default border border-rule bg-ink-raised px-element py-3"
            >
              <VerdictBadge state={state} />
              <span className="num text-plain">{record.byState[state]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-element">
        <h2 className="text-caption uppercase tracking-[0.14em] text-quiet">
          Checks available for this endpoint
        </h2>
        <Card>
          <ul className="grid gap-2 text-plain">
            <li className="num">
              content type: {record.checksAvailable.mimeType ? "advertised" : "NOT advertised"}
            </li>
            <li className="num">
              response schema: {record.checksAvailable.schema ? "advertised" : "NOT advertised"}
            </li>
            <li className="num">latency SLA: none — x402 advertises no response deadline</li>
          </ul>
          <p className="mt-3 text-caption text-quiet">
            Comparing this endpoint&apos;s rate against one checked on more dimensions would
            compare two different measurements. Where neither a content type nor a schema was
            advertised, the check is status code plus non-empty body, and nothing more.
          </p>
        </Card>
      </section>

      <section className="grid gap-element">
        <h2 className="text-caption uppercase tracking-[0.14em] text-quiet">Our failures</h2>
        <Card>
          <p className="num text-2xl text-loud">{record.operatorAttributed}</p>
          <p className="mt-2 text-quiet">
            Gate errors and settlement failures on calls to this host. These are ours, not
            this endpoint&apos;s, and they are excluded from every figure above except the
            raw gated-call count.
          </p>
        </Card>
      </section>
    </div>
  );
}
