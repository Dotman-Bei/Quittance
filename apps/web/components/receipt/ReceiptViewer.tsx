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
    <div className="rounded-2xl border border-edge bg-sunken">
      <div className="border-b border-edge px-3 py-2">
        <span className="text-xs uppercase tracking-[0.12em] text-muted">
          Canonical receipt — the exact pre-image of the leaf hash
        </span>
      </div>
      {/*
        Canonical JSON is a single unbroken line, so at 320px it rendered 8417px wide and had
        to be dragged through sideways. It wraps now instead. Soft wraps are a rendering
        concern only: the DOM text is untouched, so copying still yields the exact pre-image
        of the leaf hash, which is the whole point of showing it.
      */}
      <pre className="max-h-[32rem] overflow-auto px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap break-all text-frost">
        <code>{canonical}</code>
      </pre>
    </div>
  );
}
