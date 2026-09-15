"use client";

/*
 * §9 /verify — paste a receipt, get the re-derived verdict CLIENT SIDE.
 * §11 zero dependency on our hosted service. If verification needs us, it is not
 *     verification.
 *
 * This page imports the SAME verdict function the gate uses, via packages/reference. It
 * does not re-implement it (DESIGN.md §4). Once loaded, this page needs no network.
 *
 * §9: a mismatch is displayed as loudly as a match. It is displayed more loudly.
 */
import { useCallback, useState, type DragEvent } from "react";
import { parseReceipt, reDerive, type ReDerivation } from "@/lib/verifier";
import { VerdictBadge, verdictMeaning } from "@/components/dashboard/VerdictBadge";
import { Card, CardTitle, Callout } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Outcome =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly problems: readonly string[] }
  | { readonly kind: "derived"; readonly result: ReDerivation };

export default function VerifyPage() {
  const [text, setText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  const run = useCallback(async () => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      setOutcome({
        kind: "invalid",
        problems: [`Not valid JSON: ${(error as Error).message}`],
      });
      return;
    }

    const parsed = parseReceipt(json);
    if (!parsed.ok) {
      setOutcome({ kind: "invalid", problems: parsed.problems });
      return;
    }

    const body =
      bodyText.length > 0 ? new TextEncoder().encode(bodyText) : undefined;
    setOutcome({ kind: "derived", result: await reDerive(parsed.receipt, body) });
  }, [text, bodyText]);

  const onDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file === null) return;
    setText(await file.text());
  }, []);

  return (
    <div className="grid gap-12">
      <div className="grid gap-6">
        <h1 className="text-stark">Re-derive a receipt</h1>
        <p className="max-w-3xl text-frost">
          This page runs the same verdict function the gate runs, in your browser. It sends
          nothing anywhere. Disconnect the network after this page loads and it still works.
        </p>
        <p className="max-w-3xl text-muted">
          Paste a receipt below, or drop a receipt.json onto the box. Optionally paste the
          response body to check the receipt&apos;s sha256 commitment to it.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3">
          <label
            htmlFor="receipt-json"
            className="text-xs uppercase tracking-[0.14em] text-muted"
          >
            Receipt JSON
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border ${
              dragging ? "border-volt" : "border-edge"
            }`}
          >
            <textarea
              id="receipt-json"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={16}
              spellCheck={false}
              placeholder="Paste receipt JSON, or drop a receipt.json file here"
              className="num w-full resize-y rounded-2xl bg-sunken px-3 py-3 text-xs leading-relaxed text-frost placeholder:text-muted"
            />
          </div>
        </div>

        <div className="grid gap-3">
          <label
            htmlFor="body-text"
            className="text-xs uppercase tracking-[0.14em] text-muted"
          >
            Response body (optional)
          </label>
          <textarea
            id="body-text"
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            rows={16}
            spellCheck={false}
            placeholder="Paste the response body to check the receipt's hash commitment to it"
            className="num w-full resize-y rounded-2xl border border-edge bg-sunken px-3 py-3 text-xs leading-relaxed text-frost placeholder:text-muted"
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="volt" onClick={run} disabled={text.trim().length === 0}>
          Re-derive
        </Button>
        <Button
          onClick={() => {
            setText("");
            setBodyText("");
            setOutcome({ kind: "idle" });
          }}
        >
          Clear
        </Button>
      </div>

      {outcome.kind === "invalid" ? (
        <Callout>
          <p className="num text-stark">This input is not a receipt.</p>
          <ul className="num mt-2 space-y-1 text-frost">
            {outcome.problems.map((p) => (
              <li key={p}>— {p}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {outcome.kind === "derived" ? (
        <section className="grid gap-6">
          <div
            className={`rounded-3xl border p-6 ${
              outcome.result.ok ? "border-edge glass-card" : "border-volt bg-surface-3"
            }`}
          >
            <p className="num text-xs uppercase tracking-[0.14em] text-muted">
              {outcome.result.ok ? "Re-derives" : "Does not re-derive"}
            </p>
            <p className="num mt-3 text-stark">
              {outcome.result.ok
                ? "The published verdict matches an independent re-derivation."
                : "MISMATCH. This receipt's published verdict is not what its own committed inputs produce."}
            </p>
            {outcome.result.problems.length > 0 ? (
              <ul className="num mt-3 space-y-1 text-frost">
                {outcome.result.problems.map((p) => (
                  <li key={p}>— {p}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardTitle>Published by the gate</CardTitle>
              <div className="mt-3">
                <VerdictBadge state={outcome.result.publishedVerdict} />
              </div>
            </Card>
            <Card>
              <CardTitle>Re-derived in your browser</CardTitle>
              <div className="mt-3">
                <VerdictBadge state={outcome.result.reDerivedVerdict} />
              </div>
              <p className="mt-3 text-muted">
                {verdictMeaning(outcome.result.reDerivedVerdict)}
              </p>
            </Card>
          </div>

          <Card>
            <CardTitle>Proof table</CardTitle>
            <dl className="mt-3 grid gap-2">
              <div className="border-b border-edge pb-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                  Receipt leaf, computed here
                </dt>
                <dd className="num mt-1 break-all text-frost">{outcome.result.receiptLeaf}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">
                  Response hash commitment
                </dt>
                <dd className="num mt-1 text-frost">
                  {!outcome.result.bodyHashChecked
                    ? "not checked — no response body supplied"
                    : outcome.result.bodyHashMatches
                      ? "the supplied body matches the hash the receipt commits to"
                      : "THE SUPPLIED BODY DOES NOT MATCH the hash the receipt commits to"}
                </dd>
              </div>
            </dl>
          </Card>
        </section>
      ) : null}

      <Callout>
        <p className="text-stark">What this check does and does not establish.</p>
        <p className="mt-2">
          A receipt that re-derives shows the gate applied its own stated rule to its own
          committed inputs. It does not show the gate observed honestly: the gate is the
          only observer of the response bytes. The receipt commits to sha256 of the
          response, so a seller holding its own logs can publish the body and prove a
          mismatch — that is the whole recourse story, and it is a bounded one.
        </p>
      </Callout>
    </div>
  );
}
