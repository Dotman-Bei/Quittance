/*
 * §9 / §18 rules that only show up in a rendered page.
 */
import { test, expect } from "@playwright/test";
import { seeded } from "./seeded";

test.describe("§18 palette and weight", () => {
  test("no green is used anywhere on the rendered pages", async ({ page }) => {
    for (const path of ["/", "/receipts", "/endpoints", "/verify"]) {
      await page.goto(path);
      const greens = await page.evaluate(() => {
        const hits: string[] = [];
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const s = getComputedStyle(el);
          for (const prop of ["color", "backgroundColor", "borderTopColor"] as const) {
            const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s[prop]);
            if (m === null) continue;
            const r = Number(m[1]);
            const g = Number(m[2]);
            const b = Number(m[3]);
            // Green-dominant and saturated enough to read as a "pass" colour.
            if (g > 90 && g - r > 40 && g - b > 40) hits.push(`${prop}=${s[prop]}`);
          }
        }
        return hits;
      });
      expect(greens, `green found on ${path}`).toEqual([]);
    }
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
