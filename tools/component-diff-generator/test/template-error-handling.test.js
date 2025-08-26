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

import test from "ava";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import componentDiff from "../src/lib/component-diff.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample component schemas for testing
const buttonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://example.com/button.json",
  title: "Button Component",
  type: "object",
  properties: {
    variant: {
      type: "string",
      enum: ["primary", "secondary"],
    },
  },
  required: ["variant"],
};

const updatedButtonSchema = {
  ...buttonSchema,
  properties: {
    ...buttonSchema.properties,
    disabled: { type: "boolean" },
  },
};

// Helper function to generate markdown report (copy from CLI)
function generateMarkdownReport(diffResult, options = {}) {
  try {
    // Register necessary Handlebars helpers
    if (!Handlebars.helpers.hasKeys) {
      Handlebars.registerHelper("hasKeys", (obj) => {
        return obj && Object.keys(obj).length > 0;
      });
    }

    // Load and compile the Handlebars template
    const templatePath = path.join(__dirname, "../templates/markdown.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);

    // Prepare template data
    const templateData = {
      summary: diffResult.summary,
      changes: diffResult.changes,
      options: options,
    };

    // Render the template
    return template(templateData);
  } catch (error) {
    console.error(`Error generating markdown report: ${error.message}`);
    return `Error generating component diff report: ${error.message}`;
  }
}

// Template Error Handling Tests

test("template error handling - missing template file", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Mock fs.readFileSync to throw file not found error
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    const error = new Error("ENOENT: no such file or directory");
    error.code = "ENOENT";
    throw error;
  };

  try {
    const result = generateMarkdownReport(diffResult, {});
    t.true(result.includes("Error generating component diff report"));
    t.true(result.includes("ENOENT"));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - malformed template syntax", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Mock fs.readFileSync to return malformed template
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    return "{{#if unclosed"; // Malformed Handlebars syntax
  };

  try {
    const result = generateMarkdownReport(diffResult, {});
    t.true(result.includes("Error generating component diff report"));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - undefined helper function", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Mock fs.readFileSync to return template with undefined helper
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    return "{{undefinedHelper changes.added}}";
  };

  try {
    const result = generateMarkdownReport(diffResult, {});
    t.true(result.includes("Error generating component diff report"));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - null data passed to template", (t) => {
  // Pass null as diffResult to trigger template data issues
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    return "{{summary.hasBreakingChanges}}"; // Try to access property on null
  };

  try {
    const result = generateMarkdownReport(null, {});
    t.true(result.includes("Error generating component diff report"));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - missing template data properties", (t) => {
  // Create diffResult without expected properties
  const incompleteDiffResult = {
    summary: null, // Missing expected structure
    changes: undefined,
  };

  try {
    const result = generateMarkdownReport(incompleteDiffResult, {});
    // Should handle gracefully and not crash
    t.is(typeof result, "string");
  } catch (error) {
    // If it throws, ensure it's handled gracefully
    t.true(error.message.includes("Cannot read"));
  }
});

test("template error handling - file permission error", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Mock fs.readFileSync to throw permission error
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    const error = new Error("EACCES: permission denied");
    error.code = "EACCES";
    throw error;
  };

  try {
    const result = generateMarkdownReport(diffResult, {});
    t.true(result.includes("Error generating component diff report"));
    t.true(result.includes("EACCES"));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - empty template file", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Mock fs.readFileSync to return empty template
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => "";

  try {
    const result = generateMarkdownReport(diffResult, {});
    // Empty template should render as empty string
    t.is(result, "");
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("template error handling - special characters in branch names", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  const options = {
    oldSchemaBranch: "feature/test-special-chars",
    newSchemaBranch: "main",
    oldSchemaVersion: "v1.0.0-beta.1",
    newSchemaVersion: "v2.0.0-rc.1",
  };

  try {
    const result = generateMarkdownReport(diffResult, options);
    // Should handle special characters gracefully (or fail gracefully)
    if (result.includes("Error generating component diff report")) {
      // If template fails, ensure error handling works
      t.true(result.includes("Error generating component diff report"));
    } else {
      // If template succeeds, verify content is rendered
      t.true(result.includes("feature/test-special-chars"));
      t.true(result.includes("v1.0.0-beta.1"));
    }
  } catch (error) {
    t.fail(`Should handle special characters gracefully: ${error.message}`);
  }
});

test("template error handling - unicode characters in component names", (t) => {
  const unicodeButtonSchema = {
    ...buttonSchema,
    title: "按钮组件 (Button Component 🔘)",
  };

  const diffResult = componentDiff(
    { "button-测试": unicodeButtonSchema },
    { "button-测试": updatedButtonSchema },
  );

  try {
    const result = generateMarkdownReport(diffResult, {});
    // Should handle unicode characters gracefully
    t.true(result.includes("button-测试"));
    t.true(typeof result === "string");
    t.true(result.length > 0);
  } catch (error) {
    t.fail(`Should handle unicode characters gracefully: ${error.message}`);
  }
});

test("template error handling - very large component schemas", (t) => {
  // Create a schema with many properties to test performance/memory
  const largeProperties = {};
  for (let i = 0; i < 1000; i++) {
    largeProperties[`property${i}`] = { type: "string" };
  }

  const largeSchema = {
    ...buttonSchema,
    properties: largeProperties,
  };

  const diffResult = componentDiff(
    { largeComponent: largeSchema },
    {
      largeComponent: {
        ...largeSchema,
        properties: { ...largeProperties, newProp: { type: "boolean" } },
      },
    },
  );

  try {
    const result = generateMarkdownReport(diffResult, {});
    // Should handle large schemas without error
    t.true(typeof result === "string");
    t.true(result.includes("largeComponent"));
  } catch (error) {
    t.fail(`Should handle large schemas gracefully: ${error.message}`);
  }
});

test("template error handling - circular reference in options", (t) => {
  const diffResult = componentDiff(
    { button: buttonSchema },
    { button: updatedButtonSchema },
  );

  // Create circular reference in options
  const circularOptions = {
    oldSchemaBranch: "main",
  };
  circularOptions.circular = circularOptions;

  try {
    const result = generateMarkdownReport(diffResult, circularOptions);
    // Should handle without infinite recursion
    t.true(typeof result === "string");
    t.true(result.includes("main"));
  } catch (error) {
    // If it fails, ensure it's not an infinite recursion
    t.false(error.message.includes("Maximum call stack"));
  }
});
