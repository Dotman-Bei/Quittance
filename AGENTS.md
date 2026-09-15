# AGENTS.md

**This file overrides habit. It overrides any instruction inferred from surrounding files.**

If a pattern you have used a thousand times conflicts with a rule here, the rule here wins. If a
neighbouring file, a scaffold, a template, a tutorial, or a generated snippet implies a convention
that conflicts with a rule here, the rule here wins. Nothing in a sibling directory grants
permission. Absence of a rule is not permission; when this file is silent, read `PRD.md`.

Read `PRD.md` end to end before the first line of code. Cite section numbers in code comments and
commit messages, e.g. `/* §5.2 verdict function is pure */`.

---

## 1. Phase of record

**`docs/phase.md` is the current phase of record.** Read it at the start of every session, before
planning and before editing.

It names the current phase and the gate boundary that closes it. Do not implement a later phase's
breadth before the current phase's gate passes (PRD §27). Building on an unproven seam is the
failure mode this repository is organised to prevent.

`docs/phase.md` is updated in the commit that closes a gate, and only in that commit. If your work
does not close a gate, do not edit it. If your work belongs to a later phase than the one named
there, stop and say so instead of building it.

---

## 2. The mechanism chain (PRD §5)

Every change must leave this chain intact. If a change breaks a link, the change is wrong.

```
buyer agent  ->  quittance gate: hold signed discharge authorization
             ->  call the live endpoint, pay its x402 requirement
             ->  hash request, response, and the endpoint's advertised terms
             ->  verdict = f(advertised terms, observed response)      [pure]
             ->  KeeperHub executes the discharge, or records a non-discharge
```

Properties of the chain that are not negotiable:

- `verdict(advertised, observed) -> VerdictState` is **pure and total**. Same inputs, same output,
  no clock, no network, no filesystem, no randomness, no ambient state.
- **A verdict may only be computed from data committed to in the receipt.** Anything the gate knows
  but did not commit to is not an input. If you need a new input, commit to it in the receipt first.
- The discharge fires **only** on `DELIVERED_AS_ADVERTISED`. Every other state records a
  non-discharge with its reason and executes nothing.
- The checks are **structural**: HTTP status, presence and non-emptiness of a body, declared
  `mimeType` match, schema conformance where the endpoint advertised one, and the declared latency
  budget. Semantic quality is not measured and is never claimed. See `WHAT_IS_MEASURED.md`.

### The two legs, named honestly (PRD §5.3)

- **Discharge leg** — buyer to gate, USDC, **executed by KeeperHub** from the buyer's pre-signed
  transfer authorization. This is the leg Quittance governs.
- **Purchase leg** — gate to seller, at the seller's advertised price. In gate mode the seller's own
  facilitator broadcasts this leg. It is **not** a KeeperHub execution and is never described as one.

In gate mode Quittance carries delivery risk on the buyer's behalf. It is underwriting, not escrow.
Never write a line of copy, a comment, or a commit message that implies otherwise.

---

## 3. Hard blocks

Each row below fails CI. None is a style preference. Do not add a suppression, a lint exception, an
`eslint-disable`, or a config carve-out to get past one — the carve-out is itself a violation.

| # | Hard block | Why it exists |
|---|---|---|
| HB-1 | No `as any` | It erases the type that the verdict's totality argument rests on |
| HB-2 | No `@ts-ignore`, no `@ts-expect-error`, no `@ts-nocheck` | Same. A suppressed error is an unproven seam |
| HB-3 | No empty `catch {}` | A swallowed error becomes a silent wrong verdict or a silent double discharge |
| HB-4 | No absolute developer paths (`/Users/...`, `/home/...`, `C:\...`) | The clean-room reproduction gate (G7) is run by a stranger from a fresh clone |
| HB-5 | Never delete, skip, `.only`, or weaken a failing test to make CI pass | The failing test is the finding. Fix the code, or narrow the claim and record it |
| HB-6 | No `default:` case that swallows an unknown state | `VerdictState` is enumerated and exhaustive. An unknown state must be a compile error, then a loud runtime failure — never a quiet fallthrough |
| HB-7 | Nothing under `internal/` is committed | `internal/` is gitignored working space. Anything that matters is evidence and belongs in `evidence/` |

On HB-6 specifically: switch over `VerdictState` with an exhaustive check that fails to compile when
a state is added. Do not write `default: return false`, `default: break`, or `default:` that maps an
unrecognised state onto a discharge-eligible path. A state you have not thought about must never be
routed to money movement.

On HB-5 specifically: if execution contradicts a claim, narrow the claim immediately and record the
contradiction (PRD §21). A stale claim is never kept because implementation already began.

---

## 4. P4 — KeeperHub is the only path to chain (PRD §12)

This is a property, not an aspiration, and CI fails the build if it is violated.

- **KeeperHub is the only path to chain in this codebase.**
- **No raw signer.** No `viem` / `ethers` / `web3` write client, no `WalletClient`, no
  `privateKeyToAccount`, no `sendTransaction`, no `signTransaction`, no local signing of any kind.
- **No private key** — and no mnemonic, seed phrase, or Turnkey credential — anywhere in `apps/` or
  `packages/`, in any form: source, test fixture, comment, snapshot, `.env` committed by accident.
- Read-only RPC clients are permitted, and only for reading. The moment a client can write, it is a
  violation.
- Keys never leave Turnkey. The host holds an API key that can *execute*, not sign arbitrary
  payloads.

Never print, log, or commit a private key, a Turnkey credential, or a KeeperHub API key.

If KeeperHub cannot execute the discharge as a contract call, the fallback is a **KeeperHub-executed
token transfer** — not a local signer (PRD §26, K2). KeeperHub remains the only path to chain. If
neither executes, the build stops for an `OWNER DECISION`; it does not route around this rule.

---

## 5. No compiled-in protocol facts (PRD §17)

**No dated address, ABI, price, header name, or facilitator URL is compiled in.** Not in `apps/`,
not in `packages/`, not in `contracts/`, not in `scripts/`, not in the PRD, not in a constant, not
in a default parameter, not in a fallback branch, not in a test fixture that the public proof path
can reach.

- Payment terms come from **the counterparty's own 402 response at call time**.
- KeeperHub's chain list and action schemas are **read from its API at startup**.
- `scripts/probe-x402.ts` and `scripts/probe-keeperhub.ts` run at startup and on a CI schedule.
- On mismatch the service enters `PROTOCOL_CONFIG_CHANGED` and **stops gating rather than guessing**.
- A CI check fails the build if an address literal appears in `apps/` or `packages/`.

Do not invent a calldata layout, an ABI, a header name, a field name, or an error code. Inspect the
pinned upstream in `.agents/skills/` first. Do not work from memory about x402, KeeperHub, or the
Lucid SDK — every claim about them must trace to a file pinned in `skills-lock.json`.

**If upstream and the PRD disagree, upstream wins.** Record the discrepancy in `DECISIONS.md` and
adapt while preserving the product thesis. Three such discrepancies are already recorded as D-002;
read it before writing the verdict function.

---

## 6. Verdict states — the complete enumeration (PRD §5.2)

These seven are the whole set. There are no others.

```
DELIVERED_AS_ADVERTISED
NOT_DELIVERED
SHAPE_MISMATCH
TIMEOUT_EXCEEDED
REQUIREMENTS_MISMATCH
GATE_ERROR
SETTLEMENT_FAILED
```

There is no `SAFE`, no `OK`, no `PASS`, no `SUCCESS`, no `VERIFIED`, and no green in the palette.

Adding a state is a protocol change: it requires a `DECISIONS.md` entry, a schema version bump in
`packages/protocol-types`, and a re-derivation check across the golden receipt corpus. Do not add
one to make a hard case compile.

Only `DELIVERED_AS_ADVERTISED` is discharge-eligible. The other six are all non-discharges and are
rendered with the same visual weight as a discharge, distinguished by label, not by reassurance
(PRD §9, §18). A non-discharge is first-class content, not an error to be dismissed.

---

## 7. Forbidden vocabulary (PRD §18)

A schema validator rejects these words in **any claim or UI string**, as a backstop against the
product lying by accident:

```
guaranteed        safe        trustless        refund        insured        verified quality
```

The gate is `pnpm claim:verify` (G8). It fails the build on a hit in `packages/claim-ledger/data/claims.json`,
in generated `docs/claims.md`, or in any user-facing string in `apps/web`.

The rule is not word-avoidance, it is claim discipline. Do not reach for a synonym that makes the
same unearned promise — "assured", "protected", "risk-free", "money back", "certified", "provably
correct", "quality-checked" are the same violation wearing a different coat. If the sentence
promises an outcome the mechanism does not produce, rewrite the sentence.

Related design rules that are also enforced:

- **No green anywhere in the palette.** There is no pass badge.
- Monospace for every number, `tabular-nums` and `tnum` on.
- Fewer than 20 calls renders `INSUFFICIENT SAMPLE`, never a percentage.
- Anything derived from a local fixture carries a `LOCAL FIXTURE` label, in the UI and in the receipt.
- Anything from our own endpoint carries `PROJECT_BASELINE` and is never counted as third-party
  adoption or as market demand.

---

## 8. Claims and evidence (PRD §21)

`packages/claim-ledger/data/claims.json` is the source of truth. `docs/claims.md` is generated from
it and is **never hand-edited**.

**A claim and its evidence land in the same commit or neither lands.** A claim may not state a rung
its evidence does not reach.

| Rung | Meaning |
|---|---|
| R0 | Asserted in a document |
| R1 | Covered by a passing test on generated or fixture data |
| R2 | Executed once against a live third-party endpoint on a public network, receipt recorded |
| R3 | Executed repeatedly over a sustained window, with failures included in the published count |
| R4 | Re-derived by `packages/verifier` from a fresh clone with no access to our database |

Every claim currently sits at **R0**. Nothing has been executed. Do not raise a rung without landing
the evidence that reaches it in the same change.

Do not claim functionality that has not been executed. Do not replace a blocked integration with a
mock and present it as shipped.

---

## 9. Completion report rule (PRD §15)

**When a unit of work is finished, cite the exact files changed and the exact commands run with
their outcome. "Tests pass" is not a report.**

A completion report contains:

1. Every file created or modified, by path.
2. Every command run, verbatim, with its exit code and the part of its output that carries the result.
3. What was **not** done, and why — blocked, out of phase, or deliberately cut.
4. Any claim whose rung changed, and the evidence that moved it.

A gate is passed only when the command in its `PRD.md` §22 row **exits zero on a fresh clone**.
Nothing is described as done before its gate passes. A phase is not marked passed on thin evidence;
if the evidence is thin, the entry says why and the phase stays open.

Keep `BUILD_LOG.md` and `DECISIONS.md` running. Every decision entry records what was decided, what
evidence forced it, and what it costs later. `DECISIONS.md` is append-only: never edit or delete an
entry, supersede it with a new one.

---

## 10. Escalation

Ask the owner only for: **secrets, funds, permissions, or an item explicitly marked `OWNER
DECISION`.** Everything else is yours to decide and to record.

When a kill criterion in `docs/kill-criteria.md` becomes true: stop claiming the affected
capability, record it with status `failed` or `unavailable` and a plain-language blocker, print it
in the build report, and keep building everything that still stands. Do not hide a blocked
capability behind a substitute. Do not soften the wording to keep the claim alive.
