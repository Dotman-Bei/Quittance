# Runbook — deploying `apps/web` to Vercel

## Environment variables

**None are required.** `apps/web` reads no environment variable to function: the receipt corpus
comes from `evidence/receipts/`, traced into the deployment at build time.

One optional override exists:

| Variable | Required | What it does |
|---|---|---|
| `QUITTANCE_EVIDENCE_DIR` | no | Absolute path to a receipt corpus. Only needed if the corpus is not at `evidence/receipts/` in the deployment |

## What must NEVER be set on Vercel

These belong to the **gate**, which is a different service and is not what you are deploying:

| Variable | Why not |
|---|---|
| `KEEPERHUB_API_KEY` | It can execute transactions. The web app never moves value and has no use for it. On Vercel it would sit in an environment that renders public pages |
| `BUYER_PRIVATE_KEY` | §12 P4 — no key belongs in `apps/`. The web app has no signing path and must never acquire one |
| `GATE_FEE_RECIPIENT`, `GATE_FEE_ATOMIC` | Gate-side settlement configuration. The web app does not settle |

If a future page needs live gate data, it calls the gate over HTTP with a read-only URL. It does not
acquire the gate's credentials.

## Project settings

Vercel must build the workspace packages before the app, because `apps/web` imports
`@quittance/protocol-types` and `@quittance/reference` from source.

`apps/web/vercel.json` carries the framework, install and build commands, so the only field you must
set by hand is the Root Directory.

| Setting | Value |
|---|---|
| **Application Preset** | **Next.js** — *not* "Other". With "Other" there is no Next.js adapter: no serverless functions, no server rendering, and the receipt pages cannot read the corpus at all |
| Root Directory | **`apps/web`** — not `apps`. `apps` contains four workspaces and no Next.js app |
| **Output Directory** | **leave the override OFF.** The Next.js preset knows it is `.next`. The "Other" preset's default of `'public' if it exists, or '.'` publishes static files and no application |
| Include files outside the root directory | **on** — the corpus and the workspace packages live above it |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `cd ../.. && pnpm -r --filter './packages/**' build && pnpm --filter @quittance/web build` |
| Output Directory | *(leave default)* |
| Node version | 20.x |

## Why the corpus needed work

`lib/receipts.ts` resolved the corpus as `process.cwd()/../../evidence/receipts`. That is correct
locally, where the cwd is `apps/web`, and wrong on a serverless host, where the cwd is the deployed
function's own root.

A missing corpus directory is a **legitimate state** here — it means no run has happened yet — so the
code returns an empty list rather than throwing. Combined, those two facts produced a silent failure
mode: **a green deploy rendering "no runs yet" with a full corpus on disk.**

Two changes fix it, and both are needed:

1. `resolveEvidenceDir()` tries the plausible locations in order and honours an explicit override.
2. `outputFileTracingIncludes` in `next.config.mjs` pulls `evidence/receipts/**` into the serverless
   bundle. Without it the files are simply not deployed, wherever the code looks.

Verified: 129 receipt paths traced into the build, and the resolver finds the corpus from both the
repo root and `apps/web`.

## After deploying, check this first

Open `/receipts`. If it says **"no runs yet"** while the repository has receipts, the trace did not
work — check that "Include files outside the root directory" is enabled, and that the build ran from
the repo root.

The page is designed to state an empty corpus honestly, so it will not warn you that something broke.
