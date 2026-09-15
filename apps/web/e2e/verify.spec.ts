/*
 * §9 `/verify` — "Paste a receipt, get the re-derived verdict client side.
 *                 Mismatch is displayed as loudly as a match."
 * §11 the page must need nothing from us.
 */
import { test, expect } from "@playwright/test";
import { discharged } from "./fixtures";

test.describe("/verify re-derives client side", () => {
  test("an honest receipt re-derives, and says so", async ({ page }) => {
    await page.goto("/verify");
    await page.getByLabel("Receipt JSON").fill(JSON.stringify(discharged()));
    await page.getByRole("button", { name: "Re-derive" }).click();

    await expect(page.getByText("Re-derives", { exact: true })).toBeVisible();
    await expect(
      page.getByText("The published verdict matches an independent re-derivation."),
    ).toBeVisible();
    // Both panels show the same enumerated state, spelled out in full.
    await expect(page.getByText("DELIVERED_AS_ADVERTISED").first()).toBeVisible();
    // The leaf is computed in the browser, not read from the receipt.
    await expect(page.getByText(/^[0-9a-f]{64}$/)).toBeVisible();
  });

  test("a forged verdict is reported as a mismatch, not swallowed", async ({ page }) => {
    const forged = { ...discharged(), publishedVerdict: "NOT_DELIVERED" as const };
    await page.goto("/verify");
    await page.getByLabel("Receipt JSON").fill(JSON.stringify(forged));
    await page.getByRole("button", { name: "Re-derive" }).click();

    await expect(page.getByText("Does not re-derive")).toBeVisible();
    await expect(page.getByText(/MISMATCH\./)).toBeVisible();
    await expect(page.getByText(/verdict mismatch:/)).toBeVisible();
  });

  test("a 502 body re-derives to NOT_DELIVERED even when the receipt claims otherwise", async ({
    page,
  }) => {
    const r = discharged();
    const lying = { ...r, observed: { ...r.observed, httpStatus: 502 } };
    await page.goto("/verify");
    await page.getByLabel("Receipt JSON").fill(JSON.stringify(lying));
    await page.getByRole("button", { name: "Re-derive" }).click();

    await expect(page.getByText("Does not re-derive")).toBeVisible();
    await expect(page.getByText("NOT_DELIVERED").first()).toBeVisible();
  });

  test("a response body that does not match the commitment is reported", async ({ page }) => {
    await page.goto("/verify");
    await page.getByLabel("Receipt JSON").fill(JSON.stringify(discharged()));
    await page.getByLabel("Response body (optional)").fill("not the committed bytes");
    await page.getByRole("button", { name: "Re-derive" }).click();

    await expect(page.getByText(/response hash mismatch:/)).toBeVisible();
    await expect(
      page.getByText("THE SUPPLIED BODY DOES NOT MATCH the hash the receipt commits to"),
    ).toBeVisible();
  });

  test("input that is not a receipt is rejected with reasons, never accepted", async ({ page }) => {
    await page.goto("/verify");
    await page.getByLabel("Receipt JSON").fill('{"receiptVersion":1}');
    await page.getByRole("button", { name: "Re-derive" }).click();

    await expect(page.getByText("This input is not a receipt.")).toBeVisible();
    await expect(page.getByText("Re-derives", { exact: true })).toHaveCount(0);
  });

  test("§11 the page needs no network after load", async ({ page, context }) => {
    await page.goto("/verify");
    await page.waitForLoadState("networkidle");
    // Every subsequent request fails. If re-derivation needed us, this would break it.
    await context.route("**/*", (route) => route.abort());

    await page.getByLabel("Receipt JSON").fill(JSON.stringify(discharged()));
    await page.getByRole("button", { name: "Re-derive" }).click();
    await expect(page.getByText("Re-derives", { exact: true })).toBeVisible();
  });
});
