// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appRoot } from "../../scripts/design-data-loader";
import { defaultsAnalysisInput } from "../../src/features/design-data/projection";
import {
  reportMarkdown,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";
import { REVIEWED_DRAFT_REF } from "../../src/features/design-data/assessmentRegistry";

test("Analysis and CLI retain mode/platform diagnostics across declaration/mapping refresh and invalid input", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const directory = await mkdtemp(
    join(tmpdir(), "analysis-reference-refresh-"),
  );
  const root = join(directory, "checkout");
  // Disposable local object-sharing fixture only; no source checkout/ref is changed.
  const clone = spawnSync(
    "git",
    ["clone", "--shared", "--no-checkout", appRoot, root],
    { encoding: "utf8" },
  );
  expect(clone.status, clone.stderr).toBe(0);
  const data = join(root, "packages/design-data");
  const schemas = join(root, "packages/design-data-spec/schemas");
  await mkdir(join(data, "tokens"), { recursive: true });
  await mkdir(join(data, "mode-sets"), { recursive: true });
  await mkdir(join(data, "registry"), { recursive: true });
  await mkdir(schemas, { recursive: true });
  await writeFile(
    join(data, "package.json"),
    JSON.stringify({ version: "browser-fixture" }),
  );
  await writeFile(
    join(root, "packages/design-data-spec/package.json"),
    JSON.stringify({ version: "browser-fixture" }),
  );
  await writeFile(
    join(data, "registry/platforms.json"),
    JSON.stringify({ type: "platform", values: [{ id: "web", label: "Web" }] }),
  );
  const declaration = join(data, "mode-sets/fixture-axis.json");
  await writeFile(
    declaration,
    JSON.stringify({ name: "fixtureAxis", modes: ["one"], default: "one" }),
  );
  const appToken = defaultsAnalysisInput().records.find(
    (record) => record.identity && record.context?.colorScheme === "dark",
  )!;
  const tokenPath = join(data, "tokens/context-fixture.json");
  const token = {
    uuid: appToken.identity,
    name: { ...appToken.structuredName, colorScheme: "light", platform: "web" },
    value: appToken.value,
  };
  const tokenText = JSON.stringify([token]);
  await writeFile(tokenPath, tokenText);
  const sdk = join(directory, "fixture-sdk");
  await writeFile(
    sdk,
    '#!/usr/bin/env node\nif(process.argv.includes("--version"))console.log("fixture SDK; transport only, not upstream conformance");else console.log(JSON.stringify({valid:true,errors:[],warnings:[]}));\n',
    { mode: 0o700 },
  );

  const reservation = createServer();
  reservation.listen(0, "localhost");
  await once(reservation, "listening");
  const address = reservation.address();
  if (!address || typeof address === "string")
    throw new Error("Cannot reserve a fixture server port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  const baseURL = `https://localhost:${port}`;
  const server = spawn(
    process.execPath,
    [
      join(appRoot, "node_modules/vite/bin/vite.js"),
      "--host",
      "localhost",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: appRoot,
      env: { ...process.env, DESIGN_DATA_PATH: root, DESIGN_DATA_SDK: sdk },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  server.stdout.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  const download = async (): Promise<AnalysisReport> => {
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const result = await event;
    return JSON.parse(await readFile((await result.path())!, "utf8"));
  };
  const cli = async (browserReport: AnalysisReport, expectedExit: number) => {
    const json = join(directory, "report.json");
    const markdown = join(directory, "report.md");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        join(appRoot, "scripts/analyze-design-data.ts"),
        "--design-data-path",
        root,
        "--sdk",
        sdk,
        "--json",
        json,
        "--markdown",
        markdown,
      ],
      { cwd: appRoot, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(expectedExit);
    const report: AnalysisReport = JSON.parse(await readFile(json, "utf8"));
    expect(report.findings).toEqual(browserReport.findings);
    expect(report.metrics).toEqual(browserReport.metrics);
    expect(report.inputs.reference.hash).toBe(
      browserReport.inputs.reference.hash,
    );
    expect(report.mappingVersion).toBe(browserReport.mappingVersion);
    expect(report.architecture).toEqual(browserReport.architecture);
    expect(report.materialization).toEqual(browserReport.materialization);
    expect(report.coverage).toEqual(browserReport.coverage);
    expect(await readFile(markdown, "utf8")).toBe(reportMarkdown(report));
  };
  try {
    await expect
      .poll(
        async () => {
          if (server.exitCode !== null) throw new Error(logs);
          try {
            return (
              await page.request.get(`${baseURL}/__design-data/reference`)
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 45_000 },
      )
      .toBe(200);
    await page.goto(baseURL);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Analysis", exact: true })
      .click();
    await showAnalysisDetails(page);
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "Valid inputs",
      { timeout: 30_000 },
    );
    await page
      .getByRole("searchbox", { name: "Search findings" })
      .fill("context-fixture");
    for (const type of ["mode gap", "platform gap"]) {
      await page.getByRole("button", { name: /Finding type/ }).click();
      await page.getByRole("option", { name: type, exact: true }).click();
      await expect(
        page.getByRole("grid", { name: "Analysis findings" }),
      ).toContainText(type);
      await page
        .getByRole("button", { name: "Evidence", exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("region", { name: "Finding evidence" }),
      ).toContainText("Confirmed pair");
      await expect(
        page.getByRole("region", { name: "Finding evidence" }),
      ).toContainText("exact-identity");
    }
    let initial = await download();
    expect(initial.architecture?.findings).toHaveLength(16);
    await page.getByRole("button", { name: /Assessment plane/ }).click();
    await page
      .getByRole("option", { name: "Current-state audit", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search findings" })
      .fill("JTC-005");
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText("JTC-005");
    await page
      .getByRole("button", { name: "Evidence", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("region", { name: "Finding evidence" }),
    ).toContainText("review-not-rerun");
    await expect(
      page.getByRole("region", { name: "Finding evidence" }),
    ).toContainText("unverified");
    const contractDirectory = join(root, "packages/design-data-spec/spec");
    await mkdir(contractDirectory, { recursive: true });
    await writeFile(
      join(contractDirectory, "manifest.md"),
      "# Changed fixture manifest contract\n",
    );
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText("stale", { timeout: 20_000 });
    initial = await download();
    expect(
      initial.architecture?.evidence.find(
        (item) => item.id === "CURRENT-MANIFEST",
      )?.verification.state,
    ).toBe("changed");
    expect(
      initial.architecture?.findings.find((item) => item.id === "JTC-005")
        ?.freshness,
    ).toBe("stale");
    const fixtureRevision = spawnSync(
      "git",
      ["-C", root, "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).stdout.trim();
    const advance = spawnSync(
      "git",
      ["-C", root, "update-ref", REVIEWED_DRAFT_REF, fixtureRevision],
      { encoding: "utf8" },
    );
    expect(advance.status, advance.stderr).toBe(0);
    await expect
      .poll(
        async () =>
          (await download()).architecture?.profiles.find(
            (item) => item.id === "draft-pr1454",
          )?.trackedRef?.observedRevision,
        { timeout: 20_000 },
      )
      .toBe(fixtureRevision);
    const packed = spawnSync("git", ["-C", root, "pack-refs", "--all"], {
      encoding: "utf8",
    });
    expect(packed.status, packed.stderr).toBe(0);
    const removeRef = spawnSync(
      "git",
      ["-C", root, "update-ref", "-d", REVIEWED_DRAFT_REF],
      { encoding: "utf8" },
    );
    expect(removeRef.status, removeRef.stderr).toBe(0);
    await expect
      .poll(
        async () =>
          (await download()).architecture?.profiles.find(
            (item) => item.id === "draft-pr1454",
          )?.trackedRef?.observedRevision,
        { timeout: 20_000 },
      )
      .toBeNull();
    await page.getByRole("button", { name: /Assessment plane/ }).click();
    await page
      .getByRole("option", { name: "Generated output", exact: true })
      .click();
    expect(
      initial.metrics.find((metric) => metric.category === "tokens")?.matched,
    ).toBe(1);
    expect(
      initial.metrics.find((metric) => metric.category === "tokens")
        ?.assessable,
    ).toBe(0);
    expect(
      initial.metrics.find((metric) => metric.category === "registry")
        ?.reference,
    ).toBe(1);
    await cli(initial, 0);
    const markdownEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    const markdown = await markdownEvent;
    expect(await readFile((await markdown.path())!, "utf8")).toBe(
      reportMarkdown(initial),
    );

    // Only a temporary checkout is changed; the real reference repository stays read-only.
    await page.getByRole("button", { name: /Finding type/ }).click();
    await page.getByRole("option", { name: "all", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Search findings" })
      .fill("fixtureAxis");
    await writeFile(
      declaration,
      JSON.stringify({
        name: "fixtureAxis",
        modes: ["one", "two"],
        default: "two",
      }),
    );
    await expect(page.getByTestId("analysis-provenance")).not.toContainText(
      initial.inputs.reference.hash,
      { timeout: 20_000 },
    );
    await page
      .getByRole("button", { name: "Evidence", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("region", { name: "Finding evidence" }),
    ).toContainText('"default": "two"');
    const refreshed = await download();
    expect(
      refreshed.findings.some(
        (finding) =>
          finding.classification === "mode-gap" &&
          finding.reference?.value &&
          typeof finding.reference.value === "object" &&
          "default" in finding.reference.value &&
          finding.reference.value.default === "two",
      ),
    ).toBe(true);
    await cli(refreshed, 0);

    // Exercise the already-reviewed color rule against newly discovered fixture data,
    // rather than modifying application mapping code or a real reference checkout.
    const ramp = defaultsAnalysisInput().records.find(
      (record) =>
        record.structuredName?.colorName === "red" &&
        record.structuredName.contrastValue === "100" &&
        !record.context?.colorScheme &&
        !record.context?.contrast,
    )!;
    await page
      .getByRole("searchbox", { name: "Search findings" })
      .fill("foundation-color-ramp-v1");
    await expect(
      page.getByText("No matching findings", { exact: true }),
    ).toBeVisible();
    await writeFile(
      join(data, "tokens/color-palette.tokens.json"),
      JSON.stringify([
        {
          uuid: "11111111-1111-4111-8111-111111111111",
          name: {
            property: "color",
            colorFamily: "red",
            scaleIndex: 100,
            colorScheme: "light",
            contrast: "regular",
          },
          value: ramp.value,
        },
      ]),
    );
    await expect(page.getByTestId("analysis-provenance")).not.toContainText(
      refreshed.inputs.reference.hash,
      { timeout: 20_000 },
    );
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toContainText("equal");
    const remapped = await download();
    expect(
      remapped.metrics.find((metric) => metric.category === "tokens")?.matched,
    ).toBe(2);
    expect(
      remapped.metrics.find((metric) => metric.category === "tokens")
        ?.assessable,
    ).toBe(1);
    expect(
      remapped.findings.some(
        (finding) =>
          finding.classification === "equal" &&
          finding.confidence === "reviewed-mapping",
      ),
    ).toBe(true);
    await cli(remapped, 0);

    await writeFile(tokenPath, "invalid JSON fixture");
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "Invalid inputs / partial",
      { timeout: 20_000 },
    );
    for (const type of ["mode gap", "platform gap"]) {
      await page.getByRole("button", { name: /Finding type/ }).click();
      await page.getByRole("option", { name: type, exact: true }).click();
      await expect(
        page.getByText("No matching findings", { exact: true }),
      ).toBeVisible();
    }
    const invalid = await download();
    expect(invalid.valid).toBe(false);
    expect(
      invalid.findings.some(
        (finding) =>
          finding.classification === "mode-gap" ||
          finding.classification === "platform-gap",
      ),
    ).toBe(false);
    await cli(invalid, 1);
    await writeFile(tokenPath, tokenText);
    await expect(page.getByTestId("analysis-provenance")).toContainText(
      "Valid inputs",
      { timeout: 20_000 },
    );
    expect(errors).toEqual([]);
  } finally {
    const exit = server.exitCode === null ? once(server, "exit") : undefined;
    server.kill("SIGTERM");
    if (exit) await exit;
    await rm(directory, { recursive: true, force: true });
  }
});
