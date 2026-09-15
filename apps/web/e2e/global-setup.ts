import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seed } from "./fixtures";

/** Seeds fixture receipts and hands their leaves to the specs via a temp file. */
export default async function globalSetup(): Promise<void> {
  const seeded = await seed();
  await writeFile(join(__dirname, ".seeded.json"), JSON.stringify(seeded));
}
