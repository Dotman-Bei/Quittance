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

---

## 2026-09-15 · D-007 resolved (Option C) · the gate is built and runs end to end

### The decision

**Owner chose Option C**, recorded as **D-009**. The legs are inverted: the buyer pays the seller
directly with its own wallet; the gate relays, observes, and has KeeperHub execute a **conditional
fee** only on `DELIVERED_AS_ADVERTISED`.

P4 holds, and not on a technicality: the buyer's wallet is the buyer's, and no signer, write client
or key enters `apps/` or `packages/`. KeeperHub remains the only path to chain for every transaction
this codebase causes.

### What was built

**`apps/gate`** — Hono service, two phases:

- `POST /quote` — reads the seller's own 402, parses it against the pinned schemas, derives the
  advertised terms, and refuses **before any purchase** if the price exceeds the buyer's cap
  (`REQUIREMENTS_MISMATCH`, `purchased: false`).
- `POST /call` — relays the **buyer's** signed x402 payment, observes the response, hashes request,
  response and raw terms, runs `verdict()`, publishes the receipt named by its own leaf, and on
  `DELIVERED_AS_ADVERTISED` asks KeeperHub to execute the fee.
- `GET /health` — states which leg KeeperHub executes, and says plainly when KeeperHub is not
  configured rather than implying readiness.

**`src/keeperhub.ts`** is the only file in the codebase that causes a transaction. It holds no key
and constructs no signature.

### Two things found in the pinned KeeperHub docs that matter

- **`"simulate": true`** gives a dry run before broadcast — §8.4's "dry run before the first live
  discharge of each shape", available as shipped.
- **`Idempotency-Key`** gives native replay protection: "a retry with the same key and the same
  request body returns the original response… without executing again". Keyed by the authorization
  nonce, this is §12's idempotency requirement and C-005/G10 **satisfied by KeeperHub rather than
  reimplemented** (§8.4). We do not build a competing nonce cache.

### Verified end to end against a live third-party seller

| Step | Result |
|---|---|
| `POST /quote` against `api.onesource.io` | quote issued; x402 v2, amount 1000 atomic, `eip155:8453`, `mimeTypeAdvertised: true`, real `rawTermsHash` |
| `POST /quote` with a cap below the price | `REQUIREMENTS_MISMATCH`, `purchased: false` — refused before any money moved |
| `POST /call` with a deliberately invalid payment | seller returned 400 → verdict **`NOT_DELIVERED`**, `dischargeTxHash: null`, receipt published |
| `quittance verify` on that receipt, no gate access | **`RE-DERIVES`**, exit 0 |
| Fresh canonical hash vs the filename | **match** |

The whole mechanism is proven against a live endpoint — read terms, relay, observe, hash, judge,
publish, and an independent re-derivation agrees. **Only the money has not moved.**

That run is a pipeline test, **not C-004 evidence**: the non-delivery was caused by our own invalid
payment, not by the seller failing. It is labelled `LOCAL_FIXTURE` and is not in the corpus.

### Documents corrected

Six files asserted underwriting, which D-009 removed. All corrected, and the correction is a
*narrowing*: `AGENTS.md`, `SECURITY.md`, `ARCHITECTURE.md`, `WHAT_IS_MEASURED.md`, `README.md`,
`apps/web/components/dashboard/{MechanismStepper,HowItWorks}.tsx`.

The new copy states, in those words, that **Quittance does not protect the buyer from a failed call**
and that the only thing that changes on failure is that we are not paid.

**One new disclosure added against ourselves** (D-009 Cost 5): the gate earns a fee on
`DELIVERED_AS_ADVERTISED` and nothing otherwise, so **it is paid to say delivery succeeded**. Under
the abandoned underwriting design a false `NOT_DELIVERED` cost the gate a purchase price; now it costs
only a fee, and a false `DELIVERED_AS_ADVERTISED` earns one. The sole check on that is the receipt's
commitment to `sha256(response)`. It is now in `WHAT_IS_MEASURED.md`, `SECURITY.md`, `README.md` and
on the landing page.

### Commands run

| Command | Outcome |
|---|---|
| `pnpm --filter @quittance/gate build` | exit 0 |
| Gate started, `/health`, `/quote` ×2, `/call` against a live seller | all as described above |
| `node packages/verifier/dist/cli.js verify <gate receipt>` | **exit 0, RE-DERIVES** |
| `pnpm --filter @quittance/web typecheck` | exit 0 |
| `npx playwright test e2e/surfaces.spec.ts` after the copy rewrite | **7 passed** |

### What still blocks G3

A **funded buyer wallet that can sign EIP-712**, and a **KeeperHub API key**. Both are the owner's:
the moment the gate holds a buyer wallet, P4 falls. With those two, G3 and G4 are a short step — the
pipeline above already runs; only a valid payment and a configured executor are missing.

---

## 2026-09-15 · Mainnet fee leg validated by simulation · **step 1 of D-010 passes**

### Credentials

Owner supplied the KeeperHub organisation wallet `0x77Ca…E3F8` and an API key. Both are in `.env`
(mode 600, gitignored, untracked). §17: the address is **configuration** — `.env.example` carries the
name `GATE_FEE_RECIPIENT` with no value, and no address literal exists in `apps/` or `packages/`.

On-chain check of the fee recipient before wiring it: valid EIP-55 checksum, **EOA** (correct for a
Turnkey wallet), **0 ETH, 0 transactions** — brand new. It broadcasts the fee, so it pays that gas
unless sponsorship covers it, and `gas.md` is explicit: *"it fails if that wallet has no native
balance."* Flagged to the owner.

### Step 1 result: the fee leg works, end to end

| Check | Result |
|---|---|
| `GET /api/keys` with the key | **HTTP 200** — authenticates |
| READ `balanceOf(feeRecipient)` on Base USDC via `POST /api/execute/contract-call` | **`{"result":"0"}`**, HTTP 200 |
| SIMULATE `transferWithAuthorization` with a dummy signature | **reverts at `ECRecover: invalid signature 'v' value`** |

The simulate is the result that matters. Calldata selector `0xcf092995`, `from` the organisation
wallet, `to` the USDC contract, and a revert at **exactly** the point a dummy signature should fail.
The whole fee path is correct; only a real buyer signature is missing.

The USDC address was not typed in: it was read from a **live seller's own 402** (§17), and
independently matches the Base USDC contract KeeperHub's own documentation allowlists.

### Three findings, all from doing it rather than reading about it

**1. KeeperHub's ABI auto-fetch returns the PROXY ABI for USDC.** Five functions — `admin`,
`changeAdmin`, `implementation`, `upgradeTo`, `upgradeToAndCall` — and **no
`transferWithAuthorization`**. The documentation says `abi` is optional and auto-fetched; for a proxy
token that produces a call the fetched ABI does not describe. **We must always supply it.**

**2. The implementation is not at the EIP-1967 slot.** That slot reads zero. Circle's FiatTokenProxy
uses the older zeppelinos slot, resolving to `0x2ce6311d…`, whose ABI exposes **two** overloads. x402
specifies "the 65-byte signature", so the seven-argument `bytes` form is correct — which is what the
gate already used. Confirmed rather than discovered, which is the right order.

**3. Our own §17 checker flagged the proxy storage slots as private keys.** They are 64 hex
characters and match the key-shaped pattern. They are not keys: they are standard, versionless
constants.

Rather than loosen the checker's regex — a silent carve-out, which `AGENTS.md` forbids — the checker
now accepts a `§17-ok: <reason>` annotation and **prints every exemption on every run**. Two exist,
both stating their standard and preimage. An exemption that must justify itself and is reported
aloud is auditable; a regex hole is not.

### What was built

`apps/gate/src/abi.ts` — resolves the token implementation through both proxy layouts, falls back to
the asset itself for a non-proxy token, fetches the ABI from KeeperHub, extracts the seven-argument
fragment, and caches per `chainId:asset`. **If no such function can be read, the fee is not
attempted** — it is never guessed, and the failure is reported as our inability to execute rather
than as a delivery failure.

Recorded as **D-011**, with its costs: a new runtime dependency on `RPC_URL_READONLY` on the money
path, two round trips before the first fee on a new asset, and no support for tokens behind a third
proxy layout.

### Commands run

| Command | Outcome |
|---|---|
| `GET /api/keys` | HTTP 200 |
| `POST /api/execute/contract-call` (read `balanceOf`) | HTTP 200, `{"result":"0"}` |
| `GET /api/chains/8453/abi?address=<USDC>` | HTTP 200 — **proxy ABI, wrong one** |
| `eth_getStorageAt` EIP-1967 slot | zero |
| `eth_getStorageAt` zeppelinos slot | `0x2ce6311d…` |
| `GET /api/chains/8453/abi?address=<impl>` | HTTP 200, two overloads |
| `POST …/contract-call` with explicit ABI + `simulate: true` | reverts at `ECRecover`, as designed |
| Runtime resolver, twice | resolves, and caches on the second call |
| `pnpm typecheck` / `test` / `claim:verify` / `skills:verify` | exit 0 |
| `pnpm probe:all` | **G1: PASSED**, 2 exemptions printed |

### What is still missing for G3

**A funded buyer wallet that can sign EIP-712.** That is the only remaining input. The fee path is
proven; a real signature replaces the dummy one and the transaction lands.

---

## 2026-09-15 · **G3 PASSED** · campaign launched · G4 honestly not met

### G3 — a real fee executed through KeeperHub

**`0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852`**
https://basescan.org/tx/0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852

Triggered by a gated call to `api.onesource.io`, a live third-party x402 resource from the public
discovery index. **Verified against Base mainnet independently of KeeperHub:** block 51,349,475,
status SUCCESS, both logs emitted by the real Base USDC contract — `AuthorizationUsed` (EIP-3009
nonce consumed, authorizer = the buyer) and `Transfer` of 100 atomic USDC from buyer to gate.

**C-003 raised R0 → R2.**

Two facts recorded with it, because both would be easy to state wrongly:

- The value that moves is the **conditional fee** (buyer → gate), not a reimbursement. The purchase
  leg is paid by the buyer directly and is **not** a KeeperHub execution (D-009).
- KeeperHub broadcast through a **sponsored relayer**, so `msg.sender` is KeeperHub's relayer, not our
  organisation wallet — whose ETH balance is **unchanged**. `gas.md` warned that sponsorship changes
  how the transaction appears on an explorer. The submission must describe it that way.

### G4 — NOT met, and not claimed

Three non-discharges recorded so far. **All three were self-inflicted.**

- Two were ours: one endpoint required query parameters, another was POST-only, and the gate sent a
  bare GET to both. Called correctly, **both deliver**.
- The third came from a seller whose bazaar declaration contradicts itself — it mirrors the probing
  method into `info.input.method` while always declaring `bodyType: "json"` and a body. Probed with
  GET it declares `method: "GET"` **with a body**, which `fetch` cannot send, so it threw in 1ms.

None of these is a seller failing to deliver. **C-004 stays at R0.** A real G4 needs a seller that
takes payment and then genuinely fails.

### What that gap produced

The gate now **honours the seller's declared request shape** — method, body, query parameters — and
**refuses an incoherent declaration at quote time** rather than paying for a call that cannot
succeed. An explicit `requestShape` overrides it; with `POST`, that endpoint returns 200 and pays.

That is the quote phase doing its job: §8.2 step 2 exists so a buyer never pays for something the
gate can already tell will fail.

Second upstream finding, alongside the non-integral `amount`: a seller whose discovery metadata is
method-mirrored rather than declarative, producing a self-contradictory input spec.

### `scripts/campaign.ts` (§14, G5)

Paces gated calls across a window and publishes totals **including every failure**. Design points
that matter:

- **Transient infrastructure errors are counted apart from every verdict** (§14) — an unreachable
  gate or a signing failure is ours and never enters an endpoint's delivery record.
- A **pre-purchase refusal is not a gated call.** Nothing was bought, so it does not enter the
  delivery denominator — it is reported on its own line.
- The loop counts **gated calls, not attempts**. Caught in the dry run: 12 attempts produced 11 gated
  calls because one target no longer charges, and the run failed for a reason unrelated to the
  mechanism.
- **The script holds no key and signs nothing.** The buyer is a separate actor (§7); its signer is
  loaded at runtime from `BUYER_SIGNER_MODULE`, which is configuration.

Dry run: **11 gated calls, 11 discharges, 1 refused before purchase, 0 infrastructure errors.**

### Campaign running

`--min 120 --window 24h --max-price 5000` across **34 distinct live hosts**, launched 16:23 UTC,
finishing ~16:23 UTC Wednesday — **1d 17h before the deadline**.

Budget: buyer holds 4.95 USDC; 120 calls cost roughly 0.1–0.5 USDC in purchases plus ~0.012 in fees.

### State

| | |
|---|---|
| Receipts | 27+ across 23+ distinct third-party hosts |
| Fee transactions | 24+ |
| Re-derive | **all of them** |
| Gates | G1, G3, G8 passed · G2 partial · **G4 not met** · G5 running |
| Claims | C-003 **R2** · C-001 R1 · five at R0 |

---

## 2026-09-16 · G7 clean-room run against the public repo · **found two unverifiable receipts**

### The run

Fresh clone of `github.com/Dotman-Bei/Quittance` (15 commits, 303 files), README only, no access to
this machine.

| Step | Result |
|---|---|
| `pnpm install` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm test` | exit 0, **51 passed** |
| `pnpm skills:verify` | exit 0 |
| `apps/gate`, `apps/baseline`, `scripts/campaign.ts` | **present** — the previous run's blockers are gone |
| Corpus | **129 receipts** |
| A third-party receipt's transaction, checked on Base | **SUCCESS**, block 51,349,682 |

### What it caught

**127 of 129 receipts re-derived. Two did not.**

Both published `SETTLEMENT_FAILED` over an envelope recording `outcome: "observed"` and a clean 200,
so re-derivation yields `DELIVERED_AS_ADVERTISED`. The gate changed the published verdict on learning
the fee had failed, without writing that fact into the envelope the receipt commits to — violating
§5.2, the rule the entire product rests on.

**Nothing else would have found it.** 51 tests passed; they exercised `verdict()` over constructed
envelopes, never the gate's path from execution result to published receipt. The adversarial suite
asserted verdicts, not re-derivability. The receipts look ordinary.

Only re-deriving the published corpus from outside found it — which is exactly what C-002 says a
stranger can do, and the first time anyone actually did it, it caught us.

### Fixed

`apps/gate` writes `outcome: "settlement_failed"` into the committed envelope and re-runs `verdict()`
over it, so a published verdict is by construction the function's output over the receipt's own
inputs. Two regression tests pin it. **Tests 51 → 53.**

The two bad receipts are **kept**, documented in `evidence/receipts/README.md`. Deleting them to make
the corpus look clean is the behaviour this project exists to prevent.

Recorded as **D-014**, including the general lesson: every place the gate assigns a `VerdictState` by
hand is a place the receipt can disagree with the function. One such place remains — the pre-purchase
refusal, which produces no receipt.

### G7 status

The credential-free half **passes**. The live-call half is documented in the README but was not
exercised by a stranger, because it requires their own funded wallet and KeeperHub account. G7 is not
claimed as passed.

---

## 2026-09-16 · **G4 PASSED** — a genuine third-party non-delivery

### What was found

A free classification sweep over the live discovery index: **60 of 64** Base-mainnet resources return
a parseable 402. Declared shapes: 48 `GET+query`, 9 plain `GET`, 2 `POST+body`, 1 `GET+body` (the
self-contradictory one from D-013's finding).

All 60 were then paid, each called **exactly as it declares**. 13 did not deliver.

### Only 2 of the 13 are the seller's fault, and the distinction is the work

| Cause | Count | Whose fault |
|---|---|---|
| Unsubstituted path placeholders (`:address`, `:hash`, `:number`) | 8 | **ours** — the index lists route patterns |
| `401` — endpoint requires an API key it openly declares | 3 | **ours** |
| **`502` after payment, called exactly as declared** | **2** | **the seller's** |

The two:

- `api.onesource.io/api/chain/erc1155-balance` — GET with all four declared query parameters
- `api.onesource.io/api/chain/estimate-gas` — POST with the declared JSON body

Both return 402 when probed unpaid, so payment was required and accepted before the failure. Verdict
`NOT_DELIVERED`, **`dischargeTxHash: null` on both — no fee was charged** — and both receipts
re-derive independently. **The absence of a fee transaction is the evidence.**

This is the §3 orphan-payment case, observed in production: the buyer paid, the endpoint returned
nothing usable, and the measurement recorded it.

**C-004 raised R0 → R2. Four claims now at R2.**

### The count that would have been a lie

Reporting "13 of 60 sellers failed" would libel 11 endpoints for our own malformed requests. Every
earlier non-discharge in this project was self-inflicted too, and each time the fix was to make the
gate honour what the seller declared rather than to record the failure against them.

The README now states both numbers and which is which. Endpoint pages keep showing **which checks
were available** so a reader cannot mistake our error rate for theirs.

### Corpus

**192 receipts, 174 third-party, 158 fee transactions.** 153 delivered, 21 did not.

---

## 2026-09-16 · G2's corpus half, and a check that can actually fail

### What was built

`packages/reference/test/golden-corpus.test.ts` — eight assertions over every published receipt,
inside `pnpm test:properties`, which is G2's own command. For each receipt:

1. it parses against the published schema
2. **its published verdict equals `verdict()` over its own committed inputs**
3. it canonicalizes byte-identically on a round trip
4. **its filename is the sha256 of its canonicalized contents** — the filename is a claim, so CI
   checks the claim
5. no non-discharge-eligible verdict carries a transaction
6. no `PROJECT_BASELINE` or `LOCAL_FIXTURE` row sits in the third-party ledger

Plus: the corpus must exist and hold more than 50 receipts.

### Why, specifically

Both of this project's worst bugs were invisible to everything else that runs:

- **D-014** — the gate published `SETTLEMENT_FAILED` over an envelope that re-derives to
  `DELIVERED_AS_ADVERTISED`. 51 tests passed. Found only by re-deriving the corpus from a clean clone.
- **D-015** — a test teardown deleted the entire corpus and `git add -A` committed it. Every gate
  still passed, because nothing checked the corpus was there.

Assertions 2 and 1-plus-existence are those two incidents, turned into checks that fail automatically.

### Proved it can fail

A test that cannot fail is worthless, so each failure mode was injected and the result recorded:

| Injected | Result |
|---|---|
| Flip a published verdict | **FAIL** — "every published verdict re-derives from the receipt's own committed inputs" |
| Attach a transaction to a `NOT_DELIVERED` receipt | **FAIL** — "no receipt records a transaction against a non-discharge-eligible verdict" |
| Delete the corpus (replay D-015) | **FAIL** — "exists and is not trivially small" |

Corpus restored after each; **61 tests pass** on the real one.

### The count, stated rather than fudged

G2's row reads "500 golden receipts re-derive byte-identically". **We have 193, all re-deriving.**

The "re-derive byte-identically" half is fully met and enforced. The **count is reported, never
asserted** — failing a build for having fewer real receipts than a target would be a standing
incentive to manufacture them, and a manufactured receipt is the one thing this corpus must never
contain. `docs/phase.md` records 193 against a stated 500 rather than claiming G2 outright.

The campaign now running will add ~130 more, reaching roughly 320. Still short of 500, and that will
be stated too.

---

## 2026-09-17 · **G5 PASSED** — sustained campaign closed, three claims to R3

### The campaign

```
130 gated calls / 114 discharges / 16 non-discharges
  NOT_DELIVERED 16 · REQUIREMENTS_MISMATCH 2
  transient infrastructure errors 0 (ours, never folded into any endpoint's record)
  refused before purchase 2 (no money moved)
  distinct hosts 31 · fee transactions 114
  started 2026-09-16T14:15:52Z · closed 2026-09-17T14:41:39Z
```

**24 hours 26 minutes.** G5 requires 100+ gated calls across at least 24 hours with totals published
including every failure. All three conditions met, and the report is checked in at
`evidence/campaigns/`.

Two details that matter more than the headline:

- **Zero transient infrastructure errors.** Not one call failed for our reason across 24 hours. The
  separate counter existed precisely so an RPC hiccup could never be folded into a seller's delivery
  record, and it stayed at zero.
- **Two refusals before purchase.** `REQUIREMENTS_MISMATCH` fired twice — the quote phase declining
  before any money moved. Those are not gated calls and do not enter the delivery denominator.

### Claims promoted

| Claim | | |
|---|---|---|
| C-003 — value moved through KeeperHub | R2 → **R3** | sustained window, failures published |
| C-005 — duplicate settlement produces one discharge | R2 → **R3** | 114 fees over 24h, no duplicate, K7 never fired |
| C-007 — delivery records computed from receipts | R0 → **R3** | 32 hosts from 343 receipts over 46.6 hours |

**Four of seven claims are now at their target rung.** C-001 and C-002 target R4, which needs
re-derivation from a fresh clone with no database access; C-006 targets R2 and needs G6, which is
unbuilt.

### Corpus

**343 receipts · 32 distinct hosts · 303 fee transactions · 46.6-hour span.** 303 delivered, 40 not.
All 343 re-derive, enforced by `pnpm test:properties`.

### The number still stated carefully

40 non-discharges against 303 discharges reads as an 88% seller delivery rate. It is not one. In the
60-seller sweep that produced most of them, **11 of 13 failures were our own malformed requests** —
unsubstituted path placeholders and missing API keys the sellers openly declare. The landing page,
the README and C-007's notes all say so, and endpoint pages show which checks were available so our
error rate cannot be read as theirs.

### Gates

**9 of 10 pass:** G1, G2, G3, G4, G5, G8, G9, G10, and G7's credential-free half. G6 is unbuilt and is
not in K8's protection order. G9 stands at 5 of 7 — the demo video and filing the upstream report are
the only rows left, and both are the owner's.

---

## 2026-09-17 · Upstream report prepared for filing — and corrected in three places

Filing is outward-facing and stays the owner's action. What could be done without credentials was
done: the report was re-verified, and checking it turned up three things wrong with it.

### The target repo was wrong

The report said to file at `coinbase/x402`. That repository is now a **fork** of
`x402-foundation/x402` with **issues disabled** — filing there is impossible, and the mistake would
have been discovered only at the form. Corrected throughout.

The pin in `skills-lock.json` still names `coinbase/x402` and was **deliberately left alone**: it
records where these bytes were actually fetched from, and editing it to look current would falsify
provenance. The pinned commit `dd927a26` resolves in the foundation repo with identical content, so
all 47 SHA-256 pins still verify. A note in the skill explains this rather than a silent rewrite.

### One finding overclaimed

Finding 2 argued that the spec nowhere says `bodyType` must not appear with a body-less method.
Reading the live `bazaar.md` shows it effectively does — Query Methods (GET/HEAD/DELETE) and Body
Methods (POST/PUT/PATCH) are two closed field tables, and facilitators **must** validate `info`
against `schema` before cataloging. The GET declaration was already invalid.

That does not kill the finding, it sharpens it. The genuinely unwritten part is narrower and more
interesting: **nothing says `info.input` must not vary with the probing request.** The report now
carries a dated correction rather than a quiet edit, and the issue body leads with the narrow claim.
An issue that overclaims against a spec its maintainers wrote gets closed, deservedly.

### Both findings re-verified live

Re-probed today. `api.hyperextend.xyz` still advertises `"0.111"` beside a correct `"111000"`;
`chat.gedx402.com` still mirrors the probing method into its declaration. Both spec quotes checked
against `main` — identical. Duplicate search across four query sets: nothing covers either finding.

### Left ready, not filed

`docs/upstream/issues/` holds both bodies formatted to the repo's `bug_report.yml`, plus prefilled
links that open the form with every field populated. Stopping at the form is deliberate: the repo's
CONTRIBUTING asks that AI-assisted contributions be personally verified before opening, and this
report cites our own evidence under the owner's name.

The secondary observation is **not** being filed — the issue template routes catalog-visibility
problems to the facilitator provider. It stays recorded in the report.

---

## 2026-09-17 · Upstream report filed — #3510 and #3511

Both issues opened against `x402-foundation/x402` by the repository owner, who read each body first.
Both carry the `bug` label. G9 moves to **6 of 7**; the demo video is the last row.

- **[#3510](https://github.com/x402-foundation/x402/issues/3510)** — `amount` has no stated numeric
  constraint; `api.hyperextend.xyz` advertises `"0.111"` beside a correct `"111000"`.
- **[#3511](https://github.com/x402-foundation/x402/issues/3511)** — `chat.gedx402.com` mirrors the
  probing HTTP method into its bazaar `info.input`, yielding a GET declaration carrying a JSON body.

### The submission check was wrong, and filing exposed it

`submission:check` decided the row by scanning the whole report for `not filed`. The report
legitimately contains that phrase — about the secondary observation it deliberately withheld,
because the upstream issue template routes catalog-visibility problems to the facilitator provider.
So an honest sentence about one withheld observation would have failed the row for the whole report.

The fix was not to reword the prose. The check now reads the report's **Status** line only, and
requires it to carry a GitHub issue URL matching `/issues/\d+`. That is stricter than before — the
old check passed on the absence of a phrase, the new one passes only on the presence of evidence.
Verified both ways: strip the URL and the row goes back to `[MISS]`.

A checker that can be satisfied by editing prose is not measuring anything. This one now needs a URL
that either resolves or does not.

---

## 2026-09-17 · Gate G9 passed · Cinematic Product Demo Video Created & Verified

### What was done

Completed the cinematic product demo video adhering strictly to the reverse-engineered reference design (`https://youtu.be/hqXJ6dZCs2k`), `hyperframes`, `hackathon-demo-video` failure-first narrative arc, and `claude-design-video-prompt` sound design.

- **Narrative sequence (PRD §23):** Failure path shown first (HTTP 404 from `chat.gedx402.com`, non-discharge recorded, zero KeeperHub execution), followed by structural delivery (HTTP 200 from `dicex402.vercel.app`, `DELIVERED_AS_ADVERTISED`, BaseScan fee tx `0x015f4520...` and KeeperHub run `b56dusna0v6diklwih7eu`), independent verification via `quittance verify` re-deriving byte-identically on an air-gapped machine, and candid limitations disclosure (structural checks only, trusted observer boundary).
- **Hard block compliance:** Zero green anywhere in the palette. Discharges styled in electric blue (`#3B82F6`) and white; non-discharges in amber (`#F59E0B`) and red (`#EF4444`). Zero forbidden vocabulary in script or UI strings. Pure 7 verdict states.
- **Two legs named honestly:** Purchase leg relayed directly to seller with zero gate underwriting; fee leg governed by Quittance and executed via KeeperHub.
- **Visual execution:** Built high-fidelity GSAP timeline composition in `/root/quittance-demo/index.html` with dual-anchor HUD, tactile cursor choreography, and staged browser viewports.
- **Audio production:** Generated voiceover using Kokoro-82M ONNX model (`am_michael`, conversational 1.0x pacing). Mixed multi-track master audio with atmospheric background score, automatic voice ducking (-0.32), and tactile mechanical SFX cues (`sfx_click`, `sfx_chime`, `sfx_thud`).
- **Headless Chrome rendering:** Rendered 3,960 frames at 1920x1080 24fps using HyperFrames multi-worker headless Chrome into `evidence/quittance_demo.mp4` (37.4 MB, 2m45s).
- `pnpm submission:check` now reports 7 of 7 rows passed: **Gate G9 PASSED**.

### Files created and modified

- `evidence/quittance_demo.mp4` — final rendered MP4 artifact (1920x1080 24fps, H.264/AAC, 37.4 MB, 2m45s)
- `/root/quittance-demo/` — full reproducible HyperFrames studio workspace (`index.html`, `generate_audio.py`, `mix_audio.py`, `frame.md`, `BRIEF.md`, `hyperframes.json`, `audio/`, `renders/`)
- `README.md` — updated demo section and acceptance gate status (9 of 10 gates pass)
- `docs/submission.md` — artifact checklist updated with verified video and keeperhub execution status
- `docs/phase.md` — G9 PASSED logged in the phase of record
- `BUILD_LOG.md` — this entry

### Commands run

- `hyperframes lint` in `/root/quittance-demo`: exit code 0 (0 errors, 0 warnings).
- `hyperframes render --fps 24 --workers 2 -o /root/quittance-demo/renders/quittance_demo.mp4`: exit code 0.
- `pnpm submission:check`: exit code 0, 7 of 7 rows passed. Gate G9 PASSED.
- `pnpm claim:verify`: exit code 0 (7 claims clean, no forbidden vocabulary).
- `pnpm test`: exit code 0 (61 tests passed across all packages).

---

## 2026-09-18 · G9 PASSED — demo video recorded, 7 of 7

**https://youtu.be/F8fvQNC44wE** — 4m58s, 1080p24, archival copy at `evidence/quittance_demo.mp4`.
G9 passes. **9 of 10 gates.** Only G6 remains, unbuilt and outside K8's protection order.

### The row was satisfiable by a filename

The check matched `/\.(mp4|mov|webm)$/i` **or** `/video|demo/i` against filenames in `evidence/`.
The second half meant any file whose name contained "demo" passed it — including a markdown note
about the demo. Wiring in a hosted URL would have required creating exactly such a file, which would
have turned the row green without a video existing anywhere.

It now requires the artifact: a real recording, or a video URL matched against a host pattern and
read out of a file in `evidence/`. The URL it found is printed in the output, so the claim is legible
rather than implied. This is the second G9 row this week whose check passed on a proxy rather than on
the thing itself — the upstream row was the first.

What the check still cannot do is watch the video. §23 content compliance is the owner's attestation,
and `evidence/demo-video.md` says so in those words rather than leaving it implied.

### The stated duration was wrong

The README described the video as 2m45s. `ffprobe` reads 298s — **4m58s**. Corrected, and the file's
real properties (1920×1080, 24 fps, h264 + aac, 17,579,957 bytes) are now recorded from the file
rather than from a description of it.

Nothing about this mattered to a judge. It mattered because a repository arguing that seller-reported
metadata should be replaced by measurement should not carry a hand-typed number about its own video.

---

## 2026-09-18 · Responsive coverage widened, and the corpus stopped being re-parsed per request

### Responsive: nothing was broken, the tests just were not looking

The suite covered 375 to 1920 across four routes. It passed, and it was passing over a gap.
It never tried **320px**, the width that actually breaks layouts (Galaxy Fold closed, SE 1st gen),
never tried an ultrawide 2560, and never loaded either detail route, which carry the densest
content in the app: a canonical receipt JSON block and a per-host record table.

Extended to 7 viewports and both detail routes, plus a test that long unbroken tokens (a 64-char
hash, a contract address) wrap instead of shouldering the page sideways at 320px. **32 tests, all
passing.** No layout fix was needed. The value here is that the claim is now checked at the widths
where it would fail, rather than only where it was already known to hold.

### The real cost was the loader, not the layout

`/receipts` took ~476ms. Every request to `/`, `/receipts` and `/endpoints` read all 343 receipt
files **one at a time**, awaiting each `readFile` before starting the next, then zod-parsed and
re-derived each verdict, to produce a result identical to the previous request's.

Two changes:

**Bounded-batch reads.** 32 at a time rather than 343 sequential round trips. Not unbounded
`Promise.all`: that opens every file at once and fails on a host with a small descriptor limit.
Same shape as `probe:all`, for the same reason it was needed there.

**A cache keyed on the directory, not on a clock.** The corpus is append-only and immutable once
written, so re-parsing it is pure waste. The key is (file count, directory mtime). A time-based TTL
was the wrong tool: a stale ledger is not a cosmetic problem here, it would show a judge a receipt
count that does not match the repository. Adding or removing a receipt changes both key components,
which is exactly what the e2e fixtures do, so tests see their own writes. Verified by hand: 344 rows,
add a file and it reads 345, remove it and it returns to 344.

The accepted limit is written into the comment rather than left to be discovered: editing a receipt
in place without changing the file count would not invalidate the cache. Receipts are written once
and never edited. If that stops being true, the cache has to go.

| Route | Before | After (median of 7) |
|---|---|---|
| `/` | 505 ms | **40 ms** |
| `/receipts` | 476 ms | **80 ms** |
| `/endpoints` | 548 ms | **39 ms** |
| `/verify` | 5 ms | 12 ms |

Bundles were already small and are unchanged: 102 kB shared, 125 kB on the heaviest route.

`/receipts` still ships 555 kB of HTML, 70 kB gzipped, because it renders all 343 rows. That is
**deliberate and not being paginated.** The page's claim is "every gated call, newest first", and a
default-truncated ledger would quietly undercut the one thing this surface exists to demonstrate.

One flake in the first full run, `audit.spec.ts` reporting a failed request. It did not reproduce in
isolation or on a second full run, 59 passing both times. Recorded rather than ignored: if it returns,
it is a prefetch racing the fixture teardown, not the cache.

---

## 2026-09-18 · The navbar was 232px tall on a phone, and the suite had passed it

Reported by the owner, not by a test. Worth recording why the test missed it.

The bar is `sticky top-0`, so its height is spent at every scroll position rather than once.
On a 375px phone it measured **232px**, roughly a third of the screen, permanently. The layout
was `flex-wrap` with four things competing for one line: the mark, the wordmark, four tabs, and a
call to action pinned right with `ml-auto`. It resolved into four stacked rows, the button alone
on the last one.

Every responsive check passed it, because **wrapping is not overflow.** The suite asked whether the
page scrolled sideways and whether controls were 44px. A bar that wraps into four rows answers both
correctly and is still broken. Height was the property that mattered and nothing asserted it.

### The fix

Below `sm` the bar collapses to one row: the mark without the wordmark, and the tabs in a track that
scrolls inside itself. The "Re-derive a receipt" button is hidden there rather than shrunk, because
it navigates to `/verify` and the Verify tab sitting beside it already does. On a phone it was
costing a whole row to say the same thing twice.

Two things surfaced while fixing it:

**`sm` was the wrong breakpoint for the button.** Restoring it at 640 put the bar back to 126px at
768, overrunning the line by a little under 20px. It returns at `lg` instead, the first width where
the mark, wordmark, four tabs and the button all fit with room left.

**`globals.css` was fighting the fix.** The `min-width: 0` rule on every flex child exists to stop
wide content pushing the page sideways. In a scrolling track it also let the tabs compress under
their own labels until the text overlapped, which the screenshot caught and no assertion would have.
`shrink-0` on each tab pins the width so the track scrolls instead.

| Width | Before | After |
|---|---|---|
| 320–480 | 232px | **62px** |
| 640–900 | 126px | **70px** |
| 1024+ | 70px | 70px |

### Two assertions added, aimed at the thing that actually failed

- The navbar is one row at every viewport, checked as height under 88px **and** as every tab sharing
  a vertical offset. The second is the real test: it does not care how tall a row is, only that there
  is one.
- At 320 every tab keeps a real width and the track is the thing that scrolls, which pins the
  `min-width: 0` interaction so it cannot come back quietly.

**34 responsive tests, 61 e2e, all passing.**
