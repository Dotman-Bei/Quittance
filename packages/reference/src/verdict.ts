/*
 * §5.2 `verdict(advertised, observed) -> VerdictState` is pure, total, and enumerated.
 *
 * PURE: no clock, no network, no filesystem, no randomness, no ambient state. Every
 * input arrives as an argument, and every argument is a field committed to in the
 * receipt (§5.2).
 *
 * TOTAL: every reachable combination of inputs returns exactly one state. There is no
 * throw on the decision path and no `default:` that swallows an unknown state
 * (AGENTS.md HB-6).
 *
 * The checks are STRUCTURAL. Semantic quality is not measured and is never claimed
 * (§5.2, WHAT_IS_MEASURED.md).
 */
import type {
  AdvertisedTerms,
  BuyerIntent,
  ObservedResponse,
  VerdictInput,
  VerdictState,
} from "@quittance/protocol-types";

/**
 * Compare two atomic amounts held as decimal strings, without going through a float.
 * Returns a negative number, zero, or a positive number, like a comparator.
 */
function compareAtomic(a: string, b: string): number {
  const x = a.replace(/^0+(?=\d)/, "");
  const y = b.replace(/^0+(?=\d)/, "");
  if (x.length !== y.length) return x.length - y.length;
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Media type only: `application/json; charset=utf-8` compares as `application/json`. */
function mediaType(value: string): string {
  const semi = value.indexOf(";");
  return (semi === -1 ? value : value.slice(0, semi)).trim().toLowerCase();
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * The order below is the whole decision procedure, and the order is load-bearing.
 *
 * 1. GATE_ERROR and SETTLEMENT_FAILED come first because they are OUR failures. They
 *    say nothing about the seller and must never be attributed to one (§14).
 * 2. REQUIREMENTS_MISMATCH comes before any observation, because §8.2 step 2 refuses
 *    before purchase: no purchase, no discharge, and nothing was observed to judge.
 * 3. TIMEOUT_EXCEEDED comes before NOT_DELIVERED so that a request the gate abandoned
 *    on the buyer's deadline reads as a timeout rather than as an absent response.
 * 4. NOT_DELIVERED before SHAPE_MISMATCH: an empty or failed response has no shape to
 *    compare, and reporting a mismatch would imply something arrived.
 */
export function verdict(input: VerdictInput): VerdictState {
  const { intent, advertised, observed } = input;

  /* 1. Our own failures. Never the seller's. */
  if (observed.outcome === "gate_error") return "GATE_ERROR";
  if (observed.outcome === "settlement_failed") return "SETTLEMENT_FAILED";

  /* 2. §8.2 step 2 — advertised terms exceeded the intent's caps. */
  if (compareAtomic(advertised.amountAtomic, intent.maxPriceAtomic) > 0) {
    return "REQUIREMENTS_MISMATCH";
  }

  /*
   * 3. D-002 finding 1: this is the BUYER's deadline, not a seller SLA. x402 advertises
   * no response-latency SLA in either version, so this state asserts nothing about a
   * promise the seller made or broke. Every surface displaying it says so.
   */
  if (observed.latencyMs > intent.maxLatencyMs) return "TIMEOUT_EXCEEDED";

  /* 4. Delivery, structurally: a successful status and a non-empty body. */
  if (observed.httpStatus === null) return "NOT_DELIVERED";
  if (!isSuccessStatus(observed.httpStatus)) return "NOT_DELIVERED";
  if (observed.bodyByteLength <= 0) return "NOT_DELIVERED";
  if (observed.bodySha256 === null) return "NOT_DELIVERED";

  /*
   * 5. Shape, but only against what the seller actually published.
   * D-002 findings 2 and 3: mimeType is optional in both versions, and outputSchema
   * does not exist in v2. A seller that published neither cannot produce a mismatch,
   * and this function does not invent one.
   */
  if (advertised.checksAvailable.mimeTypeAdvertised && advertised.mimeType !== null) {
    if (observed.contentType === null) return "SHAPE_MISMATCH";
    if (mediaType(observed.contentType) !== mediaType(advertised.mimeType)) {
      return "SHAPE_MISMATCH";
    }
  }

  if (advertised.checksAvailable.schemaAdvertised) {
    if (observed.schemaConformance === "non_conformant") return "SHAPE_MISMATCH";
    /*
     * The seller advertised a schema but the gate committed no result for it. The gate
     * did not perform a check it claimed to perform, which is our failure, not a
     * delivery failure. It is never resolved in the seller's favour.
     */
    if (observed.schemaConformance === "not_advertised") return "GATE_ERROR";
  }

  /* 6. Structurally what the seller said it would be. Nothing more is claimed. */
  return "DELIVERED_AS_ADVERTISED";
}

/** §5.2 / §8.2 step 6. Exactly one state releases money. */
export function isDischargeEligible(state: VerdictState): boolean {
  return state === "DELIVERED_AS_ADVERTISED";
}

export type { AdvertisedTerms, BuyerIntent, ObservedResponse, VerdictInput, VerdictState };
