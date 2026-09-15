/*
 * §14 The adversarial baseline endpoint.
 *
 * "Run scripts/campaign.ts against a mix of live endpoints and our own labelled baseline
 *  endpoint configured to fail in specific ways: empty body, wrong mime type, slow past the
 *  advertised timeout, 502 after payment, and a duplicate settlement attempt."
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * THIS IS OUR OWN ENDPOINT. Every run against it is labelled PROJECT_BASELINE and is
 * NEVER counted as third-party adoption or as market demand (§0.7, §8.3, K6). It exists
 * because a delivery checker that has never recorded a failure has not been tested.
 * ─────────────────────────────────────────────────────────────────────────────────────
 *
 * It does NOT settle the purchase leg. It checks that a payment header is present and then
 * serves its configured response. So a baseline run moves no purchase money, and that is
 * disclosed rather than hidden: these runs prove the VERDICT reacts correctly to a failing
 * response, not that a payment settled.
 *
 * §17: the advertised asset, network and payTo are read from the environment. Nothing
 * dated is compiled in.
 */
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";

const app = new Hono();

const ASSET = process.env["BASELINE_ASSET"] ?? "";
const NETWORK = process.env["BASELINE_NETWORK"] ?? "";
const PAY_TO = process.env["BASELINE_PAY_TO"] ?? "";
const PRICE = process.env["BASELINE_PRICE_ATOMIC"] ?? "1000";

/** The x402 v2 PaymentRequired payload, shaped per the pinned specification. */
function paymentRequired(url: string, mimeType: string | null) {
  const resource: Record<string, unknown> = { url, description: "Quittance PROJECT_BASELINE endpoint" };
  if (mimeType !== null) resource["mimeType"] = mimeType;
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource,
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: PRICE,
        asset: ASSET,
        payTo: PAY_TO,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    extensions: {},
  };
}

function paid(c: Context): boolean {
  return (c.req.header("payment-signature") ?? c.req.header("x-payment") ?? "").length > 0;
}

function challenge(c: Context, mimeType: string | null) {
  const url = new URL(c.req.url).toString();
  const payload = paymentRequired(url, mimeType);
  c.header("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(payload), "utf8").toString("base64"));
  return c.json({}, 402);
}

/** Every mode advertises application/json unless it is the mime-mismatch mode. */
const MODES = {
  /** Control. Delivers exactly what it advertised. */
  ok: { mime: "application/json" as string | null },
  /** 200 with a zero-byte body -> NOT_DELIVERED. */
  empty: { mime: "application/json" as string | null },
  /** Advertises JSON, serves text/plain -> SHAPE_MISMATCH. */
  mime: { mime: "application/json" as string | null },
  /** Answers after a delay -> TIMEOUT_EXCEEDED against the buyer's own cap. */
  slow: { mime: "application/json" as string | null },
  /** 502 after payment -> NOT_DELIVERED. The orphan-payment case from §3. */
  fail: { mime: "application/json" as string | null },
} as const;

app.get("/baseline/:mode", async (c) => {
  const mode = c.req.param("mode");
  if (!(mode in MODES)) return c.json({ error: "unknown mode" }, 404);
  const cfg = MODES[mode as keyof typeof MODES];

  if (!paid(c)) return challenge(c, cfg.mime);

  switch (mode) {
    case "ok":
      return c.json({ baseline: true, mode, note: "PROJECT_BASELINE — delivers as advertised" });
    case "empty":
      return c.body(null, 200, { "content-type": "application/json" });
    case "mime":
      return c.body("not json at all", 200, { "content-type": "text/plain" });
    case "slow": {
      const ms = Number(process.env["BASELINE_SLOW_MS"] ?? "25000");
      await new Promise((r) => setTimeout(r, ms));
      return c.json({ baseline: true, mode, slowMs: ms });
    }
    case "fail":
      return c.json({ error: "baseline induced failure after payment" }, 502);
    default:
      /* AGENTS.md HB-6: an unknown mode is loud, never a quiet fallthrough. */
      throw new Error(`unhandled baseline mode ${mode}`);
  }
});

app.get("/health", (c) =>
  c.json({
    label: "PROJECT_BASELINE",
    warning: "This is our own endpoint. Runs against it are never third-party adoption or demand.",
    settlesPurchaseLeg: false,
    configured: ASSET.length > 0 && NETWORK.length > 0 && PAY_TO.length > 0,
    modes: Object.keys(MODES),
  }),
);

const port = Number(process.env["BASELINE_PORT"] ?? 8788);
serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`PROJECT_BASELINE endpoint on :${info.port}\n`);
  process.stdout.write("  every run against this endpoint is labelled PROJECT_BASELINE\n");
});

export { app };
