// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  reportMarkdown,
  type AnalysisInput,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";

const fixture = (): AnalysisInput => ({
  source: {
    kind: "reference",
    root: "coverage fixture",
    hash: "1".repeat(64),
    revision: "coverage-fixture",
    dirty: false,
    version: "fixture",
    validator: "Fixture transport; not upstream conformance",
  },
  records: [
    {
      id: "color",
      category: "tokens",
      name: "Red color",
      source: "tokens/color-palette.tokens.json",
      pointer: "/0",
      classification: "authored",
      conceptId: "red-concept",
      value: "#010203",
      structuredName: {
        property: "color",
        colorFamily: "red",
        scaleIndex: 100,
      },
      context: { colorScheme: "light", contrast: "regular" },
    },
    {
      id: "semantic",
      category: "tokens",
      name: "Accent color",
      source: "tokens/semantic.json",
      pointer: "/0",
      classification: "authored",
      conceptId: "accent",
      reference: "color",
      structuredName: { property: "color", colorRole: "accent" },
    },
    {
      id: "radius",
      category: "tokens",
      name: "Corner radius",
      source: "tokens/radius.json",
      pointer: "/0",
      classification: "authored",
      conceptId: "radius",
      value: "8px",
      structuredName: { property: "corner-radius" },
    },
    {
      id: "unknown",
      category: "tokens",
      name: "Opaque fixture",
      source: "tokens/unknown.json",
      pointer: "/0",
      classification: "authored",
      conceptId: "unknown",
      value: 8,
      structuredName: { property: "opaque" },
    },
    {
      id: "button",
      category: "components",
      name: "Button",
      source: "components/button.json",
      pointer: "",
      classification: "authored",
      value: { name: "Button" },
    },
    {
      id: "link",
      category: "components",
      name: "Link",
      source: "components/link.json",
      pointer: "",
      classification: "authored",
      value: { name: "Link" },
    },
  ],
  categories: ["tokens", "components"],
  schemas: ["token.schema.json", "component.schema.json"],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
});
test("Coverage is the human-readable default with percentages, counts, side-by-side differences and honest schema limits", async ({
  page,
}) => {
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
  const overview = page.getByRole("region", { name: "Data coverage overview" });
  await expect(overview).toContainText("25% confirmed");
  await expect(overview).toContainText("not matched yet—not confirmed missing");
  await expect(
    overview.getByRole("button", { name: "Explore components", exact: true }),
  ).toBeVisible();
  await expect(
    overview.getByRole("button", {
      name: "Explore all color tokens",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Components coverage", exact: true }),
  ).toContainText("0 in app · 2 in design-data");
  await expect(
    page.getByRole("region", { name: "Components coverage", exact: true }),
  ).toContainText("No app records");
  await expect(
    page.getByRole("progressbar", {
      name: "Components confirmed coverage",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("region", { name: "Components coverage", exact: true }),
  ).toContainText("2 missing app data · 0 not matched yet");
  await expect(page.getByTestId("analysis-provenance")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Compare components", exact: true })
    .click();
  const table = page.getByRole("grid", {
    name: "Side-by-side data comparison",
  });
  await expect(table).toContainText("Button");
  await expect(table).toContainText("No app data of this kind");
  await expect(
    page.getByRole("region", { name: "Coverage comparison" }),
  ).toContainText("keep the difference intentionally");
  await page
    .getByRole("button", { name: "Compare all tokens", exact: true })
    .click();
  await expect(table).toContainText("Confirmed counterparts");
  await expect(table).toContainText("Different value or format");
  await expect(table).toContainText("Opaque fixture");
  await expect(table).toContainText("Not matched yet");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const report: AnalysisReport = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(report.coverage?.allTokens.counts.concepts.percent).toBe(25);
  const markdown = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  expect(await readFile((await (await markdown).path())!, "utf8")).toBe(
    reportMarkdown(report),
  );
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Schema and model gaps", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Schema and model gaps" }),
  ).toContainText("Schema compatibility percentage: not assessed");
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Coverage overview", exact: true })
    .click();
  await page.setViewportSize({ width: 480, height: 900 });
  const width = await page
    .locator('[data-component="Analysis"]')
    .evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  expect(errors).toEqual([]);
});
test("Partial and stale coverage stay labeled and missing input never invents percentages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let unavailable = false;
  await page.route("**/__design-data/reference", (route) =>
    unavailable
      ? route.fulfill({ status: 503 })
      : route.fulfill({
          json: {
            ...fixture(),
            inventoryStatus: "partial",
            errors: ["Partial fixture input"],
          },
        }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Data coverage overview" }),
  ).toContainText("Partial inventory");
  unavailable = true;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Data coverage overview" }),
  ).toContainText("last-good comparison results");
  expect(errors).toEqual([]);
});

test("A missing reference checkout shows a connection problem instead of zero-percent charts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const missing = {
    ...fixture(),
    source: {
      ...fixture().source,
      root: "/missing/reference-checkout",
      hash: "unavailable",
    },
    records: [],
    categories: [],
    schemas: [],
    inventoryStatus: "unavailable",
    errors: ["Reference checkout was not found"],
    architecture: {
      schemaVersion: 1,
      registryVersion: "empty-reference-fixture",
      planes: [
        { id: "current-state", description: "fixture" },
        { id: "target-contract", description: "fixture" },
        { id: "generated-output", description: "fixture" },
      ],
      profiles: [],
      evidence: [],
      requirements: [],
      findings: [],
      requiredInputFailures: [],
      outputComparison: {
        findingsPointer: "#/findings",
        metricsPointer: "#/metrics",
        interpretation: "fixture",
      },
      limitations: [],
    },
  };
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ json: missing }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Reference connection unavailable" }),
  ).toContainText("not 0% coverage");
  await expect(
    page.getByRole("region", { name: "Reference connection unavailable" }),
  ).toContainText("/missing/reference-checkout");
  await expect(
    page.getByRole("region", { name: "Data coverage overview" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Alignment gap register", exact: true })
    .click();
  const gaps = page.getByRole("region", {
    name: "Alignment gap register",
    exact: true,
  });
  await expect(gaps).toContainText("LTAX-001");
  await expect(gaps).toContainText("unassessable");
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Detailed comparison", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Generated foundation artifacts",
      exact: true,
    }),
  ).toContainText(
    "Artifacts stay in memory. Reload returns to shipped JSON defaults.",
  );
  expect(errors).toEqual([]);
});
