/*
 * §17 `scripts/probe-x402.ts` — read live 402 bodies, fail on drift.
 * §22 G1 — part of `pnpm probe:all`.
 *
 * This script reads advertised terms from live sellers and checks that they still parse
 * against the schemas pinned in `.agents/skills/x402/`. It pays nothing, gates nothing and
 * signs nothing: it issues an unauthenticated request and reads the 402 that comes back.
 *
 * Nothing here is compiled in. Targets arrive in PROBE_X402_TARGETS. There is no default
 * URL, no fallback host, and no example address anywhere in this file.
 */
import { parsePaymentRequired, type X402ProbeResult } from "@quittance/protocol-types";
import { bazaarOutputHint, deriveChecksAvailable } from "@quittance/protocol-types";

const TIMEOUT_MS = 15_000;

/**
 * x402 v2 carries terms in a base64 PAYMENT-REQUIRED header; v1 carries them in the JSON
 * body. Both are read, header first, because a v2 server may also send a body.
 * Source: transport-v2-http.md, transport-v1-http.md.
 */
const V2_HEADER = "payment-required";

function decodeBase64Json(value: string): unknown {
  const text = Buffer.from(value, "base64").toString("utf8");
  return JSON.parse(text);
}

async function probeOne(target: string): Promise<X402ProbeResult> {
  let host: string;
  try {
    host = new URL(target).host;
  } catch {
    return {
      ok: false,
      target,
      reason: "NOT_CONFIGURED",
      detail: "not a valid absolute URL",
      httpStatus: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
  } catch (error) {
    clearTimeout(timer);
    return {
      ok: false,
      target,
      reason: "UNREACHABLE",
      detail: (error as Error).message,
      httpStatus: null,
    };
  }
  clearTimeout(timer);

  if (response.status !== 402) {
    return {
      ok: false,
      target,
      reason: "NO_PAYMENT_REQUIRED",
      detail: `expected HTTP 402, received ${response.status}`,
      httpStatus: response.status,
    };
  }

  const headerValue = response.headers.get(V2_HEADER);
  let raw: unknown;
  let carriedIn: "body" | "header";

  if (headerValue !== null && headerValue.length > 0) {
    carriedIn = "header";
    try {
      raw = decodeBase64Json(headerValue);
    } catch (error) {
      return {
        ok: false,
        target,
        reason: "PAYLOAD_DRIFT",
        detail: `PAYMENT-REQUIRED header is not base64 JSON: ${(error as Error).message}`,
        httpStatus: 402,
      };
    }
  } else {
    carriedIn = "body";
    const text = await response.text();
    try {
      raw = JSON.parse(text);
    } catch (error) {
      return {
        ok: false,
        target,
        reason: "PAYLOAD_DRIFT",
        detail: `402 body is not JSON and no PAYMENT-REQUIRED header was sent: ${(error as Error).message}`,
        httpStatus: 402,
      };
    }
  }

  const parsed = parsePaymentRequired(raw);
  if (!parsed.ok) {
    /*
     * This is the branch §17 exists for. The seller answered, but nothing in its terms
     * parses against the pinned specification. We do NOT coerce, patch or guess.
     */
    return {
      ok: false,
      target,
      reason: "PAYLOAD_DRIFT",
      detail: parsed.issues.join("; "),
      httpStatus: 402,
    };
  }

  const payload = parsed.payload;
  const checks = deriveChecksAvailable(payload, 0);

  /* Per-offer failures are surfaced, never dropped quietly. */
  const offerIssues = parsed.offers.flatMap((o) =>
    o.ok ? [] : o.issues.map((i) => `accepts[${o.index}]: ${i}`),
  );

  return {
    ok: true,
    target,
    host,
    httpStatus: 402,
    carriedIn,
    payload,
    offers: parsed.publishedOffers,
    offersParsed: payload.accepts.length,
    offerIssues,
    mimeTypeAdvertised: checks.mimeTypeAdvertised,
    schemaAdvertised: checks.schemaAdvertised,
    bazaarOutputHint: bazaarOutputHint(payload),
  };
}

export async function probeX402(targets: readonly string[]): Promise<readonly X402ProbeResult[]> {
  return Promise.all(targets.map(probeOne));
}

export function readTargetsFromEnv(): readonly string[] {
  const raw = process.env["PROBE_X402_TARGETS"] ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function describe(result: X402ProbeResult): string {
  if (!result.ok) {
    return `  FAIL  ${result.target}\n        ${result.reason}: ${result.detail}`;
  }
  const lines = [
    `  READ  ${result.target}`,
    `        x402 v${result.payload.x402Version}, terms in the ${result.carriedIn}, ${result.offers} offer(s) published, ${result.offersParsed} parsed`,
  ];
  for (const issue of result.offerIssues) {
    lines.push(`        DRIFT ${issue}  <- offer excluded, never guessed at`);
  }
  const offer = result.payload.accepts[0];
  if (offer !== undefined) {
    const amount =
      result.payload.x402Version === 1
        ? result.payload.accepts[0]?.maxAmountRequired
        : result.payload.accepts[0]?.amount;
    lines.push(
      `        scheme=${offer.scheme} network=${offer.network} amount=${amount ?? "?"} (atomic)`,
      `        maxTimeoutSeconds=${offer.maxTimeoutSeconds}  <- payment window, NOT a response deadline (D-002)`,
    );
  }
  lines.push(
    `        checks available: mimeType=${result.mimeTypeAdvertised ? "yes" : "NO"} schema=${
      result.schemaAdvertised ? "yes" : "NO"
    } latencySLA=NO (x402 advertises none)`,
  );
  if (result.bazaarOutputHint !== null) {
    lines.push(
      `        bazaar info.output.type=${result.bazaarOutputHint} (reported only, never a verdict input — D-005)`,
    );
  }
  if (!result.mimeTypeAdvertised && !result.schemaAdvertised) {
    lines.push(
      `        NOTE: this seller publishes neither a mimeType nor a schema. Against it the`,
      `              verdict collapses to status code plus non-empty body, plus the buyer's`,
      `              own latency bound. See WHAT_IS_MEASURED.md.`,
    );
  }
  return lines.join("\n");
}
