/*
 * §17 "On mismatch the service enters PROTOCOL_CONFIG_CHANGED and stops gating rather
 * than guessing."
 *
 * This rule decides whether money may move at all, so its edges are pinned here. Two of
 * these cases exist because the first implementation got them wrong, and a live run — not
 * a test — caught it.
 */
import { describe, it, expect } from "vitest";
import {
  deriveServiceState,
  mayGate,
  type X402ProbeResult,
  type KeeperHubProbeResult,
} from "@quittance/protocol-types";

const ok = (target: string): X402ProbeResult => ({
  ok: true,
  target,
  host: new URL(target).host,
  httpStatus: 402,
  carriedIn: "header",
  payload: {
    x402Version: 2,
    resource: { url: target, mimeType: "application/json" },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        amount: "1000",
        asset: "a",
        payTo: "p",
        maxTimeoutSeconds: 300,
      },
    ],
  },
  offers: 1,
  offersParsed: 1,
  offerIssues: [],
  mimeTypeAdvertised: true,
  schemaAdvertised: false,
  bazaarOutputHint: null,
});

const fail = (
  target: string,
  reason: X402ProbeResult extends { ok: false } ? never : "PAYLOAD_DRIFT" | "UNREACHABLE" | "NO_PAYMENT_REQUIRED",
): X402ProbeResult => ({ ok: false, target, reason, detail: "d", httpStatus: null });

const khOk: KeeperHubProbeResult = {
  ok: true,
  baseUrl: "https://kh.invalid",
  chains: ["8453"],
  chainCount: 1,
  authenticated: false,
};
const khFail = (reason: "UNREACHABLE" | "PAYLOAD_DRIFT" | "NOT_CONFIGURED"): KeeperHubProbeResult => ({
  ok: false,
  baseUrl: reason === "NOT_CONFIGURED" ? null : "https://kh.invalid",
  reason,
  detail: "d",
  httpStatus: null,
});

const T = (n: number) => `https://s${n}.invalid/r`;

describe("§17 gating state", () => {
  it("gates when live terms were read and KeeperHub answered", () => {
    const { state } = deriveServiceState([ok(T(1)), ok(T(2))], khOk);
    expect(state).toBe("GATING");
    expect(mayGate(state)).toBe(true);
  });

  it("does not gate when nothing was probed", () => {
    expect(deriveServiceState([], khOk).state).toBe("NOT_PROBED");
  });

  /*
   * Regression. One seller publishing a payload we cannot parse is that seller's bug, not
   * the protocol moving. Stopping all gating over it is an outage we inflict on ourselves.
   */
  it("a MINORITY of drifted sellers does not stop gating", () => {
    const { state } = deriveServiceState(
      [ok(T(1)), ok(T(2)), ok(T(3)), fail(T(4), "PAYLOAD_DRIFT")],
      khOk,
    );
    expect(state).toBe("GATING");
  });

  it("a MAJORITY of drifted sellers stops gating — that is the protocol moving", () => {
    const { state, because } = deriveServiceState(
      [fail(T(1), "PAYLOAD_DRIFT"), fail(T(2), "PAYLOAD_DRIFT"), ok(T(3))],
      khOk,
    );
    expect(state).toBe("PROTOCOL_CONFIG_CHANGED");
    expect(mayGate(state)).toBe(false);
    expect(because.join(" ")).toContain("systemic");
  });

  it("unreachable sellers are an outage, not drift, and never stop gating by themselves", () => {
    const { state } = deriveServiceState(
      [ok(T(1)), fail(T(2), "UNREACHABLE"), fail(T(3), "UNREACHABLE"), fail(T(4), "UNREACHABLE")],
      khOk,
    );
    expect(state).toBe("GATING");
  });

  it("a stale index entry that no longer charges is not drift", () => {
    const { state } = deriveServiceState(
      [ok(T(1)), fail(T(2), "NO_PAYMENT_REQUIRED"), fail(T(3), "NO_PAYMENT_REQUIRED")],
      khOk,
    );
    expect(state).toBe("GATING");
  });

  /*
   * Regression. The first implementation mapped ANY KeeperHub failure onto
   * PROTOCOL_CONFIG_CHANGED, so a network outage was reported as the protocol having
   * changed. Found by a live run in which the probe's own unbounded concurrency made
   * KeeperHub look unreachable.
   */
  it("an unreachable KeeperHub is an outage, not a protocol change", () => {
    const { state } = deriveServiceState([ok(T(1))], khFail("UNREACHABLE"));
    expect(state).toBe("NOT_PROBED");
    expect(state).not.toBe("PROTOCOL_CONFIG_CHANGED");
    expect(mayGate(state)).toBe(false);
  });

  it("a KeeperHub payload we cannot parse IS a protocol change", () => {
    const { state } = deriveServiceState([ok(T(1))], khFail("PAYLOAD_DRIFT"));
    expect(state).toBe("PROTOCOL_CONFIG_CHANGED");
  });

  it("an unconfigured KeeperHub never gates, and is not called drift", () => {
    const { state } = deriveServiceState([ok(T(1))], khFail("NOT_CONFIGURED"));
    expect(state).toBe("NOT_PROBED");
  });

  it("no target yielding terms never gates", () => {
    const { state } = deriveServiceState([fail(T(1), "UNREACHABLE")], khOk);
    expect(state).toBe("NOT_PROBED");
  });
});
