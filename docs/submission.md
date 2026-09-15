# Submission package — DRAFT

Per PRD §24. **The "what still breaks" answer is written before the demo video**, as §24 requires,
so the video cannot quietly become more confident than the build.

Rows marked `OWNER` need something only the owner can supply. `pnpm submission:check` reports the
live state of every row and exits non-zero until all of them hold (G9).

---

## Which project, and what the integration does

**Project:** Daydreams — its Lucid endpoints and the x402 resources listed through the public
discovery index.

**What the integration does.** Quittance sits between a buying agent and a paid x402 endpoint. It
reads the endpoint's own 402 response, calls the endpoint, hashes the request, the response and the
advertised terms into a receipt, and runs a pure function over that receipt to decide whether the
response was structurally what the seller advertised. Settlement is executed by KeeperHub, and only
on `DELIVERED_AS_ADVERTISED`. Every other outcome records a non-discharge with its reason and moves
no money.

**Endpoints actually called.** Advertised terms were read live from 38 x402 sellers on Base mainnet,
one per distinct host, from the public discovery index — full output in
`evidence/probes/2026-09-09-g1-probe-run.md`. **No endpoint has been paid.** See "what still breaks".

---

## Which KeeperHub surfaces

Only what is actually used, per §8.4. **As built and verified today:**

| Surface | Status |
|---|---|
| Chain list read from the live API at startup (`GET /api/chains`) | **used** — 24 chains read, nothing compiled in |

**Designed and not yet executed**, because no discharge has run:

| Surface | Intended use |
|---|---|
| Contract call action | The discharge leg — broadcasting the buyer's pre-signed `transferWithAuthorization` |
| Turnkey-backed wallet | Custody; keys never leave the enclave |
| Executions API | Run ids and logs, the audit half of every receipt |
| Webhook trigger | Starting a gated run from the gate service |
| Schedule trigger | The sustained campaign |
| Dry run, retry and failure handling | As shipped, never reimplemented |

Nothing in the row above may be described as used until it has executed once.

---

## Testnet or mainnet

**Neither.** No transaction has been broadcast on any network.

The target was Base mainnet in USDC (§16). Advertised terms were read from Base mainnet sellers, and
KeeperHub's live chain list was read from its production API. Both are reads. No value has moved, so
there is no testnet claim to make either — K5 was never reached, because funding was never the
binding constraint.

---

## What still breaks

The candid answer, written before the video and matching the README limitations exactly.

**1. The purchase leg has no compliant execution path, and this is why there is no transaction.**
x402's `exact` scheme requires the payer to produce an EIP-712 signature over
`transferWithAuthorization`. KeeperHub's signing route binds the recipient to a KeeperHub workflow's
organisation wallet and refuses an arbitrary destination with `403 PAYTO_MISMATCH`. This codebase
forbids a local signer as a hard property. So the gate cannot pay a third-party seller, and without a
paid call there is no discharge and no transaction link. Recorded in full as `DECISIONS.md` D-007,
with four costed options, none of them adopted.

**2. The central claim has never been executed.** Quittance claims that money moves only on a
delivery check. That has been proven as a pure function over 2000 generated envelopes per property,
and never once against a live endpoint with real money. Six of seven claims sit at rung R0 — asserted
in a document. One sits at R1 — covered by tests.

**3. Two gates of ten pass.** G1 (no compiled-in protocol facts; probes read live terms) and G8
(claims honest, no forbidden vocabulary, no green in the palette). G3, G4, G5, G6, G10 and G9 do not.
G2 passes its determinism half and fails its golden-corpus half, because a golden corpus requires
receipts from live calls.

**4. Scope was cut under our own kill criterion.** K8 fired at the 72-hour boundary. Facilitator mode
— the path a seller could actually adopt — is cut and will not be built. `ReceiptAnchor` is cut, so
published receipts are not tamper-evident and rest on our word that we have not edited them.
Recorded as D-008.

**5. Structural conformance is a low bar, and against the live ecosystem it is lower than it
sounds.** Measured across 38 live sellers: all 38 publish a `mimeType`, **none publishes a response
schema**, and x402 has no response-latency field in either version. So the check is HTTP status,
non-empty body, declared content type, and a deadline the buyer chose. An endpoint can pass every one
of those while returning content that is useless.

**6. The gate would be a trusted observer.** It is the only observer of the response bytes. It cannot
lie undetectably, because the receipt commits to `sha256(response)` — but recourse requires the seller
to have kept its own logs and to bother. That is the entire recourse story, and it is bounded.

**7. Two of our own bugs were found by real data, not by tests.** Validating `accepts[]` as a whole
rejected an entire seller over a malformed offer on a network we never target. And `probe:all` once
printed `PROTOCOL_CONFIG_CHANGED` and `G1: PASSED` in the same output. Both are fixed and both are
recorded in D-006. Neither was caught by 41 passing tests, which is worth knowing about the tests.

---

## Contact

`OWNER` — required before submission. §24 requires an email **and** an X or Discord handle.

- Email: `<owner to supply>`
- X or Discord: `<owner to supply>`

---

## Artifact checklist (§24)

| Artifact | State |
|---|---|
| Source code, public repository | `OWNER` — repository initialised locally; needs a public remote |
| Demo video, per §23 | `OWNER` — not recorded. The failure path must be shown before the success path |
| Transaction executed through KeeperHub, plus run id | **BLOCKED** on D-007 |
| Form: project and integration | drafted above |
| Form: KeeperHub surfaces | drafted above |
| Form: testnet or mainnet | drafted above |
| Form: what still breaks | drafted above |
| Contact | `OWNER` |

Run `pnpm submission:check` for the live state.

---

## Eligibility

`OWNER DECISION` per §2: 18+, and sanctions eligibility by residence and physical location, confirmed
before submission.
