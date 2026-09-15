import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Seeded } from "./fixtures";

export function seeded(): Seeded {
  return JSON.parse(readFileSync(join(__dirname, ".seeded.json"), "utf8")) as Seeded;
}
