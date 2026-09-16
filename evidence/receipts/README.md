# Published receipt corpus

Every file here is a real receipt from a real gated call. Each is named by its own leaf hash: the
sha256 of its canonicalized contents, which you can recompute yourself.

Re-derive all of them from a fresh clone, with no access to anything of ours:

```bash
for f in evidence/receipts/*.json; do
  node packages/verifier/dist/cli.js verify "$f" || echo "MISMATCH: $f"
done
```

## Every receipt here re-derives

All 184 re-derive from a clean clone with no access to anything of ours. If any does not, that is the
finding and it should be reported.

## What is NOT here

Runs against our own adversarial endpoint live in **`evidence/baseline-runs/`**, not in this ledger.
Their host is `localhost`, so nobody else can reach it and nobody else can check them the way a
third-party receipt can be checked. Listing them beside real endpoints would invite a reader to treat
them as equivalent evidence.

They are moved, **not deleted** — including two that do not re-derive, from a real bug in our own gate
(`DECISIONS.md` D-014). `evidence/baseline-runs/README.md` explains both.
