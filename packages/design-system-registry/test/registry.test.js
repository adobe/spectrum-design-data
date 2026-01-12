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
import {
  sizes,
  states,
  variants,
  anatomyTerms,
  components,
  scaleValues,
  categories,
  platforms,
  getValues,
  findValue,
  hasValue,
  getDefault,
  getActiveValues,
} from "../index.js";

// Test that all registries load without errors
test("sizes registry loads successfully", (t) => {
  t.truthy(sizes);
  t.truthy(sizes.values);
  t.true(Array.isArray(sizes.values));
  t.true(sizes.values.length > 0);
});

test("states registry loads successfully", (t) => {
  t.truthy(states);
  t.truthy(states.values);
  t.true(Array.isArray(states.values));
  t.true(states.values.length > 0);
});

test("variants registry loads successfully", (t) => {
  t.truthy(variants);
  t.truthy(variants.values);
  t.true(Array.isArray(variants.values));
  t.true(variants.values.length > 0);
});

test("anatomyTerms registry loads successfully", (t) => {
  t.truthy(anatomyTerms);
  t.truthy(anatomyTerms.values);
  t.true(Array.isArray(anatomyTerms.values));
  t.true(anatomyTerms.values.length > 0);
});

test("components registry loads successfully", (t) => {
  t.truthy(components);
  t.truthy(components.values);
  t.true(Array.isArray(components.values));
  t.true(components.values.length > 0);
});

test("scaleValues registry loads successfully", (t) => {
  t.truthy(scaleValues);
  t.truthy(scaleValues.values);
  t.true(Array.isArray(scaleValues.values));
  t.true(scaleValues.values.length > 0);
});

test("categories registry loads successfully", (t) => {
  t.truthy(categories);
  t.truthy(categories.values);
  t.true(Array.isArray(categories.values));
  t.true(categories.values.length > 0);
});

test("platforms registry loads successfully", (t) => {
  t.truthy(platforms);
  t.truthy(platforms.values);
  t.true(Array.isArray(platforms.values));
  t.true(platforms.values.length > 0);
});

// Test for duplicate IDs within registries
test("sizes registry has no duplicate IDs", (t) => {
  const ids = sizes.values.map((v) => v.id);
  const uniqueIds = new Set(ids);
  t.is(ids.length, uniqueIds.size);
});

test("states registry has no duplicate IDs", (t) => {
  const ids = states.values.map((v) => v.id);
  const uniqueIds = new Set(ids);
  t.is(ids.length, uniqueIds.size);
});

test("variants registry has no duplicate IDs", (t) => {
  const ids = variants.values.map((v) => v.id);
  const uniqueIds = new Set(ids);
  t.is(ids.length, uniqueIds.size);
});

test("components registry has no duplicate IDs", (t) => {
  const ids = components.values.map((v) => v.id);
  const uniqueIds = new Set(ids);
  t.is(ids.length, uniqueIds.size);
});

// Test for duplicate aliases
test("sizes registry has no duplicate aliases", (t) => {
  const aliases = sizes.values.flatMap((v) => v.aliases || []);
  const uniqueAliases = new Set(aliases);
  t.is(aliases.length, uniqueAliases.size);
});

test("states registry has no duplicate aliases", (t) => {
  const aliases = states.values.flatMap((v) => v.aliases || []);
  const uniqueAliases = new Set(aliases);
  t.is(aliases.length, uniqueAliases.size);
});

// Test that required fields exist
test("all size values have id and label", (t) => {
  sizes.values.forEach((value) => {
    t.truthy(value.id, `Size value missing id`);
    t.truthy(value.label, `Size value ${value.id} missing label`);
  });
});

test("all state values have id and label", (t) => {
  states.values.forEach((value) => {
    t.truthy(value.id, `State value missing id`);
    t.truthy(value.label, `State value ${value.id} missing label`);
  });
});

test("all component values have id, label, and documentationUrl", (t) => {
  components.values.forEach((value) => {
    t.truthy(value.id, `Component value missing id`);
    t.truthy(value.label, `Component value ${value.id} missing label`);
    t.truthy(
      value.documentationUrl,
      `Component ${value.id} missing documentationUrl`,
    );
  });
});

// Test default values
test("sizes registry has exactly one default value", (t) => {
  const defaults = sizes.values.filter((v) => v.default === true);
  t.is(defaults.length, 1);
  t.is(defaults[0].id, "m");
});

test("states registry has exactly one default value", (t) => {
  const defaults = states.values.filter((v) => v.default === true);
  t.is(defaults.length, 1);
  t.is(defaults[0].id, "default");
});

// Test helper functions
test("getValues returns array of IDs", (t) => {
  const values = getValues(sizes);
  t.true(Array.isArray(values));
  t.true(values.length > 0);
  t.true(values.includes("s"));
  t.true(values.includes("m"));
  t.true(values.includes("l"));
});

test("findValue finds value by ID", (t) => {
  const value = findValue(sizes, "m");
  t.truthy(value);
  t.is(value.id, "m");
  t.is(value.label, "Medium");
});

test("findValue finds value by alias", (t) => {
  const value = findValue(sizes, "medium");
  t.truthy(value);
  t.is(value.id, "m");
});

test("findValue returns undefined for non-existent value", (t) => {
  const value = findValue(sizes, "nonexistent");
  t.is(value, undefined);
});

test("hasValue returns true for existing ID", (t) => {
  t.true(hasValue(sizes, "m"));
});

test("hasValue returns true for existing alias", (t) => {
  t.true(hasValue(sizes, "medium"));
});

test("hasValue returns false for non-existent value", (t) => {
  t.false(hasValue(sizes, "nonexistent"));
});

test("getDefault returns the default value", (t) => {
  const defaultSize = getDefault(sizes);
  t.truthy(defaultSize);
  t.is(defaultSize.id, "m");
  t.true(defaultSize.default);
});

test("getActiveValues returns only non-deprecated values", (t) => {
  const activeValues = getActiveValues(sizes);
  t.true(Array.isArray(activeValues));
  activeValues.forEach((value) => {
    t.not(value.deprecated, true);
  });
});

// Test specific registry content
test("sizes includes common t-shirt sizes", (t) => {
  const ids = getValues(sizes);
  t.true(ids.includes("xs"));
  t.true(ids.includes("s"));
  t.true(ids.includes("m"));
  t.true(ids.includes("l"));
  t.true(ids.includes("xl"));
});

test("states includes common interaction states", (t) => {
  const ids = getValues(states);
  t.true(ids.includes("default"));
  t.true(ids.includes("hover"));
  t.true(ids.includes("focus"));
  t.true(ids.includes("disabled"));
});

test("variants includes semantic variants", (t) => {
  const ids = getValues(variants);
  t.true(ids.includes("accent"));
  t.true(ids.includes("negative"));
  t.true(ids.includes("positive"));
});

test("anatomyTerms includes key anatomy parts", (t) => {
  const ids = getValues(anatomyTerms);
  t.true(ids.includes("edge"));
  t.true(ids.includes("visual"));
  t.true(ids.includes("text"));
  t.true(ids.includes("icon"));
});

test("components includes core components", (t) => {
  const ids = getValues(components);
  t.true(ids.includes("button"));
  t.true(ids.includes("checkbox"));
  t.true(ids.includes("text-field"));
});

test("categories includes all 8 component categories", (t) => {
  const ids = getValues(categories);
  t.is(ids.length, 8);
  t.true(ids.includes("actions"));
  t.true(ids.includes("containers"));
  t.true(ids.includes("inputs"));
  t.true(ids.includes("navigation"));
});

test("platforms includes desktop and mobile", (t) => {
  const ids = getValues(platforms);
  t.true(ids.includes("desktop"));
  t.true(ids.includes("mobile"));
});

test("scaleValues includes common numeric scales", (t) => {
  const ids = getValues(scaleValues);
  t.true(ids.includes("50"));
  t.true(ids.includes("100"));
  t.true(ids.includes("200"));
  t.true(ids.includes("300"));
});
