# Build Log

Running log of what was done, what it cost, and what it proved. Newest entry last.

Rules: **cite the exact files changed and the exact commands run with their outcome. "Tests pass" is
not a report** (PRD §15). A claim and its evidence land in the same commit or neither lands.

---

## 2026-09-09 · Repository scaffold · phase P1 opened

### What was done

Scaffolded the repository root per PRD §8.1. **No application code was written.** No package
implements anything yet; the directories exist and are empty.

### Files created

**Root governance**

| File | Source |
|---|---|
| `AGENTS.md` | PRD §0, §5, §12 P4, §15, §17, §18, §27 |
| `WHAT_IS_MEASURED.md` | PRD §5.2, §5.3, §6, §8.3, §14 — written against the project |
| `DECISIONS.md` | D-001, D-002, D-003 |
| `SECURITY.md` | PRD §6, §12 |
| `ARCHITECTURE.md` | PRD §5, §8, §10, §11 |
| `SETUP.md` | PRD §22 command table, §11 |
| `DESIGN.md` | PRD §18 tokens + `frontend.md` structure, reconciled per D-003 |
| `BUILD_LOG.md` | this file |
| `.env.example` | names only, no values |
| `.gitignore` | `internal/` and `.env` excluded — required by hard block HB-7 |
| `skills-lock.json` | 43 upstream files pinned by repo, path, commit and SHA-256 |

**Docs and ledger**

| File | Source |
|---|---|
| `docs/phase.md` | PRD §27 — set to **P1**, stop boundary G1 + G2 |
| `docs/kill-criteria.md` | generated from PRD §26, K1–K9, all `not triggered` |
| `packages/claim-ledger/data/claims.json` | PRD §21 — C-001…C-007, **every claim at R0** |

**CI**

| File | Jobs |
|---|---|
| `.github/workflows/ci.yml` | `build`, `typecheck`, `test`, `evidence` (runs `claim:verify`), plus hard-block, P4 and protocol-literal enforcement |

**Pinned documentation** — 43 files vendored under `.agents/skills/`:

| Skill | Source | Commit | Files |
|---|---|---|---|
| `keeperhub` | `KeeperHub/keeperhub` @ `staging` | `801dfd57` | 16 |
| `x402` | `coinbase/x402` @ `main` | `dd927a26` | 12 |
| `lucid-sdk` | `daydreamsai/lucid-agents` @ `master` | `3d9fa1d2` | 15 |

Each skill has a `SKILL.md` and a `references/` directory. Every reference file is pinned in
`skills-lock.json` by source repository, path, commit SHA and SHA-256 of the retrieved bytes.

### Commands run

| Command | Outcome |
|---|---|
| `curl` against the GitHub API for repo metadata, HEAD commits, and recursive trees | 200 for all three repositories; identities confirmed before pinning |
| `curl` + `sha256sum` over 43 raw files at pinned commits | **43 downloaded, 0 failed.** Hashes computed from retrieved bytes, not asserted |
| `node -e` JSON parse of `claims.json` | valid; 7 claims, all `R0` |
| `node -e` SHA-256 re-verification of all 43 pinned files against `skills-lock.json` | see verification entry below |

No gate was attempted. `pnpm install` was not run — there is no `package.json` to install, because
P1's packages are not written.

### What this proved

**Nothing about the product.** This scaffold is documentation and pinned upstream sources. Every
claim in `claims.json` sits at **R0 — asserted in a document.** No live call has been made, no
discharge executed, no receipt produced.

### What it found

Reading the pinned x402 specification produced three findings that contradict PRD §5.2 and narrow the
product's honest claim surface. They are recorded as **D-002** and reflected in
`WHAT_IS_MEASURED.md`:

1. x402 advertises **no response-latency SLA**. `maxTimeoutSeconds` is upstream-defined as
   *"Maximum time allowed for payment completion"*. `TIMEOUT_EXCEEDED` must therefore derive from the
   **buyer's** intent, not the seller's terms.
2. `mimeType` is **optional** and moved from `accepts[]` (v1) to `resource` (v2).
3. `outputSchema` **does not exist in x402 v2**; discovery moved to the `extensions.bazaar` extension.

Consequence: against a specification-compliant seller publishing neither a `mimeType` nor a schema,
the verdict collapses to *status code plus non-empty body*, plus a buyer-chosen latency bound.

A fourth finding concerns `frontend.md`, recorded as **D-003**: its hero specifies four hardcoded
metrics (`12,482.50 USDC`, `94.2%`, `184ms`, `48 Live Hosts`), a green status LED, a five-accent
palette, and a footer line containing a forbidden stem. All conflict with PRD §18, §17 and §9. The
component hierarchy was adopted; the token layer and copy were rewritten in `DESIGN.md`.

### What was not done, and why

- **No application code.** Explicitly out of scope for this unit of work.
- **`apps/web` not implemented.** It is a **P4** deliverable and `docs/phase.md` is at **P1**. PRD §27
  forbids implementing a later phase's breadth before the current phase's gate passes. The design
  system is written down in `DESIGN.md` so that P4 is execution rather than redesign.
- **No `package.json`, no workspace manifest, no dependency install.** P1's first code lands with
  `packages/protocol-types`; the manifest lands with it.
- **No gate attempted.** G1 and G2 require code that does not exist. Nothing is described as done
  before its gate passes.

### Next unit of work

P1, in order: `packages/protocol-types` (v1 and v2 as discriminated schemas, per D-002) →
`packages/reference` (the pure verdict function) → `packages/verifier` → the two probes. G1 and G2
close P1.

---

## 2026-09-09 · P1 packages, and `apps/web` as the D-004 phase exception

### What was done

Implemented P1's three packages, then built the full web surface from `frontend.md`'s architecture
reconciled against PRD §18 per D-003. The web app is a **P4** deliverable built during **P1** on an
owner instruction; that exception is recorded in full as **D-004**, with its costs.

P1's packages were completed **first**, so the web app is not built on an unproven seam.

### Files created

**`packages/protocol-types`** — `package.json`, `tsconfig.json`, and `src/`:
`verdict-state.ts` (the seven states, `assertNever` for HB-6), `x402.ts` (v1 and v2 as discriminated
zod schemas, per D-002), `receipt.ts` (advertised terms, buyer intent, observed response,
`checksAvailable`, the receipt), `canonical.ts` (sorted-key canonical JSON), `hash.ts` (sha256 over
Web Crypto, so gate, CLI and browser hash identically), `index.ts`.

**`packages/reference`** — `src/verdict.ts` (the pure, total decision procedure), `src/re-derive.ts`
(re-derivation and the response-hash commitment check), `src/index.ts`; tests in
`test/arbitraries.ts`, `test/verdict.properties.test.ts`, `test/canonical.properties.test.ts`,
`test/re-derive.test.ts`.

**`packages/verifier`** — `src/index.ts`, `src/cli.ts` (`quittance verify`, exit 0/1/2).

**Workspace** — `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`,
`scripts/claim-verify.mjs`, `scripts/skills-verify.mjs`, `packages/claim-ledger/package.json`.

**`apps/web`** — `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`;
`app/globals.css` (§18 tokens in one `@theme` block, `prefers-reduced-motion` guard first, the one
signature motif); `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx`, `app/receipts/page.tsx`,
`app/receipts/[hash]/page.tsx`, `app/endpoints/page.tsx`, `app/endpoints/[host]/page.tsx`,
`app/verify/page.tsx`; `components/layout/{Navbar,Footer,CommandPalette}.tsx`;
`components/dashboard/{VerdictBadge,MechanismStepper,SummaryStats,EvidenceTable}.tsx`;
`components/receipt/{ReceiptViewer,DiffTermsView,CliReDerive}.tsx`;
`components/ui/{Card,Button,Tabs,Drawer}.tsx`; `lib/{types,verifier,receipts}.ts`.

**Modified** — `packages/claim-ledger/data/claims.json` (C-001 → R1 with evidence; C-002 evidence
recorded, rung held), `docs/phase.md`, `SETUP.md`, `DECISIONS.md` (D-004),
`.github/workflows/ci.yml` (G8 consolidated onto `claim:verify`, which is comment-aware).

### Commands run

| Command | Outcome |
|---|---|
| `pnpm install` | exit 0 |
| `pnpm --filter @quittance/protocol-types build` | exit 0 after adding `lib: ["ES2022","DOM"]` for `TextEncoder`/`SubtleCrypto` |
| `pnpm --filter @quittance/reference build` | exit 0 |
| `pnpm --filter @quittance/verifier build` | exit 0 after adding `@types/node` |
| `pnpm --filter @quittance/web build` | **failed** on `@tailwindcss/postcss@4.0.0`: *"Missing field `negated` on ScannerOptions.sources"*. Pinned Tailwind 4.3.3; **exit 0**, 7 routes |
| `pnpm typecheck` | exit 0 across all 5 projects |
| `pnpm test` | exit 0, **26 tests passed** |
| `pnpm claim:verify` | exit 0, 7 claims, R1=1 R0=6 |
| `pnpm skills:verify` | exit 0, 43 pinned files, 0 drifted |
| `npx next start -p 3311` + fetches of all 7 routes | all HTTP 200 |
| CLI on an honest receipt, a forged verdict, and a tampered body | exit 0, 1, 1 — correct in all three |
| Every AGENTS.md hard block + P4 + §17 + §18 grep | clean |

Port 3000 was already occupied by an unrelated application; the server was started on 3311 and that
process was left alone.

### What this proved

**The verdict function is pure and total.** 2000 generated envelopes per property: enumerated output,
never throws, deterministic across repeated and canonicalized inputs, does not mutate its inputs,
independent of evaluation order. Canonicalization round-trips byte-identically and is insensitive to
key order.

**The verifier catches forgery.** Against a receipt publishing `DELIVERED_AS_ADVERTISED` over a 502
with a discharge tx attached, the CLI exits 1 and reports both the verdict mismatch and *"a discharge
transaction is recorded against NOT_DELIVERED, which is not discharge-eligible"*. Against a tampered
body it reports the hash and length mismatch. It needs no key, no account and no network.

**`/verify` re-derives in the browser.** `DELIVERED_AS_ADVERTISED`, `REQUIREMENTS_MISMATCH`,
`TIMEOUT_EXCEEDED` and `SETTLEMENT_FAILED` are present in the shipped client chunk — the page runs
the same `verdict()` the gate will run, not a copy.

**The surfaces are honest when empty and honest when populated.** With no receipts every surface
renders "no runs yet" and names the reason. Seeded temporarily with two `LOCAL_FIXTURE` receipts, the
ledger showed both rows at equal weight with the non-discharge first, third-party count **0** (the
fixtures are not third party), `INSUFFICIENT SAMPLE` instead of a percentage, `LOCAL FIXTURE` chips,
"no discharge tx" stated as the point, and all seven reason codes listed including the zeroes. **The
fixtures were then deleted**; `evidence/` holds no receipts.

### What it did not prove

- **G1 does not pass.** The probes are not written; `pnpm probe:all` does not exist. **P1 is open.**
- **G2 passes only in part.** Its property half exits zero. Its 500-golden-receipt half is not met:
  no golden corpus exists because no receipt has been produced.
- **No live call, no discharge, no KeeperHub execution.** C-003 through C-007 remain at R0.
- **No Playwright coverage** of `/receipt/:hash` or `/verify` (§13), and G7 has not been attempted.
- **The receipt schema has never met a real 402.** If the probes show a live `accepts[]` shape the
  schema does not model, the schema changes and every reader of it changes too. That risk is D-004's
  Cost 4 and it is the real price of building the UI before the probes ran.

### Next unit of work

`scripts/probe-x402.ts` and `scripts/probe-keeperhub.ts`, then `pnpm probe:all`. That closes G1 and,
with a golden corpus, G2 — and closes P1.

---

## 2026-09-09 · Probes built and run against live infrastructure · **G1 PASSED**

### What was done

Built `scripts/probe-x402.ts`, `scripts/probe-keeperhub.ts` and `scripts/probe-all.ts`, then ran them
against real infrastructure. **G1 passed.** P1 remains open on G2.

Running them produced findings that changed both the product's honest claims and this codebase.

### Files created

`scripts/probe-x402.ts`, `scripts/probe-keeperhub.ts`, `scripts/probe-all.ts`,
`packages/protocol-types/src/terms.ts`, `packages/protocol-types/src/probe.ts`,
`packages/reference/test/terms.test.ts`, `evidence/probes/2026-09-09-g1-probe-run.md`.

**Modified** — `packages/protocol-types/src/x402.ts` (per-offer parsing), `src/index.ts`,
`DECISIONS.md` (D-005, D-006), `WHAT_IS_MEASURED.md`, `docs/kill-criteria.md`, `docs/phase.md`,
`packages/claim-ledger/data/claims.json`, `package.json`, `.github/workflows/ci.yml`.

### Commands run

| Command | Outcome |
|---|---|
| `pnpm probe:all` (unconfigured) | **exit 1** — fails closed. No default target exists and none will |
| `GET https://app.keeperhub.com/api/chains` | HTTP 200, **24 chains** read live |
| `pnpm probe:all` (46 live hosts + KeeperHub) | **exit 0 — G1: PASSED** |
| `pnpm test` | exit 0, **41 passed** (26 → 41) |
| `pnpm typecheck` / `claim:verify` / `skills:verify` | exit 0 |
| All hard blocks, P4, §17, §18 greps | clean |

### What the live run measured

Across 38 sellers that returned a parseable 402, one per distinct host:

- **38/38 speak x402 v2, terms in the `PAYMENT-REQUIRED` header.** Zero v1 sellers in the wild.
- **38/38 publish a `mimeType`.** Content type is a real check.
- **0/38 publish a response schema.** It is not a check we perform against anyone.
- **`maxTimeoutSeconds` 60–3600, 33/38 at exactly 300.** Nobody promises a one-hour response.
- 8 of 46 index entries no longer return 402 at all (404/405) — stale listings.

**K1 and K4 were evaluated against live data and neither is triggered.** K1 in particular: live x402
sellers on Base mainnet do return parseable 402s. The open question is whether they are
*Daydreams-listed* specifically, which matters for the §2 anchor and is recorded as a caveat.

### What the run found that was wrong

**One upstream bug.** `api.hyperextend.xyz` publishes `accepts[1].amount: "0.111"` — a decimal where
x402 v2 requires atomic units. Its Base offer is valid. This is the §20 upstream-report candidate.

**Two flaws in our own code, both found by real data and both fixed:**

1. `accepts[]` was validated as a whole, so **one malformed offer on a network we never target
   rejected the entire seller.** Offers are now parsed individually: failures are reported verbatim
   and excluded, and gating proceeds only on an offer that parsed. That seller is now readable.
2. `probe:all` printed **`service state: PROTOCOL_CONFIG_CHANGED` and `G1: PASSED` in the same
   output.** A gate cannot pass while the service refuses to gate. Fixed. `deriveServiceState` was
   also too aggressive — one malformed seller is not the protocol moving — and now requires a
   majority of responding sellers to drift, with that threshold written down in the function.

### What it changed about the claims

D-005 reasoned from the spec that the v2 check "collapses to status plus non-empty body". The
measurement **partly reverses that**: content type is universally advertised, so the check is three
structural dimensions plus the buyer's deadline. D-006 records the reversal rather than quietly
correcting D-005, which stands as written.

`WHAT_IS_MEASURED.md` now carries measured numbers instead of reasoning, including two new
misleading-items: that the content-type check may be decorative if sellers advertise
`application/json` reflexively, and that **nothing here reports on what an endpoint does after
payment** — which is the only thing the product ultimately claims to measure.

### What is still not done

- **G2 is not met.** Its property half exits zero (41 tests). Its **500-golden-receipt half needs
  receipts from live calls, which is P2 work.** P1 therefore stays open, and `docs/phase.md` says so.
- **No payment has been made.** Every number above comes from reading 402s. C-003 through C-007
  remain at R0.
- **The v1 code path has never met a real payload** — zero v1 sellers exist in the sample. It is
  covered by generated tests only. Recorded as D-006, Cost 1.
- The CI `probe` job needs `PROBE_X402_TARGETS` and `KEEPERHUB_API_BASE_URL` set as repository
  variables; without them it fails closed, which is correct.

### Next unit of work

P2: the gate service and the first live call, which is also what produces the golden corpus G2 needs.
The §20 upstream report on the non-integral `amount` can be filed now — it needs no further work.

---

## 2026-09-09 · P2 feasibility investigated · **blocked on an OWNER DECISION**

### What was done

Before writing the gate service, established whether P2's architecture is executable at all. It is
not, in its current form, and the blocker is recorded rather than worked around.

### What was found

**The discharge leg works.** It is a *transaction*: KeeperHub broadcasts
`transferWithAuthorization(...)` using the buyer's own pre-signed authorization via
`POST /api/execute/contract-call`. We sign nothing. P4 holds. K2's condition is false.

**The purchase leg does not.** x402's `exact` scheme requires the *payer* to produce a 65-byte
**EIP-712 signature** — a message signature, not a transaction. KeeperHub does expose EIP-712/x402
signing through the agentic wallet's `/sign` route, with Turnkey custody and no key on disk, but it
pins the recipient:

> "A signing request must carry a `workflowSlug`; the route derives the expected recipient from that
> workflow's organisation wallet and rejects a mismatch with `403 PAYTO_MISMATCH`."

`/sign` exists to pay **KeeperHub's own paid workflows**. It will not sign a payment to a third-party
x402 seller. P4 forbids a local signer. So in gate mode, against a third-party seller, the purchase
leg has **no execution path that satisfies P4**.

**PRD §26 has no criterion for this.** K2 covers the discharge leg only. §5.3 treats the purchase leg
as the seller's facilitator's concern — true for broadcasting, false for signing, and the gate is the
payer. Recorded as a **GAP** in `docs/kill-criteria.md`, not as a criterion that fired.

Four costed options are in **D-007**: request a differently-provisioned sub-organisation (needs a
permission we do not hold), make KeeperHub workflows the live counterparty (changes the §2 answer),
invert the legs so the buyer pays the seller directly (narrows the thesis), or sign outside KeeperHub
(**ends P4**). **No option was adopted. This is an OWNER DECISION.**

### A note on the caps, which are *not* the problem

The same source gives hard limits: 100 USDC per transfer, 200 USDC per UTC day, Base USDC only, Base
chain only. Observed live prices are 1000–20000 atomic units — **0.001 to 0.02 USDC** per call. A
200-call campaign costs roughly 4 USDC. The caps do not bind. Only the recipient pin does.

### Files created

`README.md` (§19, was missing entirely — G7 depends on it),
`docs/upstream/2026-09-09-x402-non-integral-amount.md` (§20 draft, **not filed**).

**Modified** — `DECISIONS.md` (D-007), `docs/kill-criteria.md` (K2 evaluated, GAP recorded),
`skills-lock.json` and `.agents/skills/keeperhub/references/` (3 more upstream docs pinned: 43 → 46).

### Commands run

| Command | Outcome |
|---|---|
| `curl` for `docs/agent/agentic-wallet.md`, `agent/index.md`, `getting-started/api.md` @ pinned commit | 3 fetched, hashed, pinned |
| `pnpm skills:verify` | exit 0, **46 pinned files, 0 drifted** |
| Grep of every documented KeeperHub API path | 38 paths; **no message- or typed-data-signing endpoint** in the API surface |
| Vocabulary check over `README.md` | clean |

### Why the gate service was not written

Writing `apps/gate` now would mean writing a purchase-leg code path that cannot legally execute under
P4, and choosing one of D-007's four options by implication rather than by decision. Two of those
options change the submission's live counterparty or its thesis; one ends a property quoted in three
documents. That is not a call to make silently inside a commit.

`apps/gate/` stays empty until the owner picks.

### Blocked, and what unblocks it

| Blocked | Needs |
|---|---|
| Purchase leg to a third-party seller | **OWNER DECISION** on D-007's options A–D |
| First live discharge (G3), first live non-discharge (G4) | The above, plus **mainnet USDC funding** and a **KeeperHub API key** |
| G2's 500-golden-receipt corpus | Receipts from live calls, i.e. the above |
| Filing the §20 upstream report | Owner action — it is outward-facing |

### Next unit of work

Owner picks a D-007 option. Everything downstream — the gate service, G3, G4, the campaign, and G2's
corpus — waits on it. Nothing else in P1 is outstanding except G2's corpus, which has the same
dependency.

---

## 2026-09-15 · K8 fired · Playwright coverage closed (D-004 Cost 5)

### K8

**Kill criterion K8 triggered at 2026-09-15 10:00 UTC**, 72 hours before the deadline. G3 has not
passed: `evidence/receipts/` empty, no discharge executed, C-003 at R0 with no evidence.

Cuts executed per K8 and recorded as **D-008**: facilitator mode and `ReceiptAnchor` are cut (neither
was built, so the cut is a commitment not to build them). The endpoint-pages cut is moot — those
pages are already built and working, and deleting finished work protects nothing — so no further
effort goes into them and they stay. That reasoning is written down rather than silently applied.

**K8 does not save the submission.** It assumes G3 becomes reachable once effort concentrates on it.
G3 is blocked on **D-007**, an OWNER DECISION raised 2026-09-09 and unmade six days later. No
decision → no gated call → no discharge → no transaction link → no main-track thesis.

`docs/phase.md` and `docs/kill-criteria.md` updated. K8 status: **TRIGGERED**.

### Playwright — §13, and D-004 Cost 5 is now closed

D-004 recorded as a cost: *"No web surface is covered by a Playwright test (§13)."* That gap is closed.
**18 tests, all passing, 1.6 minutes.**

| File | Covers |
|---|---|
| `e2e/verify.spec.ts` | §9 `/verify`: honest receipt re-derives; forged verdict reported as mismatch; a 502 re-derives to `NOT_DELIVERED` despite the receipt claiming otherwise; body-hash mismatch reported; non-receipt input rejected with reasons; **§11 the page still works with every network request aborted after load** |
| `e2e/receipt.spec.ts` | §9 `/receipts/:hash`: terms, execution, and the exact re-derive command; a non-discharge shows its reason and the ABSENCE of a tx; **§18 the non-discharge badge carries byte-identical classes to the discharge badge**; the canonical JSON shown hashes to the leaf in the URL; a missing receipt is a real 404 |
| `e2e/surfaces.spec.ts` | §18 **no green in any computed style across all four routes**; all seven states spelled out in full; §9 `INSUFFICIENT SAMPLE` with no percentage under 20 calls; an uncalled endpoint says so without implying anything; ledger lists a non-discharge first; an empty filter names its reason; the landing page states which leg KeeperHub executes |

Two of these assert things a unit test cannot reach: that colour carries no verdict signal (computed
styles scanned for green-dominant values), and that a discharge and a non-discharge render with
identical styling.

### Files created

`apps/web/playwright.config.ts`, `apps/web/e2e/{fixtures,global-setup,global-teardown,seeded}.ts`,
`apps/web/e2e/{verify,receipt,surfaces}.spec.ts`.

**Modified** — `DECISIONS.md` (D-008), `docs/kill-criteria.md`, `docs/phase.md`,
`.github/workflows/ci.yml` (e2e job, traces uploaded on failure), `apps/web/package.json`.

### Commands run, including what failed

| Command | Outcome |
|---|---|
| `npx playwright test` (first attempt) | **18 failed** — `Executable doesn't exist at .../chromium_headless_shell-1148`. `@playwright/test` 1.49.1 wants build 1148; the cached browser is 1234 |
| Registry check across 1.50–1.63 for the version shipping chromium 1234 | **1.62.0**. Pinned it, so no browser download was needed |
| `npx playwright test` (second attempt) | **Failed** — stale `.next` cache pointed at the old pnpm store path after the version change. Cleared `.next` |
| `npx playwright test` (third, dev server) | **13 failed / 5 passed in 14.9 min** — 30s timeouts during cold route compilation, not real defects |
| Switched `webServer` to `next build && next start`, timeout 60s | — |
| `npx playwright test` (final) | **18 passed, exit 0, 1.6 min** |
| Teardown check: `ls evidence/receipts/` | empty; `probes/` evidence untouched |
| `pnpm typecheck` / `test` / `claim:verify` / `skills:verify` | all exit 0 |

The fixture seeder writes only receipts labelled `LOCAL_FIXTURE`, and teardown deletes only a
directory carrying its own marker file — a test run must never destroy real evidence.

### What this does not do

It does not advance any claim. No rung moved. Playwright covers the surfaces, not the mechanism, and
the mechanism still has never executed. Under K8's protection order this work supports **G7** only,
and G7's live half remains blocked on D-007 like everything else.

### Next

Unchanged, and now urgent: **a D-007 decision.** Option C is the only one reachable inside three days.

---

## 2026-09-15 · Submission scaffolding · the four things that move without an owner decision

### What was done

With G3/G4/G5/G6/G10 blocked on D-007 and K8 already fired, the only remaining work that advances
anything is G9's. Four items, all delivered.

### 1. `docs/claims.md` is now generated (§21)

§21 says the file "is generated from it and never hand-edited". It did not exist and there was no
generator. `scripts/claims-generate.mjs` renders it from `claims.json`, and `--check` mode fails when
the file is stale or was hand-edited. **CI now runs `--check`**, so a claim that no longer traces to
the ledger fails the build.

### 2. `pnpm submission:check` exists (§22 G9)

Seven rows: public repository, demo video, transaction + run id, form answers, contact, claims
honest, upstream report filed. It **never reports a pass on a row it could not check** — an
unverifiable row is a failure, because the point of G9 is to catch the artifact a team forgot rather
than to reassure it.

Current state: **2 of 7**. Passing: form answers drafted, claims honest.

### 3. `docs/submission.md` — §24 form answers, failure answer first

§24 requires the "what still breaks" answer to be written **before** the video, so the video cannot
become more confident than the build. It is written, in seven numbered points, and it leads with the
reason there is no transaction: D-007.

Two answers are deliberately uncomfortable and stay that way:

- **KeeperHub surfaces** — only the chain list is listed as *used*. Every other surface sits in a
  separate "designed and not yet executed" table. Nothing moves to "used" until it has executed once.
- **Testnet or mainnet** — the answer is **neither**. No transaction has been broadcast on any
  network, so there is no testnet claim to make either.

### 4. Git repository initialised

**`git init` had never been run.** §24's first row is "Source code — public repository, judged at
repository level". Everything else could have landed perfectly and the submission would still have
failed on this.

One commit, 158 files, citing the PRD sections per §0.1.

Pre-commit audit: **0** files from `node_modules/`, `internal/`, `.env`, `.next/`, `dist/`. A secret
scan for private-key-shaped literals, `kh_`/`wfb_`/`sk-` prefixed keys and PEM blocks found nothing
in our source. The only address literals anywhere are inside vendored upstream documentation — that
is third-party text, not our source, and the §17 check scans `apps/` and `packages/`.

`apps/web/test-results/` was caught staged and added to `.gitignore`; CI uploads traces as artifacts
instead.

**Not pushed.** There is no remote, and pushing is outward-facing.

### Files created

`scripts/claims-generate.mjs`, `scripts/submission-check.mjs`, `docs/claims.md` (generated),
`docs/submission.md`.

**Modified** — `package.json` (`claims:generate`, `submission:check`), `.gitignore`,
`.github/workflows/ci.yml` (claims.md sync check; G9 report, `continue-on-error` until the submission
is complete).

### Commands run

| Command | Outcome |
|---|---|
| `pnpm claims:generate` | wrote `docs/claims.md`, 7 claims |
| `node scripts/claims-generate.mjs --check` | exit 0, in sync |
| `pnpm submission:check` | **exit 1, 2 of 7 rows** — correct, and correct to fail |
| Secret scan over 158 staged files | clean |
| `git init` + commit | 1 commit, working tree clean |

One bug found and fixed in my own checker: the form-answer matcher missed a heading because of a
comma. Fixed by normalising punctuation in the matcher rather than contorting the document to satisfy
it.

### What this did not do

No rung moved. No gate closed. G9 went from 1 row to 2 of 7, and the three rows that matter most —
transaction, video, public remote — are still open. Two of those three are owner actions; the third
is D-007.

### Still needed, and from whom

| Row | Who |
|---|---|
| D-007 decision → transaction link | **OWNER** |
| Mainnet USDC + KeeperHub API key | **OWNER** |
| Public remote, then push | **OWNER** |
| Demo video per §23, failure path first | **OWNER** |
| Contact: email + X/Discord handle | **OWNER** |
| File the upstream report, remove its DRAFT marker | **OWNER** |
| §2 eligibility confirmation | **OWNER DECISION** |

### Addendum, same day — two probe bugs found by re-running it

`pnpm probe:all` against the same 46 targets that passed on 2026-09-09 **failed**: 11 READ, 36 FAIL,
33 of them `UNREACHABLE`, and KeeperHub `UNREACHABLE` too. A single-target run seconds earlier had
succeeded.

Not ecosystem drift. **The probe was manufacturing its own failures.**

**Bug 1 — unbounded concurrency.** `probeX402` was `Promise.all(targets.map(probeOne))`, opening 46
simultaneous connections. On a constrained host that exhausts sockets and reports targets unreachable
that answer fine alone. Bounded to 6 workers. Result: **38 READ, 9 FAIL, G1 PASSED, exit 0.**

**Bug 2 — an outage reported as a protocol change.** `deriveServiceState` mapped *any* KeeperHub
failure onto `PROTOCOL_CONFIG_CHANGED`. Its own doc comment states the opposite asymmetry — "a target
that is UNREACHABLE is an outage. The protocol has not changed" — and that rule was applied to x402
targets but not to KeeperHub. In production this would have stopped the gate for a network blip and
reported it as the specification having moved. Only `PAYLOAD_DRIFT` now forces
`PROTOCOL_CONFIG_CHANGED`; an unreachable KeeperHub yields `NOT_PROBED`, which still refuses to gate
but does not lie about why.

Both bugs were in the failure-handling path, which is the path no green test run exercises. They were
caught by running the thing again rather than trusting the last green result — the same way D-006's
two bugs were found.

`packages/reference/test/service-state.test.ts` pins the rule: 11 cases covering minority vs majority
drift, unreachable sellers, stale index entries, and each KeeperHub failure mode. **Tests: 41 → 51.**
