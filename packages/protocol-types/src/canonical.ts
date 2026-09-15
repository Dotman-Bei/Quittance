/*
 * §10 "Receipt leaves are `sha256` of the canonicalized receipt."
 * §13 "a receipt round-trips through canonicalization byte-identically."
 *
 * Canonical form: JSON with object keys sorted by UTF-16 code unit, no insignificant
 * whitespace, arrays order-preserving. Undefined-valued keys are dropped; null is kept,
 * because null is a committed fact and absence is not.
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function canonicalize(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "boolean") return value === true ? "true" : "false";

  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("canonicalize: non-finite number is not representable");
    }
    // Number#toString already yields the shortest round-tripping form.
    return String(value);
  }

  if (t === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v === undefined ? null : v)).join(",")}]`;
  }

  if (t === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`);
    return `{${parts.join(",")}}`;
  }

  throw new Error(`canonicalize: unsupported type ${t}`);
}

/** Canonical JSON text. Deterministic for any two structurally equal inputs. */
export function canonicalJson(value: unknown): string {
  return canonicalize(value);
}

/** UTF-8 bytes of the canonical form. The pre-image of every hash in a receipt. */
export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}
