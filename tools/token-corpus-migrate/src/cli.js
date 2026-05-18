#!/usr/bin/env node

/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { glob } from "glob";
import { transformFile } from "./transform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const PILOT_FILES = ["color-palette.json", "typography.json"];

const program = new Command();

program
  .name("token-corpus-migrate")
  .description(
    "Inject structured name objects into Spectrum token source files",
  )
  .version(version)
  .option(
    "--root <dir>",
    "Directory containing *.json token source files",
    process.cwd(),
  )
  .option("--write", "Apply changes to disk (default: dry-run)", false)
  .option(
    "--report <path>",
    "Write a Markdown summary to this file (default: stdout)",
  )
  .option(
    "--all",
    "Process all *.tokens.json files (default: pilot scope only)",
    false,
  )
  .action(async (options) => {
    const root = resolve(options.root);
    const overridesPath = resolve(__dirname, "overrides.json");
    const { overrides } = JSON.parse(readFileSync(overridesPath, "utf8"));

    let files;
    if (options.all) {
      files = await glob("**/*.tokens.json", { cwd: root, absolute: true });
    } else {
      files = PILOT_FILES.map((f) => resolve(root, f)).filter((f) => {
        try {
          readFileSync(f);
          return true;
        } catch {
          return false;
        }
      });
    }

    if (files.length === 0) {
      console.error(`No token files found under ${root}`);
      process.exitCode = 1;
      return;
    }

    const lines = [
      `# token-corpus-migrate report\n`,
      `**Mode:** ${options.write ? "write" : "dry-run"}\n`,
    ];
    let totalClassified = 0;
    let totalUnclassified = 0;

    for (const filePath of files) {
      const raw = readFileSync(filePath, "utf8");
      const tokens = JSON.parse(raw);
      const { transformed, classified, unclassified, skipped } = transformFile(
        tokens,
        overrides,
      );

      totalClassified += classified;
      totalUnclassified += unclassified.length;

      lines.push(`## ${filePath.replace(root + "/", "")}\n`);
      lines.push(`- Classified: ${classified}`);
      lines.push(`- Skipped (out of scope): ${skipped}`);
      lines.push(
        `- Unclassified (add to overrides.json): ${unclassified.length}\n`,
      );

      if (unclassified.length > 0) {
        lines.push("### Unclassified tokens\n");
        lines.push("| Token key | $schema |");
        lines.push("|---|---|");
        for (const key of unclassified) {
          const schema = tokens[key]?.["$schema"]?.split("/").pop() ?? "—";
          lines.push(`| \`${key}\` | ${schema} |`);
        }
        lines.push("");
      }

      if (options.write && classified > 0) {
        writeFileSync(
          filePath,
          JSON.stringify(transformed, null, 2) + "\n",
          "utf8",
        );
        lines.push(`_Written to disk._\n`);
      }
    }

    lines.push(`## Summary\n`);
    lines.push(`- Total classified: ${totalClassified}`);
    lines.push(`- Total unclassified: ${totalUnclassified}`);

    const report = lines.join("\n");

    if (options.report) {
      writeFileSync(resolve(options.report), report, "utf8");
      console.log(`Report written to ${options.report}`);
    } else {
      console.log(report);
    }

    if (totalUnclassified > 0) {
      process.exitCode = 1;
    }
  });

program.parse();
