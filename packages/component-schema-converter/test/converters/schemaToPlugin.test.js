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
import { convertSchemaToPlugin } from "../../src/converters/schemaToPlugin.js";
import { SchemaConversionError } from "../../src/utils/errorHandling.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(path) {
  return JSON.parse(readFileSync(join(fixturesDir, path), "utf-8"));
}

// Basic conversion tests
test("convertSchemaToPlugin converts button schema", (t) => {
  const schema = loadFixture("official-schema/button.json");
  const pluginData = convertSchemaToPlugin(schema);

  t.is(pluginData.title, "Button");
  t.deepEqual(pluginData.meta, {
    category: "actions",
    documentationUrl: "https://spectrum.adobe.com/page/button/",
  });
  t.true(Array.isArray(pluginData.options));
  t.true(pluginData.options.length > 0);
});

// Type detection tests
test("convertSchemaToPlugin detects string type", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      label: { type: "string" },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const labelOption = pluginData.options.find((o) => o.title === "label");
  t.is(labelOption.type, "string");
});

test("convertSchemaToPlugin detects boolean type", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      isDisabled: { type: "boolean", default: false },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const option = pluginData.options.find((o) => o.title === "isDisabled");
  t.is(option.type, "boolean");
  t.is(option.defaultValue, false);
});

test("convertSchemaToPlugin detects size enum", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      size: {
        type: "string",
        enum: ["s", "m", "l", "xl"],
        default: "m",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const sizeOption = pluginData.options.find((o) => o.title === "size");
  t.is(sizeOption.type, "size");
  t.deepEqual(sizeOption.items, ["s", "m", "l", "xl"]);
  t.is(sizeOption.defaultValue, "m");
});

test("convertSchemaToPlugin detects state enum", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      state: {
        type: "string",
        enum: ["default", "hover", "focus", "keyboard focus"],
        default: "default",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const stateOption = pluginData.options.find((o) => o.title === "state");
  t.is(stateOption.type, "state");
  t.deepEqual(stateOption.items, [
    "default",
    "hover",
    "focus",
    "keyboard focus",
  ]);
});

test("convertSchemaToPlugin detects local enum", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      variant: {
        type: "string",
        enum: ["accent", "negative", "primary", "secondary"],
        default: "accent",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const variantOption = pluginData.options.find((o) => o.title === "variant");
  t.is(variantOption.type, "localEnum");
  t.deepEqual(variantOption.items, [
    "accent",
    "negative",
    "primary",
    "secondary",
  ]);
});

test("convertSchemaToPlugin detects icon ref", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      icon: {
        $ref: "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const iconOption = pluginData.options.find((o) => o.title === "icon");
  t.is(iconOption.type, "icon");
  t.is(iconOption.items, undefined);
});

test("convertSchemaToPlugin detects color ref", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      staticColor: {
        $ref: "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const colorOption = pluginData.options.find((o) => o.title === "staticColor");
  t.is(colorOption.type, "color");
});

test("convertSchemaToPlugin detects dimension type", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      width: { type: "number", default: 100 },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const widthOption = pluginData.options.find((o) => o.title === "width");
  t.is(widthOption.type, "dimension");
  t.is(widthOption.defaultValue, 100);
});

// Description preservation
test("convertSchemaToPlugin preserves property descriptions", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      icon: {
        $ref: "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
        description: "Icon must be present if the label is not defined.",
      },
    },
  };
  const pluginData = convertSchemaToPlugin(schema);

  const iconOption = pluginData.options.find((o) => o.title === "icon");
  t.is(
    iconOption.description,
    "Icon must be present if the label is not defined.",
  );
});

// Required fields handling
test("convertSchemaToPlugin marks required fields", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {
      label: { type: "string" },
      size: { type: "string", enum: ["s", "m", "l"] },
    },
    required: ["label"],
  };
  const pluginData = convertSchemaToPlugin(schema);

  const labelOption = pluginData.options.find((o) => o.title === "label");
  const sizeOption = pluginData.options.find((o) => o.title === "size");

  t.is(labelOption.required, true);
  t.is(sizeOption.required, false);
});

// Meta handling
test("convertSchemaToPlugin provides default meta when missing", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {},
  };
  const pluginData = convertSchemaToPlugin(schema);

  t.deepEqual(pluginData.meta, {
    category: "",
    documentationUrl: "",
  });
});

test("convertSchemaToPlugin handles partial meta", (t) => {
  const schema = {
    title: "Test",
    meta: {
      category: "actions",
    },
    type: "object",
    properties: {},
  };
  const pluginData = convertSchemaToPlugin(schema);

  t.is(pluginData.meta.category, "actions");
  t.is(pluginData.meta.documentationUrl, "");
});

// Empty properties
test("convertSchemaToPlugin handles missing properties", (t) => {
  const schema = {
    title: "Test",
    type: "object",
  };
  const pluginData = convertSchemaToPlugin(schema);

  t.deepEqual(pluginData.options, []);
});

test("convertSchemaToPlugin handles empty properties object", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    properties: {},
  };
  const pluginData = convertSchemaToPlugin(schema);

  t.deepEqual(pluginData.options, []);
});

// Error handling
test("convertSchemaToPlugin throws on missing title", (t) => {
  const schema = {
    type: "object",
    properties: {},
  };
  const error = t.throws(() => convertSchemaToPlugin(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("title"));
});

test("convertSchemaToPlugin throws on invalid schema", (t) => {
  const error = t.throws(() => convertSchemaToPlugin(null), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("must be an object"));
});

test("convertSchemaToPlugin throws on invalid meta type", (t) => {
  const schema = {
    title: "Test",
    meta: "not an object",
    type: "object",
  };
  const error = t.throws(() => convertSchemaToPlugin(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("meta"));
});

// Real schema fixtures
test("convertSchemaToPlugin handles real button schema", (t) => {
  const schema = loadFixture("official-schema/button.json");
  const pluginData = convertSchemaToPlugin(schema);

  // Check basic structure
  t.is(pluginData.title, "Button");
  t.is(pluginData.meta.category, "actions");

  // Check specific options
  const sizeOption = pluginData.options.find((o) => o.title === "size");
  t.is(sizeOption.type, "size");
  t.truthy(sizeOption.items);

  const stateOption = pluginData.options.find((o) => o.title === "state");
  t.is(stateOption.type, "state");

  const iconOption = pluginData.options.find((o) => o.title === "icon");
  t.is(iconOption.type, "icon");
});

test("convertSchemaToPlugin handles real action-button schema", (t) => {
  const schema = loadFixture("official-schema/action-button.json");
  const pluginData = convertSchemaToPlugin(schema);

  t.is(pluginData.title, schema.title); // Use actual title from schema
  t.is(pluginData.meta.category, "actions");
  t.true(pluginData.options.length > 0);
});

test("convertSchemaToPlugin handles real checkbox schema", (t) => {
  const schema = loadFixture("official-schema/checkbox.json");
  const pluginData = convertSchemaToPlugin(schema);

  t.is(pluginData.title, "Checkbox");
  t.truthy(pluginData.meta);
  t.true(Array.isArray(pluginData.options));
});
