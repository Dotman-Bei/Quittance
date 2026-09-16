"use client";

import { useState } from "react";

/*
 * §9 /receipt/:hash must show "the exact command to re-derive it".
 * §11 the command needs no API key, no account, and no network.
 */
export function CliReDerive({ leaf }: { leaf: string }) {
  const [copied, setCopied] = useState(false);

  const command = `npx quittance verify evidence/receipts/${leaf}.json`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied in some contexts. The command stays selectable
      // as text, so the reader can copy it by hand; nothing is lost and nothing is
      // silently swallowed.
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-edge bg-sunken">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <span className="text-xs uppercase tracking-[0.12em] text-muted">
          Re-derive this receipt yourself
        </span>
        <button
          type="button"
          onClick={copy}
          className="num inline-flex min-h-[44px] items-center rounded-pill border border-edge px-4 py-2 text-xs text-muted hover:border-edge-strong hover:text-stark"
        >
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-frost">
        <code>{command}</code>
      </pre>
      <p className="border-t border-edge px-3 py-2 text-xs text-muted">
        Runs from a fresh clone with no account and no API key. Add{" "}
        <code className="text-frost">--body &lt;file&gt;</code> to check the receipt&apos;s
        sha256 commitment to the response bytes.
      </p>
    </div>
  );
}
