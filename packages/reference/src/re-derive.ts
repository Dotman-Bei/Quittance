/*
 * §11 / §9 `/verify` — re-derivation of a published receipt.
 *
 * This is the function a stranger runs. It re-runs verdict() over the receipt's own
 * committed inputs and compares the result with the verdict the gate published.
 * A mismatch is the finding, and §9 requires it be displayed as loudly as a match.
 */
import {
  Receipt,
  sha256Canonical,
  sha256Bytes,
  type VerdictState,
} from "@quittance/protocol-types";
import { verdict } from "./verdict.js";

export type ReDerivation = {
  readonly ok: boolean;
  readonly publishedVerdict: VerdictState;
  readonly reDerivedVerdict: VerdictState;
  readonly receiptLeaf: string;
  /**
   * Null when no response body was supplied. §6: the receipt commits to
   * sha256(response); a holder of the response can check that commitment, and a
   * verifier without it can still re-derive the verdict.
   */
  readonly bodyHashChecked: boolean;
  readonly bodyHashMatches: boolean | null;
  readonly problems: readonly string[];
};

export type ParsedReceipt = {
  readonly ok: true;
  readonly receipt: Receipt;
} | {
  readonly ok: false;
  readonly problems: readonly string[];
};

/** Parse untrusted JSON into a Receipt without throwing. */
export function parseReceipt(value: unknown): ParsedReceipt {
  const parsed = Receipt.safeParse(value);
  if (parsed.success) return { ok: true, receipt: parsed.data };
  return {
    ok: false,
    problems: parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    ),
  };
}

/**
 * Re-derive a receipt. Pure apart from hashing, which is Web Crypto and therefore
 * available identically in Node and in the browser.
 *
 * @param responseBody optional raw response bytes, to check the body commitment.
 */
export async function reDerive(
  receipt: Receipt,
  responseBody?: Uint8Array,
): Promise<ReDerivation> {
  const problems: string[] = [];

  const reDerivedVerdict = verdict({
    intent: receipt.intent,
    advertised: receipt.advertised,
    observed: receipt.observed,
  });

  if (reDerivedVerdict !== receipt.publishedVerdict) {
    problems.push(
      `verdict mismatch: receipt publishes ${receipt.publishedVerdict}, re-derivation yields ${reDerivedVerdict}`,
    );
  }

  /* §10 the receipt leaf is sha256 of the canonicalized receipt. */
  const receiptLeaf = await sha256Canonical(receipt);

  let bodyHashMatches: boolean | null = null;
  let bodyHashChecked = false;
  if (responseBody !== undefined) {
    bodyHashChecked = true;
    const computed = await sha256Bytes(responseBody);
    bodyHashMatches = computed === receipt.observed.bodySha256;
    if (!bodyHashMatches) {
      problems.push(
        `response hash mismatch: receipt commits to ${receipt.observed.bodySha256 ?? "null"}, supplied body hashes to ${computed}`,
      );
    }
    if (responseBody.byteLength !== receipt.observed.bodyByteLength) {
      problems.push(
        `response length mismatch: receipt commits to ${receipt.observed.bodyByteLength} bytes, supplied body is ${responseBody.byteLength}`,
      );
    }
  }

  /*
   * A discharge must correspond to the one discharge-eligible state. A discharge tx
   * against any other state is the most serious finding this function can produce.
   */
  if (receipt.run.dischargeTxHash !== null && reDerivedVerdict !== "DELIVERED_AS_ADVERTISED") {
    problems.push(
      `a discharge transaction is recorded against ${reDerivedVerdict}, which is not discharge-eligible`,
    );
  }

  return {
    ok: problems.length === 0,
    publishedVerdict: receipt.publishedVerdict,
    reDerivedVerdict,
    receiptLeaf,
    bodyHashChecked,
    bodyHashMatches,
    problems,
  };
}
