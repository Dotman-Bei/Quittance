---
name: lucid-sdk
description: The Lucid Agents Commerce SDK from Daydreams — the live counterparty for this integration. Covers paid-service calls, x402 payment methods, discovery, retries and idempotency, budgets and policies, wallets, and adapter scaffolding. Use when building the Lucid adapter in packages/quittance-sdk or when calling a Daydreams-listed endpoint.
---

# Lucid SDK (Lucid Agents)

**Pinned upstream: `daydreamsai/lucid-agents` @ branch `master`, commit `3d9fa1d2ffef98efe4a0490e2434561799de41f4`.**
Every file in `references/` is pinned by SHA-256 in `../../../skills-lock.json`.

`references/upstream-SKILL.md` is upstream's **own** agent skill, vendored verbatim. The files
alongside it named `x402-payments.md`, `discovery-tasks.md`, `identity-wallets.md`,
`adapters-scaffolding.md`, `runtime-entrypoints.md` and `troubleshooting.md` are its own
`references/`, vendored at the same commit.

## Why this is the live counterparty

PRD §2 targets **Best Integration into a Live Project**, and Daydreams — Lucid endpoints, listed
x402 resources, the Dreams Router — is that project. The integration must work against the actual
project, not a local imitation.

**The public proof path calls third-party endpoints only.** Our own endpoint exists for adversarial
tests and is labelled `PROJECT_BASELINE` in the receipt, in the UI, and in `claims.json`. It is never
counted as third-party adoption and never counted as market demand.

## What Quittance builds against it

- **A Lucid adapter** in `packages/quittance-sdk`, so a Daydreams agent routes its paid calls through
  the gate without restructuring. One line to adopt.
- **`gatedFetch(url, { maxPrice, maxLatencyMs, retain })`** — a drop-in for the paid-fetch call an
  agent already makes. Returns the response **and the receipt together**; the receipt is not optional
  and not a callback.

If the adapter turns out to be generally useful, it is offered upstream to the Lucid SDK as a PR —
under a **separate BUIDL** if any prize is attached (PRD §2, §20).

## Read before writing the adapter

**Do not work from memory about the Lucid SDK.** Package versions and generated adapter shape are
part of the API — upstream's own skill says so. Inspect the pinned references first; if upstream
contradicts `PRD.md`, upstream wins and the discrepancy is recorded in `DECISIONS.md`.

## Reference index

Upstream's own skill and its references:

- `upstream-SKILL.md` — upstream's agent skill, verbatim
- `x402-payments.md` — how Lucid handles x402 payment methods
- `discovery-tasks.md` — discovery and task surfaces
- `identity-wallets.md` — identity and wallet model
- `adapters-scaffolding.md` — adapter shape and scaffolding
- `runtime-entrypoints.md` — runtime entrypoints
- `troubleshooting.md` — known failure modes

Upstream documentation:

- `PAYMENTS.md` — the payments architecture
- `ARCHITECTURE.md` — SDK architecture
- `buy-call-paid-service.mdx` — calling a paid service as a buyer
- `buy-discovery.mdx` — finding listed resources
- `buy-retries-idempotency.mdx` — **retries and idempotency**, directly relevant to C-005 and G10
- `buy-policies-budgets.mdx` — caps and budgets, relevant to `REQUIREMENTS_MISMATCH`
- `build-receive-x402.mdx` — the seller side, relevant to facilitator mode
- `integrate-agent-frameworks.mdx` — framework integration surface

## Kill criterion in scope

**K1:** if no live Daydreams-listed endpoint returns a parseable 402 on the target network, escalate
to any live x402 seller reachable through the index, rename the counterparty **in every document**,
and state the substitution in the README and the form answer.

**Never call our own endpoint the live project.**
