# Submission package

Per PRD §24. **The "what still breaks" answer matches the README limitations exactly**, as §24 requires,
so the submission cannot quietly become more confident than the build.

`pnpm submission:check` reports the live state of every row and exits zero (G9).

---

## Which project, and what the integration does

**Project:** Daydreams — its Lucid endpoints and the x402 resources listed through the public
discovery index.

**What the integration does.** Quittance sits between a buying agent and a paid x402 endpoint. It
reads the endpoint's own 402 response, relays the buyer's call, hashes the request, the response and the
advertised terms into a receipt, and runs a pure function over that receipt to decide whether the
response was structurally what the seller advertised. Settlement of the fee leg is executed by KeeperHub,
and only on `DELIVERED_AS_ADVERTISED`. Every other outcome records a non-discharge with its reason and moves
no fee money.

**Endpoints actually called.** 343 live gated calls executed across 32 distinct hosts on Base mainnet from the
public discovery index, including a 130-call sustained campaign over 24h 26m (114 discharges, 16 non-discharges).
303 calls resulted in a discharge fee executed via KeeperHub on Base mainnet. Full evidence is published in
`evidence/campaigns/` and `evidence/receipts/`.

---

## Which KeeperHub surfaces

Only what is actually used, per §8.4:

| Surface | Status | Use in Quittance |
|---|---|---|
| Chain list read from the live API (`GET /api/chains`) | **used** | 24 chains read at startup; nothing compiled in |
| Contract call action | **used** | Executing the fee leg — broadcasting the buyer's pre-signed `transferWithAuthorization` conditional fee on Base mainnet (303 executed runs) |
| Turnkey-backed wallet | **used** | Custody for the gate's fee recipient; keys never leave the enclave |
| Executions API | **used** | Run IDs (`keeperhubRunId`) and logs recorded in every receipt as an audit trail |

---

## Testnet or mainnet

**Base mainnet in USDC.**

303 fee transactions executed through KeeperHub on Base mainnet (e.g. tx `0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852`, KeeperHub run `b56dusna0v6diklwih7eu`).

---

## What still breaks

The candid answer, matching the README limitations and DECISIONS.md exactly:

**1. Quittance does not protect a buyer.** The buyer pays the seller directly from its own wallet; a failed
call still costs them the purchase price and Quittance recovers nothing. The only thing that changes on a
failure is that **we are not paid**.

**2. Structural conformance is a low bar, and against the live ecosystem it is lower than it sounds.**
Measured across 38 live sellers: all 38 publish a `mimeType`, **none publishes a response schema**, and
x402 has no response-latency field in either version. So the check is HTTP status, non-empty body, declared
content type, and a deadline the buyer chose. An endpoint can pass every one of those while returning content
that is useless.

**3. The gate is a trusted observer.** It is the only observer of the response bytes. It cannot lie
undetectably, because the receipt commits to `sha256(response)` — but recourse requires the seller to have
kept its own logs and to bother. That is the entire recourse story, and it is bounded.

**4. Nine of ten acceptance gates pass; G6 is unbuilt.** G6 (recovery under induced infrastructure failure)
is not built. G7's live half has been tested in CI and locally, but has never been run by an independent
stranger without our involvement.

**5. Scope was cut under our own kill criterion (K8).** Facilitator mode — the path a seller could actually
adopt — was cut under D-008 and not built. `ReceiptAnchor` was cut, so published receipts are not
tamper-evident on chain and rest on our word and public hash records that we have not edited them.

**6. Two of seven claims remain at rung R0.** C-001 and C-002 require independent reproduction by a stranger
from a fresh clone (R4). Four claims sit at R3, and one (adversarial baseline) sits at R2. Third-party adoption
is zero — nothing here is evidence of commercial demand.

**7. Two of our own bugs were found by real data, not by tests.** Validating `accepts[]` as a whole rejected an
entire seller over a malformed offer on a network we never target. And `probe:all` once printed
`PROTOCOL_CONFIG_CHANGED` and `G1: PASSED` in the same output. Both are fixed and recorded in D-006. Neither
was caught by 41 passing tests.

---

## Contact

§24 requires an email **and** an X or Discord handle.

- **Email:** bamigboyeemmanuel401@gmail.com
- **X:** [@heisbei02](https://x.com/heisbei02)

---

## Artifact checklist (§24)

| Artifact | State |
|---|---|
| Source code, public repository | Public — remote configured |
| Demo video, per §23 | Recorded — https://youtu.be/F8fvQNC44wE (4m58s, 1080p24, failure path shown first). Archival copy: `evidence/quittance_demo.mp4` |
| Transaction executed through KeeperHub, plus run id | Executed — 343 receipts, 303 with discharge tx and KeeperHub run id on Base mainnet |
| Form: project and integration | drafted above |
| Form: KeeperHub surfaces | drafted above |
| Form: testnet or mainnet | drafted above |
| Form: what still breaks | drafted above |
| Contact | Provided above |

Run `pnpm submission:check` for the live state.

---

## Eligibility

`OWNER DECISION` per §2: 18+, and sanctions eligibility by residence and physical location, confirmed
before submission.
