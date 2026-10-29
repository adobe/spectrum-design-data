// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { expectChartColumns, expectFixedChartSizing } from "./chartSizing";

test("Typography comparison stories use app styling and accessible shared controls", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "by-size-setting",
    "by-token",
    "keyboard-controls",
    "named-modes",
    "one-setting",
    "error",
    "dark",
    "narrow",
  ]) {
    await page.setViewportSize({
      width: story === "narrow" ? 480 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=views-typography-comparisons--${story}&viewMode=story`,
    );
    if (story === "error")
      await expect(page.getByRole("alert")).toContainText(
        "Choose an available interpolation",
      );
    else {
      await expect(
        page.locator('[data-component="TypographyComparisonView"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: /by size setting$|by token$/ }),
      ).toHaveCount(3);
      await expect(page.locator('g[data-baseline="true"]')).toHaveCount(3);
      await expectFixedChartSizing(
        page.locator('[data-component="TypographyComparisonView"]'),
      );
      const availableWidth = await page
        .locator('[data-component="TypographyComparisonView"]')
        .evaluate((element) => element.getBoundingClientRect().width);
      await expectChartColumns(
        page.locator('[data-component="TypographyComparisonView"]'),
        availableWidth >= 1682 ? 3 : availableWidth >= 1116 ? 2 : 1,
      );
      if (story === "keyboard-controls")
        await expect(page.locator('[data-play-complete="true"]')).toHaveCount(
          1,
        );
      if (story === "by-token") {
        await expect(
          page.getByRole("img", { name: "Font size by token" }),
        ).toBeVisible();
        await expect(page.locator("g[data-series-id]")).toHaveCount(15);
      }
      if (story === "narrow") {
        await page.setViewportSize({ width: 320, height: 900 });
        const plot = page.getByRole("region", {
          name: "Font size by size setting plot",
        });
        await expectFixedChartSizing(
          page.locator('[data-component="TypographyComparisonView"]'),
        );
        expect(
          await plot
            .getByRole("img")
            .evaluate((svg) => svg.getBoundingClientRect().width),
        ).toBeGreaterThanOrEqual(360);
        await plot.focus();
        await plot.press("ArrowRight");
        await expect
          .poll(() => plot.evaluate((region) => region.scrollLeft))
          .toBeGreaterThan(0);
      }
    }
    await page.screenshot({
      path: info.outputPath(`typography-comparison-${story}.png`),
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
});

test("Standalone comparison cards wrap at 550px using their own container width", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 2400, height: 900 });
  await page.goto(
    "/iframe.html?id=views-typography-comparisons--by-size-setting&viewMode=story",
  );
  const root = page.locator('[data-component="TypographyComparisonView"]');
  await expect(root).toBeVisible();
  for (const width of [549, 550, 1115, 1116, 1117, 1681, 1682, 2000, 549]) {
    await root.evaluate((element, width) => {
      element.style.width = `${width}px`;
    }, width);
    await expect(root).toHaveCSS("width", `${width}px`);
    await expectChartColumns(root, width >= 1682 ? 3 : width >= 1116 ? 2 : 1);
    await expectFixedChartSizing(root);
  }
  expect(errors).toEqual([]);
});
