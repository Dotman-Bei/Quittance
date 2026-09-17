## What happened?

`amount` is specified as "Required payment amount in atomic token units" (`specs/x402-specification-v2.md`, `PaymentRequirements` field table), but nothing in the spec states that a non-integral value is invalid, and no schema or regex constrains it. A live resource takes advantage of the gap.

`https://api.hyperextend.xyz/v1/liquidations/BTC` returns, in the same `accepts[]` array:

```json
{ "network": "eip155:8453",         "amount": "111000" }
{ "network": "hyperliquid:mainnet", "amount": "0.111"  }
```

The Base offer is correct. The second is a decimal.

**Impact:** a client validating `accepts[]` as a unit rejects the whole payload — including the valid Base offer — and cannot pay the resource at all. A client that coerces instead risks paying wrong by a factor of the token's decimals.

We hit this. Our first implementation validated `accepts[]` as a whole and dropped a seller we could otherwise have transacted with; we now parse each offer independently and proceed on any that parsed. A client that does not will simply fail, and today has no spec text to cite when telling the operator why.

**Proposed fix:** state the constraint where the field is defined — `amount` MUST match `^[0-9]+$`. One line, and validators have something to point at.

## Steps to reproduce

```bash
curl -sS -D - -o /dev/null https://api.hyperextend.xyz/v1/liquidations/BTC
# base64-decode the PAYMENT-REQUIRED response header, read accepts[1].amount
```

Observed `"0.111"` on 2026-09-16 and again on 2026-09-17.

## Environment

- Unauthenticated `GET`; no payment attempted.
- Spec read at `main` and at pinned commit `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`; the field table is identical in both.
- Found while building a delivery-verification gate over x402 (https://github.com/Dotman-Bei/Quittance) — surfaced as a real integration failure, not by reading the spec looking for problems.
