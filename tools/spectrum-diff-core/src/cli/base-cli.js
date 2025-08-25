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
import { HandlebarsFormatter } from "../formatters/handlebars-formatter.js";
import { storeOutput } from "../formatters/output-store.js";
import { isString } from "../core/helpers.js";

const red = chalk.hex("F37E7E");

/**
 * Base CLI class for diff tools
 */
export class BaseCLI {
  constructor(options = {}) {
    this.toolName = options.toolName || "diff";
    this.dataType = options.dataType || "data";
    this.version = options.version || "1.0.0";
    this.description =
      options.description || "Generate diffs between data sets";
    this.packagePath = options.packagePath || "packages/data/src";
    this.manifestFile = options.manifestFile || null;

    // Short flags for CLI options
    this.oldVersionFlag = options.oldVersionFlag || "otv";
    this.newVersionFlag = options.newVersionFlag || "ntv";
    this.oldBranchFlag = options.oldBranchFlag || "otb";
    this.newBranchFlag = options.newBranchFlag || "ntb";
    this.fileNamesFlag = options.fileNamesFlag || "n";
  }

  /**
   * Validates and normalizes CLI options
   * @param {object} options - Raw CLI options
   * @returns {object} Normalized options with defaults
   */
  normalizeOptions(options) {
    return {
      oldVersion: options.oldVersion || options[this.oldVersionFlag],
      newVersion: options.newVersion || options[this.newVersionFlag],
      oldBranch: options.oldBranch || options[this.oldBranchFlag],
      newBranch: options.newBranch || options[this.newBranchFlag],
      fileNames: options.fileNames || options[this.fileNamesFlag],
      local: options.local || options.l,
      repo: options.repo || options.r,
      githubAPIKey: options.githubAPIKey || options.g,
      format: options.format || options.f || "cli",
      template: options.template || options.t,
      templateDir: options.templateDir,
      output: options.output || options.o,
      debug: options.debug || options.d,
    };
  }

  /**
   * Determines the file loading strategy based on options
   * @param {object} options - Normalized CLI options
   * @returns {string} Strategy type: 'local-remote', 'remote-local', 'local-only', 'remote-remote'
   */
  determineStrategy(options) {
    if (options.local && (options.newBranch || options.newVersion)) {
      return "local-remote";
    } else if (options.local && (options.oldBranch || options.oldVersion)) {
      return "remote-local";
    } else if (options.local) {
      return "local-only";
    }
    return "remote-remote";
  }

  /**
   * Creates formatter configuration based on options
   * @param {object} options - CLI options
   * @returns {object} Formatter configuration
   */
  createFormatterConfig(options) {
    switch (options.format) {
      case "markdown":
        return {
          type: "handlebars",
          options: { template: "markdown", dataType: this.dataType },
        };
      case "handlebars": {
        const handlebarsOptions = { dataType: this.dataType };
        if (options.template) handlebarsOptions.template = options.template;
        if (options.templateDir) {
          handlebarsOptions.templateDir = options.templateDir;
        }
        return {
          type: "handlebars",
          options: handlebarsOptions,
        };
      }
      case "cli":
      default:
        return {
          type: "handlebars",
          options: { template: "cli", dataType: this.dataType },
        };
    }
  }

  /**
   * Formats diff result using specified formatter
   * @param {object} diffResult - Raw diff result
   * @param {object} formatterConfig - Formatter configuration
   * @param {object} options - CLI options
   * @returns {Promise<string>} Formatted output
   */
  async formatResult(diffResult, formatterConfig, options) {
    try {
      if (formatterConfig.type === "handlebars") {
        const formatter = new HandlebarsFormatter(formatterConfig.options);
        return await formatter.format(diffResult, options);
      }

      // Default to JSON if no formatter specified
      return JSON.stringify(diffResult, null, 2);
    } catch (error) {
      throw new Error(`Formatting failed: ${error.message}`);
    }
  }

  /**
   * Handles output (console or file)
   * @param {string} formattedResult - Formatted diff result
   * @param {object} options - CLI options
   * @param {object} diffResult - Raw diff result for debug output
   */
  async handleOutput(formattedResult, options, diffResult) {
    try {
      // Store debug output if requested
      if (options.debug) {
        const debugPath = isString(options.debug)
          ? options.debug
          : "debug-output.json";
        await storeOutput(JSON.stringify(diffResult, null, 2), debugPath);
        console.log(chalk.dim(`Debug output saved to: ${debugPath}`));
      }

      // Store main output
      if (options.output) {
        await storeOutput(formattedResult, options.output);
        console.log(chalk.green(`Output saved to: ${options.output}`));
      } else {
        console.log(formattedResult);
      }
    } catch (error) {
      console.error(red(`Failed to handle output: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Creates the base command structure
   * @returns {Command} Commander.js command
   */
  createCommand() {
    const program = new Command();

    program
      .name(this.toolName)
      .description(this.description)
      .version(this.version);

    // Add the report command
    program
      .command("report")
      .description(`Generate a diff report for ${this.dataType}`)
      .option(
        `--${this.oldVersionFlag}, --old-${this.dataType}-version <oldVersion>`,
        `github tag to pull old ${this.dataType} from`,
      )
      .option(
        `--${this.newVersionFlag}, --new-${this.dataType}-version <newVersion>`,
        `github tag to pull new ${this.dataType} from`,
      )
      .option(
        `--${this.oldBranchFlag}, --old-${this.dataType}-branch <oldBranch>`,
        `branch to fetch old ${this.dataType} data from`,
      )
      .option(
        `--${this.newBranchFlag}, --new-${this.dataType}-branch <newBranch>`,
        `branch to fetch new ${this.dataType} data from`,
      )
      .option(
        "-l, --local <path>",
        `local path within repository to fetch ${this.dataType} data from`,
      )
      .option(
        `-${this.fileNamesFlag}, --file-names <files...>`,
        `indicates specific files to compare`,
      )
      .option("-r, --repo <repo>", "git repo to use if you want to use a fork")
      .option(
        "-g, --githubAPIKey <key>",
        "github api key to use when fetching from github",
      )
      .option(
        "-f, --format <format>",
        "choose result format cli (default), markdown, or handlebars",
        "cli",
      )
      .option(
        "-t, --template <template>",
        "template name for handlebars format (default, json, plain)",
      )
      .option(
        "--template-dir <dir>",
        "custom template directory for handlebars format",
      )
      .option(
        "-o, --output <path>",
        "choose where to store result output, if available",
      )
      .option(
        "-d, --debug [path]",
        "optional path to store unformatted result output",
      );

    return program;
  }

  /**
   * Validates required options for the given strategy
   * @param {object} options - Normalized CLI options
   * @param {string} strategy - Loading strategy
   * @throws {Error} If validation fails
   */
  validateOptions(options, strategy) {
    switch (strategy) {
      case "remote-remote":
        if (!options.oldVersion && !options.oldBranch) {
          throw new Error(
            `Old ${this.dataType} version or branch must be specified for remote comparison`,
          );
        }
        if (!options.newVersion && !options.newBranch) {
          throw new Error(
            `New ${this.dataType} version or branch must be specified for remote comparison`,
          );
        }
        break;
      case "local-remote":
        if (!options.local) {
          throw new Error(
            "Local path must be specified for local-remote comparison",
          );
        }
        if (!options.newVersion && !options.newBranch) {
          throw new Error(
            `New ${this.dataType} version or branch must be specified for local-remote comparison`,
          );
        }
        break;
      case "remote-local":
        if (!options.local) {
          throw new Error(
            "Local path must be specified for remote-local comparison",
          );
        }
        if (!options.oldVersion && !options.oldBranch) {
          throw new Error(
            `Old ${this.dataType} version or branch must be specified for remote-local comparison`,
          );
        }
        break;
      case "local-only":
        if (!options.local) {
          throw new Error(
            "Local path must be specified for local-only comparison",
          );
        }
        break;
    }
  }

  /**
   * Error handler for CLI operations
   * @param {Error} error - Error to handle
   * @param {string} operation - Operation that failed
   */
  handleError(error, operation = "operation") {
    console.error(red(`${operation} failed:`));
    console.error(red(error.message));

    if (process.env.NODE_ENV === "development") {
      console.error(red(error.stack));
    }

    process.exit(1);
  }
}
