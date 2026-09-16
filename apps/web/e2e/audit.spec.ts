/* Full frontend audit: does every surface actually work, not merely return 200. */
import { test, expect } from "@playwright/test";
import { seeded } from "./seeded";

const ROUTES = ["/", "/receipts", "/endpoints", "/verify"];

test("no console errors or failed requests on any route", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 120)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (!f.includes("ERR_ABORTED")) problems.push(`request failed: ${r.url().slice(0, 80)} ${f}`);
  });
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
  }
  expect([...new Set(problems)], problems.slice(0, 5).join(" | ")).toEqual([]);
});

test("every internal link resolves", async ({ page, request }) => {
  const seen = new Set<string>();
  const broken: string[] = [];
  for (const r of ROUTES) {
    await page.goto(r);
    const hrefs = await page.locator("a[href^='/']").evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    for (const h of hrefs) {
      const clean = h.split("#")[0] ?? "";
      if (clean === "" || seen.has(clean)) continue;
      seen.add(clean);
      const res = await request.get(clean);
      if (res.status() >= 400) broken.push(`${clean} -> ${res.status()}`);
    }
  }
  console.log(`  checked ${seen.size} distinct internal links`);
  expect(broken, broken.join(" | ")).toEqual([]);
});

test("/verify end to end: re-derive, mismatch, bad input, offline", async ({ page, context }) => {
  await page.goto("/verify");
  const { dischargedLeaf } = seeded();

  /* Pull a real receipt out of the receipt page and round-trip it through /verify. */
  await page.goto(`/receipts/${dischargedLeaf}`);
  const canonical = await page.locator("pre code").last().innerText();

  await page.goto("/verify");
  await page.getByLabel("Receipt JSON").fill(canonical);
  await page.getByRole("button", { name: "Re-derive" }).click();
  await expect(page.getByText("Re-derives", { exact: true })).toBeVisible();

  /* Tamper: the verdict must flip and say so. */
  const tampered = JSON.parse(canonical) as Record<string, unknown>;
  (tampered["observed"] as Record<string, unknown>)["httpStatus"] = 502;
  await page.getByLabel("Receipt JSON").fill(JSON.stringify(tampered));
  await page.getByRole("button", { name: "Re-derive" }).click();
  await expect(page.getByText("Does not re-derive")).toBeVisible();

  /* Garbage in, reasons out — never silent acceptance. */
  await page.getByLabel("Receipt JSON").fill("{ not json");
  await page.getByRole("button", { name: "Re-derive" }).click();
  await expect(page.getByText("This input is not a receipt.")).toBeVisible();

  /* §11: no network needed after load. */
  await page.goto("/verify");
  await page.waitForLoadState("networkidle");
  await context.route("**/*", (r) => r.abort());
  await page.getByLabel("Receipt JSON").fill(canonical);
  await page.getByRole("button", { name: "Re-derive" }).click();
  await expect(page.getByText("Re-derives", { exact: true })).toBeVisible();
});

test("ledger filtering and the inspect drawer", async ({ page }) => {
  await page.goto("/receipts");
  const all = await page.locator("tbody tr").count();
  expect(all).toBeGreaterThan(0);

  await page.getByRole("tab", { name: /NOT_DELIVERED/ }).click();
  const filtered = await page.locator("tbody tr").count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);
  await expect(page.locator("tbody").getByText("DELIVERED_AS_ADVERTISED")).toHaveCount(0);

  /* Search narrows further. */
  await page.getByRole("tab", { name: /^ALL/ }).click();
  await page.getByLabel(/Filter by endpoint host/).fill("onesource");
  const searched = await page.locator("tbody tr").count();
  expect(searched).toBeGreaterThan(0);
  expect(searched).toBeLessThan(all);

  /* Drawer opens, shows the receipt, and closes on Escape. */
  await page.getByLabel(/Filter by endpoint host/).fill("");
  await page.locator("tbody tr").first().getByRole("button", { name: "INSPECT" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Receipt leaf")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("receipt detail and endpoint pages render their data", async ({ page }) => {
  const { dischargedLeaf, notDeliveredLeaf } = seeded();

  await page.goto(`/receipts/${dischargedLeaf}`);
  await expect(page.getByText("Advertised against observed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Canonical receipt" })).toBeVisible();
  await expect(page.getByText(/npx quittance verify/)).toBeVisible();

  await page.goto(`/receipts/${notDeliveredLeaf}`);
  await expect(page.getByText("none — no discharge executed")).toBeVisible();

  await page.goto("/endpoints");
  const rows = await page.locator("tbody tr").count();
  expect(rows).toBeGreaterThan(0);
  const host = await page.locator("tbody tr").first().locator("a").innerText();
  await page.goto(`/endpoints/${encodeURIComponent(host)}`);
  await expect(page.getByText("Reason codes")).toBeVisible();
  await expect(page.getByText("Checks available for this endpoint")).toBeVisible();
});

test("command palette opens, routes, and dismisses", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel(/Receipt hash or endpoint host/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel(/Receipt hash or endpoint host/)).toHaveCount(0);

  await page.keyboard.press("Control+k");
  const { dischargedLeaf } = seeded();
  await page.getByLabel(/Receipt hash or endpoint host/).fill(dischargedLeaf);
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/receipts/${dischargedLeaf}`);
});

test("mechanism stepper expands", async ({ page }) => {
  await page.goto("/");
  const node = page.getByRole("button", { name: /Pure verdict/ });
  await expect(node).toHaveAttribute("aria-expanded", "false");
  await node.click();
  await expect(node).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/reads only fields the receipt commits to/)).toBeVisible();
});

test("a missing receipt and an uncalled endpoint fail honestly", async ({ page }) => {
  const res = await page.goto(`/receipts/${"f".repeat(64)}`);
  expect(res?.status()).toBe(404);

  await page.goto("/endpoints/never-called.invalid");
  await expect(page.getByText("no gated calls recorded")).toBeVisible();
  await expect(page.getByText(/it means we have not called it/)).toBeVisible();
});
