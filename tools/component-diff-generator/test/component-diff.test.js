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
  analyzeAddedComponents,
  analyzeDeletedComponents,
  analyzeUpdatedComponents,
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

const updatedButtonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://example.com/button.json",
  title: "Button Component",
  type: "object",
  properties: {
    variant: {
      type: "string",
      enum: ["primary", "secondary", "tertiary"], // Added new value - non-breaking
    },
    size: {
      type: "string",
      enum: ["small", "medium", "large"],
    },
    disabled: {
      type: "boolean", // Added new optional property - non-breaking
    },
  },
  required: ["variant"],
};

const breakingButtonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://example.com/button.json",
  title: "Button Component",
  type: "object",
  properties: {
    variant: {
      type: "string",
      enum: ["primary"], // Removed "secondary" - breaking
    },
    size: {
      type: "string",
      enum: ["small", "medium", "large"],
    },
  },
  required: ["variant", "size"], // Added required field - breaking
};

test("componentDiff - detects added components as non-breaking", (t) => {
  const original = { button: buttonSchema };
  const updated = {
    button: buttonSchema,
    alert: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Alert Component",
      type: "object",
    },
  };

  const result = componentDiff(original, updated);

  t.false(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.added, 1);
  t.is(result.summary.breakingChanges, 0);
  t.is(result.summary.nonBreakingChanges, 1);
  t.truthy(result.changes.added.alert);
});

test("componentDiff - detects deleted components as breaking", (t) => {
  const original = {
    button: buttonSchema,
    alert: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Alert Component",
    },
  };
  const updated = { button: buttonSchema };

  const result = componentDiff(original, updated);

  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.deleted, 1);
  t.is(result.summary.breakingChanges, 1);
  t.truthy(result.changes.deleted.alert);
});

test("componentDiff - detects non-breaking updates", (t) => {
  const original = { button: buttonSchema };
  const updated = { button: updatedButtonSchema };

  const result = componentDiff(original, updated);

  t.false(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.updated, 1);
  t.is(result.summary.breakingChanges, 0);
  t.is(result.summary.nonBreakingChanges, 1);
  t.truthy(result.changes.updated.nonBreaking.button);
});

test("componentDiff - detects breaking updates", (t) => {
  const original = { button: buttonSchema };
  const updated = { button: breakingButtonSchema };

  const result = componentDiff(original, updated);

  t.true(result.summary.hasBreakingChanges);
  t.is(result.summary.totalComponents.updated, 1);
  t.is(result.summary.breakingChanges, 1);
  t.truthy(result.changes.updated.breaking.button);
});

test("analyzeAddedComponents - categorizes all as non-breaking", (t) => {
  const added = {
    alert: { title: "Alert Component" },
    modal: { title: "Modal Component" },
  };

  const result = analyzeAddedComponents(added);

  t.is(Object.keys(result.breaking).length, 0);
  t.is(Object.keys(result.nonBreaking).length, 2);
  t.is(result.nonBreaking.alert.type, "added");
  t.is(result.nonBreaking.modal.type, "added");
});

test("analyzeDeletedComponents - categorizes all as breaking", (t) => {
  const deleted = {
    alert: { title: "Alert Component" },
    modal: { title: "Modal Component" },
  };

  const result = analyzeDeletedComponents(deleted);

  t.is(Object.keys(result.breaking).length, 2);
  t.is(Object.keys(result.nonBreaking).length, 0);
  t.is(result.breaking.alert.type, "deleted");
  t.is(result.breaking.modal.type, "deleted");
});

test("isComponentChangeBreaking - adding required property", (t) => {
  // Component-specific changes structure (after categorizeComponentChanges fix)
  const componentChanges = {
    added: {
      required: {
        1: "size", // This indicates a required property was added (as detected by detailedDiff)
      },
    },
    deleted: {},
    updated: {},
  };

  t.true(
    isComponentChangeBreaking(
      componentChanges,
      buttonSchema,
      breakingButtonSchema,
    ),
  );
});

test("isComponentChangeBreaking - removing property", (t) => {
  // Component-specific changes structure
  const componentChanges = {
    added: {},
    deleted: {
      properties: {
        size: { type: "string" },
      },
    },
    updated: {},
  };

  t.true(isComponentChangeBreaking(componentChanges, buttonSchema, {}));
});

test("isComponentChangeBreaking - schema changes are breaking", (t) => {
  // Component-specific changes structure
  const componentChanges = {
    added: {},
    deleted: {},
    updated: {
      title: "Updated Button Component",
    },
  };

  t.true(
    isComponentChangeBreaking(
      componentChanges,
      buttonSchema,
      updatedButtonSchema,
    ),
  );
});

test("isComponentChangeBreaking - adding enum value is non-breaking", (t) => {
  // Component-specific changes structure
  const componentChanges = {
    added: {
      properties: {
        variant: {
          enum: {
            2: "tertiary", // Added enum value
          },
        },
      },
    },
    deleted: {},
    updated: {},
  };

  t.false(
    isComponentChangeBreaking(
      componentChanges,
      buttonSchema,
      updatedButtonSchema,
    ),
  );
});

test("isComponentChangeBreaking - adding optional property is non-breaking", (t) => {
  // Component-specific changes structure
  const componentChanges = {
    added: {
      properties: {
        disabled: { type: "boolean" },
      },
    },
    deleted: {},
    updated: {},
  };

  t.false(
    isComponentChangeBreaking(
      componentChanges,
      buttonSchema,
      updatedButtonSchema,
    ),
  );
});
