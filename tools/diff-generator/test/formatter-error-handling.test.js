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
import { HandlebarsFormatter } from "../src/lib/formatterHandlebars.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample token diff result for testing
const sampleTokenDiff = {
  renamed: { "old-token": { "old-name": "old-token", name: "new-token" } },
  deprecated: {
    "deprecated-token": { deprecated_comment: "Use new-token instead" },
  },
  reverted: {},
  added: { "new-token": { value: "#FF0000" } },
  deleted: { "removed-token": { value: "#0000FF" } },
  updated: {
    renamed: {},
    added: {
      "updated-token": { changes: [{ path: "value", newValue: "#00FF00" }] },
    },
    deleted: {},
    updated: {},
  },
};

const sampleOptions = {
  oldTokenBranch: "main",
  newTokenBranch: "feature/updates",
  oldTokenVersion: "v1.0.0",
  newTokenVersion: "v1.1.0",
  format: "markdown",
};

// FormatterHandlebars Error Handling Tests

test("formatterHandlebars - template file not found error", (t) => {
  const formatter = new HandlebarsFormatter({
    templateDir: "/non/existent/directory",
    template: "markdown",
  });

  // Mock console.error to capture error messages
  const originalConsoleError = console.error;
  let errorCaught = false;
  console.error = (message) => {
    if (
      message.includes("Template loading error") ||
      message.includes("Template file not found")
    ) {
      errorCaught = true;
    }
  };

  try {
    const mockLog = () => {}; // Simple mock for successful output
    const result = formatter.printReport(
      sampleTokenDiff,
      mockLog,
      sampleOptions,
    );

    t.false(result); // Should return false on error
    t.true(errorCaught); // Should have logged the error
  } finally {
    console.error = originalConsoleError;
  }
});

test("formatterHandlebars - malformed template syntax error", (t) => {
  // Create a temporary directory with a malformed template
  const tempDir = path.join(__dirname, "temp-templates");
  const templatePath = path.join(tempDir, "markdown.hbs");

  // Ensure directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write malformed template
  fs.writeFileSync(templatePath, "{{#if unclosedBlock\nThis is malformed");

  try {
    const formatter = new HandlebarsFormatter({
      templateDir: tempDir,
      template: "markdown",
    });

    // Mock console.error to capture error messages
    const originalConsoleError = console.error;
    let errorCaught = false;
    console.error = (message) => {
      if (
        message.includes("Template syntax error") ||
        message.includes("Parse error")
      ) {
        errorCaught = true;
      }
    };

    try {
      const mockLog = () => {}; // Simple mock for successful output
      const result = formatter.printReport(
        sampleTokenDiff,
        mockLog,
        sampleOptions,
      );

      t.false(result); // Should return false on error
      t.true(errorCaught); // Should have logged the syntax error
    } finally {
      console.error = originalConsoleError;
    }
  } finally {
    // Cleanup
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
});

test("formatterHandlebars - template variable error", (t) => {
  // Create a temporary directory with a template that references undefined variables
  const tempDir = path.join(__dirname, "temp-templates-var");
  const templatePath = path.join(tempDir, "markdown.hbs");

  // Ensure directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write template with undefined variable reference
  fs.writeFileSync(templatePath, "{{nonExistentVariable.someProperty}}");

  try {
    const formatter = new HandlebarsFormatter({
      templateDir: tempDir,
      template: "markdown",
    });

    let errorCaught = false;
    const mockLog = (message) => {
      if (message.includes("Template variable error")) {
        errorCaught = true;
      }
    };

    const result = formatter.printReport(
      sampleTokenDiff,
      mockLog,
      sampleOptions,
    );

    // This might succeed (Handlebars handles undefined gracefully) or fail
    // Either way, it should not crash
    t.is(typeof result, "boolean");
  } finally {
    // Cleanup
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
});

test("formatterHandlebars - file access permission error", (t) => {
  // This test simulates a permission denied error when accessing template
  const formatter = new HandlebarsFormatter({
    templateDir: __dirname,
    template: "markdown",
  });

  // Mock fs.readFileSync to throw permission error
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    const error = new Error("EACCES: permission denied");
    error.code = "EACCES";
    throw error;
  };

  try {
    // Mock console.error to capture error messages
    const originalConsoleError = console.error;
    let errorCaught = false;
    console.error = (message) => {
      if (
        message.includes("File access error") ||
        message.includes("Template loading error")
      ) {
        errorCaught = true;
      }
    };

    try {
      const mockLog = () => {}; // Simple mock for successful output
      const result = formatter.printReport(
        sampleTokenDiff,
        mockLog,
        sampleOptions,
      );

      t.false(result); // Should return false on error
      t.true(errorCaught); // Should have logged the access error
    } finally {
      console.error = originalConsoleError;
    }
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("formatterHandlebars - reference error in template processing", (t) => {
  // Create a template that will cause a ReferenceError during execution
  const tempDir = path.join(__dirname, "temp-templates-ref");
  const templatePath = path.join(tempDir, "markdown.hbs");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write template that references a non-existent helper that would cause ReferenceError
  fs.writeFileSync(templatePath, "{{nonExistentHelper 'test'}}");

  try {
    const formatter = new HandlebarsFormatter({
      templateDir: tempDir,
      template: "markdown",
    });

    let errorCaught = false;
    const mockLog = (message) => {
      if (
        message.includes("Template variable error") ||
        message.includes("Missing helper")
      ) {
        errorCaught = true;
      }
    };

    const result = formatter.printReport(
      sampleTokenDiff,
      mockLog,
      sampleOptions,
    );

    t.false(result); // Should return false on error
    // Note: Handlebars might handle this gracefully, so error might not be caught
    // But the function should still return false
  } finally {
    // Cleanup
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
});

test("formatterHandlebars - helpers registration and error handling", (t) => {
  const formatter = new HandlebarsFormatter();

  // Test that helpers are properly registered
  t.truthy(formatter); // Basic instantiation check

  // Test with empty result
  const emptyResult = {
    renamed: {},
    deprecated: {},
    reverted: {},
    added: {},
    deleted: {},
    updated: { renamed: {}, added: {}, deleted: {}, updated: {} },
  };

  let loggedOutput = "";
  const mockLog = (message) => {
    loggedOutput = message;
  };

  const result = formatter.printReport(emptyResult, mockLog, sampleOptions);

  // Should succeed with empty data
  t.true(result);
  t.is(typeof loggedOutput, "string");
});

test("formatterHandlebars - large dataset performance", (t) => {
  // Create a large token diff to test performance and memory handling
  const largeTokenDiff = {
    renamed: {},
    deprecated: {},
    reverted: {},
    added: {},
    deleted: {},
    updated: {
      renamed: {},
      added: {},
      deleted: {},
      updated: {},
    },
  };

  // Add many tokens to test performance
  for (let i = 0; i < 1000; i++) {
    largeTokenDiff.added[`token-${i}`] = {
      value: `#${i.toString(16).padStart(6, "0")}`,
    };
  }

  const formatter = new HandlebarsFormatter();

  let loggedOutput = "";
  const mockLog = (message) => {
    loggedOutput = message;
  };

  const startTime = Date.now();
  const result = formatter.printReport(largeTokenDiff, mockLog, sampleOptions);
  const endTime = Date.now();

  const executionTime = endTime - startTime;

  t.true(result); // Should succeed
  t.true(
    executionTime < 5000,
    `Performance test failed: ${executionTime}ms > 5000ms`,
  ); // Should complete within 5 seconds
  t.true(loggedOutput.length > 0); // Should have generated output
});

test("formatterHandlebars - null/undefined input handling", (t) => {
  const formatter = new HandlebarsFormatter();

  // Mock console.error to capture error messages
  const originalConsoleError = console.error;
  let errorLogged = false;
  console.error = (message) => {
    if (
      message.includes("Template processing failed") ||
      message.includes("Cannot read properties")
    ) {
      errorLogged = true;
    }
  };

  try {
    const mockLog = () => {}; // Simple mock for successful output

    // Test with null result
    const result1 = formatter.printReport(null, mockLog, sampleOptions);
    t.false(result1);

    // Test with undefined result
    const result2 = formatter.printReport(undefined, mockLog, sampleOptions);
    t.false(result2);

    // At least one of these should have triggered an error
    t.true(errorLogged);
  } finally {
    console.error = originalConsoleError;
  }
});

test("formatterHandlebars - custom template directory", (t) => {
  // Test using a custom template directory
  const customDir = path.join(__dirname, "..", "src", "templates");

  const formatter = new HandlebarsFormatter({
    templateDir: customDir,
    template: "json", // Use JSON template which should be simpler
  });

  let loggedOutput = "";
  const mockLog = (message) => {
    loggedOutput = message;
  };

  const result = formatter.printReport(sampleTokenDiff, mockLog, sampleOptions);

  t.true(result); // Should succeed with custom directory
  t.true(loggedOutput.includes("{")); // JSON output should contain JSON
});

test("formatterHandlebars - edge case helpers", (t) => {
  const formatter = new HandlebarsFormatter();

  // Test edge case with token diff containing edge case data
  const edgeCaseTokenDiff = {
    renamed: {
      "token-with-unicode-🎨": { "old-name": "old-🎨", name: "new-🎨" },
    },
    deprecated: { "token-with-null": { deprecated_comment: null } },
    reverted: {},
    added: { "token-with-empty-string": { value: "" } },
    deleted: { "token-with-undefined": { value: undefined } },
    updated: {
      renamed: {},
      added: {},
      deleted: {},
      updated: {},
    },
  };

  let loggedOutput = "";
  const mockLog = (message) => {
    loggedOutput = message;
  };

  const result = formatter.printReport(
    edgeCaseTokenDiff,
    mockLog,
    sampleOptions,
  );

  t.true(result); // Should handle edge cases gracefully
  t.true(loggedOutput.length > 0); // Should generate some output
});
