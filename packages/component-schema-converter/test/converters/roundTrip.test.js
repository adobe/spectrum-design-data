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
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { convertPluginToSchema } from "../../src/converters/pluginToSchema.js";
import { convertSchemaToPlugin } from "../../src/converters/schemaToPlugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(path) {
  return JSON.parse(readFileSync(join(fixturesDir, path), "utf-8"));
}

// Plugin → Schema → Plugin round-trip tests
test("round-trip conversion preserves simple button data", (t) => {
  const original = loadFixture("plugin-format/button-simple.json");
  const schema = convertPluginToSchema(original, {
    description: "Buttons allow users to perform an action.",
  });
  const restored = convertSchemaToPlugin(schema);

  t.deepEqual(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);
  t.is(restored.options.length, original.options.length);

  // Check each option
  for (const originalOption of original.options) {
    const restoredOption = restored.options.find(
      (o) => o.title === originalOption.title,
    );
    t.truthy(restoredOption, `Option ${originalOption.title} should exist`);
    t.is(restoredOption.type, originalOption.type);
    t.is(restoredOption.required, originalOption.required);
    if (originalOption.defaultValue !== undefined) {
      t.is(restoredOption.defaultValue, originalOption.defaultValue);
    }
    if (originalOption.items) {
      t.deepEqual(restoredOption.items, originalOption.items);
    }
    if (originalOption.description) {
      t.is(restoredOption.description, originalOption.description);
    }
  }
});

test("round-trip conversion preserves complete button data", (t) => {
  const original = loadFixture("plugin-format/button-complete.json");
  const schema = convertPluginToSchema(original, {
    description:
      "Buttons allow users to perform an action or to navigate to another page.",
  });
  const restored = convertSchemaToPlugin(schema);

  t.is(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);
  t.is(restored.options.length, original.options.length);

  // Verify all options are preserved
  for (const originalOption of original.options) {
    const restoredOption = restored.options.find(
      (o) => o.title === originalOption.title,
    );
    t.truthy(restoredOption, `Option ${originalOption.title} should exist`);
    t.is(restoredOption.type, originalOption.type);
  }
});

test("round-trip conversion preserves action button with icons", (t) => {
  const original = loadFixture("plugin-format/action-button-icons.json");
  const schema = convertPluginToSchema(original, {
    description: "Action buttons allow users to perform actions.",
  });
  const restored = convertSchemaToPlugin(schema);

  t.is(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);

  // Check icon option specifically
  const originalIcon = original.options.find((o) => o.title === "icon");
  const restoredIcon = restored.options.find((o) => o.title === "icon");
  t.is(restoredIcon.type, originalIcon.type);
  t.is(restoredIcon.description, originalIcon.description);
});

test("round-trip conversion preserves edge cases", (t) => {
  const original = loadFixture("plugin-format/edge-cases.json");
  const schema = convertPluginToSchema(original, {
    description: "Test edge cases",
  });
  const restored = convertSchemaToPlugin(schema);

  t.is(restored.title, original.title);

  // Check required field preservation
  const originalRequired = original.options.find(
    (o) => o.title === "requiredString",
  );
  const restoredRequired = restored.options.find(
    (o) => o.title === "requiredString",
  );
  t.is(restoredRequired.required, originalRequired.required);
  t.is(restoredRequired.required, true);

  // Check dimension type
  const originalDimension = original.options.find(
    (o) => o.title === "dimensionOption",
  );
  const restoredDimension = restored.options.find(
    (o) => o.title === "dimensionOption",
  );
  t.is(restoredDimension.type, originalDimension.type);
  t.is(restoredDimension.type, "dimension");
  t.is(restoredDimension.defaultValue, originalDimension.defaultValue);
});

test("round-trip conversion preserves empty options", (t) => {
  const original = loadFixture("plugin-format/empty-options.json");
  const schema = convertPluginToSchema(original, {
    description: "Empty component",
  });
  const restored = convertSchemaToPlugin(schema);

  t.is(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);
  t.deepEqual(restored.options, []);
});

// Schema → Plugin → Schema round-trip tests
test("round-trip conversion preserves official button schema", (t) => {
  const original = loadFixture("official-schema/button.json");
  const pluginData = convertSchemaToPlugin(original);
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.is(restored.description, original.description);
  t.deepEqual(restored.meta, original.meta);
  t.is(restored.type, original.type);

  // Check that all properties are preserved
  const originalProps = Object.keys(original.properties || {});
  const restoredProps = Object.keys(restored.properties || {});
  t.is(restoredProps.length, originalProps.length);

  for (const propName of originalProps) {
    t.truthy(
      restored.properties[propName],
      `Property ${propName} should exist`,
    );
  }
});

test("round-trip conversion preserves official action-button schema", (t) => {
  const original = loadFixture("official-schema/action-button.json");
  const pluginData = convertSchemaToPlugin(original);
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.deepEqual(restored.meta, original.meta);

  // Check property count
  const originalPropCount = Object.keys(original.properties || {}).length;
  const restoredPropCount = Object.keys(restored.properties || {}).length;
  t.is(restoredPropCount, originalPropCount);
});

test("round-trip conversion preserves official checkbox schema", (t) => {
  const original = loadFixture("official-schema/checkbox.json");
  const pluginData = convertSchemaToPlugin(original);
  const restored = convertPluginToSchema(pluginData, {
    description: original.description,
  });

  t.is(restored.title, original.title);
  t.truthy(restored.properties);
});

// Property type preservation tests
test("round-trip preserves all property types", (t) => {
  const original = {
    title: "Type Test",
    meta: { category: "content", documentationUrl: "https://test.com" },
    options: [
      { title: "stringProp", type: "string" },
      { title: "booleanProp", type: "boolean", defaultValue: false },
      {
        title: "enumProp",
        type: "localEnum",
        items: ["option1", "option2"],
        defaultValue: "option1",
      },
      {
        title: "sizeProp",
        type: "size",
        items: ["s", "m", "l"],
        defaultValue: "m",
      },
      {
        title: "stateProp",
        type: "state",
        items: ["default", "hover"],
        defaultValue: "default",
      },
      { title: "iconProp", type: "icon" },
      { title: "colorProp", type: "color" },
      { title: "dimensionProp", type: "dimension", defaultValue: 100 },
    ],
  };

  const schema = convertPluginToSchema(original, { description: "Test types" });
  const restored = convertSchemaToPlugin(schema);

  // Verify each type is preserved
  for (const originalOption of original.options) {
    const restoredOption = restored.options.find(
      (o) => o.title === originalOption.title,
    );
    t.is(
      restoredOption.type,
      originalOption.type,
      `Type for ${originalOption.title} should be preserved`,
    );
  }
});

// Default value preservation tests
test("round-trip preserves default values", (t) => {
  const original = {
    title: "Default Test",
    meta: { category: "content", documentationUrl: "https://test.com" },
    options: [
      { title: "stringDefault", type: "string", defaultValue: "test" },
      { title: "booleanDefault", type: "boolean", defaultValue: true },
      { title: "numberDefault", type: "dimension", defaultValue: 42 },
      {
        title: "enumDefault",
        type: "localEnum",
        items: ["a", "b", "c"],
        defaultValue: "b",
      },
    ],
  };

  const schema = convertPluginToSchema(original, {
    description: "Test defaults",
  });
  const restored = convertSchemaToPlugin(schema);

  for (const originalOption of original.options) {
    const restoredOption = restored.options.find(
      (o) => o.title === originalOption.title,
    );
    t.is(
      restoredOption.defaultValue,
      originalOption.defaultValue,
      `Default value for ${originalOption.title} should be preserved`,
    );
  }
});

// Required field preservation tests
test("round-trip preserves required fields", (t) => {
  const original = {
    title: "Required Test",
    meta: { category: "content", documentationUrl: "https://test.com" },
    options: [
      { title: "required1", type: "string", required: true },
      { title: "optional1", type: "string", required: false },
      { title: "required2", type: "boolean", required: true },
      { title: "optional2", type: "boolean", required: false },
    ],
  };

  const schema = convertPluginToSchema(original, {
    description: "Test required",
  });
  const restored = convertSchemaToPlugin(schema);

  for (const originalOption of original.options) {
    const restoredOption = restored.options.find(
      (o) => o.title === originalOption.title,
    );
    t.is(
      restoredOption.required,
      originalOption.required,
      `Required flag for ${originalOption.title} should be preserved`,
    );
  }
});

// Description preservation tests
test("round-trip preserves descriptions", (t) => {
  const original = {
    title: "Description Test",
    meta: { category: "content", documentationUrl: "https://test.com" },
    options: [
      {
        title: "withDescription",
        type: "string",
        description: "This is a test description",
      },
      { title: "withoutDescription", type: "string" },
    ],
  };

  const schema = convertPluginToSchema(original, {
    description: "Test descriptions",
  });
  const restored = convertSchemaToPlugin(schema);

  const withDesc = restored.options.find((o) => o.title === "withDescription");
  const withoutDesc = restored.options.find(
    (o) => o.title === "withoutDescription",
  );

  t.is(withDesc.description, "This is a test description");
  t.is(withoutDesc.description, undefined);
});
