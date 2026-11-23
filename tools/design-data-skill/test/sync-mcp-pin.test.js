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
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const pkgRoot = resolve(import.meta.dirname, "..");
const files = [
  ".mcp.json",
  "skills/design-data/SKILL.md",
  "README.md",
  ".claude-plugin/plugin.json",
  "package.json",
];

// Runs sync-mcp-pin.mjs against a temp copy whose design-data-mcp is `version`.
function sync(dir, version) {
  writeFileSync(
    join(dir, "..", "design-data-mcp", "package.json"),
    JSON.stringify({ version }),
  );
  execFileSync("node", [join(pkgRoot, "scripts/sync-mcp-pin.mjs")], {
    cwd: dir,
  });
}

test("sync-pin rewrites stable and prerelease pins idempotently", (t) => {
  const root = mkdtempSync(join(tmpdir(), "sync-pin-"));
  const dir = join(root, "design-data-skill");
  mkdirSync(join(root, "design-data-mcp"));
  for (const f of files) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    cpSync(join(pkgRoot, f), join(dir, f));
  }
  const pinnedFiles = files.slice(0, 3);

  for (const version of ["1.10.0-beta.1", "1.10.0-beta.1", "1.10.0"]) {
    sync(dir, version);
    for (const f of pinnedFiles) {
      const pins =
        readFileSync(join(dir, f), "utf8").match(
          /@adobe\/design-data-mcp@\d[^\s"`]*/g,
        ) ?? [];
      t.true(pins.length > 0, `${f} has a pin`);
      for (const pin of pins) {
        t.is(pin.replace(/[.,;:)]+$/, ""), `@adobe/design-data-mcp@${version}`);
      }
    }
  }
});
