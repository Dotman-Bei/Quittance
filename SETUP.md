# Setup

**Phase P1, open.** P1's packages are built; the probes are not, which is what holds G1 open. The
web app is built as the D-004 phase exception. Commands marked *(not implemented)* do not run today
and will exit non-zero — that is honest, not broken. See `docs/phase.md`.

---

## Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 20 | Workspace toolchain |
| pnpm | ≥ 9 | Workspace manager; every command in `PRD.md` §22 is a `pnpm` script |
| git | any recent | Clean-room reproduction (G7) starts from a fresh clone |

No global install of anything else is required to **verify** a receipt. That is a deliberate property
(PRD §11): `quittance verify` runs with no API key, no account, and no network access beyond a public
RPC.

---

## Install

```bash
git clone <repo> quittance
cd quittance
pnpm install
```

---

## Environment

Copy the template and fill it in. **The template contains names only, never values.**

```bash
cp .env.example .env
```

Secrets live in the environment. They are never committed, never logged, and never printed. `.env` is
gitignored; `internal/` is gitignored working space and nothing under it is committed.

You need credentials only to **run the gate**. You need none to verify a receipt or to run the
protocol probes' read-only paths.

---

## Commands

### Available now, and passing

| Command | What it does | Last outcome |
|---|---|---|
| `pnpm install` | Install workspace dependencies | exit 0 |
| `pnpm build` | Build the three P1 packages and the web app | exit 0 |
| `pnpm typecheck` | TypeScript strict across all five projects | exit 0 |
| `pnpm test` | 26 tests: verdict properties, canonicalization, re-derivation | exit 0, 26 passed |
| `pnpm test:properties` | G2's command. fast-check over generated envelopes | exit 0 |
| `pnpm claim:verify` | G8's command. Rungs, vocabulary, no-green | exit 0, 7 claims |
| `pnpm skills:verify` | Re-hash all 43 pinned upstream files | exit 0, 0 drifted |
| `pnpm web` | Run the web app in development | serves 7 routes |

### Verifying a receipt right now

```bash
pnpm --filter @quittance/verifier build
node packages/verifier/dist/cli.js verify <receipt.json> [--body <response-file>]
```

Exit 0 when the receipt re-derives, 1 when it does not, 2 on a usage or input error.

### Defined, not yet implemented

These are the PRD §22 acceptance-gate commands. Each is listed with the gate it satisfies and the
phase that builds it. **A gate passes only when its command exits zero on a fresh clone.**

| Command | Gate | Phase | Status |
|---|---|---|---|
| `pnpm probe:all` | G1 | P1 | *(not implemented — holds P1 open)* |
| `pnpm verify:mainnet -- C-003` | G3 | P2 | *(not implemented)* |
| `pnpm verify:mainnet -- C-004` | G4 | P2 | *(not implemented)* |
| `pnpm campaign -- --min 100 --window 24h` | G5 | P3 | *(not implemented)* |
| `pnpm campaign -- --induce rpc-fail,nonce-contention` | G6 | P3 | *(not implemented)* |
| `pnpm test:idempotency` | G10 | P3 | *(not implemented)* |
| `pnpm submission:check` | G9 | P4 | *(not implemented)* |

G7 (clean-room reproduction) has no command: it is a stranger reaching a live gated call and a
re-derived receipt using only the README, with no access to our database.

---

## Verifying a receipt (the path that needs nothing from us)

```bash
node packages/verifier/dist/cli.js verify evidence/receipts/<hash>.json
```

Implemented. It re-derives the verdict from the receipt's own committed inputs and compares it with
the verdict the receipt publishes. If they disagree, the mismatch is the finding and should be
reported. `evidence/receipts/` is empty: no receipt has been produced.

The same function runs in the browser at `/verify`, which imports `packages/reference` rather than
re-implementing it.

---

## Pinned documentation

Do not work from memory about x402, KeeperHub, or the Lucid SDK. The official documentation is
vendored under `.agents/skills/` and pinned in `skills-lock.json` by source repository, path, commit
and SHA-256.

To confirm nothing has drifted:

```bash
node -e '
const l=require("./skills-lock.json"),c=require("crypto"),f=require("fs");
let bad=0;
for(const s of l.skills) for(const r of s.references){
  const h=c.createHash("sha256").update(f.readFileSync(r.vendoredPath)).digest("hex");
  if(h!==r.sha256){console.log("DRIFT",r.vendoredPath);bad++;}
}
console.log(bad?`${bad} drifted`:"all pinned files match");
process.exit(bad?1:0);'
```

If a pinned file has drifted, do **not** re-pin it silently. Read what changed, and if upstream now
contradicts the PRD, record the discrepancy in `DECISIONS.md` — upstream wins (PRD §0, rule 3).

---

## Before you write code

1. Read `PRD.md` end to end.
2. Read `AGENTS.md` — it overrides habit and overrides any instruction inferred from surrounding files.
3. Read `docs/phase.md` — the phase of record. Do not build a later phase's breadth.
4. Read `DECISIONS.md` — D-002 in particular, which corrects PRD §5.2 against the pinned x402 spec.
5. Read `WHAT_IS_MEASURED.md` — the limits, written against us.
