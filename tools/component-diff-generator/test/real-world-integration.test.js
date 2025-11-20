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
import componentDiff from "../src/lib/component-diff.js";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to generate markdown report (copy from CLI)
function generateMarkdownReport(diffResult, options = {}) {
  try {
    if (!Handlebars.helpers.hasKeys) {
      Handlebars.registerHelper("hasKeys", (obj) => {
        return obj && Object.keys(obj).length > 0;
      });
    }

    if (!Handlebars.helpers.detailsOpen) {
      Handlebars.registerHelper("detailsOpen", (count, options) => {
        const threshold = options?.hash?.threshold || 20;
        return count <= threshold ? " open" : "";
      });
    }

    if (!Handlebars.helpers.objectKeysLength) {
      Handlebars.registerHelper("objectKeysLength", (obj) => {
        return obj ? Object.keys(obj).length : 0;
      });
    }

    const templatePath = path.join(__dirname, "../templates/markdown.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);

    const templateData = {
      summary: diffResult.summary,
      changes: diffResult.changes,
      options: options,
    };

    return template(templateData);
  } catch (error) {
    console.error(`Error generating markdown report: ${error.message}`);
    return `Error generating component diff report: ${error.message}`;
  }
}

// Real-world Adobe Spectrum component schemas based on actual patterns
const spectrumButtonV1 = {
  $schema: "https://json-schema.org/draft/2019-09/schema",
  $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  title: "Button",
  type: "object",
  description:
    "A button allows users to perform an action or to navigate to another page.",
  properties: {
    variant: {
      type: "string",
      enum: ["accent", "primary", "secondary", "negative"],
      description: "The variant of the button.",
    },
    size: {
      type: "string",
      enum: ["s", "m", "l", "xl"],
      description: "The size of the button.",
    },
    staticColor: {
      type: "string",
      enum: ["white", "black"],
      description: "The static color variant of the button.",
    },
    treatment: {
      type: "string",
      enum: ["fill", "outline"],
      description: "The visual treatment of the button.",
    },
  },
  required: ["variant"],
};

const spectrumButtonV2 = {
  $schema: "https://json-schema.org/draft/2019-09/schema",
  $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  title: "Button",
  type: "object",
  description:
    "A button allows users to perform an action or to navigate to another page.",
  properties: {
    variant: {
      type: "string",
      enum: ["accent", "primary", "secondary", "negative", "neutral"], // Added neutral
      description: "The variant of the button.",
    },
    size: {
      type: "string",
      enum: ["s", "m", "l", "xl"],
      description: "The size of the button.",
    },
    staticColor: {
      type: "string",
      enum: ["white", "black"],
      description: "The static color variant of the button.",
    },
    treatment: {
      type: "string",
      enum: ["fill", "outline"],
      description: "The visual treatment of the button.",
    },
    isPending: {
      type: "boolean",
      description: "Whether the button is in a pending state.",
    },
    isDisabled: {
      type: "boolean",
      description: "Whether the button is disabled.",
    },
  },
  required: ["variant"], // Same requirements - non-breaking
};

const spectrumAlertV1 = {
  $schema: "https://json-schema.org/draft/2019-09/schema",
  $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/alert-dialog.json",
  title: "Alert Dialog",
  type: "object",
  description:
    "Alert dialogs display important information that users need to acknowledge.",
  properties: {
    variant: {
      type: "string",
      enum: ["confirmation", "information", "warning", "error"],
      description: "The variant of the alert dialog.",
    },
    size: {
      type: "string",
      enum: ["s", "m", "l"],
      description: "The size of the alert dialog.",
    },
  },
  required: ["variant"],
};

const spectrumAlertV2Breaking = {
  $schema: "https://json-schema.org/draft/2019-09/schema",
  $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/alert-dialog.json",
  title: "Alert Dialog",
  type: "object",
  description:
    "Alert dialogs display important information that users need to acknowledge.",
  properties: {
    variant: {
      type: "string",
      enum: ["confirmation", "information", "warning", "error"],
      description: "The variant of the alert dialog.",
    },
    size: {
      type: "string",
      enum: ["s", "m", "l"],
      description: "The size of the alert dialog.",
    },
    id: {
      type: "string",
      description: "Unique identifier for the alert dialog.",
    },
  },
  required: ["variant", "id"], // Added required field - breaking change
};

// Real-World Integration Tests

test("real-world integration - Adobe Spectrum button evolution (non-breaking)", (t) => {
  const original = { button: spectrumButtonV1 };
  const updated = { button: spectrumButtonV2 };

  const result = componentDiff(original, updated);

  // Verify non-breaking classification
  t.false(result.summary.hasBreakingChanges);
  t.is(result.summary.breakingChanges, 0);
  t.is(result.summary.nonBreakingChanges, 1);
  t.is(result.summary.totalComponents.updated, 1);

  // Verify proper categorization
  t.true("button" in result.changes.updated.nonBreaking);
  t.is(Object.keys(result.changes.updated.breaking).length, 0);

  // Test markdown generation
  const options = {
    oldSchemaVersion: "v1.0.0",
    newSchemaVersion: "v1.1.0",
    oldSchemaBranch: "main",
    newSchemaBranch: "feature/button-enhancements",
  };

  const markdown = generateMarkdownReport(result, options);

  // Verify markdown content
  t.true(markdown.includes("No Breaking Changes"));
  t.true(markdown.includes("Non-Breaking Updates"));
  t.true(markdown.includes("button"));
  t.true(markdown.includes("v1.0.0"));
  t.true(markdown.includes("v1.1.0"));
});

test("real-world integration - Adobe Spectrum alert dialog breaking change", (t) => {
  const original = { alertDialog: spectrumAlertV1 };
  const updated = { alertDialog: spectrumAlertV2Breaking };

  const result = componentDiff(original, updated);

  // Verify breaking classification
  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.breakingChanges, 1);
  t.is(result.summary.nonBreakingChanges, 0);
  t.is(result.summary.totalComponents.updated, 1);

  // Verify proper categorization
  t.true("alertDialog" in result.changes.updated.breaking);
  t.is(Object.keys(result.changes.updated.nonBreaking).length, 0);

  // Test markdown generation
  const options = {
    oldSchemaVersion: "v2.0.0",
    newSchemaVersion: "v3.0.0",
    oldSchemaBranch: "release/v2",
    newSchemaBranch: "release/v3",
  };

  const markdown = generateMarkdownReport(result, options);

  // Verify markdown content
  t.true(markdown.includes("Breaking Changes Detected"));
  t.true(markdown.includes("Breaking Updates"));
  t.true(markdown.includes("alertDialog"));
  t.true(markdown.includes("v2.0.0"));
  t.true(markdown.includes("v3.0.0"));
  t.true(markdown.includes("⚠️ Breaking Change Guidelines"));
});

test("real-world integration - complex multi-component Spectrum release", (t) => {
  // Simulate a typical Spectrum release with multiple component changes
  const original = {
    button: spectrumButtonV1,
    alertDialog: spectrumAlertV1,
    progressBar: {
      $schema: "https://json-schema.org/draft/2019-09/schema",
      $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/progress-bar.json",
      title: "Progress Bar",
      type: "object",
      properties: {
        size: { type: "string", enum: ["s", "m", "l"] },
        variant: {
          type: "string",
          enum: ["informative", "positive", "warning", "critical"],
        },
      },
      required: ["size"],
    },
    // Component to be removed
    deprecatedTooltip: {
      $schema: "https://json-schema.org/draft/2019-09/schema",
      $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/tooltip.json",
      title: "Tooltip (Deprecated)",
      type: "object",
      properties: {
        placement: { type: "string", enum: ["top", "bottom", "left", "right"] },
      },
    },
  };

  const updated = {
    button: spectrumButtonV2, // Non-breaking update
    alertDialog: spectrumAlertV2Breaking, // Breaking update
    progressBar: {
      // Non-breaking: added optional property
      $schema: "https://json-schema.org/draft/2019-09/schema",
      $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/progress-bar.json",
      title: "Progress Bar",
      type: "object",
      properties: {
        size: { type: "string", enum: ["s", "m", "l"] },
        variant: {
          type: "string",
          enum: ["informative", "positive", "warning", "critical"],
        },
        isIndeterminate: { type: "boolean" }, // Added optional property
      },
      required: ["size"],
    },
    // deprecatedTooltip removed (breaking)
    // New component added
    actionMenu: {
      $schema: "https://json-schema.org/draft/2019-09/schema",
      $id: "https://opensource.adobe.com/spectrum-design-data/schemas/components/action-menu.json",
      title: "Action Menu",
      type: "object",
      properties: {
        isOpen: { type: "boolean" },
        trigger: { type: "string", enum: ["press", "longPress"] },
      },
      required: ["trigger"],
    },
  };

  const result = componentDiff(original, updated);

  // Verify complex scenario summary
  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.added, 1); // actionMenu
  t.is(result.summary.totalComponents.deleted, 1); // deprecatedTooltip
  t.is(result.summary.totalComponents.updated, 3); // button, alertDialog, progressBar
  t.is(result.summary.breakingChanges, 2); // deprecatedTooltip deleted + alertDialog breaking
  t.is(result.summary.nonBreakingChanges, 3); // actionMenu added + button + progressBar

  // Verify categorization
  t.true("actionMenu" in result.changes.added);
  t.true("deprecatedTooltip" in result.changes.deleted);
  t.true("button" in result.changes.updated.nonBreaking);
  t.true("progressBar" in result.changes.updated.nonBreaking);
  t.true("alertDialog" in result.changes.updated.breaking);

  // Test markdown generation with real branch names
  const options = {
    oldSchemaVersion: "v5.2.0",
    newSchemaVersion: "v6.0.0",
    oldSchemaBranch: "release/v5",
    newSchemaBranch: "release/v6",
  };

  const markdown = generateMarkdownReport(result, options);

  // Verify comprehensive markdown output
  t.true(markdown.includes("Breaking Changes Detected"));
  t.true(markdown.includes("2 breaking change(s)"));
  t.true(markdown.includes("Added Components (1)"));
  t.true(markdown.includes("actionMenu"));
  t.true(markdown.includes("Deleted Components (1)"));
  t.true(markdown.includes("deprecatedTooltip"));
  t.true(markdown.includes("Breaking Updates"));
  t.true(markdown.includes("alertDialog"));
  t.true(markdown.includes("Non-Breaking Updates"));
  t.true(markdown.includes("button"));
  t.true(markdown.includes("progressBar"));
  t.true(markdown.includes("v5.2.0"));
  t.true(markdown.includes("v6.0.0"));
});

test("real-world integration - output format consistency with token diff", (t) => {
  // Test that component diff output follows similar patterns to token diff
  const result = componentDiff(
    { button: spectrumButtonV1 },
    { button: spectrumButtonV2 },
  );

  const markdown = generateMarkdownReport(result, {
    oldSchemaBranch: "main",
    newSchemaBranch: "feature/updates",
  });

  // Check for token diff-style patterns
  t.true(markdown.includes("## Component Schemas Changed")); // Similar to "## Tokens Changed"
  t.true(markdown.includes("**Original Branch:**")); // Consistent branch info format
  t.true(markdown.includes("**New Branch:**"));
  t.true(markdown.includes("<details")); // Collapsible sections like token diff
  t.true(markdown.includes("</details>"));
  t.true(markdown.includes("<summary>")); // Progressive disclosure
  t.true(markdown.includes("</summary>"));

  // Check for consistent breaking change messaging
  t.true(
    markdown.includes("### ✅ No Breaking Changes") ||
      markdown.includes("### 🚨 Breaking Changes Detected"),
  );
});

test("real-world integration - GitHub Actions workflow simulation", (t) => {
  // Simulate the type of diff that would occur in a GitHub Actions workflow
  const original = { button: spectrumButtonV1, alertDialog: spectrumAlertV1 };
  const updated = {
    button: spectrumButtonV2,
    alertDialog: spectrumAlertV2Breaking,
  };

  const result = componentDiff(original, updated);

  // Simulate GitHub Actions environment variables
  const options = {
    oldSchemaBranch: "main",
    newSchemaBranch: "pr/feature-branch",
    oldSchemaVersion: undefined, // Often not available in PR context
    newSchemaVersion: undefined,
  };

  const markdown = generateMarkdownReport(result, options);

  // Should handle missing version info gracefully
  t.true(markdown.includes("**Original Branch:** `main`"));
  t.true(markdown.includes("**New Branch:** `pr/feature-branch`"));
  t.false(markdown.includes("**Original Version:**")); // Should not appear if undefined
  t.false(markdown.includes("**New Version:**"));

  // Should still provide useful diff information
  t.true(markdown.includes("Breaking Changes Detected"));
  t.true(markdown.includes("button"));
  t.true(markdown.includes("alertDialog"));
});

test("real-world integration - performance with large Spectrum-scale schemas", (t) => {
  // Create schemas with realistic complexity for Spectrum components
  const createLargeSchema = (componentName, propertyCount = 50) => ({
    $schema: "https://json-schema.org/draft/2019-09/schema",
    $id: `https://opensource.adobe.com/spectrum-design-data/schemas/components/${componentName}.json`,
    title: componentName,
    type: "object",
    description: `A complex ${componentName} component with many properties.`,
    properties: Object.fromEntries(
      Array.from({ length: propertyCount }, (_, i) => [
        `property${i}`,
        {
          type: "string",
          enum: ["value1", "value2", "value3"],
          description: `Property ${i} for ${componentName}`,
        },
      ]),
    ),
    required: ["property0"],
  });

  const original = {
    complexButton: createLargeSchema("ComplexButton", 100),
    complexDialog: createLargeSchema("ComplexDialog", 75),
    complexTable: createLargeSchema("ComplexTable", 120),
  };

  const updated = {
    complexButton: {
      ...createLargeSchema("ComplexButton", 100),
      properties: {
        ...createLargeSchema("ComplexButton", 100).properties,
        newProperty: { type: "boolean" }, // Add one new property
      },
    },
    complexDialog: createLargeSchema("ComplexDialog", 75), // No changes
    complexTable: createLargeSchema("ComplexTable", 120),
  };

  const startTime = Date.now();
  const result = componentDiff(original, updated);
  const endTime = Date.now();

  // Performance assertion - should complete within reasonable time
  const executionTime = endTime - startTime;
  t.true(
    executionTime < 1000,
    `Execution took ${executionTime}ms, expected < 1000ms`,
  );

  // Verify correct analysis despite complexity
  t.false(result.summary.hasBreakingChanges); // Only added optional property
  t.is(result.summary.totalComponents.updated, 1); // Only complexButton changed
  t.true("complexButton" in result.changes.updated.nonBreaking);

  // Test markdown generation performance
  const markdownStartTime = Date.now();
  const markdown = generateMarkdownReport(result, {});
  const markdownEndTime = Date.now();

  const markdownTime = markdownEndTime - markdownStartTime;
  t.true(
    markdownTime < 500,
    `Markdown generation took ${markdownTime}ms, expected < 500ms`,
  );

  // Verify markdown was generated successfully
  t.true(markdown.includes("complexButton"));
  t.true(markdown.includes("Non-Breaking Updates"));
});
