/*
 * Normalises a parsed x402 402 payload into the AdvertisedTerms the receipt commits to.
 *
 * This is the single place where "what did the seller actually publish?" is decided, so
 * the gate and the probes cannot disagree about it. Every rule below traces to a line in
 * the pinned upstream specification; none is inferred.
 *
 * DECISIONS.md D-002 and D-005 are both encoded here. Read them before changing a line.
 */
import type { PaymentRequired } from "./x402.js";
import type { AdvertisedTerms, ChecksAvailable } from "./receipt.js";
import { sha256Canonical } from "./hash.js";

/** Media type only, lowercased: `application/json; charset=utf-8` -> `application/json`. */
function mediaType(value: string): string {
  const semi = value.indexOf(";");
  return (semi === -1 ? value : value.slice(0, semi)).trim().toLowerCase();
}

export type SelectedOffer = {
  /** Index into `accepts[]`. Recorded so a reader can find the exact entry judged. */
  readonly index: number;
  readonly scheme: string;
  readonly network: string;
  readonly asset: string;
  readonly payTo: string;
  readonly amountAtomic: string;
  readonly maxTimeoutSeconds: number;
};

/**
 * Picks the offer to judge against. Deliberately the FIRST entry only.
 *
 * Choosing the cheapest, or the one on a preferred network, would be the gate exercising
 * discretion that the receipt does not commit to, and two gates would then reach
 * different verdicts on the same 402. Selection policy belongs to the buyer's intent, not
 * here; when a buyer needs a different offer it passes the index.
 */
export function selectOffer(payload: PaymentRequired, index = 0): SelectedOffer | null {
  const entry = payload.accepts[index];
  if (entry === undefined) return null;

  if (payload.x402Version === 1) {
    const v1 = payload.accepts[index];
    if (v1 === undefined) return null;
    return {
      index,
      scheme: v1.scheme,
      network: v1.network,
      asset: v1.asset,
      payTo: v1.payTo,
      amountAtomic: v1.maxAmountRequired,
      maxTimeoutSeconds: v1.maxTimeoutSeconds,
    };
  }

  const v2 = payload.accepts[index];
  if (v2 === undefined) return null;
  return {
    index,
    scheme: v2.scheme,
    network: v2.network,
    asset: v2.asset,
    payTo: v2.payTo,
    amountAtomic: v2.amount,
    maxTimeoutSeconds: v2.maxTimeoutSeconds,
  };
}

/** The MIME type the seller published, or null. Its location differs by version (D-002). */
export function advertisedMimeType(payload: PaymentRequired, index = 0): string | null {
  if (payload.x402Version === 1) {
    // v1: optional, on each accepts[] entry.
    const raw = payload.accepts[index]?.mimeType;
    return typeof raw === "string" && raw.length > 0 ? mediaType(raw) : null;
  }
  // v2: optional, moved to the `resource` object.
  const raw = payload.resource.mimeType;
  return typeof raw === "string" && raw.length > 0 ? mediaType(raw) : null;
}

/** The response schema the seller published, or null. v1 only (D-005). */
export function advertisedOutputSchema(payload: PaymentRequired, index = 0): unknown | null {
  if (payload.x402Version === 1) {
    // v1 field table: "JSON schema describing the response format".
    const raw = payload.accepts[index]?.outputSchema;
    return raw === null || raw === undefined ? null : raw;
  }
  /*
   * D-005: x402 v2 removed `outputSchema` and did NOT replace it. `extensions.bazaar.schema`
   * validates the structure of the bazaar `info` object — the discovery metadata describing
   * how to CALL the endpoint — not the response body. `info.output` carries a content
   * `type` hint, an optional `format`, and an optional `example`; an example is not a
   * schema. Reading either as a response schema would invent a protocol fact (§17) and
   * would produce SHAPE_MISMATCH verdicts against sellers that delivered correctly.
   */
  return null;
}

/** §17: which checks the seller made available. Never assumed, always read. */
export function deriveChecksAvailable(
  payload: PaymentRequired,
  index = 0,
): ChecksAvailable {
  return {
    mimeTypeAdvertised: advertisedMimeType(payload, index) !== null,
    schemaAdvertised: advertisedOutputSchema(payload, index) !== null,
    // D-002: x402 advertises no response-latency SLA in either version. Always false.
    latencySlaAdvertised: false,
  };
}

/** Present only so the probe can report it. Never an input to a verdict (D-005, Cost 3). */
export function bazaarOutputHint(payload: PaymentRequired): string | null {
  if (payload.x402Version !== 2) return null;
  const bazaar = payload.extensions?.["bazaar"];
  if (typeof bazaar !== "object" || bazaar === null) return null;
  const info = (bazaar as Record<string, unknown>)["info"];
  if (typeof info !== "object" || info === null) return null;
  const output = (info as Record<string, unknown>)["output"];
  if (typeof output !== "object" || output === null) return null;
  const type = (output as Record<string, unknown>)["type"];
  return typeof type === "string" ? type : null;
}

/**
 * Build the AdvertisedTerms a receipt commits to, from the seller's own 402 payload.
 *
 * `rawTermsHash` is taken over the payload EXACTLY as received, so a reader can confirm
 * we did not reshape the seller's words before judging them.
 */
export async function deriveAdvertisedTerms(args: {
  readonly payload: PaymentRequired;
  readonly host: string;
  readonly offerIndex?: number;
}): Promise<AdvertisedTerms | null> {
  const index = args.offerIndex ?? 0;
  const offer = selectOffer(args.payload, index);
  if (offer === null) return null;

  const schema = advertisedOutputSchema(args.payload, index);

  return {
    x402Version: args.payload.x402Version,
    host: args.host,
    scheme: offer.scheme,
    network: offer.network,
    asset: offer.asset,
    payTo: offer.payTo,
    amountAtomic: offer.amountAtomic,
    maxTimeoutSeconds: offer.maxTimeoutSeconds,
    mimeType: advertisedMimeType(args.payload, index),
    outputSchemaHash: schema === null ? null : await sha256Canonical(schema),
    checksAvailable: deriveChecksAvailable(args.payload, index),
    rawTermsHash: await sha256Canonical(args.payload),
  };
}
