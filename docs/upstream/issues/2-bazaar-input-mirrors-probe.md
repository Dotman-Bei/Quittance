## What happened?

A resource's bazaar `info.input` declaration **changes with the HTTP method used to probe it**, and the GET variant is invalid against the spec's own structure.

`https://chat.gedx402.com/v1/chat/completions`, probed twice:

| Probed with | `info.input.method` | `bodyType` | `body` |
|---|---|---|---|
| `GET` | **`"GET"`** | `"json"` | present |
| `POST` | `"POST"` | `"json"` | present |

Two separate problems:

**1. The GET declaration is already invalid and was catalogued anyway.** `specs/extensions/bazaar.md` splits HTTP inputs into Query Methods (`GET`/`HEAD`/`DELETE` — `queryParams`, `headers`; no `bodyType`, no `body`) and Body Methods (`POST`/`PUT`/`PATCH` — `bodyType` and `body` both required). `method: "GET"` with `bodyType: "json"` matches neither. The spec also says facilitators **must** validate `info` against `schema` before cataloging, and must "validate the appropriate `method` enum based on operation type". So this entry should not have been indexed. Either the resource's own `schema` is permissive enough to admit it — in which case the validation requirement does not bite, since the operator supplies the schema being validated against — or validation did not run.

**2. A declaration that varies with the probe is not stated to be wrong anywhere.** This is the part I could find no spec text for. `info.input` is only useful if it is a property of the **resource**, not of the request that asked for it. A cataloguing facilitator that probes with GET indexes an entry no client can execute; one that probes with POST indexes a working entry for the same URL.

**Impact:** we followed the declaration faithfully, sent a GET carrying a body, and `fetch` threw before the request left the process — after the payment step had already been reached. (`curl` silently converts to POST, which is why this is easy to miss by hand.) We now refuse incoherent declarations at quote time rather than pay for a call that cannot succeed.

**Proposed fix:**
- State that `info.input` describes the resource and MUST NOT vary with the probing request.
- Make the Query/Body split explicit as a MUST NOT (`bodyType` and `body` MUST NOT appear with a body-less method) rather than implied by two adjacent tables — the tables are easy to read as "fields I may include" instead of a closed set.
- Worth confirming separately whether operator-supplied `schema` is expected to be the only gate here, given that an operator emitting a non-conforming `info` can also emit a `schema` that accepts it.

## Steps to reproduce

```bash
curl -sS -X GET  -D - -o /dev/null https://chat.gedx402.com/v1/chat/completions
curl -sS -X POST -D - -o /dev/null -H 'content-type: application/json' -d '{}' \
     https://chat.gedx402.com/v1/chat/completions
# base64-decode PAYMENT-REQUIRED from each, compare extensions.bazaar.info.input
```

Both return HTTP 402. Observed 2026-09-16 and again on 2026-09-17; the declarations differ only in `method`.

## Environment

- Unauthenticated probes; no payment attempted for this observation.
- `specs/extensions/bazaar.md` read at `main` (Input Type Discriminator + Query/Body method tables) and at pinned commit `dd927a26cfefc98c24b3ec38b3a8f204dad0c60d`.
- Found while building a delivery-verification gate over x402 (https://github.com/Dotman-Bei/Quittance); this cost us a real failed call.
