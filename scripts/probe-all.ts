/*
 * §22 G1 — `pnpm probe:all`.
 *
 * "Passes when: Probes read live terms, and the address-literal check finds nothing in
 *  apps/ or packages/."
 *
 * Both halves must hold. This script exits zero only when live terms were actually read
 * and no compiled-in protocol fact was found. It never reports a pass because a target
 * happened to be unreachable, and it never treats "not configured" as "fine".
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { deriveServiceState } from "@quittance/protocol-types";
import { probeX402, readTargetsFromEnv, describe as describeX402 } from "./probe-x402.js";
import { probeKeeperHub, describe as describeKeeperHub } from "./probe-keeperhub.js";

const ROOT = new URL("..", import.meta.url).pathname;

/* ------------------------------------------------------------------ *
 * Half 2: the address-literal check (§17).
 * ------------------------------------------------------------------ */

const SCANNED_ROOTS = ["apps", "packages"];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "coverage", ".turbo"]);

/** A 20-byte hex address, an ABI blob, or a facilitator URL, as a compiled-in literal. */
const PATTERNS: readonly { readonly name: string; readonly re: RegExp }[] = [
  { name: "address literal", re: /0x[0-9a-fA-F]{40}\b/ },
  { name: "private key shaped literal", re: /0x[0-9a-fA-F]{64}\b/ },
  { name: "facilitator URL literal", re: /["'`]https?:\/\/[^"'`]*facilitator[^"'`]*["'`]/i },
  { name: "inline ABI fragment", re: /"(?:stateMutability|internalType)"\s*:/ },
];

function walk(dir: string): readonly string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // The directory does not exist in this checkout. Reported by the caller as zero files
    // scanned rather than silently counted as a pass.
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/.test(entry)) out.push(p);
  }
  return out;
}

function addressLiteralCheck(): { readonly ok: boolean; readonly scanned: number; readonly hits: readonly string[] } {
  const hits: string[] = [];
  let scanned = 0;

  for (const root of SCANNED_ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      scanned += 1;
      const rel = file.slice(ROOT.length);
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { name, re } of PATTERNS) {
          if (re.test(line)) hits.push(`${rel}:${i + 1}: ${name}`);
        }
      });
    }
  }
  return { ok: hits.length === 0, scanned, hits };
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main(): Promise<void> {
  let failed = false;

  console.log("G1 — no compiled-in protocol facts, and probes read live terms (§17, §22)\n");

  console.log("[1/3] address-literal check over apps/ and packages/");
  const literals = addressLiteralCheck();
  if (literals.scanned === 0) {
    console.log("      no files scanned — apps/ and packages/ are empty in this checkout");
  } else if (literals.ok) {
    console.log(`      clean: ${literals.scanned} files, no compiled-in protocol fact`);
  } else {
    failed = true;
    console.log(`      FAIL: ${literals.hits.length} hit(s) across ${literals.scanned} files`);
    for (const h of literals.hits) console.log(`        ${h}`);
  }

  console.log("\n[2/3] x402 — reading advertised terms from live sellers");
  const targets = readTargetsFromEnv();
  if (targets.length === 0) {
    failed = true;
    console.log("      FAIL: PROBE_X402_TARGETS is empty.");
    console.log("      There is no default target and there will never be one: a compiled-in");
    console.log("      seller URL is exactly the dated protocol fact §17 forbids. Set it in .env.");
  }
  const x402 = await probeX402(targets);
  for (const r of x402) console.log(describeX402(r));
  if (targets.length > 0 && x402.every((r) => !r.ok)) {
    failed = true;
    console.log("\n      FAIL: no target yielded parseable advertised terms.");
    console.log("      If no live listed endpoint returns a parseable 402, kill criterion K1");
    console.log("      applies: escalate to another live x402 seller, rename the counterparty in");
    console.log("      every document, and never call our own endpoint the live project.");
  }

  console.log("\n[3/3] KeeperHub — reading the chain list from the live API");
  const keeperhub = await probeKeeperHub();
  console.log(describeKeeperHub(keeperhub));
  if (!keeperhub.ok) failed = true;

  const { state, because } = deriveServiceState(x402, keeperhub);
  console.log(`\nservice state: ${state}`);
  for (const b of because) console.log(`  - ${b}`);
  if (state === "PROTOCOL_CONFIG_CHANGED") {
    console.log("  The service stops gating rather than guessing (§17).");
    /*
     * If the service cannot gate, G1 has not passed. Reporting a passed gate beside a
     * state that refuses to gate would be incoherent, and it is the kind of incoherence
     * this repository exists to catch.
     */
    failed = true;
  }

  console.log(`\nG1: ${failed ? "NOT PASSED" : "PASSED"}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(`probe:all failed unexpectedly: ${(error as Error).message}`);
  process.exit(1);
});
