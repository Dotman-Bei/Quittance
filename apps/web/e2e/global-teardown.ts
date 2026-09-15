import { rm } from "node:fs/promises";
import { join } from "node:path";
import { unseed } from "./fixtures";

/** Removes every fixture receipt. Nothing this run wrote survives it. */
export default async function globalTeardown(): Promise<void> {
  await unseed();
  await rm(join(__dirname, ".seeded.json"), { force: true });
}
