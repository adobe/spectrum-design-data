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
import { SchemaConversionError } from "../../src/utils/errorHandling.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(path) {
  return JSON.parse(readFileSync(join(fixturesDir, path), "utf-8"));
}

// Basic conversion tests
test("convertPluginToSchema converts simple button", (t) => {
  const pluginData = loadFixture("plugin-format/button-simple.json");
  const schema = convertPluginToSchema(pluginData, {
    description: "Buttons allow users to perform an action.",
  });

  t.is(schema.title, "Button");
  t.is(schema.description, "Buttons allow users to perform an action.");
  t.is(schema.type, "object");
  t.is(
    schema.$schema,
    "https://opensource.adobe.com/spectrum-design-data/schemas/component.json",
  );
  t.is(
    schema.$id,
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  );
  t.deepEqual(schema.meta, {
    category: "actions",
    documentationUrl: "https://spectrum.adobe.com/page/button/",
  });
});

// Type mapping tests
test("convertPluginToSchema maps string type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "label", type: "string" }],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.label.type, "string");
});

test("convertPluginToSchema maps boolean type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "isDisabled", type: "boolean", defaultValue: false }],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.isDisabled.type, "boolean");
  t.is(schema.properties.isDisabled.default, false);
});

test("convertPluginToSchema maps localEnum type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      {
        title: "variant",
        type: "localEnum",
        items: ["accent", "negative", "primary"],
        defaultValue: "accent",
      },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.variant.type, "string");
  t.deepEqual(schema.properties.variant.enum, [
    "accent",
    "negative",
    "primary",
  ]);
  t.is(schema.properties.variant.default, "accent");
});

test("convertPluginToSchema maps size type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      {
        title: "size",
        type: "size",
        items: ["s", "m", "l", "xl"],
        defaultValue: "m",
      },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.size.type, "string");
  t.deepEqual(schema.properties.size.enum, ["s", "m", "l", "xl"]);
  t.is(schema.properties.size.default, "m");
});

test("convertPluginToSchema maps state type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      {
        title: "state",
        type: "state",
        items: ["default", "hover", "focus"],
        defaultValue: "default",
      },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.state.type, "string");
  t.deepEqual(schema.properties.state.enum, ["default", "hover", "focus"]);
  t.is(schema.properties.state.default, "default");
});

test("convertPluginToSchema maps icon type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "icon", type: "icon" }],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(
    schema.properties.icon.$ref,
    "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
  );
  t.is(schema.properties.icon.type, undefined);
});

test("convertPluginToSchema maps color type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "staticColor", type: "color" }],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(
    schema.properties.staticColor.$ref,
    "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
  );
});

test("convertPluginToSchema maps dimension type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "width", type: "dimension", defaultValue: 100 }],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.properties.width.type, "number");
  t.is(schema.properties.width.default, 100);
});

// Description preservation
test("convertPluginToSchema preserves option descriptions", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      {
        title: "icon",
        type: "icon",
        description: "Icon must be present if the label is not defined.",
      },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(
    schema.properties.icon.description,
    "Icon must be present if the label is not defined.",
  );
});

// Required fields handling
test("convertPluginToSchema creates required array", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      { title: "label", type: "string", required: true },
      { title: "size", type: "size", items: ["s", "m", "l"], required: false },
      {
        title: "variant",
        type: "localEnum",
        items: ["accent"],
        required: true,
      },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.deepEqual(schema.required, ["label", "variant"]);
});

test("convertPluginToSchema omits required array when empty", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      { title: "label", type: "string", required: false },
      { title: "size", type: "size", items: ["s", "m", "l"] },
    ],
  };
  const schema = convertPluginToSchema(pluginData, { description: "Test" });

  t.is(schema.required, undefined);
});

// Empty options
test("convertPluginToSchema handles empty options array", (t) => {
  const pluginData = loadFixture("plugin-format/empty-options.json");
  const schema = convertPluginToSchema(pluginData, {
    description: "Empty component",
  });

  t.is(schema.properties, undefined);
  t.is(schema.required, undefined);
});

// Schema metadata control
test("convertPluginToSchema can exclude schema metadata", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [],
  };
  const schema = convertPluginToSchema(pluginData, {
    description: "Test",
    includeSchemaMetadata: false,
  });

  t.is(schema.$schema, undefined);
  t.is(schema.$id, undefined);
  t.is(schema.title, "Test");
});

// Error handling
test("convertPluginToSchema throws on missing title", (t) => {
  const pluginData = {
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(error.message.includes("title"));
});

test("convertPluginToSchema throws on missing meta", (t) => {
  const pluginData = {
    title: "Test",
    options: [],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(error.message.includes("meta"));
});

test("convertPluginToSchema throws on missing description", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [],
  };
  const error = t.throws(() => convertPluginToSchema(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("description"));
});

test("convertPluginToSchema throws on invalid option type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "test", type: "invalidType" }],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(error.message.includes("Invalid option type"));
});

test("convertPluginToSchema throws on enum without items", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "variant", type: "localEnum" }],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(error.message.includes("items"));
});

test("convertPluginToSchema throws on empty enum items", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "variant", type: "localEnum", items: [] }],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(
    error.message.toLowerCase().includes("empty") ||
      error.message.includes("at least one"),
  );
});

test("convertPluginToSchema throws on invalid size values", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [
      { title: "size", type: "size", items: ["small", "medium", "large"] },
    ],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(
    error.message.toLowerCase().includes("size") ||
      error.message.includes("invalid"),
  );
});

test("convertPluginToSchema throws on missing option title", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ type: "string" }],
  };
  const error = t.throws(
    () => convertPluginToSchema(pluginData, { description: "Test" }),
    { instanceOf: SchemaConversionError },
  );
  t.true(error.message.includes("title"));
});

// Complex fixtures
test("convertPluginToSchema handles complete button fixture", (t) => {
  const pluginData = loadFixture("plugin-format/button-complete.json");
  const schema = convertPluginToSchema(pluginData, {
    description:
      "Buttons allow users to perform an action or to navigate to another page.",
  });

  t.is(schema.title, "Button");
  t.truthy(schema.properties);
  t.true(Object.keys(schema.properties).length > 5);
  t.truthy(schema.properties.icon.$ref);
  t.truthy(schema.properties.size.enum);
  t.truthy(schema.properties.state.enum);
});

test("convertPluginToSchema handles edge cases fixture", (t) => {
  const pluginData = loadFixture("plugin-format/edge-cases.json");
  const schema = convertPluginToSchema(pluginData, {
    description: "Test edge cases",
  });

  t.deepEqual(schema.required, ["requiredString"]);
  t.is(schema.properties.dimensionOption.type, "number");
  t.is(schema.properties.allSizesOption.enum.length, 7);
});
