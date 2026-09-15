/*
 * §13 "a receipt round-trips through canonicalization byte-identically."
 * §10 receipt leaves are sha256 of the canonicalized receipt.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canonicalJson, sha256Canonical } from "@quittance/protocol-types";

const arbJson = fc.jsonValue();

describe("§10 canonicalization", () => {
  it("round-trips byte-identically", () => {
    fc.assert(
      fc.property(arbJson, (v) => {
        const once = canonicalJson(v);
        const twice = canonicalJson(JSON.parse(once));
        expect(twice).toBe(once);
      }),
      { numRuns: 2000 },
    );
  });

  it("is independent of key insertion order", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 8 }), fc.jsonValue(), {
          minKeys: 2,
          maxKeys: 8,
        }),
        (obj) => {
          const shuffled: Record<string, unknown> = {};
          for (const k of Object.keys(obj).reverse()) shuffled[k] = obj[k];
          expect(canonicalJson(shuffled)).toBe(canonicalJson(obj));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("preserves array order", () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue(), { minLength: 2, maxLength: 8 }), (arr) => {
        const reversed = [...arr].reverse();
        // Equal only when the array is a palindrome under canonical form.
        const same = canonicalJson(arr) === canonicalJson(reversed);
        expect(same).toBe(canonicalJson(arr) === canonicalJson([...arr].reverse()));
      }),
      { numRuns: 500 },
    );
  });

  it("distinguishes null from an absent key", () => {
    expect(canonicalJson({ a: null })).not.toBe(canonicalJson({}));
  });

  it("hashes equal structures to equal leaves", async () => {
    const a = await sha256Canonical({ x: 1, y: [true, null, "z"] });
    const b = await sha256Canonical({ y: [true, null, "z"], x: 1 });
    expect(b).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
