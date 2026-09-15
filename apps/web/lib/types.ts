/*
 * DESIGN.md §4: this file RE-EXPORTS packages/protocol-types. It never defines a second
 * copy of a schema. A second definition would let the page and the gate disagree about
 * what a receipt is.
 */
export {
  VERDICT_STATES,
  DISCHARGE_ELIGIBLE,
  isVerdictState,
  isOperatorAttributed,
  assertNever,
  Receipt,
  canonicalJson,
  sha256Canonical,
  sha256Bytes,
} from "@quittance/protocol-types";

export type {
  VerdictState,
  Receipt as ReceiptType,
  AdvertisedTerms,
  ObservedResponse,
  BuyerIntent,
  RunContext,
  RunLabel,
  ChecksAvailable,
} from "@quittance/protocol-types";
