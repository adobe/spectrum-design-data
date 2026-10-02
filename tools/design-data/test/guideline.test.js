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
import { listGuidelines, loadGuideline } from "../src/guideline.js";

const TMP = join(
  tmpdir(),
  "design-data-js-guideline-" + randomUUID().slice(0, 8),
);

test.before(() => {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(
    join(TMP, "colors.json"),
    JSON.stringify({ name: "colors", documentBlocks: [{ type: "purpose" }] }),
  );
  writeFileSync(
    join(TMP, "motion.json"),
    JSON.stringify({ name: "motion", documentBlocks: [] }),
  );
});

test.after.always(() => {
  rmSync(TMP, { recursive: true, force: true });
});

test("loadGuideline returns the parsed JSON document for a known id", (t) => {
  const result = loadGuideline(TMP, "colors");
  t.is(result.name, "colors");
  t.true(Array.isArray(result.documentBlocks));
});

test("loadGuideline throws a Not-found error for an unknown id", (t) => {
  const err = t.throws(() => loadGuideline(TMP, "zzz-nonexistent"));
  t.true(err.message.startsWith("Not found:"), `got: ${err.message}`);
});

test("loadGuideline rejects the manifest id", (t) => {
  const err = t.throws(() => loadGuideline(TMP, "manifest"));
  t.true(err.message.startsWith("Not found:"), `got: ${err.message}`);
});

test("loadGuideline rejects a path-traversal id", (t) => {
  const err = t.throws(() => loadGuideline(TMP, "../../etc/passwd"));
  t.true(err.message.includes("Invalid guideline id"), `got: ${err.message}`);
  t.false(
    err.message.startsWith("Not found:"),
    "should reject before reaching the filesystem not-found check",
  );
});

test.serial(
  "listGuidelines returns manifest entries when a manifest exists",
  (t) => {
    writeFileSync(
      join(TMP, "manifest.json"),
      JSON.stringify({
        guidelines: [
          { slug: "colors", title: "Colors", category: "designing" },
          { slug: "motion", title: "Motion", category: "implementing" },
        ],
      }),
    );
    t.deepEqual(listGuidelines(TMP), [
      { slug: "colors", title: "Colors", category: "designing" },
      { slug: "motion", title: "Motion", category: "implementing" },
    ]);
  },
);

test.serial(
  "listGuidelines falls back to sorted JSON files without a manifest",
  (t) => {
    rmSync(join(TMP, "manifest.json"), { force: true });
    writeFileSync(join(TMP, "zeta.json"), "{}");
    writeFileSync(join(TMP, "alpha.json"), "{}");
    t.deepEqual(listGuidelines(TMP), [
      { slug: "alpha" },
      { slug: "colors" },
      { slug: "motion" },
      { slug: "zeta" },
    ]);
  },
);

test.serial(
  "listGuidelines excludes manifest.json from fallback results",
  (t) => {
    t.false(
      listGuidelines(TMP).some((guideline) => guideline.slug === "manifest"),
    );
  },
);
