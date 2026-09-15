---
name: x402
description: The x402 payments protocol specification — v1 and v2, the HTTP transport, the exact scheme on EVM, the bazaar discovery extension, and the offer/receipt extension. Use whenever parsing a 402 response, modelling advertised terms, or writing any part of the verdict function.
---

# x402

**Pinned upstream: `coinbase/x402` @ branch `main`, commit `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`.**
Every file in `references/` is pinned by SHA-256 in `../../../skills-lock.json`.

## Read this before touching advertised terms

**Do not work from memory about x402.** Never invent a header name, a field name, a calldata layout,
or an error code. Read the spec, cite it, and if upstream contradicts `PRD.md`, **upstream wins**
(PRD §0, rule 3).

Three such contradictions are already recorded as **D-002** in `DECISIONS.md`. Read that entry before
writing the verdict function — it changes what the function can honestly compute.

## The three findings, in short

**1. There is no advertised response-latency SLA.** The only time field in `PaymentRequirements` is
`maxTimeoutSeconds`, defined by upstream in **both** v1 and v2 as *"Maximum time allowed for payment
completion"*. It is a payment window, not a response deadline. `TIMEOUT_EXCEEDED` therefore derives
from the **buyer's** intent (`maxLatencyMs`), not from the seller's terms.

**2. `mimeType` is optional, and it moved.** v1: on each `accepts[]` entry. v2: on the `resource`
object. Optional in both. A seller that publishes none cannot produce a content-type
`SHAPE_MISMATCH`.

**3. `outputSchema` does not exist in v2.** Optional on `accepts[]` in v1, removed in v2; discovery
moved to the `extensions.bazaar` extension. Schema conformance is checkable only on v1-with-schema,
or on v2 with the bazaar extension present.

**Consequence:** against a specification-compliant seller publishing neither a `mimeType` nor a
schema, the verdict collapses to *status code plus non-empty body*, plus a buyer-chosen latency
bound. `WHAT_IS_MEASURED.md` states this in those words.

## Version handling

`packages/protocol-types` models v1 and v2 `PaymentRequired` as **distinct, discriminated schemas.**
They are **not** normalised into one another — their fields do not correspond one-to-one, and
inventing a correspondence would be inventing a protocol fact (PRD §17).

The receipt records which version the seller spoke, alongside which checks were available.

## Where the 402 lives, by version

| Version | Signal | Terms carried in |
|---|---|---|
| v1 | HTTP 402 | JSON response body, `accepts[]` |
| v2 | HTTP 402 | base64 `PAYMENT-REQUIRED` header, `PaymentRequired` schema |

Read `references/transport-v1-http.md` and `references/transport-v2-http.md` before writing the
parser. Do not assume the body carries the terms.

## Reference index

- `x402-specification-v2.md` — current specification
- `x402-specification-v1.md` — v1, still in production at many sellers
- `transport-v2-http.md`, `transport-v1-http.md` — HTTP transport, 402 signalling
- `scheme-exact.md`, `scheme-exact-evm.md` — the `exact` scheme; the transfer authorization the
  discharge leg executes
- `extension-bazaar-discovery.md` — discovery and listing; where v2 schema metadata lives
- `extension-offer-and-receipt.md` — upstream's own offer/receipt extension
- `concept-http-402.md`, `concept-facilitator.md`, `concept-client-server.md` — core concepts
- `specs-readme.md` — spec index

## Non-negotiables

1. **No compiled-in protocol facts.** No address, ABI, price, header name, or facilitator URL as a
   literal in `apps/` or `packages/` (PRD §17). Terms come from the counterparty's own response at
   call time.
2. **The verdict reads only what the receipt commits to.** Anything the gate knows but did not commit
   to is not an input.
3. **`scripts/probe-x402.ts` fails on drift.** On mismatch the service enters
   `PROTOCOL_CONFIG_CHANGED` and stops gating rather than guessing.
4. **The purchase leg is broadcast by the seller's own facilitator** in gate mode. It is not a
   KeeperHub execution and is never described as one.
