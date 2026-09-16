# Upstream report — SUPERSEDED by 2026-09-16-x402-discovery-conformance.md

> This was the first draft, covering one finding. A second finding arrived on 2026-09-16 and both
> are now in a single report so there is one thing to file rather than two overlapping ones.
> Kept because it records what was known when, which is the point of this directory.

**Target:** the operator of `api.hyperextend.xyz`, and secondarily `coinbase/x402` (as a
specification-conformance observation for the discovery index).
**Found:** 2026-09-09, during the first live probe run of this project.
**Status:** **drafted, not filed.** Filing is an outward-facing action and is the owner's to take.

Per PRD §20, this is produced from real friction encountered while integrating, not manufactured.

---

## Summary

A live x402 resource publishes a payment offer whose `amount` is a decimal string, where the x402 v2
specification requires atomic (integral) token units. A strict parser rejects the offer.

## Affected resource

```
GET https://api.hyperextend.xyz/v1/liquidations/BTC
```

## Reproduction

```bash
curl -sS -D - -o /dev/null https://api.hyperextend.xyz/v1/liquidations/BTC
# read the base64 PAYMENT-REQUIRED response header and decode it:
#   node -e 'process.stdout.write(Buffer.from(process.argv[1],"base64").toString())' "<header value>"
```

## Observed

The 402 response carries two offers. The first is well-formed; the second is not.

```json
{
  "x402Version": 2,
  "accepts": [
    { "scheme": "exact", "network": "eip155:8453",         "amount": "111000", "asset": "0x833589fC…" },
    { "scheme": "exact", "network": "hyperliquid:mainnet", "amount": "0.111",  "asset": "USDC:0x6d1…" }
  ]
}
```

`accepts[1].amount` is `"0.111"`.

## Expected

Per the x402 v2 specification, `PaymentRequirements.amount` is:

> | `amount` | `string` | Required | Required payment amount in **atomic token units** |
>
> — `specs/x402-specification-v2.md`, §5.1.2 field table

Atomic units are integral. `"0.111"` is not an atomic amount. The Base offer in the same response
does this correctly: `"111000"`.

## Impact

A conforming client that validates `accepts[]` strictly rejects the **entire** payment-required
payload, including the valid Base offer, and cannot pay the resource at all. Clients that coerce the
value instead risk paying the wrong amount by a factor of the token's decimals.

We hit exactly this: our first implementation validated `accepts[]` as a whole and dropped a seller
we could otherwise have transacted with. We now parse each offer individually, report the failure,
and proceed only on an offer that parsed — but a client that does not do this will simply fail.

## Suggested fix

Emit `amount` in atomic units for every offer, as the Base offer already does. For a 6-decimal USDC
value of 0.111, that is `"111000"`.

## Secondary observation, for the discovery index

While probing one resource per distinct host from the public x402 discovery index (46 hosts):

- **8 of 46 no longer return HTTP 402** — they return 404 or 405. The index lists resources that are
  no longer paid endpoints, so a client that trusts the index without re-probing will build a target
  list containing entries it can never transact with.
- **The index's own metadata disagrees with the live 402s.** The index reported a `mimeType` for 5 of
  100 resources; the live 402 responses carry one for 38 of 38 hosts that answered. A client that
  reads advertised terms from the index rather than from the seller's own response gets a materially
  different picture.

Neither is a specification defect. Both are worth knowing for anyone treating the index as a source of
terms rather than as a source of addresses.

## Environment

- Probed 2026-09-09 from a clean checkout, unauthenticated `GET`, no payment attempted.
- Parser validates against the pinned `coinbase/x402` specification at commit
  `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`.
- Full run: `evidence/probes/2026-09-09-g1-probe-run.md`.
