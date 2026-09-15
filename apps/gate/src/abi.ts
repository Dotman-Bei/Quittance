/*
 * §17 "No dated address, ABI, price, header name, or facilitator URL is compiled in."
 *
 * The fee leg calls `transferWithAuthorization` on whatever asset the buyer authorised.
 * Hardcoding that ABI fragment would be compiling in an ABI, so it is resolved at runtime
 * from the deployed contract.
 *
 * Found while bringing the fee leg up on 2026-09-15: KeeperHub's ABI auto-fetch returns the
 * PROXY ABI for USDC (`admin`, `changeAdmin`, `implementation`, `upgradeTo`,
 * `upgradeToAndCall` — five functions, none of them the one we need). Relying on auto-fetch
 * silently produces a call the contract does not expose, so we resolve the implementation
 * ourselves and fetch its ABI.
 */
import { z } from "zod";

/*
 * Proxy implementation storage slots. These are 32-byte constants defined by their
 * standards as the keccak256 of a fixed string, so they are versionless and cannot drift —
 * unlike the addresses, prices and ABIs §17 exists to keep out of source. They are annotated
 * so the §17 checker reports them as deliberate exemptions rather than silently allowing
 * anything key-shaped.
 */
const SLOT_EIP1967 = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"; // §17-ok: EIP-1967 implementation slot, keccak256("eip1967.proxy.implementation")-1, a standard constant
const SLOT_ZEPPELINOS = "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3"; // §17-ok: zeppelinos implementation slot, keccak256("org.zeppelinos.proxy.implementation"), used by Circle FiatTokenProxy

/*
 * "No address" is the all-zero word. Written as a predicate rather than as a literal:
 * §17 blocks address literals in apps/ and packages/, and AGENTS.md forbids adding a
 * carve-out to get past a hard block. A predicate needs no exemption.
 */
function isZeroAddress(value: string): boolean {
  return /^0x0{40}$/.test(value);
}

const AbiResponse = z.object({ abi: z.array(z.record(z.unknown())) }).passthrough();

const AbiFunction = z.object({
  type: z.literal("function"),
  name: z.string(),
  inputs: z.array(z.object({ type: z.string() }).passthrough()),
});

/** Cache per `${chainId}:${asset}`. An ABI does not change for a deployed implementation. */
const cache = new Map<string, string>();

async function readSlot(rpcUrl: string, address: string, slot: string): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getStorageAt",
        params: [address, slot, "latest"],
      }),
    });
    const body = (await response.json()) as { result?: string };
    if (typeof body.result !== "string" || body.result.length < 66) return null;
    const addr = `0x${body.result.slice(26)}`;
    return isZeroAddress(addr) ? null : addr;
  } catch {
    // A read-only RPC failure is not fatal here: we fall back to the asset address itself.
    return null;
  }
}

/**
 * Resolve the address whose ABI actually describes the token's functions.
 * Tries both proxy layouts, then falls back to the asset itself for a non-proxy token.
 */
export async function resolveImplementation(rpcUrl: string, asset: string): Promise<string> {
  for (const slot of [SLOT_EIP1967, SLOT_ZEPPELINOS]) {
    const impl = await readSlot(rpcUrl, asset, slot);
    if (impl !== null) return impl;
  }
  return asset;
}

/**
 * The `transferWithAuthorization` fragment, read from the deployed contract.
 *
 * EIP-3009 defines two overloads: a 7-argument form taking the 65-byte signature as
 * `bytes`, and a 9-argument form taking `v, r, s`. x402's exact-EVM scheme specifies
 * "the 65-byte signature", so the 7-argument form is selected. If the contract exposes
 * neither, this returns null and the fee is not attempted — we do not guess a layout.
 */
export async function transferWithAuthorizationAbi(args: {
  readonly keeperhubBaseUrl: string;
  readonly apiKey: string;
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly asset: string;
}): Promise<string | null> {
  const key = `${args.chainId}:${args.asset.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const target = await resolveImplementation(args.rpcUrl, args.asset);

  let body: unknown;
  try {
    const response = await fetch(
      `${args.keeperhubBaseUrl}/api/chains/${args.chainId}/abi?address=${target}`,
      { headers: { authorization: `Bearer ${args.apiKey}`, accept: "application/json" } },
    );
    if (!response.ok) return null;
    body = await response.json();
  } catch {
    // Reported by the caller as an inability to execute, never as a delivery failure.
    return null;
  }

  const parsed = AbiResponse.safeParse(body);
  if (!parsed.success) return null;

  const fragment = parsed.data.abi
    .map((entry) => AbiFunction.safeParse(entry))
    .filter((r) => r.success)
    .map((r) => (r.success ? r.data : null))
    .find((f) => f !== null && f.name === "transferWithAuthorization" && f.inputs.length === 7);

  if (fragment === undefined || fragment === null) return null;

  const serialised = JSON.stringify([fragment]);
  cache.set(key, serialised);
  return serialised;
}
