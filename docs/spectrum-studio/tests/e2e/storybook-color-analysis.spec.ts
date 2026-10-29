// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("color analysis stories render in light/dark, narrow and constrained states", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "chromaticity",
    "lightness",
    "keys-and-paths",
    "curve",
    "dark",
    "narrow",
    "display-p-3",
    "empty",
    "one-stop",
    "no-stops",
    "invalid-key",
    "overrides-and-preview",
    "keyboard-controls",
    "reference-changes",
  ]) {
    await page.setViewportSize({
      width: story === "narrow" ? 480 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=views-color-analysis--${story}&viewMode=story`,
    );
    const root = page.locator('[data-component="ColorAnalyze"]');
    await expect(root).toBeVisible();
    if (["chromaticity", "dark", "narrow"].includes(story)) {
      const grid = root.locator(".colorAnalysisGrid");
      await expect
        .poll(() =>
          grid.evaluate(
            (node) =>
              getComputedStyle(node).gridTemplateColumns.split(" ").length,
          ),
        )
        .toBe(story === "narrow" ? 1 : 2);
    }
    if (story === "invalid-key")
      await expect(root.getByRole("alert")).toContainText("invalid key");
    else if (story === "empty")
      await expect(root.getByRole("status")).toContainText("Add a color scale");
    else if (story === "no-stops")
      await expect(
        root.getByText("There are no output stops to preview."),
      ).toBeVisible();
    else if (
      ["lightness", "curve", "one-stop", "reference-changes"].includes(story)
    ) {
      await expect(
        root.getByRole("img", { name: "Lightness (OKLab)", exact: true }),
      ).toBeVisible();
      if (story === "reference-changes")
        await expect(page.locator('[data-play-complete="true"]')).toHaveCount(
          1,
        );
    } else {
      await expect(
        root.getByLabel("OKLCh gamut slice", { exact: true }),
      ).toHaveAttribute("data-render-state", "ready");
      if (story === "keyboard-controls")
        await expect(page.locator('[data-play-complete="true"]')).toHaveCount(
          1,
        );
    }
    if (story === "narrow")
      expect(
        await root.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`color-analysis-${story}.png`),
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
});

test("Chromaticity columns follow the available container, not the viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    "/iframe.html?id=views-color-analysis--chromaticity&viewMode=story",
  );
  const root = page.locator('[data-component="ColorAnalyze"]');
  await expect(root).toBeVisible();
  for (const width of [899, 900, 901, 899]) {
    await root.evaluate((node, width) => {
      node.parentElement!.style.width = `${width}px`;
    }, width);
    await expect
      .poll(() =>
        root
          .locator(".colorAnalysisGrid")
          .evaluate(
            (node) =>
              getComputedStyle(node).gridTemplateColumns.split(" ").length,
          ),
      )
      .toBe(width >= 900 ? 2 : 1);
  }
  expect(errors).toEqual([]);
});

test("lightness is charted only in the Lightness tab", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=views-color-analysis--chromaticity&viewMode=story",
  );
  const root = page.locator('[data-component="ColorAnalyze"]');
  await expect(page.locator('[data-play-complete="true"]')).toHaveCount(1);
  for (let visit = 0; visit < 2; visit += 1) {
    await expect(
      root.getByRole("img", {
        name: "Hue and chroma projections",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      root.getByRole("img", {
        name: "hue along generated scales",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      root.getByRole("img", {
        name: "chroma along generated scales",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      root.getByRole("img", {
        name: "lightness along generated scales",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      root.getByRole("img", { name: "Lightness (OKLab)", exact: true }),
    ).toHaveCount(0);
    await expect(
      root.getByRole("textbox", { name: "Slice lightness value", exact: true }),
    ).toHaveValue("50");
    await root.getByRole("tab", { name: "Lightness", exact: true }).click();
    await expect(
      root.getByRole("img", { name: "Lightness (OKLab)", exact: true }),
    ).toBeVisible();
    await expect(
      root.getByRole("img", { name: "Contrast (WCAG 2)", exact: true }),
    ).toBeVisible();
    await expect(
      root.getByRole("list", { name: "Grayscale output strip", exact: true }),
    ).toBeVisible();
    await root.getByRole("tab", { name: "Chromaticity", exact: true }).click();
  }
  await root.getByRole("button", { name: "Show values", exact: true }).click();
  for (const table of ["trajectory values", "scale key values"]) {
    await expect(
      root
        .getByRole("table", { name: new RegExp(`${table}$`) })
        .getByRole("columnheader", { name: "Lightness (OKLab)", exact: true }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("only the Lightness header pickers opt out of equal-column grid layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=views-color-analysis--lightness&viewMode=story",
  );
  const root = page.locator('[data-component="ColorAnalyze"]');
  for (const label of ["Reference scale", "Surface", "Chart line type"]) {
    const picker = root.getByRole("button", { name: new RegExp(` ${label}$`) });
    await expect(picker).toBeVisible();
    expect(
      await picker.evaluate(
        (node) => node.parentElement?.style.gridTemplateColumns,
      ),
    ).toBe("");
  }
  await root.getByRole("tab", { name: "Chromaticity", exact: true }).click();
  const markers = root.getByRole("button", { name: / Markers$/ });
  await expect(markers).toBeVisible();
  expect(
    await markers.evaluate(
      (node) => node.parentElement?.style.gridTemplateColumns,
    ),
  ).toMatch(/^repeat\(2,/);
  expect(errors).toEqual([]);
});
