// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { expectFixedChartSizing } from "./chartSizing";

test("Dimension cards have isolated editing, read-only, error and narrow examples in light and dark themes", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"])
    for (const story of [
      "default",
      "read-only",
      "size",
      "last-scale",
      "overridden",
      "locked",
      "invalid",
      "duplicate-values",
      "invalid-values",
      "mixed-issues",
      "narrow",
    ]) {
      await page.setViewportSize({
        width: story === "narrow" ? 320 : 1280,
        height: 900,
      });
      await page.goto(
        `/iframe.html?id=panels-dimension-scale-card--${story}&viewMode=story&globals=colorScheme:${theme}`,
      );
      const card = page.locator('[data-component="DimensionScaleCard"]');
      await expect(card).toBeVisible();
      await expect(card.getByRole("img", { name: /preview:/ })).toBeVisible();
      expect(
        await card
          .getByRole("img", { name: /preview:/ })
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBe(32);
      if (story === "default")
        await expect(page.locator('[data-play-complete="true"]')).toHaveCount(
          1,
        );
      if (story === "read-only") {
        await expect(
          card.getByRole("textbox", { name: "Base value", exact: true }),
        ).toBeDisabled();
        await expect(card.getByRole("button", { name: /^Delete/ })).toHaveCount(
          0,
        );
      }
      if (story === "last-scale")
        await expect(
          card.getByRole("button", { name: /^Delete/ }),
        ).toBeDisabled();
      if (story === "locked")
        await expect(
          card.getByRole("textbox", { name: "Ratio", exact: true }),
        ).toBeDisabled();
      if (story === "overridden") {
        await expect(
          card.getByRole("textbox", { name: "Ratio", exact: true }),
        ).toHaveValue("1.5");
        await expect(card.getByRole("alert")).toHaveCount(0);
      }
      if (story === "invalid") {
        const alert = card.getByRole("alert");
        await expect(alert).toContainText("0 or less");
        await expect(
          alert.getByLabel("Warning", { exact: true }),
        ).toBeVisible();
      }
      if (story === "duplicate-values") {
        const alert = card.getByRole("alert");
        await expect(alert).toContainText(
          "Some values are the same after rounding",
        );
        await expect(
          alert.getByLabel("Information", { exact: true }),
        ).toBeVisible();
      }
      if (story === "invalid-values" || story === "mixed-issues") {
        const alert = card.getByRole("alert");
        await expect(alert).toContainText(
          "Some values could not be calculated",
        );
        await expect(alert.getByLabel("Error", { exact: true })).toBeVisible();
        if (story === "mixed-issues") {
          await expect(alert).toContainText("0 or less");
          await expect(alert).toContainText(
            "Some values are the same after rounding",
          );
        }
      }
      expect(
        await card.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await card.screenshot({
        path: info.outputPath(`dimension-card-${story}-${theme}.png`),
      });
    }
  expect(errors).toEqual([]);
});

test("Dimension chart stories retain fixed physical sizing, protected baselines and accessible controls", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"])
    for (const story of [
      "static",
      "adaptive",
      "multiple-connections",
      "no-named-modes",
      "error",
      "narrow",
    ]) {
      await page.setViewportSize({
        width: story === "narrow" ? 400 : 1280,
        height: 900,
      });
      await page.goto(
        `/iframe.html?id=views-dimension-scale-analysis--${story}&viewMode=story&globals=colorScheme:${theme}`,
      );
      if (story === "error")
        await expect(page.getByRole("alert")).toContainText("rounding rule");
      else {
        const chart = page.locator(
          '[data-component="DimensionScaleComparison"]',
        );
        await expect(chart).toBeVisible();
        await expectFixedChartSizing(chart);
        await expect(chart.locator('g[data-baseline="true"]')).toHaveCount(1);
        if (story === "static" || story === "adaptive")
          await expect(page.locator('[data-play-complete="true"]')).toHaveCount(
            1,
          );
        if (story === "multiple-connections")
          await expect(
            chart.getByRole("button", { name: /Connected variable$/ }),
          ).toBeVisible();
        if (story === "no-named-modes") {
          await expect(chart).toHaveAttribute(
            "data-comparison-source",
            "range",
          );
          await expect(chart.getByRole("status")).toContainText(
            "No mode set manages",
          );
        }
        if (story === "narrow") {
          const plot = chart.getByRole("region", { name: / plot$/ });
          await plot.focus();
          await plot.press("ArrowRight");
          await expect
            .poll(() => plot.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(0);
        }
        await chart.screenshot({
          path: info.outputPath(`dimension-analysis-${story}-${theme}.png`),
        });
      }
    }
  expect(errors).toEqual([]);
});
