/*
 * §18 / DESIGN.md §3.
 *
 * A discharge and a non-discharge are rendered with the SAME WEIGHT, distinguished by
 * label, not by reassurance. There is no green, no pass badge, and no per-state hue:
 * colour carries none of the signal, so a grayscale printout and a colour-blind reader
 * receive exactly the same information as anyone else.
 *
 * The signal is carried by the full enumerated state name plus a glyph. The name is
 * never abbreviated, never truncated, and never replaced with "OK" or "Failed".
 */
import { assertNever, type VerdictState } from "@/lib/types";

/** DESIGN.md §3 glyph matrix. Distinguishable in monochrome. */
function glyph(state: VerdictState): string {
  switch (state) {
    case "DELIVERED_AS_ADVERTISED":
      return "■"; // filled square
    case "NOT_DELIVERED":
      return "□"; // hollow square
    case "SHAPE_MISMATCH":
      return "◧"; // half-filled square
    case "TIMEOUT_EXCEEDED":
      return "◴"; // circle with upper-left quadrant
    case "REQUIREMENTS_MISMATCH":
      return "◫"; // split square
    case "GATE_ERROR":
      return "▨"; // hatched square
    case "SETTLEMENT_FAILED":
      return "▩"; // cross-hatched square
    default:
      // AGENTS.md HB-6: never a silent fallthrough. A new state is a compile error here.
      return assertNever(state, "VerdictBadge.glyph");
  }
}

/**
 * Whose failure the state describes. §14: an RPC hiccup is our failure, not the
 * seller's, and is never folded into an endpoint's delivery record.
 */
export function attribution(state: VerdictState): "seller" | "operator" | "buyer-caps" {
  switch (state) {
    case "DELIVERED_AS_ADVERTISED":
    case "NOT_DELIVERED":
    case "SHAPE_MISMATCH":
      return "seller";
    case "TIMEOUT_EXCEEDED":
    case "REQUIREMENTS_MISMATCH":
      // D-002: both are measured against the BUYER's caps, not the seller's advertised terms.
      return "buyer-caps";
    case "GATE_ERROR":
    case "SETTLEMENT_FAILED":
      return "operator";
    default:
      return assertNever(state, "VerdictBadge.attribution");
  }
}

export function VerdictBadge({ state }: { state: VerdictState }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-chip border border-rule bg-ink-sunken px-2 py-0.5">
      <span aria-hidden className="num text-plain">
        {glyph(state)}
      </span>
      <span className="num text-caption tracking-wide text-loud">{state}</span>
    </span>
  );
}

/** The plain-words caption that sits beneath a badge wherever a verdict is explained. */
export function verdictMeaning(state: VerdictState): string {
  switch (state) {
    case "DELIVERED_AS_ADVERTISED":
      return "The response was structurally what the seller advertised. This is not a statement about correctness, quality, or value received.";
    case "NOT_DELIVERED":
      return "No successful response, or an empty body. The discharge did not execute.";
    case "SHAPE_MISMATCH":
      return "The response did not match a content type or schema the seller itself published.";
    case "TIMEOUT_EXCEEDED":
      return "The buyer's own deadline was missed. x402 advertises no response-latency terms, so this says nothing about a promise the seller made or broke.";
    case "REQUIREMENTS_MISMATCH":
      return "The advertised terms exceeded the buyer's caps. Refused before purchase: no purchase, no discharge.";
    case "GATE_ERROR":
      return "Our failure, not the seller's. It is counted separately and never enters an endpoint's delivery record.";
    case "SETTLEMENT_FAILED":
      return "Our failure, not the seller's. The delivery check passed but the execution did not land.";
    default:
      return assertNever(state, "VerdictBadge.verdictMeaning");
  }
}
