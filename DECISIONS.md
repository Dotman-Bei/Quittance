# DECISIONS.md

**Append-only. Never edited, never deleted, never reordered.**

An entry that turns out to be wrong is not corrected in place. It is superseded by a later entry
that names it, and the original stays exactly as written. The value of this file is that it records
what was believed at the time and what forced the belief — editing it destroys that.

Every entry records: what was decided, what evidence forced it, and what it costs later.

Entry format: `D-NNN · <title> · <date> · <status>`
Status is one of: `active`, `superseded by D-NNN`.

---

## D-001 · Gate mode is the public proof path · 2026-09-09 · active

### What was decided

Quittance ships **two** modes, and **gate mode is the one the public proof path runs on.**

- **Gate mode.** The buyer routes its paid call through the Quittance gate. The gate holds a
  pre-signed discharge authorization, pays the seller's x402 requirement from its own working
  capital, observes the response, computes the verdict, and — only on `DELIVERED_AS_ADVERTISED` —
  has KeeperHub execute the discharge from buyer to gate.
- **Facilitator mode.** Quittance exposes the standard x402 facilitator surface. `settle` runs the
  delivery check first and executes through KeeperHub only on `DELIVERED_AS_ADVERTISED`. A seller
  adopts it by configuration and changes no code.

Every acceptance gate that produces third-party evidence — G3 (real discharge), G4 (recorded
non-discharge), G5 (sustained campaign), G7 (clean-room reproduction) — runs in **gate mode**.
Facilitator mode is built in P4 and is evidenced separately, as adoption, not as proof of mechanism.

### What evidence forced it

**1. Facilitator mode cannot produce third-party evidence unilaterally, and gate mode can.**

The competition requires value movement against a live third-party project (PRD §2). Facilitator
mode only moves value when **a seller chooses to point its resource server at our facilitator URL**.
That is a decision by someone who does not work on this project, on a timeline we do not control,
before a fixed deadline (Sep 18, 12:00 CEST).

Gate mode requires no permission from anyone. The **buyer** adopts it, and we are the buyer. Any
publicly listed x402 endpoint that returns a parseable 402 can be called, paid, checked, and
discharged against without the seller knowing Quittance exists. The counterparty is live and real,
and it is not us.

Put plainly: staking the main-track thesis on facilitator mode means staking it on a stranger's
integration decision. Gate mode's proof path has exactly one external dependency — that a live
listed endpoint answers a 402 — and PRD §26 K1 already covers that failing.

**2. Without this decision, PRD §26 K6 has no floor.**

K6 anticipates that no third-party seller points at facilitator mode, and instructs us to label
every such run `PROJECT_BASELINE` and count nothing as demand. If facilitator mode were the proof
path, K6 firing would leave the submission with **no third-party evidence at all** — every run would
be our own endpoint calling our own facilitator, which PRD §2 and §7 forbid presenting as adoption.
Gate mode makes K6 survivable: facilitator adoption becomes an upside claim rather than a
load-bearing one.

**3. The verdict function is identical in both modes, so nothing is lost by ordering them this way.**

`verdict(advertised, observed)` is pure and reads only the receipt. It does not know which mode
produced its inputs. Gate mode therefore exercises the entire mechanism — advertised-terms parsing,
hashing, the verdict, KeeperHub execution, the receipt, the batch root — end to end. Facilitator mode
adds a delivery surface, not a new mechanism. Proving the mechanism in gate mode first is strictly
cheaper and strictly earlier.

### What it costs later

This is the expensive half of the entry and it is written in full.

**Cost 1 — the gate carries delivery risk, and this is a real, unbounded-per-call loss.**
In gate mode the purchase leg (gate → seller) is broadcast by the **seller's own facilitator** and
settles *before* the response is observed. If the endpoint then fails to deliver, the buyer is
correctly not discharged and **the gate absorbs the price of that call.** There is no dispute
process, no arbitration, no recovery. This is underwriting, not escrow. It must be stated in exactly
those words in `README.md`, in `WHAT_IS_MEASURED.md`, and aloud in the demo video (PRD §19, §23).

**Cost 2 — the purchase leg is not a KeeperHub execution, and the submission must say so.**
Only the discharge leg is KeeperHub-executed. The form answer about which KeeperHub surfaces are
used (PRD §24) must not imply otherwise, and no UI string, README line, or demo sentence may describe
the purchase leg as executed through KeeperHub. This weakens the surface-area story relative to a
build where KeeperHub touched both legs, and we accept that weakening rather than blur it.

**Cost 3 — working capital is a hard operating constraint on the campaign.**
G5 requires 100+ gated calls over 24 hours. Every one of them is fronted by the gate. The campaign's
size is bounded by funded working capital, not by engineering. If mainnet USDC funding is
unavailable (K5), the campaign runs on testnet and is labelled testnet everywhere.

**Cost 4 — gate mode is a trusted-observer design, permanently.**
The gate is the sole observer of response bytes. Recourse is bounded: a seller must have kept its
own logs and must bother to publish them. Facilitator mode does not remove this, but gate mode makes
the boundary load-bearing on the proof path, so it must be disclosed on every receipt surface, not
only in the limitations section.

**Cost 5 — facilitator mode is now in P4, behind three gates.**
It is the last thing built and the first thing cut. PRD §26 K8 already names it as cut #1 if G3 has
not passed with 72 hours remaining. The adoptable path being the deferred path is the direct
consequence of this decision, and if the project is judged on adoptability rather than on
demonstrated mechanism, this decision is why we scored badly there.

---

## D-002 · Three x402 specification facts contradict PRD §5.2 · 2026-09-09 · active

### What was decided

Per the Agent Operating Contract (PRD §0, rule 3): **upstream wins.** The verdict function is built
against the pinned x402 specification, not against the PRD's description of it, and the PRD's
description is corrected in `WHAT_IS_MEASURED.md` rather than implemented as written.

### What evidence forced it

All three findings come from the upstream sources pinned in `skills-lock.json` and vendored at
`.agents/skills/x402/references/`. They were read, not recalled.

**Finding 1 — there is no advertised response-latency SLA in x402.**
PRD §5.2 says the verdict checks *"the latency budget the endpoint itself declared."* No such field
exists. The only time field in `PaymentRequirements` is `maxTimeoutSeconds`, defined by upstream in
both v1 and v2 as *"Maximum time allowed for payment completion"* — a payment window, not a response
deadline.
Source: `x402-specification-v2.md` §5.1.2 field table; `x402-specification-v1.md` line 123.

**Finding 2 — `mimeType` is optional and relocated between versions.**
v1: optional, on each `accepts[]` entry. v2: optional, on the `resource` object.
Source: `x402-specification-v1.md` line 121; `x402-specification-v2.md` `ResourceInfo` table.

**Finding 3 — `outputSchema` does not exist in x402 v2.**
It was an optional `accepts[]` field in v1 and was removed in v2. Upstream states: *"The `bazaar`
extension was formalized in x402 v2. Discovery functionality unofficially existed in x402 v1 through
the `outputSchema` field."* Schema conformance is therefore available only on v1-with-schema, or on
v2 with the `extensions.bazaar` extension present.
Source: `x402-specification-v1.md` line 122; `extension-bazaar-discovery.md` line 471.

### Consequences adopted

- `TIMEOUT_EXCEEDED` is derived from the **buyer's intent** (`maxLatencyMs`), not from advertised
  terms. Every surface displaying it states that it reflects the buyer's deadline and asserts nothing
  about a seller promise.
- The receipt records, per call, **which checks were available** — whether a `mimeType` was
  advertised, whether a schema was advertised, and which x402 version the seller spoke. A verdict is
  not interpretable without it.
- `SHAPE_MISMATCH` is only reachable when the seller published something to mismatch against.
- `packages/protocol-types` models v1 and v2 `PaymentRequired` as distinct, discriminated schemas.
  Neither is normalised into the other, because the fields do not correspond one-to-one.

### What it costs later

**Cost 1 — the headline claim is narrower than the PRD's.** Against a seller publishing neither a
`mimeType` nor a schema (fully specification-compliant), the verdict collapses to *status code plus
non-empty body*, plus a buyer-chosen latency bound. That is a materially weaker check than PRD §5.2
implies, it is what we can honestly claim, and `WHAT_IS_MEASURED.md` states it in those terms.

**Cost 2 — two schema families to maintain.** Supporting v1 and v2 as discriminated shapes roughly
doubles the surface of `packages/protocol-types` and the golden-receipt corpus. Collapsing them into
one normalised type would be cheaper and would silently invent field correspondences that upstream
does not define, so it is refused.

**Cost 3 — endpoint pages need a "checks available" column.** Comparing endpoints on delivery rate
alone would compare an endpoint checked on four dimensions against one checked on two. The column is
extra UI work in P4 and is not optional.

**Cost 4 — this narrows C-001 and C-007 at the source.** Both are seeded at R0 with wording already
constrained to structural conformance. If execution shows even the structural check is not meaningful
for the target response class, K4 fires and the check narrows again to status, non-emptiness, and the
buyer's latency bound. It is never widened toward quality.

---

## D-003 · frontend.md is a P4 input, reconciled against PRD §18, not adopted as written · 2026-09-09 · active

### What was decided

`frontend.md` is accepted as the **structural and component-hierarchy specification** for
`apps/web` — file tree, routes, component decomposition, wireframes, and interaction model. Its
**visual token set is not adopted as written**, because several tokens and copy strings directly
violate PRD §18, §17, and §9, which are product-integrity rules rather than taste.

The reconciled design system is recorded in `DESIGN.md`. `apps/web` is built in **P4** and is not
built now (PRD §27).

### What evidence forced it

Direct, itemised conflicts between `frontend.md` and the PRD:

| # | `frontend.md` | Conflicting rule | Resolution |
|---|---|---|---|
| 1 | Navbar "pulsing **green** LED dot" | §18: *no green anywhere in the palette* | PRD wins. Status indicator uses the neutral ramp; liveness is shown by a timestamp, not a colour |
| 2 | Five accent colours (indigo, cyan, amber, rose, violet) | §18: *one warm accent, one muted secondary* | PRD wins on count. Verdict states are distinguished by **label and glyph**, not by a per-state hue that re-creates a pass/fail colour semantics |
| 3 | Bento stats hardcoded: `12,482.50 USDC`, `94.2%`, `184ms`, `48 Live Hosts` | §0.7 *do not claim functionality that has not been executed*; §9 *evidence table empty and labelled "no runs yet", never hidden* | PRD wins. Zero fabricated metrics ship. Empty state is the honest state and renders as "no runs yet" |
| 4 | Footer "Base Mainnet: Block #19829312", navbar "Base Mainnet // KeeperHub Live" | §17: *no compiled-in protocol facts*; §0.7 | PRD wins. Network name and health are probe outputs at runtime or they are absent |
| 5 | Footer legal line "No financial **guarantees**…" | §18 vocabulary gate rejects `guaranteed` | Rewritten without the stem. See `DESIGN.md` |
| 6 | Body 11–12px caption, `rounded-2xl`, `max-w-6xl` | §18: caption 10px; radii 8 / 2 / 12; container 1280px | PRD wins on all three. §18 says tokens are *copied from that section* |
| 7 | Sample host string `api.daydreams.world/v1/agent` in table mock | §17; §0.7 | Placeholder only, never a default, never a fallback, never shipped as seed data |
| 8 | "Zero blind trust" hero subtitle | §18 backstop intent; gate is a trusted observer (§6) | Rewritten. The gate **is** a trusted observer of response bytes and the hero may not imply otherwise |

Conflict 3 is the serious one. A judge opening a landing page showing `94.2%` settlement success
against a repository whose every claim sits at R0 would be looking at a fabricated number on the
front page of a project whose entire thesis is that asserted metrics are worthless. That is not a
styling disagreement; it is the product contradicting itself in its own shop window.

### What it costs later

**Cost 1 — the build is visually plainer than `frontend.md` describes.** No green pulse, no
five-hue verdict rainbow, no glowing hero metrics. On first load with no runs recorded, the landing
page is mostly empty and says so. We are choosing a page that looks unfinished over a page that
looks dishonest, and a judge skimming for polish may score it lower.

**Cost 2 — the component hierarchy is kept, so no work is wasted.** `frontend.md`'s file tree,
routes, and component decomposition are adopted verbatim in `DESIGN.md`. Only the token layer and
copy strings are rewritten.

**Cost 3 — `apps/web` stays empty until P4.** PRD §27 forbids implementing a later phase's breadth
before the current gate passes; the web surfaces are P4, behind G1, G2, G3, G4, G5, G6 and G10. The
design system is written down now so that P4 is execution rather than redesign, but no component
ships before its phase.

**Cost 4 — `VerdictBadge` needs a non-colour encoding to carry the whole signal.** Removing the
per-state hue palette means label plus glyph plus position must be sufficient on their own. That is
more design work than picking six Tailwind colour pairs, and it is also the accessible outcome.

---

## D-004 · apps/web built during P1 as an owner-authorised phase exception · 2026-09-09 · active

### What was decided

`apps/web` — the full P4 web surface — was implemented while `docs/phase.md` names **P1** as the
phase of record. This is a deliberate, recorded exception to PRD §27, not an oversight, and it is
logged here because §27 exists precisely to stop this happening silently.

Scope of the exception: **`apps/web` only.** No other P2/P3/P4 work was pulled forward. The gate
service, KeeperHub discharge, campaign harness, idempotency harness, SDK publication and facilitator
mode remain unbuilt, and no live call has been made.

### What evidence forced it

The owner asked for the frontend to be implemented, was shown the §27 conflict and the eight
`frontend.md` ↔ PRD conflicts recorded in D-003, and directed the work to proceed. An owner
instruction is the one thing that overrides a phase boundary; a phase boundary is a discipline
against *our* optimism, not against the owner's priorities.

Two conditions were attached to keep the exception from costing what §27 protects against:

**1. P1 was completed first.** `apps/web` is not built on an unproven seam. `packages/protocol-types`,
`packages/reference` and `packages/verifier` were implemented, built and tested before the first web
component was written. G2's substance passes: `pnpm test:properties` exercises 2000 generated
envelopes per property and shows `verdict()` is pure, total, deterministic, non-mutating and
order-independent, with 26 tests passing.

**2. The web app re-exports rather than re-implements.** `apps/web/lib/types.ts` and
`apps/web/lib/verifier.ts` are re-export shims over the packages. The `/verify` page runs the *same*
`verdict()` the gate will run, shipped to the browser. A second implementation in the web app would
have made the client-side verifier a different program from the one that decides the money, which
would defeat the page entirely.

### What it costs later

**Cost 1 — G1 is still open, so P1 is still open.** The probes are not written and
`pnpm probe:all` does not exist. `docs/phase.md` therefore still reads **P1**, and this decision does
not close it. A reader who sees a finished-looking web app against an open P1 should read this entry
and `docs/phase.md`, in that order.

**Cost 2 — the web app has never rendered real data.** Every surface was exercised against
temporary `LOCAL_FIXTURE` receipts, which were then deleted. The populated code paths work; they have
never seen a receipt produced by a gate, because no gate exists. The empty state is not a placeholder,
it is the accurate state.

**Cost 3 — P4's remaining contents are now unevenly staged.** SDK publication, facilitator mode and
the upstream report are still unbuilt while the web surface is done. G7, G8 and G9 gate P4 as a whole
and none of them passes on the web app alone. Do not read a finished frontend as a finished P4.

**Cost 4 — rework risk if the receipt schema moves.** `packages/protocol-types` has never been
validated against a real 402 response from a live seller. If the probes (P1, G1) show that a live
`accepts[]` carries a field shape the schema does not model, the schema changes and every component
that reads a receipt changes with it. Building the UI before the probes ran is exactly the "building
on an unproven seam" that §27 warns about, and the seam here is the receipt schema.

**Cost 5 — the frontend cannot be described as gate-passed.** No web surface is covered by a
Playwright test (§13), and G7's clean-room reproduction has not been attempted. The app builds,
typechecks and serves; that is what may be claimed and no more.

---

## D-005 · D-002's third finding was too generous: x402 v2 has no response schema at all · 2026-09-09 · active

### What was decided

**D-002 finding 3 is narrowed.** It said schema conformance is checkable "on v1-with-schema, or on v2
with the `extensions.bazaar` extension present". The second half is wrong. In x402 v2 there is **no
response-body schema available by any route**, bazaar included.

`checksAvailable.schemaAdvertised` is therefore **always `false` for a v2 seller**, and a `v2` receipt
can never reach `SHAPE_MISMATCH` by way of schema non-conformance.

D-002 is not edited — this file is append-only. D-002 stands as written, and this entry corrects it.

### What evidence forced it

Two lines from the pinned upstream, read side by side:

- **x402 v1**, `PaymentRequirements` field table: `outputSchema` — *"JSON schema describing **the
  response format**"*.
  Source: `.agents/skills/x402/references/x402-specification-v1.md`, line 122.
- **x402 v2**, bazaar extension, *Schema Validation*: *"The `schema` field contains a JSON Schema
  (Draft 2020-12) that validates the structure of **`info`**."*
  Source: `.agents/skills/x402/references/extension-bazaar-discovery.md`, line 309.

`info` is the discovery metadata — how to *call* the endpoint. Its `output` sub-object carries only a
content `type` (`"json"`, `"text"`), an optional `format`, and an optional `example` response value.
An example is not a schema, and a schema over the discovery metadata is not a schema over the
response.

The two fields share a name and describe different things. Treating bazaar's `schema` as a
replacement for v1's `outputSchema` would have made the gate validate a response body against a
schema for a metadata object — a check that would fail on nearly every genuine response and produce
`SHAPE_MISMATCH` verdicts that withheld money from sellers who delivered correctly.

### What it costs later

**Cost 1 — the v2 check is now demonstrably thin.** For a v2 seller the entire verdict is: HTTP
status, non-empty body, `resource.mimeType` if it was published at all, and the buyer's own latency
bound. Since v2 is the current specification, this is the *common* case, not an edge case.
`WHAT_IS_MEASURED.md` states it in those terms.

**Cost 2 — C-001 and C-007 narrow again.** This is the second narrowing from reading upstream
(D-002 was the first). Both claims stay at wording constrained to structural conformance. If a third
narrowing arrives, K4 has effectively fired and the check should be declared as status,
non-emptiness, and the buyer's latency bound — nothing more.

**Cost 3 — `info.output.type` is tempting and is refused.** A v2 bazaar entry may say
`output.type: "json"`, which looks like a content-type check waiting to happen. It is not a MIME
type, it is a discovery hint, and upstream never says a response must conform to it. Reading it as
`mimeType` would be inventing a protocol fact (§17). It is recorded in the probe output as
information and is not an input to any verdict.

**Cost 4 — endpoint comparison gets harder, not easier.** A v1 seller publishing an `outputSchema` is
checked on strictly more dimensions than any v2 seller can be. The "checks available" column
(D-002, Cost 3) must therefore also record the x402 version, or two endpoints with identical delivery
rates will look comparable when they are not.

---

## D-006 · What 38 live x402 sellers actually publish, measured · 2026-09-09 · active

### What was decided

D-002 and D-005 were reasoned from the specification. This entry replaces that reasoning with
measurement, and it **partly reverses D-005's pessimism.**

The verdict's checkable surface against the live ecosystem is:

| Check | Available in practice | Evidence |
|---|---|---|
| HTTP status | always | structural |
| Non-empty body | always | structural |
| **Declared content type** | **38 of 38 live sellers** | measured |
| Response schema | **0 of 38** | measured |
| Seller latency SLA | **0 of 38** — the protocol has no such field | measured |

So the check is **not** "status plus non-empty body" as D-005's Cost 1 predicted. Content type is
universally advertised, so `SHAPE_MISMATCH` is genuinely reachable against every live seller probed.
D-005 remains correct that no response schema exists on v2; it was wrong to conclude the check
collapses to two dimensions. It is three, plus the buyer's own latency bound.

### What evidence forced it

`pnpm probe:all` against one resource per distinct host from the live x402 discovery index — 46
hosts. Full output in `evidence/probes/2026-09-09-g1-probe-run.md`.

- **39 resources returned a parseable 402.** 8 returned a non-402 (404 or 405 — stale index
  entries). 1 required per-offer handling, below.
- **38 of 38 speak x402 v2**, and every one carries its terms in the base64 `PAYMENT-REQUIRED`
  **header**, not the body. **Zero v1 sellers were found in the wild.** The v1 schema is retained
  because upstream still specifies it, but the live path is v2-header.
- **38 of 38 publish a `mimeType`.**
- **0 of 38 publish a response schema.**
- **`maxTimeoutSeconds` ranges 60 to 3600, with 33 of 38 at exactly 300.** One seller advertises
  3600. This is decisive on D-002 finding 1: nobody is promising a one-hour *response*. It is a
  payment window, and had we read it as a latency budget — as PRD §5.2 instructed — we would have
  called an hour-late response delivered on time.
- The discovery index disagrees with the live 402s. The index reported a `mimeType` for 5 of 100
  resources; the live 402s carry one for 38 of 38. **The index is not the terms.** The gate reads the
  seller's own 402 at call time and must never take advertised terms from an index.

### A real drift, found on the first run

`api.hyperextend.xyz/v1/liquidations/BTC` publishes two offers. `accepts[0]` on `eip155:8453` is
valid with `amount: "111000"`. `accepts[1]` on `hyperliquid:mainnet` carries `amount: "0.111"` — a
decimal, where x402 v2 requires *"Required payment amount in atomic token units"*.

This is a reproducible upstream finding produced from real friction, and it is the candidate for the
§20 contribution requirement.

### What it cost, and what changed in this codebase

The first implementation validated `accepts[]` as a whole and therefore **rejected this seller
entirely** over a malformed offer on a network we never target — losing a seller we could have
judged honestly, for no safety gain. `parsePaymentRequired` now parses **each offer individually**:
failures are reported verbatim and excluded, gating proceeds only on an offer that parsed, and
nothing is coerced or guessed.

A second flaw was found in our own code by the same run: `probe:all` printed
`service state: PROTOCOL_CONFIG_CHANGED` and `G1: PASSED` **in the same output.** A gate cannot pass
while the service refuses to gate. Fixed: `PROTOCOL_CONFIG_CHANGED` now fails G1.

`deriveServiceState` was also too aggressive — it treated a single malformed seller as a protocol
change and would have stopped all gating. One seller's bug is not the protocol moving. The threshold
is now a **majority of responding sellers**, and that judgement is written down in the function rather
than left implicit.

### What it costs later

**Cost 1 — the v1 code path is unexercised.** Zero live v1 sellers were found, so the v1 branch of
`parsePaymentRequired`, `advertisedMimeType` and `advertisedOutputSchema` is covered only by
generated tests. If a v1 seller appears, that path meets production without ever having run against
a real payload.

**Cost 2 — the content-type check is only as good as the seller's honesty about it.** 38 of 38
advertise `application/json`. If sellers advertise it reflexively rather than meaningfully, a
`SHAPE_MISMATCH` will be rare and the check will look stronger than it is. Endpoint pages must keep
showing which checks were available, so a reader can see that content type was the only shape
dimension in play.

**Cost 3 — the 8 non-402 index entries are a warning about K1's shape.** The index lists resources
that no longer charge. Any campaign target list must be re-probed at run time, not taken from a
cached index, or the delivery record will contain endpoints that were never gateable.

---

## D-007 · The purchase leg has no compliant execution path to a third-party seller · 2026-09-09 · active

### What was decided

**Nothing yet. This entry escalates, it does not resolve.** The choice belongs to the owner because
every option costs either a permission we do not hold, the product thesis, or property P4.

### The finding

The discharge leg works. The purchase leg does not.

| Leg | What must be produced | Can KeeperHub do it? |
|---|---|---|
| **Discharge** (buyer → gate) | A **transaction**: `transferWithAuthorization(...)` broadcast using the *buyer's* pre-signed authorization | **Yes.** `POST /api/execute/contract-call`. We broadcast; we sign nothing |
| **Purchase** (gate → seller) | An **EIP-712 signature** over `TransferWithAuthorization`, with `payTo` = the seller's address | **No, not to a third party.** See below |

x402's `exact` scheme requires the *payer* to produce a 65-byte EIP-712 signature — a message
signature, not a transaction. Source: `scheme-exact-evm.md`, "`signature`: The 65-byte signature of
the `transferWithAuthorization` operation."

KeeperHub does expose EIP-712/x402 signing, through the agentic wallet's `/sign` route with
server-side Turnkey custody and no private key on disk. But it pins the recipient:

> "A signing request must carry a `workflowSlug`; the route derives the expected recipient from that
> workflow's organisation wallet and rejects a mismatch with `403 PAYTO_MISMATCH`. So an arbitrary
> destination is refused."
>
> — `.agents/skills/keeperhub/references/agentic-wallet.md`, line 63

`/sign` is built to pay **KeeperHub's own paid workflows**. It will not sign a payment to
`api.onesource.io` or any other third-party x402 seller.

P4 forbids a local signer anywhere in `apps/` or `packages/`. So in gate mode, against a third-party
seller, **the purchase leg currently has no execution path that satisfies P4.**

### Why the PRD did not catch this

PRD §26 lists nine kill criteria. **K2 covers the discharge leg only** — "KeeperHub cannot execute
the discharge as a contract call from the Turnkey wallet." No criterion covers the gate being unable
to *pay the seller*, because §5.3 treats the purchase leg as the seller's facilitator's problem. It
is, for broadcasting. It is not for signing, and the gate is the payer.

This is a gap in the kill-criteria list, not a criterion that fired. It is recorded as such in
`docs/kill-criteria.md`.

### The bounds, for whichever option is chosen

Read from the same source, and worth knowing because they are **not user-configurable today**:

- Contract allowlist: Base USDC and Tempo USDC.e only. Chain allowlist: Base (8453), Tempo.
- **Per-transfer cap 100 USDC**; server-side `ask` at 50 USDC, `block` above 100 USDC.
- **Daily cap 200 USDC per UTC day**, returning `429 DAILY_CAP_EXCEEDED`.

None of these binds our campaign: observed live prices are 1000–20000 atomic units, i.e. **0.001 to
0.02 USDC** per call. A 200-call campaign costs roughly 4 USDC. The caps are not the problem. The
recipient pin is.

### Options, with what each costs — OWNER DECISION

**A. Request a sub-organisation without the workflow binding.** Upstream says a different policy set
"is possible but requires an operator action". *Cost:* a permission we do not hold, on someone else's
timeline, before a fixed deadline. Also the weakest link by upstream's own account — the recipient
pin "holds only while the application and those records are intact."

**B. Make KeeperHub's own paid workflows the live counterparty.** They are real x402 sellers, and
`/sign` is built to pay them. *Cost:* the live project in the §2 answer stops being Daydreams and
becomes KeeperHub. The integration becomes "we gate payments to the hackathon host", which is
defensible but is a different submission. Everything about Daydreams in every document changes.

**C. Invert the legs: the buyer pays the seller directly with its own x402 wallet.** The gate
observes, and discharges a separate fee to itself only on `DELIVERED_AS_ADVERTISED`. *Cost:* the gate
stops underwriting, so the buyer keeps the delivery risk on the purchase — which is most of the
product thesis. What remains is a measured delivery record and a conditional fee, which is honest but
much smaller.

**D. Sign the purchase leg outside KeeperHub.** *Cost:* **P4 falls.** "KeeperHub is the only path to
chain" would become false, and it is quoted in the README, in `SECURITY.md`, and in the §2 table as
the reason this submission satisfies "every submission incorporates KeeperHub". Not recommended, and
recorded here only so the option is visible rather than quietly available.

### What is not blocked

The discharge leg, the verdict function, the verifier, the probes, the receipt format and the web
surfaces are all unaffected. G1 stands. If option C is taken, the discharge leg is the *only* leg and
the architecture simplifies rather than breaks.

---

## D-008 · K8 fired: scope cut at the 72-hour boundary · 2026-09-15 · active

### What was decided

**Kill criterion K8 fired at 2026-09-15 10:00 UTC** (72 hours before the Sep 18, 12:00 CEST
deadline). G3 has not passed: no discharge has executed, `evidence/receipts/` is empty, and C-003
sits at R0 with no evidence.

K8's action is executed as written. The cuts:

| Cut | State when cut | Effect |
|---|---|---|
| **Facilitator mode** (`apps/facilitator`) | never built | Committed: it will not be built. Removed from the submission's scope |
| **`ReceiptAnchor`** (`contracts/`) | never built | Committed: it will not be built or deployed. Every claim depending on tamper evidence stays where it is |
| **Endpoint pages → a single table** | **already built and working** | See below |

**Protection order, as K8 specifies: G3, G4, G7, G9 — in that order.** All remaining effort goes
there and nowhere else.

### The third cut is moot, and that is recorded rather than quietly skipped

K8 says to cut the endpoint pages to a single table. `/endpoints` and `/endpoints/[host]` were built
during P1 under the D-004 exception and both work. K8's purpose is to stop effort being spent on
breadth while a gate is unprotected; deleting finished, working pages spends effort to *reduce* the
submission and protects nothing.

So: **no further work goes into the endpoint surfaces, and the existing pages stay.** That is the
cut's intent honoured. Deleting them would be obedience to the letter at the cost of the purpose, and
this entry exists so that choice is visible rather than silent.

### Why K8 firing does not, by itself, save the submission

K8 assumes G3 is reachable once effort is concentrated on it. **It is not.** G3 is blocked on
**D-007**, an OWNER DECISION raised on 2026-09-09 and still unmade six days later.

The chain is: no D-007 decision → the gate cannot pay a third-party seller → no gated call → no
discharge → **no transaction link**. PRD §24 names that link as "the artifact teams most often leave
out", gated by G3 and G9. Without it the submission has no main-track thesis, which is the condition
PRD §26 K2 describes as stopping the build for an `OWNER DECISION`.

Protecting G3 is therefore not an engineering task right now. It is a decision that has not been
made, and no amount of remaining effort substitutes for it.

### What it costs

**Cost 1 — the adoptable path is gone.** Facilitator mode was the answer to "how would anyone else
use this?" Cutting it means the submission demonstrates a mechanism, not a product a seller can
adopt. K6's "no third-party adopter" is now permanent rather than pending.

**Cost 2 — receipts are no longer tamper-evident.** Without `ReceiptAnchor` there is no batch root
and no on-chain anchor, so a published receipt rests on our word that we have not edited it. The
recourse story shrinks to the response-hash commitment alone. Any claim that would have reached R4 by
way of tamper evidence cannot.

**Cost 3 — two of four protected gates are unreachable without D-007.** G3 and G4 both require a
live gated call. G7 requires "a stranger reaches a live gated call and a re-derived receipt", so it
is partly blocked too — the verifier half works today, the live half does not. Only G9 is fully
within reach, and its transaction-link row cannot be filled.

**Cost 4 — the work done is real but unattested.** The verdict function, the verifier, the probes and
the web surfaces all work and are tested. None of that is evidence of the product's central claim,
which is about money moving on a delivery check. At R0/R1, this is a build that demonstrates a
mechanism it has never executed.

### What would still change the outcome

A D-007 decision **today**. Option C (invert the legs — buyer pays the seller directly, gate
discharges a conditional fee through KeeperHub) needs no permission from anyone and no credential we
cannot obtain, and is the only option that can reach a live discharge inside three days. It costs the
underwriting story, which D-001 already recorded as a liability rather than a feature.

With that decision plus mainnet USDC and a KeeperHub API key, G3 and G4 are a day's work. Without it
they are unreachable, and this entry is the record of why.
