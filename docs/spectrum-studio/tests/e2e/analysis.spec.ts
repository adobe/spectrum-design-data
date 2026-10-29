// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type {
  AnalysisInput,
  AnalysisReport,
} from "../../src/features/design-data/comparison";
import { reportMarkdown } from "../../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../../src/features/design-data/projection";

const fixture = (revision = "fixture-1"): AnalysisInput => ({
  source: {
    kind: "reference",
    root: "fixture",
    hash: "0".repeat(64),
    revision,
    dirty: false,
    version: "fixture",
    validator: "fixture transport; not SDK conformance",
  },
  records: [
    {
      id: "fixture-row",
      category: "tokens",
      name: "Fixture layout token",
      source: "tokens/layout-component.tokens.json",
      pointer: "/0",
      classification: "authored",
      value: 12,
      unit: "px",
    },
  ],
  categories: ["tokens"],
  schemas: ["fixture.schema.json"],
  errors: [],
  limitations: ["Browser fixture; real SDK validation is checked separately."],
});

async function downloadJson(page: Page): Promise<AnalysisReport> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await event;
  return JSON.parse(await readFile((await download.path())!, "utf8"));
}

for (const foundation of [
  { type: "Typography", token: "font-size-100" },
  { type: "Spacing", token: "spacing-global-100" },
  { type: "Size", token: "size-global-100" },
]) {
  test(`Analysis projects effective ${foundation.type.toLowerCase()} token edits through Save and Cancel`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__design-data/reference", (route) =>
      route.fulfill({ json: fixture() }),
    );
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Analysis", exact: true })
      .click();
    await showAnalysisDetails(page);
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "defaults",
    );
    const defaults = await downloadJson(page);
    const originalRows = defaults.findings.flatMap((finding) =>
      finding.app?.category === "tokens" &&
      finding.app.name === foundation.token
        ? [finding.app]
        : [],
    );
    expect(originalRows).toHaveLength(12);
    const name = `analysis-${foundation.type.toLowerCase()}-override`;
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editToken = async (
      tokenName: string,
      value: string,
      nextName?: string,
    ) => {
      await page
        .getByRole("navigation", { name: "Navigation", exact: true })
        .getByRole("link", { name: "Tokens", exact: true })
        .click();
      await page
        .getByRole("radio", { name: foundation.type, exact: true })
        .click();
      await page
        .getByRole("button", { name: `Open ${tokenName}`, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      if (nextName)
        await dialog
          .getByRole("textbox", { name: "Name", exact: true })
          .fill(nextName);
      await dialog
        .getByRole("textbox", { name: "Value", exact: true })
        .fill(value);
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(
        page.getByRole("row", { name: nextName ?? tokenName, exact: true }),
      ).toContainText(`${value}px`);
      await page
        .getByRole("navigation", { name: "Navigation", exact: true })
        .getByRole("link", { name: "Analysis", exact: true })
        .click();
      await showAnalysisDetails(page);
    };
    await editToken(foundation.token, "777", name);
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      defaults.inputs.app.hash,
    );
    await page.getByRole("button", { name: /Comparison source/ }).click();
    await page
      .getByRole("option", { name: "Working authoring", exact: true })
      .click();
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "working",
    );
    await page.getByRole("searchbox", { name: "Search findings" }).fill(name);
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText(name);
    const working = await downloadJson(page);
    const ids = new Set(originalRows.map((row) => row.id));
    const editedRows = working.findings.flatMap((finding) =>
      finding.app && ids.has(finding.app.id) ? [finding.app] : [],
    );
    expect(editedRows).toHaveLength(12);
    expect(editedRows.every((row) => row.name === name)).toBe(true);
    expect(editedRows.filter((row) => row.value === 777)).toHaveLength(1);
    expect(
      editedRows.every(
        (row) => row.overrides?.generatedName === foundation.token,
      ),
    ).toBe(true);
    expect(
      editedRows.filter((row) => row.overrides?.generatedValue !== undefined),
    ).toHaveLength(1);
    expect(working.materialization?.inputs.app.counts.explicitAssignments).toBe(
      1,
    );
    expect(
      working.materialization?.inputs.app.observations.filter(
        (row) =>
          ids.has(row.recordId) &&
          row.lineage === "generated-baseline-and-edit",
      ),
    ).toHaveLength(1);
    expect(
      defaults.materialization?.inputs.app.counts.explicitAssignments,
    ).toBe(0);
    await page.getByRole("button", { name: /Comparison source/ }).click();
    await page
      .getByRole("option", { name: "Saved authoring", exact: true })
      .click();
    await expect(
      page.getByText("No matching findings", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText(name);
    const saved = await downloadJson(page);
    expect(saved.inputs.app.hash).toBe(working.inputs.app.hash);
    expect(saved.materialization).toEqual(working.materialization);
    await editToken(name, "888");
    await page.getByRole("button", { name: /Comparison source/ }).click();
    await page
      .getByRole("option", { name: "Working authoring", exact: true })
      .click();
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "working",
    );
    expect(
      (await downloadJson(page)).findings.some(
        (finding) =>
          finding.app && ids.has(finding.app.id) && finding.app.value === 888,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await expect(
      page.getByText("Unsaved changes", { exact: true }),
    ).toHaveCount(0);
    expect((await downloadJson(page)).inputs.app.hash).toBe(
      saved.inputs.app.hash,
    );
    expect((await downloadJson(page)).materialization).toEqual(
      saved.materialization,
    );
    await page.getByRole("button", { name: /Comparison source/ }).click();
    await page
      .getByRole("option", { name: "Shipped defaults", exact: true })
      .click();
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      defaults.inputs.app.hash,
    );
    expect((await downloadJson(page)).findings).toEqual(defaults.findings);
    expect(errors).toEqual([]);
  });
}

test("Analysis filters extension and confirmed-pair field/type diagnostics without inflating matches", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const token = defaultsAnalysisInput().records.find(
    (record) =>
      record.structuredName?.property === "color" &&
      record.structuredName.colorName,
  );
  expect(token).toBeDefined();
  const structuredName = { ...token!.structuredName, contrastValue: 100 };
  delete structuredName.colorName;
  const reference = fixture();
  reference.records = [
    {
      ...token!,
      id: "confirmed-fixture",
      classification: "authored",
      source: "tokens/confirmed-fixture.json",
      structuredName,
    },
  ];
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ json: reference }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "defaults",
    { timeout: 30_000 },
  );
  for (const name of ["extension", "field gap", "type gap"]) {
    await page.getByRole("button", { name: /Finding type/ }).click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(
      page
        .getByRole("grid", { name: "Analysis findings" })
        .getByRole("row")
        .nth(1),
    ).toContainText(name);
  }
  await page
    .getByRole("button", { name: "Evidence", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toContainText("different representation types");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const downloaded = await event;
  const report = JSON.parse(await readFile((await downloaded.path())!, "utf8"));
  expect(
    report.metrics.find(
      (metric: { category: string }) => metric.category === "tokens",
    ).matched,
  ).toBe(1);
  expect(
    report.findings.some(
      (finding: { classification: string }) =>
        finding.classification === "field-gap",
    ),
  ).toBe(true);
  expect(
    report.findings.some(
      (finding: { classification: string }) =>
        finding.classification === "type-gap",
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Analysis filters evidence and downloads a defaults report without runtime errors", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (!process.env.DESIGN_DATA_PATH)
    await page.route("**/__design-data/reference", (route) =>
      route.fulfill({ json: fixture() }),
    );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(
    page.getByRole("heading", { name: "Analysis", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "defaults",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("grid", { name: "Analysis findings" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search findings" })
    .fill("layout-component");
  await expect(page.getByRole("row").nth(1)).toContainText(
    process.env.DESIGN_DATA_PATH ? "layout-component" : "Fixture layout token",
  );
  await page
    .getByRole("button", { name: "Evidence", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await downloadEvent;
  const report = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(report.inputs.app.kind).toBe("defaults");
  expect(report.inputs.reference.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(report.mappingVersion).toBe("foundation-color-ramp-v1");
  if (process.env.DESIGN_DATA_PATH) {
    expect(
      report.metrics.find(
        (metric: { category: string }) => metric.category === "tokens",
      ).matched,
    ).toBeGreaterThan(0);
  }
  const markdownEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  const markdownDownload = await markdownEvent;
  const markdown = await readFile((await markdownDownload.path())!, "utf8");
  expect(markdown).toBe(reportMarkdown(report));
  expect(markdown).toContain(report.inputs.app.hash);
  expect(markdown).toContain(report.inputs.reference.hash);
  expect(markdown).toContain(report.mappingVersion);
  expect(markdown).toContain(report.inputs.reference.validator);
  await page.screenshot({
    path: test.info().outputPath("analysis-desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Analysis separates defaults, saved, and working state through editing and refresh", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let current = fixture();
  let unavailable = false;
  await page.route("**/__design-data/reference", (route) =>
    unavailable
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({ json: current }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "fixture-1",
  );
  const original = await page.getByTestId("analysis-provenance").textContent();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic", exact: true })
    .click();
  await page.getByRole("button", { name: "Add rule", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Analysis unsaved fixture");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByTestId("analysis-provenance")).toHaveText(original!);
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Working authoring", exact: true })
    .click();
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "working",
  );
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search findings" })
    .fill("Analysis unsaved fixture");
  await expect(page.getByRole("row").nth(1)).toContainText(
    "Analysis unsaved fixture",
  );
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Saved authoring", exact: true })
    .click();
  await expect(page.getByTestId("analysis-provenance")).toContainText("saved");
  await expect(
    page.getByText("No matching findings", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("row").nth(1)).toContainText(
    "Analysis unsaved fixture",
  );
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic", exact: true })
    .click();
  await page.getByRole("button", { name: "Add rule", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Analysis cancelled fixture");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByTestId("analysis-provenance")).toHaveText(original!);
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Working authoring", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search findings" })
    .fill("Analysis cancelled fixture");
  await expect(page.getByRole("row").nth(1)).toContainText(
    "Analysis cancelled fixture",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(
    page.getByText("No matching findings", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Saved authoring", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Search findings" }).fill("");
  current = fixture("fixture-2");
  const probe = fileURLToPath(
    new URL(
      `../../src/features/design-data/.analysis-watch-${process.pid}.json`,
      import.meta.url,
    ),
  );
  try {
    await writeFile(probe, JSON.stringify({ revision: "fixture-2" }));
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "fixture-2",
      { timeout: 15_000 },
    );
  } finally {
    await rm(probe, { force: true });
  }
  unavailable = true;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reference request failed",
  );
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const downloaded = await event;
  const report = JSON.parse(await readFile((await downloaded.path())!, "utf8"));
  expect(report.freshness).toBe("stale");
  expect(report.inputs.app.kind).toBe("saved");
  await page.setViewportSize({ width: 480, height: 900 });
  const dimensions = await page
    .locator('[data-component="Analysis"]')
    .evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await page.screenshot({
    path: test.info().outputPath("analysis-populated-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Analysis exposes missing-reference state and mobile layout without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 480, height: 900 });
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ status: 503, body: "Missing reference checkout" }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByRole("status")).toContainText(
    "Reference request failed",
  );
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeDisabled();
  const width = await page
    .locator('[data-component="Analysis"]')
    .evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await page.screenshot({
    path: test.info().outputPath("analysis-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
