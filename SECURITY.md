# Security Model

Derived from PRD §12 and §6. This file describes properties the build must hold, not aspirations.

**Nothing in this document has been executed or tested.** The repository is at phase P1 and every
claim sits at R0. Read this as the specification the implementation is measured against.

---

## Assets

| Asset | Where it lives | Loss looks like |
|---|---|---|
| Buyer funds in flight | Pre-signed discharge authorization, capped and nonced | A discharge fires for a call that did not deliver |
| Gate fee revenue | Claimed only on `DELIVERED_AS_ADVERTISED` | A wrong verdict earns a fee that was not due, or forgoes one that was (D-009, Cost 5) |
| Receipt integrity | `evidence/`, the batch root, the anchor contract | A published receipt is mutated after the fact and the verdict no longer re-derives |
| KeeperHub credentials | Environment only, never source | An attacker can execute actions as us |

---

## P4 — KeeperHub is the only path to chain

**This is a property, not an aspiration, and CI fails the build if it is violated.**

- No `viem` / `ethers` / `web3` write client anywhere in `apps/` or `packages/`.
- No raw signer, no `WalletClient`, no `privateKeyToAccount`, no `signTransaction`,
  no `sendTransaction`.
- No private key, mnemonic, seed phrase, or Turnkey credential in `apps/` or `packages/` — in source,
  test fixture, comment, snapshot, or committed `.env`.
- Read-only RPC clients are permitted, and only for reading.
- Keys never leave Turnkey. The host holds an API key that can **execute**, not sign arbitrary
  payloads.

If KeeperHub cannot execute the discharge as a contract call, the fallback is a **KeeperHub-executed
token transfer** (PRD §26 K2) — never a local signer. If neither executes, the build stops for an
`OWNER DECISION`.

Never print, log, or commit a private key, a Turnkey credential, or a KeeperHub API key.

---

## Adversaries and required properties

| Adversary | Attack | Required property |
|---|---|---|
| Malicious seller | Serves an empty 200, or serves once and replays the settlement | Verdict computed from advertised terms only; settlement idempotent per authorization nonce |
| Malicious buyer | Re-uses a discharge authorization, or claims a good delivery failed | Nonce and expiry enforced **before** execution; verdict is a pure function the buyer can re-run |
| Compromised gate operator | Forges a positive verdict for a call that never happened | Receipt commits to the response hash; the seller can disprove with its own log. **Bounded, and disclosed** |
| Compromised gate host | Exfiltrates keys | Keys never leave Turnkey. The host holds an execute-only API key |
| Faulty infrastructure | RPC lies, webhook retries, nonce contention | Every discharge idempotent by authorization nonce; duplicate settlement attempts rejected by a short-lived nonce cache |

---

## The trust boundary, stated against ourselves

**What the gate sees.** In default mode, the plaintext request and response. For content-bearing
calls this is a real disclosure and it is the buyer's choice to make.

**Hash-only mode.** With `retain: none` the gate stores only hashes and the structural facts the
verdict needs; the response body is discarded after the check. Receipts remain re-derivable given the
response, which the buyer holds.

**What the gate can lie about, and its incentive to.** The response bytes, since it is the only
observer of them. Under D-009 the gate earns a fee on `DELIVERED_AS_ADVERTISED` and earns nothing
otherwise, so it now has a direct incentive to over-report delivery. That incentive is new, it is
disclosed, and it is bounded only by the commitment below. It cannot lie undetectably: the receipt commits to `sha256(response)` and to the advertised terms, so a
seller that keeps its own logs can publish the response and prove a mismatch. **That is the whole
recourse story, and it is a bounded one** — it requires the seller to have kept logs and to bother.

**What the gate cannot do at all.**

- It cannot discharge without a receipt whose verdict re-derives.
- It cannot re-use a spent authorization.
- It cannot mutate a receipt after publication without breaking the batch root.

---

## Idempotency

The discharge is idempotent by **authorization nonce**. The same nonce submitted twice results in
exactly one discharge. This is enforced before execution, not detected after it, and is backed by a
short-lived nonce cache against concurrent submission.

If a duplicate settlement ever produces two discharges, **K7 fires**: stop the campaign immediately,
publish the incident with the transaction pair, ship the nonce cache, and restart the count from
zero. Prior campaign totals are not reused.

---

## Protocol-fact handling

No dated address, ABI, price, header name, or facilitator URL is compiled in (PRD §17). Payment terms
come from the counterparty's own 402 response at call time; KeeperHub's chain list and action schemas
are read from its API at startup.

On probe mismatch the service enters **`PROTOCOL_CONFIG_CHANGED` and stops gating rather than
guessing.** Failing closed is the required behaviour; a guessed protocol fact routed to money
movement is the failure this rule exists to prevent.

---

## Secrets handling

- Secrets live in the environment. `.env.example` documents the variable names and contains no values.
- `internal/` is gitignored working space. Nothing under it is committed.
- CI fails on a detected key-shaped literal in `apps/` or `packages/`.
- If a credential is ever exposed, rotate it first and record the incident second.

---

## Reporting a vulnerability

Open a private report to the repository owner. Include exact requests, responses, and — where the
issue involves an execution — the KeeperHub run id. Do not open a public issue for anything that
touches key handling or the discharge path.

Findings that concern the trusted-observer boundary described above are already disclosed and are
not vulnerabilities; findings that let the gate discharge **without** a re-derivable receipt are.
