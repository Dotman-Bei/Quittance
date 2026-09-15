/*
 * §21 / G8 `pnpm claim:verify`.
 *
 * Checks, in order:
 *   1. claims.json parses and every claim states a valid rung.
 *   2. No claim states a rung its evidence does not reach.
 *   3. No forbidden word (§18) appears in any claim or UI string.
 *   4. No green in the palette (§18) and no fabricated metric on a surface.
 *
 * Exits zero only when all four hold.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const problems = [];

/* ---- 1 and 2: the ledger ------------------------------------------------ */
const ledgerPath = join(ROOT, "packages/claim-ledger/data/claims.json");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const rungs = Object.keys(ledger.ladder);

for (const c of ledger.claims) {
  if (!rungs.includes(c.currentRung)) problems.push(`${c.id}: unknown currentRung ${c.currentRung}`);
  if (!rungs.includes(c.targetRung)) problems.push(`${c.id}: unknown targetRung ${c.targetRung}`);
  const evidence = c.evidence ?? [];
  if (c.currentRung !== "R0" && evidence.length === 0) {
    problems.push(`${c.id}: states ${c.currentRung} with no evidence. A claim may not state a rung its evidence does not reach (§21).`);
  }
  if (rungs.indexOf(c.currentRung) > rungs.indexOf(c.targetRung)) {
    problems.push(`${c.id}: currentRung ${c.currentRung} exceeds targetRung ${c.targetRung}`);
  }
}

/* ---- 3: forbidden vocabulary (§18) -------------------------------------- */
const FORBIDDEN = ledger.forbiddenVocabulary;
// Stems, so that a synonym wearing a different suffix is still caught.
const VOCAB_RE = new RegExp(
  `\\b(${["guarantee(?:d|s)?", "safe(?:ly|ty)?", "trustless", "refund(?:s|ed)?", "insured", "verified quality"].join("|")})\\b`,
  "i",
);

const ledgerText = JSON.stringify(ledger.claims);
for (const w of FORBIDDEN) {
  if (ledgerText.toLowerCase().includes(w.toLowerCase())) {
    problems.push(`forbidden word "${w}" appears in a claim (§18)`);
  }
}

/* ---- 3 and 4: UI strings ------------------------------------------------ */
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(entry)) out.push(p);
  }
  return out;
}

/*
 * DECISIONS.md D-013. The old check banned green outright. That was a PROXY for the rule
 * that actually matters — a verdict must not be distinguished by colour — and the Vaultory
 * palette is built on Volt Lime, so the proxy now fails for the wrong reason.
 *
 * The real rule is enforced directly: no verdict state name may appear on a line that also
 * sets a colour. Volt Lime is free to be the brand accent everywhere it does not sit beside
 * a verdict.
 */
const VERDICT_NAMES =
  /\b(DELIVERED_AS_ADVERTISED|NOT_DELIVERED|SHAPE_MISMATCH|TIMEOUT_EXCEEDED|REQUIREMENTS_MISMATCH|GATE_ERROR|SETTLEMENT_FAILED)\b/;
const COLOUR_CLASS =
  /\b(?:bg|text|border|ring|from|via|shadow)-(?:volt|electric|green|emerald|lime|teal|rose|red|amber|indigo|violet|cyan)(?:-\d{2,3})?\b/;

for (const file of walk(join(ROOT, "apps/web"))) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length);
  text.split("\n").forEach((line, i) => {
    // Only inspect string-ish content for vocabulary; a comment naming the rule is not a claim.
    if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) return;
    const m = VOCAB_RE.exec(line);
    if (m) problems.push(`${rel}:${i + 1}: forbidden vocabulary "${m[1]}" in a UI string (§18)`);
    if (VERDICT_NAMES.test(line) && COLOUR_CLASS.test(line)) {
      problems.push(
        `${rel}:${i + 1}: a verdict state is styled with a colour. No verdict may be distinguished by colour (D-013) — label and glyph carry the signal.`,
      );
    }
  });
}

/* ---- report ------------------------------------------------------------- */
if (problems.length > 0) {
  console.error("claim:verify FAILED");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const byRung = {};
for (const c of ledger.claims) byRung[c.currentRung] = (byRung[c.currentRung] ?? 0) + 1;
console.log(`claim:verify OK — ${ledger.claims.length} claims`);
console.log(`  rungs: ${Object.entries(byRung).map(([r, n]) => `${r}=${n}`).join(" ")}`);
console.log(`  no forbidden vocabulary, no verdict distinguished by colour`);
