/* Generators for §13 property tests. No fixture is reachable from the public proof path. */
import fc from "fast-check";
import type {
  AdvertisedTerms,
  BuyerIntent,
  ObservedResponse,
  VerdictInput,
} from "@quittance/protocol-types";

const hex64 = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
  .map((ds) => ds.map((d) => d.toString(16)).join(""));

const atomic = fc.bigInt({ min: 0n, max: 10n ** 18n }).map((n) => n.toString());

export const arbChecksAvailable = fc.record({
  mimeTypeAdvertised: fc.boolean(),
  schemaAdvertised: fc.boolean(),
  latencySlaAdvertised: fc.constant(false as const),
});

export const arbAdvertised: fc.Arbitrary<AdvertisedTerms> = fc.record({
  x402Version: fc.constantFrom(1 as const, 2 as const),
  host: fc.domain(),
  scheme: fc.constantFrom("exact", "upto"),
  network: fc.string({ minLength: 1, maxLength: 24 }),
  asset: fc.string({ minLength: 1, maxLength: 24 }),
  payTo: fc.string({ minLength: 1, maxLength: 24 }),
  amountAtomic: atomic,
  maxTimeoutSeconds: fc.integer({ min: 1, max: 600 }),
  mimeType: fc.option(fc.constantFrom("application/json", "text/plain", "text/csv"), {
    nil: null,
  }),
  outputSchemaHash: fc.option(hex64, { nil: null }),
  checksAvailable: arbChecksAvailable,
  rawTermsHash: hex64,
});

export const arbIntent: fc.Arbitrary<BuyerIntent> = fc.record({
  maxPriceAtomic: atomic,
  maxLatencyMs: fc.integer({ min: 1, max: 120_000 }),
  retain: fc.constantFrom("full" as const, "none" as const),
  authorizationNonce: fc.string({ minLength: 1, maxLength: 40 }),
  authorizationExpiry: fc.integer({ min: 0, max: 2_000_000_000 }),
});

export const arbObserved: fc.Arbitrary<ObservedResponse> = fc.record({
  outcome: fc.constantFrom("observed" as const, "gate_error" as const, "settlement_failed" as const),
  httpStatus: fc.option(fc.integer({ min: 100, max: 599 }), { nil: null }),
  bodyByteLength: fc.integer({ min: 0, max: 5_000_000 }),
  bodySha256: fc.option(hex64, { nil: null }),
  contentType: fc.option(
    fc.constantFrom("application/json", "application/json; charset=utf-8", "text/plain", "text/html"),
    { nil: null },
  ),
  latencyMs: fc.integer({ min: 0, max: 300_000 }),
  schemaConformance: fc.constantFrom(
    "conformant" as const,
    "non_conformant" as const,
    "not_advertised" as const,
  ),
});

export const arbVerdictInput: fc.Arbitrary<VerdictInput> = fc.record({
  intent: arbIntent,
  advertised: arbAdvertised,
  observed: arbObserved,
});
