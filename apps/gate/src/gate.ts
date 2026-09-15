/*
 * The gate, in the shape D-009 (Option C) decided.
 *
 *   buyer -> quote:  gate reads the seller's 402 and checks it against the buyer's caps
 *   buyer -> call:   gate relays the BUYER's own x402 payment, observes, and judges
 *                    KeeperHub executes the fee only on DELIVERED_AS_ADVERTISED
 *
 * The gate never pays the seller and never signs anything. It relays, observes, hashes and
 * reports. §12 P4 holds: no signer, no write client, no key in this package.
 */
import { randomUUID } from "node:crypto";
import {
  parsePaymentRequired,
  deriveAdvertisedTerms,
  sha256Bytes,
  sha256Canonical,
  type AdvertisedTerms,
  type BuyerIntent,
  type ObservedResponse,
  type Receipt,
  type RunLabel,
  type VerdictState,
} from "@quittance/protocol-types";
import { verdict } from "@quittance/reference";
import { execute, readConfig, chainIdFromCaip2, type ExecuteOutcome } from "./keeperhub.js";

const V2_HEADER = "payment-required";
/* The header the buyer's wallet produces, per the pinned x402 transport specs. */
const PAYMENT_SIGNATURE_HEADER = "payment-signature";
const PAYMENT_SIGNATURE_HEADER_V1 = "x-payment";

export type Quote = {
  readonly quoteId: string;
  readonly url: string;
  readonly intent: BuyerIntent;
  readonly advertised: AdvertisedTerms;
  /** The seller's raw 402, handed back so the buyer's wallet can sign against it directly. */
  readonly rawPaymentRequired: unknown;
  readonly createdAt: string;
};

export type QuoteOutcome =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly verdict: VerdictState; readonly reason: string; readonly receipt?: Receipt };

/** Quotes live in memory only; a restart loses them, which loses nothing that moved money. */
const quotes = new Map<string, Quote>();

function mediaType(value: string): string {
  const semi = value.indexOf(";");
  return (semi === -1 ? value : value.slice(0, semi)).trim().toLowerCase();
}

function decodeHeaderPayload(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

/* ------------------------------------------------------------------ *
 * Phase 1 — quote. Reads the seller's own terms and checks the caps.
 * §8.2 step 2: refuse before any purchase.
 * ------------------------------------------------------------------ */

export async function quote(args: {
  readonly url: string;
  readonly intent: BuyerIntent;
}): Promise<QuoteOutcome> {
  let host: string;
  try {
    host = new URL(args.url).host;
  } catch {
    return { ok: false, verdict: "GATE_ERROR", reason: "target is not a valid absolute URL" };
  }

  let response: Response;
  try {
    response = await fetch(args.url, { method: "GET", headers: { accept: "application/json" } });
  } catch (error) {
    return { ok: false, verdict: "GATE_ERROR", reason: `target unreachable: ${(error as Error).message}` };
  }

  if (response.status !== 402) {
    return {
      ok: false,
      verdict: "GATE_ERROR",
      reason: `expected HTTP 402 from the resource, received ${response.status}`,
    };
  }

  const header = response.headers.get(V2_HEADER);
  let raw: unknown;
  try {
    raw = header !== null && header.length > 0 ? decodeHeaderPayload(header) : JSON.parse(await response.text());
  } catch (error) {
    return { ok: false, verdict: "GATE_ERROR", reason: `402 payload unreadable: ${(error as Error).message}` };
  }

  const parsed = parsePaymentRequired(raw);
  if (!parsed.ok) {
    /* §17: do not guess at terms that decide money. */
    return {
      ok: false,
      verdict: "GATE_ERROR",
      reason: `advertised terms do not parse against the pinned x402 schemas: ${parsed.issues.join("; ")}`,
    };
  }

  const advertised = await deriveAdvertisedTerms({ payload: parsed.payload, host });
  if (advertised === null) {
    return { ok: false, verdict: "GATE_ERROR", reason: "no usable offer in accepts[]" };
  }

  /* §8.2 step 2 — caps exceeded: no purchase, no fee. This is the only pre-purchase refusal. */
  if (BigInt(advertised.amountAtomic) > BigInt(args.intent.maxPriceAtomic)) {
    return {
      ok: false,
      verdict: "REQUIREMENTS_MISMATCH",
      reason: `advertised ${advertised.amountAtomic} exceeds the intent cap ${args.intent.maxPriceAtomic}`,
    };
  }

  const q: Quote = {
    quoteId: randomUUID(),
    url: args.url,
    intent: args.intent,
    advertised,
    rawPaymentRequired: raw,
    createdAt: new Date().toISOString(),
  };
  quotes.set(q.quoteId, q);
  return { ok: true, quote: q };
}

export function getQuote(quoteId: string): Quote | undefined {
  return quotes.get(quoteId);
}

/* ------------------------------------------------------------------ *
 * Phase 2 — call. Relays the buyer's payment, observes, judges, executes the fee.
 * ------------------------------------------------------------------ */

export type FeeAuthorization = {
  /** The USDC-style contract the fee is denominated in. Read from the buyer, not compiled in. */
  readonly asset: string;
  readonly network: string;
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly validAfter: string;
  readonly validBefore: string;
  readonly nonce: string;
  readonly signature: string;
};

export type CallResult = {
  readonly receipt: Receipt;
  readonly leaf: string;
  readonly verdict: VerdictState;
  readonly body: Uint8Array | null;
  readonly execution: ExecuteOutcome | null;
};

export async function call(args: {
  readonly quote: Quote;
  /** The buyer's own signed x402 payment header. The gate forwards it and never makes one. */
  readonly paymentHeader: string;
  readonly paymentHeaderName?: string;
  readonly fee: FeeAuthorization | null;
  readonly label: RunLabel;
  readonly simulateOnly: boolean;
}): Promise<CallResult> {
  const { quote: q } = args;
  const headerName =
    args.paymentHeaderName ??
    (q.advertised.x402Version === 2 ? PAYMENT_SIGNATURE_HEADER : PAYMENT_SIGNATURE_HEADER_V1);

  const startedAt = new Date().toISOString();
  const began = Date.now();

  let observed: ObservedResponse;
  let body: Uint8Array | null = null;

  try {
    const response = await fetch(q.url, {
      method: "GET",
      headers: { accept: "application/json", [headerName]: args.paymentHeader },
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const latencyMs = Date.now() - began;
    const contentType = response.headers.get("content-type");

    observed = {
      outcome: "observed",
      httpStatus: response.status,
      bodyByteLength: bytes.byteLength,
      bodySha256: bytes.byteLength > 0 ? await sha256Bytes(bytes) : null,
      contentType: contentType === null ? null : mediaType(contentType),
      latencyMs,
      /*
       * D-005: x402 v2 advertises no response schema, so there is nothing to conform to.
       * `not_advertised` is the honest value, not a skipped check.
       */
      schemaConformance: "not_advertised",
    };
    /* §6 retain: none — the body is hashed, then discarded. */
    body = q.intent.retain === "full" ? bytes : null;
  } catch (error) {
    observed = {
      outcome: "observed",
      httpStatus: null,
      bodyByteLength: 0,
      bodySha256: null,
      contentType: null,
      latencyMs: Date.now() - began,
      schemaConformance: "not_advertised",
    };
    void error;
  }

  const requestSha256 = await sha256Canonical({
    url: q.url,
    method: "GET",
    x402Version: q.advertised.x402Version,
  });

  let state: VerdictState = verdict({
    intent: q.intent,
    advertised: q.advertised,
    observed,
  });

  /* §5.2 only one state releases money. */
  let execution: ExecuteOutcome | null = null;
  let dischargeTxHash: string | null = null;
  let keeperhubRunId: string | null = null;

  if (state === "DELIVERED_AS_ADVERTISED" && args.fee !== null) {
    execution = await executeFee(args.fee, q.intent.authorizationNonce, args.simulateOnly);
    if (execution.ok) {
      keeperhubRunId = execution.result.executionId;
      dischargeTxHash = execution.result.transactionHash ?? null;
      if (execution.result.status === "failed") {
        /* The check passed; the execution did not land. That is OUR failure, and it is named. */
        state = "SETTLEMENT_FAILED";
      }
    } else {
      state = "SETTLEMENT_FAILED";
    }
  }

  const receipt: Receipt = {
    receiptVersion: 1,
    intent: q.intent,
    advertised: q.advertised,
    request: { url: q.url, method: "GET", requestSha256, startedAt },
    observed,
    run: { keeperhubRunId, dischargeTxHash, mode: "gate", label: args.label },
    publishedVerdict: state,
  };

  return { receipt, leaf: await sha256Canonical(receipt), verdict: state, body, execution };
}

/**
 * The fee leg. KeeperHub broadcasts the buyer's own pre-signed EIP-3009 authorization as a
 * contract call. We supply arguments; we do not sign.
 */
async function executeFee(
  fee: FeeAuthorization,
  nonce: string,
  simulate: boolean,
): Promise<ExecuteOutcome> {
  const config = readConfig();
  if (config === null) {
    return {
      ok: false,
      reason:
        "KEEPERHUB_API_BASE_URL or KEEPERHUB_API_KEY is not set. KeeperHub is the only path to chain (§12 P4); the gate does not fall back to signing locally.",
      httpStatus: null,
    };
  }

  const chainId = chainIdFromCaip2(fee.network);
  if (chainId === null) {
    return { ok: false, reason: `unsupported CAIP-2 network ${fee.network}`, httpStatus: null };
  }

  return execute(
    config,
    {
      contractAddress: fee.asset,
      chainId,
      functionName: "transferWithAuthorization",
      functionArgs: JSON.stringify([
        fee.from,
        fee.to,
        fee.value,
        fee.validAfter,
        fee.validBefore,
        fee.nonce,
        fee.signature,
      ]),
    },
    { simulate, idempotencyKey: `quittance-fee-${nonce}` },
  );
}
