import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-element">
      <h1 className="num text-loud">No such page</h1>
      <p className="text-quiet">
        The receipt or endpoint named in this URL is not in the ledger. That is not a
        statement about it; it means nothing here records it.
      </p>
      <Link href="/" className="text-caption text-accent hover:underline">
        ← Overview
      </Link>
    </div>
  );
}
