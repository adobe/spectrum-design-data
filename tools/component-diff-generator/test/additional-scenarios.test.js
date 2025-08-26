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
import componentDiff, {
  isComponentChangeBreaking,
} from "../src/lib/component-diff.js";

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
    size: {
      type: "string",
      enum: ["small", "medium", "large"],
    },
  },
  required: ["variant"],
};

// Additional tests for new breaking change scenarios

test("isComponentChangeBreaking - adding multiple required properties", (t) => {
  // Test case where multiple required properties are added
  const componentChanges = {
    added: {
      properties: {
        id: { type: "string" },
        className: { type: "string" },
      },
      required: {
        1: "id",
        2: "className",
      },
    },
    deleted: {},
    updated: {},
  };

  t.true(
    isComponentChangeBreaking(componentChanges, buttonSchema, buttonSchema),
  );
});

test("isComponentChangeBreaking - removing enum values (should be breaking in real scenario)", (t) => {
  // For now this is marked as breaking, but this test documents the expected behavior
  const componentChanges = {
    deleted: {
      properties: {
        variant: {
          enum: {
            1: "secondary", // Removed enum value
          },
        },
      },
    },
    added: {},
    updated: {},
  };

  // Currently this returns true because any deletion is breaking
  t.true(
    isComponentChangeBreaking(componentChanges, buttonSchema, buttonSchema),
  );
});

test("isComponentChangeBreaking - no changes should be non-breaking", (t) => {
  // Test case with no actual changes
  const componentChanges = {
    added: {},
    deleted: {},
    updated: {},
  };

  t.false(
    isComponentChangeBreaking(componentChanges, buttonSchema, buttonSchema),
  );
});

test("componentDiff - complex scenario with mixed changes", (t) => {
  // Test a realistic scenario with multiple components and change types
  const original = {
    button: buttonSchema,
    alert: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/alert.json",
      title: "Alert Component",
      type: "object",
      properties: {
        severity: { type: "string", enum: ["error", "warning", "info"] },
        message: { type: "string" },
      },
      required: ["severity"],
    },
    deprecatedComponent: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/deprecated.json",
      title: "Deprecated Component",
      type: "object",
      properties: { old: { type: "string" } },
    },
  };

  const updated = {
    // Non-breaking: add optional property and enum value
    button: {
      ...buttonSchema,
      properties: {
        ...buttonSchema.properties,
        disabled: { type: "boolean" },
        variant: {
          type: "string",
          enum: ["primary", "secondary", "tertiary"], // Added tertiary
        },
      },
    },
    // Breaking: add required property
    alert: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/alert.json",
      title: "Alert Component",
      type: "object",
      properties: {
        severity: { type: "string", enum: ["error", "warning", "info"] },
        message: { type: "string" },
        id: { type: "string" }, // New property
      },
      required: ["severity", "id"], // Added required field
    },
    // deprecatedComponent deleted (breaking)
    // New component added (non-breaking)
    newComponent: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/new.json",
      title: "New Component",
      type: "object",
      properties: { value: { type: "string" } },
      required: ["value"],
    },
  };

  const result = componentDiff(original, updated);

  // Verify summary
  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.added, 1); // newComponent
  t.is(result.summary.totalComponents.deleted, 1); // deprecatedComponent
  t.is(result.summary.totalComponents.updated, 2); // button, alert
  t.is(result.summary.breakingChanges, 2); // deprecatedComponent deleted + alert breaking update
  t.is(result.summary.nonBreakingChanges, 2); // newComponent added + button non-breaking update

  // Verify change categorization
  t.true("newComponent" in result.changes.added);
  t.true("deprecatedComponent" in result.changes.deleted);
  t.true("button" in result.changes.updated.nonBreaking);
  t.true("alert" in result.changes.updated.breaking);
});

test("componentDiff - only non-breaking changes", (t) => {
  // Test scenario with only non-breaking changes
  const original = {
    button: buttonSchema,
  };

  const updated = {
    button: {
      ...buttonSchema,
      properties: {
        ...buttonSchema.properties,
        disabled: { type: "boolean" }, // Optional property
        variant: {
          type: "string",
          enum: ["primary", "secondary", "tertiary"], // Added enum value
        },
      },
    },
    // New component
    toast: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/toast.json",
      title: "Toast Component",
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  };

  const result = componentDiff(original, updated);

  // Verify summary - no breaking changes
  t.false(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.added, 1); // toast
  t.is(result.summary.totalComponents.deleted, 0);
  t.is(result.summary.totalComponents.updated, 1); // button
  t.is(result.summary.breakingChanges, 0);
  t.is(result.summary.nonBreakingChanges, 2); // toast added + button updated

  // Verify change categorization
  t.true("toast" in result.changes.added);
  t.is(Object.keys(result.changes.deleted).length, 0);
  t.true("button" in result.changes.updated.nonBreaking);
  t.is(Object.keys(result.changes.updated.breaking).length, 0);
});

test("componentDiff - only breaking changes", (t) => {
  // Test scenario with only breaking changes
  const original = {
    button: buttonSchema,
    alert: {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.com/alert.json",
      title: "Alert Component",
      type: "object",
      properties: {
        severity: { type: "string", enum: ["error", "warning", "info"] },
        message: { type: "string" },
      },
      required: ["severity"],
    },
  };

  const updated = {
    // Breaking: add required property to button
    button: {
      ...buttonSchema,
      required: ["variant", "size"], // Added size as required
    },
    // alert deleted (breaking)
  };

  const result = componentDiff(original, updated);

  // Verify summary - only breaking changes
  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.added, 0);
  t.is(result.summary.totalComponents.deleted, 1); // alert
  t.is(result.summary.totalComponents.updated, 1); // button
  t.is(result.summary.breakingChanges, 2); // alert deleted + button breaking update
  t.is(result.summary.nonBreakingChanges, 0);

  // Verify change categorization
  t.is(Object.keys(result.changes.added).length, 0);
  t.true("alert" in result.changes.deleted);
  t.true("button" in result.changes.updated.breaking);
  t.is(Object.keys(result.changes.updated.nonBreaking).length, 0);
});
