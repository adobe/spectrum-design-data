// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildArchitectureAssessment,
  type AssessmentProfile,
  type AssessmentRegistry,
} from "../../src/features/design-data/assessment";
import {
  reportMarkdown,
  type AnalysisInput,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../../src/features/design-data/projection";

const hash = "1".repeat(64);
const registry: AssessmentRegistry = {
  version: "browser-assessment-fixture-v1",
  evidence: [
    {
      id: "SOURCE",
      profileId: "source",
      authority: "sdk-source",
      method: "source-review",
      path: "sdk/source.rs",
      format: "file",
      location: "fixture source",
      reviewedSha256: hash,
      reviewedAt: "2026-10-05",
      statement: "Reviewed source fixture, not SDK conformance.",
    },
    {
      id: "PROPOSAL",
      profileId: "draft",
      authority: "proposal",
      method: "proposal",
      path: "draft/contract.md",
      format: "file",
      location: "fixture proposal",
      reviewedSha256: hash,
      reviewedAt: "2026-10-05",
      statement: "Unapproved portable authoring proposal.",
    },
  ],
  requirements: [
    {
      id: "TGT-fixture",
      title: "Portable intent",
      statement: "Portable definitions need an accepted contract.",
      status: "proposed-model",
      decision: "open",
      evidenceIds: ["PROPOSAL"],
    },
  ],
  findings: [
    {
      id: "JTC-source",
      title: "Source and specification disagree",
      plane: "current-state",
      classification: "sdk-spec-disagreement",
      priority: "high",
      scope: "Fixture source",
      statement: "A reviewed source disagreement remains open.",
      consequence: "Lineage may be lost.",
      recommendation: "Review both authorities.",
      owner: "upstream",
      evidenceIds: ["SOURCE"],
      requirementIds: [],
      decision: "open",
      discriminatingCheck: "Inspect query lineage separately.",
    },
    {
      id: "JTC-target",
      title: "Portable authoring gap",
      plane: "target-contract",
      classification: "schema-expressiveness-gap",
      priority: "high",
      scope: "Fixture proposal",
      statement: "Equal output values do not close this schema gap.",
      consequence: "Intent may not round-trip.",
      recommendation: "Review the proposal.",
      owner: "joint",
      evidenceIds: ["PROPOSAL"],
      requirementIds: ["TGT-fixture"],
      decision: "open",
      discriminatingCheck: "Round-trip a recipe.",
    },
  ],
};
const profiles: AssessmentProfile[] = [
  {
    id: "source",
    label: "Reviewed source fixture",
    kind: "working-tree",
    root: "fixture",
    reviewedRevision: "review",
    observedRevision: "fixture",
    status: "available",
    limitation: "Fixture metadata only.",
  },
  {
    id: "draft",
    label: "Unavailable draft fixture",
    kind: "pinned-git",
    root: "fixture",
    reviewedRevision: "f".repeat(40),
    observedRevision: null,
    status: "unavailable",
    limitation: "No fetch or validator run.",
  },
];
function fixture(changed = false): AnalysisInput {
  const token = defaultsAnalysisInput().records.find(
    (record) => record.identity,
  )!;
  return {
    source: {
      kind: "reference",
      root: "browser fixture",
      hash,
      revision: changed ? "fixture-2" : "fixture-1",
      dirty: false,
      version: "fixture",
      validator: "fixture transport, not upstream conformance",
    },
    records: [
      { ...token, id: "reference-fixture", source: "tokens/fixture.json" },
    ],
    categories: ["tokens"],
    schemas: [],
    errors: [],
    limitations: ["Browser fixture only."],
    architecture: buildArchitectureAssessment(registry, profiles, [
      { evidenceId: "SOURCE", sha256: changed ? "2".repeat(64) : hash },
      { evidenceId: "PROPOSAL", sha256: null },
    ]),
  };
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

test("Analysis separates architectural reviews, target proposals, and equal output with accessible filters/downloads", async ({
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
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "defaults",
  );
  const output = await download(page);
  expect(
    output.findings.some((finding) => finding.classification === "equal"),
  ).toBe(true);
  expect(output.architecture?.requirements[0].decision).toBe("open");
  await choose(page, "Assessment plane", "Current-state audit");
  await expect(page.getByTestId("assessment-boundary")).toContainText(
    "Snapshot matching is not conformance",
  );
  await choose(page, "Owner", "upstream");
  await choose(page, "Priority", "high");
  await choose(page, "Review method", "source review");
  await choose(page, "Evidence profile", "Reviewed source fixture");
  await choose(page, "Evidence status", "Reviewed snapshot");
  const table = page.getByRole("grid", { name: "Analysis findings" });
  await expect(table).toContainText("JTC-source");
  await table
    .getByRole("button", { name: "Evidence", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toContainText("review-not-rerun");
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toContainText(hash);
  const picker = page.getByRole("button", { name: /Assessment plane/ });
  await picker.press("Enter");
  await page
    .getByRole("option", { name: "Joint target contract", exact: true })
    .press("Enter");
  await choose(page, "Finding type", "proposed model");
  await expect(table).toContainText("TGT-fixture");
  await expect(table).toContainText("unverified");
  await table.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toContainText("not rerun");
  await expect(
    page.getByRole("region", { name: "Assessment provenance" }),
  ).toContainText("Unavailable draft fixture: unavailable");
  const target = await download(page);
  expect(target.findings).toEqual(output.findings);
  expect(target.architecture).toEqual(output.architecture);
  for (const source of [
    "Saved authoring",
    "Working authoring",
    "Shipped defaults",
  ]) {
    await choose(page, "Comparison source", source);
    const selected = await download(page);
    expect(selected.architecture).toEqual(output.architecture);
    expect(selected.inputs.app.kind).toBe(
      source.startsWith("Saved")
        ? "saved"
        : source.startsWith("Working")
          ? "working"
          : "defaults",
    );
  }
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  expect(await readFile((await (await event).path())!, "utf8")).toBe(
    reportMarkdown(target),
  );
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

test("Analysis retains architectural evidence through partial input, actual refresh, stale transport, and malformed metadata", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let current: unknown = fixture();
  let unavailable = false;
  await page.route("**/__design-data/reference", (route) =>
    unavailable
      ? route.fulfill({ status: 503, body: "Unavailable fixture" })
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
  await choose(page, "Assessment plane", "Current-state audit");
  const probe = fileURLToPath(
    new URL(
      `../../src/features/design-data/.assessment-watch-${process.pid}.json`,
      import.meta.url,
    ),
  );
  try {
    current = fixture(true);
    await writeFile(probe, JSON.stringify({ revision: "fixture-2" }));
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "fixture-2",
      { timeout: 15_000 },
    );
    await choose(page, "Evidence status", "Stale");
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText("JTC-source");
  } finally {
    await rm(probe, { force: true });
  }
  const partial = fixture(true);
  partial.records = [];
  partial.errors = ["Required checkout records unavailable"];
  current = partial;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "Invalid inputs / partial",
  );
  expect((await download(page)).architecture?.findings).toHaveLength(2);
  expect((await download(page)).architecture?.requiredInputFailures).toContain(
    "Reference: Required checkout records unavailable",
  );
  unavailable = true;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reference request failed",
  );
  expect((await download(page)).freshness).toBe("stale");
  await expect(page.getByTestId("assessment-boundary")).toContainText(
    "Report is stale",
  );
  unavailable = false;
  const malformed = fixture();
  current = {
    ...malformed,
    architecture: {
      ...malformed.architecture,
      evidence: [
        { ...malformed.architecture!.evidence[0], execution: "passed-now" },
      ],
    },
  };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Invalid architectural assessment response",
  );
  expect((await download(page)).architecture?.findings).toHaveLength(2);
  expect((await download(page)).freshness).toBe("stale");
  expect(errors).toEqual([]);
});
