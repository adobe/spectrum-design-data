// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { buildUuidToTokenIndex } from "../src/registry-index.js";

async function makeFixtures(t, tokens, relationships) {
  const tokensDir = await mkdtemp(join(tmpdir(), "registry-index-tokens-"));
  const relationshipsDir = await mkdtemp(
    join(tmpdir(), "registry-index-relationships-"),
  );
  t.teardown(() =>
    Promise.all([
      rm(tokensDir, { recursive: true, force: true }),
      rm(relationshipsDir, { recursive: true, force: true }),
    ]),
  );
  await writeFile(join(tokensDir, "a.tokens.json"), JSON.stringify(tokens));
  await writeFile(
    join(relationshipsDir, "a.json"),
    JSON.stringify(relationships),
  );
  return { tokensDir, relationshipsDir };
}

test("indexes tokens by uuid", async (t) => {
  const { tokensDir, relationshipsDir } = await makeFixtures(
    t,
    [{ uuid: "token-a" }],
    [],
  );
  const index = buildUuidToTokenIndex(tokensDir, relationshipsDir);
  t.true(index.has("token-a"));
});

test("indexes relationship-only CTR uuids not present in any tokens file", async (t) => {
  const { tokensDir, relationshipsDir } = await makeFixtures(
    t,
    [{ uuid: "token-a" }],
    [{ uuid: "ctr-a", $ref: "token-a" }],
  );
  const index = buildUuidToTokenIndex(tokensDir, relationshipsDir);
  t.true(index.has("ctr-a"));
  t.is(index.get("ctr-a").$ref, "token-a");
});

test("omits a uuid present in neither tokens nor relationships", async (t) => {
  const { tokensDir, relationshipsDir } = await makeFixtures(
    t,
    [{ uuid: "token-a" }],
    [{ uuid: "ctr-a" }],
  );
  const index = buildUuidToTokenIndex(tokensDir, relationshipsDir);
  t.false(index.has("unknown-uuid"));
});
