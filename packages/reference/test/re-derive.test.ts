/* §9 /verify — a mismatch is the finding, and is surfaced, not swallowed. */
import { describe, it, expect } from "vitest";
import type { Receipt } from "@quittance/protocol-types";
import { reDerive, parseReceipt } from "../src/re-derive.js";

const HASH_A = "a".repeat(64);

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  const base: Receipt = {
    receiptVersion: 1,
    intent: {
      maxPriceAtomic: "10000",
      maxLatencyMs: 5000,
      retain: "none",
      authorizationNonce: "nonce-1",
      authorizationExpiry: 1893456000,
    },
    advertised: {
      x402Version: 2,
      host: "example.invalid",
      scheme: "exact",
      network: "test-network",
      asset: "test-asset",
      payTo: "test-recipient",
      amountAtomic: "5000",
      maxTimeoutSeconds: 60,
      mimeType: "application/json",
      outputSchemaHash: null,
      checksAvailable: {
        mimeTypeAdvertised: true,
        schemaAdvertised: false,
        latencySlaAdvertised: false,
      },
      rawTermsHash: HASH_A,
    },
    request: {
      url: "https://example.invalid/resource",
      method: "GET",
      requestSha256: HASH_A,
      startedAt: "2026-09-09T00:00:00.000Z",
    },
    observed: {
      outcome: "observed",
      httpStatus: 200,
      bodyByteLength: 2,
      bodySha256: HASH_A,
      contentType: "application/json",
      latencyMs: 120,
      schemaConformance: "not_advertised",
    },
    run: {
      keeperhubRunId: null,
      dischargeTxHash: null,
      mode: "gate",
      label: "LOCAL_FIXTURE",
    },
    publishedVerdict: "DELIVERED_AS_ADVERTISED",
  };
  return { ...base, ...overrides };
}

describe("re-derivation", () => {
  it("agrees with a correctly published verdict", async () => {
    const r = await reDerive(receipt());
    expect(r.reDerivedVerdict).toBe("DELIVERED_AS_ADVERTISED");
    expect(r.ok).toBe(true);
    expect(r.problems).toHaveLength(0);
    expect(r.receiptLeaf).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reports a forged verdict as a problem", async () => {
    const r = await reDerive(receipt({ publishedVerdict: "NOT_DELIVERED" }));
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toContain("verdict mismatch");
  });

  it("flags a discharge recorded against a non-eligible state", async () => {
    const base = receipt();
    const r = await reDerive({
      ...base,
      observed: { ...base.observed, httpStatus: 502 },
      publishedVerdict: "NOT_DELIVERED",
      run: { ...base.run, dischargeTxHash: "0xdeadbeef" },
    });
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toContain("not discharge-eligible");
  });

  it("checks the response commitment when a body is supplied", async () => {
    const r = await reDerive(receipt(), new TextEncoder().encode("{}"));
    expect(r.bodyHashChecked).toBe(true);
    expect(r.bodyHashMatches).toBe(false);
    expect(r.problems.join(" ")).toContain("response hash mismatch");
  });

  it("re-derives without a body, and says the commitment was unchecked", async () => {
    const r = await reDerive(receipt());
    expect(r.bodyHashChecked).toBe(false);
    expect(r.bodyHashMatches).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    const p = parseReceipt({ receiptVersion: 1 });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.problems.length).toBeGreaterThan(0);
  });
});

/*
 * Regression, found by the G7 clean-room run on 2026-09-16.
 *
 * Two published receipts did not re-derive. Both recorded `outcome: "observed"` with a
 * clean 200 response while publishing SETTLEMENT_FAILED — the gate knew the fee execution
 * had failed but never wrote that into the envelope the receipt commits to. §5.2 is
 * explicit that anything not committed to is not an input, so the published verdict was
 * unreachable by anyone re-running the function.
 *
 * The verifier caught it in our own corpus, which is the mechanism working.
 */
describe("§5.2 a settlement failure must be committed, not merely known", () => {
  it("does not re-derive when SETTLEMENT_FAILED is published over an untouched envelope", async () => {
    const base = receipt();
    const r = await reDerive({ ...base, publishedVerdict: "SETTLEMENT_FAILED" });
    expect(r.ok).toBe(false);
    expect(r.reDerivedVerdict).toBe("DELIVERED_AS_ADVERTISED");
    expect(r.problems.join(" ")).toContain("verdict mismatch");
  });

  it("re-derives once the outcome is written into the committed envelope", async () => {
    const base = receipt();
    const r = await reDerive({
      ...base,
      observed: { ...base.observed, outcome: "settlement_failed" },
      publishedVerdict: "SETTLEMENT_FAILED",
    });
    expect(r.reDerivedVerdict).toBe("SETTLEMENT_FAILED");
    expect(r.ok).toBe(true);
  });
});
