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
import {
  validatePluginFormat,
  validateOfficialSchema,
  validateAgainstJsonSchema,
  validateConversionRequirements,
  getValidCategories,
  getValidOptionTypes,
} from "../../src/converters/validators.js";
import { SchemaConversionError } from "../../src/utils/errorHandling.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(path) {
  return JSON.parse(readFileSync(join(fixturesDir, path), "utf-8"));
}

// validatePluginFormat tests
test("validatePluginFormat accepts valid plugin data", (t) => {
  const pluginData = loadFixture("plugin-format/button-simple.json");
  t.true(validatePluginFormat(pluginData));
});

test("validatePluginFormat accepts complete button", (t) => {
  const pluginData = loadFixture("plugin-format/button-complete.json");
  t.true(validatePluginFormat(pluginData));
});

test("validatePluginFormat accepts empty options", (t) => {
  const pluginData = loadFixture("plugin-format/empty-options.json");
  t.true(validatePluginFormat(pluginData));
});

test("validatePluginFormat throws on missing title", (t) => {
  const pluginData = {
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("title"));
});

test("validatePluginFormat throws on empty title", (t) => {
  const pluginData = {
    title: "   ",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("title"));
});

test("validatePluginFormat throws on missing meta", (t) => {
  const pluginData = {
    title: "Test",
    options: [],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("meta"));
});

test("validatePluginFormat throws on invalid category", (t) => {
  const pluginData = {
    title: "Test",
    meta: {
      category: "invalid-category",
      documentationUrl: "https://test.com",
    },
    options: [],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("category"));
});

test("validatePluginFormat throws on missing documentationUrl", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions" },
    options: [],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("documentationUrl"));
});

test("validatePluginFormat throws on invalid options type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: "not an array",
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("options"));
});

test("validatePluginFormat throws on option missing title", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ type: "string" }],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("title"));
});

test("validatePluginFormat throws on invalid option type", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "test", type: "invalidType" }],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("type"));
});

test("validatePluginFormat throws on enum without items", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "variant", type: "localEnum" }],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("items"));
});

test("validatePluginFormat throws on empty enum items", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "variant", type: "localEnum", items: [] }],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(
    error.message.toLowerCase().includes("empty") ||
      error.message.includes("at least one"),
  );
});

test("validatePluginFormat throws on invalid hex color", (t) => {
  const pluginData = {
    title: "Test",
    meta: { category: "actions", documentationUrl: "https://test.com" },
    options: [{ title: "color", type: "color", defaultValue: "not-a-color" }],
  };
  const error = t.throws(() => validatePluginFormat(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("hex color"));
});

// validateOfficialSchema tests
test("validateOfficialSchema accepts valid schema", (t) => {
  const schema = loadFixture("official-schema/button.json");
  t.true(validateOfficialSchema(schema));
});

test("validateOfficialSchema throws on missing title", (t) => {
  const schema = {
    type: "object",
    properties: {},
  };
  const error = t.throws(() => validateOfficialSchema(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("title"));
});

test("validateOfficialSchema throws on invalid type", (t) => {
  const schema = {
    title: "Test",
    type: "array",
  };
  const error = t.throws(() => validateOfficialSchema(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("type"));
});

test("validateOfficialSchema throws on invalid category", (t) => {
  const schema = {
    title: "Test",
    type: "object",
    meta: { category: "invalid-category" },
  };
  const error = t.throws(() => validateOfficialSchema(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("category"));
});

// validateAgainstJsonSchema tests
test("validateAgainstJsonSchema accepts valid JSON Schema", (t) => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
  };
  t.true(validateAgainstJsonSchema(schema));
});

test("validateAgainstJsonSchema throws on invalid schema", (t) => {
  const schema = {
    type: "invalid-type",
  };
  const error = t.throws(() => validateAgainstJsonSchema(schema), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("not valid JSON Schema"));
});

// validateConversionRequirements tests
test("validateConversionRequirements accepts valid data with description", (t) => {
  const pluginData = loadFixture("plugin-format/button-simple.json");
  t.true(
    validateConversionRequirements(pluginData, {
      description: "Test description",
    }),
  );
});

test("validateConversionRequirements throws on missing description", (t) => {
  const pluginData = loadFixture("plugin-format/button-simple.json");
  const error = t.throws(() => validateConversionRequirements(pluginData), {
    instanceOf: SchemaConversionError,
  });
  t.true(error.message.includes("description"));
});

test("validateConversionRequirements throws on empty description", (t) => {
  const pluginData = loadFixture("plugin-format/button-simple.json");
  const error = t.throws(
    () => validateConversionRequirements(pluginData, { description: "   " }),
    {
      instanceOf: SchemaConversionError,
    },
  );
  t.true(error.message.includes("description"));
});

// Helper function tests
test("getValidCategories returns array of categories", (t) => {
  const categories = getValidCategories();
  t.true(Array.isArray(categories));
  t.true(categories.includes("actions"));
  t.true(categories.includes("navigation"));
  t.true(categories.includes("content"));
  t.true(categories.length >= 8);
});

test("getValidOptionTypes returns array of types", (t) => {
  const types = getValidOptionTypes();
  t.true(Array.isArray(types));
  t.true(types.includes("string"));
  t.true(types.includes("boolean"));
  t.true(types.includes("localEnum"));
  t.true(types.includes("size"));
  t.true(types.includes("state"));
  t.true(types.includes("icon"));
  t.true(types.includes("color"));
  t.true(types.length >= 9);
});
