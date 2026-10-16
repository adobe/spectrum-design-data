// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Kept in its own serial test file (rather than added to design-data.test.js) because
// every test here stubs the shared `global.fetch` and resets dataset-freshness.js's
// module-level cache — design-data.test.js's other primer tests run concurrently and
// would race with that shared mutable state (a separate worker process, so no
// cross-file interference, but same-file tests still need `test.serial`).

import test from "ava";
import { createDesignDataTools } from "../src/tools/design-data.js";
import { isBehind, __resetFreshnessCache } from "../src/dataset-freshness.js";

function getTools() {
  return Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
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
  "design-data-primer flags provenance.datasetStatus when embedded version is behind",
  async (t) => {
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "999.0.0" }),
      });
    const result = await getTools()["design-data-primer"].handler({});
    t.true(result.provenance.datasetStatus.isStale);
    t.is(result.provenance.datasetStatus.latestVersion, "999.0.0");
    t.truthy(result.provenance.datasetStatus.message);
  },
);

test.serial(
  "design-data-primer reports datasetStatus without a message when up to date",
  async (t) => {
    const embeddedVersion = (await getTools()["design-data-primer"].handler({}))
      .provenance.designDataVersion;
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: embeddedVersion }),
      });
    __resetFreshnessCache();
    const result = await getTools()["design-data-primer"].handler({});
    t.false(result.provenance.datasetStatus.isStale);
    t.falsy(result.provenance.datasetStatus.message);
  },
);

test.serial(
  "design-data-primer still returns when the freshness check fails (offline)",
  async (t) => {
    // global.fetch already rejects by default (see beforeEach)
    const result = await getTools()["design-data-primer"].handler({});
    t.truthy(result.provenance, "primer should not throw when offline");
    t.falsy(
      result.provenance.datasetStatus,
      "datasetStatus should be absent when the check fails",
    );
  },
);

test.serial(
  "a failed check does not permanently disable future checks (no stuck cache)",
  async (t) => {
    // global.fetch rejects by default (see beforeEach) — first call fails.
    const offlineResult = await getTools()["design-data-primer"].handler({});
    t.falsy(offlineResult.provenance.datasetStatus);

    // Network "comes back" — a later primer call should retry, not stay stuck
    // on the memoized failure.
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "999.0.0" }),
      });
    const onlineResult = await getTools()["design-data-primer"].handler({});
    t.true(
      onlineResult.provenance.datasetStatus?.isStale,
      "freshness check should retry after a prior failure, not stay cached as null",
    );
  },
);
