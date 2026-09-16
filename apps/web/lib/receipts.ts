/*
 * The receipt corpus, read from evidence/ at request time.
 *
 * §0.7 / §9: there is no seed data, no sample row, and no fabricated metric. When the
 * corpus is empty the surfaces render "no runs yet" and say so. That is the honest
 * state of this repository at phase P1, not a loading condition.
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Receipt, type VerdictState } from "@quittance/protocol-types";
import { verdict } from "@quittance/reference";

export type StoredReceipt = {
  readonly leaf: string;
  readonly receipt: Receipt;
  /** Re-derived here, server side, from the receipt alone. Never trusted from the file. */
  readonly reDerived: VerdictState;
  readonly agrees: boolean;
};

/*
 * Where the published receipt corpus lives.
 *
 * `process.cwd()` is not the monorepo root everywhere this runs. Locally it is apps/web; on
 * a serverless host it is the deployed function's own root. A single hardcoded `../../`
 * resolves correctly in development and silently resolves to nothing in production — and
 * because a missing directory is a legitimate state here (no runs yet), the failure would
 * be INVISIBLE: a green deploy showing "no runs yet" with a full corpus on disk.
 *
 * So the directory is resolved by trying the candidates in order, and an explicit override
 * always wins.
 */
function resolveEvidenceDir(): string {
  const override = process.env["QUITTANCE_EVIDENCE_DIR"];
  if (override !== undefined && override.length > 0) return override;

  const cwd = process.cwd();
  const candidates = [
    join(cwd, "..", "..", "evidence", "receipts"), // repo checkout, run from apps/web
    join(cwd, "evidence", "receipts"), // run from the repo root, or a traced bundle
    join(cwd, "apps", "web", "evidence", "receipts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  /* Nothing found. The first candidate is returned so the ENOENT path reports honestly. */
  return candidates[0] ?? join(cwd, "evidence", "receipts");
}

const EVIDENCE_DIR = resolveEvidenceDir();

/**
 * Reads every receipt in evidence/receipts. A malformed file is skipped and counted,
 * never silently dropped: the count is surfaced so a reader knows the corpus is partial.
 */
export async function loadReceipts(): Promise<{
  readonly receipts: readonly StoredReceipt[];
  readonly unreadable: number;
}> {
  let names: string[];
  try {
    names = (await readdir(EVIDENCE_DIR)).filter((n) => n.endsWith(".json"));
  } catch (error) {
    // The directory does not exist yet. That is the P1 state, and it is not an error.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { receipts: [], unreadable: 0 };
    }
    throw error;
  }

  const receipts: StoredReceipt[] = [];
  let unreadable = 0;

  for (const name of names) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(join(EVIDENCE_DIR, name), "utf8"));
    } catch {
      // Counted, not swallowed: the total is rendered on the surface.
      unreadable += 1;
      continue;
    }
    const result = Receipt.safeParse(parsed);
    if (!result.success) {
      unreadable += 1;
      continue;
    }
    const receipt = result.data;
    const reDerived = verdict({
      intent: receipt.intent,
      advertised: receipt.advertised,
      observed: receipt.observed,
    });
    receipts.push({
      leaf: name.replace(/\.json$/, ""),
      receipt,
      reDerived,
      agrees: reDerived === receipt.publishedVerdict,
    });
  }

  receipts.sort((a, b) => b.receipt.request.startedAt.localeCompare(a.receipt.request.startedAt));
  return { receipts, unreadable };
}

/** §9 endpoint pages: fewer than 20 calls renders INSUFFICIENT SAMPLE, not a percentage. */
export const SAMPLE_FLOOR = 20;

export type EndpointRecord = {
  readonly host: string;
  readonly calls: number;
  readonly thirdPartyCalls: number;
  readonly baselineCalls: number;
  readonly byState: Readonly<Record<VerdictState, number>>;
  /** §14 our failures, counted separately and never folded into the delivery record. */
  readonly operatorAttributed: number;
  readonly firstSeen: string | null;
  readonly checksAvailable: {
    readonly mimeType: boolean;
    readonly schema: boolean;
  };
};

export function summariseEndpoints(receipts: readonly StoredReceipt[]): readonly EndpointRecord[] {
  const byHost = new Map<string, StoredReceipt[]>();
  for (const r of receipts) {
    const host = r.receipt.advertised.host;
    const list = byHost.get(host);
    if (list === undefined) byHost.set(host, [r]);
    else list.push(r);
  }

  const out: EndpointRecord[] = [];
  for (const [host, rows] of byHost) {
    const byState = {
      DELIVERED_AS_ADVERTISED: 0,
      NOT_DELIVERED: 0,
      SHAPE_MISMATCH: 0,
      TIMEOUT_EXCEEDED: 0,
      REQUIREMENTS_MISMATCH: 0,
      GATE_ERROR: 0,
      SETTLEMENT_FAILED: 0,
    } satisfies Record<VerdictState, number>;

    let thirdPartyCalls = 0;
    let baselineCalls = 0;
    let operatorAttributed = 0;
    let firstSeen: string | null = null;
    let mimeType = false;
    let schema = false;

    for (const r of rows) {
      byState[r.reDerived] += 1;
      if (r.receipt.run.label === "THIRD_PARTY") thirdPartyCalls += 1;
      if (r.receipt.run.label === "PROJECT_BASELINE") baselineCalls += 1;
      if (r.reDerived === "GATE_ERROR" || r.reDerived === "SETTLEMENT_FAILED") {
        operatorAttributed += 1;
      }
      const started = r.receipt.request.startedAt;
      if (firstSeen === null || started < firstSeen) firstSeen = started;
      if (r.receipt.advertised.checksAvailable.mimeTypeAdvertised) mimeType = true;
      if (r.receipt.advertised.checksAvailable.schemaAdvertised) schema = true;
    }

    out.push({
      host,
      calls: rows.length,
      thirdPartyCalls,
      baselineCalls,
      byState,
      operatorAttributed,
      firstSeen,
      checksAvailable: { mimeType, schema },
    });
  }

  out.sort((a, b) => b.calls - a.calls || a.host.localeCompare(b.host));
  return out;
}
