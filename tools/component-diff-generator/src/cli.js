#!/usr/bin/env node
/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { Command } from "commander";
import chalk from "chalk";
import { HandlebarsFormatter } from "@adobe/spectrum-diff-core";
import componentDiff from "./lib/component-diff.js";
import { ComponentLoader } from "./lib/component-file-import.js";
import packageJson from "../package.json" with { type: "json" };

const red = chalk.hex("F37E7E");
const version = packageJson.version;

// Create CLI program
const program = new Command();

program
  .name("cdiff")
  .description("Generate diff reports for Spectrum component schema changes")
  .version(version)
  .option("-f, --format <format>", "Output format (cli, markdown, json)", "cli")
  .option("-o, --output <file>", "Output file path")
  .option("--breaking-only", "Show only breaking changes")
  .option("--original-dir <dir>", "Original component schemas directory")
  .option("--updated-dir <dir>", "Updated component schemas directory")
  .action(async (options) => {
    try {
      const loader = new ComponentLoader();

      // For now, just do a simple local-to-local comparison
      const originalDir = options.originalDir || "packages/component-schemas";
      const updatedDir = options.updatedDir || "packages/component-schemas";

      console.log(chalk.blue("Loading component schemas..."));

      // Load current schemas (this is a placeholder - in real usage you'd compare versions)
      const originalData = await loader.loadLocalComponents(originalDir);
      const updatedData = await loader.loadLocalComponents(updatedDir);

      console.log(chalk.blue("Analyzing changes..."));

      // Generate diff
      let diffResult = componentDiff(originalData, updatedData);

      // Filter to only breaking changes if requested
      if (options.breakingOnly) {
        diffResult = filterBreakingChanges(diffResult);
      }

      // Format and output result
      await outputResult(diffResult, options);
    } catch (error) {
      console.error(red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Filter result to show only breaking changes
 */
function filterBreakingChanges(diffResult) {
  return {
    summary: {
      hasBreakingChanges: diffResult.summary.hasBreakingChanges,
      totalComponents: {
        deleted: diffResult.summary.totalComponents.deleted,
        updated: Object.keys(diffResult.changes.updated.breaking || {}).length,
      },
      breakingChanges: diffResult.summary.breakingChanges,
      nonBreakingChanges: 0,
    },
    changes: {
      deleted: diffResult.changes.deleted,
      updated: {
        breaking: diffResult.changes.updated.breaking,
      },
    },
  };
}

/**
 * Output the result in the specified format
 */
async function outputResult(diffResult, options) {
  const format = options.format || "cli";

  if (format === "cli") {
    // Simple CLI output
    if (diffResult.summary.hasBreakingChanges) {
      console.log(red("🚨 BREAKING CHANGES DETECTED"));
    } else {
      console.log(chalk.green("✅ No Breaking Changes"));
    }

    console.log(chalk.bold("\nComponent Schema Diff Report"));
    console.log(`Breaking Changes: ${diffResult.summary.breakingChanges || 0}`);
    console.log(
      `Non-Breaking Changes: ${diffResult.summary.nonBreakingChanges || 0}`,
    );

    if (
      diffResult.changes.added &&
      Object.keys(diffResult.changes.added).length > 0
    ) {
      console.log(chalk.green("\n📦 Added Components:"));
      Object.keys(diffResult.changes.added).forEach((component) => {
        console.log(chalk.green(`  + ${component}`));
      });
    }

    if (
      diffResult.changes.deleted &&
      Object.keys(diffResult.changes.deleted).length > 0
    ) {
      console.log(red("\n❌ Deleted Components (BREAKING):"));
      Object.keys(diffResult.changes.deleted).forEach((component) => {
        console.log(red(`  - ${component}`));
      });
    }

    if (
      diffResult.changes.updated?.breaking &&
      Object.keys(diffResult.changes.updated.breaking).length > 0
    ) {
      console.log(red("\n💥 Breaking Updates:"));
      Object.keys(diffResult.changes.updated.breaking).forEach((component) => {
        console.log(red(`  ~ ${component}`));
      });
    }

    if (
      diffResult.changes.updated?.nonBreaking &&
      Object.keys(diffResult.changes.updated.nonBreaking).length > 0
    ) {
      console.log(chalk.yellow("\n🔄 Non-Breaking Updates:"));
      Object.keys(diffResult.changes.updated.nonBreaking).forEach(
        (component) => {
          console.log(chalk.yellow(`  ~ ${component}`));
        },
      );
    }
  } else if (format === "json") {
    console.log(JSON.stringify(diffResult, null, 2));
  } else {
    console.error(red(`Unsupported format: ${format}`));
    process.exit(1);
  }
}

// Parse arguments and run
program.parse();
