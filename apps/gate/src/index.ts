/*
 * §8.1 apps/gate — the buyer-side gate service (Hono).
 * Shape per DECISIONS.md D-009 (Option C): the buyer pays the seller; the gate observes and
 * has KeeperHub execute a conditional fee on DELIVERED_AS_ADVERTISED only.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BuyerIntent, RunLabel, canonicalJson } from "@quittance/protocol-types";
import { quote, getQuote, call } from "./gate.js";
import { readConfig } from "./keeperhub.js";

const app = new Hono();

const EVIDENCE_DIR =
  process.env["QUITTANCE_EVIDENCE_DIR"] ?? join(process.cwd(), "..", "..", "evidence", "receipts");

const QuoteBody = z.object({ url: z.string(), intent: BuyerIntent });

const FeeAuthorizationBody = z.object({
  asset: z.string(),
  network: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  validAfter: z.string(),
  validBefore: z.string(),
  nonce: z.string(),
  signature: z.string(),
});

const CallBody = z.object({
  quoteId: z.string(),
  paymentHeader: z.string(),
  paymentHeaderName: z.string().optional(),
  fee: FeeAuthorizationBody.nullable(),
  label: RunLabel.default("THIRD_PARTY"),
  simulateOnly: z.boolean().default(false),
});

app.get("/health", (c) => {
  const kh = readConfig();
  return c.json({
    /* §0.7: never claim a capability that has not been configured, let alone executed. */
    keeperhub: kh === null ? "not configured — the gate cannot execute a fee" : "configured",
    mode: "gate",
    legs: {
      purchase: "buyer -> seller, paid and signed by the BUYER, broadcast by the seller's facilitator. Not a KeeperHub execution.",
      fee: "buyer -> gate, executed by KeeperHub, only on DELIVERED_AS_ADVERTISED.",
    },
  });
});

app.post("/quote", async (c) => {
  const parsed = QuoteBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "bad request", issues: parsed.error.issues }, 400);
  }

  const result = await quote(parsed.data);
  if (!result.ok) {
    /*
     * A refusal is a first-class outcome, not an error. REQUIREMENTS_MISMATCH in particular
     * means the gate declined BEFORE any purchase: no money moved anywhere.
     */
    return c.json({ verdict: result.verdict, reason: result.reason, purchased: false }, 200);
  }

  const { quote: q } = result;
  return c.json({
    quoteId: q.quoteId,
    advertised: q.advertised,
    rawPaymentRequired: q.rawPaymentRequired,
    note: "Sign this payment with your own wallet and POST it to /call. The gate never signs and never pays the seller.",
  });
});

app.post("/call", async (c) => {
  const parsed = CallBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "bad request", issues: parsed.error.issues }, 400);
  }

  const q = getQuote(parsed.data.quoteId);
  if (q === undefined) {
    return c.json({ error: "unknown or expired quoteId" }, 404);
  }

  const result = await call({
    quote: q,
    paymentHeader: parsed.data.paymentHeader,
    paymentHeaderName: parsed.data.paymentHeaderName,
    fee: parsed.data.fee,
    label: parsed.data.label,
    simulateOnly: parsed.data.simulateOnly,
  });

  /* §10 the receipt is published, named by its own leaf. */
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    join(EVIDENCE_DIR, `${result.leaf}.json`),
    `${canonicalJson(result.receipt)}\n`,
  );

  return c.json({
    verdict: result.verdict,
    receiptLeaf: result.leaf,
    receipt: result.receipt,
    execution:
      result.execution === null
        ? null
        : result.execution.ok
          ? {
              executionId: result.execution.result.executionId,
              status: result.execution.result.status,
              transactionHash: result.execution.result.transactionHash ?? null,
              transactionLink: result.execution.result.transactionLink ?? null,
              simulated: result.execution.simulated,
              idempotentReplay: result.execution.result.idempotentReplay ?? false,
            }
          : { error: result.execution.reason },
    reDerive: `node packages/verifier/dist/cli.js verify evidence/receipts/${result.leaf}.json`,
  });
});

const port = Number(process.env["GATE_PORT"] ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`quittance gate listening on :${info.port}\n`);
  process.stdout.write(
    readConfig() === null
      ? "  KeeperHub NOT configured — quotes and calls work, fee execution will report SETTLEMENT_FAILED\n"
      : "  KeeperHub configured\n",
  );
});

export { app };
