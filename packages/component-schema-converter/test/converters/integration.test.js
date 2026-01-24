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
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { convertPluginToSchema } from "../../src/converters/pluginToSchema.js";
import { convertSchemaToPlugin } from "../../src/converters/schemaToPlugin.js";
import { validateOfficialSchema } from "../../src/converters/validators.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to real component schemas in the monorepo
const componentSchemasDir = join(
  __dirname,
  "..",
  "..",
  "..",
  "component-schemas",
  "schemas",
  "components",
);

function loadSchema(filename) {
  return JSON.parse(readFileSync(join(componentSchemasDir, filename), "utf-8"));
}

// Test with specific real component schemas
test("integration: convert real button schema to plugin and back", (t) => {
  const original = loadSchema("button.json");

  // Convert to plugin format
  const pluginData = convertSchemaToPlugin(original);

  // Verify plugin format
  t.is(pluginData.title, "Button");
  t.is(pluginData.meta.category, "actions");
  t.true(Array.isArray(pluginData.options));
  t.true(pluginData.options.length > 0);

  // Verify specific options exist
  const hasSize = pluginData.options.some((o) => o.title === "size");
  const hasVariant = pluginData.options.some((o) => o.title === "variant");
  const hasIcon = pluginData.options.some((o) => o.title === "icon");
  t.true(hasSize);
  t.true(hasVariant);
  t.true(hasIcon);

  // Convert back to official schema
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  // Verify structure
  t.is(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);
  t.is(restored.type, "object");

  // Verify all original properties are present
  const originalProps = Object.keys(original.properties);
  const restoredProps = Object.keys(restored.properties);
  t.deepEqual(restoredProps.sort(), originalProps.sort());

  // Validate the restored schema
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real action-button schema to plugin and back", (t) => {
  const original = loadSchema("action-button.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema
  t.true(pluginData.options.length > 0);

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real checkbox schema to plugin and back", (t) => {
  const original = loadSchema("checkbox.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, "Checkbox");

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real radio-button schema to plugin and back", (t) => {
  const original = loadSchema("radio-button.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real switch schema to plugin and back", (t) => {
  const original = loadSchema("switch.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real text-field schema to plugin and back", (t) => {
  const original = loadSchema("text-field.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real picker schema to plugin and back", (t) => {
  const original = loadSchema("picker.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real link schema to plugin and back", (t) => {
  const original = loadSchema("link.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, "Link");

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real progress-bar schema to plugin and back", (t) => {
  const original = loadSchema("progress-bar.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, original.title); // Use actual title from schema

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

test("integration: convert real toast schema to plugin and back", (t) => {
  const original = loadSchema("toast.json");

  const pluginData = convertSchemaToPlugin(original);
  t.is(pluginData.title, "Toast");

  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.true(validateOfficialSchema(restored));
});

// Test batch conversion of multiple schemas
test("integration: batch convert multiple real schemas", (t) => {
  const schemaFiles = [
    "button.json",
    "checkbox.json",
    "radio-button.json",
    "switch.json",
    "text-field.json",
  ];

  for (const filename of schemaFiles) {
    const original = loadSchema(filename);
    const pluginData = convertSchemaToPlugin(original);
    const restored = convertPluginToSchema(pluginData, {
      description: original.description,
    });

    t.is(restored.title, original.title, `Title mismatch for ${filename}`);
    t.true(validateOfficialSchema(restored), `Invalid schema for ${filename}`);
  }
});

// Test that all component properties are preserved
test("integration: all button properties are preserved in conversion", (t) => {
  const original = loadSchema("button.json");
  const pluginData = convertSchemaToPlugin(original);
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  // Check each property in the original
  for (const [propName, propValue] of Object.entries(original.properties)) {
    t.truthy(
      restored.properties[propName],
      `Property ${propName} should exist in restored schema`,
    );

    // Check type preservation
    if (propValue.type) {
      t.is(
        restored.properties[propName].type,
        propValue.type,
        `Type for ${propName} should match`,
      );
    }

    // Check enum preservation
    if (propValue.enum) {
      t.deepEqual(
        restored.properties[propName].enum,
        propValue.enum,
        `Enum for ${propName} should match`,
      );
    }

    // Check $ref preservation
    if (propValue.$ref) {
      t.is(
        restored.properties[propName].$ref,
        propValue.$ref,
        `$ref for ${propName} should match`,
      );
    }

    // Check default value preservation
    if (propValue.default !== undefined) {
      t.is(
        restored.properties[propName].default,
        propValue.default,
        `Default for ${propName} should match`,
      );
    }

    // Check description preservation
    if (propValue.description) {
      t.is(
        restored.properties[propName].description,
        propValue.description,
        `Description for ${propName} should match`,
      );
    }
  }
});

// Test required fields preservation
test("integration: button required fields are preserved", (t) => {
  const original = loadSchema("button.json");
  const pluginData = convertSchemaToPlugin(original);
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  if (original.required && original.required.length > 0) {
    t.deepEqual(
      restored.required?.sort(),
      original.required.sort(),
      "Required fields should match",
    );
  } else {
    // If no required fields in original, pass the test
    t.pass("No required fields to preserve");
  }
});

// Test with complex component (many properties and types)
test("integration: complex component with all option types", (t) => {
  // Button has various types: string, boolean, enum, state, icon
  const original = loadSchema("button.json");
  const pluginData = convertSchemaToPlugin(original);

  // Check that different types are detected correctly
  const typesSeen = new Set(pluginData.options.map((o) => o.type));

  t.true(typesSeen.has("string"), "Should have string type");
  t.true(typesSeen.has("boolean"), "Should have boolean type");
  t.true(
    typesSeen.has("localEnum") ||
      typesSeen.has("size") ||
      typesSeen.has("state"),
    "Should have enum-based type",
  );

  // Convert back and validate
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });
  t.true(validateOfficialSchema(restored));
});

// Test meta field preservation
test("integration: meta fields are preserved across conversions", (t) => {
  const schemas = ["button.json", "checkbox.json", "text-field.json"];

  for (const filename of schemas) {
    const original = loadSchema(filename);
    const pluginData = convertSchemaToPlugin(original);

    t.is(
      pluginData.meta.category,
      original.meta.category,
      `Category should match for ${filename}`,
    );
    t.is(
      pluginData.meta.documentationUrl,
      original.meta.documentationUrl,
      `Documentation URL should match for ${filename}`,
    );

    const restored = convertPluginToSchema(pluginData, {
      description: original.description,
    });

    t.deepEqual(
      restored.meta,
      original.meta,
      `Meta should be preserved for ${filename}`,
    );
  }
});
