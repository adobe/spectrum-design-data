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

test("known exception token is marked as known", async (t) => {
  // fixturesDir has packages/tokens/naming-exceptions.json which lists
  // accent-background-color-default, so scanStringNames classifies it as known.
  const { scanStringNames } = await import("../src/scan-string-names.js");

  const results = await scanStringNames(fixturesDir);

  const known = results.find(
    (r) => r.token === "accent-background-color-default",
  );
  t.truthy(known, "accent-background-color-default should appear in results");
  t.is(known.status, "known");
  t.is(known.category, "compound-state");
});

test("unrecorded string-name token is marked as unrecorded", async (t) => {
  const { scanStringNames } = await import("../src/scan-string-names.js");

  const results = await scanStringNames(fixturesDir);

  const unrecorded = results.find(
    (r) => r.token === "some-unrecorded-legacy-token",
  );
  t.truthy(unrecorded, "some-unrecorded-legacy-token should appear in results");
  t.is(unrecorded.status, "unrecorded");
});

test("structured-name token is not included in string-name results", async (t) => {
  const { scanStringNames } = await import("../src/scan-string-names.js");

  const results = await scanStringNames(fixturesDir);
  const names = results.map((r) => r.token);
  t.false(
    names.some((n) => typeof n === "object"),
    "structured-name tokens should not appear",
  );
});

test("scan returns file path relative to root", async (t) => {
  const { scanStringNames } = await import("../src/scan-string-names.js");

  const results = await scanStringNames(fixturesDir);
  for (const result of results) {
    t.false(
      result.file.startsWith("/"),
      `file path should be relative, got: ${result.file}`,
    );
  }
});
