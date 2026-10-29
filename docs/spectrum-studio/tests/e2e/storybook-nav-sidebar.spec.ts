// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const appearance of ["light", "dark"])
  for (const width of [1280, 480]) {
    test(`Small status badges stay at the end of S2 navigation items in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(
        `/iframe.html?id=components-navigation-sidebar--status-badges&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      const nav = page.getByRole("navigation", {
        name: "Navigation",
        exact: true,
      });
      await expect(nav).toHaveCSS("width", "200px");
      await page.evaluate(() => document.fonts.ready);
      const statusLinks = [
        ["Home", "New"],
        ["Foundations", "TBD"],
        ["Tokens", "Review"],
      ] as const;
      for (const [label, status] of statusLinks) {
        const link = nav.getByRole("link", {
          name: `${label} ${status}`,
          exact: true,
        });
        const badge = link.getByText(status, { exact: true });
        await expect(badge).toBeVisible();
        const geometry = await link.evaluate((element, status) => {
          const link = element.getBoundingClientRect();
          const labelElement = element.querySelector(".sidebarLabel")!;
          const label = labelElement.getBoundingClientRect();
          const badge = [...element.querySelectorAll("span")]
            .find(
              (span) =>
                span.textContent === status &&
                span.parentElement?.textContent === status,
            )!
            .parentElement!.getBoundingClientRect();
          const row = element.closest('[role="row"]')!.getBoundingClientRect();
          const grid = element.parentElement!.getBoundingClientRect();
          return {
            labelRight: label.right,
            badgeLeft: badge.left,
            badgeRight: badge.right,
            linkRight: link.right,
            rowRight: row.right,
            badgeHeight: badge.height,
            rowWidth: row.width,
            contentWidth: grid.width,
            labelWidth: labelElement.clientWidth,
            labelScrollWidth: labelElement.scrollWidth,
          };
        }, status);
        expect(geometry.badgeLeft).toBeGreaterThan(geometry.labelRight);
        expect(geometry.badgeRight).toBeLessThanOrEqual(geometry.linkRight);
        expect(geometry.badgeHeight).toBeLessThanOrEqual(24);
        expect(geometry.rowRight - geometry.badgeRight).toBeLessThanOrEqual(5);
        expect(geometry.contentWidth).toBeCloseTo(geometry.rowWidth, 1);
        expect(geometry.labelScrollWidth).toBeLessThanOrEqual(
          geometry.labelWidth,
        );
        expect(
          await badge.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
      }
      const colors = await nav
        .getByRole("link", { name: "Home New", exact: true })
        .getByText("New", { exact: true })
        .evaluate(
          (element) => getComputedStyle(element.parentElement!).backgroundColor,
        );
      const notice = await nav
        .getByRole("link", { name: "Foundations TBD", exact: true })
        .getByText("TBD", { exact: true })
        .evaluate(
          (element) => getComputedStyle(element.parentElement!).backgroundColor,
        );
      const neutral = await nav
        .getByRole("link", { name: "Tokens Review", exact: true })
        .getByText("Review", { exact: true })
        .evaluate(
          (element) => getComputedStyle(element.parentElement!).backgroundColor,
        );
      expect(new Set([colors, notice, neutral]).size).toBe(3);
      await expect(
        nav
          .getByRole("link", { name: "Registry", exact: true })
          .locator(".sidebarLabel")
          .locator("..")
          .locator(":scope > span"),
      ).toHaveCount(1);
      await expect(
        nav
          .getByRole("link", { name: "Design", exact: true })
          .locator(".sidebarLabel")
          .locator("..")
          .locator(":scope > span"),
      ).toHaveCount(1);
      await nav.screenshot({
        path: info.outputPath(`sidebar-badges-${appearance}-${width}.png`),
      });
      await nav.getByRole("button", { name: "Collapse", exact: true }).click();
      for (const [, status] of statusLinks)
        await expect(nav.getByText(status, { exact: true })).toHaveCount(0);
      await expect(
        nav.getByRole("link", { name: "Foundations", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(nav).toHaveCSS("width", "56px");
      await nav.getByRole("link", { name: "Home", exact: true }).press("Enter");
      await expect(
        nav.getByRole("link", { name: "Home", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await nav.getByRole("button", { name: "Expand", exact: true }).click();
      await expect(
        nav.getByRole("link", { name: "Home New", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    });
  }

test("Real disclosure buttons remain usable and other SideNav instances are unaffected", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-navigation-sidebar--disclosure-behavior&viewMode=story",
  );
  const nav = page.getByRole("navigation", { name: "Navigation", exact: true });
  const parent = nav.getByRole("row").filter({
    has: page.getByRole("link", { name: "Foundations", exact: true }),
  });
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  const disclosure = parent.locator('button[slot="chevron"]');
  await expect(disclosure).toBeVisible();
  expect((await disclosure.boundingBox())!.width).toBeGreaterThan(0);
  await expect(
    nav.getByRole("link", { name: "Colors", exact: true }),
  ).toBeVisible();
  const leaf = nav
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Registry", exact: true }) });
  await expect(leaf.locator('button[slot="chevron"]')).toHaveCSS(
    "display",
    "none",
  );
  await disclosure.click();
  await expect(parent).toHaveAttribute("aria-expanded", "false");
  await expect(
    nav.getByRole("link", { name: "Colors", exact: true }),
  ).toHaveCount(0);
  await disclosure.click();
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  await expect(
    nav.getByRole("link", { name: "Colors", exact: true }),
  ).toBeVisible();
  const unmodified = page.getByRole("navigation", {
    name: "Unmodified navigation",
    exact: true,
  });
  const unmodifiedChevron = unmodified.locator('button[slot="chevron"]');
  await expect(unmodifiedChevron).toHaveCSS("display", "flex");
  expect(
    await unmodifiedChevron.evaluate(
      (element) => element.getBoundingClientRect().width,
    ),
  ).toBeGreaterThan(0);
});

test("Every S2 Badge variant renders and long status strings stay contained", async ({
  page,
}, info) => {
  await page.goto(
    "/iframe.html?id=components-navigation-sidebar--all-variants&viewMode=story",
  );
  const nav = page.getByRole("navigation", { name: "Navigation", exact: true });
  await expect(nav.getByRole("link")).toHaveCount(25);
  for (const link of await nav.getByRole("link").all()) {
    await link.scrollIntoViewIfNeeded();
    await expect(link.getByText("New", { exact: true })).toBeVisible();
  }
  await page.goto(
    "/iframe.html?id=components-navigation-sidebar--long-status&viewMode=story",
  );
  const link = nav.getByRole("link", {
    name: "Home Awaiting final design review",
    exact: true,
  });
  await expect(link).toBeVisible();
  const widths = await nav.evaluate((element) => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(widths.scrollWidth).toBe(widths.width);
  const badge = link.getByText("Awaiting final design review", { exact: true });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS("text-overflow", "ellipsis");
  await nav.screenshot({ path: info.outputPath("sidebar-long-status.png") });
});
