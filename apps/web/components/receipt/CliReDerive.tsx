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
    <div className="rounded-default border border-rule bg-ink-sunken">
      <div className="flex items-center justify-between border-b border-rule px-3 py-2">
        <span className="text-caption uppercase tracking-[0.12em] text-quiet">
          Re-derive this receipt yourself
        </span>
        <button
          type="button"
          onClick={copy}
          className="num rounded-chip border border-rule px-2 py-0.5 text-caption text-quiet hover:border-rule-strong hover:text-loud"
        >
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-plain">
        <code>{command}</code>
      </pre>
      <p className="border-t border-rule px-3 py-2 text-caption text-quiet">
        Runs from a fresh clone with no account and no API key. Add{" "}
        <code className="text-plain">--body &lt;file&gt;</code> to check the receipt&apos;s
        sha256 commitment to the response bytes.
      </p>
    </div>
  );
}
