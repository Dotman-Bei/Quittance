/*
 * frontend.md §3.5 — the canonical JSON inspector.
 *
 * The JSON shown is the CANONICAL form, because that is the exact pre-image of the
 * receipt leaf (§10). Showing prettified JSON would show a string that does not hash to
 * the leaf printed beside it.
 */
import { canonicalJson, type ReceiptType } from "@/lib/types";

export function ReceiptViewer({ receipt }: { receipt: ReceiptType }) {
  const canonical = canonicalJson(receipt);

  return (
    <div className="rounded-default border border-rule bg-ink-sunken">
      <div className="border-b border-rule px-3 py-2">
        <span className="text-caption uppercase tracking-[0.12em] text-quiet">
          Canonical receipt — the exact pre-image of the leaf hash
        </span>
      </div>
      <pre className="max-h-[32rem] overflow-auto px-3 py-3 text-caption leading-relaxed text-plain">
        <code>{canonical}</code>
      </pre>
    </div>
  );
}
