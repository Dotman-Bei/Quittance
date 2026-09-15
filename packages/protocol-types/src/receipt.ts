/*
 * §5.2 "A verdict may only be computed from data committed to in the receipt.
 *       Anything the gate knows but did not commit to is not an input."
 *
 * Every field the verdict function reads is defined here. If a check needs a new
 * input, it is committed here first.
 */
import { z } from "zod";
import { AtomicAmount, X402Version } from "./x402.js";
import { VERDICT_STATES } from "./verdict-state.js";

export const Sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, "expected lowercase sha256 hex");

/* ---------------------------------------------------------------------------
 * Advertised terms — the seller's own words, lifted out of its 402 response.
 * ------------------------------------------------------------------------- */

/**
 * D-002: which checks the seller made available at all. Without this, an endpoint
 * checked on four dimensions is compared against one checked on two, and the
 * comparison is meaningless. §9 endpoint pages render it as a column.
 */
export const ChecksAvailable = z.object({
  /** Did the seller publish a mimeType? Optional in both x402 versions. */
  mimeTypeAdvertised: z.boolean(),
  /** Did the seller publish a response schema? v1 outputSchema, or v2 bazaar. */
  schemaAdvertised: z.boolean(),
  /**
   * Always false. x402 advertises no response-latency SLA in either version
   * (D-002 finding 1). Retained as an explicit field so that a receipt states the
   * absence rather than leaving a reader to assume the check existed.
   */
  latencySlaAdvertised: z.literal(false),
});
export type ChecksAvailable = z.infer<typeof ChecksAvailable>;

export const AdvertisedTerms = z.object({
  x402Version: X402Version,
  /** Host only. The full URL lives in the request commitment. */
  host: z.string(),
  scheme: z.string(),
  network: z.string(),
  asset: z.string(),
  payTo: z.string(),
  /** Normalised across v1 `maxAmountRequired` and v2 `amount`. Both are atomic units. */
  amountAtomic: AtomicAmount,
  /** Upstream: "Maximum time allowed for payment completion". NOT a response deadline. */
  maxTimeoutSeconds: z.number(),
  mimeType: z.string().nullable(),
  /** sha256 of the canonicalized advertised schema, when one was published. */
  outputSchemaHash: Sha256Hex.nullable(),
  checksAvailable: ChecksAvailable,
  /** sha256 of the canonicalized raw 402 payload, exactly as received. */
  rawTermsHash: Sha256Hex,
});
export type AdvertisedTerms = z.infer<typeof AdvertisedTerms>;

/* ---------------------------------------------------------------------------
 * Buyer intent — the caps the buyer signed for.
 * D-002: maxLatencyMs is the BUYER's deadline. x402 has no seller-advertised
 * latency SLA, so TIMEOUT_EXCEEDED is derived from here, not from the terms.
 * ------------------------------------------------------------------------- */

export const BuyerIntent = z.object({
  maxPriceAtomic: AtomicAmount,
  maxLatencyMs: z.number().int().positive(),
  /** §6 `full` retains plaintext; `none` is hash-only mode. */
  retain: z.enum(["full", "none"]),
  /** §12 the authorization nonce. Every discharge is idempotent by this value. */
  authorizationNonce: z.string().min(1),
  authorizationExpiry: z.number().int(),
});
export type BuyerIntent = z.infer<typeof BuyerIntent>;

/* ---------------------------------------------------------------------------
 * Observed response — what actually came back.
 * ------------------------------------------------------------------------- */

/** Whether the gate got as far as observing a response at all. */
export const GateOutcome = z.enum(["observed", "gate_error", "settlement_failed"]);
export type GateOutcome = z.infer<typeof GateOutcome>;

/**
 * The schema check's result, committed at observation time. In hash-only mode the
 * body is discarded after the check, so the RESULT is committed rather than the
 * body. A holder of the response can re-derive it; §6.
 */
export const SchemaConformance = z.enum(["conformant", "non_conformant", "not_advertised"]);
export type SchemaConformance = z.infer<typeof SchemaConformance>;

export const ObservedResponse = z.object({
  outcome: GateOutcome,
  /** Null when the request was aborted or never completed. */
  httpStatus: z.number().int().nullable(),
  bodyByteLength: z.number().int().nonnegative(),
  bodySha256: Sha256Hex.nullable(),
  /** The response's own declared content type, media type only, lowercased. */
  contentType: z.string().nullable(),
  /** Wall-clock milliseconds from request start to response completion. */
  latencyMs: z.number().nonnegative(),
  schemaConformance: SchemaConformance,
});
export type ObservedResponse = z.infer<typeof ObservedResponse>;

/* ---------------------------------------------------------------------------
 * Labels — §0.7, §8.3, §13
 * ------------------------------------------------------------------------- */

export const RunLabel = z.enum(["THIRD_PARTY", "PROJECT_BASELINE", "LOCAL_FIXTURE"]);
export type RunLabel = z.infer<typeof RunLabel>;

export const GateMode = z.enum(["gate", "facilitator"]);
export type GateMode = z.infer<typeof GateMode>;

/* ---------------------------------------------------------------------------
 * The receipt.
 * ------------------------------------------------------------------------- */

export const RequestCommitment = z.object({
  url: z.string(),
  method: z.string(),
  requestSha256: Sha256Hex,
  startedAt: z.string(),
});
export type RequestCommitment = z.infer<typeof RequestCommitment>;

/** §15 every receipt carries its KeeperHub run id. Log lines are referenced by id. */
export const RunContext = z.object({
  keeperhubRunId: z.string().nullable(),
  /** Present only when a discharge executed. Its ABSENCE is the point of a C-004 receipt. */
  dischargeTxHash: z.string().nullable(),
  mode: GateMode,
  label: RunLabel,
});
export type RunContext = z.infer<typeof RunContext>;

export const Receipt = z.object({
  receiptVersion: z.literal(1),
  intent: BuyerIntent,
  advertised: AdvertisedTerms,
  request: RequestCommitment,
  observed: ObservedResponse,
  run: RunContext,
  /**
   * The verdict as PUBLISHED by the gate. It is not an input to verdict(); it is the
   * claim a verifier checks by re-running verdict() over `advertised` and `observed`
   * and comparing. A mismatch is the finding.
   */
  publishedVerdict: z.enum(VERDICT_STATES),
});
export type Receipt = z.infer<typeof Receipt>;

/** The inputs to the verdict function, and nothing else. */
export type VerdictInput = {
  readonly intent: BuyerIntent;
  readonly advertised: AdvertisedTerms;
  readonly observed: ObservedResponse;
};
