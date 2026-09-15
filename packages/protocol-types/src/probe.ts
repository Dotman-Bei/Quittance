/*
 * §17 Protocol facts and configuration.
 *
 * "No dated address, ABI, price, header name, or facilitator URL is compiled in. Payment
 *  terms come from the counterparty's own 402 body at call time. KeeperHub's chain list
 *  and action schemas are read from its API at startup."
 *
 * "On mismatch the service enters PROTOCOL_CONFIG_CHANGED and stops gating rather than
 *  guessing."
 */
import { z } from "zod";
import { PaymentRequired } from "./x402.js";

/**
 * The service's gating state. There are exactly three, and only one of them gates.
 *
 * PROTOCOL_CONFIG_CHANGED is not a warning and not a degraded mode: it stops gating.
 * A guessed protocol fact routed to money movement is the failure §17 exists to prevent,
 * so failing closed is the required behaviour, not a conservative choice.
 */
export const ServiceState = z.enum([
  "GATING",
  "PROTOCOL_CONFIG_CHANGED",
  "NOT_PROBED",
]);
export type ServiceState = z.infer<typeof ServiceState>;

export function mayGate(state: ServiceState): boolean {
  return state === "GATING";
}

/** Why a probe refused, in words a person can act on. */
export const ProbeFailureReason = z.enum([
  /* The target answered, but its payload does not parse against either pinned schema. */
  "PAYLOAD_DRIFT",
  /* The target did not answer 402 where a paid resource was expected. */
  "NO_PAYMENT_REQUIRED",
  /* The target could not be reached at all. Not drift: an outage, or a wrong URL. */
  "UNREACHABLE",
  /* The probe was not given the inputs it needs. Never silently treated as a pass. */
  "NOT_CONFIGURED",
  /* A credential was required and rejected. */
  "UNAUTHORIZED",
]);
export type ProbeFailureReason = z.infer<typeof ProbeFailureReason>;

export type X402ProbeResult =
  | {
      readonly ok: true;
      readonly target: string;
      readonly host: string;
      readonly httpStatus: number;
      /** Where the terms were carried: v1 in the body, v2 in the PAYMENT-REQUIRED header. */
      readonly carriedIn: "body" | "header";
      readonly payload: PaymentRequired;
      /** Offers the seller published, before per-offer parsing. */
      readonly offers: number;
      /** Offers that parsed. Gating proceeds only on one of these. */
      readonly offersParsed: number;
      /** Per-offer parse failures, reported verbatim. Never silently dropped. */
      readonly offerIssues: readonly string[];
      readonly mimeTypeAdvertised: boolean;
      readonly schemaAdvertised: boolean;
      /** Reported only. Never an input to a verdict. See DECISIONS.md D-005, Cost 3. */
      readonly bazaarOutputHint: string | null;
    }
  | {
      readonly ok: false;
      readonly target: string;
      readonly reason: ProbeFailureReason;
      readonly detail: string;
      readonly httpStatus: number | null;
    };

export type KeeperHubProbeResult =
  | {
      readonly ok: true;
      readonly baseUrl: string;
      /** Chain identifiers read from the live API. Never compiled in (§17). */
      readonly chains: readonly string[];
      readonly chainCount: number;
      readonly authenticated: boolean;
    }
  | {
      readonly ok: false;
      readonly baseUrl: string | null;
      readonly reason: ProbeFailureReason;
      readonly detail: string;
      readonly httpStatus: number | null;
    };

/**
 * The gate's startup decision, from the probe results alone.
 *
 * Three asymmetries, all deliberate:
 *
 * 1. A target that is UNREACHABLE is an outage. The protocol has not changed, so it does
 *    not force PROTOCOL_CONFIG_CHANGED.
 *
 * 2. ONE seller publishing a payload we cannot parse is that seller's bug, not a protocol
 *    change. The first live probe run found exactly this: a seller with a valid Base offer
 *    and a second offer carrying a decimal `amount` where atomic units are required.
 *    Shutting down all gating because one seller is malformed would be an outage we
 *    inflicted on ourselves. That endpoint is excluded and the failure is reported.
 *
 * 3. Drift across MOST live sellers at once is not many coincident bugs — it is our
 *    understanding of the protocol being wrong. That forces PROTOCOL_CONFIG_CHANGED, and
 *    the service stops gating rather than guessing.
 *
 * The threshold is a majority of targets that answered at all. It is a judgement, and it
 * is written down here rather than left implicit.
 */
export function deriveServiceState(
  x402: readonly X402ProbeResult[],
  keeperhub: KeeperHubProbeResult | null,
): { readonly state: ServiceState; readonly because: readonly string[] } {
  const because: string[] = [];

  if (x402.length === 0) {
    return {
      state: "NOT_PROBED",
      because: ["no x402 target was probed; PROBE_X402_TARGETS is empty"],
    };
  }

  const answered = x402.filter(
    (r) => r.ok || (r.reason !== "UNREACHABLE" && r.reason !== "NOT_CONFIGURED"),
  );
  const drifted = x402.filter((r) => !r.ok && r.reason === "PAYLOAD_DRIFT");

  if (answered.length > 0 && drifted.length * 2 > answered.length) {
    because.push(
      `${drifted.length} of ${answered.length} responding sellers published a payload that does not parse against the pinned x402 schemas; that is systemic, not per-seller`,
    );
    for (const r of drifted) {
      if (!r.ok) because.push(`  ${r.target}: ${r.detail}`);
    }
  }

  /*
   * Asymmetry 1 applies to KeeperHub too, and the first implementation forgot that:
   * it mapped any KeeperHub failure onto PROTOCOL_CONFIG_CHANGED, so a network outage
   * was reported as the protocol having changed. An outage is not drift. Only a payload
   * we cannot parse is drift.
   *
   * An unreachable KeeperHub still prevents gating — it is the only path to chain — but
   * the honest state for that is NOT_PROBED, handled below.
   */
  if (keeperhub !== null && !keeperhub.ok && keeperhub.reason === "PAYLOAD_DRIFT") {
    because.push(`KeeperHub: ${keeperhub.detail}`);
  }

  if (because.length > 0) return { state: "PROTOCOL_CONFIG_CHANGED", because };

  const parsed = x402.filter((r) => r.ok);
  if (parsed.length === 0) {
    return {
      state: "NOT_PROBED",
      because: ["no target yielded parseable advertised terms; see kill criterion K1"],
    };
  }
  if (keeperhub === null || !keeperhub.ok) {
    return {
      state: "NOT_PROBED",
      because: ["KeeperHub was not probed; the only path to chain is unverified"],
    };
  }

  return { state: "GATING", because: [] };
}
