# Architecture

Derived from PRD §5, §8, §10, §11. **Phase P1 — the directories below exist; almost none of the code
does.** See `docs/phase.md` for what is in bounds.

---

## The mechanism chain (PRD §5.1)

```
buyer agent  ->  quittance gate: hold signed discharge authorization
             ->  call the live endpoint, pay its x402 requirement
             ->  hash request, response, and the endpoint's advertised terms
             ->  verdict = f(advertised terms, observed response)      [pure]
             ->  KeeperHub executes the discharge, or records a non-discharge
```

The verdict function is **pure and total** and reads only what the receipt commits to. Anything the
gate knows but did not commit to is not an input.

`VerdictState` is exactly seven values:

```
DELIVERED_AS_ADVERTISED   NOT_DELIVERED        SHAPE_MISMATCH   TIMEOUT_EXCEEDED
REQUIREMENTS_MISMATCH     GATE_ERROR           SETTLEMENT_FAILED
```

Only the first is discharge-eligible.

---

## Repository layout (PRD §8.1)

```
.
├── apps/
│   ├── gate/                    # buyer-side gate service (Hono)          [P2]
│   ├── facilitator/             # x402 verify/settle surface, seller-side [P4]
│   └── web/                     # receipts, endpoint records, verify page [P4]
├── packages/
│   ├── quittance-sdk/           # installable buyer client + Lucid adapter [P4]
│   ├── protocol-types/          # zod schemas: receipt, verdict, terms     [P1]
│   ├── reference/               # reference implementation of verdict()    [P1]
│   ├── verifier/                # independent re-derivation, no gate access[P1]
│   └── claim-ledger/            # claims.json + verifier for it            [P1]
├── contracts/                   # ReceiptAnchor only (§10)                 [P2]
│   ├── src/  test/  script/
├── scripts/
│   ├── probe-x402.ts            # read live 402 bodies, fail on drift      [P1]
│   ├── probe-keeperhub.ts       # read live API surface, fail on drift     [P1]
│   ├── campaign.ts              # adversarial + sustained campaign (§14)   [P3]
│   └── verify-mainnet.ts        # re-derive every claim from chain         [P2]
├── docs/
│   ├── phase.md                 # current phase and its stop boundary
│   ├── claims.md                # generated, never hand-edited
│   ├── kill-criteria.md         # generated from §26
│   ├── adr/  runbooks/
├── evidence/                    # receipts, run ids, campaign output
├── deployments/                 # addresses and tx hashes, per network
├── internal/                    # gitignored
└── .github/workflows/ci.yml
```

---

## Gate mode — the public proof path (PRD §8.2, D-001)

1. Buyer posts an intent: target resource, max price, max latency, and a pre-signed discharge
   authorization with a nonce and an expiry.
2. Gate requests the resource, receives 402, parses `accepts[]`, and refuses if the advertised terms
   exceed the intent's caps → `REQUIREMENTS_MISMATCH`, **no purchase, no discharge**.
3. Gate pays and retries the request from its KeeperHub-managed wallet.
4. Gate builds the receipt: advertised terms, request hash, response hash, timings, run context.
5. `verdict()` runs **from the receipt alone**.
6. On `DELIVERED_AS_ADVERTISED`, KeeperHub executes the discharge. Any other state records a
   non-discharge with its reason and executes nothing.
7. Receipt is published and batched.

Step 2 is the only step that can decline before money moves. Every later step is post-purchase, which
is why gate mode is underwriting.

---

## Facilitator mode — the adoptable path (PRD §8.3) [P4]

Quittance exposes the standard x402 facilitator surface. `verify` behaves normally. `settle` runs the
delivery check first and executes through KeeperHub only on `DELIVERED_AS_ADVERTISED`. A seller points
at it by configuration and changes no code.

**Adoption status is a fact, not a claim.** Until a third-party seller points at it, every run in this
mode is labelled `PROJECT_BASELINE` — in the receipt, in the UI, and in `claims.json`.

---

## The two legs

| Leg | Direction | Executor | KeeperHub-executed |
|---|---|---|---|
| **Discharge** | Buyer → gate, USDC | **KeeperHub**, from the pre-signed transfer authorization | **Yes** |
| **Purchase** | Gate → seller, advertised price | The seller's own facilitator | **No** |

---

## KeeperHub surfaces used (PRD §8.4)

| Surface | Use | Pinned reference |
|---|---|---|
| Turnkey-backed wallet | Signing | `.agents/skills/keeperhub/references/turnkey-wallet.md` |
| Contract call action | The discharge | `direct-execution.md`, `cli-execute-contract-call.md` |
| Webhook trigger | Start a gated run from the gate service | `webhook-trigger.md` |
| Schedule trigger | The sustained campaign | `schedule-trigger.md` |
| Executions API | Run ids and logs — the audit half of every receipt | `executions-api.md` |
| Dry run | Before the first live discharge of each shape | `direct-execution.md` |
| Retry and failure handling | **As shipped, not reimplemented** | `execution-recovery.md` |

Chain list and action schemas are read from the API at startup, never compiled in (PRD §17).

---

## Protocol-fact discipline (PRD §17)

`scripts/probe-x402.ts` and `scripts/probe-keeperhub.ts` run at startup and on a CI schedule. On
mismatch the service enters `PROTOCOL_CONFIG_CHANGED` and **stops gating rather than guessing.**

`packages/protocol-types` models x402 **v1 and v2 as distinct, discriminated schemas.** They are not
normalised into one another, because their fields do not correspond one-to-one — see D-002.

---

## Contract — `ReceiptAnchor` (PRD §10) [P2]

One contract, or none. It exists only to make the receipt log tamper evident.

- One function, one event: `anchor(bytes32 root, uint64 count)` emitting
  `ReceiptBatch(root, count, epoch, sender)`.
- No token, no upgradeability, no proxy, no pause, no owner beyond a single writer address.
- Receipt leaves are `sha256` of the canonicalized receipt. The batching script and
  `packages/verifier` build the tree **independently** from the published receipts.
- If it is not deployed by the P2 gate boundary it is **cut**, and every claim depending on tamper
  evidence drops a rung.

The discharge itself needs no custom contract — it is a transfer authorization executed against the
asset the endpoint advertised.

---

## SDK and verifier (PRD §11)

`@quittance/sdk` [P4]:

- `gatedFetch(url, { maxPrice, maxLatencyMs, retain })` — a drop-in for the paid-fetch call an agent
  already makes. One line to adopt.
- A Lucid adapter so a Daydreams agent routes paid calls through the gate without restructuring.
- Returns the response **and the receipt together**. The receipt is not optional and not a callback.

`packages/verifier` [P1]:

- `quittance verify <receipt.json>` — runnable with **no API key, no account, and no network access
  beyond a public RPC**.
- **Zero dependency on our hosted service.** If verification needs us, it is not verification.

---

## Data flow for a single gated call

```
intent ──▶ [gate] ──402──▶ endpoint          (advertised terms read from the response)
             │
             ├─ caps exceeded? ──▶ REQUIREMENTS_MISMATCH ──▶ no purchase, no discharge
             │
             ├─ pay purchase leg (seller's facilitator broadcasts) ──▶ retry request
             │
             ├─ hash(request) · hash(response) · hash(advertised terms) · timings · run id
             │
             ├─ receipt ──▶ verdict(advertised, observed)          [pure, from receipt alone]
             │                    │
             │                    ├─ DELIVERED_AS_ADVERTISED ──▶ KeeperHub executes discharge
             │                    └─ any other state ───────────▶ record non-discharge + reason
             │
             └─ publish receipt ──▶ batch ──▶ ReceiptAnchor.anchor(root, count)
```

Anyone holding the receipt can re-run the verdict box without holding anything else.
