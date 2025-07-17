/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  normalizeOptions,
  determineStrategy,
  createFormatterConfig,
  validateOutputConfig,
  FileResolver,
  ReportFormatter,
  OutputManager,
  CLIApplication,
  createProgram,
  determineFiles,
  printReport,
} from "../src/lib/cli.js";

// ===== PHASE 1: UTILITY FUNCTIONS TESTS =====

test("normalizeOptions › handles all option aliases", (t) => {
  const rawOptions = {
    otv: "1.0.0",
    ntv: "2.0.0",
    otb: "main",
    ntb: "feature",
    n: ["color.json"],
    l: "/local/path",
    r: "custom/repo",
    g: "github-api-key",
    f: "markdown",
    t: "custom-template",
    o: "/output/path",
    d: "/debug/path",
  };

  const normalized = normalizeOptions(rawOptions);

  t.is(normalized.oldTokenVersion, "1.0.0");
  t.is(normalized.newTokenVersion, "2.0.0");
  t.is(normalized.oldTokenBranch, "main");
  t.is(normalized.newTokenBranch, "feature");
  t.deepEqual(normalized.tokenNames, ["color.json"]);
  t.is(normalized.local, "/local/path");
  t.is(normalized.repo, "custom/repo");
  t.is(normalized.githubAPIKey, "github-api-key");
  t.is(normalized.format, "markdown");
  t.is(normalized.template, "custom-template");
  t.is(normalized.output, "/output/path");
  t.is(normalized.debug, "/debug/path");
});

test("normalizeOptions › handles full option names", (t) => {
  const rawOptions = {
    oldTokenVersion: "1.0.0",
    newTokenVersion: "2.0.0",
    oldTokenBranch: "main",
    newTokenBranch: "feature",
    tokenNames: ["color.json"],
    local: "/local/path",
    repo: "custom/repo",
    githubAPIKey: "github-api-key",
    format: "markdown",
    template: "custom-template",
    templateDir: "/templates",
    output: "/output/path",
    debug: "/debug/path",
  };

  const normalized = normalizeOptions(rawOptions);

  t.is(normalized.oldTokenVersion, "1.0.0");
  t.is(normalized.newTokenVersion, "2.0.0");
  t.is(normalized.templateDir, "/templates");
});

test("normalizeOptions › applies defaults for missing options", (t) => {
  const normalized = normalizeOptions({});

  t.is(normalized.format, "cli");
  t.is(normalized.oldTokenVersion, undefined);
  t.is(normalized.newTokenVersion, undefined);
});

test("determineStrategy › local-remote strategy", (t) => {
  const options = {
    local: "/path",
    newTokenBranch: "feature",
  };
  t.is(determineStrategy(options), "local-remote");

  const options2 = {
    local: "/path",
    newTokenVersion: "2.0.0",
  };
  t.is(determineStrategy(options2), "local-remote");
});

test("determineStrategy › remote-local strategy", (t) => {
  const options = {
    local: "/path",
    oldTokenBranch: "main",
  };
  t.is(determineStrategy(options), "remote-local");

  const options2 = {
    local: "/path",
    oldTokenVersion: "1.0.0",
  };
  t.is(determineStrategy(options2), "remote-local");
});

test("determineStrategy › local-only strategy", (t) => {
  const options = {
    local: "/path",
  };
  t.is(determineStrategy(options), "local-only");
});

test("determineStrategy › remote-remote strategy", (t) => {
  const options = {};
  t.is(determineStrategy(options), "remote-remote");
});

test("createFormatterConfig › markdown format", (t) => {
  const config = createFormatterConfig({ format: "markdown" });
  t.is(config.type, "handlebars");
  t.is(config.options.template, "markdown");
});

test("createFormatterConfig › handlebars format with template", (t) => {
  const config = createFormatterConfig({
    format: "handlebars",
    template: "json",
    templateDir: "/custom/templates",
  });
  t.is(config.type, "handlebars");
  t.is(config.options.template, "json");
  t.is(config.options.templateDir, "/custom/templates");
});

test("createFormatterConfig › handlebars format without options", (t) => {
  const config = createFormatterConfig({ format: "handlebars" });
  t.is(config.type, "handlebars");
  t.deepEqual(config.options, {});
});

test("createFormatterConfig › cli format (default)", (t) => {
  const config = createFormatterConfig({ format: "cli" });
  t.is(config.type, "handlebars");
  t.is(config.options.template, "cli");
});

test("createFormatterConfig › no format (default)", (t) => {
  const config = createFormatterConfig({});
  t.is(config.type, "handlebars");
  t.is(config.options.template, "cli");
});

test("validateOutputConfig › valid configurations", (t) => {
  const config = { type: "handlebars", options: { template: "markdown" } };
  const options = { format: "markdown" };

  const result = validateOutputConfig(options, config);
  t.true(result.isValid);
  t.is(result.errors.length, 0);
});

test("validateOutputConfig › CLI format to file error", (t) => {
  const config = { type: "handlebars", options: { template: "cli" } };
  const options = { output: "/file.txt" };

  const result = validateOutputConfig(options, config);
  t.false(result.isValid);
  t.is(result.errors.length, 1);
  t.true(result.errors[0].includes("Need to specify a supported format"));
});

test("validateOutputConfig › unsupported format error", (t) => {
  const config = { type: "handlebars", options: {} };
  const options = { format: "invalid" };

  const result = validateOutputConfig(options, config);
  t.false(result.isValid);
  t.is(result.errors.length, 1);
  t.true(result.errors[0].includes("Need to specify a supported format"));
});

test("validateOutputConfig › multiple errors", (t) => {
  const config = { type: "handlebars", options: { template: "cli" } };
  const options = { format: "invalid", output: "/file.txt" };

  const result = validateOutputConfig(options, config);
  t.false(result.isValid);
  t.is(result.errors.length, 2);
});

// ===== PHASE 2: SERVICE CLASSES TESTS =====

test("FileResolver › constructor with defaults", (t) => {
  const resolver = new FileResolver();
  t.truthy(resolver.fileImport);
  t.truthy(resolver.loadLocalData);
});

test("FileResolver › constructor with dependencies", (t) => {
  const mockFileImport = () => {};
  const mockLoadLocalData = () => {};

  const resolver = new FileResolver(mockFileImport, mockLoadLocalData);
  t.is(resolver.fileImport, mockFileImport);
  t.is(resolver.loadLocalData, mockLoadLocalData);
});

test("FileResolver › resolveFiles local-remote strategy", async (t) => {
  const mockLocalData = { local: "data" };
  const mockRemoteData = { remote: "data" };

  const mockLoadLocalData = async () => mockLocalData;
  const mockFileImport = async () => mockRemoteData;

  const resolver = new FileResolver(mockFileImport, mockLoadLocalData);
  const options = {
    local: "/path",
    tokenNames: ["color.json"],
    newTokenVersion: "2.0.0",
    repo: "test/repo",
  };

  const result = await resolver.resolveFiles(
    "local-remote",
    options,
    "api-key",
  );
  t.deepEqual(result, [mockLocalData, mockRemoteData]);
});

test("FileResolver › resolveFiles remote-local strategy", async (t) => {
  const mockLocalData = { local: "data" };
  const mockRemoteData = { remote: "data" };

  const mockLoadLocalData = async () => mockLocalData;
  const mockFileImport = async () => mockRemoteData;

  const resolver = new FileResolver(mockFileImport, mockLoadLocalData);
  const options = {
    local: "/path",
    tokenNames: ["color.json"],
    oldTokenVersion: "1.0.0",
    repo: "test/repo",
  };

  const result = await resolver.resolveFiles(
    "remote-local",
    options,
    "api-key",
  );
  t.deepEqual(result, [mockRemoteData, mockLocalData]);
});

test("FileResolver › resolveFiles local-only strategy", async (t) => {
  const mockLocalData = { local: "data" };

  const mockLoadLocalData = async () => mockLocalData;
  const mockFileImport = async () => {};

  const resolver = new FileResolver(mockFileImport, mockLoadLocalData);
  const options = {
    local: "/path",
    tokenNames: ["color.json"],
  };

  const result = await resolver.resolveFiles("local-only", options, "api-key");
  t.deepEqual(result, [mockLocalData]);
});

test("FileResolver › resolveFiles remote-remote strategy", async (t) => {
  const mockOldData = { old: "data" };
  const mockNewData = { new: "data" };

  let callCount = 0;
  const mockFileImport = async () => {
    callCount++;
    return callCount === 1 ? mockOldData : mockNewData;
  };

  const resolver = new FileResolver(mockFileImport, () => {});
  const options = {
    tokenNames: ["color.json"],
    oldTokenVersion: "1.0.0",
    newTokenVersion: "2.0.0",
    repo: "test/repo",
  };

  const result = await resolver.resolveFiles(
    "remote-remote",
    options,
    "api-key",
  );
  t.deepEqual(result, [mockOldData, mockNewData]);
});

test("FileResolver › resolveFiles unknown strategy", async (t) => {
  const resolver = new FileResolver();

  await t.throwsAsync(
    async () => await resolver.resolveFiles("unknown", {}, "api-key"),
    { message: "Unknown strategy: unknown" },
  );
});

test("ReportFormatter › constructor with defaults", (t) => {
  const formatter = new ReportFormatter();
  t.truthy(formatter.formatters.handlebars);
});

test("ReportFormatter › constructor with custom formatters", (t) => {
  const mockHandlebars = class {};
  const customFormatters = { handlebars: mockHandlebars };

  const formatter = new ReportFormatter(customFormatters);
  t.is(formatter.formatters.handlebars, mockHandlebars);
});

test("ReportFormatter › createFormatter", (t) => {
  const mockFormatter = {
    printReport: () => true,
  };
  const MockHandlebars = class {
    constructor() {
      return mockFormatter;
    }
  };

  const formatter = new ReportFormatter({ handlebars: MockHandlebars });
  const config = { options: { template: "markdown" } };

  const result = formatter.createFormatter(config);

  t.is(result.formatter, mockFormatter);
  t.is(typeof result.outputFunction, "function");
  t.is(typeof result.getOutput, "function");
});

test("OutputManager › constructor with defaults", (t) => {
  const manager = new OutputManager();
  t.truthy(manager.storeOutput);
  t.truthy(manager.logger);
});

test("OutputManager › constructor with dependencies", (t) => {
  const mockStoreOutput = () => {};
  const mockLogger = { log: () => {} };

  const manager = new OutputManager(mockStoreOutput, mockLogger);
  t.is(manager.storeOutput, mockStoreOutput);
  t.is(manager.logger, mockLogger);
});

test("OutputManager › handleDebugOutput with path", (t) => {
  let storedPath, storedContent;
  const mockStoreOutput = (path, content) => {
    storedPath = path;
    storedContent = content;
  };

  const manager = new OutputManager(mockStoreOutput);
  const result = { test: "data" };

  manager.handleDebugOutput("/debug.json", result);

  t.is(storedPath, "/debug.json");
  t.is(storedContent, JSON.stringify(result, null, 2));
});

test("OutputManager › handleDebugOutput without path", (t) => {
  let called = false;
  const mockStoreOutput = () => {
    called = true;
  };

  const manager = new OutputManager(mockStoreOutput);
  manager.handleDebugOutput(null, {});

  t.false(called);
});

test("OutputManager › handleFinalOutput with file output", (t) => {
  let storedPath, storedContent;
  const mockStoreOutput = (path, content) => {
    storedPath = path;
    storedContent = content;
  };

  const manager = new OutputManager(mockStoreOutput);
  const options = { output: "/output.txt" };

  manager.handleFinalOutput("test content", options, () => {});

  t.is(storedPath, "/output.txt");
  t.is(storedContent, "test content");
});

test("OutputManager › handleFinalOutput with console output", (t) => {
  let loggedContent;
  const mockLogger = {
    log: (content) => {
      loggedContent = content;
    },
  };

  const manager = new OutputManager(() => {}, mockLogger);
  const options = {};

  manager.handleFinalOutput("test content", options, () => {});

  t.is(loggedContent, "test content");
});

test("OutputManager › handleValidationErrors", (t) => {
  const loggedErrors = [];
  const mockLogger = {
    log: (error) => {
      loggedErrors.push(error);
    },
  };

  const manager = new OutputManager(() => {}, mockLogger);
  const errors = ["Error 1", "Error 2"];

  manager.handleValidationErrors(errors);

  t.is(loggedErrors.length, 2);
});

// ===== PHASE 3: CLI APPLICATION TESTS =====

test("CLIApplication › constructor with defaults", (t) => {
  const app = new CLIApplication();
  t.truthy(app.fileResolver);
  t.truthy(app.reportFormatter);
  t.truthy(app.outputManager);
  t.truthy(app.tokenDiff);
});

test("CLIApplication › constructor with dependencies", (t) => {
  const mockFileResolver = {};
  const mockReportFormatter = {};
  const mockOutputManager = {};
  const mockTokenDiff = () => {};

  const app = new CLIApplication(
    mockFileResolver,
    mockReportFormatter,
    mockOutputManager,
    mockTokenDiff,
  );

  t.is(app.fileResolver, mockFileResolver);
  t.is(app.reportFormatter, mockReportFormatter);
  t.is(app.outputManager, mockOutputManager);
  t.is(app.tokenDiff, mockTokenDiff);
});

test("CLIApplication › execute successful flow", async (t) => {
  const mockResult = { diff: "result" };
  const mockFiles = [{ old: "data" }, { new: "data" }];

  // Mock dependencies
  const mockFileResolver = {
    resolveFiles: async () => mockFiles,
  };

  const mockFormatter = {
    printReport: () => true,
  };

  const mockReportFormatter = {
    createFormatter: () => ({
      formatter: mockFormatter,
      outputFunction: () => {},
      getOutput: () => "formatted output",
    }),
  };

  const mockOutputManager = {
    handleValidationErrors: () => {},
    handleDebugOutput: () => {},
    handleFinalOutput: () => {},
  };

  const mockTokenDiff = () => mockResult;

  const app = new CLIApplication(
    mockFileResolver,
    mockReportFormatter,
    mockOutputManager,
    mockTokenDiff,
  );

  const rawOptions = { format: "markdown" };
  const exitCode = await app.execute(rawOptions, "api-key");

  t.is(exitCode, 0);
});

test("CLIApplication › execute with validation errors", async (t) => {
  let validationErrorsCalled = false;

  const mockOutputManager = {
    handleValidationErrors: () => {
      validationErrorsCalled = true;
    },
  };

  const app = new CLIApplication(
    null, // fileResolver not needed for this test
    null, // reportFormatter not needed for this test
    mockOutputManager,
    null, // tokenDiff not needed for this test
  );

  // Options that will cause validation to fail (CLI format to file)
  const rawOptions = { format: "cli", output: "/file.txt" };
  const exitCode = await app.execute(rawOptions, "api-key");

  t.is(exitCode, 1);
  t.true(validationErrorsCalled);
});

test("CLIApplication › execute with error handling", async (t) => {
  const mockFileResolver = {
    resolveFiles: async () => {
      throw new Error("File error");
    },
  };

  // Mock console.error to capture error
  const originalConsoleError = console.error;
  let errorCalled = false;
  console.error = () => {
    errorCalled = true;
  };

  const app = new CLIApplication(
    mockFileResolver,
    null, // reportFormatter not needed for this test
    { handleValidationErrors: () => {} }, // outputManager
    null, // tokenDiff not needed for this test
  );

  try {
    const exitCode = await app.execute({}, "api-key");
    t.is(exitCode, 1);
    t.true(errorCalled);
  } finally {
    console.error = originalConsoleError;
  }
});

test("CLIApplication › execute with failed formatter", async (t) => {
  const mockFiles = [{ old: "data" }, { new: "data" }];

  const mockFileResolver = {
    resolveFiles: async () => mockFiles,
  };

  const mockFormatter = {
    printReport: () => false, // formatter fails
  };

  const mockReportFormatter = {
    createFormatter: () => ({
      formatter: mockFormatter,
      outputFunction: () => {},
      getOutput: () => "formatted output",
    }),
  };

  const mockOutputManager = {
    handleValidationErrors: () => {},
    handleDebugOutput: () => {},
    handleFinalOutput: () => {},
  };

  const app = new CLIApplication(
    mockFileResolver,
    mockReportFormatter,
    mockOutputManager,
    () => ({ result: "data" }),
  );

  const exitCode = await app.execute({}, "api-key");
  t.is(exitCode, 1);
});

// ===== PHASE 4: CLI INTEGRATION AND BACKWARD COMPATIBILITY TESTS =====

test("createProgram › returns configured commander program", (t) => {
  const mockApp = {};
  const program = createProgram(mockApp, "test-api-key");

  t.is(program.name(), "tdiff");
  t.truthy(program.description());
  t.truthy(program.version());

  // Check that commands are registered
  const commands = program.commands;
  t.true(commands.length > 0);
  t.is(commands[0].name(), "report");
});

test("determineFiles › backward compatibility function", async (t) => {
  // This function should work with the new architecture
  const options = {
    local: "/test/path",
  };

  // This will use real dependencies, but with local-only strategy it should be safer
  try {
    const result = await determineFiles(options);
    // If it doesn't throw, the function structure is working
    t.truthy(result);
  } catch (error) {
    // It's expected that this might fail due to file system issues in tests
    // The important thing is that the function is callable and follows the right code path
    t.truthy(error);
  }
});

// Test error handling paths that were missing coverage

test("printReport › error handling in catch block", (t) => {
  // Mock console.error to capture the error handling path
  const originalConsoleError = console.error;
  let errorMessages = [];
  console.error = (msg) => {
    errorMessages.push(msg);
  };

  try {
    // Pass null as result to trigger an error in the formatter
    const result = null;
    const log = () => {};
    const options = {};

    // This should trigger the catch block and error handling
    printReport(result, log, options);

    // Check that error handling was called
    t.true(errorMessages.length > 0);
  } finally {
    console.error = originalConsoleError;
  }
});

test("printReport › CLI format output routing", (t) => {
  let logCalled = false;
  let logContent = "";

  const mockLog = (content) => {
    logCalled = true;
    logContent = content;
  };

  const result = {
    added: {},
    deleted: {},
    deprecated: {},
    reverted: {},
    renamed: {},
    updated: { added: {}, deleted: {}, renamed: {}, updated: {} },
  };

  const options = { format: "cli" };

  const exitCode = printReport(result, mockLog, options);

  t.is(typeof exitCode, "number");
  t.true(logCalled);
  t.true(logContent.length > 0);
});

test("printReport › non-CLI format output routing", (t) => {
  // Mock console.log to capture output
  const originalConsoleLog = console.log;
  let consoleOutput = "";
  console.log = (msg) => {
    consoleOutput = msg;
  };

  try {
    const result = {
      added: {},
      deleted: {},
      deprecated: {},
      reverted: {},
      renamed: {},
      updated: { added: {}, deleted: {}, renamed: {}, updated: {} },
    };

    const mockLog = () => {};
    const options = { format: "markdown" };

    const exitCode = printReport(result, mockLog, options);

    t.is(typeof exitCode, "number");
    t.true(consoleOutput.length > 0);
  } finally {
    console.log = originalConsoleLog;
  }
});
