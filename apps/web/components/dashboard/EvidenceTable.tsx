"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VERDICT_STATES, type VerdictState } from "@/lib/types";
import { VerdictBadge, verdictMeaning } from "./VerdictBadge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Drawer } from "@/components/ui/Drawer";

/*
 * frontend.md §3.4, with §9's rules applied.
 *
 * Non-discharges are first-class content: every row has the same weight, and a
 * non-discharge is never styled as an error to dismiss. The empty state names the
 * reason rather than showing a spinner.
 */
export type EvidenceRow = {
  readonly leaf: string;
  readonly startedAt: string;
  readonly host: string;
  readonly amountAtomic: string;
  readonly latencyMs: number;
  readonly maxLatencyMs: number;
  readonly state: VerdictState;
  readonly publishedState: VerdictState;
  readonly agrees: boolean;
  readonly runId: string | null;
  readonly txHash: string | null;
  readonly label: string;
  readonly mimeTypeAdvertised: boolean;
  readonly schemaAdvertised: boolean;
};

function LabelChip({ label }: { label: string }) {
  if (label === "THIRD_PARTY") return null;
  return (
    <span className="num ml-2 rounded-pill border border-electric px-1.5 py-0.5 text-xs text-electric">
      {label.replace("_", " ")}
    </span>
  );
}

export function EvidenceTable({
  rows,
  emptyReason,
}: {
  rows: readonly EvidenceRow[];
  emptyReason: string;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [inspecting, setInspecting] = useState<EvidenceRow | null>(null);

  const tabs: readonly TabItem[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
    return [
      { id: "ALL", label: "ALL", count: rows.length },
      ...VERDICT_STATES.map((state) => ({
        id: state,
        label: state,
        count: counts.get(state) ?? 0,
      })),
    ];
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "ALL" && row.state !== filter) return false;
      if (q.length === 0) return true;
      return (
        row.host.toLowerCase().includes(q) ||
        row.leaf.toLowerCase().includes(q) ||
        (row.runId ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <label htmlFor="ledger-search" className="sr-only">
          Filter by endpoint host, receipt hash, or run id
        </label>
        <input
          id="ledger-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by host, receipt hash, or KeeperHub run id"
          className="num w-full rounded-2xl border border-edge bg-sunken px-3 py-2 text-frost placeholder:text-muted"
        />
        <Tabs items={tabs} active={filter} onSelect={setFilter} label="Filter by verdict state" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-edge glass-card p-6">
          <p className="num text-stark">no runs yet</p>
          <p className="mt-2 text-muted">{emptyReason}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-edge glass-card p-6">
          <p className="num text-stark">No runs match this filter.</p>
          <p className="mt-2 text-muted">
            {rows.length} receipts are in the ledger. None matches the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge">
          <table className="hash-cell w-full border-collapse text-left">
            <caption className="sr-only">Gated calls, newest first</caption>
            <thead>
              <tr className="border-b border-edge-strong bg-sunken">
                {["Started", "Verdict", "Endpoint", "Amount", "Latency", "Proof", ""].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.leaf} className="border-b border-edge align-top last:border-0">
                  <td className="num px-3 py-3 text-xs text-muted">{row.startedAt}</td>
                  <td className="px-3 py-3">
                    <VerdictBadge state={row.state} />
                    {row.agrees ? null : (
                      <p className="num mt-1 text-xs text-volt">
                        published {row.publishedState}; does not re-derive
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/endpoints/${encodeURIComponent(row.host)}`}
                      className="num text-frost hover:text-stark"
                    >
                      {row.host}
                    </Link>
                    <LabelChip label={row.label} />
                  </td>
                  <td className="num px-3 py-3 text-frost">{row.amountAtomic}</td>
                  <td className="num px-3 py-3 text-frost">
                    {row.latencyMs}ms
                    <span className="block text-xs text-muted">
                      buyer cap {row.maxLatencyMs}ms
                    </span>
                  </td>
                  <td className="num px-3 py-3 text-xs text-muted">
                    <span className="block">run {row.runId ?? "none recorded"}</span>
                    <span className="block">
                      {row.txHash === null ? "no discharge tx" : row.txHash}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setInspecting(row)}
                      className="num rounded-pill border border-edge px-2 py-0.5 text-xs text-muted hover:border-edge-strong hover:text-stark"
                    >
                      INSPECT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
        title="Receipt summary"
      >
        {inspecting === null ? null : (
          <div className="grid gap-6">
            <div>
              <VerdictBadge state={inspecting.state} />
              <p className="mt-3 text-frost">{verdictMeaning(inspecting.state)}</p>
            </div>
            <dl className="grid gap-2">
              {[
                ["Receipt leaf", inspecting.leaf],
                ["Endpoint", inspecting.host],
                ["Amount (atomic)", inspecting.amountAtomic],
                ["Latency", `${inspecting.latencyMs}ms against a ${inspecting.maxLatencyMs}ms buyer cap`],
                ["KeeperHub run", inspecting.runId ?? "none recorded"],
                ["Discharge tx", inspecting.txHash ?? "none — no discharge executed"],
                ["Label", inspecting.label],
                [
                  "Checks available",
                  `${inspecting.mimeTypeAdvertised ? "mimeType" : "no mimeType"}, ${
                    inspecting.schemaAdvertised ? "schema" : "no schema"
                  }, no latency SLA (x402 advertises none)`,
                ],
              ].map(([term, value]) => (
                <div key={term} className="border-b border-edge pb-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted">{term}</dt>
                  <dd className="num mt-1 break-all text-frost">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={`/receipts/${inspecting.leaf}`}
              className="num rounded-2xl border border-volt bg-surface-3 px-3 py-1.5 text-center text-xs uppercase tracking-[0.12em] text-volt"
            >
              Open full receipt
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
