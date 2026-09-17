# Upstream report — two x402 discovery conformance issues found in production

**Status:** ready to file. Both findings **re-verified live on 2026-09-17**.
**Found by:** probing the public x402 discovery index while building a delivery-verification
gate. Both surfaced as real integration failures, not by reading the spec looking for problems.

**Where to file:** `github.com/x402-foundation/x402`.

> Corrected 2026-09-17. This document previously said `coinbase/x402`. That repository is now a
> **fork** of `x402-foundation/x402` with **issues disabled** (`has_issues: false`, last push
> 2026-09-03); the foundation repo is the live one. The pinned spec commit
> `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d` resolves in the foundation repo, so the pin is
> unaffected.

Ready-to-paste issue bodies, formatted to the repo's `bug_report.yml` template:

- `docs/upstream/issues/1-amount-atomic-units.md`
- `docs/upstream/issues/2-bazaar-input-mirrors-probe.md`
- `docs/upstream/issues/FILE_THESE.md` — prefilled links

Checked for duplicates 2026-09-17 across `atomic units amount`, `bazaar bodyType`, `bazaar method`,
`discovery mimeType`: no existing issue covers either finding.

---

## 1 · A resource advertises a non-integral `amount`

**Resource:** `https://api.hyperextend.xyz/v1/liquidations/BTC`

### Reproduce

```bash
curl -sS -D - -o /dev/null https://api.hyperextend.xyz/v1/liquidations/BTC
# decode the base64 PAYMENT-REQUIRED response header
```

### Observed, 2026-09-16 and 2026-09-17 (unchanged)

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
> — `specs/x402-specification-v2.md`, `PaymentRequirements` field table

Verified 2026-09-17: this line is identical at `main` and at the pinned commit. Atomic units are
integral. The Base offer in the same response does this correctly (`"111000"`).

### Impact

A client validating `accepts[]` strictly rejects the **entire** payload — including the valid Base
offer — and cannot pay the resource at all. A client that coerces instead risks paying wrong by a
factor of the token's decimals.

We hit exactly this. Our first implementation validated `accepts[]` as a whole and dropped a seller
we could otherwise have transacted with. We now parse each offer individually and proceed only on one
that parsed, but a client that does not will simply fail.

### Suggested fix

Emit `amount` in atomic units for every offer. For 0.111 of a 6-decimal USDC, `"111000"`.

**Spec clarification:** the field table says "atomic token units" but nothing states that a
non-integral value is invalid. Verified 2026-09-17 — there is **no** pattern, regex, or numeric
constraint on `amount` anywhere in the v2 spec. A one-line note — *"`amount` MUST match
`^[0-9]+$`"* — would let validators cite something.

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

### Observed, 2026-09-16 and 2026-09-17 (unchanged)

| Probed with | `info.input.method` | `bodyType` | `body` present |
|---|---|---|---|
| `GET` | **`"GET"`** | `"json"` | **yes** |
| `POST` | `"POST"` | `"json"` | yes |

The declaration **changes with the method used to probe it**, and the GET variant declares a JSON
request body on a method that cannot carry one. `fetch` throws before the request leaves the process;
`curl` silently converts to POST.

### Why this is a conformance problem, not just a bug

`specs/extensions/bazaar.md` splits HTTP inputs into two closed field tables:

> **Query Methods (GET, HEAD, DELETE)** — `type`, `method`, `queryParams`, `headers`.
> No `bodyType`. No `body`.
>
> **Body Methods (POST, PUT, PATCH)** — `bodyType` (Required), `body` (Required).

So `method: "GET"` with `bodyType: "json"` matches **neither** structure. The spec further requires:

> "Facilitators **must** validate `info` against `schema` before cataloging."
> "For HTTP endpoints: Must validate the appropriate `method` enum based on operation type."

This entry should therefore not have been indexed at all.

**Correction, 2026-09-17.** An earlier draft of this report claimed the spec does not say `bodyType`
must not appear alongside a body-less method, and that we were reporting an unwritten rule. That was
wrong — the Query/Body tables already imply it, and the facilitator validation requirement is
explicit. The half of this finding that is genuinely unwritten is narrower, and is stated below.

### Impact

A discovery declaration is only useful if it is a property of the **resource**, not of the request
that asked for it. Ours followed the declaration faithfully, sent a GET with a body, and failed
before the request left the process — after the payment step had already been reached. We now refuse
such a declaration at quote time rather than pay for a call that cannot succeed.

### Suggested fix

- **Operator:** declare the resource's actual method regardless of how it was probed.
- **Spec — the genuinely unwritten part:** state that `info.input` describes the resource and MUST
  NOT vary with the probing request. Nothing in the bazaar spec says this today, and it is the
  assumption every cataloguing facilitator is already making.
- **Spec — hardening:** promote the Query/Body split from two adjacent tables to an explicit MUST
  NOT. Adjacent tables read as "fields I may include" rather than a closed set.
- **Worth a maintainer's answer:** since the `schema` validated against is supplied by the same
  operator that supplied the non-conforming `info`, an operator can emit a permissive schema and
  pass validation. Whether that is intended is not something we can determine from outside.

---

## Secondary observation — the index disagrees with the live 402s

While probing one resource per distinct host (46 hosts, then 64 resources):

- **8 of 46 index entries no longer return HTTP 402** — 404 or 405. A client building a target list
  from the index without re-probing will carry entries it can never transact with.
- **The index's own metadata disagrees with the live responses.** The index reported a `mimeType` for
  5 of 100 resources; the live 402s carried one for **38 of 38** hosts that answered.

Neither is a spec defect. Both matter to anyone treating the index as a source of *terms* rather than
a source of *addresses*, and a sentence saying so in the bazaar docs would save that discovery.

**Not filed as an issue.** The repo's issue template explicitly routes catalog-visibility problems to
the facilitator provider rather than to GitHub. This observation is adjacent to that, and is recorded
here rather than filed.

---

## Environment

- Probed 2026-09-16 from a clean checkout, re-verified 2026-09-17. Unauthenticated `GET`/`POST`; no
  payment attempted for these observations.
- Validated against the pinned `x402-foundation/x402` spec at commit
  `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`, and re-checked against `main` on 2026-09-17.
- Full probe output: `evidence/probes/2026-09-09-g1-probe-run.md`.
- Reporter: Quittance — https://github.com/Dotman-Bei/Quittance
