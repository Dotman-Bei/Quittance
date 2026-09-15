/* §5.2 the verdict states are enumerated, total, and closed. */

/**
 * The complete set of verdict states. There are exactly seven.
 *
 * §5.2: "There is no `SAFE`, no `OK`, no `PASS`, and no green in the palette."
 *
 * Adding a state is a protocol change: it requires a DECISIONS.md entry, a schema
 * version bump here, and a re-derivation check across the golden receipt corpus.
 */
export const VERDICT_STATES = [
  "DELIVERED_AS_ADVERTISED",
  "NOT_DELIVERED",
  "SHAPE_MISMATCH",
  "TIMEOUT_EXCEEDED",
  "REQUIREMENTS_MISMATCH",
  "GATE_ERROR",
  "SETTLEMENT_FAILED",
] as const;

export type VerdictState = (typeof VERDICT_STATES)[number];

/** §5.2 Only this state is discharge-eligible. Every other state is a non-discharge. */
export const DISCHARGE_ELIGIBLE: VerdictState = "DELIVERED_AS_ADVERTISED";

export function isVerdictState(value: unknown): value is VerdictState {
  return (
    typeof value === "string" &&
    (VERDICT_STATES as readonly string[]).includes(value)
  );
}

/**
 * §5.3 / §14: GATE_ERROR and SETTLEMENT_FAILED are our failures, not the seller's.
 * They are never folded into an endpoint's delivery record.
 */
export const OPERATOR_ATTRIBUTED_STATES: readonly VerdictState[] = [
  "GATE_ERROR",
  "SETTLEMENT_FAILED",
];

export function isOperatorAttributed(state: VerdictState): boolean {
  return OPERATOR_ATTRIBUTED_STATES.includes(state);
}

/**
 * AGENTS.md HB-6: a `default:` case must never swallow an unknown state.
 * Exhaustive switches call this in the position a `default:` would occupy, so a
 * newly added VerdictState becomes a compile error and, if it somehow reaches
 * runtime, a loud failure rather than a quiet fallthrough onto a discharge path.
 */
export function assertNever(value: never, context: string): never {
  throw new Error(
    `${context}: unhandled enumerated state ${JSON.stringify(value)}`,
  );
}
