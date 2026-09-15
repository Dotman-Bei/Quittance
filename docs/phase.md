# Phase of Record

> This file is the phase of record. It is read at the start of every session, before planning and
> before editing. It is updated **only** in the commit that closes a gate (PRD §27).

## Current phase: **P1**

**Status:** open — **G1 passed, G2 partially met. K8 TRIGGERED 2026-09-15: scope cut, see D-008.**
**Set:** 2026-09-09
**Last gate closed:** **G1, 2026-09-09**

### Contents of P1

| Component | Path | State |
|---|---|---|
| `protocol-types` — zod schemas for receipt, verdict, advertised terms | `packages/protocol-types/` | **built, typechecks** |
| `reference` — reference implementation of the verdict function | `packages/reference/` | **built, 26 tests pass** |
| `verifier` — independent re-derivation, no gate access | `packages/verifier/` | **built, CLI exercised end to end** |
| Probes — live protocol-fact readers | `scripts/probe-x402.ts`, `scripts/probe-keeperhub.ts`, `scripts/probe-all.ts` | **built. `pnpm probe:all` exits 0 against 46 live hosts + KeeperHub** |
| Receipt format — canonicalization and hashing | `packages/protocol-types/` | **built, round-trip property-tested** |

### Stop boundary

> **G1 and G2 pass. Nothing is called live before the verdict function is pure and the probes are
> honest.**

P1 closes when both of these exit zero on a fresh clone:

| Gate | Command | Passes when |
|---|---|---|
| **G1** — No compiled-in protocol facts | `pnpm probe:all` | **PASSED 2026-09-09.** Exits 0. Address-literal check clean over 55 files; 39 of 46 live hosts returned a parseable 402; KeeperHub's 24-chain list read from its live API. Evidence: `evidence/probes/2026-09-09-g1-probe-run.md` |
| **G2** — Verdict determinism | `pnpm test:properties` | **PARTIAL.** Exits zero: 26 tests, 2000 generated envelopes per property, `verdict()` pure, total, deterministic, non-mutating, order-independent; canonicalization round-trips byte-identically. **The 500-golden-receipt half is not met** — no golden corpus exists, because no receipt has been produced |

### What is explicitly out of bounds while P1 is open

Do not implement a later phase's breadth before this phase's gate passes (PRD §27). The following
belong to later phases and are **not** to be built now:

- **P2** — gate service, KeeperHub discharge, first live call. No live call of any kind is made
  while P1 is open. That is the literal text of the stop boundary.
- **P3** — campaign, idempotency harness, recovery, endpoint records.
- **P4** — web surfaces (`apps/web`), SDK publication, facilitator mode, upstream report.

`apps/gate/`, `apps/facilitator/`, `apps/web/`, `contracts/`, and `packages/quittance-sdk/` exist as
directories only. They stay empty until their phase opens.

### Phase ladder (PRD §27)

| Phase | Contents | Stop boundary |
|---|---|---|
| **P1** *(current)* | `protocol-types`, `reference`, `verifier`, probes, receipt format | G1 and G2 pass. Nothing is called live before the verdict function is pure and the probes are honest |
| P2 | Gate service, KeeperHub discharge, first live call | G3 and G4 pass. No UI beyond a receipt dump |
| P3 | Campaign, idempotency, recovery, endpoint records | G5, G6 and G10 pass |
| P4 | Web surfaces, SDK publication, facilitator mode, upstream report | G7, G8 and G9 pass |

### Definition of a passed phase

The phase's gates pass **and this file says so in the commit that closes it.** A phase is not marked
passed on thin evidence. If the evidence is thin, the entry below says why and the phase stays open.

### Phase log

| Date | Event |
|---|---|
| 2026-09-09 | P1 opened. Repository scaffolded per PRD §8.1. No gate attempted; no code written. All claims at R0. |
| 2026-09-09 | P1 packages built: `protocol-types`, `reference`, `verifier`. `pnpm typecheck`, `pnpm test` and `pnpm claim:verify` all exit zero. C-001 raised to R1 on property-test evidence; C-002 held at R0 because its wording includes "and the chain" and no chain data is read anywhere yet. |
| 2026-09-09 | `apps/web` built as the D-004 phase exception. Builds, typechecks, serves all seven routes. |
| **2026-09-15** | **K8 FIRED.** G3 not passed with 72h to the deadline. Facilitator mode and `ReceiptAnchor` cut (D-008). Remaining effort protects G3, G4, G7, G9 in that order — but **G3 and G4 are blocked on D-007, an OWNER DECISION unmade since 2026-09-09.** |
| 2026-09-09 | **G1 PASSED.** Probes built and run against live infrastructure. Found real upstream drift (a seller publishing a non-integral `amount`) and two flaws in our own code, both fixed — see D-006. K1 and K4 evaluated against live data and neither is triggered. **P1 stays open: G2's golden-receipt corpus requires receipts from live calls, which is P2.** |
