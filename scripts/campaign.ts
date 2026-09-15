/*
 * §14 Adversarial Evidence Campaign · §22 G5 and G6.
 *
 *   pnpm campaign -- --min 100 --window 24h
 *
 * Runs gated calls against live third-party endpoints, paced to span the window, and
 * publishes totals INCLUDING every failure.
 *
 * §14: "Transient infrastructure errors are counted and reported separately from verdicts.
 *       They are never folded into the delivery record of an endpoint, because an RPC
 *       hiccup is our failure, not the seller's."
 *
 * §12 P4: this script holds no key and signs nothing. The buyer is a separate actor (§7);
 * its signer is loaded at runtime from BUYER_SIGNER_MODULE, which is configuration.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { VERDICT_STATES, type VerdictState } from "@quittance/protocol-types";

const ROOT = new URL("..", import.meta.url).pathname;
const GATE = process.env["GATE_URL"] ?? "http://localhost:8787";

type Args = {
  readonly min: number;
  readonly windowMs: number;
  readonly maxPriceAtomic: string;
  readonly targetsFile: string;
  readonly label: string;
};

function parseArgs(argv: readonly string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const window = get("--window") ?? "24h";
  const m = /^(\d+)(h|m|s)$/.exec(window);
  if (m === null) throw new Error(`--window must look like 24h, 90m or 30s; got ${window}`);
  const n = Number(m[1]);
  const unit = m[2] === "h" ? 3_600_000 : m[2] === "m" ? 60_000 : 1_000;
  return {
    min: Number(get("--min") ?? "100"),
    windowMs: n * unit,
    maxPriceAtomic: get("--max-price") ?? "5000",
    targetsFile: get("--targets") ?? join(ROOT, "evidence/campaign-targets.json"),
    label: get("--label") ?? "THIRD_PARTY",
  };
}

type Tally = {
  gated: number;
  discharges: number;
  byState: Record<VerdictState, number>;
  /* Ours, never the seller's. Counted apart from every verdict. */
  transientInfra: number;
  refusedPrePurchase: number;
  hosts: Set<string>;
  receipts: string[];
  txs: string[];
};

function emptyTally(): Tally {
  const byState = Object.fromEntries(VERDICT_STATES.map((s) => [s, 0])) as Record<VerdictState, number>;
  return {
    gated: 0, discharges: 0, byState, transientInfra: 0, refusedPrePurchase: 0,
    hosts: new Set(), receipts: [], txs: [],
  };
}

async function oneCall(
  sign: (raw: unknown, o: { feeAtomic: string; feeRecipient: string }) => Promise<Record<string, unknown>>,
  url: string,
  args: Args,
  tally: Tally,
): Promise<void> {
  const nonce = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let quote: Record<string, unknown>;
  try {
    quote = await (
      await fetch(`${GATE}/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          intent: {
            maxPriceAtomic: args.maxPriceAtomic, maxLatencyMs: 20000, retain: "full",
            authorizationNonce: nonce, authorizationExpiry: 1893456000,
          },
        }),
      })
    ).json();
  } catch (error) {
    /* We could not reach our own gate. Ours, not the seller's. */
    tally.transientInfra += 1;
    process.stdout.write(`  infra   gate unreachable: ${(error as Error).message.slice(0, 50)}\n`);
    return;
  }

  if (quote["quoteId"] === undefined) {
    const v = String(quote["verdict"] ?? "GATE_ERROR") as VerdictState;
    /*
     * A pre-purchase refusal is a real outcome and is recorded, but it is NOT a gated call:
     * nothing was bought, so it does not enter the delivery denominator.
     */
    tally.refusedPrePurchase += 1;
    if (v in tally.byState) tally.byState[v] += 1;
    process.stdout.write(`  refused ${v.padEnd(23)} ${new URL(url).host}\n`);
    return;
  }

  let signed: Record<string, unknown>;
  try {
    signed = await sign(quote["rawPaymentRequired"], {
      feeAtomic: process.env["GATE_FEE_ATOMIC"] ?? "100",
      feeRecipient: process.env["GATE_FEE_RECIPIENT"] ?? "",
    });
  } catch (error) {
    tally.transientInfra += 1;
    process.stdout.write(`  infra   signing failed: ${(error as Error).message.slice(0, 50)}\n`);
    return;
  }

  let result: Record<string, unknown>;
  try {
    result = await (
      await fetch(`${GATE}/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteId: quote["quoteId"],
          paymentHeader: signed["paymentHeader"],
          paymentHeaderName: signed["paymentHeaderName"],
          fee: signed["fee"],
          label: args.label,
          simulateOnly: false,
        }),
      })
    ).json();
  } catch (error) {
    tally.transientInfra += 1;
    process.stdout.write(`  infra   call failed: ${(error as Error).message.slice(0, 50)}\n`);
    return;
  }

  const verdict = String(result["verdict"] ?? "GATE_ERROR") as VerdictState;
  const receipt = result["receipt"] as Record<string, unknown> | undefined;
  const run = receipt?.["run"] as Record<string, unknown> | undefined;

  tally.gated += 1;
  if (verdict in tally.byState) tally.byState[verdict] += 1;
  if (verdict === "DELIVERED_AS_ADVERTISED") tally.discharges += 1;
  tally.hosts.add(new URL(url).host);
  if (typeof result["receiptLeaf"] === "string") tally.receipts.push(result["receiptLeaf"]);
  const tx = run?.["dischargeTxHash"];
  if (typeof tx === "string") tally.txs.push(tx);

  const obs = receipt?.["observed"] as Record<string, unknown> | undefined;
  process.stdout.write(
    `  ${String(obs?.["httpStatus"] ?? "-").padEnd(4)} ${verdict.padEnd(23)} ${new URL(url).host}\n`,
  );
}

function report(tally: Tally, args: Args, startedAt: string): string {
  const nonDischarges = tally.gated - tally.discharges;
  const states = VERDICT_STATES.filter((s) => tally.byState[s] > 0 && s !== "DELIVERED_AS_ADVERTISED")
    .map((s) => `${s} ${tally.byState[s]}`)
    .join(" · ");
  return [
    `campaign: ${tally.gated} gated calls / ${tally.discharges} discharges / ${nonDischarges} non-discharges`,
    `  ${states.length > 0 ? states : "no non-discharges recorded"}`,
    `  transient infrastructure errors ${tally.transientInfra} (ours, never folded into any endpoint's record)`,
    `  refused before purchase ${tally.refusedPrePurchase} (no money moved)`,
    `  distinct hosts ${tally.hosts.size} · fee transactions ${tally.txs.length}`,
    `  started ${startedAt} · window ${args.windowMs / 3_600_000}h · minimum ${args.min}`,
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const signerPath = process.env["BUYER_SIGNER_MODULE"];
  if (signerPath === undefined) {
    process.stderr.write(
      "BUYER_SIGNER_MODULE is not set. The buyer is a separate actor (§7) and signs with its own\n" +
      "wallet; this script holds no key. Point it at a module exporting signForQuote().\n",
    );
    process.exit(2);
  }
  const { signForQuote } = (await import(signerPath)) as {
    signForQuote: (raw: unknown, o: { feeAtomic: string; feeRecipient: string }) => Promise<Record<string, unknown>>;
  };

  const targets = JSON.parse(await readFile(args.targetsFile, "utf8")) as string[];
  if (targets.length === 0) throw new Error(`${args.targetsFile} lists no targets`);

  const startedAt = new Date().toISOString();
  const tally = emptyTally();
  const gapMs = Math.max(0, Math.floor(args.windowMs / Math.max(1, args.min)));

  process.stdout.write(
    `campaign: ${args.min} calls minimum over ${args.windowMs / 3_600_000}h across ${targets.length} targets\n` +
    `  pacing one call every ${(gapMs / 1000).toFixed(1)}s\n\n`,
  );

  /*
   * G5 counts GATED CALLS, not attempts. A stale index entry that no longer charges is a
   * refusal, not a gated call, so it must not consume a slot — otherwise a campaign of 100
   * attempts against a list with dead entries reports fewer than 100 and fails for a reason
   * that has nothing to do with the mechanism.
   *
   * The attempt cap stops an all-dead target list from looping forever.
   */
  const maxAttempts = args.min * 4;
  for (let i = 0; tally.gated < args.min && i < maxAttempts; i += 1) {
    const url = targets[i % targets.length];
    if (url === undefined) continue;
    await oneCall(signForQuote, url, args, tally);

    if (i % 10 === 9) {
      const dir = join(ROOT, "evidence/campaigns");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${startedAt.replace(/[:.]/g, "-")}.md`),
        `# Campaign — in progress\n\n\`\`\`\n${report(tally, args, startedAt)}\n\`\`\`\n`);
    }
    if (tally.gated < args.min && gapMs > 0) await new Promise((r) => setTimeout(r, gapMs));
  }

  const text = report(tally, args, startedAt);
  process.stdout.write(`\n${text}\n`);

  const dir = join(ROOT, "evidence/campaigns");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${startedAt.replace(/[:.]/g, "-")}.md`),
    `# Campaign\n\nStarted ${startedAt}, finished ${new Date().toISOString()}.\n\n` +
    `\`\`\`\n${text}\n\`\`\`\n\n` +
    `## Fee transactions\n\n${tally.txs.map((t) => `- https://basescan.org/tx/${t}`).join("\n")}\n`,
  );

  /* G5 passes on the minimum being met, not on every call succeeding. */
  process.exit(tally.gated >= args.min ? 0 : 1);
}

main().catch((error: unknown) => {
  process.stderr.write(`campaign failed: ${(error as Error).message}\n`);
  process.exit(1);
});
