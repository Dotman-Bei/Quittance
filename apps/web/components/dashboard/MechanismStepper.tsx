"use client";

import { useState } from "react";

/*
 * §5.1, five nodes, in order.
 *
 * DESIGN.md §5 requires node 5 to state in its own label that it is the DISCHARGE leg
 * and that the PURCHASE leg is not KeeperHub-executed. That distinction is the single
 * most likely thing for a viewer to get wrong, and this diagram is where it is corrected.
 */
const NODES = [
  {
    id: "intent",
    title: "Buyer intent",
    line: "Gate holds a pre-signed fee authorization with a nonce, an expiry, and caps.",
    detail:
      "The buyer posts a target resource, a maximum price, a maximum latency, and a signed authorization. The caps are the buyer's own; nothing here is read from the seller.",
  },
  {
    id: "probe",
    title: "x402 probe",
    line: "The endpoint returns 402. Its advertised terms are read from its own response.",
    detail:
      "x402 v1 carries terms in the JSON body; v2 carries them in a base64 PAYMENT-REQUIRED header. Both are parsed as distinct shapes and neither is normalised into the other. If the advertised terms exceed the intent's caps, the run stops here with REQUIREMENTS_MISMATCH: no purchase, no discharge.",
  },
  {
    id: "call",
    title: "Call and hash",
    line: "Relay the buyer's own x402 payment, retry the request, hash request, response and terms.",
    detail:
      "The BUYER pays the seller, signing with its own wallet; the gate relays and never signs. The seller's own facilitator broadcasts it. The receipt commits to sha256 of the response, sha256 of the request, and sha256 of the raw advertised terms, plus timings and the run context.",
  },
  {
    id: "verdict",
    title: "Pure verdict",
    line: "verdict(advertised, observed) runs from the receipt alone. Pure and total.",
    detail:
      "The function reads only fields the receipt commits to. It checks HTTP status, body presence, declared content type where one was published, schema conformance where one was published, and the buyer's latency bound. It does not evaluate correctness, accuracy, or usefulness.",
  },
  {
    id: "settle",
    title: "Fee leg — KeeperHub-executed",
    line: "Only DELIVERED_AS_ADVERTISED is charged for. Every other state records a non-discharge.",
    detail:
      "The fee leg, buyer to gate, is executed by KeeperHub from the buyer's pre-signed authorization, keyed for idempotency by its nonce. The purchase leg is NOT a KeeperHub execution. The gate carries no delivery risk and does not protect the buyer: a call that fails leaves the buyer out the purchase price, and the only thing that changes is that we are not paid. Note the incentive this creates — the gate earns only when it reports delivery.",
  },
] as const;

export function MechanismStepper() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol className="grid gap-3">
      {NODES.map((node, index) => {
        const open = openId === node.id;
        return (
          <li key={node.id} className="rounded-2xl border border-edge glass-card">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : node.id)}
              className="flex w-full items-baseline gap-4 px-6 py-3 text-left"
            >
              <span className="num text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block text-stark">{node.title}</span>
                <span className="block text-muted">{node.line}</span>
              </span>
              <span aria-hidden className="num text-xs text-muted">
                {open ? "−" : "+"}
              </span>
            </button>
            {open ? (
              <p className="border-t border-edge px-6 py-3 text-frost">{node.detail}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
