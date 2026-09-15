---
name: keeperhub
description: KeeperHub execution layer — Turnkey-backed wallets, direct execution (contract call and transfer), webhook and schedule triggers, the Executions API, and retry/recovery behaviour. Use whenever writing or reviewing any code that moves value, because KeeperHub is the only path to chain in this repository (PRD §12, P4).
---

# KeeperHub

**Pinned upstream: `KeeperHub/keeperhub` @ branch `staging`, commit `801dfd573ac0c4a12b39010e404069ccca900d78`.**
Every file in `references/` is pinned by SHA-256 in `../../../skills-lock.json`.

## Read this before writing execution code

**Do not work from memory about KeeperHub.** Do not invent an endpoint path, a request field, an
action schema, or an error code. Read the reference file, cite it, and if upstream contradicts
`PRD.md`, **upstream wins** — record the discrepancy in `DECISIONS.md` (PRD §0, rule 3).

## Why this skill is load-bearing here

PRD §12 states property **P4: KeeperHub is the only path to chain in this codebase.** There is no
raw signer, no write client, and no private key in `apps/` or `packages/`. Every value movement in
Quittance is a KeeperHub execution. If you cannot find how to do something through KeeperHub, the
answer is not to reach for a local signer — it is to read further, or to escalate under kill
criterion K2.

## Surfaces used by Quittance (PRD §8.4)

| Surface | Purpose in Quittance | Reference |
|---|---|---|
| Turnkey-backed wallet | Signing. Keys never leave the enclave | `references/turnkey-wallet.md` |
| Contract call action | **The discharge leg** — executes the buyer's pre-signed transfer authorization | `references/direct-execution.md`, `references/cli-execute-contract-call.md` |
| Token transfer action | K2 fallback if the contract call cannot execute | `references/cli-execute-transfer.md` |
| Webhook trigger | Starts a gated run from the gate service | `references/webhook-trigger.md` |
| Schedule trigger | Drives the sustained campaign (PRD §14, G5) | `references/schedule-trigger.md` |
| Executions API | Run ids and logs — **the audit half of every receipt** | `references/executions-api.md`, `references/cli-execute-status.md` |
| Dry run | Before the first live discharge of each shape | `references/direct-execution.md` |
| Retry / failure handling | **Used as shipped, never reimplemented** | `references/execution-recovery.md` |
| Chain list | Read at startup; never compiled in (PRD §17) | `references/chains.md` |
| Authentication | Execute-only API key handling | `references/api-authentication.md`, `references/api-keys.md` |
| Errors | Error codes, verbatim — never invented | `references/errors.md` |

## Non-negotiables when using this API

1. **Never print, log, or commit a KeeperHub API key or a Turnkey credential** (PRD §0.6).
2. **The chain list and action schemas are read from the API at startup**, not hardcoded (PRD §17).
   On mismatch, the service enters `PROTOCOL_CONFIG_CHANGED` and stops gating rather than guessing.
3. **Every receipt carries its KeeperHub run id.** Run log lines that mattered to the verdict are
   referenced by id, not copied (PRD §15).
4. **Every discharge is idempotent by authorization nonce.** Duplicate submissions are rejected
   before execution. If two discharges ever land for one authorization, K7 fires.
5. **Retry and failure handling is KeeperHub's, as shipped.** Do not build a competing retry loop
   around it; you will double-execute.

## Reference index

- `api-overview.md` — the API surface
- `api-authentication.md`, `api-keys.md` — auth and key scoping
- `direct-execution.md` — contract call and transfer execution, dry run
- `executions-api.md` — run ids, status, logs
- `errors.md` — error codes
- `chains.md` — supported chains, read at startup
- `turnkey-wallet.md` — enclave-backed signing
- `webhook-trigger.md` — inbound trigger
- `schedule-trigger.md` — scheduled trigger
- `first-verified-transaction.md` — end-to-end first execution walkthrough
- `execution-recovery.md` — retry and recovery semantics
- `cli-execute-contract-call.md`, `cli-execute-transfer.md`, `cli-execute-status.md` — CLI surface
- `workflow-execution-runtime.md` — execution runtime internals

## Upstream contribution (PRD §20)

Real friction found while integrating — an ambiguous field, a doc gap, a reproducible bug — is filed
upstream with exact requests, responses and run ids. Manufactured issues are not filed.
