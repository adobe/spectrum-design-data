// Copyright 2026 Adobe. All rights reserved.
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckCommand } from "./checkRunner";

export const studioRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const testHelpers = ["typography-fixtures.ts"];

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
  const tsx = (id: string, args: string[]) =>
    pnpm(id, ["tsx", "--tsconfig", "tsconfig.app.json", ...args]);
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
  return [
    pnpm("app-types", ["tsc", "--project", "tsconfig.app.json", "--noEmit"]),
    pnpm("tooling-types", [
      "tsc",
      "--project",
      "tsconfig.node.json",
      "--noEmit",
    ]),
    ...typeChecks,
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
      return file === "data-vis-export.ts"
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
    pnpm("production-build", [
      "vite",
      "build",
      "--outDir",
      join(outputDirectory, "production"),
    ]),
    pnpm("storybook-build", [
      "storybook",
      "build",
      "--disable-telemetry",
      "--output-dir",
      join(outputDirectory, "storybook"),
    ]),
  ];
}
