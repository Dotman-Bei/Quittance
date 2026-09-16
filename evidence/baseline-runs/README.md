# PROJECT_BASELINE runs — preserved, not published

These receipts were produced against **our own adversarial endpoint** (`apps/baseline`), which runs
on `localhost` and is configured to fail in the five specific ways §14 names: empty body, wrong mime
type, slow past the buyer's cap, 502 after payment, and a delivering control.

They are **moved out of the published ledger, not deleted.** Two reasons:

1. Their host is `localhost:8788`. Nobody else can reach it, so nobody else can independently check
   them the way a third-party receipt can be checked. Listing them beside real endpoints invites a
   reader to treat them as equivalent evidence, and they are not.
2. Deleting them would destroy evidence, which this project does not do.

**They were never counted as third-party adoption or as market demand** — every one carries
`label: "PROJECT_BASELINE"`, and the endpoint surfaces already excluded them from third-party totals
before this move.

## Two of these do not re-derive, and that is the point

```
15db44b3fc3531fce53d6cc786656daff7621e7faed6a012e4c8b984c1375c59
e66c0befa083a8ba69e11b4fd2af2cabedc28af4271dfb35a01201821a6ab8f0
```

Both publish `SETTLEMENT_FAILED` over an envelope recording `outcome: "observed"` and a clean HTTP
200, so re-derivation yields `DELIVERED_AS_ADVERTISED`. The gate knew the fee execution had failed
and changed the published verdict **without writing that into the envelope the receipt commits to**,
violating §5.2.

Found by re-deriving the whole corpus from a clean clone — the first time anyone actually did what
C-002 says a stranger can do, it caught us. Fixed in `apps/gate`; pinned by regression tests in
`packages/reference/test/re-derive.test.ts`. Recorded as `DECISIONS.md` **D-014**.

Verify them yourself:

```bash
for f in evidence/baseline-runs/*.json; do
  node packages/verifier/dist/cli.js verify "$f" || echo "MISMATCH: $f"
done
```

Sixteen re-derive. Two do not, and they are kept so that the failure stays visible.
