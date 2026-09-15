/*
 * §9 `/receipt/:hash` — "Full receipt, the advertised terms it was judged against, and the
 * exact command to re-derive it. Non-discharge receipts render identically, with the
 * reason code, and are never styled as errors to be dismissed."
 *
 * §18 — "A discharge and a non-discharge are rendered with the same weight, distinguished
 * by label, not by reassurance."
 */
import { test, expect } from "@playwright/test";
import { seeded } from "./seeded";

test.describe("/receipts/:hash", () => {
  test("a discharge shows its terms, its execution, and the re-derive command", async ({ page }) => {
    const { dischargedLeaf } = seeded();
    await page.goto(`/receipts/${dischargedLeaf}`);

    await expect(page.getByText("DELIVERED_AS_ADVERTISED").first()).toBeVisible();
    await expect(page.getByText("LOCAL FIXTURE")).toBeVisible();
    await expect(page.getByText(dischargedLeaf).first()).toBeVisible();

    // §9 the exact command to re-derive it.
    await expect(
      page.getByText(`npx quittance verify evidence/receipts/${dischargedLeaf}.json`),
    ).toBeVisible();

    // §5.3 the leg distinction must be on the page, not only in the docs.
    await expect(page.getByText(/is not a KeeperHub\s+execution/)).toBeVisible();

    // D-002: the advertised-vs-observed table records which checks were available.
    await expect(page.getByRole("columnheader", { name: "Check available?" })).toBeVisible();
    await expect(page.getByText("no seller SLA exists in x402")).toBeVisible();
  });

  test("a non-discharge renders the reason and the ABSENCE of a transaction", async ({ page }) => {
    const { notDeliveredLeaf } = seeded();
    await page.goto(`/receipts/${notDeliveredLeaf}`);

    await expect(page.getByText("NOT_DELIVERED").first()).toBeVisible();
    await expect(page.getByText("none — no discharge executed")).toBeVisible();
    await expect(page.getByText("The discharge did not execute.")).toBeVisible();
  });

  test("§18 a non-discharge badge has the SAME styling as a discharge badge", async ({ page }) => {
    const { dischargedLeaf, notDeliveredLeaf } = seeded();

    const classesOf = async (leaf: string, state: string) => {
      await page.goto(`/receipts/${leaf}`);
      const badge = page.getByText(state, { exact: true }).first();
      await expect(badge).toBeVisible();
      // The badge wrapper carries the styling.
      return badge.locator("xpath=..").getAttribute("class");
    };

    const good = await classesOf(dischargedLeaf, "DELIVERED_AS_ADVERTISED");
    const bad = await classesOf(notDeliveredLeaf, "NOT_DELIVERED");
    expect(bad).toBe(good);
  });

  test("the canonical receipt shown is the exact pre-image of the leaf", async ({ page }) => {
    const { dischargedLeaf } = seeded();
    await page.goto(`/receipts/${dischargedLeaf}`);

    const canonical = await page.locator("pre code").last().innerText();
    const digest = await page.evaluate(async (text: string) => {
      const bytes = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }, canonical);

    expect(digest).toBe(dischargedLeaf);
  });

  test("a receipt that does not exist is a 404, not an invented page", async ({ page }) => {
    const response = await page.goto(`/receipts/${"f".repeat(64)}`);
    expect(response?.status()).toBe(404);
  });
});
