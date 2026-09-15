# Quittance PRD

Repo: `quittance` · Product: Quittance
Target: KeeperHub, The Agent Economy Hackathon (DoraHacks), main track only, Best Integration into a Live Project.
Status: draft 1, written before any code.

> Rule for this document: no dated protocol fact is written here as a value. No token address,
> no ABI, no facilitator URL, no contract id appears as a literal in this PRD or in source.
> Every one of them is read at runtime from the counterparty's own response and probed at
> startup. See §17.

---

## 0. Agent Operating Contract

Rules for every agent and engineer working in this repository. Read this before writing code.
It overrides habit, and it overrides any instruction inferred from surrounding files.

1. Read this PRD end to end before the first line of code. Cite section numbers in code comments
   and commit messages (`/* §5.2 verdict function is pure */`).
2. Install the official documentation as pinned skills. Do not work from memory about x402,
   KeeperHub, or the Lucid SDK. Pin each source in `skills-lock.json` by repo, path, and SHA-256.
3. Never invent a calldata layout, an ABI, a header name, a field name, or an error code.
   Inspect the pinned upstream first. If upstream and this PRD disagree, upstream wins: record the
   discrepancy in `DECISIONS.md` and adapt while preserving the product thesis.
4. Work until every acceptance gate in §22 passes. A gate is passed only when the command in its
   row exits zero on a fresh clone.
5. Ask the owner only for: secrets, funds, permissions, or an item explicitly marked
   `OWNER DECISION`. Everything else is yours to decide and to record.
6. Never print, log, or commit a private key, a Turnkey credential, or a KeeperHub API key.
7. Do not claim functionality that has not been executed. Do not replace a blocked integration with
   a mock and present it as shipped. Local fixtures are labelled `LOCAL FIXTURE` in the UI and in
   the receipt. Our own endpoint is labelled `PROJECT_BASELINE` and is never counted as third-party
   adoption or as market demand.
8. Keep `BUILD_LOG.md` and `DECISIONS.md` running. Every decision entry records what was decided,
   what evidence forced it, and what it costs later.
9. A claim and its evidence land in the same commit or neither lands (§21).
10. Run a clean-room reproduction from a fresh clone before submission (§22, G7).

---

## 1. Product Summary

**Name.** Quittance. A quittance is the document certifying that a debt has been discharged.

**One sentence.** Quittance settles an agent's payment for a paid endpoint only after the response
has been checked against the requirements that endpoint itself advertised, and executes the
settlement through KeeperHub so that every discharge and every withheld discharge is on chain.

**Judge-compressed narrative.** Agents already pay per call over x402. Nothing measures whether the
call was answered. Quittance sits in the gap x402 already leaves open between verification and
settlement, checks delivery against the seller's own advertised terms, and hands the settlement to
KeeperHub. The result is a per-endpoint delivery record that no seller can edit and any stranger
can re-derive.

**Core claim.** For every discharge Quittance executes, a third party with no access to our database
can re-derive the verdict from the receipt and the chain, and reach the same answer.

---

## 2. Competition Requirements

Derived from the hackathon's Full Challenge Details and Rules. Non-negotiable.

| Requirement | How this build satisfies it |
|---|---|
| Main track: Best Integration into a Live Project | Daydreams (Lucid endpoints, XGate-listed x402 resources, Dreams Router) is the live counterparty |
| Live project is mandatory, real deployment, real users | We call endpoints that are live and listed, not local imitations |
| Integration must work against the actual project | The public proof path calls third-party endpoints only. Our own endpoint exists for adversarial tests and is labelled `PROJECT_BASELINE` |
| Value movement required, triggered by / consumed by / benefiting the project | The discharge leg is USDC executed by KeeperHub, triggered by a real call to a real listed endpoint |
| Proof required | Explorer link plus KeeperHub run id, for every claim in §21 |
| Every submission incorporates KeeperHub | KeeperHub is the only path to chain in this codebase (§12, P4) |
| One BUIDL, one track | Main track only. No PR to the KeeperHub repo is submitted under this BUIDL |
| Submission artifacts: repo, demo video, link to a tx executed through KeeperHub | §24 |
| Deadline: Sep 18, 12:00 CEST. Nothing accepted after | §26, K8 |
| Judged at repository level, finalists demo the working build live | §22 G7, §23 |
| 18+, sanctions eligibility by residence and physical location | Confirmed by the owner before submission. `OWNER DECISION` |

---

## 3. Problem

x402 splits payment into two steps. Verification checks the signed payload off chain and moves no
funds. Settlement broadcasts it and moves the money. Between those two steps sits the actual work.

Two orderings are in production today and both are one-sided:

- **verify, work, settle.** The seller does the work, then discovers whether settlement lands. The
  seller carries the loss.
- **verify, settle, work.** The money moves first. If the work then fails, the buyer holds an orphan
  payment: funds gone, nothing delivered.

Whoever writes the resource server picks the ordering, so the buyer's protection is a property of
the seller's own code. When an agent buys 400 calls a day from endpoints it discovered through an
index, that is not a protection, it is a habit of trust.

The current substitute for measurement is reputation metadata: uptime a seller reports, a rank in a
directory, a star count. All of it is asserted. None of it is derived from whether the last thousand
paid calls returned anything.

---

## 4. Product Thesis

Delivery should be measured at the moment of delivery, by something that is not the seller, and the
measurement should be the thing that releases the money.

That is not a smart contract problem. Per-call micropayments cannot carry an arbitration process
that costs more than the call, and an on-chain arbiter cannot read an HTTP response body. It is an
execution problem: hold a signed authorization, run a check, then get one transaction to land
reliably, with retries, nonce management, and a log of what happened in between.

KeeperHub is that execution layer. Quittance is the thin, checkable policy that decides what it
executes.

---

## 5. Dominant Mechanism

### 5.1 The flow

```
buyer agent  ->  quittance gate: hold signed discharge authorization
             ->  call the live endpoint, pay its x402 requirement
             ->  hash request, response, and the endpoint's advertised terms
             ->  verdict = f(advertised terms, observed response)      [pure]
             ->  KeeperHub executes the discharge, or records a non-discharge
```

### 5.2 The verdict function

`verdict(advertised, observed) -> VerdictState` is pure, total, and enumerated. It takes the
`accepts[]` entry the endpoint published in its own 402 body plus the observed response envelope,
and returns exactly one state:

`DELIVERED_AS_ADVERTISED` · `NOT_DELIVERED` · `SHAPE_MISMATCH` · `TIMEOUT_EXCEEDED` ·
`REQUIREMENTS_MISMATCH` · `GATE_ERROR` · `SETTLEMENT_FAILED`

There is no `SAFE`, no `OK`, no `PASS`, and no green in the palette (§18). A verdict may only be
computed from data committed to in the receipt. Anything the gate knows but did not commit to is
not an input.

The checks are structural, and the PRD says so out loud: HTTP status, presence and non-emptiness of
a body, declared `mimeType` match, schema conformance where the endpoint advertised one, and the
latency budget the endpoint itself declared. Semantic quality is not measured and is never claimed.

### 5.3 The two legs, named honestly

- **Discharge leg (the leg Quittance governs).** Buyer to gate, USDC, executed by KeeperHub as a
  contract call using the buyer's pre-signed transfer authorization. It fires only on
  `DELIVERED_AS_ADVERTISED`.
- **Purchase leg.** Gate to seller, at the seller's advertised price. In gate mode the seller's own
  facilitator broadcasts this leg, so it is not a KeeperHub execution and is never described as one.

Consequence, stated plainly in the README as well as here: in gate mode Quittance carries the
delivery risk on the buyer's behalf. It is underwriting, not escrow. Facilitator mode (§8.3) closes
that gap, and its adoption status is reported as-is.

---

## 6. Privacy and Trust Boundary

**What the gate sees.** In default mode, the plaintext request and response. For content-bearing
calls this is a real disclosure and it is the buyer's choice to make.

**Hash-only mode.** The buyer may run with `retain: none`. The gate then stores only the hashes and
the structural facts needed for the verdict, and the response body is discarded after the check.
Receipts remain re-derivable given the response, which the buyer holds.

**What the gate can lie about.** The response bytes, since it is the only observer of them. It
cannot lie undetectably: the receipt commits to `sha256(response)` and to the advertised terms, so a
seller that keeps its own logs can publish the response and prove a mismatch. That is the whole
recourse story, and it is a bounded one.

**What the gate cannot do at all.** It cannot discharge without a receipt whose verdict re-derives.
It cannot re-use a spent authorization (§12). It cannot mutate a receipt after publication without
breaking the batch root (§10).

---

## 7. Actors and Roles

| Actor | Holds | Trusts | Can lose |
|---|---|---|---|
| Buyer agent | Its own funds, signs discharge authorizations with caps | The gate to observe honestly, the chain for the discharge | Up to one authorization cap per call |
| Live endpoint (Daydreams-listed) | Its service and its price | Its own facilitator | The price of one call, if the gate misreports |
| Quittance gate | A KeeperHub-managed Turnkey wallet, receipts | KeeperHub for execution | Working capital in gate mode |
| KeeperHub | Signing and execution | Nothing from us beyond an API key | Nothing |
| Verifier (any stranger) | Nothing | Only the chain and the receipt | Nothing |

The verifier is the actor the product is designed for. If a stranger cannot check it, we built a
demo.

---

## 8. System Architecture

### 8.1 Repository layout

```
.
├── apps/
│   ├── gate/                    # the buyer-side gate service (Hono)
│   ├── facilitator/             # x402 verify/settle surface, seller-side mode
│   └── web/                     # receipts, endpoint records, verify page
├── packages/
│   ├── quittance-sdk/           # installable buyer client + Lucid adapter
│   ├── protocol-types/          # zod schemas: receipt, verdict, advertised terms
│   ├── reference/               # reference implementation of the verdict function
│   ├── verifier/                # independent re-derivation, no gate access
│   └── claim-ledger/            # claims.json + verifier for it
├── contracts/                   # ReceiptAnchor only (§10)
│   ├── src/
│   ├── test/
│   └── script/
├── scripts/
│   ├── probe-x402.ts            # read live 402 bodies, fail on drift
│   ├── probe-keeperhub.ts       # read live API surface, fail on drift
│   ├── campaign.ts              # adversarial + sustained campaign (§14)
│   └── verify-mainnet.ts        # re-derive every claim from chain
├── docs/
│   ├── phase.md                 # current phase and its stop boundary
│   ├── claims.md                # generated, never hand-edited
│   ├── kill-criteria.md         # generated from §26
│   ├── adr/
│   └── runbooks/
├── evidence/                    # receipts, run ids, campaign output
├── deployments/                 # addresses and tx hashes, per network
├── internal/                    # gitignored
└── .github/workflows/ci.yml
```

### 8.2 Gate mode (the public proof path)

1. Buyer posts an intent: target resource, max price, max latency, and a pre-signed discharge
   authorization with a nonce and an expiry.
2. Gate requests the resource, receives 402, parses `accepts[]`, and refuses if the advertised terms
   exceed the intent's caps (`REQUIREMENTS_MISMATCH`, no purchase, no discharge).
3. Gate pays and retries the request from its KeeperHub-managed wallet.
4. Gate builds the receipt: advertised terms, request hash, response hash, timings, run context.
5. `verdict()` runs from the receipt alone.
6. On `DELIVERED_AS_ADVERTISED`, KeeperHub executes the discharge. Any other state records a
   non-discharge with its reason and does not execute.
7. Receipt is published and batched (§10).

### 8.3 Facilitator mode (the adoptable path)

Quittance exposes the standard x402 facilitator surface. `verify` behaves normally. `settle` runs
the delivery check first and executes through KeeperHub only on `DELIVERED_AS_ADVERTISED`. A seller
points at it by configuration and changes no code.

Adoption status is a fact, not a claim. Until a third-party seller points at it, every run in this
mode is labelled `PROJECT_BASELINE` in the receipt, in the UI, and in `claims.json`.

### 8.4 KeeperHub surfaces used

Turnkey-backed wallet for signing. Contract call action for the discharge. Webhook trigger to start
a gated run from the gate service. Schedule trigger for the sustained campaign. Executions API for
run ids and logs, which are the audit half of every receipt. Dry run before the first live discharge
of each shape. Retry and failure handling as shipped, not reimplemented.

---

## 9. Product Surfaces

| Surface | Success state | Failure state |
|---|---|---|
| Landing | Thesis in three sentences, mechanism block, live evidence table with real hashes | Evidence table empty and labelled "no runs yet", never hidden |
| `/receipts` | Newest first, verdict state, endpoint host, amount, run id, tx link | Empty state names the reason, not a spinner |
| `/receipt/:hash` | Full receipt, the advertised terms it was judged against, and the exact command to re-derive it | Non-discharge receipts render identically, with the reason code, and are never styled as errors to be dismissed |
| `/endpoints/:host` | Delivery record: calls, discharges, non-discharges by reason, window | Fewer than 20 calls renders "insufficient sample", not a percentage |
| `/verify` | Paste a receipt, get the re-derived verdict client side | Mismatch is displayed as loudly as a match |

Non-discharges are first-class content. An endpoint page that hides its failures is the product
failing.

---

## 10. Contract Requirements

One contract, or none. `ReceiptAnchor` exists only to make the receipt log tamper evident.

- One function, one event: `anchor(bytes32 root, uint64 count)` emitting `ReceiptBatch(root, count,
  epoch, sender)`.
- No token, no upgradeability, no proxy, no pause, no owner beyond a single writer address.
- Receipt leaves are `sha256` of the canonicalized receipt. The batching script and `packages/verifier`
  build the tree from the published receipts independently.
- If the anchor is not deployed by the P2 gate boundary, it is cut, and every claim that depends on
  tamper evidence drops a rung (§21).

The discharge itself needs no custom contract. It is a transfer authorization executed against the
asset the endpoint advertised.

---

## 11. Client and SDK Requirements

`@quittance/sdk`, published to npm:

- `gatedFetch(url, { maxPrice, maxLatencyMs, retain })`, a drop-in for the paid-fetch call an agent
  already makes. One line to adopt.
- A Lucid adapter so a Daydreams agent routes its paid calls through the gate without restructuring.
- Returns the response and the receipt together. The receipt is not optional and not a callback.
- `quittance verify <receipt.json>` as a CLI in `packages/verifier`, runnable with no API key, no
  account, and no network access beyond a public RPC.
- Zero dependency on our hosted service in the verifier. If verification needs us, it is not
  verification.

---

## 12. Security Model

**Assets.** Buyer funds in flight. Gate working capital. Receipt integrity. KeeperHub credentials.

**Adversaries and required properties:**

| Adversary | Attack | Required property |
|---|---|---|
| Malicious seller | Serves an empty 200, or serves once and replays the settlement | Verdict computed from advertised terms only; settlement idempotent per authorization nonce |
| Malicious buyer | Re-uses a discharge authorization, or claims a good delivery failed | Nonce and expiry enforced before execution; verdict is a pure function the buyer can re-run |
| Compromised gate operator | Forges a positive verdict for a call that never happened | Receipt commits to response hash; seller can disprove with its own log. Bounded, and disclosed |
| Compromised gate host | Exfiltrates keys | Keys never leave Turnkey. The host holds an API key that can execute, not sign arbitrary payloads |
| Faulty infrastructure | RPC lies, webhook retries, nonce contention | Every discharge idempotent by authorization nonce; duplicate settlement attempts rejected by a short-lived nonce cache |

**P4 (property, not aspiration): KeeperHub is the only path to chain.** No `viem` write client, no
raw signer, and no private key exists anywhere in `apps/` or `packages/`. CI fails the build if one
appears.

---

## 13. Testing Strategy

- `vitest`, TypeScript strict, no `as any`, no `@ts-ignore`, no empty `catch {}`.
- `fast-check` property tests: `verdict()` is pure and total over generated envelopes; identical
  receipts always produce identical verdicts; a receipt round-trips through canonicalization
  byte-identically.
- Idempotency tests: the same authorization nonce submitted twice results in exactly one discharge.
- Golden receipts: a checked-in corpus of real receipts from live endpoints, re-derived in CI.
- Playwright for `/receipt/:hash` and `/verify`.
- Mocked facilitators and fixture endpoints exist in unit tests only. They never appear on the
  public proof path, and any fixture-derived row in the UI carries a `LOCAL FIXTURE` label.

---

## 14. Adversarial Evidence Campaign

Run `scripts/campaign.ts` against a mix of live endpoints and our own labelled baseline endpoint
configured to fail in specific ways: empty body, wrong mime type, slow past the advertised timeout,
502 after payment, and a duplicate settlement attempt.

Reported output, including failures, in this shape:

```
campaign S1: 214 gated calls / 190 discharges / 24 non-discharges
  NOT_DELIVERED 11 · SHAPE_MISMATCH 6 · TIMEOUT_EXCEEDED 5 · REQUIREMENTS_MISMATCH 2
  transient infrastructure errors 7 (retried, no correctness failures)
```

Transient infrastructure errors are counted and reported separately from verdicts. They are never
folded into the delivery record of an endpoint, because an RPC hiccup is our failure, not the
seller's.

---

## 15. Observability and Run Reporting

Every receipt carries its KeeperHub run id. Every run log line that mattered to the verdict is
referenced by id, not copied. `docs/runbooks/` covers: a stuck discharge, a settlement that landed
after we recorded a failure, a seller that changed its advertised terms mid-campaign, and a gate
restart with authorizations in flight.

Completion report rule: when a unit of work is finished, cite the exact files changed and the exact
commands run with their outcome. "Tests pass" is not a report.

---

## 16. Mainnet Evidence Plan

Network: Base, mainnet, in USDC, with call prices small enough that a campaign is affordable and
large enough to be real. Testnet is a fallback with consequences (§26, K5), never a substitute
presented as mainnet.

Evidence produced, all landing in `evidence/`, in `claims.json`, and in the README table:

1. First discharge: explorer link plus KeeperHub run id.
2. First recorded non-discharge against a live endpoint: receipt hash, reason code, run log link,
   and the absence of a discharge tx as the point.
3. Sustained campaign totals with failures included (§14).
4. One induced infrastructure failure survived, with the run log showing the retry.
5. Receipt batch anchor tx, if §10 ships.

---

## 17. Protocol Facts and Configuration

No dated address, ABI, price, header name, facilitator URL, or contract id is compiled in. Payment
terms come from the counterparty's own 402 body at call time. KeeperHub's chain list and action
schemas are read from its API at startup.

`scripts/probe-x402.ts` and `scripts/probe-keeperhub.ts` run at startup and on a CI schedule. On
mismatch the service enters `PROTOCOL_CONFIG_CHANGED` and stops gating rather than guessing. A CI
check fails the build if an address literal appears in `apps/` or `packages/`.

---

## 19. Documentation Requirements

`README.md` follows the spine: name, plain-language problem, ASCII mechanism block, links line,
why this needs to exist and why the obvious fix fails, mechanism in one sentence, live evidence
table, "how could this result be misleading", verify it yourself with copy-pasteable commands that
work from a clean clone with no account, repository layout, limitations and what is deliberately not
claimed, upstream contributions.

Required limitations section, written before the demo video: the gate is a trusted observer of
response content in gate mode; the purchase leg is not KeeperHub-executed in gate mode; structural
checks are not quality checks; facilitator mode has no third-party adopter unless it does.

---

## 20. Open-Source Contribution Requirement

At least one upstream artifact, produced from real friction, not manufactured:

- A reproducible bug report or doc-gap report to KeeperHub with exact requests, responses, and run
  ids. The previous cohort's judges said explicitly that this is what teams do when they plan to
  ship.
- If `packages/quittance-sdk` produces an adapter that is generally useful, offer it upstream to the
  Lucid SDK as a PR, under a separate BUIDL if any prize is attached (§2).

---

## 21. Claim and Evidence Ledger

`packages/claim-ledger/data/claims.json` is the source of truth. `docs/claims.md` is generated from
it and never hand-edited. `pnpm claim:verify` re-reads every claim from chain and from the receipt
corpus.

**Proof ladder.** A claim may not state a rung its evidence does not reach.

| Rung | Meaning |
|---|---|
| R0 | Asserted in a document |
| R1 | Covered by a passing test on generated or fixture data |
| R2 | Executed once against a live third-party endpoint on a public network, receipt recorded |
| R3 | Executed repeatedly over a sustained window, with failures included in the published count |
| R4 | Re-derived by `packages/verifier` from a fresh clone with no access to our database |

**Seed claims:**

| id | Claim | Target rung |
|---|---|---|
| C-001 | A discharge fires only on `DELIVERED_AS_ADVERTISED` | R4 |
| C-002 | Any stranger can re-derive a published verdict from the receipt and the chain | R4 |
| C-003 | Value moved through KeeperHub, triggered by a call to a live listed endpoint | R3 |
| C-004 | Non-delivery against a live endpoint was recorded and the discharge did not execute | R2 |
| C-005 | A duplicate settlement attempt does not produce a second discharge | R3 |
| C-006 | The system survived an induced infrastructure failure and recovered | R2 |
| C-007 | Endpoint delivery records are computed from receipts, not from seller-reported metadata | R3 |

Adding a claim means adding its evidence in the same change. When execution contradicts a claim,
narrow the claim immediately and record the contradiction. A stale claim is never kept because
implementation already began.

---

## 22. Acceptance Gates

A gate passes when its command exits zero on a fresh clone. Nothing is described as done before its
gate passes.

| # | Gate | Command | Passes when |
|---|---|---|---|
| G1 | No compiled-in protocol facts | `pnpm probe:all` | Probes read live terms, and the address-literal check finds nothing in `apps/` or `packages/` |
| G2 | Verdict determinism | `pnpm test:properties` | `verdict()` is pure and total across generated envelopes; 500 golden receipts re-derive byte-identically |
| G3 | Real discharge through KeeperHub | `pnpm verify:mainnet -- C-003` | At least one discharge against a live third-party endpoint, with explorer link and KeeperHub run id, both resolving |
| G4 | Recorded non-discharge | `pnpm verify:mainnet -- C-004` | At least one live non-delivery recorded with a reason code, and no discharge tx exists for it |
| G5 | Sustained campaign | `pnpm campaign -- --min 100 --window 24h` | 100 or more gated calls across at least 24 hours, totals published including every failure |
| G6 | Recovery under infrastructure failure | `pnpm campaign -- --induce rpc-fail,nonce-contention` | The run recovers, and the run log showing it is linked from `evidence/` |
| G7 | Clean-room reproduction | fresh clone, README only | A stranger reaches a live gated call and a re-derived receipt using only the README, with no access to our database |
| G8 | Vocabulary gate | `pnpm claim:verify` | No forbidden word (§18) appears in any claim or UI string, and no claim states a rung above its evidence |
| G9 | Submission package complete | `pnpm submission:check` | Repo public, video recorded, tx link resolving, all §6 form answers drafted including the candid failure answer, contact present |
| G10 | Idempotency | `pnpm test:idempotency` | A repeated authorization nonce produces exactly one discharge, proven against a live run, not only in unit tests |

**Definition of a passed phase:** the phase's gates pass and `docs/phase.md` says so in the commit
that closes it. A phase is not marked passed on thin evidence; if the evidence is thin, the entry
says why and the phase stays open.

---

## 23. Demo Script Requirements

The video shows the working build, not slides, and shows the failure before the success.

1. A live listed endpoint returns 402. The advertised terms are read on screen from its own response.
2. A gated call succeeds. The receipt appears. The KeeperHub run and the explorer tx are both opened.
3. A second call to an endpoint that does not deliver. The verdict is `NOT_DELIVERED`, no discharge
   tx exists, and the endpoint's delivery record updates in front of the viewer.
4. The receipt is verified from a second terminal with `quittance verify`, with no login.
5. The limitations slide is read aloud, including the trusted-observer boundary and the purchase leg.

The finalist panel expects a build a judge can drive. Every step above must be runnable live, from a
cold start, without a rehearsed cache.

---

## 24. Submission Package

| Artifact | Requirement |
|---|---|
| Source code | Public repository, judged at repository level |
| Demo video | Short, working build, per §23 |
| Transaction | A link to a transaction executed through KeeperHub, plus its run id |
| Form: which project and what the integration does | Daydreams, named, with the endpoints actually called |
| Form: which KeeperHub surfaces | Only the ones actually used, per §8.4 |
| Form: testnet or mainnet | Stated exactly, per §16 |
| Form: what still breaks | Candid, specific, and matching the README limitations. This answer is written before the video |
| Contact | Email plus an X or Discord handle |

The transaction link is the artifact teams most often leave out. It is gated by G3 and G9, and it is
never the last thing built.

---

## 25. Non-Goals

- Not a quality or accuracy oracle. Structural delivery only.
- Not an escrow protocol, not an arbitration system, not a dispute court.
- Not a reputation score. A delivery record is counts and reasons, not a number out of five.
- Not a facilitator competing on price or latency.
- Not multi-chain. One network, done properly.
- Not a wallet, not a key manager, not an agent framework.
- No PR to the KeeperHub repo under this BUIDL (§2).

---

## 26. Kill Criteria and Escalation

If any condition below becomes true, stop claiming the affected capability, record it with status
`failed` or `unavailable` and a plain-language blocker, print it in the build report, and keep
building everything that still stands. Do not hide a blocked capability behind a substitute. Do not
soften the wording to keep the claim alive.

| # | Condition | Claims affected | Action |
|---|---|---|---|
| K1 | No live Daydreams-listed endpoint returns a parseable 402 on the target network | C-003, C-004, C-007, §2 live-project anchor | Escalate to any live x402 seller reachable through the index, rename the counterparty in every document, and state the substitution in the README and the form answer. Never call our own endpoint the live project |
| K2 | KeeperHub cannot execute the discharge as a contract call from the Turnkey wallet | C-003, P4 | Fall back to a KeeperHub-executed token transfer from the gate wallet, record the loss of pull-based UX in `DECISIONS.md`, and keep KeeperHub as the only path to chain. If neither executes, the submission has no main-track thesis and the build stops for an `OWNER DECISION` |
| K3 | `packages/verifier` cannot re-derive a verdict without gate-held data | C-002, all R4 targets | Drop every affected claim to R2, delete "independently checkable" from all copy, and publish exactly which input is missing |
| K4 | Responses in the target class are not structurally checkable in any meaningful way | C-001, C-007 | Narrow the check to status, non-emptiness, and the advertised latency budget. Never widen the claim to quality |
| K5 | Mainnet USDC funding unavailable before the campaign window | C-003, C-005, C-007, §16 | Run on the testnet, state "testnet" in the form and the README, and mark every testnet row as such. Testnet runs are never presented as mainnet evidence |
| K6 | No third-party seller points at facilitator mode | Facilitator-mode adoption claims | Label every run `PROJECT_BASELINE`, state "no third-party adopter" in the README, and count nothing as demand |
| K7 | A duplicate settlement produces two discharges for one authorization | C-005, G10 | Stop the campaign immediately, publish the incident with the tx pair, ship the nonce cache, and restart the count from zero. Prior campaign totals are not reused |
| K8 | G3 has not passed with 72 hours left before the deadline | scope | Cut facilitator mode, cut `ReceiptAnchor`, cut the endpoint pages to a single table. Protect G3, G4, G7, and G9 in that order. Record the cut in `DECISIONS.md` with what it costs |
| K9 | A live seller disputes a published verdict with its own logs and is right | C-001, C-002 | Publish the dispute and the corrected receipt on the endpoint page, keep the incorrect receipt visible with a supersession note, and record the root cause |

---

## 27. Phases and Stop Boundaries

Phases are gate-bounded, not calendar-bounded. Do not implement a later phase's breadth before the
current phase's gate passes. Building on an unproven seam is the failure mode this repository is
organised to prevent.

| Phase | Contents | Stop boundary |
|---|---|---|
| P1 | `protocol-types`, `reference`, `verifier`, probes, receipt format | G1 and G2 pass. Nothing is called live before the verdict function is pure and the probes are honest |
| P2 | Gate service, KeeperHub discharge, first live call | G3 and G4 pass. No UI beyond a receipt dump |
| P3 | Campaign, idempotency, recovery, endpoint records | G5, G6 and G10 pass |
| P4 | Web surfaces, SDK publication, facilitator mode, upstream report | G7, G8 and G9 pass |

`docs/phase.md` names the current phase and its boundary, is read at the start of every session, and
is updated in the commit that closes a gate.

---

## 28. Definition of Done

- [ ] Every gate in §22 passes on a fresh clone
- [ ] Every claim in §21 states a rung its evidence reaches, and `pnpm claim:verify` exits zero
- [ ] A real discharge and a real non-discharge, both against live third-party endpoints, both linked
- [ ] Campaign totals published with failures included and infrastructure errors counted separately
- [ ] README limitations section written, specific, and matching the form answer about what breaks
- [ ] Demo video shows the failure path before the success path
- [ ] `DECISIONS.md` and `BUILD_LOG.md` current, with every cut recorded and costed
- [ ] Upstream report filed with reproducible detail
- [ ] No forbidden vocabulary, no green pass badge, no address literal in source
- [ ] Submission filed before the deadline, with repo, video, and transaction link all resolving
