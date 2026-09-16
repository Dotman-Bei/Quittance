# Published receipt corpus

Every file here is a real receipt from a real gated call. Each is named by its own leaf hash: the
sha256 of its canonicalized contents, which you can recompute yourself.

Re-derive all of them from a fresh clone, with no access to anything of ours:

```bash
for f in evidence/receipts/*.json; do
  node packages/verifier/dist/cli.js verify "$f" || echo "MISMATCH: $f"
done
```

## Two receipts here do not re-derive, and they are kept on purpose

```
15db44b3fc3531fce53d6cc786656daff7621e7faed6a012e4c8b984c1375c59
e66c0befa083a8ba69e11b4fd2af2cabedc28af4271dfb35a01201821a6ab8f0
```

Both publish `SETTLEMENT_FAILED` over an envelope recording `outcome: "observed"` and a clean HTTP
200. Re-derivation yields `DELIVERED_AS_ADVERTISED`, so the published verdict is **unreachable** by
anyone re-running the function.

**Cause.** The gate learned that the fee execution had failed *after* the delivery check, and changed
the published verdict without writing that fact into the envelope the receipt commits to. §5.2 is
explicit: *"A verdict may only be computed from data committed to in the receipt. Anything the gate
knows but did not commit to is not an input."* The gate violated its own rule.

**Found by.** The G7 clean-room run on 2026-09-16 — a fresh clone of the public repository,
re-deriving the whole corpus. 127 of 129 re-derived; these two did not. Nothing else surfaced it: the
receipts look ordinary, and every test passed.

**Fixed in.** `apps/gate` now writes `outcome: "settlement_failed"` into the committed envelope and
re-runs `verdict()` over it, so a published verdict is by construction the output of the function over
the receipt's own inputs. Pinned by two regression tests in
`packages/reference/test/re-derive.test.ts`. Recorded as `DECISIONS.md` D-014.

**Why they are still here.** Deleting a receipt that does not re-derive, in order to make the corpus
look clean, is the precise behaviour this project exists to make impossible. They are labelled
`PROJECT_BASELINE`, they moved no third-party money, and they are the clearest demonstration in the
repository that the verifier catches our own mistakes rather than only other people's.
