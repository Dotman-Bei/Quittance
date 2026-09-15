#!/usr/bin/env node
/*
 * §11 `quittance verify <receipt.json>` — runnable with no API key, no account, and no
 * network access. §23 step 4: the receipt is verified from a second terminal, no login.
 *
 * Exit codes: 0 the receipt re-derives; 1 it does not; 2 usage or input error.
 */
import { readFile } from "node:fs/promises";
import { parseReceipt, reDerive } from "@quittance/reference";

const USAGE = `quittance verify <receipt.json> [--body <response-file>]

Re-derives a Quittance receipt's verdict from the receipt alone and compares it with
the verdict the gate published. Needs no account, no API key, and no network.

  --body <file>   Also check the receipt's sha256 commitment to the response bytes.

Exit 0: the receipt re-derives. Exit 1: it does not. Exit 2: usage or input error.
`;

function fail(message: string, code: number): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

async function main(argv: readonly string[]): Promise<void> {
  const args = [...argv];
  const command = args.shift();

  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    process.exit(command === undefined ? 2 : 0);
  }
  if (command !== "verify") fail(`unknown command: ${command}\n\n${USAGE}`, 2);

  const receiptPath = args.shift();
  if (receiptPath === undefined) fail(`missing receipt path\n\n${USAGE}`, 2);

  let bodyPath: string | undefined;
  while (args.length > 0) {
    const flag = args.shift();
    if (flag === "--body") {
      bodyPath = args.shift();
      if (bodyPath === undefined) fail("--body needs a file path", 2);
    } else {
      fail(`unknown option: ${flag ?? ""}\n\n${USAGE}`, 2);
    }
  }

  let raw: string;
  try {
    raw = await readFile(receiptPath, "utf8");
  } catch (error) {
    fail(`cannot read ${receiptPath}: ${(error as Error).message}`, 2);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    fail(`${receiptPath} is not valid JSON: ${(error as Error).message}`, 2);
  }

  const parsed = parseReceipt(json);
  if (!parsed.ok) {
    process.stderr.write("receipt does not match the receipt schema:\n");
    for (const p of parsed.problems) process.stderr.write(`  - ${p}\n`);
    process.exit(2);
  }

  let body: Uint8Array | undefined;
  if (bodyPath !== undefined) {
    try {
      body = new Uint8Array(await readFile(bodyPath));
    } catch (error) {
      fail(`cannot read ${bodyPath}: ${(error as Error).message}`, 2);
    }
  }

  const result = await reDerive(parsed.receipt, body);

  const out = [
    `receipt leaf      ${result.receiptLeaf}`,
    `published verdict ${result.publishedVerdict}`,
    `re-derived        ${result.reDerivedVerdict}`,
    `response hash     ${
      result.bodyHashChecked
        ? result.bodyHashMatches
          ? "matches the commitment"
          : "DOES NOT MATCH the commitment"
        : "not checked (no --body supplied)"
    }`,
    `label             ${parsed.receipt.run.label}`,
  ];
  process.stdout.write(`${out.join("\n")}\n`);

  if (result.problems.length > 0) {
    process.stdout.write("\nproblems:\n");
    for (const p of result.problems) process.stdout.write(`  - ${p}\n`);
  }

  // §9 a mismatch is displayed as loudly as a match.
  process.stdout.write(
    `\n${result.ok ? "RE-DERIVES: the published verdict matches an independent re-derivation." : "MISMATCH: this receipt does not re-derive. See the problems above."}\n`,
  );
  process.exit(result.ok ? 0 : 1);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`unexpected failure: ${(error as Error).message}\n`);
  process.exit(2);
});
