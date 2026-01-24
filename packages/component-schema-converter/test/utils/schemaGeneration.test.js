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
  toKebabCase,
  generateSchemaId,
  generateIconRef,
  generateColorRef,
  getSchemaBaseUrl,
  JSON_SCHEMA_VERSION,
} from "../../src/utils/schemaGeneration.js";

// toKebabCase tests
test("toKebabCase converts simple titles", (t) => {
  t.is(toKebabCase("Button"), "button");
  t.is(toKebabCase("Checkbox"), "checkbox");
});

test("toKebabCase handles spaces", (t) => {
  t.is(toKebabCase("Action Button"), "action-button");
  t.is(toKebabCase("Alert Banner"), "alert-banner");
  t.is(toKebabCase("Bottom Navigation Android"), "bottom-navigation-android");
});

test("toKebabCase handles camelCase", (t) => {
  t.is(toKebabCase("ActionButton"), "action-button");
  t.is(toKebabCase("alertBanner"), "alert-banner");
  t.is(toKebabCase("bottomNavigationAndroid"), "bottom-navigation-android");
});

test("toKebabCase handles PascalCase", (t) => {
  t.is(toKebabCase("ActionButton"), "action-button");
  t.is(toKebabCase("AlertBanner"), "alert-banner");
});

test("toKebabCase handles underscores", (t) => {
  t.is(toKebabCase("action_button"), "action-button");
  t.is(toKebabCase("alert_banner"), "alert-banner");
});

test("toKebabCase handles mixed formats", (t) => {
  t.is(toKebabCase("Action_Button"), "action-button");
  // "ActionButton With Spaces" becomes "action-button-with-spaces"
  // The camelCase is converted first, then spaces
  t.is(toKebabCase("ActionButton With Spaces"), "action-button-with-spaces");
});

test("toKebabCase removes invalid characters", (t) => {
  t.is(toKebabCase("Button!@#$%"), "button");
  t.is(toKebabCase("Action-Button (Special)"), "action-button-special");
  t.is(toKebabCase("Alert/Banner"), "alertbanner");
});

test("toKebabCase handles edge cases", (t) => {
  t.is(toKebabCase(""), "");
  t.is(toKebabCase("   "), "");
  t.is(toKebabCase("---"), "");
  t.is(toKebabCase("button"), "button");
  t.is(toKebabCase("BUTTON"), "button");
});

test("toKebabCase handles multiple hyphens", (t) => {
  t.is(toKebabCase("Action---Button"), "action-button");
  t.is(toKebabCase("--Button--"), "button");
});

test("toKebabCase handles non-string input", (t) => {
  t.is(toKebabCase(null), "");
  t.is(toKebabCase(undefined), "");
  t.is(toKebabCase(123), "");
});

// generateSchemaId tests
test("generateSchemaId creates correct URLs", (t) => {
  t.is(
    generateSchemaId("Button"),
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json",
  );
  t.is(
    generateSchemaId("Action Button"),
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/action-button.json",
  );
  t.is(
    generateSchemaId("Alert Banner"),
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/alert-banner.json",
  );
});

test("generateSchemaId handles complex titles", (t) => {
  t.is(
    generateSchemaId("Bottom Navigation Android"),
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/bottom-navigation-android.json",
  );
});

// generateIconRef tests
test("generateIconRef returns correct URL", (t) => {
  t.is(
    generateIconRef(),
    "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
  );
});

// generateColorRef tests
test("generateColorRef returns correct URL", (t) => {
  t.is(
    generateColorRef(),
    "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
  );
});

// getSchemaBaseUrl tests
test("getSchemaBaseUrl returns base URL", (t) => {
  t.is(
    getSchemaBaseUrl(),
    "https://opensource.adobe.com/spectrum-design-data/schemas",
  );
});

// JSON_SCHEMA_VERSION tests
test("JSON_SCHEMA_VERSION is correct", (t) => {
  t.is(
    JSON_SCHEMA_VERSION,
    "https://opensource.adobe.com/spectrum-design-data/schemas/component.json",
  );
});
