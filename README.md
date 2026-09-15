# Quittance

A quittance is the document certifying that a debt has been discharged.

## The problem, plainly

An agent pays for an API call over x402. Nothing checks whether the call was answered.

x402 splits payment into two steps: verification checks a signed payload and moves no money;
settlement broadcasts it and moves the money. The actual work sits between them, and whoever wrote
the resource server picks the ordering. Either the seller works first and discovers afterwards
whether settlement lands, or the money moves first and the buyer may be left holding a payment for
nothing.

The current substitute for measurement is reputation metadata: uptime a seller reports, a rank in a
directory, a star count. All of it is asserted. None of it is derived from whether the last thousand
paid calls returned anything.

## Mechanism

```
buyer agent  ->  quittance gate: hold signed fee authorization
             ->  gate relays the BUYER's own x402 payment to the live endpoint
             ->  hash request, response, and the endpoint's advertised terms
             ->  verdict = f(advertised terms, observed response)      [pure]
             ->  KeeperHub executes the fee, or records a non-discharge
```

In one sentence: **Quittance measures whether a paid endpoint delivered what it advertised, and
charges for that measurement only when it did — with the charge executed by KeeperHub.**

## Links

[What is measured](WHAT_IS_MEASURED.md) · [Decisions](DECISIONS.md) · [Architecture](ARCHITECTURE.md) ·
[Security](SECURITY.md) · [Phase of record](docs/phase.md) · [Kill criteria](docs/kill-criteria.md) ·
[Build log](BUILD_LOG.md) · [Setup](SETUP.md)

## Why this needs to exist, and why the obvious fix fails

The obvious fix is a smart contract holding the money until the work is confirmed. It does not work.
Per-call micropayments cannot carry an arbitration process that costs more than the call, and an
on-chain arbiter cannot read an HTTP response body.

The second obvious fix is seller-reported reliability. That is the thing being replaced.

What is left is an execution problem: hold a signed authorization, run a check that anyone can re-run,
then get one transaction to land reliably with retries and nonce management. KeeperHub is that
execution layer. Quittance is the thin, checkable policy deciding what it executes.

## Live evidence

**No discharge has executed. No payment has been made.** The table below is what has actually been
run, and nothing else.

| # | Evidence | Status | Where |
|---|---|---|---|
| 1 | First fee executed through KeeperHub, explorer link + run id | **not executed** — needs a funded buyer wallet | — |
| 2 | First recorded non-discharge against a live endpoint | **not executed** | — |
| 2a | Full gate pipeline exercised against a live seller, receipt re-derived | **done, 2026-09-15** | `apps/gate`, verified with `quittance verify` |
| 3 | Sustained campaign totals, failures included | **not run** | — |
| 4 | Induced infrastructure failure survived | **not run** | — |
| 5 | Receipt batch anchor tx | **not deployed** | — |
| 6 | Advertised terms read from 38 live x402 sellers | **done, 2026-09-09** | [evidence/probes/](evidence/probes/2026-09-09-g1-probe-run.md) |
| 7 | `verdict()` pure and total over generated envelopes | **done**, 41 tests | `pnpm test` |

Claims and their evidence rungs live in
[`packages/claim-ledger/data/claims.json`](packages/claim-ledger/data/claims.json). One claim is at
R1 (covered by tests). Six are at R0 (asserted in a document). None is above its evidence.

### What the probe run found

Across 38 live x402 sellers on Base mainnet, one per distinct host:

- **38/38 speak x402 v2**, carrying terms in the `PAYMENT-REQUIRED` header. No v1 seller was found.
- **38/38 publish a `mimeType`.** Content type is a real, checkable dimension.
- **0/38 publish a response schema.** It is not a check we perform against anyone.
- **`maxTimeoutSeconds` ranges 60–3600s**, 33 of 38 at exactly 300. Nobody advertises a response
  deadline; that field is a payment window. Reading it as a latency budget, as this project's own
  spec originally instructed, would have recorded an hour-late response as delivered on time.
- One seller publishes a non-integral `amount`, which the specification does not permit. See
  [upstream contributions](#upstream-contributions).

## How this result could be misleading

1. **Structural conformance is a low bar.** An endpoint can pass every check while returning content
   that is useless. Correctness, accuracy and quality are not measured and are never claimed.
2. **Nothing here reports on what happens after payment.** Every number above comes from reading 402
   responses. The thing the product ultimately claims to measure has not been measured once.
3. **Content type may be a decorative check.** All 38 sellers advertise `application/json`. If that is
   reflexive rather than meaningful, `SHAPE_MISMATCH` will almost never fire.
4. **Our own endpoint would inflate any total.** Rows labelled `PROJECT_BASELINE` are ours. They are
   never third-party adoption and never market demand.
5. **We choose which endpoints to call.** The set is not a random sample of the ecosystem.
6. **Under 20 gated calls, no percentage is shown.** A rate over 25 calls is still close to noise.

The long version, written against this project on purpose, is [WHAT_IS_MEASURED.md](WHAT_IS_MEASURED.md).

## Verify it yourself

No account, no API key, no funds. From a clean clone:

```bash
git clone <repo> quittance && cd quittance
pnpm install
pnpm build
pnpm test          # 41 tests: verdict purity and totality, canonicalization, re-derivation
```

Re-derive a receipt with the standalone verifier, which never contacts us:

```bash
node packages/verifier/dist/cli.js verify <receipt.json> [--body <response-file>]
# exit 0 = re-derives · exit 1 = does not · exit 2 = usage or input error
```

`evidence/receipts/` is empty, because no receipt has been produced.

Read live advertised terms yourself. Targets are configuration; there is no default and there never
will be one, because a compiled-in seller URL is exactly the dated protocol fact this project forbids:

```bash
export PROBE_X402_TARGETS="https://<a-live-x402-resource>"
export KEEPERHUB_API_BASE_URL="https://app.keeperhub.com"
pnpm probe:all
```

Confirm the pinned upstream documentation has not drifted:

```bash
pnpm skills:verify   # re-hashes 46 vendored files against skills-lock.json
```

Browse the surfaces:

```bash
pnpm web             # http://localhost:3000
```

Every surface will be empty and will say so. That is the accurate state, not a loading condition.

## Repository layout

```
apps/gate/            buyer-side gate service                      [P2, not built]
apps/facilitator/     x402 verify/settle surface                   [P4, not built]
apps/web/             receipts, endpoint records, verify page      [built]
packages/
  protocol-types/     zod schemas: x402 v1/v2, receipt, verdict    [built]
  reference/          the pure verdict function                    [built]
  verifier/           independent re-derivation + CLI              [built]
  claim-ledger/       claims.json, the source of truth for claims  [built]
contracts/            ReceiptAnchor only                           [P2, not built]
scripts/              probes, claim:verify, skills:verify          [probes built]
docs/                 phase of record, kill criteria, runbooks
evidence/             probe runs, receipts, campaign output
.agents/skills/       pinned upstream docs, hashed in skills-lock.json
```

## Limitations, and what is deliberately not claimed

**Quittance does not protect the buyer from a failed call.** The buyer pays the seller directly. If
the endpoint fails to deliver, the buyer is out the purchase price and Quittance does not recover it.
There is no dispute process, no arbitration, and no recovery. The only thing that changes on a failure
is that **we are not paid** — we do not charge for measuring a failure. That must never be heard as
"you are protected".

**Only the fee leg is KeeperHub-executed.** The purchase leg is paid and signed by the buyer and
broadcast by the seller's own facilitator. It is never described as a KeeperHub execution.

**The gate is paid to say delivery succeeded.** It earns a fee on `DELIVERED_AS_ADVERTISED` and
nothing on any other state. That incentive is real and is checked only by the receipt's commitment to
`sha256(response)` — a buyer or seller holding the bytes can prove a mismatch. See
[DECISIONS.md](DECISIONS.md) D-009, Cost 5.

**The gate is a trusted observer of response content.** In gate mode it sees the plaintext request
and response, and it is the only observer of the response bytes. It cannot lie undetectably — the
receipt commits to `sha256(response)`, so a seller holding its own logs can publish the body and prove
a mismatch. That is the entire recourse story and it is a bounded one: it requires the seller to have
kept logs and to bother.

**Structural checks are not quality checks.** Status, non-empty body, declared content type, and a
deadline the buyer chose. Nothing else. There is no model in the verdict path and no scoring.

**Facilitator mode has no third-party adopter.** It is not built. If and when it is, every run is
labelled `PROJECT_BASELINE` until a seller that is not us points at it.

**Not** an escrow protocol, an arbitration system, a dispute court, a reputation score, a wallet, a
key manager, or an agent framework. One network, done properly, or not claimed.

## Upstream contributions

One reproducible finding, produced from real friction during the first live probe run, is drafted and
ready to file: a live seller publishing `accepts[1].amount: "0.111"` where the x402 v2 specification
requires atomic (integral) token units. Draft:
[`docs/upstream/`](docs/upstream/2026-09-09-x402-non-integral-amount.md). It has not been filed —
filing it is an outward-facing action and is the owner's to take.

## Licence

MIT.
