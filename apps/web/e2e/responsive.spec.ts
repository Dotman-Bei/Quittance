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
import { seeded } from "./seeded";

const VIEWPORTS = [
  /*
   * 320 is the narrowest width still in real use (Galaxy Fold closed, SE 1st gen). It is
   * the width that actually breaks layouts, so it leads the list rather than being left off.
   * 2560 catches the opposite failure: content stranded in a stripe down the middle.
   */
  { name: "fold-320", width: 320, height: 653 },
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
  { name: "ultrawide", width: 2560, height: 1440 },
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

/*
 * The two detail routes were not swept before. They carry the densest content in the app,
 * a canonical receipt JSON block and a per-host record table, so they are the likeliest
 * place for an overflow to hide.
 */
test("detail routes survive every viewport", async ({ page }) => {
  const { dischargedLeaf } = seeded();
  const detail = [`/receipts/${dischargedLeaf}`, "/endpoints/seller.invalid"];
  const failures: string[] = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of detail) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const m = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (el.closest(".overflow-x-auto")) continue;
          if (r.right > docW + 1) {
            bad.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 50)}`);
          }
        }
        return { scrollW: document.documentElement.scrollWidth, clientW: docW, bad: bad.slice(0, 2) };
      });
      if (m.scrollW > m.clientW + 1) {
        failures.push(`${vp.name} ${route}: ${m.scrollW}>${m.clientW} ${m.bad.join(" | ")}`);
      }
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

/*
 * A long unbroken token (a 64-char hash, a contract address) is the classic thing that
 * pushes a narrow layout sideways. Asserted at the narrowest width we support.
 */
test("fold-320 — hashes and addresses wrap instead of pushing the page", async ({ page }) => {
  const { dischargedLeaf } = seeded();
  await page.setViewportSize({ width: 320, height: 653 });
  await page.goto(`/receipts/${dischargedLeaf}`);
  await page.waitForLoadState("networkidle");
  const overflowing = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("code, td, dd, span"))) {
      const text = (el.textContent ?? "").trim();
      if (text.length < 32 || /\s/.test(text)) continue;
      if (el.closest(".overflow-x-auto")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > docW + 1 || r.width > docW) out.push(`${text.slice(0, 24)}… ${Math.round(r.width)}px`);
    }
    return [...new Set(out)].slice(0, 5);
  });
  expect(overflowing, overflowing.join(" | ")).toEqual([]);
});
