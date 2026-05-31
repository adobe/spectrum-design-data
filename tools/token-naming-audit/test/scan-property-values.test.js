/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

test("valid property value does not appear in results", async (t) => {
  const { scanPropertyValues } = await import("../src/scan-property-values.js");

  const results = await scanPropertyValues(fixturesDir);
  const propertyValues = results.map((r) => r.propertyValue);
  t.false(
    propertyValues.includes("color"),
    '"color" is valid and should not be flagged',
  );
});

test("background is flagged and suggests object field", async (t) => {
  const { scanPropertyValues } = await import("../src/scan-property-values.js");

  const results = await scanPropertyValues(fixturesDir);
  const bgEntry = results.find((r) => r.propertyValue === "background");
  t.truthy(bgEntry, '"background" should be flagged as overloaded');
  t.is(bgEntry.suggestedField, "object");
});

test("icon is flagged and suggests anatomy field", async (t) => {
  const { scanPropertyValues } = await import("../src/scan-property-values.js");

  const results = await scanPropertyValues(fixturesDir);
  const iconEntry = results.find((r) => r.propertyValue === "icon");
  t.truthy(iconEntry, '"icon" should be flagged as overloaded');
  t.is(iconEntry.suggestedField, "anatomy");
});

test("each result includes file, token, and propertyValue fields", async (t) => {
  const { scanPropertyValues } = await import("../src/scan-property-values.js");

  const results = await scanPropertyValues(fixturesDir);
  for (const result of results) {
    t.truthy(result.file, "result must have file");
    t.truthy(result.token, "result must have token");
    t.truthy(result.propertyValue, "result must have propertyValue");
  }
});
