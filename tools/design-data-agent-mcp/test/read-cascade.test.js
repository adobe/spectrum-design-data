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
// every test here mutates the shared `config` singleton (config.cascadeDataPath /
// config.cascadeActive) to simulate a resolved cascade — read.js's module-level
// dataset cache means these must not interleave with each other or with
// read.test.js's embedded-dataset assertions (a separate worker process, so no
// cross-file interference, but same-file tests still need `test.serial`).

import test from "ava";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../src/config.js";
import { createReadTools } from "../src/tools/read.js";

// The cascade dataset's provenance has no designDataVersion, so checkDatasetFreshness
// already short-circuits without a network call — this just guards against that
// changing later. Keeps this file hermetic; the check itself is covered by
// test/dataset-freshness.test.js.
process.env.DESIGN_DATA_SKIP_VERSION_CHECK = "1";

const FIXTURE_TOKEN = {
  name: { property: "test-cascade" },
  $schema:
    "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
  value: "#ff00ff",
  uuid: "11111111-1111-1111-1111-111111111111",
};

test.before((t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-read-test-"));
  writeFileSync(
    join(dir, "resolved.tokens.json"),
    JSON.stringify([FIXTURE_TOKEN]),
  );
  t.context.dir = dir;
  t.context.originalDataPath = config.dataPath;
  t.context.originalDataRoot = config.dataRoot;
  t.context.savedCascadeDataPath = config.cascadeDataPath;
  t.context.savedCascadeActive = config.cascadeActive;
  config.cascadeDataPath = dir;
  config.cascadeActive = true;
});

test.after.always((t) => {
  config.cascadeDataPath = t.context.savedCascadeDataPath;
  config.cascadeActive = t.context.savedCascadeActive;
  rmSync(t.context.dir, { recursive: true, force: true });
});

function getHandler(name) {
  const tool = createReadTools().find((t) => t.name === name);
  if (!tool) throw new Error(`tool "${name}" not found`);
  return tool.handler.bind(tool);
}

test.serial(
  "primer reflects the cascade dataset, not the embedded one",
  async (t) => {
    const result = await getHandler("primer")();
    t.is(result.source, "cascade");
    t.is(result.tokenCount, 1);
  },
);

test.serial("resolve_token returns the cascade-resolved token", async (t) => {
  const result = await getHandler("resolve_token")({
    property: "test-cascade",
  });
  t.is(result.token.raw.value, "#ff00ff");
});

test.serial(
  "query_tokens returns tokens from the cascade dataset",
  async (t) => {
    const result = await getHandler("query_tokens")({ filter: "" });
    t.is(result.length, 1);
    t.is(result[0].raw.value, "#ff00ff");
  },
);

test.serial(
  "cascade does not leak into config.dataPath/dataRoot (the fallback anchors write/authoring/data tools use)",
  (t) => {
    t.is(config.dataPath, t.context.originalDataPath);
    t.is(config.dataRoot, t.context.originalDataRoot);
  },
);
