#!/usr/bin/env node

/**
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Command } from "commander";
import chalk from "chalk";
import { lintChangeset, lintAllChangesets } from "./index.js";

const program = new Command();

program
  .name("changeset-lint")
  .description("Lint changeset files for conciseness and proper format")
  .version("1.0.0");

program
  .command("check")
  .description("Lint all changeset files")
  .option("-d, --dir <directory>", "Changeset directory", ".changeset")
  .option("--fail-on-warnings", "Exit with error code on warnings")
  .action(async (options) => {
    try {
      const results = await lintAllChangesets(options.dir);

      if (results.length === 0) {
        console.log(chalk.green("✓ No changeset files found to lint"));
        return;
      }

      let hasErrors = false;
      let hasWarnings = false;

      for (const result of results) {
        const fileName = result.filePath.split("/").pop();

        if (result.errors.length > 0) {
          console.log(chalk.red(`✗ ${fileName}`));
          result.errors.forEach((error) => {
            console.log(chalk.red(`  Error: ${error}`));
          });
          hasErrors = true;
        } else if (result.warnings.length > 0) {
          console.log(chalk.yellow(`⚠ ${fileName}`));
          result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`  Warning: ${warning}`));
          });
          hasWarnings = true;
        } else {
          console.log(chalk.green(`✓ ${fileName}`));
        }
      }

      // Summary
      const total = results.length;
      const valid = results.filter((r) => r.isValid).length;
      const withWarnings = results.filter((r) => r.warnings.length > 0).length;

      console.log();
      console.log(`Checked ${total} changeset file${total > 1 ? "s" : ""}`);
      console.log(
        `${chalk.green(valid)} valid, ${chalk.yellow(withWarnings)} with warnings, ${chalk.red(total - valid)} with errors`,
      );

      if (hasErrors || (options.failOnWarnings && hasWarnings)) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("check-file <file>")
  .description("Lint a specific changeset file")
  .action((file) => {
    try {
      const result = lintChangeset(file);
      const fileName = file.split("/").pop();

      if (result.errors.length > 0) {
        console.log(chalk.red(`✗ ${fileName}`));
        result.errors.forEach((error) => {
          console.log(chalk.red(`  Error: ${error}`));
        });
        process.exit(1);
      } else if (result.warnings.length > 0) {
        console.log(chalk.yellow(`⚠ ${fileName}`));
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`  Warning: ${warning}`));
        });
      } else {
        console.log(chalk.green(`✓ ${fileName}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
