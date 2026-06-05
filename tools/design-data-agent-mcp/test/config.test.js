// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { createRequire } from "module";
import { dirname, isAbsolute, resolve } from "path";
import { fileURLToPath } from "url";

// `config` reads process.env at import time, so each case sets the environment
// and then imports the module with a cache-busting query to force re-evaluation.
const CONFIG_URL = new URL("../src/config.js", import.meta.url).href;
let importCounter = 0;
async function loadConfig(env) {
  const keys = [
    "DESIGN_DATA_BIN",
    "DESIGN_DATA_ROOT",
    "DESIGN_DATA_PATH",
    "DESIGN_DATA_COMPONENTS",
    "DESIGN_DATA_FIELDS",
    "DESIGN_DATA_SCHEMAS",
    "DESIGN_DATA_EXCEPTIONS",
  ];
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, env);
  const mod = await import(`${CONFIG_URL}?case=${importCounter++}`);
  return mod.config;
}

// Repo root relative to this test file: test → package → tools → repo root.
const SERVER_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

// The directory that @adobe/spectrum-design-data resolves to in this workspace,
// used to assert the zero-config package-resolution behavior.
const dataPkgDir = dirname(
  createRequire(import.meta.url).resolve(
    "@adobe/spectrum-design-data/package.json",
  ),
);

test.serial(
  "relative override is anchored to DESIGN_DATA_ROOT when set",
  async (t) => {
    const root = resolve("/tmp/some-repo");
    const config = await loadConfig({
      DESIGN_DATA_ROOT: root,
      DESIGN_DATA_PATH: "packages/design-data/tokens",
    });
    t.is(config.dataRoot, root);
    t.is(config.dataPath, resolve(root, "packages/design-data/tokens"));
    t.true(isAbsolute(config.dataPath));
  },
);

test.serial("absolute overrides are returned unchanged", async (t) => {
  const abs = resolve("/var/data/tokens");
  const config = await loadConfig({
    DESIGN_DATA_ROOT: resolve("/tmp/some-repo"),
    DESIGN_DATA_PATH: abs,
  });
  t.is(config.dataPath, abs);
});

test.serial(
  "relative override falls back to the server package root",
  async (t) => {
    const config = await loadConfig({
      DESIGN_DATA_PATH: "packages/design-data/tokens",
    });
    t.is(config.dataRoot, SERVER_ROOT);
    t.is(config.dataPath, resolve(SERVER_ROOT, "packages/design-data/tokens"));
    t.true(isAbsolute(config.dataPath));
  },
);

test.serial(
  "resolves data dirs from the @adobe/spectrum-design-data package with no env override",
  async (t) => {
    const config = await loadConfig({});
    t.is(config.dataPath, resolve(dataPkgDir, "tokens"));
    t.is(config.componentsDir, resolve(dataPkgDir, "components"));
    t.is(config.fieldsDir, resolve(dataPkgDir, "fields"));
    t.true(isAbsolute(config.dataPath));
  },
);

test.serial("schema and exceptions paths stay null when unset", async (t) => {
  const config = await loadConfig({
    DESIGN_DATA_ROOT: resolve("/tmp/some-repo"),
  });
  t.is(config.schemaPath, null);
  t.is(config.exceptionsPath, null);
});

test.serial("all relative override dirs are anchored", async (t) => {
  const root = resolve("/tmp/some-repo");
  const config = await loadConfig({
    DESIGN_DATA_ROOT: root,
    DESIGN_DATA_COMPONENTS: "packages/design-data/components",
    DESIGN_DATA_FIELDS: "packages/design-data/fields",
    DESIGN_DATA_SCHEMAS: "schemas",
    DESIGN_DATA_EXCEPTIONS: "exceptions.json",
  });
  t.is(config.componentsDir, resolve(root, "packages/design-data/components"));
  t.is(config.fieldsDir, resolve(root, "packages/design-data/fields"));
  t.is(config.schemaPath, resolve(root, "schemas"));
  t.is(config.exceptionsPath, resolve(root, "exceptions.json"));
});
