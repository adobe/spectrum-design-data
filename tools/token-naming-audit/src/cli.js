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

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Command } from "commander";
import { scanStringNames } from "./scan-string-names.js";
import { scanPropertyValues } from "./scan-property-values.js";
import { renderReport } from "./report.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("token-naming-audit")
  .description(
    "Audit *.tokens.json files for string-name debt and overloaded property values",
  )
  .version(version)
  .option(
    "--root <dir>",
    "Workspace root to scan for *.tokens.json files",
    process.cwd(),
  )
  .option(
    "--output <path>",
    "Write the Markdown report to this file (default: stdout)",
  )
  .option("--format <format>", "Output format", "markdown")
  .action(async (options) => {
    const root = resolve(options.root);

    try {
      const [stringNames, propertyValues] = await Promise.all([
        scanStringNames(root),
        scanPropertyValues(root),
      ]);

      const report = renderReport(stringNames, propertyValues);

      if (options.output) {
        writeFileSync(resolve(options.output), report, "utf-8");
        const unrecorded = stringNames.filter(
          (r) => r.status === "unrecorded",
        ).length;
        console.error(
          `Wrote report to ${options.output} ` +
            `(${stringNames.length} string-name tokens, ` +
            `${unrecorded} unrecorded; ` +
            `${propertyValues.length} overloaded property values)`,
        );
      } else {
        process.stdout.write(report + "\n");
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
