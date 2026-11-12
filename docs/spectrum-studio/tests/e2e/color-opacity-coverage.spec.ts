// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultsAnalysisInput } from "../../src/features/design-data/projection";
import { declaredDefaultMode } from "../../src/features/design-data/mappings";
import { resolveColorOpacityValues } from "../../scripts/color-opacity-resolution";
import {
  reportMarkdown,
  type AnalysisInput,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";

test("Color/opacity table expands modes, preserves parent results and exports shared evidence", async ({
  page,
}) => {
  const app = defaultsAnalysisInput();
  const gray = (index: number, scheme: string) => {
    const row = app.records.find(
      (row) =>
        row.structuredName?.property === "color" &&
        row.structuredName.colorFamily === "gray" &&
        row.structuredName.scaleIndex === index &&
        (row.context?.colorScheme ??
          declaredDefaultMode(app, "colorScheme")) === scheme &&
        (row.context?.contrast ?? declaredDefaultMode(app, "contrast")) ===
          "regular",
    );
    if (!row)
      throw new Error(`Fixture requires generated gray-${index} ${scheme}.`);
    return row;
  };
  const opacity = app.records.find(
    (row) => row.structuredName?.property === "opacity",
  );
  if (!opacity) throw new Error("Fixture requires generated opacity.");
  const dark = gray(100, "dark");
  const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(String(dark.value));
  if (!channels) throw new Error("Fixture requires canonical 8-bit RGB.");
  const adjacent = `rgb(${Number(channels[1]) + 3}, ${Number(channels[2]) + 3}, ${Number(channels[3]) + 3})`;
  const referenceName = (row: typeof dark, scheme: string) => ({
    ...Object.fromEntries(
      Object.entries(row.structuredName ?? {}).filter(
        ([key]) => key !== "contrast",
      ),
    ),
    colorScheme: scheme,
  });
  const reference: AnalysisInput = {
    ...app,
    outputMetadata: undefined,
    architecture: undefined,
    source: { ...app.source, kind: "reference", hash: "c".repeat(64) },
    records: [
      ...app.records
        .filter(
          (row) =>
            row.category === "registry" ||
            (row.category === "mode-sets" &&
              ["colorScheme", "contrast"].includes(
                String((row.value as Record<string, unknown>).key),
              )),
        )
        .map((row) => {
          const declaration = row.value as Record<string, unknown>;
          return row.category === "mode-sets" &&
            declaration.key === "colorScheme"
            ? {
                ...row,
                value: {
                  ...declaration,
                  modes: [...(declaration.modes as unknown[]), "wireframe"],
                },
              }
            : row;
        }),
      {
        ...gray(100, "light"),
        id: "gray-light",
        identity: "gray-light",
        conceptId: "gray-100",
        structuredName: referenceName(gray(100, "light"), "light"),
        context: { colorScheme: "light" },
      },
      {
        ...dark,
        id: "gray-dark",
        identity: "gray-dark",
        conceptId: "gray-100",
        value: adjacent,
        structuredName: referenceName(dark, "dark"),
        context: { colorScheme: "dark" },
      },
      {
        ...gray(200, "light"),
        id: "gray-fail",
        identity: "gray-fail",
        conceptId: "gray-200",
        value: "rgb(255, 0, 0)",
        structuredName: referenceName(gray(200, "light"), "light"),
        context: { colorScheme: "light" },
      },
      {
        ...opacity,
        id: "opacity-pass",
        identity: "opacity-pass",
        conceptId: "opacity",
        value: String(opacity.value),
      },
      {
        id: "reference-only-alias",
        identity: "reference-only-alias",
        conceptId: "reference-only-alias",
        name: "Reference-only alias",
        category: "tokens",
        classification: "authored",
        source: "tokens/semantic.json",
        pointer: "/0",
        structuredName: { property: "color", colorRole: "coverage-fixture" },
        reference: "gray-100",
        context: {},
      },
    ],
  };
  const resolvedReference = await resolveColorOpacityValues(
    reference,
    fileURLToPath(new URL("../../../../", import.meta.url)),
  );
  expect(resolvedReference.valueResolution?.error).toBeUndefined();
  const errors: string[] = [];
  const nativeResolutionRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/__design-data/resolve-values"))
      nativeResolutionRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ json: resolvedReference }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /Migration analysis/ })
    .click();
  await page
    .getByRole("button", { name: "Compare colors and opacities", exact: true })
    .click();
  const table = page.getByRole("treegrid", {
    name: "Color and opacity mode values",
  });
  await expect(table).toBeVisible();
  expect(nativeResolutionRequests).toEqual([]);
  await expect(table).toContainText("App value");
  await expect(table).toContainText("Design data value");
  await page
    .getByRole("grid", { name: "Required mode support" })
    .scrollIntoViewIfNeeded();
  await expect(
    page
      .getByRole("grid", { name: "Required mode support" })
      .getByRole("row")
      .filter({ hasText: "Wireframe" }),
  ).toContainText("Fail");
  const grayParent = table
    .getByRole("row")
    .filter({ hasText: "gray-100" })
    .first();
  await table.scrollIntoViewIfNeeded();
  await expect(grayParent).toBeVisible();
  await grayParent.click();
  await grayParent.press("ArrowRight");
  await expect(
    table.getByRole("row").filter({ hasText: /Color scheme: Dark/ }),
  ).toContainText("Acceptable");
  await expect(
    table.getByRole("row").filter({ hasText: /Color scheme: Light/ }),
  ).toContainText("Pass");
  await expect(
    table.getByRole("row").filter({ hasText: /Color scheme:/ }),
  ).toHaveCount(2);
  await expect(grayParent).toContainText("Acceptable");
  const darkComparison = table
    .getByRole("row")
    .filter({ hasText: /Color scheme: Dark/ })
    .getByRole("img", { name: "App value beside design data value" });
  await darkComparison.scrollIntoViewIfNeeded();
  await expect(darkComparison).toBeVisible();
  const halves = await darkComparison.evaluate((element) => {
    const [app, reference] = [...element.children].map((child) => {
      const style = getComputedStyle(child);
      const box = child.getBoundingClientRect();
      return {
        color: style.backgroundColor,
        border: style.borderWidth,
        left: box.left,
        right: box.right,
      };
    });
    return { app, reference, gap: getComputedStyle(element).columnGap };
  });
  expect(halves.app.right).toBe(halves.reference.left);
  expect(halves.app.border).toBe("0px");
  expect(halves.reference.border).toBe("0px");
  expect(["0px", "normal"]).toContain(halves.gap);
  expect(halves.app.color).not.toBe(halves.reference.color);
  await expect(table).not.toContainText("Contrast: High");
  const enhancements = page.getByRole("grid", { name: "App enhancements" });
  await enhancements.scrollIntoViewIfNeeded();
  await expect(enhancements).toContainText("Enhancement");
  await expect(enhancements).toContainText("Contrast: High");
  await expect(enhancements).not.toContainText("Fail");
  const modeSummary = page.getByRole("grid", {
    name: "Mode value results",
    exact: true,
  });
  await modeSummary.scrollIntoViewIfNeeded();
  await expect(modeSummary).toContainText("Color scheme: Light");
  await expect(modeSummary).toContainText("Color scheme: Dark");
  await expect(modeSummary).not.toContainText("Contrast: High");
  await page
    .getByRole("button", {
      name: "View Color scheme: Dark results",
      exact: true,
    })
    .click();
  await table.scrollIntoViewIfNeeded();
  await expect(table).toContainText("Color scheme: Dark");
  await expect(table).not.toContainText("Color scheme: Light");
  await expect(grayParent).toContainText("Acceptable");
  const comparison = page.getByRole("region", {
    name: "Color and opacity comparison",
    exact: true,
  });
  await comparison.getByRole("button", { name: /Mode value result/ }).click();
  await page.getByRole("option", { name: "Acceptable", exact: true }).click();
  await table.scrollIntoViewIfNeeded();
  await expect(
    table.getByRole("row").filter({ hasText: /Color scheme: Dark/ }),
  ).toHaveCount(1);
  await expect(table).not.toContainText("gray-200");
  await modeSummary.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", {
      name: "View Color scheme: Light results",
      exact: true,
    })
    .click();
  await table.scrollIntoViewIfNeeded();
  await expect(table).toContainText("Color scheme: Light");
  await expect(table).not.toContainText("Color scheme: Dark");
  await comparison.getByRole("button", { name: /Mode value result/ }).click();
  await page.getByRole("option", { name: "Pass", exact: true }).click();
  await table.scrollIntoViewIfNeeded();
  await expect(grayParent).toContainText("Acceptable");
  await expect(
    table.getByRole("row").filter({ hasText: /Color scheme: Light/ }),
  ).toContainText(["Pass", "Pass"]);
  await expect(table).not.toContainText("gray-200");
  await comparison.getByRole("button", { name: /Mode value result/ }).click();
  await page.getByRole("option", { name: "Fail", exact: true }).click();
  await table.scrollIntoViewIfNeeded();
  await expect(
    table.getByRole("row").filter({ hasText: "gray-200" }),
  ).toContainText("Fail");
  await expect(table).not.toContainText("gray-100");
  await comparison.getByRole("button", { name: /Color scheme$/ }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await table.scrollIntoViewIfNeeded();
  await expect(table).toContainText("No matching tokens.");
  await modeSummary.scrollIntoViewIfNeeded();
  await expect(modeSummary).toContainText("Color scheme: Dark");
  await comparison
    .getByRole("button", { name: "Clear mode filters", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "Search colors and opacities",
  });
  await search.fill("gray-200");
  await expect(
    table.getByRole("row").filter({ hasText: "gray-200" }),
  ).toContainText("Fail");
  await search.fill("absent");
  await expect(table).toContainText("No matching tokens.");
  await search.fill("");
  await modeSummary.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", {
      name: "View Color scheme: Dark results",
      exact: true,
    })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const report: AnalysisReport = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(report.colorOpacity?.counts.concepts).toBe(4);
  expect(report.modeCoverage?.counts.missingModes).toBe(1);
  expect(report.modeCoverage?.counts.enhancementSets).toBeGreaterThan(0);
  expect(report.colorOpacity?.schemaVersion).toBe(3);
  expect(
    report.colorOpacity?.modeBreakdown.find(
      (row) => row.axis === "colorScheme" && row.mode === "dark",
    )?.counts.acceptable,
  ).toBe(1);
  expect(
    report.colorOpacity?.modeBreakdown.find(
      (row) => row.axis === "colorScheme" && row.mode === "light",
    )?.counts.fail,
  ).toBe(1);
  expect(
    report.colorOpacity?.modeBreakdown.some(
      (row) => row.axis === "contrast" && row.mode === "high",
    ),
  ).toBe(false);
  expect(report.colorOpacity?.colorPolicy).toEqual({
    deltaEMethod: "2000",
    acceptableDeltaEExclusive: 2,
    alphaTolerance: 0,
  });
  const comparedGray = report.colorOpacity?.concepts.find(
    (concept) => concept.id === "gray-100",
  );
  expect(
    comparedGray?.rows.find((row) => row.context.colorScheme === "dark")
      ?.deltaE2000,
  ).toBeLessThan(2);
  expect(
    report.colorOpacity?.enhancements.some(
      (row) => row.context.contrast === "high",
    ),
  ).toBe(true);
  expect(
    report.colorOpacity?.concepts.find((concept) => concept.id === "gray-100")
      ?.verdict,
  ).toBe("acceptable");
  expect(
    report.colorOpacity?.concepts
      .find((concept) => concept.id === "reference-only-alias")
      ?.rows.every((row) => typeof row.referenceValue === "string"),
  ).toBe(true);
  const markdown = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  expect(await readFile((await (await markdown).path())!, "utf8")).toBe(
    reportMarkdown(report),
  );
  await page.setViewportSize({ width: 480, height: 900 });
  await expect(table).toBeVisible();
  await expect(enhancements).toBeVisible();
  await expect(modeSummary).toBeVisible();
  const width = await page
    .locator('[data-component="Analysis"]')
    .evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.unroute("**/__design-data/reference");
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ status: 503, body: "Reference is unavailable." }),
  );
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(
    page.getByText("Last-good results", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Color and opacity comparison",
      exact: true,
    }),
  ).toContainText("Pass: 0. Acceptable: 0. Fail: 0. Unable to evaluate: 4.");
  await enhancements.scrollIntoViewIfNeeded();
  await expect(enhancements).toContainText("No confirmed enhancements.");
  await modeSummary.scrollIntoViewIfNeeded();
  await expect(
    modeSummary.getByRole("row").filter({ hasText: "Color scheme: Light" }),
  ).toContainText("Unavailable");
  expect(errors).toEqual([]);
});
