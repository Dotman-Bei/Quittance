# Upstream report — two x402 discovery conformance issues found in production

**Status:** ready to file. Both findings **re-verified live on 2026-09-16**.
**Found by:** probing the public x402 discovery index while building a delivery-verification
gate. Both surfaced as real integration failures, not by reading the spec looking for problems.

**Where to file:** `github.com/coinbase/x402` as a conformance observation, and/or directly to each
resource operator. The spec itself is not defective in either case — clients are, predictably,
tripping over the gap between what it permits and what it says.

---

## 1 · A resource advertises a non-integral `amount`

**Resource:** `https://api.hyperextend.xyz/v1/liquidations/BTC`

### Reproduce

```bash
curl -sS -D - -o /dev/null https://api.hyperextend.xyz/v1/liquidations/BTC
# decode the base64 PAYMENT-REQUIRED response header
```

### Observed, 2026-09-16

```json
{
  "x402Version": 2,
  "accepts": [
    { "network": "eip155:8453",         "amount": "111000" },
    { "network": "hyperliquid:mainnet", "amount": "0.111"  }
  ]
}
```

`accepts[1].amount` is `"0.111"`.

### Expected

> | `amount` | `string` | Required | Required payment amount in **atomic token units** |
>
> — `specs/x402-specification-v2.md` §5.1.2

Atomic units are integral. The Base offer in the same response does this correctly (`"111000"`).

### Impact

A client validating `accepts[]` strictly rejects the **entire** payload — including the valid Base
offer — and cannot pay the resource at all. A client that coerces instead risks paying wrong by a
factor of the token's decimals.

We hit exactly this. Our first implementation validated `accepts[]` as a whole and dropped a seller
we could otherwise have transacted with. We now parse each offer individually and proceed only on one
that parsed, but a client that does not will simply fail.

### Suggested fix

Emit `amount` in atomic units for every offer. For 0.111 of a 6-decimal USDC, `"111000"`.

**Possible spec clarification:** the field table says "atomic token units" but nothing states that a
non-integral value is invalid, and no example shows a rejection. A one-line note — *"`amount` MUST
match `^[0-9]+$`"* — would let validators cite something.

---

## 2 · A resource mirrors the probing method into its bazaar declaration, producing an unsatisfiable spec

**Resource:** `https://chat.gedx402.com/v1/chat/completions`

### Reproduce

```bash
# probe the SAME resource with two different methods and compare the declarations
curl -sS -X GET  -D - -o /dev/null https://chat.gedx402.com/v1/chat/completions
curl -sS -X POST -D - -o /dev/null -H 'content-type: application/json' -d '{}' \
     https://chat.gedx402.com/v1/chat/completions
# decode PAYMENT-REQUIRED and read extensions.bazaar.info.input
```

### Observed, 2026-09-16

| Probed with | `info.input.method` | `bodyType` | `body` present |
|---|---|---|---|
| `GET` | **`"GET"`** | `"json"` | **yes** |
| `POST` | `"POST"` | `"json"` | yes |

The declaration **changes with the method used to probe it**, and the GET variant declares a JSON
request body on a method that cannot carry one. `fetch` throws before the request leaves the process;
`curl` silently converts to POST.

### Why this is a conformance problem, not just a bug

The bazaar spec makes `bodyType` the discriminator for body methods:

> "For HTTP inputs, the presence of `bodyType` further distinguishes between query and body methods."
>
> — `specs/extensions/bazaar.md`

So `method: "GET"` together with `bodyType: "json"` contradicts the spec's own model. A cataloguing
facilitator that probes with GET will index an entry no client can execute.

### Impact

A discovery declaration is only useful if it is a property of the **resource**, not of the request
that asked for it. Ours followed the declaration faithfully, sent a GET with a body, and failed
before the request left the process — after the payment step had already been reached. We now refuse
such a declaration at quote time rather than pay for a call that cannot succeed.

### Suggested fix

- **Operator:** declare the resource's actual method regardless of how it was probed.
- **Spec:** state that `info.input` describes the resource and MUST NOT vary with the probing request,
  and that `bodyType` MUST NOT appear alongside a body-less method. Neither is currently written down,
  and both are things an implementer would otherwise have to discover the way we did.

---

## Secondary observation — the index disagrees with the live 402s

While probing one resource per distinct host (46 hosts, then 64 resources):

- **8 of 46 index entries no longer return HTTP 402** — 404 or 405. A client building a target list
  from the index without re-probing will carry entries it can never transact with.
- **The index's own metadata disagrees with the live responses.** The index reported a `mimeType` for
  5 of 100 resources; the live 402s carried one for **38 of 38** hosts that answered.

Neither is a spec defect. Both matter to anyone treating the index as a source of *terms* rather than
a source of *addresses*, and a sentence saying so in the bazaar docs would save that discovery.

---

## Environment

- Probed 2026-09-16 from a clean checkout. Unauthenticated `GET`/`POST`; no payment attempted for
  these observations.
- Validated against the pinned `coinbase/x402` spec at commit
  `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`.
- Full probe output: `evidence/probes/2026-09-09-g1-probe-run.md`.
- Reporter: Quittance — https://github.com/Dotman-Bei/Quittance
