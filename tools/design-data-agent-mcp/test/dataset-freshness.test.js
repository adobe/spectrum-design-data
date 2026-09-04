// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Kept in its own serial test file (rather than added to read.test.js) because
// every test here stubs the shared `global.fetch` and resets dataset-freshness.js's
// module-level cache — read.test.js's other primer tests run concurrently and would
// race with that shared mutable state (a separate worker process, so no cross-file
// interference, but same-file tests still need `test.serial`).

import test from "ava";
import { createReadTools } from "../src/tools/read.js";
import { isBehind, __resetFreshnessCache } from "../src/dataset-freshness.js";

function getHandler(name) {
  const tools = createReadTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool "${name}" not found`);
  return tool.handler.bind(tool);
}

test.serial.beforeEach((t) => {
  __resetFreshnessCache();
  t.context.savedFetch = global.fetch;
  global.fetch = () => Promise.reject(new Error("network disabled in test"));
});

test.serial.afterEach((t) => {
  global.fetch = t.context.savedFetch;
  __resetFreshnessCache();
});

test.serial("isBehind: numeric major.minor.patch compare", (t) => {
  t.true(isBehind("2.3.0", "2.6.0"));
  t.false(isBehind("2.6.0", "2.6.0"));
  t.false(isBehind("2.6.0", "2.3.0"));
  t.true(isBehind("2.6", "2.6.1"));
});

test.serial(
  "primer flags provenance.datasetStatus when embedded version is behind",
  async (t) => {
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "999.0.0" }),
      });
    const primer = getHandler("primer");
    const result = await primer();
    t.true(result.provenance.datasetStatus.isStale);
    t.is(result.provenance.datasetStatus.latestVersion, "999.0.0");
    t.truthy(result.provenance.datasetStatus.message);
  },
);

test.serial(
  "primer reports datasetStatus without a message when up to date",
  async (t) => {
    const primer = getHandler("primer");
    const embeddedVersion = (await primer()).provenance.designDataVersion;
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: embeddedVersion }),
      });
    __resetFreshnessCache();
    const result = await primer();
    t.false(result.provenance.datasetStatus.isStale);
    t.falsy(result.provenance.datasetStatus.message);
  },
);

test.serial(
  "primer still returns when the freshness check fails (offline)",
  async (t) => {
    // global.fetch already rejects by default (see beforeEach)
    const primer = getHandler("primer");
    const result = await primer();
    t.truthy(result.provenance, "primer should not throw when offline");
    t.falsy(
      result.provenance.datasetStatus,
      "datasetStatus should be absent when the check fails",
    );
  },
);
