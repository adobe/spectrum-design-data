// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { referenceRecords } from "../../scripts/design-data-loader";
import { defaultsAnalysisInput } from "../../src/features/design-data/projection";
import {
  compareDesignData,
  type AnalysisInput,
  type AnalysisRecord,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";
import { concreteColor } from "../../src/features/color-system/data-vis/colors";

test("Palette shows classifications, exact mode values, other modes and report parity", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const app = defaultsAnalysisInput();
  const records: AnalysisRecord[] = [];
  const root = new URL("../../../../", import.meta.url);
  for (const source of [
    "tokens/color-palette.tokens.json",
    "registry/color-families.json",
    "mode-sets/color-scheme.json",
    "mode-sets/contrast.json",
  ]) {
    records.push(
      ...referenceRecords(
        source,
        JSON.parse(
          await readFile(
            new URL(`packages/design-data/${source}`, root),
            "utf8",
          ),
        ),
      ),
    );
  }
  const reference: AnalysisInput = {
    source: {
      kind: "reference",
      hash: "palette-fixture",
      revision: "a".repeat(40),
      dirty: false,
      root: "Canonical fixture",
      version: "fixture",
      validator: "Adapter fixture, not SDK conformance",
    },
    records,
    categories: ["tokens", "registry", "mode-sets"],
    schemas: [],
    errors: [],
    limitations: [],
    inventoryStatus: "complete",
  };
  const expected = compareDesignData(app, reference).palette!;
  let unavailable = false;
  await page.route("**/__design-data/reference", (route) =>
    unavailable
      ? route.fulfill({ status: 503, body: "Fixture transport unavailable" })
      : route.fulfill({ json: reference }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Analysis\b/ })
    .click();
  const region = page.getByRole("region", {
    name: "Primitive palette comparison",
    exact: true,
  });

  test("Palette distinguishes exact, one-channel-step and larger differences", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const app = defaultsAnalysisInput();
    const root = new URL("../../../../", import.meta.url);
    const declarations: AnalysisRecord[] = [];
    for (const source of [
      "registry/color-families.json",
      "mode-sets/color-scheme.json",
      "mode-sets/contrast.json",
    ]) {
      declarations.push(
        ...referenceRecords(
          source,
          JSON.parse(
            await readFile(
              new URL(`packages/design-data/${source}`, root),
              "utf8",
            ),
          ),
        ),
      );
    }
    const records = app.records
      .filter(
        (row) =>
          row.category === "tokens" &&
          row.structuredName?.colorFamily === "gray" &&
          [100, 200, 300].includes(Number(row.structuredName.scaleIndex)) &&
          row.context?.contrast === "regular",
      )
      .map((row): AnalysisRecord => {
        const index = Number(row.structuredName!.scaleIndex);
        const delta = index === 100 ? 0 : index === 200 ? 1 : 2;
        const channels = concreteColor(String(row.value))
          .to("srgb")
          .coords.map((channel) => {
            if (channel === null)
              throw new Error("Fixture requires concrete RGB channels.");
            const code = Math.round(channel * 255);
            return code + (code < 128 ? delta : -delta);
          });
        return {
          ...structuredClone(row),
          id: `reference:${row.id}`,
          identity: `reference:${row.identity}`,
          conceptId: `reference:${row.conceptId}`,
          source: "tokens/color-palette.tokens.json",
          value: `rgb(${channels.join(", ")})`,
        };
      });
    expect(records).toHaveLength(6);
    const reference: AnalysisInput = {
      source: {
        kind: "reference",
        hash: "tier-fixture",
        revision: "a".repeat(40),
        dirty: false,
        root: "Tier fixture",
        version: "fixture",
        validator: "Fixture only",
      },
      records: [...declarations, ...records],
      categories: ["tokens", "registry", "mode-sets"],
      schemas: [],
      errors: [],
      limitations: [],
      inventoryStatus: "complete",
    };
    await page.route("**/__design-data/reference", (route) =>
      route.fulfill({ json: reference }),
    );
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: /^Analysis\b/ })
      .click();
    const region = page.getByRole("region", {
      name: "Primitive palette comparison",
      exact: true,
    });
    await expect(region).toContainText(
      "100% aligned: 1. Close enough: 1. Not aligned: 1.",
    );
    await region
      .getByRole("button", { name: "Compare primitive palette", exact: true })
      .click();
    await expect(
      region.getByRole("button", { name: /^gray-100:/ }),
    ).toContainText("100% aligned");
    const close = region.getByRole("button", { name: /^gray-200:/ });
    await expect(close).toContainText("Close enough");
    await expect(
      region.getByRole("button", { name: /^gray-300:/ }),
    ).toContainText("Not aligned");
    await close.click();
    const values = region.locator('section[aria-label="gray-200 mode values"]');
    await expect(values).toContainText(
      "Close enough. Each RGB channel differs by at most 1; opacity matches.",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const path = await (await download).path();
    const report = JSON.parse(await readFile(path!, "utf8")) as AnalysisReport;
    expect(report.palette!.counts.closeEnough).toBe(1);
    expect(report.palette!.counts.complete).toBe(1);
    expect(errors).toEqual([]);
  });
  await expect(region).toContainText(
    `${expected.counts.represented} of ${expected.counts.concepts} concepts represented.`,
    { timeout: 20_000 },
  );
  await region
    .getByRole("button", { name: "Compare primitive palette", exact: true })
    .click();
  const gray = region.getByRole("button", { name: /^gray-100:/ });
  await expect(gray).toContainText("Not aligned");
  await expect(gray).toContainText("Light: Close enough");
  await expect(gray).toContainText("Dark: Not aligned");
  await gray.click();
  const classificationSection = region.locator(
    'section[aria-label="gray-100 classification differences"]',
  );
  await expect(classificationSection).not.toContainText("App:Gray");
  await expect(classificationSection).toContainText(
    "Classification comparison needs review.",
  );
  await expect(
    classificationSection.getByLabel("changed to", { exact: true }),
  ).toHaveCount(0);
  await expect(
    classificationSection.getByRole("link", { name: "Review Registry" }),
  ).toHaveCount(0);
  await expect(region).not.toContainText('{"colorName"');
  const values = region.locator('section[aria-label="gray-100 mode values"]');
  await expect(values).toContainText("Light / Regular");
  await expect(values).toContainText("Dark / Regular");
  await expect(values).toContainText("Wireframe / Regular");
  await expect(values).toContainText(
    "No app counterpart. Add support for this mode.",
  );
  const grayAssessment = expected.concepts.find(
    (concept) => concept.label === "gray-100",
  )!;
  for (const mode of ["light", "dark"]) {
    const result = grayAssessment.rows.find(
      (row) => row.context.colorScheme === mode,
    )!;
    const valueRow = values.locator(".changeFieldRow").filter({
      hasText: mode === "light" ? "Light / Regular" : "Dark / Regular",
    });
    await expect(valueRow).toContainText(`App:${result.app!.value}`);
    await expect(valueRow).toContainText(
      `Design-data:${result.reference.value}`,
    );
  }
  await expect(values.locator(".changeFieldBefore .valuePreview")).toHaveCount(
    2,
  );
  await expect(region.getByRole("button", { name: /^Reset / })).toHaveCount(0);
  await expect(
    region
      .getByText("Counterpart evidence: studio-palette-label-v1", {
        exact: false,
      })
      .first(),
  ).not.toBeVisible();
  await region
    .getByRole("button", { name: "Technical evidence", exact: true })
    .click();
  await expect(region).toContainText(
    "Counterpart evidence: studio-palette-label-v1",
  );
  await expect(region).toContainText("Visual distance (Delta E 2000)");
  await region
    .getByRole("button", { name: "Technical evidence", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const path = await (await download).path();
  const report = JSON.parse(await readFile(path!, "utf8")) as AnalysisReport;
  expect(report.palette!.counts).toEqual(expected.counts);
  const outcomes = (palette: NonNullable<AnalysisReport["palette"]>) =>
    palette.concepts.map((concept) => ({
      ...concept,
      rows: concept.rows.map((row) => ({ ...row, deltaE2000: undefined })),
    }));
  expect(outcomes(report.palette!)).toEqual(outcomes(expected));
  for (const [index, concept] of report.palette!.concepts.entries())
    for (const [rowIndex, row] of concept.rows.entries())
      if (row.deltaE2000 !== undefined)
        expect(row.deltaE2000).toBeCloseTo(
          expected.concepts[index].rows[rowIndex].deltaE2000!,
          10,
        );
  unavailable = true;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(region).toContainText("Completion percentage unavailable.");
  const staleDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const stalePath = await (await staleDownload).path();
  const stale = JSON.parse(
    await readFile(stalePath!, "utf8"),
  ) as AnalysisReport;
  expect(stale.palette!.freshness).toBe("stale");
  expect(stale.palette!.completionPercent).toBe(null);
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Working authoring", exact: true })
    .click();
  await expect(region).toContainText("Provisional comparison.", {
    timeout: 20_000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(region).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
