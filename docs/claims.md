# Claims

> **Generated from `packages/claim-ledger/data/claims.json`. Never hand-edit this file.**
> Regenerate with `pnpm claims:generate`. CI fails if it is out of date (§21).

A claim may not state a rung its evidence does not reach. A claim and its evidence land
in the same commit or neither lands.

## Proof ladder

| Rung | Meaning |
|---|---|
| R0 | Asserted in a document |
| R1 | Covered by a passing test on generated or fixture data |
| R2 | Executed once against a live third-party endpoint on a public network, receipt recorded |
| R3 | Executed repeatedly over a sustained window, with failures included in the published count |
| R4 | Re-derived by packages/verifier from a fresh clone with no access to our database |

## Current state

**7 claims — R0=2 · R2=2 · R3=3**

| id | Claim | Now | Target | Phase | Gates |
|---|---|---|---|---|---|
| C-001 | A discharge fires only on DELIVERED_AS_ADVERTISED | **R2** | R4 | P1 | G2 |
| C-002 | Any stranger can re-derive a published verdict from the receipt and the chain | **R0** | R4 | P1 | G2, G7 |
| C-003 | Value moved through KeeperHub, triggered by a call to a live listed endpoint | **R3** | R3 | P2 | G3 |
| C-004 | Non-delivery against a live endpoint was recorded and the discharge did not execute | **R2** | R2 | P2 | G4 |
| C-005 | A duplicate settlement attempt does not produce a second discharge | **R3** | R3 | P3 | G10 |
| C-006 | The system survived an induced infrastructure failure and recovered | **R0** | R2 | P3 | G6 |
| C-007 | Endpoint delivery records are computed from receipts, not from seller-reported metadata | **R3** | R3 | P3 | G5 |

## Detail

### C-001 — A discharge fires only on DELIVERED_AS_ADVERTISED

**Rung:** R2 (target R4) · **Phase:** P1
**Kill criteria in scope:** K4

**Evidence:**

- `pnpm test:properties` — reaches R1
  - `packages/reference/test/verdict.properties.test.ts`
  - fast-check over 2000 generated envelopes per property: verdict() is total and enumerated; isDischargeEligible is true for DELIVERED_AS_ADVERTISED and for no other state; gate_error, settlement_failed, a zero-byte body, a non-2xx status, and a price above the intent cap are each never discharge-eligible.
- `node internal/buyer/adversarial.mjs` — reaches R2
  - `evidence/receipts/`
  - Executed against live third-party endpoints on Base mainnet: every DELIVERED_AS_ADVERTISED receipt carries a fee transaction and every non-discharge carries none. The adversarial suite additionally drove all five failure shapes against a controlled endpoint — empty body, wrong mime type, 502 after payment, slow past the buyer's cap, and the delivering control — and the verdict matched the expected state in 5 of 5, with a fee transaction on the control only.

**Notes.** R2 reached. R4 still requires re-derivation from a fresh clone with no access to our database. Narrowed by D-002 and D-005: against a seller publishing neither a mimeType nor a schema the structural check is status plus non-empty body, plus the buyer's latency bound. The adversarial suite's failure shapes were produced by OUR OWN endpoint and are labelled PROJECT_BASELINE; they evidence the verdict function, not third-party behaviour.

### C-002 — Any stranger can re-derive a published verdict from the receipt and the chain

**Rung:** R0 (target R4) · **Phase:** P1
**Kill criteria in scope:** K3

**Evidence:**

- `pnpm test` — reaches R1 for the receipt half only
  - `packages/reference/test/re-derive.test.ts`
  - reDerive() re-runs verdict() over a receipt's own committed inputs with no gate access, detects a forged published verdict, detects a tampered response body against the receipt's sha256 commitment, and flags a discharge recorded against a non-eligible state. Exercised end to end through the packages/verifier CLI.

**Notes.** HELD AT R0 DELIBERATELY. The claim says 'from the receipt AND THE CHAIN'. Only the receipt half is covered by a passing test; no chain data is read anywhere yet, and no verdict has been published to re-derive. A claim may not state a rung its evidence does not reach (§21), so the evidence is recorded but the rung is not raised. If K3 fires, drop the R4 target to R2 and publish which input is missing.

### C-003 — Value moved through KeeperHub, triggered by a call to a live listed endpoint

**Rung:** R3 (target R3) · **Phase:** P2
**Kill criteria in scope:** K1, K2, K5

**Evidence:**

- `node internal/buyer/run.mjs <live x402 resource>` — reaches R2
  - `evidence/receipts/f8f949d34582fadc525d28ea8e49cc0f1c45d4ea58acd4d8bfb2d9740a5d14e3.json`
  - First fee executed through KeeperHub on Base mainnet, triggered by a gated call to api.onesource.io, a live third-party x402 resource listed in the public discovery index. Transaction 0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852, block 51349475, status SUCCESS, verified against Base mainnet independently of KeeperHub. Both logs emitted by the real Base USDC contract: AuthorizationUsed (EIP-3009 nonce consumed, authorizer = buyer) and Transfer of 100 atomic USDC from buyer to gate. 24 such transactions now exist across 23 distinct third-party hosts.
- `pnpm campaign -- --min 130 --window 24h` — reaches R3
  - `evidence/campaigns/2026-09-16T14-15-52-602Z.md`
  - Sustained campaign over 24h 26m: 130 gated calls, 114 discharges, 16 non-discharges, across 31 distinct live third-party hosts, with 114 fee transactions executed through KeeperHub on Base mainnet. Totals published INCLUDING every failure, and transient infrastructure errors counted separately (0 occurred). The full receipt corpus now spans 343 receipts over a 46.6-hour window.

**Notes.** R3 reached 2026-09-17. Per D-009 the value that moves is the conditional FEE, buyer to gate; the purchase leg is paid by the buyer directly and is not a KeeperHub execution. KeeperHub broadcast via a sponsored relayer, so msg.sender is KeeperHub's relayer rather than our organisation wallet — the submission describes it that way.

### C-004 — Non-delivery against a live endpoint was recorded and the discharge did not execute

**Rung:** R2 (target R2) · **Phase:** P2
**Kill criteria in scope:** K1

**Evidence:**

- `node internal/buyer/hunt.mjs` — reaches R2
  - `evidence/receipts/d57988cd35d2d2bbc714d5c3dafdcf442410d74dec4ed7c4b371c8e4277dc997.json`
  - api.onesource.io returned HTTP 502 AFTER payment on two resources — /api/chain/erc1155-balance (GET) and /api/chain/estimate-gas (POST). Both were called exactly as the seller's own bazaar declaration specifies: all four declared query parameters for the first, the declared JSON body for the second. Both resources return 402 when probed unpaid, so payment was required and accepted before the failure. Verdict NOT_DELIVERED, dischargeTxHash null on both — NO FEE WAS CHARGED — and both receipts re-derive independently. The absence of a fee transaction is the evidence.
- `node internal/buyer/hunt.mjs` — reaches R2
  - `evidence/receipts/823df56c8cb188f461fda63b2f206da51ae7383e027ddb534dec5cf5dd6e83c2.json`
  - Second instance, /api/chain/estimate-gas, POST with the seller's declared body. HTTP 502, NOT_DELIVERED, no fee.

**Notes.** R2 reached 2026-09-16 after a 60-seller sweep. These are the first non-discharges NOT caused by us: earlier ones came from the gate sending a bare GET to endpoints needing query parameters or POST, and from a seller whose bazaar declaration contradicts itself. Both of these were called exactly as declared and the seller returned 502 after taking payment. Of 60 live sellers paid, 13 did not deliver; 11 of those 13 remain attributable to us — 8 unsubstituted path placeholders and 3 requiring an API key the seller declares. Only these 2 are clean seller failures, and the endpoint page must keep showing which checks were available so this is not read as a 78% seller failure rate.

### C-005 — A duplicate settlement attempt does not produce a second discharge

**Rung:** R3 (target R3) · **Phase:** P3
**Kill criteria in scope:** K5, K7

**Evidence:**

- `node internal/buyer/idempotency.mjs` — reaches R2
  - `evidence/receipts/`
  - The same authorization nonce submitted twice produced exactly one discharge. Both attempts returned executionId 5af7vnjtmxkywxtbpn3fj and transaction 0xa65b14a881352663f343506be15cdad4f9fbf467cac0ebf928479bcff2386ccd (block 51350479, SUCCESS on Base mainnet), and the second was marked idempotentReplay: true. Enforced by KeeperHub's documented Idempotency-Key contract keyed on the authorization nonce, used as shipped rather than reimplemented (§8.4).
- `pnpm campaign -- --min 130 --window 24h` — reaches R3
  - `evidence/campaigns/2026-09-16T14-15-52-602Z.md`
  - Idempotency held across a sustained window: 130 gated calls over 24h 26m produced 114 fee transactions and not one duplicate discharge. Every fee is keyed by its authorization nonce through KeeperHub's documented Idempotency-Key contract, used as shipped rather than reimplemented (§8.4). K7 did not fire at any point.

**Notes.** R3 reached across a 24-hour window. The R2 evidence remains the sharper demonstration: the same nonce submitted twice returned the same executionId and the same transaction, with the second marked idempotentReplay. If a duplicate ever produces two discharges, K7 fires: stop the campaign, publish the tx pair, restart the count from zero.

### C-006 — The system survived an induced infrastructure failure and recovered

**Rung:** R0 (target R2) · **Phase:** P3

**Evidence:** none. This claim is asserted in a document and nothing more.

**Notes.** Transient infrastructure errors are counted and reported separately from verdicts and are never folded into an endpoint's delivery record.

### C-007 — Endpoint delivery records are computed from receipts, not from seller-reported metadata

**Rung:** R3 (target R3) · **Phase:** P3
**Kill criteria in scope:** K1, K4, K5

**Evidence:**

- `pnpm campaign -- --min 130 --window 24h` — reaches R3
  - `evidence/campaigns/2026-09-16T14-15-52-602Z.md`
  - Delivery records for 32 distinct third-party hosts are computed from 343 published receipts spanning 46.6 hours, never from seller-reported metadata. Each record carries counts and reason codes rather than a score, shows which checks were available for that endpoint, and renders INSUFFICIENT SAMPLE below 20 calls instead of a percentage. Independently corroborated: the discovery index reported a mimeType for 5 of 100 resources while the live 402s carried one for 38 of 38 — the index is not the terms.

**Notes.** R3 reached 2026-09-17. Read the counts carefully: of 60 sellers paid in the G4 sweep, 13 did not deliver, but 11 of those 13 were OUR malformed requests — 8 unsubstituted path placeholders and 3 requiring an API key the seller declares. Endpoint pages show which checks were available precisely so our error rate cannot be read as theirs.

## Forbidden vocabulary (§18)

Rejected in any claim or UI string, as a backstop against the product lying by accident:

`guaranteed` · `safe` · `trustless` · `refund` · `insured` · `verified quality`
