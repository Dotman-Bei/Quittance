**Quittance is a delivery gate for x402.** It measures whether a paid API call actually delivered what the endpoint advertised, publishes a receipt anyone can re-derive, and releases the fee on Base mainnet through KeeperHub **only when delivery holds.**

📺 **[Watch the 5-minute demo](https://youtu.be/F8fvQNC44wE)** — failure path shown before the success path
🌐 **[Live app](https://quittance-web-3g54.vercel.app/)** · 💻 **[Source](https://github.com/Dotman-Bei/Quittance)**

---

## The problem

x402 splits a paid call into two steps: **verification** checks a signed payload off-chain and moves no funds; **settlement** broadcasts it and moves the money. The actual work sits between them, and the protocol says nothing about it.

Two orderings ship today, and both are one-sided:

- **verify → work → settle** — the seller works, then finds out if settlement lands. The seller carries the loss.
- **verify → settle → work** — money moves first. If the work fails, the buyer holds an orphan payment.

Whoever writes the resource server picks the ordering. A buyer's protection is therefore a property of the *seller's* code. The only substitute today is reputation metadata — self-reported uptime, a directory rank, a star count. None of it is derived from whether the last thousand paid calls returned anything.

## What Quittance does

It sits between a buying agent and a paid x402 endpoint:

1. **Reads the endpoint's own 402 response** at call time — terms are never cached or compiled in.
2. **Relays the call**, then hashes the request, the response, and the advertised terms into a receipt.
3. **Runs a pure function** over that receipt to produce one of **7 verdict states**.
4. **Discharges the fee through KeeperHub** — and only on `DELIVERED_AS_ADVERTISED`. Every other outcome publishes a non-discharge with its reason and moves no money.

The decision function is pure and separately packaged, so **a stranger can re-derive any published verdict from the receipt alone**, with no login and no access to our infrastructure:

```bash
git clone https://github.com/Dotman-Bei/Quittance && cd Quittance
pnpm install && pnpm build
node packages/verifier/dist/cli.js verify evidence/receipts/<any-receipt>.json
```

Or paste any receipt into **[/verify](https://quittance-web-3g54.vercel.app/verify)** in the browser — no install at all.

## What is actually live

Not a simulation. Real USDC on Base mainnet, against third-party endpoints from the public x402 discovery index.

| | |
|---|---|
| Gated calls executed | **343** |
| Distinct third-party hosts | **32** |
| Fee transactions on Base mainnet | **303** |
| Verdicts | 303 `DELIVERED_AS_ADVERTISED` · 40 `NOT_DELIVERED` |
| Corpus span | 46.6 hours |
| Sustained campaign | 130 calls over 24h 26m — 114 discharges, 16 non-discharges, **0 infrastructure errors** |
| Acceptance gates passing | **9 of 10** |

Every receipt re-derives byte-identically, and that is **enforced in CI** — a receipt that stops re-deriving fails the build.

## The KeeperHub integration

KeeperHub is the **only** path to chain in this codebase. No signer, no write client, and no private key exists anywhere in `apps/` or `packages/` — that is enforced as a structural property, not a convention.

| Surface | Use |
|---|---|
| `GET /api/chains` | 24 chains read live at startup; nothing hardcoded |
| Contract call action | Executes the fee leg — a pre-signed EIP-3009 `transferWithAuthorization` on Base mainnet. **303 executed runs.** |
| Turnkey-backed wallet | Custody for the fee recipient; keys never leave the enclave |
| Executions API | Run IDs and logs recorded in **every** receipt as an audit trail |

Example: tx [`0x015f4520…`](https://basescan.org/tx/0x015f4520b2e897fa392ac63ab863d4d1d52452682dc9fafbfe4be5c96f160852), KeeperHub run `b56dusna0v6diklwih7eu`.

**Idempotency is proven, not assumed.** Replaying the same authorization nonce returns the same `executionId` and the same tx hash with `idempotentReplay: true` — no second transfer. Duplicate settlement is the failure mode that would make this system worse than useless, so it has its own acceptance gate.

## The live counterparty

**Daydreams** is the project this integrates with. The Lucid Agents Commerce SDK is vendored at pinned commit `3d9fa1d2` (15 files, SHA-256 verified in CI, never read from memory), and the gate's call path is built to sit in front of a Lucid agent's paid calls — read the seller's terms, relay, measure, then settle. `XGate`-listed x402 resources and Dreams Router are the same protocol surface this gate speaks.

**What we verified, and what we did not.** The 343 calls went to live x402 sellers from the public discovery index — the shared pool that XGate-listed resources publish into. We did **not** verify that any individual host among the 32 is XGate-listed specifically, and our own kill criterion K1 requires us to say so rather than imply the stronger claim. The Lucid adapter that would let a Daydreams agent route through the gate without restructuring is scoped in `ARCHITECTURE.md` and **not built**.

**KeeperHub is the second live project here, and that integration is not partial.** 303 executions against production infrastructure, Turnkey custody, run IDs in every receipt. It is the only path to chain in the codebase.

## What we found upstream

Building against live infrastructure surfaced two real conformance problems, both **filed upstream** and both re-verified live before filing:

- **[x402-foundation/x402#3510](https://github.com/x402-foundation/x402/issues/3510)** — a live resource advertises `amount: "0.111"` where the spec requires atomic units, and the spec states no constraint a validator can cite.
- **[x402-foundation/x402#3511](https://github.com/x402-foundation/x402/issues/3511)** — a resource's bazaar `info.input` declaration *changes depending on which HTTP method you probe it with*, producing a catalog entry no client can execute.

Both cost us real failed calls before they were understood.

## What still breaks

Stated the same way in the repo, the README, and the demo:

**1. Quittance does not protect the buyer.** The buyer pays the seller directly from its own wallet. A failed call still costs them the purchase price and we recover nothing. The only thing that changes on failure is that **we are not paid.**

**2. Structural conformance is a low bar.** Measured across 38 live sellers: all 38 publish a `mimeType`, **none publishes a response schema**, and x402 has no response-latency field in either version. So the check is HTTP status, non-empty body, declared MIME type, and latency against the buyer's own stated ceiling. An endpoint can pass every check and return content that is useless.

**3. We are a trusted observer.** The receipt proves what we saw, not what happened. Making that trustless needs attestation we did not build.

**4. The 40 non-discharges are not a seller scorecard.** In the sweep that produced most of them, **11 of 13 failures were our own malformed requests** — unsubstituted path placeholders and missing API keys the sellers openly declare. Endpoint pages show which checks were available, so our error rate cannot be read as theirs.

---

**[Repo](https://github.com/Dotman-Bei/Quittance)** · **[Live app](https://quittance-web-3g54.vercel.app/)** · **[Demo](https://youtu.be/F8fvQNC44wE)** · MIT
