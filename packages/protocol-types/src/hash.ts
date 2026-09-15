/*
 * sha256 over the Web Crypto API only.
 *
 * §11 the verifier runs "with no API key, no account, and no network access beyond a
 * public RPC" — and, per §9 `/verify`, in the browser. Using Web Crypto rather than
 * node:crypto keeps one implementation for the gate, the CLI verifier and the web
 * page, so all three hash identically.
 */
import { canonicalBytes } from "./canonical.js";

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error(
      "Web Crypto SubtleCrypto is unavailable. Node 20+ or a secure browser context is required.",
    );
  }
  return c.subtle;
}

export async function sha256Bytes(data: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer so a view over a larger buffer cannot leak extra bytes.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return toHex(await subtle().digest("SHA-256", copy));
}

export async function sha256Utf8(text: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(text));
}

/** sha256 of the canonicalized value. This is the receipt leaf function (§10). */
export async function sha256Canonical(value: unknown): Promise<string> {
  return sha256Bytes(canonicalBytes(value));
}
