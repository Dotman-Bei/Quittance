/*
 * §17 no dated protocol fact is compiled in. Nothing in this file is a value read
 * from a network at authoring time: these are shapes, and every instance of them is
 * parsed from the counterparty's own 402 response at call time.
 *
 * DECISIONS.md D-002: x402 v1 and v2 are modelled as DISTINCT, discriminated schemas.
 * They are deliberately not normalised into one another, because their fields do not
 * correspond one-to-one and inventing a correspondence would be inventing a protocol
 * fact.
 */
import { z } from "zod";

/** Atomic token units, carried as a decimal string upstream. Never parsed to a float. */
export const AtomicAmount = z.string().regex(/^[0-9]+$/, "atomic amount must be integral");

/* ---------------------------------------------------------------------------
 * x402 v1
 * Terms are carried in the 402 JSON response body.
 * `mimeType` and `outputSchema` are optional and live on each accepts[] entry.
 * ------------------------------------------------------------------------- */

export const PaymentRequirementsV1 = z
  .object({
    scheme: z.string(),
    network: z.string(),
    maxAmountRequired: AtomicAmount,
    asset: z.string(),
    payTo: z.string(),
    resource: z.string().optional(),
    description: z.string().optional(),
    /** D-002 finding 2: optional, on the accepts[] entry in v1. */
    mimeType: z.string().nullish(),
    /** D-002 finding 3: optional in v1; removed entirely in v2. */
    outputSchema: z.unknown().nullish(),
    /**
     * D-002 finding 1: upstream defines this as "Maximum time allowed for payment
     * completion". It is a payment window, NOT a response-latency SLA, and it is
     * never read as one.
     */
    maxTimeoutSeconds: z.number(),
    extra: z.record(z.unknown()).nullish(),
  })
  .passthrough();

export const PaymentRequiredV1 = z
  .object({
    x402Version: z.literal(1),
    error: z.string().optional(),
    accepts: z.array(PaymentRequirementsV1),
  })
  .passthrough();

/* ---------------------------------------------------------------------------
 * x402 v2
 * Terms are carried in a base64 PAYMENT-REQUIRED header.
 * `mimeType` moved to the `resource` object. `outputSchema` no longer exists;
 * discovery metadata moved to the `extensions.bazaar` extension.
 * ------------------------------------------------------------------------- */

export const ResourceInfoV2 = z
  .object({
    url: z.string(),
    description: z.string().optional(),
    /** D-002 finding 2: optional, and on `resource` rather than on accepts[] in v2. */
    mimeType: z.string().nullish(),
  })
  .passthrough();

export const PaymentRequirementsV2 = z
  .object({
    scheme: z.string(),
    /** CAIP-2, e.g. an eip155 identifier. Read at runtime, never compiled in. */
    network: z.string(),
    amount: AtomicAmount,
    asset: z.string(),
    payTo: z.string(),
    /** D-002 finding 1: a payment window, not a response deadline. */
    maxTimeoutSeconds: z.number(),
    extra: z.record(z.unknown()).nullish(),
  })
  .passthrough();

export const PaymentRequiredV2 = z
  .object({
    x402Version: z.literal(2),
    error: z.string().optional(),
    resource: ResourceInfoV2,
    accepts: z.array(PaymentRequirementsV2),
    extensions: z.record(z.unknown()).optional(),
  })
  .passthrough();

/** The discriminated union. Neither arm is collapsed into the other. */
export const PaymentRequired = z.discriminatedUnion("x402Version", [
  PaymentRequiredV1,
  PaymentRequiredV2,
]);

export type PaymentRequiredV1 = z.infer<typeof PaymentRequiredV1>;
export type PaymentRequiredV2 = z.infer<typeof PaymentRequiredV2>;
export type PaymentRequired = z.infer<typeof PaymentRequired>;

export const X402Version = z.union([z.literal(1), z.literal(2)]);
export type X402Version = z.infer<typeof X402Version>;

/* ---------------------------------------------------------------------------
 * Per-offer parsing.
 *
 * Found in the wild during the first live probe run: a seller published two offers,
 * one valid on Base and one carrying `amount: "0.111"` — a decimal where x402 v2
 * requires atomic (integral) token units. Validating `accepts[]` as a whole rejected
 * the entire seller because of a malformed offer on a network we never target.
 *
 * Rejecting wholesale loses a seller we could have judged honestly, and gains no
 * safety: the offer we would have selected parsed cleanly. Silently dropping the bad
 * entry is worse — it hides real drift. So offers are parsed INDIVIDUALLY, every
 * failure is reported, and gating proceeds only on an offer that parsed.
 * ------------------------------------------------------------------------- */

/** The envelope, with `accepts[]` left unparsed so each offer can be judged alone. */
const EnvelopeV1 = z
  .object({
    x402Version: z.literal(1),
    error: z.string().optional(),
    accepts: z.array(z.unknown()),
  })
  .passthrough();

const EnvelopeV2 = z
  .object({
    x402Version: z.literal(2),
    error: z.string().optional(),
    resource: ResourceInfoV2,
    accepts: z.array(z.unknown()),
    extensions: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const PaymentRequiredEnvelope = z.discriminatedUnion("x402Version", [
  EnvelopeV1,
  EnvelopeV2,
]);
export type PaymentRequiredEnvelope = z.infer<typeof PaymentRequiredEnvelope>;

export type OfferParse =
  | { readonly index: number; readonly ok: true }
  | { readonly index: number; readonly ok: false; readonly issues: readonly string[] };

export type PaymentRequiredParse =
  | {
      readonly ok: true;
      /** The payload with only the offers that parsed. Never fabricated, only filtered. */
      readonly payload: PaymentRequired;
      /** How many offers the seller actually published, before filtering. */
      readonly publishedOffers: number;
      readonly offers: readonly OfferParse[];
    }
  | { readonly ok: false; readonly issues: readonly string[] };

function issuesOf(error: z.ZodError): readonly string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

/**
 * Parse a 402 payload, judging each offer on its own.
 *
 * Fails only when the envelope itself is unrecognisable, or when NO offer parsed —
 * in either case there is nothing we could gate against without guessing.
 */
export function parsePaymentRequired(raw: unknown): PaymentRequiredParse {
  const envelope = PaymentRequiredEnvelope.safeParse(raw);
  if (!envelope.success) return { ok: false, issues: issuesOf(envelope.error) };

  const version = envelope.data.x402Version;
  const schema = version === 1 ? PaymentRequirementsV1 : PaymentRequirementsV2;

  const offers: OfferParse[] = [];
  const kept: unknown[] = [];

  envelope.data.accepts.forEach((entry, index) => {
    const parsed = schema.safeParse(entry);
    if (parsed.success) {
      offers.push({ index, ok: true });
      kept.push(entry);
    } else {
      offers.push({ index, ok: false, issues: issuesOf(parsed.error) });
    }
  });

  if (kept.length === 0) {
    return {
      ok: false,
      issues: [
        `all ${envelope.data.accepts.length} offer(s) failed to parse`,
        ...offers.flatMap((o) => (o.ok ? [] : o.issues.map((i) => `accepts.${o.index}.${i}`))),
      ],
    };
  }

  const filtered = PaymentRequired.safeParse({ ...envelope.data, accepts: kept });
  if (!filtered.success) return { ok: false, issues: issuesOf(filtered.error) };

  return {
    ok: true,
    payload: filtered.data,
    publishedOffers: envelope.data.accepts.length,
    offers,
  };
}
