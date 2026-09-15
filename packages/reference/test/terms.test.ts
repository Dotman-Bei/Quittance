/*
 * Regression tests for the terms derivation.
 *
 * Every case here traces to a decision entry, and several were written only after a live
 * probe run contradicted what the specification alone suggested. See D-002, D-005, D-006.
 */
import { describe, it, expect } from "vitest";
import {
  parsePaymentRequired,
  deriveChecksAvailable,
  advertisedMimeType,
  advertisedOutputSchema,
  bazaarOutputHint,
  selectOffer,
  deriveAdvertisedTerms,
} from "@quittance/protocol-types";

const v2Offer = (over: Record<string, unknown> = {}) => ({
  scheme: "exact",
  network: "eip155:8453",
  amount: "1000",
  asset: "test-asset",
  payTo: "test-recipient",
  maxTimeoutSeconds: 300,
  ...over,
});

const v2 = (over: Record<string, unknown> = {}) => ({
  x402Version: 2,
  resource: { url: "https://seller.invalid/r", mimeType: "application/json" },
  accepts: [v2Offer()],
  ...over,
});

const v1 = (over: Record<string, unknown> = {}) => ({
  x402Version: 1,
  accepts: [
    {
      scheme: "exact",
      network: "base",
      maxAmountRequired: "1000",
      asset: "test-asset",
      payTo: "test-recipient",
      maxTimeoutSeconds: 300,
      mimeType: "application/json",
      outputSchema: { type: "object" },
    },
  ],
  ...over,
});

describe("D-006 per-offer parsing", () => {
  it("keeps a valid offer when a sibling offer is malformed", () => {
    // The exact shape found live: a valid Base offer beside a decimal amount.
    const payload = v2({
      accepts: [v2Offer(), v2Offer({ network: "hyperliquid:mainnet", amount: "0.111" })],
    });
    const parsed = parsePaymentRequired(payload);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.publishedOffers).toBe(2);
    expect(parsed.payload.accepts).toHaveLength(1);
    const bad = parsed.offers.find((o) => !o.ok);
    expect(bad).toBeDefined();
    expect(bad?.ok).toBe(false);
    if (bad && !bad.ok) expect(bad.issues.join(" ")).toContain("integral");
  });

  it("fails when no offer parses, rather than inventing one", () => {
    const parsed = parsePaymentRequired(
      v2({ accepts: [v2Offer({ amount: "0.1" }), v2Offer({ amount: "1.5" })] }),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues.join(" ")).toContain("all 2 offer(s) failed to parse");
  });

  it("fails on an unrecognisable envelope", () => {
    expect(parsePaymentRequired({ x402Version: 9, accepts: [] }).ok).toBe(false);
    expect(parsePaymentRequired("not an object").ok).toBe(false);
  });

  it("rejects a non-integral amount outright", () => {
    expect(parsePaymentRequired(v2({ accepts: [v2Offer({ amount: "0.111" })] })).ok).toBe(false);
  });
});

describe("D-002 mimeType location differs by version", () => {
  it("reads mimeType from resource on v2", () => {
    const p = parsePaymentRequired(v2());
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedMimeType(p.payload)).toBe("application/json");
  });

  it("reads mimeType from the accepts entry on v1", () => {
    const p = parsePaymentRequired(v1());
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedMimeType(p.payload)).toBe("application/json");
  });

  it("returns null when no mimeType was published, and never guesses", () => {
    const p = parsePaymentRequired(v2({ resource: { url: "https://seller.invalid/r" } }));
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedMimeType(p.payload)).toBeNull();
    expect(deriveChecksAvailable(p.payload).mimeTypeAdvertised).toBe(false);
  });

  it("strips charset parameters so they cannot cause a false mismatch", () => {
    const p = parsePaymentRequired(
      v2({ resource: { url: "https://seller.invalid/r", mimeType: "Application/JSON; charset=UTF-8" } }),
    );
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedMimeType(p.payload)).toBe("application/json");
  });
});

describe("D-005 x402 v2 has no response schema, and bazaar is not one", () => {
  it("reads outputSchema on v1", () => {
    const p = parsePaymentRequired(v1());
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedOutputSchema(p.payload)).not.toBeNull();
    expect(deriveChecksAvailable(p.payload).schemaAdvertised).toBe(true);
  });

  it("returns null on v2 even when a bazaar extension carries a schema", () => {
    // The live shape: bazaar.schema validates `info`, not the response body.
    const p = parsePaymentRequired(
      v2({
        extensions: {
          bazaar: {
            info: { input: { type: "http", method: "GET" }, output: { type: "json", example: {} } },
            schema: { type: "object", properties: { input: {}, output: {} } },
          },
        },
      }),
    );
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(advertisedOutputSchema(p.payload)).toBeNull();
    expect(deriveChecksAvailable(p.payload).schemaAdvertised).toBe(false);
  });

  it("exposes the bazaar output hint for reporting, never as a check", () => {
    const p = parsePaymentRequired(
      v2({
        extensions: {
          bazaar: { info: { input: { type: "http", method: "GET" }, output: { type: "json" } } },
        },
      }),
    );
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(bazaarOutputHint(p.payload)).toBe("json");
    // The hint must not turn into an advertised check.
    expect(deriveChecksAvailable(p.payload).schemaAdvertised).toBe(false);
  });
});

describe("no latency SLA exists in either version", () => {
  it("latencySlaAdvertised is false regardless of maxTimeoutSeconds", () => {
    for (const seconds of [60, 120, 300, 3600]) {
      const p = parsePaymentRequired(v2({ accepts: [v2Offer({ maxTimeoutSeconds: seconds })] }));
      expect(p.ok).toBe(true);
      if (!p.ok) continue;
      expect(deriveChecksAvailable(p.payload).latencySlaAdvertised).toBe(false);
    }
  });
});

describe("offer selection is not discretionary", () => {
  it("selects the first offer, so two gates cannot disagree", () => {
    const p = parsePaymentRequired(
      v2({ accepts: [v2Offer({ amount: "9000" }), v2Offer({ amount: "1" })] }),
    );
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    // Not the cheapest. The first.
    expect(selectOffer(p.payload)?.amountAtomic).toBe("9000");
  });

  it("normalises v1 maxAmountRequired and v2 amount to the same field", async () => {
    const a = parsePaymentRequired(v1());
    const b = parsePaymentRequired(v2());
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(selectOffer(a.payload)?.amountAtomic).toBe("1000");
    expect(selectOffer(b.payload)?.amountAtomic).toBe("1000");
  });

  it("commits to a hash of the terms exactly as received", async () => {
    const p = parsePaymentRequired(v2());
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const terms = await deriveAdvertisedTerms({ payload: p.payload, host: "seller.invalid" });
    expect(terms).not.toBeNull();
    expect(terms?.rawTermsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(terms?.checksAvailable).toEqual({
      mimeTypeAdvertised: true,
      schemaAdvertised: false,
      latencySlaAdvertised: false,
    });
  });
});
