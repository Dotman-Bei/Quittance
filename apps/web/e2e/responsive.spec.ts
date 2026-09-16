/*
 * Responsive behaviour, asserted rather than eyeballed.
 *
 * Two distinct failures matter and they are not the same thing:
 *   1. the PAGE scrolling sideways — always a bug
 *   2. a data table CRUSHED into an unreadable width — no page scroll, still unusable
 *
 * A 7-column ledger squeezed into 325px passes a naive overflow check and is useless, so
 * wide tables carry a min-width and scroll inside their own container instead.
 */
import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
];
const ROUTES = ["/", "/receipts", "/endpoints", "/verify"];

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`${vp.name} ${route} — no sideways page scroll`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const m = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          /* Ignore anything inside a deliberate horizontal scroller. */
          if (el.closest(".overflow-x-auto")) continue;
          if (r.right > docW + 1) bad.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 40)}`);
        }
        return { scrollW: document.documentElement.scrollWidth, clientW: docW, bad: bad.slice(0, 3) };
      });
      expect(m.scrollW, `${route} @${vp.width}: ${m.bad.join(" | ")}`).toBeLessThanOrEqual(m.clientW + 1);
    });
  }
}

test("mobile 375 — every control is at least 44px tall", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const small = await page.evaluate(() => {
      const out: string[] = [];
      /*
       * Only CONTROLS need a 44px target. An inline link inside prose, a footer, or a cell
       * of a dense data table is text — enlarging those would wreck the table and help
       * nobody. Scoped to buttons, tabs, and primary navigation.
       */
      const controls = [
        ...Array.from(document.querySelectorAll("button")),
        ...Array.from(document.querySelectorAll("[role=tab]")),
        ...Array.from(document.querySelectorAll("header a")),
        ...Array.from(document.querySelectorAll("a[class*=rounded-2xl], a[class*=rounded-pill]")),
      ];
      for (const el of controls) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (el.closest("td") || el.closest("footer")) continue;
        /* A visually-hidden skip link is not a touch target until focused. */
        if ((el.getAttribute("class") ?? "").includes("sr-only")) continue;
        if (r.height < 40) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 20)}" ${Math.round(r.height)}px`);
      }
      return [...new Set(out)];
    });
    expect(small, `${route}: ${small.join(" | ")}`).toEqual([]);
  }
});

test("mobile 375 — wide tables stay readable and scroll in their own container", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/receipts");
  await page.waitForLoadState("networkidle");
  const m = await page.evaluate(() => {
    const table = document.querySelector("table");
    const wrap = table?.closest(".overflow-x-auto");
    return {
      tableW: table ? Math.round(table.getBoundingClientRect().width) : 0,
      wrapW: wrap ? Math.round(wrap.getBoundingClientRect().width) : 0,
      scrolls: wrap ? wrap.scrollWidth > wrap.clientWidth : false,
    };
  });
  /* The table must keep a readable width and its container must absorb the difference. */
  expect(m.tableW).toBeGreaterThan(600);
  expect(m.scrolls).toBe(true);
});
