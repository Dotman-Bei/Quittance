/*
 * Fixture receipts for the e2e run.
 *
 * §13: "Mocked facilitators and fixture endpoints exist in unit tests only. They never
 * appear on the public proof path, and any fixture-derived row in the UI carries a
 * LOCAL FIXTURE label." Every receipt written here carries label LOCAL_FIXTURE, and
 * global-teardown removes them so nothing survives the run.
 */
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256Canonical, type Receipt } from "@quittance/protocol-types";

export const EVIDENCE_DIR = join(process.cwd(), "..", "..", "evidence", "receipts");
/* Records exactly which leaves this run wrote, so teardown can remove those and no others. */
const MARKER = join(EVIDENCE_DIR, ".e2e-manifest.json");

const HASH = (c: string) => c.repeat(64);

function base(): Receipt {
  return {
    receiptVersion: 1,
    intent: {
      maxPriceAtomic: "5000",
      maxLatencyMs: 2000,
      retain: "full",
      authorizationNonce: "e2e-nonce",
      authorizationExpiry: 1893456000,
    },
    advertised: {
      x402Version: 2,
      host: "seller.invalid",
      scheme: "exact",
      network: "eip155:8453",
      asset: "test-asset",
      payTo: "test-recipient",
      amountAtomic: "1000",
      maxTimeoutSeconds: 300,
      mimeType: "application/json",
      outputSchemaHash: null,
      checksAvailable: {
        mimeTypeAdvertised: true,
        schemaAdvertised: false,
        latencySlaAdvertised: false,
      },
      rawTermsHash: HASH("b"),
    },
    request: {
      url: "https://seller.invalid/resource",
      method: "GET",
      requestSha256: HASH("c"),
      startedAt: "2026-09-09T09:00:00.000Z",
    },
    observed: {
      outcome: "observed",
      httpStatus: 200,
      bodyByteLength: 42,
      bodySha256: HASH("d"),
      contentType: "application/json",
      latencyMs: 184,
      schemaConformance: "not_advertised",
    },
    run: {
      keeperhubRunId: "e2e-run-id",
      dischargeTxHash: "e2e-discharge-tx",
      mode: "gate",
      label: "LOCAL_FIXTURE",
    },
    publishedVerdict: "DELIVERED_AS_ADVERTISED",
  };
}

/** A discharge, and a non-discharge, so the two can be compared on screen. */
export function discharged(): Receipt {
  return base();
}

export function notDelivered(): Receipt {
  const r = base();
  return {
    ...r,
    request: { ...r.request, startedAt: "2026-09-09T09:05:00.000Z" },
    advertised: { ...r.advertised, host: "other-seller.invalid" },
    intent: { ...r.intent, authorizationNonce: "e2e-nonce-2" },
    observed: { ...r.observed, httpStatus: 502, bodyByteLength: 0, bodySha256: null },
    run: { ...r.run, dischargeTxHash: null },
    publishedVerdict: "NOT_DELIVERED",
  };
}

export type Seeded = { readonly dischargedLeaf: string; readonly notDeliveredLeaf: string };

export async function seed(): Promise<Seeded> {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const a = discharged();
  const b = notDelivered();
  const [leafA, leafB] = await Promise.all([sha256Canonical(a), sha256Canonical(b)]);

  await writeFile(join(EVIDENCE_DIR, `${leafA}.json`), JSON.stringify(a, null, 2));
  await writeFile(join(EVIDENCE_DIR, `${leafB}.json`), JSON.stringify(b, null, 2));
  await writeFile(MARKER, JSON.stringify([leafA, leafB]));

  return { dischargedLeaf: leafA, notDeliveredLeaf: leafB };
}

/**
 * Remove ONLY the files this run wrote.
 *
 * The first version checked for a marker file and then deleted every entry in the
 * directory. On 2026-09-16 that destroyed the entire published corpus — 130 real receipts,
 * including the evidence behind G3 — and the next `git add -A` committed the deletion.
 *
 * The comment above it already said "a test run must never destroy real evidence". The
 * comment was right and the code did not implement it. So the marker now RECORDS the exact
 * leaves written, and teardown removes those and nothing else.
 */
export async function unseed(): Promise<void> {
  let manifest: string[];
  try {
    manifest = JSON.parse(await readFile(MARKER, "utf8")) as string[];
  } catch {
    /* No manifest means this run wrote nothing here. Touch nothing. */
    return;
  }
  for (const leaf of manifest) {
    await rm(join(EVIDENCE_DIR, `${leaf}.json`), { force: true });
  }
  await rm(MARKER, { force: true });
}
