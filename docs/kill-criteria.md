# Kill Criteria

> **Generated from PRD §26. Do not hand-edit the criteria.** Only the Status column and the log at
> the foot of this file are updated as conditions are evaluated.

If any condition below becomes true: **stop claiming the affected capability**, record it with
status `failed` or `unavailable` and a plain-language blocker, print it in the build report, and
keep building everything that still stands.

Do not hide a blocked capability behind a substitute.
Do not soften the wording to keep the claim alive.

**Status legend:** `not triggered` · `triggered` · `resolved`

---

## K1 — No parseable 402 from a live listed endpoint

**Condition.** No live Daydreams-listed endpoint returns a parseable 402 on the target network.
**Claims affected.** C-003, C-004, C-007, and the PRD §2 live-project anchor.
**Action.** Escalate to any live x402 seller reachable through the index, rename the counterparty in
every document, and state the substitution in the README and the form answer.
**Never.** Never call our own endpoint the live project.
**Status:** **not triggered — evaluated against live data on 2026-09-09.**
**Evidence.** `pnpm probe:all` across one resource per distinct host from the live x402 discovery
index: **39 of 46 hosts returned a parseable 402 on Base mainnet (`eip155:8453`)**, all x402 v2 with
terms in the `PAYMENT-REQUIRED` header. 8 returned a non-402 (stale index entries). See
`evidence/probes/2026-09-09-g1-probe-run.md` and D-006. The condition is comfortably false.
**Caveat.** These are live x402 sellers reached through the public index. Whether each is
*Daydreams-listed* specifically has not been established, and that distinction matters for the PRD §2
live-project anchor. Confirm before naming the counterparty in the submission.

---

## K2 — KeeperHub cannot execute the discharge as a contract call

**Condition.** KeeperHub cannot execute the discharge as a contract call from the Turnkey wallet.
**Claims affected.** C-003, and property P4.
**Action.** Fall back to a KeeperHub-executed token transfer from the gate wallet, record the loss of
pull-based UX in `DECISIONS.md`, and keep KeeperHub as the only path to chain.
**Escalation.** If neither executes, the submission has no main-track thesis and the build stops for
an `OWNER DECISION`.
**Never.** The fallback is never a local signer. P4 holds in both branches.
**Status:** **not triggered.** The discharge leg is a contract call broadcasting the *buyer's*
pre-signed authorization (`POST /api/execute/contract-call`); we sign nothing, so this criterion's
condition is false.
**But see the gap below.** K2 covers the discharge leg only. The blocker found on 2026-09-09 is on
the **purchase** leg, which no criterion in §26 covers.

---

## K3 — The verifier cannot re-derive without gate-held data

**Condition.** `packages/verifier` cannot re-derive a verdict without gate-held data.
**Claims affected.** C-002, and every R4 target.
**Action.** Drop every affected claim to R2, delete "independently checkable" from all copy, and
publish exactly which input is missing.
**Status:** not triggered

---

## K4 — Responses are not structurally checkable

**Condition.** Responses in the target class are not structurally checkable in any meaningful way.
**Claims affected.** C-001, C-007.
**Action.** Narrow the check to status, non-emptiness, and the advertised latency budget.
**Never.** Never widen the claim to quality.
**Note.** D-002 establishes that x402 advertises no response-latency SLA in either version, so the
narrowed form of this action reads: status, non-emptiness, and the **buyer's** latency bound.
**Status:** **not triggered — evaluated against live data on 2026-09-09.**
**Evidence.** Measured across 38 live sellers (D-006): **38 of 38 publish a `mimeType`**, so content
type is a real, checkable dimension against every seller probed. **0 of 38 publish a response
schema**, so schema conformance is unavailable in practice. The check therefore stands at three
structural dimensions — status, non-empty body, declared content type — plus the buyer's own latency
bound. That is thin, and it is stated as thin in `WHAT_IS_MEASURED.md`, but it is not "not
structurally checkable in any meaningful way".
**Watch.** If sellers turn out to advertise `application/json` reflexively and `SHAPE_MISMATCH` never
fires in a real campaign, the content-type dimension is decorative and this criterion should be
re-evaluated against campaign data rather than against advertised terms.

---

## K5 — Mainnet USDC funding unavailable

**Condition.** Mainnet USDC funding unavailable before the campaign window.
**Claims affected.** C-003, C-005, C-007, and the PRD §16 evidence plan.
**Action.** Run on the testnet, state "testnet" in the form and the README, and mark every testnet
row as such.
**Never.** Testnet runs are never presented as mainnet evidence.
**Status:** not triggered

---

## K6 — No third-party seller adopts facilitator mode

**Condition.** No third-party seller points at facilitator mode.
**Claims affected.** Facilitator-mode adoption claims.
**Action.** Label every run `PROJECT_BASELINE`, state "no third-party adopter" in the README, and
count nothing as demand.
**Note.** D-001 places the public proof path in gate mode precisely so that this criterion firing is
survivable rather than fatal.
**Status:** not triggered

---

## K7 — A duplicate settlement produces two discharges

**Condition.** A duplicate settlement produces two discharges for one authorization.
**Claims affected.** C-005, gate G10.
**Action.** Stop the campaign immediately, publish the incident with the tx pair, ship the nonce
cache, and restart the count from zero.
**Never.** Prior campaign totals are not reused.
**Status:** not triggered

---

## K8 — G3 not passed with 72 hours remaining

**Condition.** G3 has not passed with 72 hours left before the deadline.
**Claims affected.** Scope.
**Action.** Cut facilitator mode, cut `ReceiptAnchor`, cut the endpoint pages to a single table.
**Protection order.** Protect **G3, G4, G7, and G9 — in that order.**
**Record.** Record the cut in `DECISIONS.md` with what it costs.
**Status:** **TRIGGERED 2026-09-15 10:00 UTC.**
**Evidence.** G3 has not passed: `evidence/receipts/` is empty, no discharge has executed, C-003 sits
at R0 with no evidence.
**Cuts executed.** Facilitator mode and `ReceiptAnchor` are cut — neither was built, so the cut is a
commitment not to build them. The endpoint-pages cut is moot: those pages are already built and
working, and deleting finished work protects nothing, so no further effort goes into them and they
stay. Recorded in full as **D-008**.
**Blocker in plain language.** K8 assumes G3 is reachable once effort concentrates on it. It is not.
G3 is blocked on **D-007**, an OWNER DECISION raised 2026-09-09 and unmade six days later. No gated
call means no discharge, which means no transaction link, which means no main-track thesis.

---

## K9 — A live seller disputes a verdict and is right

**Condition.** A live seller disputes a published verdict with its own logs and is right.
**Claims affected.** C-001, C-002.
**Action.** Publish the dispute and the corrected receipt on the endpoint page, keep the incorrect
receipt visible with a supersession note, and record the root cause.
**Never.** The incorrect receipt is not deleted.
**Status:** not triggered

---

## GAP — no criterion covers the gate being unable to pay the seller

**Found 2026-09-09. This is a hole in PRD §26, not a criterion that fired.** Recorded here so it is
not lost, and so the list is honest about its own coverage.

**Condition.** The gate cannot produce the EIP-712 signature the x402 `exact` scheme requires of the
payer, for a payment to a third-party seller, without violating P4.

**Why §26 has no criterion for it.** K2 asks whether KeeperHub can execute the *discharge*. PRD §5.3
treats the purchase leg as the seller's facilitator's concern — which is true for *broadcasting* and
false for *signing*. The gate is the payer, so the gate must sign, and nothing in §26 asks whether it
can.

**Status.** **Triggered in substance.** KeeperHub's agentic-wallet `/sign` route pins the recipient
to a KeeperHub workflow's organisation wallet and refuses an arbitrary destination with
`403 PAYTO_MISMATCH`.

**Claims affected.** C-003 and C-004 in gate mode against third-party sellers, and the PRD §2
live-project anchor.

**Action.** Escalated to the owner with four costed options — see **DECISIONS.md D-007**. No option
is adopted unilaterally: one needs a permission we do not hold, one changes the live counterparty,
one narrows the product thesis, and one would end property P4.

**Never.** Never sign the purchase leg outside KeeperHub without first recording that P4 has fallen
and correcting every document that states it — the README, `SECURITY.md`, `AGENTS.md` §4, and the §2
requirements table.

---

## Related hard deadline

The submission deadline is **Sep 18, 12:00 CEST**. Nothing is accepted after it (PRD §2). K8 is the
criterion that protects against arriving at it with nothing.

## Trigger log

| Date | Criterion | Status change | Blocker in plain language | Where recorded |
|---|---|---|---|---|
| 2026-09-09 | K1 | evaluated → **not triggered** | Live x402 sellers on Base mainnet return parseable 402s: 39 of 46 hosts probed. Open question: whether they are *Daydreams-listed* specifically. | D-006, `evidence/probes/2026-09-09-g1-probe-run.md` |
| 2026-09-09 | K4 | evaluated → **not triggered** | Content type is advertised by 38 of 38 live sellers, so the structural check has three dimensions, not two. Response schema is advertised by none. | D-005, D-006 |
| 2026-09-09 | K2 | evaluated → **not triggered** | The discharge leg is a contract call broadcasting the buyer's own signed authorization. KeeperHub can do this and we sign nothing. | D-007 |
| 2026-09-09 | **GAP (purchase leg)** | **triggered in substance** | The gate cannot sign an x402 payment to a third-party seller: KeeperHub's `/sign` refuses a foreign recipient with `403 PAYTO_MISMATCH`, and P4 forbids a local signer. **Escalated — OWNER DECISION.** | D-007 |
| **2026-09-15** | **K8** | **TRIGGERED** | G3 not passed with 72h remaining. Facilitator mode and `ReceiptAnchor` cut. Protecting G3, G4, G7, G9 — but G3 and G4 are blocked on the unmade D-007 decision. | **D-008** |
| 2026-09-09 | K3, K5, K6, K7, K9 | not evaluated | Each depends on execution that has not happened: no verifier run against a published verdict, no funding decision, no facilitator adopter, no campaign, no deadline pressure yet, no dispute. | — |
