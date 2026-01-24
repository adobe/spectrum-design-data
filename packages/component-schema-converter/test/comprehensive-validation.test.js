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
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { convertSchemaToPlugin, convertPluginToSchema } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to component schemas in the monorepo
const componentSchemasDir = join(
  __dirname,
  "..",
  "..",
  "component-schemas",
  "schemas",
  "components",
);

// Get all component schema files
const getAllComponentSchemas = () => {
  const files = readdirSync(componentSchemasDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  return files.map((file) => ({
    name: file.replace(".json", ""),
    path: join(componentSchemasDir, file),
  }));
};

// Load a schema file
const loadSchema = (path) => {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
};

// Test each component schema
const allSchemas = getAllComponentSchemas();

console.log(`\n🔍 Validating ${allSchemas.length} component schemas...\n`);

// Test schema → plugin conversion for each component
for (const { name, path } of allSchemas) {
  test(`${name}: can convert official schema to plugin format`, (t) => {
    const schema = loadSchema(path);

    try {
      const pluginData = convertSchemaToPlugin(schema);

      // Verify basic structure
      t.truthy(pluginData, "Plugin data should be returned");
      t.is(typeof pluginData.title, "string", "Should have title");
      t.truthy(pluginData.meta, "Should have meta");
      t.true(Array.isArray(pluginData.options), "Should have options array");

      // Verify meta fields
      t.is(typeof pluginData.meta.category, "string", "Should have category");
    } catch (error) {
      t.fail(`Failed to convert ${name}: ${error.message}`);
    }
  });
}

// Test round-trip conversion for each component
for (const { name, path } of allSchemas) {
  test(`${name}: can round-trip through plugin format`, (t) => {
    const originalSchema = loadSchema(path);

    try {
      // Schema → Plugin
      const pluginData = convertSchemaToPlugin(originalSchema);

      // Plugin → Schema (need to provide description)
      const convertedSchema = convertPluginToSchema(pluginData, {
        description:
          originalSchema.description || `${originalSchema.title} component`,
      });

      // Verify round-trip preserves key data
      t.is(
        convertedSchema.title,
        originalSchema.title,
        "Title should be preserved",
      );
      t.is(
        convertedSchema.$schema,
        originalSchema.$schema,
        "$schema should be preserved",
      );
      t.is(
        convertedSchema.type,
        originalSchema.type,
        "Type should be preserved",
      );

      // Verify properties are preserved
      const originalProps = Object.keys(originalSchema.properties || {});
      const convertedProps = Object.keys(convertedSchema.properties || {});

      t.is(
        convertedProps.length,
        originalProps.length,
        `Should preserve all ${originalProps.length} properties`,
      );

      // Verify each property exists
      for (const propName of originalProps) {
        t.truthy(
          convertedSchema.properties[propName],
          `Property ${propName} should be preserved`,
        );
      }
    } catch (error) {
      t.fail(`Failed to round-trip ${name}: ${error.message}`);
    }
  });
}

// Summary test that reports all schemas
test("summary: all component schemas can be converted", (t) => {
  const results = {
    total: allSchemas.length,
    successful: 0,
    failed: [],
    errors: {},
  };

  for (const { name, path } of allSchemas) {
    try {
      const schema = loadSchema(path);
      const pluginData = convertSchemaToPlugin(schema);
      const convertedBack = convertPluginToSchema(pluginData, {
        description: schema.description || `${schema.title} component`,
      });

      // Verify basic round-trip
      if (
        convertedBack.title === schema.title &&
        Object.keys(convertedBack.properties || {}).length ===
          Object.keys(schema.properties || {}).length
      ) {
        results.successful++;
      } else {
        results.failed.push(name);
        results.errors[name] = "Round-trip validation failed";
      }
    } catch (error) {
      results.failed.push(name);
      results.errors[name] = error.message;
    }
  }

  // Log results
  console.log("\n" + "=".repeat(80));
  console.log("📊 COMPREHENSIVE VALIDATION RESULTS");
  console.log("=".repeat(80));
  console.log(`Total schemas tested: ${results.total}`);
  console.log(
    `✅ Successfully converted: ${results.successful} (${((results.successful / results.total) * 100).toFixed(1)}%)`,
  );
  console.log(`❌ Failed to convert: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log("\n❌ FAILED SCHEMAS:");
    for (const name of results.failed) {
      console.log(`  - ${name}: ${results.errors[name]}`);
    }
  } else {
    console.log("\n🎉 ALL SCHEMAS CONVERTED SUCCESSFULLY!");
  }
  console.log("=".repeat(80) + "\n");

  // Test passes if all schemas converted successfully
  t.is(
    results.failed.length,
    0,
    `All ${results.total} schemas should convert successfully`,
  );
  t.is(results.successful, results.total, "Success count should match total");
});
