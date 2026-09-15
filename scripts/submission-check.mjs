/*
 * §22 G9 — `pnpm submission:check`.
 *
 * "Passes when: Repo public, video recorded, tx link resolving, all form answers drafted
 *  including the candid failure answer, contact present."
 *
 * This script reports the true state of the submission package and exits non-zero until
 * every row holds. It never reports a pass on a row it could not check — an unverifiable
 * row is a failure, not a pass, because the point of G9 is to catch the artifact a team
 * forgot rather than to reassure it.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/** @type {{name:string, ok:boolean, detail:string, blocker?:string}[]} */
const rows = [];
const add = (name, ok, detail, blocker) => rows.push({ name, ok, detail, blocker });

/* ---- 1. Public repository (§24) ------------------------------------------ */
let gitDetail = "no git repository — `git init` has not been run";
let gitOk = false;
try {
  execSync("git rev-parse --is-inside-work-tree", { cwd: ROOT, stdio: "pipe" });
  const remotes = execSync("git remote -v", { cwd: ROOT, stdio: "pipe" }).toString().trim();
  const commits = execSync("git rev-list --count HEAD", { cwd: ROOT, stdio: "pipe" })
    .toString()
    .trim();
  if (remotes.length === 0) {
    gitDetail = `repository initialised, ${commits} commit(s), but no remote — it is not public yet`;
  } else {
    gitDetail = `repository initialised, ${commits} commit(s), remote configured`;
    gitOk = true;
  }
} catch {
  // Left as the default: no repository. Never treated as a pass.
}
add("Public repository", gitOk, gitDetail, "run `git init`, commit, and push to a public remote");

/* ---- 2. Demo video (§23) ------------------------------------------------- */
const videoDir = join(ROOT, "evidence");
const videos = existsSync(videoDir)
  ? readdirSync(videoDir).filter((f) => /\.(mp4|mov|webm)$/i.test(f) || /video|demo/i.test(f))
  : [];
add(
  "Demo video",
  videos.length > 0,
  videos.length > 0 ? videos.join(", ") : "no video artifact in evidence/",
  "record per §23: the failure path is shown BEFORE the success path",
);

/* ---- 3. Transaction link + KeeperHub run id (§24) ------------------------ */
const receiptDir = join(ROOT, "evidence/receipts");
const receipts = existsSync(receiptDir)
  ? readdirSync(receiptDir).filter((f) => f.endsWith(".json"))
  : [];
let withTx = 0;
let withRun = 0;
for (const f of receipts) {
  try {
    const r = JSON.parse(readFileSync(join(receiptDir, f), "utf8"));
    if (r?.run?.dischargeTxHash) withTx += 1;
    if (r?.run?.keeperhubRunId) withRun += 1;
  } catch {
    // An unreadable receipt is not evidence. Counted as neither, never as a pass.
  }
}
add(
  "Transaction executed through KeeperHub",
  withTx > 0 && withRun > 0,
  receipts.length === 0
    ? "no receipts — nothing has been executed"
    : `${receipts.length} receipt(s), ${withTx} with a discharge tx, ${withRun} with a run id`,
  "gated by G3. Blocked on the D-007 decision",
);

/* ---- 4. Form answers, including the candid failure answer (§24) ---------- */
const FORM = join(ROOT, "docs/submission.md");
const REQUIRED_ANSWERS = [
  "which project and what the integration does",
  "which keeperhub surfaces",
  "testnet or mainnet",
  "what still breaks",
  "contact",
];
let formOk = false;
let formDetail = "docs/submission.md does not exist";
if (existsSync(FORM)) {
  // Normalise punctuation and whitespace so a comma in a heading is not a failure.
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const text = norm(readFileSync(FORM, "utf8"));
  const missing = REQUIRED_ANSWERS.filter((a) => !text.includes(norm(a)));
  formOk = missing.length === 0;
  formDetail = formOk
    ? `all ${REQUIRED_ANSWERS.length} answers drafted`
    : `missing: ${missing.join("; ")}`;
}
add("Form answers drafted", formOk, formDetail, "§24 — the failure answer is written BEFORE the video");

/* ---- 5. Contact present -------------------------------------------------- */
let contactOk = false;
let contactDetail = "no docs/submission.md";
if (existsSync(FORM)) {
  const text = readFileSync(FORM, "utf8");
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasHandle = /(x\.com|twitter\.com|discord|@[A-Za-z0-9_]{2,})/i.test(text);
  contactOk = hasEmail && hasHandle;
  contactDetail = `email: ${hasEmail ? "present" : "MISSING"}, X/Discord handle: ${hasHandle ? "present" : "MISSING"}`;
}
add("Contact", contactOk, contactDetail, "§24 requires email plus an X or Discord handle");

/* ---- 6. Claims are honest ------------------------------------------------ */
let claimsOk = false;
let claimsDetail = "claim:verify did not run";
try {
  execSync("node scripts/claim-verify.mjs", { cwd: ROOT, stdio: "pipe" });
  execSync("node scripts/claims-generate.mjs --check", { cwd: ROOT, stdio: "pipe" });
  claimsOk = true;
  claimsDetail = "claim:verify exits 0 and docs/claims.md is in sync";
} catch (error) {
  claimsDetail = (error.stdout?.toString() ?? error.message).trim().split("\n")[0] ?? "failed";
}
add("Claims honest (G8)", claimsOk, claimsDetail, "run `pnpm claim:verify`");

/* ---- 7. Upstream report filed (§20) -------------------------------------- */
const upstreamDir = join(ROOT, "docs/upstream");
const drafts = existsSync(upstreamDir)
  ? readdirSync(upstreamDir).filter((f) => f.endsWith(".md"))
  : [];
const filed = drafts.filter((f) => {
  const t = readFileSync(join(upstreamDir, f), "utf8");
  return !/DRAFT, NOT FILED|not filed/i.test(t);
});
add(
  "Upstream report filed",
  filed.length > 0,
  drafts.length === 0
    ? "no report drafted"
    : `${drafts.length} drafted, ${filed.length} filed`,
  "outward-facing — the owner files it, then removes the DRAFT marker",
);

/* ---- report -------------------------------------------------------------- */
const pass = rows.filter((r) => r.ok).length;
console.log("G9 — submission package (§22, §24)\n");
for (const r of rows) {
  console.log(`  ${r.ok ? "[ok]  " : "[MISS]"} ${r.name}`);
  console.log(`         ${r.detail}`);
  if (!r.ok && r.blocker !== undefined) console.log(`         -> ${r.blocker}`);
}
console.log(`\n${pass} of ${rows.length} rows complete.`);
console.log(`G9: ${pass === rows.length ? "PASSED" : "NOT PASSED"}`);
process.exit(pass === rows.length ? 0 : 1);
