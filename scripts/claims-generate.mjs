/*
 * §21 "docs/claims.md is generated from it and never hand-edited."
 *
 * Reads packages/claim-ledger/data/claims.json and writes docs/claims.md.
 * Run with --check to fail instead of writing when the file is out of date, which is what
 * CI does: a hand-edited or stale claims.md is a claim that no longer traces to the ledger.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const LEDGER = join(ROOT, "packages/claim-ledger/data/claims.json");
const OUT = join(ROOT, "docs/claims.md");

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const rungs = Object.keys(ledger.ladder);

function render() {
  const lines = [];
  lines.push("# Claims");
  lines.push("");
  lines.push("> **Generated from `packages/claim-ledger/data/claims.json`. Never hand-edit this file.**");
  lines.push("> Regenerate with `pnpm claims:generate`. CI fails if it is out of date (§21).");
  lines.push("");
  lines.push("A claim may not state a rung its evidence does not reach. A claim and its evidence land");
  lines.push("in the same commit or neither lands.");
  lines.push("");

  lines.push("## Proof ladder");
  lines.push("");
  lines.push("| Rung | Meaning |");
  lines.push("|---|---|");
  for (const [rung, meaning] of Object.entries(ledger.ladder)) {
    lines.push(`| ${rung} | ${meaning} |`);
  }
  lines.push("");

  const counts = {};
  for (const c of ledger.claims) counts[c.currentRung] = (counts[c.currentRung] ?? 0) + 1;
  const summary = rungs
    .filter((r) => counts[r] !== undefined)
    .map((r) => `${r}=${counts[r]}`)
    .join(" · ");

  lines.push("## Current state");
  lines.push("");
  lines.push(`**${ledger.claims.length} claims — ${summary}**`);
  lines.push("");
  lines.push("| id | Claim | Now | Target | Phase | Gates |");
  lines.push("|---|---|---|---|---|---|");
  for (const c of ledger.claims) {
    const gates = (c.gates ?? []).join(", ") || "—";
    lines.push(
      `| ${c.id} | ${c.claim} | **${c.currentRung}** | ${c.targetRung} | ${c.phase} | ${gates} |`,
    );
  }
  lines.push("");

  lines.push("## Detail");
  lines.push("");
  for (const c of ledger.claims) {
    lines.push(`### ${c.id} — ${c.claim}`);
    lines.push("");
    lines.push(`**Rung:** ${c.currentRung} (target ${c.targetRung}) · **Phase:** ${c.phase}`);
    const kc = (c.killCriteria ?? []).join(", ");
    if (kc.length > 0) lines.push(`**Kill criteria in scope:** ${kc}`);
    lines.push("");

    const evidence = c.evidence ?? [];
    if (evidence.length === 0) {
      lines.push("**Evidence:** none. This claim is asserted in a document and nothing more.");
    } else {
      lines.push("**Evidence:**");
      lines.push("");
      for (const e of evidence) {
        lines.push(`- \`${e.command ?? e.kind}\` — reaches ${e.reaches}`);
        if (e.path !== undefined) lines.push(`  - \`${e.path}\``);
        if (e.detail !== undefined) lines.push(`  - ${e.detail}`);
      }
    }
    lines.push("");
    if (c.notes !== undefined) {
      lines.push(`**Notes.** ${c.notes}`);
      lines.push("");
    }
  }

  lines.push("## Forbidden vocabulary (§18)");
  lines.push("");
  lines.push("Rejected in any claim or UI string, as a backstop against the product lying by accident:");
  lines.push("");
  lines.push(ledger.forbiddenVocabulary.map((w) => `\`${w}\``).join(" · "));
  lines.push("");
  return lines.join("\n");
}

const rendered = render();
const check = process.argv.includes("--check");

if (check) {
  if (!existsSync(OUT)) {
    console.error("docs/claims.md is missing. Run `pnpm claims:generate`.");
    process.exit(1);
  }
  if (readFileSync(OUT, "utf8") !== rendered) {
    console.error("docs/claims.md is out of date or was hand-edited (§21).");
    console.error("Run `pnpm claims:generate` and commit the result.");
    process.exit(1);
  }
  console.log("docs/claims.md is in sync with claims.json");
} else {
  writeFileSync(OUT, rendered);
  console.log(`wrote docs/claims.md — ${ledger.claims.length} claims`);
}
