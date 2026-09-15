import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-6">
      <h1 className="num text-stark">No such page</h1>
      <p className="text-muted">
        The receipt or endpoint named in this URL is not in the ledger. That is not a
        statement about it; it means nothing here records it.
      </p>
      <Link href="/" className="text-xs text-volt hover:underline">
        ← Overview
      </Link>
    </div>
  );
}
