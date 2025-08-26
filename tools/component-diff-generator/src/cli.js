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

import componentDiff from "./lib/component-diff.js";
import { ComponentLoader } from "./lib/component-file-import.js";
import packageJson from "../package.json" with { type: "json" };

const red = chalk.hex("F37E7E");
const { version } = packageJson;

// Create CLI program
const program = new Command();

program
  .name("sdiff")
  .description("CLI for Spectrum component schema diff generator")
  .version(version);

program
  .command("report")
  .description("Generates a diff report for component schemas")
  .option("-f, --format <format>", "Output format (cli, markdown, json)", "cli")
  .option("-o, --output <file>", "Output file path")
  .option("--breaking-only", "Show only breaking changes")
  .option("--local <dir>", "Local component schemas directory for comparison")
  .option("--repo <repo>", "Repository in owner/repo format")
  .option("--github-token <token>", "GitHub API token")
  .option(
    "--osv, --old-schema-version <version>",
    "Old component schema version (GitHub tag)",
  )
  .option(
    "--nsv, --new-schema-version <version>",
    "New component schema version (GitHub tag)",
  )
  .option("--osb, --old-schema-branch <branch>", "Old component schema branch")
  .option("--nsb, --new-schema-branch <branch>", "New component schema branch")
  .action(async (options) => {
    try {
      const loader = new ComponentLoader();

      console.log(chalk.blue("Loading component schemas..."));

      let originalData, updatedData;

      // Normalize options (support both new and legacy names)
      const oldVersion = options.oldSchemaVersion || options.osv;
      const newVersion = options.newSchemaVersion || options.nsv;
      const oldBranch = options.oldSchemaBranch || options.osb;
      const newBranch = options.newSchemaBranch || options.nsb;
      const localDir = options.local || "packages/component-schemas";

      // Determine loading strategy
      if ((oldVersion || oldBranch) && (newVersion || newBranch)) {
        // Remote-to-remote comparison
        const oldRef = oldVersion || oldBranch;
        const newRef = newVersion || newBranch;
        console.log(chalk.blue(`Comparing ${oldRef} → ${newRef} (remote)`));

        originalData = await loader.loadRemoteComponents(
          null, // fileNames
          oldVersion ? oldVersion : "latest", // version
          oldVersion ? oldVersion : oldBranch, // location
          options.repo,
          options.githubToken,
        );
        updatedData = await loader.loadRemoteComponents(
          null, // fileNames
          newVersion ? newVersion : "latest", // version
          newVersion ? newVersion : newBranch, // location
          options.repo,
          options.githubToken,
        );
      } else if (oldVersion || oldBranch) {
        // Remote-to-local comparison
        const oldRef = oldVersion || oldBranch;
        console.log(
          chalk.blue(`Comparing ${oldRef} (remote) → ${localDir} (local)`),
        );

        originalData = await loader.loadRemoteComponents(
          null, // fileNames
          oldVersion ? oldVersion : "latest", // version
          oldVersion ? oldVersion : oldBranch, // location
          options.repo,
          options.githubToken,
        );
        updatedData = await loader.loadLocalComponents(localDir);
      } else if (newVersion || newBranch) {
        // Local-to-remote comparison
        const newRef = newVersion || newBranch;
        console.log(
          chalk.blue(`Comparing ${localDir} (local) → ${newRef} (remote)`),
        );

        originalData = await loader.loadLocalComponents(localDir);
        updatedData = await loader.loadRemoteComponents(
          null, // fileNames
          newVersion ? newVersion : "latest", // version
          newVersion ? newVersion : newBranch, // location
          options.repo,
          options.githubToken,
        );
      } else {
        // Local-only comparison (current working vs staged/committed)
        console.log(chalk.blue(`Comparing local schemas in ${localDir}`));
        originalData = await loader.loadLocalComponents(localDir);
        updatedData = await loader.loadLocalComponents(localDir);
      }

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
    const output = JSON.stringify(diffResult, null, 2);
    console.log(output);
    if (options.output) {
      const fs = await import("fs/promises");
      await fs.writeFile(options.output, output);
      console.log(chalk.blue(`Report saved to: ${options.output}`));
    }
  } else if (format === "markdown") {
    const output = generateMarkdownReport(diffResult);
    console.log(output);
    if (options.output) {
      const fs = await import("fs/promises");
      await fs.writeFile(options.output, output);
      console.log(chalk.blue(`Report saved to: ${options.output}`));
    }
  } else {
    console.error(red(`Unsupported format: ${format}`));
    process.exit(1);
  }
}

/**
 * Generate markdown report from diff result
 */
function generateMarkdownReport(diffResult) {
  let markdown = "";

  // Check if there are any changes at all
  const hasAnyChanges =
    (diffResult.changes.added &&
      Object.keys(diffResult.changes.added).length > 0) ||
    (diffResult.changes.deleted &&
      Object.keys(diffResult.changes.deleted).length > 0) ||
    (diffResult.changes.updated?.breaking &&
      Object.keys(diffResult.changes.updated.breaking).length > 0) ||
    (diffResult.changes.updated?.nonBreaking &&
      Object.keys(diffResult.changes.updated.nonBreaking).length > 0);

  if (!hasAnyChanges) {
    return "No component schema changes detected.";
  }

  // Header with breaking change status
  if (diffResult.summary.hasBreakingChanges) {
    markdown += "# 🚨 Component Schema Changes - Breaking Changes Detected\n\n";
    markdown += `**⚠️ This PR introduces ${diffResult.summary.breakingChanges} breaking change(s) to component schemas.**\n\n`;
  } else {
    markdown += "# 🧩 Component Schema Changes - No Breaking Changes\n\n";
  }

  // Summary table
  markdown += "## Summary\n\n";
  markdown += "| Change Type | Count |\n";
  markdown += "|-------------|-------|\n";
  markdown += `| Added Components | ${Object.keys(diffResult.changes.added || {}).length} |\n`;
  markdown += `| Deleted Components | ${Object.keys(diffResult.changes.deleted || {}).length} |\n`;
  markdown += `| Updated Components | ${Object.keys(diffResult.changes.updated?.breaking || {}).length + Object.keys(diffResult.changes.updated?.nonBreaking || {}).length} |\n`;
  markdown += `| **Breaking Changes** | **${diffResult.summary.breakingChanges || 0}** |\n`;
  markdown += `| Non-Breaking Changes | ${diffResult.summary.nonBreakingChanges || 0} |\n\n`;

  // Detailed changes
  if (
    diffResult.changes.added &&
    Object.keys(diffResult.changes.added).length > 0
  ) {
    markdown += "## 📦 Added Components\n\n";
    Object.keys(diffResult.changes.added).forEach((component) => {
      markdown += `- \`${component}\` - New component schema\n`;
    });
    markdown += "\n";
  }

  if (
    diffResult.changes.deleted &&
    Object.keys(diffResult.changes.deleted).length > 0
  ) {
    markdown += "## ❌ Deleted Components ⚠️ **BREAKING**\n\n";
    Object.keys(diffResult.changes.deleted).forEach((component) => {
      markdown += `- \`${component}\` - Component schema removed\n`;
    });
    markdown += "\n";
  }

  if (
    diffResult.changes.updated?.breaking &&
    Object.keys(diffResult.changes.updated.breaking).length > 0
  ) {
    markdown += "## 💥 Breaking Updates ⚠️ **BREAKING**\n\n";
    Object.keys(diffResult.changes.updated.breaking).forEach((component) => {
      markdown += `- \`${component}\` - Schema changes that break backward compatibility\n`;
    });
    markdown += "\n";
  }

  if (
    diffResult.changes.updated?.nonBreaking &&
    Object.keys(diffResult.changes.updated.nonBreaking).length > 0
  ) {
    markdown += "## 🔄 Non-Breaking Updates\n\n";
    Object.keys(diffResult.changes.updated.nonBreaking).forEach((component) => {
      markdown += `- \`${component}\` - Compatible schema changes\n`;
    });
    markdown += "\n";
  }

  // Footer
  markdown += "---\n\n";
  if (diffResult.summary.hasBreakingChanges) {
    markdown += "### ⚠️ Breaking Change Guidelines\n\n";
    markdown += "When introducing breaking changes:\n";
    markdown +=
      "1. **Version bump**: Ensure this triggers a major version bump\n";
    markdown += "2. **Migration guide**: Document how consumers should adapt\n";
    markdown +=
      "3. **Deprecation**: Consider deprecating before removing when possible\n";
    markdown += "4. **Communication**: Notify affected teams of the changes\n";
  } else {
    markdown +=
      "*This diff was generated automatically and contains only backward-compatible changes.*\n";
  }

  return markdown;
}

// Parse arguments and run
program.parse();
