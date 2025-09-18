#!/usr/bin/env node

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

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load all component schemas
const schemasPath = join(
  __dirname,
  "../../packages/component-schemas/schemas/components",
);
const schemaFiles = readdirSync(schemasPath).filter((file) =>
  file.endsWith(".json"),
);

const booleanProperties = [];

for (const file of schemaFiles) {
  try {
    const schemaPath = join(schemasPath, file);
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const componentName = file.replace(".json", "");

    if (schema.properties) {
      for (const [propName, propDef] of Object.entries(schema.properties)) {
        if (propDef.type === "boolean") {
          booleanProperties.push({
            component: componentName,
            property: propName,
            default: propDef.default,
            description: propDef.description || "",
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load schema ${file}:`, error.message);
  }
}

console.log(
  "🔍 Analyzing boolean properties for default value consistency...\n",
);
console.log(
  `Found ${booleanProperties.length} boolean properties across ${new Set(booleanProperties.map((p) => p.component)).size} components\n`,
);

// Categorize properties by naming pattern
const patterns = {
  is: booleanProperties.filter((p) => p.property.startsWith("is")),
  has: booleanProperties.filter((p) => p.property.startsWith("has")),
  show: booleanProperties.filter((p) => p.property.startsWith("show")),
  hide: booleanProperties.filter((p) => p.property.startsWith("hide")),
  other: booleanProperties.filter(
    (p) =>
      !p.property.startsWith("is") &&
      !p.property.startsWith("has") &&
      !p.property.startsWith("show") &&
      !p.property.startsWith("hide"),
  ),
};

console.log("📊 BOOLEAN PROPERTY PATTERNS");
console.log("=".repeat(60));

for (const [patternName, properties] of Object.entries(patterns)) {
  if (properties.length === 0) continue;

  console.log(
    `\n${patternName.toUpperCase()}* properties (${properties.length}):`,
  );

  // Check default values
  const withDefaults = properties.filter((p) => p.default !== undefined);
  const withoutDefaults = properties.filter((p) => p.default === undefined);

  console.log(`  - With explicit defaults: ${withDefaults.length}`);
  console.log(
    `  - Without defaults (implicit false): ${withoutDefaults.length}`,
  );

  // Analyze default values
  const falseDefaults = withDefaults.filter((p) => p.default === false);
  const trueDefaults = withDefaults.filter((p) => p.default === true);

  console.log(`  - Default false: ${falseDefaults.length}`);
  console.log(`  - Default true: ${trueDefaults.length}`);

  // Show properties that default to true (potential issues)
  if (trueDefaults.length > 0) {
    console.log(`\n  ⚠️  Properties defaulting to TRUE (may need review):`);
    trueDefaults.forEach((prop) => {
      console.log(`    - ${prop.component}.${prop.property} = ${prop.default}`);
      if (prop.description) {
        console.log(`      Description: ${prop.description}`);
      }
    });
  }

  // Show properties without defaults (should be false by default)
  if (withoutDefaults.length > 0) {
    console.log(`\n  ✅ Properties without defaults (implicit false):`);
    withoutDefaults.forEach((prop) => {
      console.log(`    - ${prop.component}.${prop.property}`);
      if (prop.description) {
        console.log(`      Description: ${prop.description}`);
      }
    });
  }
}

// Analyze specific patterns for consistency
console.log("\n\n🔍 PATTERN CONSISTENCY ANALYSIS");
console.log("=".repeat(60));

// Check for show/hide pairs
const showProps = patterns.show.map((p) => p.property);
const hideProps = patterns.hide.map((p) => p.property);

console.log("\nShow/Hide Pattern Analysis:");
console.log(`Show properties: ${showProps.join(", ")}`);
console.log(`Hide properties: ${hideProps.join(", ")}`);

// Look for potential show/hide pairs
const potentialPairs = [];
for (const showProp of showProps) {
  const hideProp = showProp.replace("show", "hide");
  if (hideProps.includes(hideProp)) {
    potentialPairs.push({ show: showProp, hide: hideProp });
  }
}

if (potentialPairs.length > 0) {
  console.log("\nPotential show/hide pairs found:");
  potentialPairs.forEach((pair) => {
    console.log(`  - ${pair.show} / ${pair.hide}`);
  });
}

// Check for properties that might be better as opposites
console.log("\n\n🤔 POTENTIAL NAMING IMPROVEMENTS");
console.log("=".repeat(60));

// Look for properties that default to true and might be better as negatives
const trueDefaultProps = booleanProperties.filter((p) => p.default === true);
if (trueDefaultProps.length > 0) {
  console.log(
    "\nProperties defaulting to TRUE that might be better as negatives:",
  );
  trueDefaultProps.forEach((prop) => {
    const suggestion = prop.property.startsWith("is")
      ? prop.property.replace("is", "isNot")
      : prop.property.startsWith("has")
        ? prop.property.replace("has", "hasNo")
        : prop.property.startsWith("show")
          ? prop.property.replace("show", "hide")
          : `not${prop.property.charAt(0).toUpperCase() + prop.property.slice(1)}`;

    console.log(`  - ${prop.component}.${prop.property} (default: true)`);
    console.log(`    💡 Consider: ${suggestion} (default: false)`);
    if (prop.description) {
      console.log(`    Description: ${prop.description}`);
    }
    console.log("");
  });
}

// Summary
console.log("\n\n📋 SUMMARY");
console.log("=".repeat(60));

const totalProps = booleanProperties.length;
const withDefaults = booleanProperties.filter(
  (p) => p.default !== undefined,
).length;
const falseDefaults = booleanProperties.filter(
  (p) => p.default === false,
).length;
const trueDefaults = booleanProperties.filter((p) => p.default === true).length;
const implicitFalse = booleanProperties.filter(
  (p) => p.default === undefined,
).length;

console.log(`Total boolean properties: ${totalProps}`);
console.log(`With explicit defaults: ${withDefaults}`);
console.log(`  - Default false: ${falseDefaults}`);
console.log(`  - Default true: ${trueDefaults}`);
console.log(`Without defaults (implicit false): ${implicitFalse}`);

const complianceRate = (
  ((falseDefaults + implicitFalse) / totalProps) *
  100
).toFixed(1);
console.log(`\nCompliance with "default false" rule: ${complianceRate}%`);

if (trueDefaults > 0) {
  console.log(
    `\n⚠️  ${trueDefaults} properties default to true and may need review`,
  );
} else {
  console.log('\n✅ All boolean properties follow the "default false" rule!');
}
