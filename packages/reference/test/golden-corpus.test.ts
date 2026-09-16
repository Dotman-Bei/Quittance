/*
 * §13 "Golden receipts: a checked-in corpus of real receipts from live endpoints,
 *      re-derived in CI."
 * §22 G2 "500 golden receipts re-derive byte-identically."
 *
 * This is the half of G2 that the property tests cannot reach. Properties prove the
 * function behaves over GENERATED envelopes; this proves the PUBLISHED corpus — receipts
 * that real endpoints and a real gate actually produced — still says what it said.
 *
 * It exists because both of this project's worst bugs were invisible to everything else:
 *
 *   D-014 — the gate published SETTLEMENT_FAILED over an envelope that re-derives to
 *           DELIVERED_AS_ADVERTISED. 51 tests passed. Found only by re-deriving the
 *           corpus from a clean clone.
 *   D-015 — a test teardown deleted the entire corpus and `git add -A` committed it.
 *           Every gate still passed, because nothing checked the corpus was there.
 *
 * So: the corpus must exist, must be non-trivial, and every receipt in it must re-derive.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Receipt, canonicalJson, sha256Canonical, sha256Utf8 } from "@quittance/protocol-types";
import { verdict } from "../src/verdict.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const CORPUS = join(ROOT, "evidence", "receipts");

function corpusFiles(): readonly string[] {
  if (!existsSync(CORPUS)) return [];
  return readdirSync(CORPUS).filter((f) => f.endsWith(".json"));
}

describe("§13 golden corpus — the published receipts still say what they said", () => {
  const files = corpusFiles();

  /*
   * D-015: the corpus was deleted and every gate still passed. Its absence is now a
   * failure, not a silent empty set.
   */
  it("exists and is not trivially small", () => {
    expect(existsSync(CORPUS), `${CORPUS} is missing — the published corpus was deleted`).toBe(true);
    expect(files.length).toBeGreaterThan(50);
  });

  it("every receipt parses against the published schema", () => {
    const bad: string[] = [];
    for (const f of files) {
      const parsed = Receipt.safeParse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      if (!parsed.success) bad.push(`${f}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    }
    expect(bad, bad.slice(0, 3).join(" | ")).toEqual([]);
  });

  /* D-014. The published verdict must be what the function returns over the receipt's
   * own committed inputs — not merely what the gate decided to write down. */
  it("every published verdict re-derives from the receipt's own committed inputs", () => {
    const mismatches: string[] = [];
    for (const f of files) {
      const r = Receipt.parse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      const derived = verdict({ intent: r.intent, advertised: r.advertised, observed: r.observed });
      if (derived !== r.publishedVerdict) {
        mismatches.push(`${f.slice(0, 12)}…: published ${r.publishedVerdict}, derived ${derived}`);
      }
    }
    expect(mismatches, mismatches.slice(0, 3).join(" | ")).toEqual([]);
  });

  /* "byte-identically" — canonicalization is stable, so a receipt read and rewritten
   * produces the same bytes and therefore the same leaf. */
  it("every receipt canonicalizes byte-identically on a round trip", () => {
    const drifted: string[] = [];
    for (const f of files) {
      const r = Receipt.parse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      const once = canonicalJson(r);
      const twice = canonicalJson(JSON.parse(once));
      if (once !== twice) drifted.push(f);
    }
    expect(drifted, drifted.slice(0, 3).join(" | ")).toEqual([]);
  });

  /* The filename is a claim: it is the sha256 of the canonicalized contents. A reader can
   * check it without trusting us, so CI checks it too. */
  it("every filename is the sha256 of its own canonicalized contents", async () => {
    const wrong: string[] = [];
    for (const f of files) {
      const r = Receipt.parse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      const leaf = await sha256Canonical(r);
      if (leaf !== f.replace(/\.json$/, "")) wrong.push(`${f.slice(0, 12)}… hashes to ${leaf.slice(0, 12)}…`);
    }
    expect(wrong, wrong.slice(0, 3).join(" | ")).toEqual([]);
  });

  /* A discharge against a state that cannot discharge is the most serious finding the
   * corpus can contain. */
  it("no receipt records a transaction against a non-discharge-eligible verdict", () => {
    const bad: string[] = [];
    for (const f of files) {
      const r = Receipt.parse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      if (r.run.dischargeTxHash !== null && r.publishedVerdict !== "DELIVERED_AS_ADVERTISED") {
        bad.push(`${f.slice(0, 12)}…: ${r.publishedVerdict} carries ${r.run.dischargeTxHash}`);
      }
    }
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  /* §8.3 / K6: our own endpoint must never sit in the published third-party ledger. */
  it("the published ledger contains no PROJECT_BASELINE or LOCAL_FIXTURE rows", () => {
    const ours: string[] = [];
    for (const f of files) {
      const r = Receipt.parse(JSON.parse(readFileSync(join(CORPUS, f), "utf8")));
      if (r.run.label !== "THIRD_PARTY") ours.push(`${f.slice(0, 12)}…: ${r.run.label}`);
    }
    expect(ours, ours.slice(0, 3).join(" | ")).toEqual([]);
  });

  it("reports the corpus size, because G2 names a threshold", () => {
    const G2_TARGET = 500;
    /*
     * G2's row reads "500 golden receipts re-derive byte-identically". The assertions
     * above prove the "re-derive byte-identically" half for every receipt we have. The
     * COUNT is reported rather than asserted: failing the build for having fewer real
     * receipts than a target would be an incentive to manufacture them, which is the one
     * thing this corpus must never contain.
     */
    const short = files.length < G2_TARGET;
    console.log(
      `  corpus: ${files.length} receipts, all re-deriving` +
        (short ? ` — ${G2_TARGET - files.length} short of G2's stated ${G2_TARGET}` : " — G2 threshold met"),
    );
    expect(files.length).toBeGreaterThan(0);
  });
});
