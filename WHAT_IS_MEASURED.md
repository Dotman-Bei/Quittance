# What Is Measured

This page exists so that a judge can catch us overclaiming without reading the code. It is written
against us on purpose. Where a limit is real, it is stated here in the plainest words available,
without a softening clause.

**Status at time of writing: no payment has been made and no discharge has executed.** One claim
sits at R1 (covered by tests); the rest sit at R0. What *has* happened is that we read the advertised
terms of 38 live x402 sellers without paying any of them, and the numbers on this page come from that
run — see `evidence/probes/2026-09-09-g1-probe-run.md`.

---

## The one-sentence version

Quittance checks whether a paid HTTP response **structurally conforms to the terms the seller itself
published**, and releases the buyer's payment only when it does. It does not check whether the
response is any good.

---

## What the verdict measures

`verdict(advertised, observed) -> VerdictState` is pure and total. It reads only fields committed to
in the receipt. It measures exactly these things:

| Check | What it actually inspects |
|---|---|
| HTTP status | The status code returned after payment |
| Body presence | Whether a body exists and is non-empty |
| Declared MIME type | Whether the response content type matches the type the seller published — **available against 38 of 38 live sellers measured** |
| Declared schema | Whether the body conforms to a response schema — **available against 0 of 38. Not a real check in practice** |
| Latency budget | Whether the response arrived inside a time budget — **the buyer's own, never the seller's. See below** |

That is the whole list, and in practice it is **three** dimensions, not five: HTTP status, non-empty
body, and declared content type — plus a deadline the buyer chose.

## What the verdict does not measure

- **Correctness.** A response that is well-formed JSON of the advertised shape and entirely wrong
  discharges the payment. Quittance cannot tell the difference and does not try.
- **Quality, accuracy, relevance, or usefulness.** No semantic evaluation of any kind is performed.
  There is no model in the verdict path, no scoring, no similarity check.
- **Whether the buyer got what it wanted.** Only whether it got what the seller advertised.
- **Whether the seller is honest in general.** The delivery record is counts and reason codes over
  observed calls. It is not a reputation score and it is not a number out of five.
- **Anything about calls that did not go through the gate.** An endpoint's record covers gated calls
  only, and says so.

A `DELIVERED_AS_ADVERTISED` verdict means one thing: **the response was structurally what the seller
said it would be.** It is not an endorsement, an assurance, or a statement about value received.

---

## Three limits inherited from x402 itself

These are not design choices. They are properties of the protocol we read terms from, confirmed
against the pinned upstream specification in `.agents/skills/x402/references/`. They are recorded in
`DECISIONS.md` as D-002.

**1. There is no advertised response-latency SLA.** The only time field in the x402
`PaymentRequirements` object is `maxTimeoutSeconds`, and upstream defines it as *"Maximum time
allowed for payment completion"* — a payment window, not a promise about how fast the resource
answers. Nothing in x402 lets a seller advertise a response deadline.

Measured: across 38 live sellers, `maxTimeoutSeconds` ranges from 60 to **3600** seconds, with 33 of
38 at exactly 300. No one is promising a one-hour response; they are declaring a window in which a
payment may complete. Had we read that field as a latency budget — as the PRD originally instructed —
an hour-late response would have been recorded as delivered on time.

Consequence: `TIMEOUT_EXCEEDED` is **not** derived from the seller's advertised terms. It is derived
from `maxLatencyMs` in the **buyer's own intent**. The PRD's phrase "the latency budget the endpoint
itself declared" (§5.2) does not survive contact with the specification. A `TIMEOUT_EXCEEDED`
verdict therefore means *the buyer's deadline was missed*, and asserts nothing about a promise the
seller made or broke. It is the one verdict state that is not a check against the seller's own words,
and every surface that displays it must say so.

**2. `mimeType` is optional, and in x402 v2 it moved.** In v1 it sat on each `accepts[]` entry. In
v2 it sits on the `resource` object. In both versions it is optional, and a seller that publishes
none cannot produce a `SHAPE_MISMATCH` on content type because there is nothing to mismatch against.

Measured: **38 of 38 live sellers publish one.** This is the good news on this page. Content type is
a real dimension in practice, even though the specification does not require it — which also means a
seller can remove it at any time and silently reduce what we can check. See misleading-item 7.

**3. `outputSchema` does not exist in x402 v2.** It was an optional field on `accepts[]` in v1 and
was removed in v2; discovery metadata moved to the `extensions.bazaar` extension. Schema conformance
is therefore checkable only for sellers that are on v1 with a schema published, or on v2 with the
bazaar extension present.

**The load-bearing consequence of all three:** for a seller that publishes neither a `mimeType` nor a
schema — which the specification fully permits — the verdict collapses to *status code plus
non-empty body*, plus a latency bound the buyer chose. Against such an endpoint, Quittance measures
substantially less than this document's first table implies. Endpoint pages must show which checks
were actually available for each endpoint, not merely the verdict.

---

## Which leg is KeeperHub-executed, and which is not

This distinction is the one most likely to be blurred in a demo. It is stated here so it cannot be.

| Leg | Direction | Who executes it | KeeperHub-executed? |
|---|---|---|---|
| **Discharge leg** | Buyer → gate, in USDC | **KeeperHub**, from the buyer's pre-signed transfer authorization | **Yes.** This is the leg Quittance governs |
| **Purchase leg** | Gate → seller, at the seller's advertised price | **The seller's own facilitator** | **No.** Never describe it as one |

In gate mode the gate pays the seller from its own working capital first, then is discharged by the
buyer only if the delivery check passes. That means:

> **In gate mode, Quittance carries the delivery risk on the buyer's behalf. This is underwriting,
> not escrow.** If the endpoint fails to deliver, the buyer is not discharged and the gate absorbs
> the price of the call. There is no dispute process, no arbitration, and no recovery of the
> purchase leg.

Facilitator mode (PRD §8.3) closes that gap by running the check before settlement. Its adoption
status is reported as a fact, never as a plan.

---

## The trusted-observer boundary

**The gate is the only observer of the response bytes.** In gate mode it sees the plaintext request
and response. For content-bearing calls that is a real disclosure, and it is the buyer's choice to
make. `retain: none` reduces it: the gate stores only hashes and the structural facts the verdict
needs, and discards the body after the check.

**The gate can lie about what it observed.** It cannot lie *undetectably*: the receipt commits to
`sha256(response)` and to the advertised terms, so a seller that keeps its own logs can publish the
response and prove a mismatch. That is the entire recourse story and it is a bounded one — it
requires the seller to have kept logs and to bother.

**What the gate cannot do at all:** discharge without a receipt whose verdict re-derives; re-use a
spent authorization; mutate a published receipt without breaking the batch root.

---

## What is labelled `PROJECT_BASELINE`

`PROJECT_BASELINE` marks **anything produced by an endpoint we control.** We run one, deliberately
configured to fail in specific ways — empty body, wrong MIME type, slow past the budget, 502 after
payment, duplicate settlement attempt — because a delivery checker that has never recorded a failure
has not been tested.

Rules for that label, without exception:

- Every run in **facilitator mode** is labelled `PROJECT_BASELINE` until a third-party seller points
  at it. Until then the README says "no third-party adopter" in those words.
- A `PROJECT_BASELINE` row is **never counted as third-party adoption and never counted as market
  demand.** It is not evidence that anyone wants this.
- It is never presented as the live-project integration. The live counterparty is a third party or
  the claim is withdrawn.
- It carries the label in the receipt, in the UI, and in `claims.json` — all three, not just the UI.

Separately, `LOCAL FIXTURE` marks anything derived from a mocked facilitator or fixture endpoint.
Fixtures exist in unit tests only and never appear on the public proof path.

---

## How this result could be misleading

The honest list, kept current:

1. **Structural conformance is a low bar.** An endpoint can pass every check while returning
   useless content. Our numbers will look better than the buyer's actual experience.
2. **Our own baseline endpoint inflates the sample.** Campaign totals mix third-party calls with
   `PROJECT_BASELINE` calls. Read the third-party count, not the total.
3. **Non-discharges may be our fault.** An RPC hiccup, a gate restart, or a nonce collision is our
   failure, not the seller's. Transient infrastructure errors are counted and reported **separately**
   from verdicts and are never folded into an endpoint's delivery record — but the separation depends
   on us classifying them correctly.
4. **Small samples say nothing.** Under 20 gated calls, an endpoint page shows `INSUFFICIENT SAMPLE`
   and no percentage. A percentage over 25 calls is still close to noise.
5. **We choose which endpoints to call.** The endpoint set is not a random sample of the x402
   ecosystem and no distributional claim should be read into it.
6. **The gate is a single trusted observer,** per the boundary above.
7. **Content type may be a decorative check.** All 38 sellers advertise `application/json`. If that
   is reflexive rather than meaningful, `SHAPE_MISMATCH` will almost never fire and our only shape
   dimension will be doing no work. We will not know until a campaign runs, and if it never fires we
   should say so rather than present it as a check that passed.
8. **We have never been paid by, or paid, any of these endpoints.** Everything above is read from
   402 responses. Nothing here reports on what an endpoint does *after* payment, which is the only
   thing the product ultimately claims to measure.
9. **Re-derivation depends on the receipt being complete.** If `packages/verifier` cannot re-derive
   a verdict without gate-held data, every affected claim drops to R2 and the phrase
   "independently checkable" is deleted from all copy, with the missing input published.

---

## Verify it yourself

Do not take this page's word for anything. Re-derive a receipt with no account, no API key, and no
access to our database:

```bash
git clone <repo> && cd quittance && pnpm install
pnpm --filter @quittance/verifier build
npx quittance verify evidence/receipts/<hash>.json
```

If that command does not exist yet, this repository is at phase P1 and no receipt has been produced.
Check `docs/phase.md` for the phase of record.
