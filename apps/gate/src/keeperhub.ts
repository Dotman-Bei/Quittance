/*
 * §12 P4 — KeeperHub is the only path to chain.
 *
 * This file is the ONLY place in the codebase that causes a transaction. It holds no key,
 * signs nothing, and constructs no signature: it posts a contract call to KeeperHub and
 * KeeperHub's Turnkey-backed wallet does the rest.
 *
 * Every field name and header below is quoted from the pinned documentation at
 * .agents/skills/keeperhub/references/direct-execution.md. None is recalled or invented.
 */
import { z } from "zod";

/* Documented at direct-execution.md line 356. Base URL is configuration, never compiled in (§17). */
const PATH_CONTRACT_CALL = "/api/execute/contract-call";

/**
 * Write-function response, direct-execution.md.
 *
 * `transactionHash` "is present whenever a transaction reached the chain, which includes
 * `failed` and `unconfirmed`. A call that reverts still produced a transaction." We record
 * it in all three cases, because a reverted fee is a fact about what happened and hiding it
 * would be the kind of omission this project exists to prevent.
 */
export const ExecutionResult = z
  .object({
    executionId: z.string(),
    status: z.enum(["completed", "failed", "unconfirmed"]),
    transactionHash: z.string().optional(),
    transactionLink: z.string().optional(),
    idempotentReplay: z.boolean().optional(),
  })
  .passthrough();
export type ExecutionResult = z.infer<typeof ExecutionResult>;

export type KeeperHubConfig = {
  readonly baseUrl: string;
  readonly apiKey: string;
};

export type ContractCall = {
  readonly contractAddress: string;
  readonly chainId: number;
  readonly functionName: string;
  /** "JSON array string of function arguments" — direct-execution.md. */
  readonly functionArgs: string;
  readonly abi?: string;
};

export type ExecuteOutcome =
  | { readonly ok: true; readonly result: ExecutionResult; readonly simulated: boolean }
  | { readonly ok: false; readonly reason: string; readonly httpStatus: number | null };

export function readConfig(): KeeperHubConfig | null {
  const baseUrl = (process.env["KEEPERHUB_API_BASE_URL"] ?? "").replace(/\/+$/, "");
  const apiKey = process.env["KEEPERHUB_API_KEY"] ?? "";
  if (baseUrl.length === 0 || apiKey.length === 0) return null;
  return { baseUrl, apiKey };
}

/**
 * Execute, or simulate, a contract call through KeeperHub.
 *
 * `idempotencyKey` is REQUIRED for a broadcast and is the authorization nonce (§12: "Every
 * discharge idempotent by authorization nonce"). Upstream: "a retry with the same key and
 * the same request body returns the original response (same executionId, same status)
 * without executing again". We do not reimplement that (§8.4) — we key it correctly and
 * let KeeperHub enforce it.
 */
export async function execute(
  config: KeeperHubConfig,
  call: ContractCall,
  options: { readonly simulate: boolean; readonly idempotencyKey: string },
): Promise<ExecuteOutcome> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${config.apiKey}`,
    "content-type": "application/json",
    accept: "application/json",
  };
  if (!options.simulate) headers["Idempotency-Key"] = options.idempotencyKey;

  const body: Record<string, unknown> = { ...call };
  if (options.simulate) body["simulate"] = true;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${PATH_CONTRACT_CALL}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Never swallowed: an unreachable executor is reported and becomes SETTLEMENT_FAILED.
    return { ok: false, reason: `KeeperHub unreachable: ${(error as Error).message}`, httpStatus: null };
  }

  const text = await response.text();
  let parsedBody: unknown = text;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    // A non-JSON body from a JSON endpoint is itself the signal, and is reported verbatim.
    return {
      ok: false,
      reason: `KeeperHub returned non-JSON (${response.status}): ${text.slice(0, 200)}`,
      httpStatus: response.status,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `KeeperHub ${response.status}: ${JSON.stringify(parsedBody).slice(0, 300)}`,
      httpStatus: response.status,
    };
  }

  const parsed = ExecutionResult.safeParse(parsedBody);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `KeeperHub response does not match the documented shape: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
      httpStatus: response.status,
    };
  }

  return { ok: true, result: parsed.data, simulated: options.simulate };
}

/** CAIP-2 `eip155:8453` -> 8453. Read from the seller's own terms, never compiled in (§17). */
export function chainIdFromCaip2(network: string): number | null {
  const m = /^eip155:(\d+)$/.exec(network);
  if (m === null) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) ? n : null;
}
