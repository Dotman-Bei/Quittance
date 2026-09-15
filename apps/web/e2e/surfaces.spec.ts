/*
 * §9 / §18 rules that only show up in a rendered page.
 */
import { test, expect } from "@playwright/test";
import { seeded } from "./seeded";

test.describe("D-013 palette and weight", () => {
  /*
   * DECISIONS.md D-013. The old test scanned computed styles for green. The Vaultory
   * palette is built on Volt Lime, so that proxy is gone and the rule it stood in for is
   * asserted directly: a discharge and a non-discharge must render IDENTICALLY.
   */
  test("no verdict state is distinguished by colour", async ({ page }) => {
    const { dischargedLeaf, notDeliveredLeaf } = seeded();

    const styleOf = async (leaf: string, state: string) => {
      await page.goto(`/receipts/${leaf}`);
      const badge = page.getByText(state, { exact: true }).first();
      await expect(badge).toBeVisible();
      const chip = badge.locator("xpath=..");
      return chip.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor, s.borderTopColor, s.borderRadius].join(" | ");
      });
    };

    const delivered = await styleOf(dischargedLeaf, "DELIVERED_AS_ADVERTISED");
    const notDelivered = await styleOf(notDeliveredLeaf, "NOT_DELIVERED");
    expect(notDelivered).toBe(delivered);
  });

  test("the brand accent never lands on a verdict chip", async ({ page }) => {
    const { dischargedLeaf } = seeded();
    await page.goto(`/receipts/${dischargedLeaf}`);
    const chip = page.getByText("DELIVERED_AS_ADVERTISED", { exact: true }).first().locator("xpath=..");
    const colours = await chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.color, s.backgroundColor, s.borderTopColor];
    });
    /* Volt Lime is rgb(196, 255, 13). It may brand the page; it may not brand a verdict. */
    for (const c of colours) expect(c).not.toContain("196, 255, 13");
  });

  test("every verdict state is spelled out in full, never abbreviated to a symbol", async ({
    page,
  }) => {
    await page.goto("/");
    for (const state of [
      "DELIVERED_AS_ADVERTISED",
      "NOT_DELIVERED",
      "SHAPE_MISMATCH",
      "TIMEOUT_EXCEEDED",
      "REQUIREMENTS_MISMATCH",
      "GATE_ERROR",
      "SETTLEMENT_FAILED",
    ]) {
      await expect(page.getByText(state).first()).toBeVisible();
    }
  });
});

test.describe("§9 honest surfaces", () => {
  test("the endpoint record shows INSUFFICIENT SAMPLE, never a percentage, under 20 calls", async ({
    page,
  }) => {
    await page.goto("/endpoints/seller.invalid");
    await expect(page.getByText(/INSUFFICIENT SAMPLE/)).toBeVisible();
    // No percentage anywhere on a 1-call record.
    await expect(page.getByText(/\d+\.\d%/)).toHaveCount(0);
  });

  test("an endpoint with no calls says so, and does not imply anything about the endpoint", async ({
    page,
  }) => {
    await page.goto("/endpoints/never-called.invalid");
    await expect(page.getByText("no gated calls recorded")).toBeVisible();
    await expect(page.getByText(/it means we have not called it/)).toBeVisible();
  });

  test("the ledger lists a non-discharge alongside a discharge, newest first", async ({ page }) => {
    const { notDeliveredLeaf } = seeded();
    await page.goto("/receipts");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    // The NOT_DELIVERED fixture is the newer one.
    await expect(rows.first()).toContainText("NOT_DELIVERED");
    await expect(rows.first()).toContainText("no discharge tx");
    expect(notDeliveredLeaf).toHaveLength(64);
  });

  test("filtering to a state with no rows names the reason, and is not a blank screen", async ({
    page,
  }) => {
    await page.goto("/receipts");
    await page.getByRole("tab", { name: /GATE_ERROR/ }).click();
    await expect(page.getByText("No runs match this filter.")).toBeVisible();
  });

  test("the landing page states which leg KeeperHub executes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByText("Which leg KeeperHub executes")).toBeVisible();
    await expect(page.getByText("The seller's own facilitator")).toBeVisible();
  });
});
