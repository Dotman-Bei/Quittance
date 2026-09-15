# Design System

Authority: **PRD §18 for tokens and copy. `frontend.md` for structure.** Where the two conflict,
§18 wins and the conflict is itemised in `DECISIONS.md` D-003.

`apps/web` is a **P4** deliverable. This file is written now so that P4 is execution rather than
redesign. **No component in this document has been built.** See `docs/phase.md`.

---

## 1. Non-negotiables

These are product-integrity rules, not taste.

1. **No green anywhere in the palette.** There is no pass badge, no green LED, no success hue.
2. **A discharge and a non-discharge render with the same visual weight**, distinguished by label,
   not by reassurance. Non-discharges are first-class content.
3. **No fabricated metric ever ships.** Empty is the honest state and renders as "no runs yet",
   never hidden, never a spinner, never a placeholder number.
4. **No compiled-in protocol fact** — no network name, block height, contract address, price, header
   name, or facilitator URL as a literal. Anything of that kind is a probe output at runtime or it is
   absent from the page.
5. **Monospace with `tabular-nums` and `tnum` on every number** — amounts, latencies, counts, hashes.
6. **Under 20 gated calls → `INSUFFICIENT SAMPLE`**, never a percentage.
7. **Forbidden vocabulary** (`guaranteed`, `safe`, `trustless`, `refund`, `insured`,
   `verified quality`) fails `pnpm claim:verify` in any UI string, and so does any synonym making the
   same unearned promise.
8. `PROJECT_BASELINE` and `LOCAL FIXTURE` labels are rendered wherever the data carries them.

---

## 2. Tokens (PRD §18)

Tokens live in **one `@theme` block** in `globals.css`, copied from this section, with `§18` cited in
the CSS comment.

### Colour — deep ink base, one warm accent, one muted secondary

Neutral ramp named in plain words, not in numbers.

| Token | Role |
|---|---|
| `--ink` | Deep ink base. The page ground |
| `--ink-raised` | Raised surface: cards, table rows |
| `--ink-sunken` | Sunken surface: code blocks, input wells |
| `--rule` | Hairline dividers and card borders |
| `--rule-strong` | Emphasised divider, table header underline |
| `--quiet` | Muted body text, captions, secondary labels |
| `--plain` | Default body text |
| `--loud` | Headings, primary numbers, emphasised text |
| `--accent` | **The one warm accent.** Focus rings, the single signature motif, the primary action |
| `--accent-quiet` | Accent at low emphasis: hairlines, hover grounds |
| `--secondary` | **The one muted secondary.** Callouts only — limitation notes, disclosure boxes |

There is no per-verdict hue. There are eleven colour tokens and none of them is green.

### Type

| Role | Size / treatment |
|---|---|
| Body | **14px** |
| Caption | **10px** |
| Numbers, hashes, amounts, latencies, run ids | Monospace, `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1` |

### Space and shape

| Token | Value |
|---|---|
| Section spacing | **48px** |
| Element spacing | **24px** |
| Radius — default | **8px** |
| Radius — chip | **2px** |
| Radius — featured | **12px** |
| Container | **1280px** |

### Motion and focus

- **`prefers-reduced-motion` guard at the very top of `globals.css`**, before any other rule.
- Focus rings: **2px accent, 2px offset, keyboard only** (`:focus-visible`).
- **One signature motif, used once.** Not repeated per card, per badge, or per section. It appears in
  exactly one place on the whole site.

### CSS workarounds

**Every CSS workaround carries a comment naming the browser mechanism it works around.** A workaround
without that comment is a review rejection.

---

## 3. Verdict rendering

`frontend.md` proposes a six-hue badge matrix (indigo / rose / amber / violet / red). It is **not
adopted**: assigning indigo to `DELIVERED_AS_ADVERTISED` and rose to `NOT_DELIVERED` re-creates
pass/fail colour semantics that §18 removes on purpose, and it makes the palette five accents wide
against §18's one-plus-one.

**The adopted encoding is label + glyph + position, at uniform weight:**

| State | Glyph | Weight |
|---|---|---|
| `DELIVERED_AS_ADVERTISED` | filled square | same as every other row |
| `NOT_DELIVERED` | hollow square | same |
| `SHAPE_MISMATCH` | half square | same |
| `TIMEOUT_EXCEEDED` | clock glyph | same |
| `REQUIREMENTS_MISMATCH` | split square | same |
| `GATE_ERROR` | struck square | same |
| `SETTLEMENT_FAILED` | struck square, doubled rule | same |

The **full enumerated state name is always shown in monospace.** It is never abbreviated to a symbol
alone, never truncated, and never replaced with "OK" or "Failed". A colour-blind reader and a
grayscale printout must both convey the whole signal — which they do, because colour carries none of it.

`GATE_ERROR` and `SETTLEMENT_FAILED` are **our** failures, not the seller's, and the badge says so in
its adjacent caption.

---

## 4. Component architecture

Adopted from `frontend.md` §2 essentially verbatim — the decomposition is sound and only the token
layer was in conflict.

```
apps/web/
├── app/
│   ├── layout.tsx                # Root layout, token injection, prefers-reduced-motion guard
│   ├── page.tsx                  # Landing: thesis, mechanism block, live evidence table
│   ├── receipts/
│   │   ├── page.tsx              # Receipts stream, newest first, filtering, pagination
│   │   └── [hash]/page.tsx       # Receipt deep dive: breakdown, raw JSON, re-derive command
│   ├── endpoints/
│   │   ├── page.tsx              # Endpoint directory
│   │   └── [host]/page.tsx       # Delivery record: calls, discharges, non-discharges by reason
│   └── verify/
│       └── page.tsx              # Client-side re-derivation, zero dependency on our service
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            # Tabs: Overview · Receipts · Endpoints · Verify
│   │   ├── Footer.tsx            # Protocol, developer, and submission links
│   │   └── CommandPalette.tsx    # Cmd+K lookup for hashes and hosts
│   ├── dashboard/
│   │   ├── EvidenceTable.tsx     # Ledger of gated calls
│   │   ├── MechanismStepper.tsx  # The §5.1 chain, five nodes
│   │   ├── SummaryStats.tsx      # Counts only — see §5 below
│   │   └── VerdictBadge.tsx      # Enumerated state, label + glyph, uniform weight
│   ├── receipt/
│   │   ├── ReceiptViewer.tsx     # Canonical JSON inspector
│   │   ├── DiffTermsView.tsx     # Advertised vs observed comparator
│   │   └── CliReDerive.tsx       # Copy-paste block for local re-derivation
│   └── ui/
│       ├── Button.tsx  Card.tsx  Tabs.tsx  Drawer.tsx
└── lib/
    ├── types.ts                  # Re-exports packages/protocol-types. Never a second definition
    └── verifier.ts               # Re-exports packages/reference. Never a second implementation
```

**`lib/types.ts` and `lib/verifier.ts` re-export the packages. They never re-implement them.** A
second copy of the verdict function in the web app would make the client-side verifier a different
program from the one that decided the money, which defeats `/verify` entirely.

---

## 5. Surface-by-surface rules (PRD §9)

| Surface | Success state | Failure state |
|---|---|---|
| Landing | Thesis in three sentences, mechanism block, live evidence table with real hashes | Evidence table **empty and labelled "no runs yet", never hidden** |
| `/receipts` | Newest first: verdict state, endpoint host, amount, run id, tx link | Empty state **names the reason**, not a spinner |
| `/receipt/:hash` | Full receipt, the advertised terms it was judged against, and **the exact command to re-derive it** | Non-discharge receipts render **identically**, with the reason code, never styled as errors to dismiss |
| `/endpoints/:host` | Delivery record: calls, discharges, non-discharges by reason, window | Under 20 calls renders **`INSUFFICIENT SAMPLE`**, not a percentage |
| `/verify` | Paste a receipt, get the re-derived verdict **client side** | Mismatch displayed **as loudly as a match** |

### `SummaryStats` — the replacement for the Bento grid

`frontend.md` §3.2 specifies four hero metric cards with values baked in (`12,482.50 USDC`,
`94.2%`, `184ms`, `48 Live Hosts`). Those numbers ship as **zero, or the component does not render.**

Rules:

- Every figure is read from the receipt corpus at request time, or the card shows `—`.
- With no runs recorded, the grid renders one line: **"no runs yet"**, and nothing else.
- A percentage appears only above the 20-call floor. Below it: `INSUFFICIENT SAMPLE`.
- Counts of third-party calls and `PROJECT_BASELINE` calls are **shown separately, never summed into
  a headline.**
- Transient infrastructure errors are shown in their own row, labelled as ours, and are never folded
  into any endpoint's delivery record.

### `MechanismStepper`

Five nodes, matching PRD §5.1 exactly: **Buyer Intent → x402 Probe → Call & Hash → Pure Verdict →
Settlement Leg.** Node 5 must state in its own label that it is the **discharge** leg and that the
**purchase** leg is not KeeperHub-executed. That distinction is the single most likely thing for a
viewer to get wrong, and the diagram is where it gets corrected.

### `/endpoints/[host]`

Adopted from `frontend.md` §3.6, plus one addition required by D-002: a **"checks available"**
column. It records, per endpoint, whether a `mimeType` was advertised, whether a schema was
advertised, and which x402 version the seller spoke. Without it, an endpoint checked on four
dimensions is compared against one checked on two, and the comparison is meaningless.

The reason-code breakdown is a horizontal stacked bar. **It is not coloured by good/bad.** Segments
are distinguished by fill pattern and are labelled inline.

### `/verify`

Drop zone or textarea, re-derivation via Web Crypto **in the browser**, and a result panel that shows
the declared response hash beside the computed one. A mismatch is rendered at the same scale and
prominence as a match — larger, if anything. This page must work with the network disconnected after
load.

---

## 6. Copy rules

- The hero states the thesis in three sentences and does **not** say "zero blind trust". The gate
  **is** a trusted observer of response bytes (PRD §6), and the landing page may not imply otherwise.
- Every page reachable from the nav links to `WHAT_IS_MEASURED.md`.
- The footer's closing line carries no forbidden stem. Adopted wording:
  **"A deterministic, structural delivery ledger. Not a quality assessment, and not a financial
  assurance of any kind."**
- Network name, chain, and service health are **rendered from probe output or omitted.** Never typed
  into JSX.
- Host names in any mock, story, or fixture are obviously fictitious and are never defaults or
  fallbacks.

---

## 7. Accessibility

- Colour is never the sole carrier of meaning — by construction, since verdicts carry none.
- Focus rings 2px accent at 2px offset, `:focus-visible` only.
- `prefers-reduced-motion` honoured at the top of `globals.css`; the stepper and any transition
  degrade to instant state changes.
- Tables use real `<table>` semantics with scoped headers. The evidence ledger is a table, not a grid
  of divs.
- Every glyph in the verdict matrix has a text label beside it, always rendered, never
  `sr-only`-only.
