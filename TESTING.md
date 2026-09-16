# Test this yourself

Quittance claims that delivery is measured, that the measurement releases the money, and that
**anyone can re-derive the verdict without asking us**. This page is how you check that, in
increasing order of effort.

Steps 1 and 2 need **nothing**: no account, no key, no funds, no install.
Step 3 needs a clone. Step 4 needs your own funded wallet.

Live site: **https://quittance-web-3g54.vercel.app**
Source: **https://github.com/Dotman-Bei/Quittance**

---

## 1 · In the browser, 2 minutes, nothing installed

### 1.1 The ledger is real

Open **`/receipts`**. Every row is a real gated call against a live third-party x402 endpoint on
Base mainnet.

Pick any row with a transaction and open it on BaseScan. You are looking at a USDC transfer that
happened because a delivery check passed.

### 1.2 Find a call that was NOT paid for

Filter the ledger to **`NOT_DELIVERED`**. Open one on host **`api.onesource.io`**.

The receipt shows HTTP **502** and **no discharge transaction**. That endpoint took payment and
returned nothing usable, so no fee was charged. **The absence of a transaction is the point** — it is
the thing the product exists to produce.

### 1.3 Re-derive a verdict in your own browser

Open **`/verify`**.

1. Go back to any receipt page, copy the **canonical receipt JSON** shown at the bottom
2. Paste it into the left box on `/verify`, press **Re-derive**

It says *"The published verdict matches an independent re-derivation."* That ran in **your** browser,
using the same function the gate used. Nothing was sent to us.

**Now break it.** Change `"httpStatus": 200` to `502` and re-derive. The verdict flips to
`NOT_DELIVERED` and a mismatch banner appears, as loud as agreement. Change `latencyMs` to something
huge — `TIMEOUT_EXCEEDED`.

**Disconnect your network and re-derive again.** It still works. If verification needed us, it would
not be verification.

### 1.4 Check we are not flattering ourselves

- **`/endpoints`** — every endpoint under 20 calls says `INSUFFICIENT SAMPLE`, never a percentage
- Landing page — third-party calls and `PROJECT_BASELINE` (our own endpoint) are counted
  **separately** and never summed
- Landing page, *Corpus notes* — it reports **"Receipts whose published verdict does not re-derive: 2"**.
  Those two are ours, from a bug found by re-deriving the corpus from a clean clone. They are kept on
  purpose; `evidence/receipts/README.md` names them and explains the cause

---

## 2 · Verify against the chain, no install

Take any receipt with a `dischargeTxHash` and check it directly on
**`https://basescan.org/tx/<hash>`**.

You should see a `Transfer` event on the Base USDC contract for the fee amount. The receipt commits
to that transaction; the chain confirms it independently of anything we say.

Worked examples:

| What | Transaction |
|---|---|
| First fee executed through KeeperHub | [`0x015f4520…`](https://basescan.org/tx/0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852) |
| Duplicate submission → **exactly one** discharge | [`0xa65b14a8…`](https://basescan.org/tx/0xa65b14a881352663f343506be15cdad4f9fbf467cac0ebf928479bcff2386ccd) |

---

## 3 · From a clean clone, ~5 minutes

Requires Node 20+ and pnpm. **No key, no account, no funds.**

```bash
git clone https://github.com/Dotman-Bei/Quittance.git && cd Quittance
pnpm install
pnpm build
```

### 3.1 Re-derive the entire published corpus

```bash
for f in evidence/receipts/*.json; do
  node packages/verifier/dist/cli.js verify "$f" || echo "MISMATCH: $f"
done
```

Every receipt re-derives except the two we document. Each file is named by its own leaf hash — the
sha256 of its canonicalized contents — so the filename is itself a checkable claim.

### 3.2 Confirm the verdict function is pure and total

```bash
pnpm test
```

Property tests run thousands of generated envelopes: the verdict is deterministic, never throws, does
not mutate its inputs, and is independent of evaluation order. Canonicalization round-trips
byte-identically.

### 3.3 Read live protocol terms yourself

```bash
export PROBE_X402_TARGETS="https://api.onesource.io/api/chain/block-number"
export KEEPERHUB_API_BASE_URL="https://app.keeperhub.com"
pnpm probe:all
```

This reads a live seller's advertised terms and KeeperHub's chain list **at runtime**. No address,
price, ABI or facilitator URL is compiled into this repository — the probe fails closed rather than
guessing.

### 3.4 Confirm the documentation we relied on has not drifted

```bash
pnpm skills:verify
```

Re-hashes 47 vendored upstream files against `skills-lock.json`. Every claim about x402, KeeperHub or
Lucid traces to a pinned file, not to memory.

### 3.5 Check we have not overclaimed

```bash
pnpm claim:verify
```

Fails if any claim states a rung its evidence does not reach, cites a file that does not exist, uses
forbidden vocabulary, or colours a verdict.

---

## 4 · Run a live gated call, with your own wallet

This is the only part that costs anything — about **$0.001**.

You need a wallet holding USDC on Base that can sign EIP-712, and a KeeperHub account.
**We supply neither on purpose:** the buyer is a separate actor and holds its own key. This codebase
contains no signer.

```bash
cp .env.example .env     # fill in the values it names
pnpm --filter @quittance/gate build
node apps/gate/dist/index.js         # :8787
```

Ask for a quote:

```bash
curl -s -X POST localhost:8787/quote -H 'content-type: application/json' -d '{
  "url": "https://api.onesource.io/api/chain/block-number",
  "intent": {"maxPriceAtomic":"5000","maxLatencyMs":20000,"retain":"full",
             "authorizationNonce":"judge-1","authorizationExpiry":1893456000}}' | jq
```

Then set `maxPriceAtomic` to `"1"` and repeat — it returns `REQUIREMENTS_MISMATCH` with
`purchased: false`. **It refused before any money could move.**

To complete a call, sign the two EIP-3009 authorizations with your wallet (one paying the seller, one
authorising the fee) and POST them to `/call`. Full detail in the README.

### The adversarial endpoint

To watch every verdict state fire without hunting for a broken seller:

```bash
pnpm --filter @quittance/baseline build
BASELINE_ASSET=<usdc> BASELINE_NETWORK=eip155:8453 BASELINE_PAY_TO=<addr> \
  node apps/baseline/dist/index.js    # :8788
```

`/baseline/{ok,empty,mime,slow,fail}` produce `DELIVERED_AS_ADVERTISED`, `NOT_DELIVERED`,
`SHAPE_MISMATCH`, `TIMEOUT_EXCEEDED` and `NOT_DELIVERED` respectively. **Every run against it is
labelled `PROJECT_BASELINE`** and is never counted as third-party adoption.

---

## What you should conclude, and what you should not

**Established:** delivery is measured structurally; the measurement is re-derivable by anyone from
the receipt alone; value moves through KeeperHub only on `DELIVERED_AS_ADVERTISED`; a duplicate
submission produces exactly one discharge.

**Not established, and we do not claim it:**

- **Quittance does not protect the buyer.** The buyer pays the seller directly. A failed call leaves
  them out the purchase price and we recover nothing. The only thing that changes is that **we are
  not paid**.
- **Structural conformance is a low bar.** An endpoint can pass every check and return useless
  content. Correctness and quality are never measured.
- **The gate is the only observer of the response bytes**, and it earns a fee when it reports
  delivery. That incentive is real. The receipt's `sha256(response)` commitment is the only check on
  it, and it requires someone to hold the bytes and bother.
- **Most non-discharges in our own data were our fault.** Of 60 sellers paid, 13 did not deliver —
  but 11 of those were malformed requests from us. Only 2 are clean seller failures.

The long version, written against this project on purpose, is
[WHAT_IS_MEASURED.md](WHAT_IS_MEASURED.md).
