/*
 * §13 property tests. G2: "verdict() is pure and total across generated envelopes."
 * §22 G2 command: `pnpm test:properties`.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  VERDICT_STATES,
  canonicalJson,
  isVerdictState,
} from "@quittance/protocol-types";
import { verdict, isDischargeEligible } from "../src/verdict.js";
import { arbVerdictInput, arbAdvertised, arbIntent, arbObserved } from "./arbitraries.js";

const RUNS = 2000;

describe("§5.2 verdict() is total", () => {
  it("returns an enumerated state for every generated envelope", () => {
    fc.assert(
      fc.property(arbVerdictInput, (input) => {
        const state = verdict(input);
        expect(isVerdictState(state)).toBe(true);
        expect(VERDICT_STATES).toContain(state);
      }),
      { numRuns: RUNS },
    );
  });

  it("never throws on any generated envelope", () => {
    fc.assert(
      fc.property(arbVerdictInput, (input) => {
        expect(() => verdict(input)).not.toThrow();
      }),
      { numRuns: RUNS },
    );
  });
});

describe("§5.2 verdict() is pure", () => {
  it("is deterministic: identical inputs always produce identical verdicts", () => {
    fc.assert(
      fc.property(arbVerdictInput, (input) => {
        const a = verdict(input);
        const b = verdict(input);
        const c = verdict(JSON.parse(canonicalJson(input)));
        expect(b).toBe(a);
        expect(c).toBe(a);
      }),
      { numRuns: RUNS },
    );
  });

  it("does not mutate its inputs", () => {
    fc.assert(
      fc.property(arbVerdictInput, (input) => {
        const before = canonicalJson(input);
        verdict(input);
        expect(canonicalJson(input)).toBe(before);
      }),
      { numRuns: RUNS },
    );
  });

  it("is independent of evaluation order across many calls", () => {
    fc.assert(
      fc.property(fc.array(arbVerdictInput, { minLength: 2, maxLength: 12 }), (inputs) => {
        const forward = inputs.map(verdict);
        const backward = [...inputs].reverse().map(verdict).reverse();
        expect(backward).toEqual(forward);
      }),
      { numRuns: 400 },
    );
  });
});

describe("§5.2 discharge eligibility", () => {
  it("only DELIVERED_AS_ADVERTISED is discharge-eligible", () => {
    for (const state of VERDICT_STATES) {
      expect(isDischargeEligible(state)).toBe(state === "DELIVERED_AS_ADVERTISED");
    }
  });

  it("a gate error or settlement failure is never discharge-eligible", () => {
    fc.assert(
      fc.property(
        arbIntent,
        arbAdvertised,
        arbObserved,
        fc.constantFrom("gate_error" as const, "settlement_failed" as const),
        (intent, advertised, observed, outcome) => {
          const state = verdict({ intent, advertised, observed: { ...observed, outcome } });
          expect(isDischargeEligible(state)).toBe(false);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("a body of zero bytes is never discharge-eligible", () => {
    fc.assert(
      fc.property(arbIntent, arbAdvertised, arbObserved, (intent, advertised, observed) => {
        const state = verdict({
          intent,
          advertised,
          observed: { ...observed, outcome: "observed", bodyByteLength: 0 },
        });
        expect(isDischargeEligible(state)).toBe(false);
      }),
      { numRuns: RUNS },
    );
  });

  it("a non-2xx status is never discharge-eligible", () => {
    fc.assert(
      fc.property(
        arbIntent,
        arbAdvertised,
        arbObserved,
        fc.integer({ min: 300, max: 599 }),
        (intent, advertised, observed, httpStatus) => {
          const state = verdict({
            intent,
            advertised,
            observed: { ...observed, outcome: "observed", httpStatus },
          });
          expect(isDischargeEligible(state)).toBe(false);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("a price above the intent cap is never discharge-eligible", () => {
    fc.assert(
      fc.property(
        arbIntent,
        arbAdvertised,
        arbObserved,
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        (intent, advertised, observed, over) => {
          const cap = BigInt(intent.maxPriceAtomic);
          const state = verdict({
            intent,
            advertised: { ...advertised, amountAtomic: (cap + over).toString() },
            observed: { ...observed, outcome: "observed" },
          });
          expect(state).toBe("REQUIREMENTS_MISMATCH");
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("D-002 the buyer's deadline, not a seller SLA", () => {
  it("latency strictly above the intent cap yields TIMEOUT_EXCEEDED", () => {
    fc.assert(
      fc.property(
        arbIntent,
        arbAdvertised,
        arbObserved,
        fc.integer({ min: 1, max: 60_000 }),
        (intent, advertised, observed, over) => {
          // Keep the price within cap so the earlier REQUIREMENTS_MISMATCH branch is not taken.
          const within = { ...advertised, amountAtomic: intent.maxPriceAtomic };
          const state = verdict({
            intent,
            advertised: within,
            observed: {
              ...observed,
              outcome: "observed",
              latencyMs: intent.maxLatencyMs + over,
            },
          });
          expect(state).toBe("TIMEOUT_EXCEEDED");
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("advertised terms carry no latency SLA, so maxTimeoutSeconds never changes a verdict", () => {
    fc.assert(
      fc.property(
        arbVerdictInput,
        fc.integer({ min: 1, max: 600 }),
        (input, otherTimeout) => {
          const a = verdict(input);
          const b = verdict({
            ...input,
            advertised: { ...input.advertised, maxTimeoutSeconds: otherTimeout },
          });
          expect(b).toBe(a);
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("D-002 checks only against what the seller published", () => {
  it("an unadvertised mimeType can never produce SHAPE_MISMATCH on content type", () => {
    fc.assert(
      fc.property(arbIntent, arbAdvertised, arbObserved, (intent, advertised, observed) => {
        const state = verdict({
          intent,
          advertised: {
            ...advertised,
            amountAtomic: intent.maxPriceAtomic,
            mimeType: null,
            checksAvailable: {
              ...advertised.checksAvailable,
              mimeTypeAdvertised: false,
              schemaAdvertised: false,
            },
          },
          observed: { ...observed, outcome: "observed", latencyMs: 0 },
        });
        expect(state).not.toBe("SHAPE_MISMATCH");
      }),
      { numRuns: RUNS },
    );
  });

  it("with neither mimeType nor schema advertised, the check collapses to status plus non-empty body", () => {
    fc.assert(
      fc.property(arbIntent, arbAdvertised, arbObserved, (intent, advertised, observed) => {
        const state = verdict({
          intent,
          advertised: {
            ...advertised,
            amountAtomic: intent.maxPriceAtomic,
            mimeType: null,
            checksAvailable: {
              mimeTypeAdvertised: false,
              schemaAdvertised: false,
              latencySlaAdvertised: false,
            },
          },
          observed: { ...observed, outcome: "observed", latencyMs: 0 },
        });
        const delivered =
          observed.httpStatus !== null &&
          observed.httpStatus >= 200 &&
          observed.httpStatus < 300 &&
          observed.bodyByteLength > 0 &&
          observed.bodySha256 !== null;
        expect(state).toBe(delivered ? "DELIVERED_AS_ADVERTISED" : "NOT_DELIVERED");
      }),
      { numRuns: RUNS },
    );
  });

  it("charset parameters do not create a content-type mismatch", () => {
    fc.assert(
      fc.property(arbIntent, arbAdvertised, arbObserved, (intent, advertised, observed) => {
        const state = verdict({
          intent,
          advertised: {
            ...advertised,
            amountAtomic: intent.maxPriceAtomic,
            mimeType: "application/json",
            checksAvailable: {
              mimeTypeAdvertised: true,
              schemaAdvertised: false,
              latencySlaAdvertised: false,
            },
          },
          observed: {
            ...observed,
            outcome: "observed",
            latencyMs: 0,
            httpStatus: 200,
            bodyByteLength: 1,
            bodySha256: "0".repeat(64),
            contentType: "Application/JSON; charset=UTF-8",
          },
        });
        expect(state).toBe("DELIVERED_AS_ADVERTISED");
      }),
      { numRuns: 200 },
    );
  });
});
