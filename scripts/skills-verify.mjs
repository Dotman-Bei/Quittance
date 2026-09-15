/* §0.2 pinned skills must not drift. Re-hashes every vendored file. */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const lock = JSON.parse(readFileSync(join(ROOT, "skills-lock.json"), "utf8"));
let bad = 0, n = 0;

for (const skill of lock.skills) {
  for (const ref of skill.references) {
    n++;
    const p = join(ROOT, ref.vendoredPath);
    if (!existsSync(p)) { console.error(`MISSING ${ref.vendoredPath}`); bad++; continue; }
    const h = createHash("sha256").update(readFileSync(p)).digest("hex");
    if (h !== ref.sha256) { console.error(`DRIFT   ${ref.vendoredPath}`); bad++; }
  }
}

console.log(`skills:verify — checked ${n} pinned files across ${lock.skills.length} skills, ${bad} bad`);
if (bad > 0) {
  console.error("Do not re-pin silently. Read what changed; if upstream now contradicts PRD.md, upstream wins and the discrepancy goes in DECISIONS.md.");
  process.exit(1);
}
