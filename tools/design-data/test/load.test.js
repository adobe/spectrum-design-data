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

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import test from "ava";
import { loadDataset } from "../src/load.js";

const TMP = join(tmpdir(), "design-data-js-load-" + randomUUID().slice(0, 8));

const SAMPLE_TOKEN_1 = {
  name: { property: "background-color" },
  value: "#ffffff",
  uuid: "aaaaaaaa-0001-4000-8000-000000000001",
};

const SAMPLE_TOKEN_2 = {
  name: { property: "border-color" },
  value: "#000000",
  uuid: "aaaaaaaa-0002-4000-8000-000000000002",
};

test.before(() => {
  mkdirSync(join(TMP, "sub"), { recursive: true });
  writeFileSync(
    join(TMP, "base.tokens.json"),
    JSON.stringify([SAMPLE_TOKEN_1]),
    "utf-8",
  );
  writeFileSync(
    join(TMP, "sub", "extra.tokens.json"),
    JSON.stringify([SAMPLE_TOKEN_2]),
    "utf-8",
  );
  // A non-cascade file that should be skipped.
  writeFileSync(
    join(TMP, "legacy.json"),
    JSON.stringify({ key: { value: "#abc" } }),
    "utf-8",
  );
});

test.after(() => rmSync(TMP, { recursive: true, force: true }));

test("loadDataset returns a Dataset with correct tokenCount", async (t) => {
  const ds = await loadDataset(TMP);
  t.is(ds.tokenCount(), 2);
});

test("loadDataset tokens are queryable", async (t) => {
  const ds = await loadDataset(TMP);
  const results = ds.query("property=background-color");
  t.is(results.length, 1);
  // result.name is the UUID key; property lives in the raw Map under name.property
  t.is(results[0].raw.get("name")?.get("property"), "background-color");
});

test("loadDataset walks subdirectories", async (t) => {
  const ds = await loadDataset(TMP);
  const results = ds.query("property=border-color");
  t.is(results.length, 1);
});

test("loadDataset with empty directory returns empty Dataset", async (t) => {
  const emptyDir = join(TMP, "empty");
  mkdirSync(emptyDir, { recursive: true });
  const ds = await loadDataset(emptyDir);
  t.is(ds.tokenCount(), 0);
});
