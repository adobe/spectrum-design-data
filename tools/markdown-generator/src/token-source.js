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

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { mkdtempSync, readdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { basename, join, resolve } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);
const CASCADE_DIR = join(REPO_ROOT, "packages/design-data/tokens");

function findCli() {
  const candidates = [
    process.env.DESIGN_DATA_BIN,
    join(REPO_ROOT, "sdk/target/debug/design-data"),
    join(REPO_ROOT, "sdk/target/release/design-data"),
  ].filter(Boolean);
  const bin = candidates.find((p) => existsSync(p));
  if (!bin) {
    throw new Error(
      "design-data CLI binary not found — run `moon run sdk:build` first (or set DESIGN_DATA_BIN).",
    );
  }
  return bin;
}

let projection;

/**
 * Project the canonical cascade tokens in `packages/design-data/tokens` into
 * per-file legacy set-format JSON (via `design-data legacy-output`), once per process.
 * @returns {Map<string, object>} file name (e.g. "color-aliases.json") -> token map
 */
export function loadLegacyProjection() {
  if (projection) return projection;
  const out = mkdtempSync(join(tmpdir(), "md-gen-legacy-"));
  execFileSync(
    findCli(),
    ["migrate", "legacy-output", CASCADE_DIR, "--output", out],
    {
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  projection = new Map(
    readdirSync(out)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => [f, JSON.parse(readFileSync(join(out, f), "utf8"))]),
  );
  return projection;
}

export const getTokenFileNames = () => [...loadLegacyProjection().keys()];

export const getFileTokens = async (fileName) => {
  const data = loadLegacyProjection().get(basename(fileName));
  if (!data) throw new Error(`Unknown token file: ${fileName}`);
  return data;
};

export const getAllTokens = async () =>
  Object.assign({}, ...loadLegacyProjection().values());
