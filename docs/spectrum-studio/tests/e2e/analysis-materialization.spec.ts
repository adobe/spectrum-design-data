// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { readFile } from "node:fs/promises";
import {
  reportMarkdown,
  type AnalysisInput,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";
import { referenceOutputMetadata } from "../../src/features/design-data/materialization";

function fixture(): AnalysisInput {
  const input: AnalysisInput = {
    source: {
      kind: "reference",
      root: "fixture",
      hash: "1".repeat(64),
      revision: "fixture",
      dirty: false,
      version: "fixture",
      validator: "Browser provenance fixture; not SDK conformance",
    },
    records: [
      {
        id: "reference-row",
        category: "tokens",
        name: "Platform-local fixture",
        source: "tokens/platform-fixture.json",
        pointer: "/0",
        classification: "authored",
        value: 8,
        unit: "px",
        context: { platform: "web", interfaceLevel: "elevated" },
      },
    ],
    categories: ["tokens"],
    schemas: [],
    errors: [],
    limitations: [],
  };
  input.outputMetadata = referenceOutputMetadata(input.records, [
    "platform",
    "interfaceLevel",
    "colorScheme",
  ]);
  return input;
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function download(page: Page): Promise<AnalysisReport> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  return JSON.parse(await readFile((await (await event).path())!, "utf8"));
}

test("Analysis labels samples, declared dependencies, source assignments and omissions without canonical coverage", async ({
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
  await showAnalysisDetails(page);
  const provenance = page.getByRole("region", {
    name: "Output materialization provenance",
  });
  await expect(provenance).toContainText(
    "Canonical materialized rows: unavailable",
  );
  await expect(provenance).toContainText("not inferred as wildcard/default");
  await choose(page, "Row provenance", "Evaluation sample");
  await page
    .getByRole("searchbox", { name: "Search findings" })
    .fill("spacing-global-100");
  const table = page.getByRole("grid", { name: "Analysis findings" });
  await expect(table).toContainText("evaluation sample");
  await table
    .getByRole("button", { name: "Evidence", exact: true })
    .first()
    .press("Enter");
  const evidence = page.getByRole("region", { name: "Finding evidence" });
  await expect(evidence).toContainText('"origin": "evaluation-sample"');
  await expect(evidence).toContainText(
    '"dependencyAssessment": "declared-only"',
  );
  await expect(evidence).toContainText('"generator": "generateSpacingScale"');
  await expect(evidence).toContainText('"assignmentIds": []');
  await page.getByRole("searchbox", { name: "Search findings" }).fill("");
  const picker = page.getByRole("button", { name: /Row provenance/ });
  await picker.press("Enter");
  await page
    .getByRole("option", { name: "Authored source record", exact: true })
    .press("Enter");
  await expect(table).toContainText("Platform-local fixture");
  await table.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(evidence).toContainText('"interfaceLevel": "elevated"');
  await expect(evidence).toContainText('"kind": "source-record"');
  const report = await download(page);
  expect(report.materialization?.inputs.app.axes).not.toContain(
    "interfaceLevel",
  );
  expect(
    report.materialization?.inputs.reference.counts.explicitAssignments,
  ).toBe(1);
  expect(
    report.materialization?.inputs.reference.counts.canonicalMaterializedRows,
  ).toBeNull();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  expect(await readFile((await (await event).path())!, "utf8")).toBe(
    reportMarkdown(report),
  );
  await choose(page, "Assessment plane", "Current-state audit");
  await choose(page, "Assessment plane", "Generated output");
  await expect(
    page.getByRole("button", { name: /Row provenance/ }),
  ).toContainText("All row provenance");
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

test("Analysis rejects malformed provenance, keeps stale downloads, and recovers partial or legacy inventories", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let input = fixture();
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ json: input }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "fixture",
  );
  const original = await download(page);
  input.outputMetadata = {
    ...input.outputMetadata!,
    observations: [
      {
        recordId: "missing-row",
        origin: "authored-source-record",
        assignmentIds: [],
        lineage: "source-record",
      },
    ],
  };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Invalid output provenance metadata response",
  );
  await expect(
    page.getByRole("region", { name: "Output materialization provenance" }),
  ).toContainText("Reference evidence is stale");
  const stale = await download(page);
  expect(stale.freshness).toBe("stale");
  expect(stale.materialization).toEqual(original.materialization);
  input = { ...fixture(), errors: ["Partial fixture input"] };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "Invalid inputs / partial",
  );
  expect((await download(page)).materialization?.inputs.reference.status).toBe(
    "partial",
  );
  input = { ...fixture(), outputMetadata: undefined };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "Valid inputs",
  );
  await choose(page, "Row provenance", "Unclassified");
  await expect(
    page.getByRole("grid", { name: "Analysis findings" }),
  ).toContainText("Platform-local fixture");
  const legacy = await download(page);
  expect(legacy.materialization?.inputs.reference.status).toBe("unavailable");
  expect(
    legacy.materialization?.inputs.reference.counts.explicitAssignments,
  ).toBe(0);
  expect(errors).toEqual([]);
});
