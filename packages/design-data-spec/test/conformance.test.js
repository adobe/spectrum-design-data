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

/**
 * Conformance fixture runner for Layer 2 SPEC rules.
 *
 * For each conformance/invalid/SPEC-NNN/ directory that contains dataset.json,
 * validates the dataset and asserts that all expected errors from
 * expected-errors.json appear in the diagnostics.
 */

import test from "ava";
import { readFile } from "fs/promises";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { validateDataset } from "../src/validate.js";

const readJSON = async (p) => JSON.parse(await readFile(p, "utf8"));

// Discover fixture directories synchronously (AVA requires synchronous test registration).
// Only include directories that have dataset.json (SPEC-018+ format).
const invalidBaseDir = "conformance/invalid";
const fixtureDirs = readdirSync(invalidBaseDir)
  .sort()
  .map((entry) => join(invalidBaseDir, entry))
  .filter((dir) => existsSync(join(dir, "dataset.json")));

for (const dir of fixtureDirs) {
  const ruleId = dir.split("/").pop();

  test(`conformance: ${ruleId} invalid fixture produces expected diagnostics`, async (t) => {
    const dataset = await readJSON(join(dir, "dataset.json"));
    const expected = await readJSON(join(dir, "expected-errors.json"));
    const diagnostics = validateDataset(dataset);

    for (const expectedError of expected.errors) {
      const match = diagnostics.find(
        (d) =>
          d.ruleId === expectedError.rule_id &&
          d.severity === expectedError.severity &&
          new RegExp(expectedError.message_pattern).test(d.message),
      );
      t.truthy(
        match,
        `Expected diagnostic for ${expectedError.rule_id} matching pattern "${expectedError.message_pattern}" not found.\nActual diagnostics:\n${JSON.stringify(diagnostics, null, 2)}`,
      );
    }
  });
}

// Valid fixture: component-refs dataset should produce zero diagnostics.
test("conformance: valid component-refs dataset produces no diagnostics", async (t) => {
  const dataset = await readJSON(
    "conformance/valid/component-refs/dataset.json",
  );
  const diagnostics = validateDataset(dataset);
  t.deepEqual(diagnostics, []);
});
