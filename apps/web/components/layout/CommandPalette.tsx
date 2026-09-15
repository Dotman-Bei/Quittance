"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/*
 * frontend.md §3.1: Cmd+K lookup for hashes and hosts.
 *
 * It routes; it does not search a fabricated index. A receipt hash goes to its receipt
 * page and anything else goes to the endpoint page for that host. If the target does not
 * exist, that page renders its own honest empty state rather than this component
 * inventing a "not found" from data it does not have.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length === 0) return;
    setOpen(false);
    setQuery("");
    router.push(
      /^[0-9a-f]{64}$/.test(value)
        ? `/receipts/${value}`
        : `/endpoints/${encodeURIComponent(value)}`,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32">
      <button
        type="button"
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-ink/80"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-xl rounded-featured border border-rule-strong bg-ink-raised p-element"
      >
        <label htmlFor="palette" className="text-caption uppercase tracking-[0.14em] text-quiet">
          Receipt hash or endpoint host
        </label>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the palette exists to take focus */}
        <input
          id="palette"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="sha256 leaf, or a host name"
          className="num mt-3 w-full rounded-default border border-rule bg-ink-sunken px-3 py-2 text-plain placeholder:text-quiet"
        />
        <p className="mt-3 text-caption text-quiet">
          Enter to open. Escape to dismiss.
        </p>
      </form>
    </div>
  );
}
