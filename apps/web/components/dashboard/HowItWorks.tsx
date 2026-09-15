/*
 * §9 Landing. Sits below the mechanism stepper and answers the questions the stepper
 * raises but does not settle: which leg KeeperHub actually executes, what each verdict
 * causes, what the receipt commits to, and how a stranger re-runs the decision.
 *
 * §5.3 requires the two legs to be named honestly wherever the mechanism is described.
 * The stepper says it on node 5; this section says it in a table, because it is the
 * single thing a reader is most likely to get wrong.
 */
import Link from "next/link";
import { VERDICT_STATES } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { Card, CardTitle } from "@/components/ui/Card";

const LEGS = [
  {
    leg: "Discharge",
    direction: "Buyer → gate",
    executor: "KeeperHub, from the buyer's pre-signed transfer authorization",
    keeperhub: "Yes",
    note: "The leg Quittance governs. Fires only on DELIVERED_AS_ADVERTISED.",
  },
  {
    leg: "Purchase",
    direction: "Gate → seller",
    executor: "The seller's own facilitator",
    keeperhub: "No",
    note: "Never described as a KeeperHub execution, because it is not one.",
  },
] as const;

const RECEIPT_COMMITMENTS = [
  ["sha256(response)", "The response bytes, so a seller holding its own logs can disprove a wrong verdict"],
  ["sha256(request)", "What was asked for"],
  ["sha256(advertised terms)", "The seller's own 402, exactly as received and before any reshaping"],
  ["checks available", "Whether a content type or a schema was published at all, and which x402 version"],
  ["timings + run context", "Observed latency, the buyer's cap, and the KeeperHub run id"],
] as const;

export function HowItWorks() {
  return (
    <div className="grid gap-element">
      {/* 1. The two legs. The most misread part of the mechanism. */}
      <Card>
        <CardTitle>Which leg KeeperHub executes</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="hash-cell w-full border-collapse text-left">
            <caption className="sr-only">The discharge leg and the purchase leg compared</caption>
            <thead>
              <tr className="border-b border-rule-strong">
                {["Leg", "Direction", "Executed by", "KeeperHub-executed"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-2 py-2 text-caption uppercase tracking-[0.12em] text-quiet"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEGS.map((row) => (
                <tr key={row.leg} className="border-b border-rule last:border-0 align-top">
                  <th scope="row" className="px-2 py-3 text-left font-normal text-loud">
                    {row.leg}
                    <span className="mt-1 block text-caption font-normal text-quiet">{row.note}</span>
                  </th>
                  <td className="num px-2 py-3 text-plain">{row.direction}</td>
                  <td className="px-2 py-3 text-plain">{row.executor}</td>
                  <td className="num px-2 py-3 text-loud">{row.keeperhub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. What each verdict causes. Every state, including the ones that move nothing. */}
      <Card>
        <CardTitle>What each verdict causes</CardTitle>
        <p className="mt-2 text-quiet">
          Exactly one state releases money. The other six record a non-discharge with its reason and
          execute nothing. They render with the same weight as a discharge, here and everywhere else.
        </p>
        <ul className="mt-3 grid gap-2">
          {VERDICT_STATES.map((state) => (
            <li
              key={state}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2 last:border-0"
            >
              <VerdictBadge state={state} />
              <span className="num text-caption text-quiet">
                {state === "DELIVERED_AS_ADVERTISED"
                  ? "KeeperHub executes the discharge"
                  : "no discharge — reason recorded"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* 3 and 4. What is committed to, and how anyone re-runs the decision. */}
      <div className="grid gap-element lg:grid-cols-2">
        <Card>
          <CardTitle>What the receipt commits to</CardTitle>
          <p className="mt-2 text-quiet">
            The verdict is computed from these fields and nothing else. Anything the gate knew but did
            not commit to is not an input.
          </p>
          <dl className="mt-3 grid gap-2">
            {RECEIPT_COMMITMENTS.map(([field, why]) => (
              <div key={field} className="border-b border-rule pb-2 last:border-0">
                <dt className="num text-plain">{field}</dt>
                <dd className="mt-1 text-caption text-quiet">{why}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardTitle>How anyone re-runs it</CardTitle>
          <p className="mt-2 text-quiet">
            The decision is a pure function of the receipt. Re-running it needs no account, no API key
            and no access to our database — if verification needed us, it would not be verification.
          </p>
          <div className="mt-3 rounded-default border border-rule bg-ink-sunken p-3">
            <pre className="overflow-x-auto text-caption text-plain">
              <code>npx quittance verify receipt.json</code>
            </pre>
          </div>
          <p className="mt-3 text-caption text-quiet">
            Or in your browser, with the same function the gate runs — nothing is sent anywhere.
          </p>
          <Link
            href="/verify"
            className="num mt-3 inline-block rounded-default border border-accent bg-accent-quiet px-3 py-1.5 text-caption uppercase tracking-[0.12em] text-accent"
          >
            Re-derive a receipt
          </Link>
          <p className="mt-4 border-t border-rule pt-3 text-caption text-quiet">
            What this measures, and what it does not, is set out in full in{" "}
            <span className="num text-plain">WHAT_IS_MEASURED.md</span> — written against this project
            on purpose. Structural conformance is a low bar: an endpoint can pass every check here
            while returning content that is useless to the buyer.
          </p>
        </Card>
      </div>
    </div>
  );
}
