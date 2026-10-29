// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PREFERENCES_STORAGE_KEY } from "../../src/features/edit-session/storage";

const pages = [
  "Home",
  "Analysis",
  "Foundations",
  "Design",
  "Tokens",
  "Components",
  "Logic",
  "Modes",
  "Registry",
  "Themes",
  "Platforms",
];
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

function navigation(page: Page) {
  return page.getByRole("navigation", { name: "Navigation", exact: true });
}

function navLink(nav: Locator, name: string) {
  return nav.getByRole("link", { name: new RegExp(`^${name}(?:\\s|$)`) });
}

async function expectWidth(nav: Locator, width: number) {
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(width);
}

async function expectCurrent(nav: Locator, name: string) {
  await expect(navLink(nav, name)).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
}

for (const width of [1600, 800])
  for (const appearance of ["light", "dark"] as const) {
    test(`S2 navigation preserves collapse and page selection in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        ({ key, appearance }) => {
          localStorage.setItem(
            key,
            JSON.stringify({ version: 1, appearance, modeSelection: {} }),
          );
        },
        { key: PREFERENCES_STORAGE_KEY, appearance },
      );
      await page.goto("/");
      const nav = navigation(page);
      await expect(nav.getByRole("link")).toHaveCount(pages.length);
      await expectWidth(nav, 200);
      await expectCurrent(nav, "Home");
      const url = page.url();
      await nav.getByRole("link", { name: "Foundations", exact: true }).click();
      await expect(
        page.locator('[data-component="Foundations"]'),
      ).toBeVisible();
      await expectCurrent(nav, "Foundations");
      const main = page.locator('[data-component="BrowsingContext-main"]');
      const expandedMain = await main.boundingBox();
      await nav.screenshot({
        path: info.outputPath(`sidebar-expanded-${appearance}-${width}.png`),
      });

      await nav.getByRole("button", { name: "Collapse", exact: true }).click();
      await expectWidth(nav, 56);
      await expect(
        nav.getByRole("button", { name: "Expand", exact: true }),
      ).toBeVisible();
      for (const name of pages) {
        const link = navLink(nav, name);
        await expect(link).toBeVisible();
        await expect(link.locator(".sidebarLabel")).toHaveCSS("opacity", "0");
      }
      const bounds = await nav.evaluate((element) => {
        const nav = element.getBoundingClientRect();
        return [...element.querySelectorAll("a svg")].map((icon) => {
          const rect = icon.getBoundingClientRect();
          return {
            left: rect.left - nav.left,
            right: rect.right - nav.left,
            width: rect.width,
          };
        });
      });
      expect(bounds).toHaveLength(pages.length);
      expect(
        bounds.every(
          (icon) => icon.width > 0 && icon.left >= 0 && icon.right <= 56,
        ),
      ).toBe(true);
      await expect
        .poll(
          async () => (await main.boundingBox())!.width - expandedMain!.width,
        )
        .toBe(144);
      await expectCurrent(nav, "Foundations");
      await nav.screenshot({
        path: info.outputPath(`sidebar-collapsed-${appearance}-${width}.png`),
      });

      await nav.getByRole("link", { name: "Registry", exact: true }).click();
      await expectCurrent(nav, "Registry");
      await expect(page.locator('[data-component="Registry"]')).toBeVisible();
      await nav.getByRole("button", { name: "Expand", exact: true }).click();
      await expectWidth(nav, 200);
      await expectCurrent(nav, "Registry");
      for (const label of await nav.locator(".sidebarLabel").all())
        await expect(label).toHaveCSS("opacity", "1");
      expect(page.url()).toBe(url);
      await expect(nav.getByRole("radio")).toHaveCount(0);
      await expect(nav.locator(".sideNavItem, .sideNavIndicator")).toHaveCount(
        0,
      );
    });
  }

test("Every S2 navigation link switches pages without changing the URL or reloading", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const nav = navigation(page);
  const url = page.url();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  for (const name of pages) {
    await navLink(nav, name).click();
    await expectCurrent(nav, name);
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  }
});

test("Unused chevrons release the full item width without truncating the Components status row", async ({
  page,
}) => {
  await page.goto("/");
  const nav = navigation(page);
  await expect(nav.getByRole("link")).toHaveCount(pages.length);
  const chevrons = nav.locator('button[slot="chevron"]');
  await expect(chevrons).toHaveCount(pages.length);
  for (const chevron of await chevrons.all()) {
    await expect(chevron).toHaveCSS("display", "none");
    expect(await chevron.boundingBox()).toBeNull();
  }
  const link = navLink(nav, "Components");
  const geometry = await link.evaluate((element) => {
    const row = element.closest('[role="row"]')!.getBoundingClientRect();
    const grid = element.parentElement!.getBoundingClientRect();
    const label = element.querySelector(".sidebarLabel")!;
    return {
      rowWidth: row.width,
      contentWidth: grid.width,
      labelWidth: label.clientWidth,
      labelScrollWidth: label.scrollWidth,
    };
  });
  expect(geometry.contentWidth).toBeCloseTo(geometry.rowWidth, 1);
  expect(geometry.labelScrollWidth).toBeLessThanOrEqual(geometry.labelWidth);
});

test("S2 navigation supports Tab, arrow keys and Enter with accessible collapsed labels", async ({
  page,
}) => {
  await page.goto("/");
  const nav = navigation(page);
  const home = nav.getByRole("link", { name: "Home", exact: true });
  const analysis = nav.getByRole("link", { name: "Analysis", exact: true });
  const foundations = nav.getByRole("link", {
    name: "Foundations",
    exact: true,
  });
  await home.focus();
  await home.press("ArrowDown");
  await expect(analysis).toBeFocused();
  await expectCurrent(nav, "Home");
  await analysis.press("ArrowDown");
  await expect(foundations).toBeFocused();
  await expectCurrent(nav, "Home");
  await foundations.press("Enter");
  await expectCurrent(nav, "Foundations");
  await expect(page.locator('[data-component="Foundations"]')).toBeVisible();
  await foundations.press("Tab");
  const collapse = nav.getByRole("button", { name: "Collapse", exact: true });
  await expect(collapse).toBeFocused();
  await collapse.press("Enter");
  await expectWidth(nav, 56);
  const registry = nav.getByRole("link", { name: "Registry", exact: true });
  await registry.focus();
  await registry.press("Enter");
  await expectCurrent(nav, "Registry");
  await expect(page.locator('[data-component="Registry"]')).toBeVisible();
  await nav.getByRole("button", { name: "Expand", exact: true }).press("Enter");
  await expectWidth(nav, 200);
  await expectCurrent(nav, "Registry");
});

test("S2 navigation scrolls in a short container while the collapse toggle remains available", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto("/");
  const nav = navigation(page);
  await nav.evaluate((element) => {
    element.style.height = "320px";
  });
  const collapse = nav.getByRole("button", { name: "Collapse", exact: true });
  const tree = nav.getByRole("treegrid", { name: "Pages", exact: true });
  expect(
    await tree.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await expect(collapse).toBeInViewport();
  await expect(collapse).toHaveCSS("height", "32px");
  const platforms = nav.getByRole("link", { name: "Platforms", exact: true });
  await platforms.scrollIntoViewIfNeeded();
  await platforms.click();
  await expectCurrent(nav, "Platforms");
  await expect(collapse).toBeInViewport();
  await expect(nav).toHaveCSS("height", "320px");
  expect(
    (await collapse.boundingBox())!.y + (await collapse.boundingBox())!.height,
  ).toBeLessThanOrEqual(376);
  await collapse.click();
  await expectWidth(nav, 56);
  await expect(
    nav.getByRole("button", { name: "Expand", exact: true }),
  ).toBeInViewport();
  await nav.screenshot({
    path: info.outputPath("sidebar-short-collapsed.png"),
  });
});
