// Copyright 2026 Adobe. All rights reserved.
import { readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckCommand } from "./checkRunner";

export const studioRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const testHelpers = ["typography-fixtures.ts"];
export type CheckProfile = "focused" | "performance" | "browser" | "ci";

export function fileCheckInventory(
  files: readonly string[],
  root = studioRoot,
): CheckCommand[] {
  if (!files.length || files.length > 16)
    throw new Error("--files requires one to sixteen explicit files.");
  for (const file of files) {
    if (
      !/^[a-zA-Z0-9_./-]+\.(?:ts|tsx|mjs|js|json|md|mdc|yml)$/.test(file) ||
      file
        .split("/")
        .some((part) =>
          [
            "..",
            "node_modules",
            ".pnpm",
            ".git",
            ".cache",
            "reports",
            "dist",
            "coverage",
            "test-results",
            "storybook-static",
            "vendor",
          ].includes(part),
        )
    )
      throw new Error(`Not a supported focused input: ${file}`);
    const path = realpathSync(resolve(root, file));
    const local = relative(realpathSync(root), path);
    if (isAbsolute(local) || local.startsWith("..") || !statSync(path).isFile())
      throw new Error(`Focused input must be a file inside Studio: ${file}`);
  }
  const command = (id: string, args: string[]): CheckCommand => ({
    id,
    command: "pnpm",
    args: ["exec", ...args],
    scope: "element",
    resources: "heavy",
  });
  return [
    command("lint-files", ["eslint", ...files, "--max-warnings", "0"]),
    command("format-files", ["prettier", "--write", ...files]),
    {
      id: "types-files",
      command: process.execPath,
      args: [
        "--import",
        "tsx",
        "scripts/checkTestTypes.ts",
        "--focused",
        ...files,
      ],
      env: { TSX_TSCONFIG_PATH: join(root, "tsconfig.app.json") },
      scope: "element",
      resources: "heavy",
    },
  ];
}

export function checkKind(id: string): NonNullable<CheckCommand["kind"]> {
  if (/(?:sdk|analysis-report)/.test(id)) return "sdk";
  if (/(?:performance|prioritized-work|color-system$|-work$)/.test(id))
    return "performance";
  if (/build$/.test(id)) return "build";
  if (/(?:types|eslint)/.test(id)) return "typing";
  return "domain";
}

export function nonBrowserTestFiles(root = studioRoot): string[] {
  return readdirSync(join(root, "tests"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /\.(?:ts|tsx|mjs)$/.test(entry.name) &&
        !testHelpers.includes(entry.name),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function checkInventory(
  outputDirectory: string,
  root = studioRoot,
): CheckCommand[] {
  const pnpm = (
    id: string,
    args: string[],
    requires?: string[],
  ): CheckCommand => ({
    id,
    command: "pnpm",
    args: ["exec", ...args],
    ...(requires && { requires }),
  });
  const tsx = (id: string, args: string[]): CheckCommand => ({
    id,
    command: process.execPath,
    args: ["--import", "tsx", ...args],
    env: { TSX_TSCONFIG_PATH: join(root, "tsconfig.app.json") },
  });
  const files = nonBrowserTestFiles(root);
  const typed = files.filter((file) => /\.(?:ts|tsx)$/.test(file));
  const typeChecks: CheckCommand[] = [];
  for (let index = 0; index < typed.length; index += 16)
    typeChecks.push(
      tsx(`test-types-${String(index / 16 + 1).padStart(2, "0")}`, [
        "scripts/checkTestTypes.ts",
        ...typed.slice(index, index + 16).map((file) => `tests/${file}`),
      ]),
    );
  const inventory: CheckCommand[] = [
    pnpm("app-types", ["tsc", "--project", "tsconfig.app.json", "--noEmit"]),
    pnpm("tooling-types", [
      "tsc",
      "--project",
      "tsconfig.node.json",
      "--noEmit",
    ]),
    ...typeChecks,
    {
      id: "analysis-dependency-install",
      command: "pnpm",
      args: [
        "--filter",
        "@adobe/spectrum-studio...",
        "install",
        "--offline",
        "--ignore-scripts",
      ],
    },
    ...[
      ["analysis-rust-resolution-sdk", "sdk:value-resolution-test"],
      ["analysis-wasm-build-sdk", "sdk-wasm:build"],
      ["analysis-wasm-resolution-sdk", "sdk-wasm:test-resolution"],
      ["analysis-wasm-package-sdk", "sdk-wasm:verify-package"],
      ["analysis-rust-fmt-sdk", "sdk:fmt"],
    ].map(
      ([id, task]): CheckCommand => ({
        id,
        command: task.startsWith("sdk-wasm:") ? "pnpm" : "moon",
        args: task.startsWith("sdk-wasm:")
          ? [
              "--package=wasm-pack@0.13.1",
              "dlx",
              "--shell-mode",
              `moon run ${task}`,
            ]
          : ["run", task],
        env: { CARGO_BUILD_JOBS: "1" },
      }),
    ),
    {
      id: "analysis-wasm-toolchain-sdk",
      command: "pnpm",
      args: [
        "--package=wasm-pack@0.13.1",
        "dlx",
        "--shell-mode",
        "moon run sdk-wasm:build",
      ],
      env: { CARGO_BUILD_JOBS: "1" },
    },
    pnpm("eslint", ["eslint", ".", "--max-warnings", "0"]),
    ...[
      "token-identities",
      "defaults-schema",
      "spectrum-icon-catalog",
      "check-design-data-gaps",
    ].map((script) => tsx(script, [`scripts/${script}.ts`, "--check"])),
    ...[
      "check-category-icons",
      "check-changelog-coverage",
      "check-docs-index",
    ].map((script) => tsx(script, [`scripts/${script}.ts`])),
    pnpm("adapter-build", [
      "vite",
      "build",
      "--config",
      "vite.data-vis.config.ts",
      "--outDir",
      join(outputDirectory, "data-vis"),
    ]),
    ...files.map((file): CheckCommand => {
      const check = file.endsWith(".mjs")
        ? {
            id: file.slice(0, -4),
            command: process.execPath,
            args: [`tests/${file}`],
          }
        : tsx(file.replace(/\.tsx?$/, ""), [`tests/${file}`]);
      return file === "analysis-packaged-reference.ts"
        ? { ...check, requires: ["analysis-wasm-build-sdk"] }
        : file === "data-vis-export.ts"
          ? {
              ...check,
              requires: ["adapter-build"],
              env: {
                DATA_VIS_BUNDLE_PATH: join(
                  outputDirectory,
                  "data-vis/data-vis.js",
                ),
              },
            }
          : check;
    }),
    {
      ...tsx("analysis-reference-performance-work", [
        "tests/analysis-performance-work.ts",
        "--reference",
      ]),
      kind: "performance",
    },
    {
      ...tsx("analysis-wasm-performance-work", [
        "tests/analysis-performance-work.ts",
        "--wasm",
      ]),
      requires: ["analysis-wasm-build-sdk"],
    },
    tsx("changelog-schema-review-sizing", [
      "tests/changelog-schema-review.ts",
      "--sizing-only",
    ]),
    ...["color-opacity-assessment", "mode-coverage"].map((id) => ({
      ...tsx(`${id}-sdk`, [`tests/${id}.ts`]),
      env: { COLOR_OPACITY_SDK_TESTS: "1" },
    })),
    tsx("analysis-report", [
      "scripts/analyze-design-data.ts",
      "--json",
      join(outputDirectory, "analysis.json"),
      "--markdown",
      join(outputDirectory, "analysis.md"),
    ]),
    {
      ...pnpm("production-build", [
        "vite",
        "build",
        "--outDir",
        join(outputDirectory, "production"),
      ]),
      requires: ["analysis-wasm-build-sdk"],
    },
    pnpm("storybook-build", [
      "storybook",
      "build",
      "--disable-telemetry",
      "--output-dir",
      join(outputDirectory, "storybook"),
    ]),
  ];
  return inventory.map(
    (check): CheckCommand => ({
      ...check,
      kind: check.kind ?? checkKind(check.id),
      scope:
        check.scope ??
        ([
          "app-types",
          "tooling-types",
          "eslint",
          "production-build",
          "storybook-build",
          "analysis-report",
        ].includes(check.id)
          ? "project"
          : ["agent-admission", "check-selection"].includes(check.id)
            ? "element"
            : "integration"),
      resources:
        check.resources ??
        (["agent-admission", "check-selection"].includes(check.id)
          ? "small"
          : "heavy"),
    }),
  );
}

export function browserCheckInventory(root = studioRoot): CheckCommand[] {
  return readdirSync(join(root, "tests/e2e"))
    .filter((name) => name.endsWith(".spec.ts"))
    .sort()
    .map(
      (file): CheckCommand => ({
        id: `browser-${file.slice(0, -8)}`,
        command: "pnpm",
        scope: "integration",
        resources: "heavy",
        env: {
          STUDIO_BROWSER_SCOPE: file.startsWith("storybook-")
            ? "storybook"
            : "app",
        },
        args: [
          "exec",
          "playwright",
          "test",
          "--config",
          file.startsWith("storybook-")
            ? "playwright.storybook.config.ts"
            : "playwright.config.ts",
          `tests/e2e/${file}`,
          "--workers=1",
          "--retries=0",
          "--max-failures=1",
        ],
      }),
    );
}

export const packageBuildCheck: CheckCommand = {
  id: "package-build",
  kind: "build",
  scope: "project",
  resources: "heavy",
  command: "pnpm",
  args: ["run", "build:raw"],
  requires: ["analysis-wasm-build-sdk"],
};

export const runnerTypeCheck: CheckCommand = {
  id: "runner-types",
  command: process.execPath,
  args: [
    "--import",
    "tsx",
    "scripts/checkTestTypes.ts",
    "--focused",
    "scripts/checkRunner.ts",
    "scripts/checkResources.ts",
    "scripts/checkInventory.ts",
    "scripts/checks.ts",
  ],
  env: { TSX_TSCONFIG_PATH: join(studioRoot, "tsconfig.app.json") },
  scope: "element",
  resources: "heavy",
  kind: "typing",
};
