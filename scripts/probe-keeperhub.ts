/*
 * §17 `scripts/probe-keeperhub.ts` — read live API surface, fail on drift.
 * §22 G1 — part of `pnpm probe:all`.
 *
 * "KeeperHub's chain list and action schemas are read from its API at startup."
 *
 * Every path and header name below is quoted from the pinned KeeperHub documentation in
 * `.agents/skills/keeperhub/references/`. None is recalled and none is invented:
 *
 *   GET /api/chains                 — chains.md line 13
 *   GET /api/keys                   — chains.md line 18 ("Checking a key works")
 *   Authorization: Bearer <key>     — api-authentication.md line 16
 *
 * The base URL is NOT compiled in. It arrives in KEEPERHUB_API_BASE_URL.
 *
 * This probe never signs anything and never executes anything. It reads.
 */
import type { KeeperHubProbeResult } from "@quittance/protocol-types";

const TIMEOUT_MS = 15_000;

/* Paths, relative to the configured base URL. Quoted from the pinned docs, see header. */
const PATH_CHAINS = "/api/chains";
const PATH_KEYS = "/api/keys";

type Fetched = { readonly status: number; readonly body: unknown } | { readonly error: string };

async function get(url: string, apiKey: string | null): Promise<Fetched> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (apiKey !== null) headers["authorization"] = `Bearer ${apiKey}`;
    const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Left as text. A non-JSON body from a JSON endpoint is itself the drift signal,
      // and is reported below rather than discarded.
      body = text;
    }
    return { status: response.status, body };
  } catch (error) {
    return { error: (error as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull chain identifiers out of the response without assuming a wrapper shape.
 * If the shape has drifted such that no identifier can be found, that is reported as
 * drift rather than papered over with an empty list.
 */
function extractChains(body: unknown): readonly string[] | null {
  const rows = Array.isArray(body)
    ? body
    : typeof body === "object" && body !== null && Array.isArray((body as Record<string, unknown>)["data"])
      ? ((body as Record<string, unknown>)["data"] as unknown[])
      : typeof body === "object" && body !== null && Array.isArray((body as Record<string, unknown>)["chains"])
        ? ((body as Record<string, unknown>)["chains"] as unknown[])
        : null;

  if (rows === null) return null;

  const out: string[] = [];
  for (const row of rows) {
    if (typeof row === "string") {
      out.push(row);
      continue;
    }
    if (typeof row === "object" && row !== null) {
      const r = row as Record<string, unknown>;
      const id = r["chainId"] ?? r["id"] ?? r["name"] ?? r["slug"];
      if (typeof id === "string" || typeof id === "number") out.push(String(id));
    }
  }
  return out;
}

export async function probeKeeperHub(): Promise<KeeperHubProbeResult> {
  const baseUrl = (process.env["KEEPERHUB_API_BASE_URL"] ?? "").replace(/\/+$/, "");
  const apiKey = process.env["KEEPERHUB_API_KEY"] ?? null;

  if (baseUrl.length === 0) {
    return {
      ok: false,
      baseUrl: null,
      reason: "NOT_CONFIGURED",
      detail:
        "KEEPERHUB_API_BASE_URL is not set. It is deliberately not compiled in (§17). Set it in .env; see .env.example.",
      httpStatus: null,
    };
  }

  const chains = await get(`${baseUrl}${PATH_CHAINS}`, apiKey);
  if ("error" in chains) {
    return {
      ok: false,
      baseUrl,
      reason: "UNREACHABLE",
      detail: `GET ${PATH_CHAINS}: ${chains.error}`,
      httpStatus: null,
    };
  }

  if (chains.status === 401 || chains.status === 403) {
    return {
      ok: false,
      baseUrl,
      reason: "UNAUTHORIZED",
      detail:
        apiKey === null
          ? `GET ${PATH_CHAINS} returned ${chains.status} and KEEPERHUB_API_KEY is not set`
          : `GET ${PATH_CHAINS} returned ${chains.status} with the configured key`,
      httpStatus: chains.status,
    };
  }

  if (chains.status !== 200) {
    return {
      ok: false,
      baseUrl,
      reason: "PAYLOAD_DRIFT",
      detail: `GET ${PATH_CHAINS} returned ${chains.status}, expected 200`,
      httpStatus: chains.status,
    };
  }

  const list = extractChains(chains.body);
  if (list === null || list.length === 0) {
    return {
      ok: false,
      baseUrl,
      reason: "PAYLOAD_DRIFT",
      detail: `GET ${PATH_CHAINS} returned 200 but no chain identifier could be read from its shape`,
      httpStatus: 200,
    };
  }

  let authenticated = false;
  if (apiKey !== null) {
    const keys = await get(`${baseUrl}${PATH_KEYS}`, apiKey);
    authenticated = !("error" in keys) && keys.status === 200;
  }

  return { ok: true, baseUrl, chains: list, chainCount: list.length, authenticated };
}

export function describe(result: KeeperHubProbeResult): string {
  if (!result.ok) {
    return `  FAIL  KeeperHub${result.baseUrl === null ? "" : ` (${result.baseUrl})`}\n        ${result.reason}: ${result.detail}`;
  }
  return [
    `  READ  KeeperHub (${result.baseUrl})`,
    `        ${result.chainCount} chains read from the live API, none compiled in`,
    `        credential: ${result.authenticated ? "accepted" : "not supplied or not checked"}`,
  ].join("\n");
}
