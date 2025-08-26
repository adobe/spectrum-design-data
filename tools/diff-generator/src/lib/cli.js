#! /usr/bin/env node

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

import tokenDiff from "./index.js";
import fileImport, { loadLocalData } from "./file-import.js";
import { Command } from "commander";
import chalk from "chalk";
import { HandlebarsFormatter } from "./formatterHandlebars.js";
import storeOutput from "./store-output.js";
import packageJson from "../../package.json" with { type: "json" };

const red = chalk.hex("F37E7E");
const { version } = packageJson;

// ===== PHASE 1: PURE UTILITY FUNCTIONS (easily testable) =====

/**
 * Validates and normalizes CLI options
 * @param {object} options - Raw CLI options
 * @returns {object} Normalized options with defaults
 */
export function normalizeOptions(options) {
  return {
    oldTokenVersion: options.oldTokenVersion || options.otv,
    newTokenVersion: options.newTokenVersion || options.ntv,
    oldTokenBranch: options.oldTokenBranch || options.otb,
    newTokenBranch: options.newTokenBranch || options.ntb,
    tokenNames: options.tokenNames || options.n,
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
export function determineStrategy(options) {
  if (options.local && (options.newTokenBranch || options.newTokenVersion)) {
    return "local-remote";
  } else if (
    options.local &&
    (options.oldTokenBranch || options.oldTokenVersion)
  ) {
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
export function createFormatterConfig(options) {
  switch (options.format) {
    case "markdown":
      return {
        type: "handlebars",
        options: { template: "markdown" },
      };
    case "handlebars": {
      const handlebarsOptions = {};
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
        options: { template: "cli" },
      };
  }
}

/**
 * Validates output configuration
 * @param {object} options - CLI options
 * @param {object} formatterConfig - Formatter configuration object
 * @returns {object} Validation result with errors if any
 */
export function validateOutputConfig(options, formatterConfig) {
  const errors = [];

  // Check if trying to output CLI format to file (CLI template should be interactive only)
  if (
    options.output &&
    formatterConfig.type === "handlebars" &&
    formatterConfig.options.template === "cli"
  ) {
    errors.push(
      "Need to specify a supported format to write the result to a file.",
    );
  }

  // Check for unsupported formats
  if (
    options.format &&
    !["cli", "markdown", "handlebars"].includes(options.format)
  ) {
    errors.push("Need to specify a supported format.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ===== PHASE 2: DEPENDENCY-INJECTED SERVICE CLASSES =====

/**
 * Handles file resolution with dependency injection
 */
export class FileResolver {
  constructor(fileImportFn = fileImport, loadLocalDataFn = loadLocalData) {
    this.fileImport = fileImportFn;
    this.loadLocalData = loadLocalDataFn;
  }

  /**
   * Resolves files based on strategy and options
   * @param {string} strategy - File loading strategy
   * @param {object} options - CLI options
   * @param {string} githubAPIKey - GitHub API key
   * @returns {Promise<Array>} Array of file data [oldFile, newFile]
   */
  async resolveFiles(strategy, options, githubAPIKey) {
    switch (strategy) {
      case "local-remote":
        return await Promise.all([
          this.loadLocalData(options.local, options.tokenNames),
          this.fileImport(
            options.tokenNames,
            options.newTokenVersion,
            options.newTokenBranch,
            options.repo,
            githubAPIKey,
          ),
        ]);

      case "remote-local":
        return await Promise.all([
          this.fileImport(
            options.tokenNames,
            options.oldTokenVersion,
            options.oldTokenBranch,
            options.repo,
            githubAPIKey,
          ),
          this.loadLocalData(options.local, options.tokenNames),
        ]);

      case "local-only": {
        const localData = await this.loadLocalData(
          options.local,
          options.tokenNames,
        );
        return [localData];
      }

      case "remote-remote":
        return await Promise.all([
          this.fileImport(
            options.tokenNames,
            options.oldTokenVersion,
            options.oldTokenBranch,
            options.repo,
            githubAPIKey,
          ),
          this.fileImport(
            options.tokenNames,
            options.newTokenVersion,
            options.newTokenBranch,
            options.repo,
            githubAPIKey,
          ),
        ]);

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }
}

/**
 * Handles report formatting with dependency injection
 */
export class ReportFormatter {
  constructor(formatters = { handlebars: HandlebarsFormatter }) {
    this.formatters = formatters;
  }

  /**
   * Creates a formatter instance based on configuration
   * @param {object} config - Formatter configuration
   * @returns {object} Formatter instance and output function
   */
  createFormatter(config) {
    const reportOutput = [];
    let formatter;
    let outputFunction;

    // All formats now use Handlebars templates
    formatter = new this.formatters.handlebars(config.options);
    outputFunction = (input) => reportOutput.push(input);

    return {
      formatter,
      outputFunction,
      getOutput: () => reportOutput.join("\n").replaceAll("\n\n", "\n"),
    };
  }
}

/**
 * Handles output operations with dependency injection
 */
export class OutputManager {
  constructor(storeOutputFn = storeOutput, logger = console) {
    this.storeOutput = storeOutputFn;
    this.logger = logger;
  }

  /**
   * Handles debug output
   * @param {string} debugPath - Path to store debug output
   * @param {object} result - Result data to store
   */
  handleDebugOutput(debugPath, result) {
    if (debugPath) {
      this.storeOutput(debugPath, JSON.stringify(result, null, 2));
    }
  }

  /**
   * Handles final output based on configuration
   * @param {string} output - Generated output content
   * @param {object} options - CLI options
   * @param {function} outputFunction - Output function used
   */
  handleFinalOutput(output, options, outputFunction) {
    if (outputFunction && outputFunction !== console.log) {
      if (options.output) {
        this.storeOutput(options.output, output);
      } else {
        this.logger.log(output);
      }
    }
  }

  /**
   * Handles validation errors
   * @param {Array} errors - Array of error messages
   */
  handleValidationErrors(errors) {
    errors.forEach((error) => {
      this.logger.log(red(error));
    });
  }
}

// ===== PHASE 3: MAIN APPLICATION CLASS =====

/**
 * Main CLI application coordinator
 */
export class CLIApplication {
  constructor(
    fileResolver = new FileResolver(),
    reportFormatter = new ReportFormatter(),
    outputManager = new OutputManager(),
    tokenDiffFn = tokenDiff,
  ) {
    this.fileResolver = fileResolver;
    this.reportFormatter = reportFormatter;
    this.outputManager = outputManager;
    this.tokenDiff = tokenDiffFn;
  }

  /**
   * Executes the main CLI workflow
   * @param {object} rawOptions - Raw CLI options
   * @param {string} githubAPIKey - GitHub API key
   * @returns {Promise<number>} Exit code
   */
  async execute(rawOptions, githubAPIKey) {
    try {
      const options = normalizeOptions(rawOptions);
      const strategy = determineStrategy(options);
      const formatterConfig = createFormatterConfig(options);

      // Validate configuration
      const validation = validateOutputConfig(options, formatterConfig);
      if (!validation.isValid) {
        this.outputManager.handleValidationErrors(validation.errors);
        return 1;
      }

      // Resolve files
      const files = await this.fileResolver.resolveFiles(
        strategy,
        options,
        githubAPIKey,
      );

      // Generate diff
      const result = this.tokenDiff(files[0], files[1]);

      // Handle debug output
      this.outputManager.handleDebugOutput(options.debug, result);

      // Format and output report
      const { formatter, outputFunction, getOutput } =
        this.reportFormatter.createFormatter(formatterConfig);
      const exitCode = formatter.printReport(result, outputFunction, options)
        ? 0
        : 1;

      // Handle final output
      if (outputFunction !== console.log) {
        this.outputManager.handleFinalOutput(
          getOutput(),
          options,
          outputFunction,
        );
      }

      return exitCode;
    } catch (error) {
      // Provide context based on the type of error
      let contextualError = `Token diff operation failed: ${error.message}`;

      if (error.message.includes("Failed to load remote tokens")) {
        contextualError = `Remote token loading failed: ${error.message}`;
      } else if (
        error.message.includes("Failed to load") ||
        error.message.includes("Token file not found")
      ) {
        contextualError = `Local file access failed: ${error.message}`;
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("Network")
      ) {
        contextualError = `Network error occurred: ${error.message}`;
      } else if (error.message.includes("JSON")) {
        contextualError = `Data parsing error: ${error.message}`;
      } else if (error.message.includes("Template not found")) {
        contextualError = `Template formatting error: ${error.message}`;
      }

      console.error(contextualError);
      return 1;
    }
  }
}

/**
 * Creates and configures the Commander program
 * @param {CLIApplication} app - Application instance
 * @param {string} apiKey - GitHub API key
 * @returns {Command} Configured commander program
 */
export function createProgram(app) {
  const program = new Command();

  program
    .name("tdiff")
    .description("CLI to a Spectrum token diff generator")
    .version(version);

  program
    .command("report")
    .description("Generates a diff report for two inputted schema")
    .option(
      "--otv, --old-token-version <oldVersion>",
      "indicates which github tag to pull old tokens from",
    )
    .option(
      "--ntv, --new-token-version <newVersion>",
      "indicates which github tag to pull new tokens from",
    )
    .option(
      "--otb, --old-token-branch <oldBranch>",
      "indicates which branch to fetch old token data from",
    )
    .option(
      "--ntb, --new-token-branch <newBranch>",
      "indicates which branch to fetch updated token data from",
    )
    .option(
      "-n, --token-names <tokens...>",
      "indicates specific tokens to compare",
    )
    .option("-l, --local <path>", "indicates to compare to local data")
    .option("-r, --repo <name>", "github repository to target")
    .option("-g, --githubAPIKey <key>", "github api key to use")
    .option("-f, --format <format>", "cli (default), markdown, or handlebars")
    .option(
      "-t, --template <template>",
      "template name for handlebars format (markdown, json, plain)",
    )
    .option(
      "--template-dir <dir>",
      "custom template directory for handlebars format",
    )
    .option("-o, --output <path>", "file path to store diff output")
    .option("-d, --debug <path>", "file path to store diff json")
    .action(async (options) => {
      const exitCode = await app.execute(options, options.githubAPIKey);
      process.exit(exitCode);
    });

  return program;
}

// ===== PHASE 4: BACKWARD COMPATIBILITY LAYER =====

// Create default instances for backward compatibility
const defaultApp = new CLIApplication();

/**
 * Legacy function for backward compatibility
 */
export async function determineFiles(options) {
  const normalizedOptions = normalizeOptions(options);
  const strategy = determineStrategy(normalizedOptions);
  const resolver = new FileResolver();

  return await resolver.resolveFiles(
    strategy,
    normalizedOptions,
    normalizedOptions.githubAPIKey,
  );
}

/**
 * Legacy function for backward compatibility
 */
export async function cliCheck(result, options) {
  return printReport(result, console.log, options);
}

/**
 * Legacy function for backward compatibility
 */
export function printReport(result, log, options) {
  try {
    const formatterConfig = createFormatterConfig(options);
    const validation = validateOutputConfig(options, formatterConfig);

    if (!validation.isValid) {
      validation.errors.forEach((error) => console.log(red(error)));
      return 1;
    }

    const formatter = new ReportFormatter();
    const outputManager = new OutputManager();

    outputManager.handleDebugOutput(options.debug, result);

    const {
      formatter: reportFormatter,
      outputFunction,
      getOutput,
    } = formatter.createFormatter(formatterConfig);
    const exitCode = reportFormatter.printReport(
      result,
      outputFunction,
      options,
    )
      ? 0
      : 1;

    // Handle output based on format and destination
    if (outputFunction !== console.log) {
      const output = getOutput();
      if (options.output) {
        outputManager.handleFinalOutput(output, options, outputFunction);
      } else {
        // For interactive use (no file output), send to console.log so tests can capture it
        // except for the CLI format which should call the provided log function
        if (
          formatterConfig.type === "handlebars" &&
          formatterConfig.options.template === "cli"
        ) {
          log(output);
        } else {
          console.log(output);
        }
      }
    }

    return exitCode;
  } catch (error) {
    console.error(error);
    return console.error(
      chalk.red(
        "Error: either could not format and print the result or failed along the way\n",
      ),
    );
  }
}

// Only execute CLI when run directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = createProgram(defaultApp);
  program.parse();
}
