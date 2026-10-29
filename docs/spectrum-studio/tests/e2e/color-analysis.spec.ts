// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  renderColorRaster,
  type RasterSpec,
} from "../../src/components/color-picker/colorRaster";
import { cpus, platform, arch } from "node:os";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function openAnalysis(page: Page) {
  await page.goto("/");
  const changes = page
    .getByRole("complementary", { name: "Change log", exact: true })
    .getByRole("heading", { name: "Changes", exact: true });
  if (await changes.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log/ })
      .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  const root = page.locator('[data-component="ColorAnalyze"]');
  await expect(root).toBeVisible();
  return root;
}

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    test("natural slice, true overlays and navigation preferences do not edit authoring data", async ({
      page,
    }) => {
      const root = await openAnalysis(page);
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
      const before = await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      );
      const raster = root.getByLabel("OKLCh gamut slice", { exact: true });
      await expect(raster).toHaveAttribute("data-render-state", "ready");
      expect(
        await raster.evaluate((node) => {
          const canvas = node as HTMLCanvasElement;
          const rgba = canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data;
          return {
            transparent: rgba[3],
            colored: rgba.some(
              (value, index) => index % 4 === 3 && value === 255,
            ),
          };
        }),
      ).toEqual({ transparent: 0, colored: true });
      const encodingCheck = await raster.evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const colorSpace =
          context.getContextAttributes().colorSpace === "display-p3"
            ? "display-p3"
            : "srgb";
        const x = Math.floor(canvas.width * 0.55);
        const y = Math.floor(canvas.height * 0.45);
        return {
          key: canvas.dataset.renderKey!,
          x,
          y,
          pixel: [...context.getImageData(x, y, 1, 1, { colorSpace }).data],
        };
      });
      const renderedSpec: RasterSpec = JSON.parse(encodingCheck.key);
      const expected = renderColorRaster(renderedSpec);
      const offset =
        (encodingCheck.y * renderedSpec.size + encodingCheck.x) * 4;
      encodingCheck.pixel.forEach((value, channel) =>
        expect(
          Math.abs(value - expected[offset + channel]),
        ).toBeLessThanOrEqual(1),
      );
      const input = root.getByRole("textbox", {
        name: "Slice lightness value",
        exact: true,
      });
      await input.fill("25");
      await input.press("Tab");
      await expect(raster).toHaveAttribute("data-render-state", "ready");
      await root.getByText("Show scale paths", { exact: true }).click();
      await expect(
        root.getByRole("checkbox", { name: "Show scale paths" }),
      ).toBeChecked();
      const chromatic = createDefaultSnapshot().colorSystem.scales.find(
        (scale) => scale.stops.some((stop) => stop.chroma > 2),
      )!;
      const chromaticPath = root.locator(`[data-scale-path="${chromatic.id}"]`);
      await expect(chromaticPath).toBeVisible();
      const path = await chromaticPath.getAttribute("points");
      await input.fill("75");
      await input.press("Tab");
      expect(await chromaticPath.getAttribute("points")).toBe(path);
      await root.getByRole("button", { name: / Markers$/ }).click();
      await page
        .getByRole("option", { name: "All key colors", exact: true })
        .click();
      const positions = await root
        .locator("[data-marker-id]")
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            node.getAttribute("cx"),
            node.getAttribute("cy"),
          ]),
        );
      await input.fill("50");
      await input.press("Tab");
      expect(
        await root
          .locator("[data-marker-id]")
          .evaluateAll((nodes) =>
            nodes.map((node) => [
              node.getAttribute("cx"),
              node.getAttribute("cy"),
            ]),
          ),
      ).toEqual(positions);
      for (const endpoint of ["0", "100"]) {
        await input.fill(endpoint);
        await input.press("Tab");
        await expect(raster).toHaveAttribute("data-render-state", "ready");
        await expect(
          root.getByText(
            "At this lightness, the gamut collapses to a neutral point.",
          ),
        ).toBeVisible();
        expect(
          await raster.evaluate((node) => {
            const canvas = node as HTMLCanvasElement;
            return canvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height)
              .data.filter((_, index) => index % 4 === 3)
              .some((alpha) => alpha !== 0);
          }),
        ).toBe(false);
      }
      await input.fill("50");
      await input.press("Tab");
      await root.getByRole("tab", { name: "Lightness", exact: true }).click();
      await expect(
        root.getByRole("list", { name: "Grayscale output strip" }),
      ).toBeVisible();
      await expect(
        root.getByRole("img", { name: "Contrast (WCAG 2)", exact: true }),
      ).toBeVisible();
      await expect(
        root.getByRole("img", { name: "Lightness (OKLab)", exact: true }),
      ).toBeVisible();
      await root.getByRole("button", { name: / Chart line type$/ }).click();
      await page.getByRole("option", { name: "Curve", exact: true }).click();
      await root
        .getByRole("button", { name: "Show values", exact: true })
        .click();
      await expect(
        root.getByRole("table", { name: /output values$/ }),
      ).toBeVisible();
      const colors = () =>
        root
          .getByRole("table", { name: /output values$/ })
          .locator("tbody td:last-child")
          .allTextContents();
      const initialColors = await colors();
      await root.getByRole("button", { name: / Reference scale$/ }).click();
      await page.getByRole("option", { name: "Magenta", exact: true }).click();
      await expect(
        root.getByRole("table", { name: "Magenta output values", exact: true }),
      ).toBeVisible();
      await expect.poll(colors).not.toEqual(initialColors);
      const scaleColors = await colors();
      await root.getByRole("button", { name: / Surface$/ }).click();
      await page
        .getByRole("option", {
          name: createDefaultSnapshot().colorSystem.surfaces[1].name,
          exact: true,
        })
        .click();
      await expect.poll(colors).not.toEqual(scaleColors);
      await page.getByRole("radio", { name: "Elements", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Color ramps", exact: true }),
      ).toBeVisible();
      await page.getByRole("radio", { name: "Analyze", exact: true }).click();
      await expect(
        root.getByRole("tab", { name: "Lightness", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await root
        .getByRole("tab", { name: "Chromaticity", exact: true })
        .click();
      await expect(
        root.getByRole("textbox", {
          name: "Slice lightness value",
          exact: true,
        }),
      ).toHaveValue("50");
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          AUTHORING_STORAGE_KEY,
        ),
      ).toBe(before);
      await page.reload();
      const refreshed = await openAnalysis(page);
      await expect(
        refreshed.getByRole("tab", { name: "Chromaticity", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(
        refreshed.getByRole("checkbox", { name: "Show scale paths" }),
      ).not.toBeChecked();
    });
  });
}

test("output gamut, Scale Editor and Evaluation remain connected", async ({
  page,
}) => {
  await enableEditMode(page);
  const root = await openAnalysis(page);
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Output gamut/ }).click();
  await page.getByRole("option", { name: "Display P3", exact: true }).click();
  await expect(root.getByText(/OKLCh, Display P3 gamut/)).toBeVisible();
  await expect(
    root.getByLabel("OKLCh gamut slice", { exact: true }),
  ).toHaveAttribute("data-render-state", "ready");
  await page.getByRole("tab", { name: "Color scales", exact: true }).click();
  await page.getByRole("button", { name: "Silver", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Color space/ })).toBeVisible();
  await expect(
    page.getByRole("dialog").locator('canvas[aria-label="Color area"]'),
  ).toHaveAttribute("data-render-state", "ready");
  const editor = page.getByRole("dialog", {
    name: "Edit Silver scale",
    exact: true,
  });
  await editor.focus();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: / Show$/ }).click();
  await page.getByRole("option", { name: "Opaque scale", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page
      .locator(".colorEvaluationScale")
      .first()
      .getByText("Opaque (Spectrum studio)", { exact: true }),
  ).toBeVisible();
});

test.describe("Reference performance", () => {
  test.use({ deviceScaleFactor: 2 });
  test("latest slice settles on the production-sized data fixture", async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    const snapshot = createDefaultSnapshot();
    snapshot.colorSystem.scales = snapshot.colorSystem.scales.slice(0, 16);
    snapshot.colorSystem.contrasts = snapshot.colorSystem.contrasts.slice(
      0,
      16,
    );
    await page.addInitScript(
      ({ key, working }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            working,
            saved: working,
            isEditing: false,
            attachments: {},
            savedAttachments: {},
          }),
        );
      },
      { key: AUTHORING_STORAGE_KEY, working: snapshot },
    );
    const root = await openAnalysis(page);
    const raster = root.getByLabel("OKLCh gamut slice", { exact: true });
    await expect(raster).toHaveAttribute("data-render-state", "ready");
    const times: number[] = [];
    const renderTimes: number[] = [];
    for (const value of [
      "11",
      "15",
      "21",
      "26",
      "32",
      "38",
      "42",
      "47",
      "53",
      "58",
      "62",
      "67",
      "72",
      "78",
      "83",
      "88",
    ]) {
      const renderDuration = raster.evaluate(
        (node) =>
          new Promise<number>((resolve) => {
            const canvas = node as HTMLCanvasElement;
            const previous = canvas.dataset.renderKey;
            let began: number | undefined;
            const observer = new MutationObserver(() => {
              if (canvas.dataset.renderState === "updating")
                began ??= performance.now();
              if (
                canvas.dataset.renderState === "ready" &&
                canvas.dataset.renderKey !== previous
              ) {
                observer.disconnect();
                resolve(began === undefined ? 0 : performance.now() - began);
              }
            });
            observer.observe(canvas, {
              attributes: true,
              attributeFilter: ["data-render-state", "data-render-key"],
            });
          }),
      );
      const started = performance.now();
      const input = root.getByRole("textbox", {
        name: "Slice lightness value",
        exact: true,
      });
      await input.fill(value);
      await input.press("Tab");
      await expect(raster).toHaveAttribute("data-render-state", "ready");
      const latest: RasterSpec = JSON.parse(
        (await raster.getAttribute("data-render-key"))!,
      );
      expect(latest.thirdChannelValue).toBe(Number(value) / 100);
      times.push(performance.now() - started);
      renderTimes.push(await renderDuration);
    }
    const sorted = [...times].sort((a, b) => a - b);
    await info.attach("slice-performance.json", {
      contentType: "application/json",
      body: JSON.stringify(
        {
          measurements:
            "Field-edit time includes automation; render time measures updating-to-ready in the browser",
          scales: snapshot.colorSystem.scales.length,
          stops: snapshot.colorSystem.contrasts.length,
          browser: await page.evaluate(() => navigator.userAgent),
          viewport: page.viewportSize(),
          machine: {
            platform: platform(),
            arch: arch(),
            cpu: cpus()[0]?.model,
          },
          deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
          times,
          renderTimes,
          p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
          renderP95: [...renderTimes].sort((a, b) => a - b)[
            Math.ceil(renderTimes.length * 0.95) - 1
          ],
        },
        null,
        2,
      ),
    });
  });
});

test("a worker failure is visible and can be retried without losing analysis settings", async ({
  page,
}) => {
  await page.route("**/*colorCanvas.worker*", (route) => route.abort());
  const root = await openAnalysis(page);
  const raster = root.getByLabel("OKLCh gamut slice", { exact: true });
  await expect(raster).toHaveAttribute("data-render-state", "error");
  await expect(root.getByRole("alert")).toContainText(
    "Could not render colors",
  );
  await page.unroute("**/*colorCanvas.worker*");
  await root
    .getByRole("button", { name: "Retry color rendering", exact: true })
    .click();
  await expect(raster).toHaveAttribute("data-render-state", "ready");
  await expect(
    root.getByRole("textbox", { name: "Slice lightness value", exact: true }),
  ).toHaveValue("50");
});

test("the shared renderer preserves the existing single-formula graph", async ({
  page,
}) => {
  await openAnalysis(page);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic", exact: true })
    .click();
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await page
    .getByRole("button", { name: "View formula Spacing", exact: true })
    .click();
  const graph = page.getByRole("img", {
    name: "Spacing values by index",
    exact: true,
  });
  await expect(graph).toBeVisible();
  await expect(graph.locator("polyline")).toHaveAttribute("points", /\d/);
  await expect
    .poll(() =>
      graph.evaluate((node) => {
        const svg = node as SVGSVGElement;
        const matrix = svg.getScreenCTM()!;
        return Math.abs(Math.hypot(matrix.a, matrix.b) - 1);
      }),
    )
    .toBeLessThan(0.001);
});

test("the shared renderer remains compatible with Elevation comparisons", async ({
  page,
}) => {
  await openAnalysis(page);
  await page.getByRole("tab", { name: "Elevation", exact: true }).click();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  const graph = page.getByRole("img", {
    name: "Elevation comparison",
    exact: true,
  });
  await expect(graph).toBeVisible();
  await expect(graph.locator("polyline").first()).toHaveAttribute(
    "points",
    /\d/,
  );
});
