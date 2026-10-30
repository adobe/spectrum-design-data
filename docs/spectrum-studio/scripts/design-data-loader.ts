// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  type AnalysisInput,
  type AnalysisRecord,
  type AnalysisSource,
} from "../src/features/design-data/comparison";
import { referenceOutputMetadata } from "../src/features/design-data/materialization";
import { loadEnv } from "vite";

export const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Persistent local configuration works for ordinary pnpm dev and CLI runs; shell env wins. */
export const referenceRoot = (mode = "development") =>
  resolve(
    loadEnv(mode, appRoot, "DESIGN_DATA_").DESIGN_DATA_PATH ??
      resolve(appRoot, "../.."),
  );

async function physicalPath(path: string): Promise<string> {
  const parts: string[] = [];
  let parent = resolve(path);
  while (true) {
    try {
      return resolve(await realpath(parent), ...parts);
    } catch (error) {
      if (parent === dirname(parent)) throw error;
      parts.unshift(basename(parent));
      parent = dirname(parent);
    }
  }
}

export async function protectReportOutputs(
  outputs: string[],
  root: string,
): Promise<void> {
  const reference = await physicalPath(root);
  const protectedRoots = await Promise.all(
    ["src", "scripts", "docs", ".git"].map((directory) =>
      physicalPath(join(appRoot, directory)),
    ),
  );
  const paths = await Promise.all(outputs.map(physicalPath));
  if (new Set(paths).size !== paths.length)
    throw new Error("Report outputs must be distinct physical files.");
  // When the app lives inside the reference checkout (the monorepo), protect only the reference inputs, not the whole repository.
  const appInsideReference = (await physicalPath(appRoot)).startsWith(
    `${reference}/`,
  );
  const referenceRoots = appInsideReference
    ? await Promise.all(
        ["packages/design-data", "packages/design-data-spec"].map((directory) =>
          physicalPath(join(root, directory)),
        ),
      )
    : [reference];
  for (const path of paths) {
    if (
      [...referenceRoots, ...protectedRoots].some(
        (directory) => path === directory || path.startsWith(`${directory}/`),
      ) ||
      dirname(path) === appRoot
    ) {
      throw new Error(
        "Report outputs cannot overwrite reference inputs, app source/configuration, or documentation.",
      );
    }
  }
}

export async function jsonFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name, "en"),
  )) {
    if (
      entry.isSymbolicLink() ||
      ["node_modules", ".git", "scripts", "target"].includes(entry.name)
    )
      continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await jsonFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export async function resolutionConformance(
  root: string,
  sdkPath: string,
): Promise<NonNullable<AnalysisSource["resolutionConformance"]>> {
  const report: NonNullable<AnalysisSource["resolutionConformance"]> = {
    fixtureHash: "unavailable",
    resolvedValueComparison: "disabled",
    checks: [],
  };
  const fixtures = join(
    root,
    "packages/design-data-spec/conformance/resolution",
  );
  const flags: Record<string, string> = {
    colorScheme: "--color-scheme",
    contrast: "--contrast",
    scale: "--scale",
  };
  try {
    const hash = createHash("sha256");
    for (const file of await jsonFiles(fixtures))
      hash
        .update(relative(fixtures, file))
        .update("\0")
        .update(await readFile(file))
        .update("\0");
    report.fixtureHash = hash.digest("hex");
    const entries = await readdir(fixtures, { withFileTypes: true });
    for (const entry of entries
      .filter((item) => item.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      try {
        const directory = join(fixtures, entry.name);
        const query: unknown = JSON.parse(
          await readFile(join(directory, "query.json"), "utf8"),
        );
        const expected: unknown = JSON.parse(
          await readFile(join(directory, "expected.json"), "utf8"),
        );
        if (
          !object(query) ||
          typeof query.property !== "string" ||
          !object(query.context) ||
          !object(expected) ||
          typeof expected.resolved !== "boolean"
        )
          throw new Error("Invalid resolution fixture contract.");
        if (
          expected.resolved &&
          typeof expected.expected_uuid !== "string" &&
          !("expected_value" in expected)
        )
          throw new Error("Resolved fixture lacks an expected UUID or value.");
        const inputs = await readdir(directory);
        if (inputs.includes("product-context.json")) {
          report.checks.push({
            name: entry.name,
            status: "unsupported",
            message:
              "Fixture requires product-context.json; this read-only SDK resolve adapter has no product-context input option. Layer precedence is not assessed, and resolved-value comparison remains disabled.",
          });
          continue;
        }
        const args = [
          "resolve",
          query.property,
          join(directory, "input"),
          "--format",
          "json",
        ];
        const modes = join(directory, "mode-sets");
        if (inputs.includes("mode-sets")) args.push("--mode-sets-path", modes);
        for (const [key, value] of Object.entries(query.context)) {
          if (!Object.hasOwn(flags, key) || typeof value !== "string")
            throw new Error(`Unsupported SDK CLI context: ${key}`);
          args.push(flags[key], value);
        }
        const result = spawnSync(sdkPath, args, {
          encoding: "utf8",
          timeout: 10_000,
          maxBuffer: 1024 * 1024,
        });
        if (result.status !== 0)
          throw new Error(
            `SDK resolve failed: ${result.error?.message ?? result.stderr}`,
          );
        const token: unknown = JSON.parse(result.stdout);
        const resolved = object(token) && typeof token.uuid === "string";
        if (resolved !== expected.resolved)
          throw new Error(
            `Expected resolved=${expected.resolved}; received ${resolved}.`,
          );
        if (
          object(token) &&
          typeof expected.expected_uuid === "string" &&
          token.uuid !== expected.expected_uuid
        )
          throw new Error(
            `Expected UUID ${expected.expected_uuid}; received ${String(token.uuid)}.`,
          );
        if (
          object(token) &&
          "expected_value" in expected &&
          canonicalJson(token.value) !== canonicalJson(expected.expected_value)
        )
          throw new Error(
            `Expected value ${canonicalJson(expected.expected_value)}; received ${canonicalJson(token.value)}.`,
          );
        report.checks.push({ name: entry.name, status: "passed" });
      } catch (error) {
        report.checks.push({
          name: entry.name,
          status: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (!report.checks.length)
      report.error = "No resolution fixtures discovered.";
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  }
  return report;
}

export function referenceRecords(
  source: string,
  data: unknown,
  modeKeys: readonly string[] = [
    "colorScheme",
    "contrast",
    "scale",
    "platform",
  ],
): AnalysisRecord[] {
  const category = source.includes("/") ? source.split("/")[0] : "dataset";
  const entries = Array.isArray(data)
    ? data
    : object(data) && Array.isArray(data.values)
      ? data.values
      : [data];
  return entries.map((entry: unknown, index) => {
    if (!object(entry))
      throw new Error(`${source}/${index}: expected an object record`);
    const pointer = Array.isArray(data)
      ? `/${index}`
      : object(data) && Array.isArray(data.values)
        ? `/values/${index}`
        : "";
    const identity =
      typeof entry.uuid === "string"
        ? entry.uuid
        : typeof entry.id === "string"
          ? entry.id
          : undefined;
    const dimension =
      object(entry.value) && typeof entry.value.unit === "string"
        ? entry.value
        : undefined;
    return {
      id: `${source}#${identity ?? pointer}`,
      category,
      name:
        typeof entry.name === "string"
          ? entry.name
          : canonicalJson(entry.name ?? entry.id ?? source),
      source,
      pointer,
      classification: "authored",
      ...(object(entry.lifecycle) &&
        typeof entry.lifecycle.deprecatedIn === "string" && {
          lifecycle: { deprecatedIn: entry.lifecycle.deprecatedIn },
        }),
      ...(object(entry.name) ? { structuredName: entry.name } : {}),
      ...(identity ? { identity } : {}),
      ...(typeof entry.conceptId === "string"
        ? { conceptId: entry.conceptId }
        : {}),
      ...(category === "registry" &&
      object(data) &&
      typeof data.type === "string"
        ? { vocabulary: data.type }
        : {}),
      value: category === "tokens" ? (dimension?.value ?? entry.value) : entry,
      ...(dimension ? { unit: dimension.unit as string } : {}),
      ...(typeof entry.$ref === "string" ? { reference: entry.$ref } : {}),
      ...(object(entry.name)
        ? {
            context: Object.fromEntries(
              Object.entries(entry.name).filter(
                ([key, value]) =>
                  modeKeys.includes(key) &&
                  (typeof value === "string" ||
                    (Array.isArray(value) &&
                      value.every(
                        (member: unknown) => typeof member === "string",
                      ))),
              ),
            ) as Record<string, string | string[]>,
          }
        : {}),
    };
  });
}

export async function loadReferenceInput(
  root: string,
  sdkPath = join(root, "sdk/target/debug/design-data"),
): Promise<AnalysisInput> {
  const input: AnalysisInput = {
    source: {
      kind: "reference",
      root,
      hash: "unavailable",
      revision: "unavailable",
      dirty: null,
      version: "unavailable",
      validator: "unavailable",
    },
    records: [],
    categories: [],
    schemas: [],
    errors: [],
    limitations: [],
    inventoryStatus: "unavailable",
  };
  const hash = createHash("sha256");
  const modeKeys = new Set(["colorScheme", "contrast", "scale", "platform"]);
  try {
    const directory = join(root, "packages/design-data");
    const schemaDirectory = join(root, "packages/design-data-spec/schemas");
    const packageData = JSON.parse(
      await readFile(join(directory, "package.json"), "utf8"),
    ) as { version: string };
    const spec = JSON.parse(
      await readFile(
        join(root, "packages/design-data-spec/package.json"),
        "utf8",
      ),
    ) as { version: string };
    input.source.version = `design-data ${packageData.version}; spec ${spec.version}`;
    const files = await jsonFiles(directory);
    for (const file of files.filter((path) =>
      relative(directory, path).startsWith("mode-sets/"),
    )) {
      try {
        const declaration: unknown = JSON.parse(await readFile(file, "utf8"));
        if (object(declaration) && typeof declaration.name === "string")
          modeKeys.add(declaration.name);
      } catch (error) {
        input.errors.push(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    for (const file of files) {
      const source = relative(directory, file).split("\\").join("/");
      const text = await readFile(file, "utf8");
      hash.update(source).update("\0").update(text).update("\0");
      if (source === "package.json") continue;
      try {
        input.records.push(
          ...referenceRecords(source, JSON.parse(text), [...modeKeys]),
        );
      } catch (error) {
        input.errors.push(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    for (const file of await jsonFiles(schemaDirectory)) {
      const source = relative(schemaDirectory, file).split("\\").join("/");
      const text = await readFile(file, "utf8");
      JSON.parse(text);
      input.schemas.push(source);
      hash.update(`schema/${source}`).update("\0").update(text).update("\0");
    }
    if (!input.records.some((record) => record.category === "tokens"))
      input.errors.push("Required tokens inventory is empty.");
    input.inventoryStatus = input.errors.length ? "partial" : "complete";
    input.source.hash = hash.digest("hex");
    try {
      input.source.revision = execFileSync(
        "git",
        ["-C", root, "rev-parse", "HEAD"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
      input.source.dirty = Boolean(
        execFileSync(
          "git",
          [
            "-C",
            root,
            "status",
            "--porcelain",
            "--",
            "packages/design-data",
            "packages/design-data-spec",
          ],
          { encoding: "utf8" },
        ).trim(),
      );
    } catch {
      input.limitations.push(
        "Git provenance unavailable; content hash remains authoritative.",
      );
    }
    const binary = await readFile(sdkPath);
    const binaryHash = createHash("sha256").update(binary).digest("hex");
    const version = spawnSync(sdkPath, ["--version"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    if (version.status !== 0)
      throw new Error(
        `SDK version failed: ${version.error?.message ?? version.stderr}`,
      );
    input.source.validator = `${version.stdout.trim()}; sha256:${binaryHash}; supplied spec schemas; SDK-selected token schemas`;
    const conformance = await resolutionConformance(root, sdkPath);
    input.source.resolutionConformance = conformance;
    input.limitations.push(
      `SDK resolution conformance: ${conformance.checks.filter((check) => check.status === "passed").length}/${conformance.checks.length} passed; fixture SHA-256: ${conformance.fixtureHash}. These checks do not establish binary freshness or enable resolved-value comparison.`,
    );
    if (conformance.error)
      input.limitations.push(
        `Resolution conformance unavailable: ${conformance.error}`,
      );
    for (const check of conformance.checks.filter(
      (item) => item.status !== "passed",
    ))
      input.limitations.push(
        `SDK resolution fixture ${check.name} ${check.status}: ${check.message}`,
      );
    const result = spawnSync(
      sdkPath,
      [
        "validate-dataset",
        directory,
        "--format",
        "json",
        "--spec-schemas",
        schemaDirectory,
      ],
      { encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
    );
    if (result.error) throw result.error;
    const validation = JSON.parse(result.stdout) as {
      valid: boolean;
      errors: { file: string; message: string; instance_path?: string }[];
      warnings: unknown[];
    };
    if (
      !Array.isArray(validation.errors) ||
      typeof validation.valid !== "boolean"
    )
      throw new Error("Invalid SDK validation response.");
    for (const error of validation.errors)
      input.errors.push(
        `${relative(directory, error.file)}${error.instance_path ?? ""}: ${error.message}`,
      );
    if (!validation.valid && !validation.errors.length)
      input.errors.push(
        "SDK marked the required input invalid without diagnostics.",
      );
    if (result.status !== 0 && validation.valid)
      input.errors.push(`SDK exited ${result.status}: ${result.stderr}`);
    input.limitations.push(
      `SDK reported ${validation.warnings?.length ?? 0} warnings. Binary freshness against checkout is not established; schema-selection differences may explain validation errors.`,
    );
    input.limitations.push(
      "SDK dataset validation covers its registered catalog; newly discovered categories are inventoried without claiming catalog-rule coverage. Unresolved aliases are not replaced with a custom cascade implementation.",
    );
  } catch (error) {
    input.errors.push(error instanceof Error ? error.message : String(error));
    if (input.inventoryStatus === "unavailable" && input.records.length)
      input.inventoryStatus = "partial";
  }
  input.categories = [
    ...new Set(input.records.map((record) => record.category)),
  ].sort();
  input.outputMetadata = referenceOutputMetadata(input.records, [...modeKeys]);
  return input;
}
