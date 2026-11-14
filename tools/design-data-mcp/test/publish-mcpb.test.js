// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! scripts/publish-mcpb.sh, run against a stub `gh` so nothing touches GitHub. The script
//! decides what to upload and where; this checks those decisions, including every refusal.

import test from "ava";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(
  new URL("../scripts/publish-mcpb.sh", import.meta.url),
);
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const PUBLISHED = (version) =>
  JSON.stringify([
    { name: "@adobe/design-data-wasm", version: "0.21.0" },
    { name: "@adobe/design-data-mcp", version },
  ]);

/** A temp package dir with the script, an optional bundle, and a `gh` that logs its arguments. */
function setup({ manifestVersion = "1.12.0", bundle = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "publish-mcpb-"));
  mkdirSync(join(dir, "scripts"));
  mkdirSync(join(dir, "dist"));
  mkdirSync(join(dir, "bin"));
  copyFileSync(SCRIPT, join(dir, "scripts", "publish-mcpb.sh"));
  chmodSync(join(dir, "scripts", "publish-mcpb.sh"), 0o755);
  if (bundle) {
    const staging = join(dir, "staging");
    mkdirSync(staging);
    writeFileSync(
      join(staging, "manifest.json"),
      JSON.stringify({ name: "design-data", version: manifestVersion }),
    );
    execFileSync("zip", [
      "-q",
      "-j",
      join(dir, "dist", "design-data.mcpb"),
      join(staging, "manifest.json"),
    ]);
  }
  const log = join(dir, "gh.log");
  writeFileSync(
    join(dir, "bin", "gh"),
    `#!/usr/bin/env bash
echo "$*" >> "${log}"
# \`release view <tag>\` fails for the tags listed in MISSING (comma separated).
if [ "$1" = release ] && [ "$2" = view ]; then
  case ",$MISSING," in *",$3,"*) exit 1;; esac
fi
exit 0
`,
  );
  chmodSync(join(dir, "bin", "gh"), 0o755);
  const run = (env) =>
    spawnSync("bash", [join(dir, "scripts", "publish-mcpb.sh")], {
      encoding: "utf8",
      env: {
        PATH: `${join(dir, "bin")}:${process.env.PATH}`,
        SKIP_BUILD: "1",
        ...env,
      },
    });
  const calls = () => {
    try {
      return readFileSync(log, "utf8").trim().split("\n");
    } catch {
      return [];
    }
  };
  return { run, calls };
}

test("does nothing when the MCP package was not published", (t) => {
  const { run, calls } = setup();
  const r = run({
    PUBLISHED: JSON.stringify([
      { name: "@adobe/design-data-wasm", version: "0.21.0" },
    ]),
  });
  t.is(r.status, 0, r.stderr);
  t.regex(r.stdout, /was not published/);
  t.deepEqual(calls(), []);
  t.is(run({ PUBLISHED: "[]" }).status, 0);
});

test("uploads to the package release and the rolling release, which already exist", (t) => {
  const { run, calls } = setup();
  const r = run({ PUBLISHED: PUBLISHED("1.12.0") });
  t.is(r.status, 0, r.stderr);
  const c = calls();
  t.true(
    c.includes(
      "release upload @adobe/design-data-mcp@1.12.0 dist/design-data.mcpb --clobber",
    ),
    c.join("\n"),
  );
  t.true(
    c.includes(
      "release upload design-data-mcpb dist/design-data.mcpb --clobber",
    ),
  );
  t.false(
    c.some((l) => l.startsWith("release create")),
    "nothing to create",
  );
  t.true(
    c.some(
      (l) =>
        l.startsWith("release edit design-data-mcpb --notes") &&
        l.includes("1.12.0"),
    ),
  );
});

test("creates the releases that are missing before uploading to them", (t) => {
  const { run, calls } = setup();
  const r = run({
    PUBLISHED: PUBLISHED("1.12.0"),
    MISSING: "@adobe/design-data-mcp@1.12.0,design-data-mcpb",
  });
  t.is(r.status, 0, r.stderr);
  const c = calls();
  const at = (prefix) => c.findIndex((l) => l.startsWith(prefix));
  t.true(at("release create @adobe/design-data-mcp@1.12.0") >= 0);
  t.true(
    at("release create @adobe/design-data-mcp@1.12.0") <
      at("release upload @adobe/design-data-mcp@1.12.0"),
  );
  t.true(at("release create design-data-mcpb") >= 0);
  t.true(
    at("release create design-data-mcpb") <
      at("release upload design-data-mcpb"),
  );
  // The rolling release must not displace the repository's real latest release.
  t.regex(c[at("release create design-data-mcpb")], /--latest=false/);
});

test("refuses a bundle whose manifest is for another version", (t) => {
  const { run, calls } = setup({ manifestVersion: "1.11.0" });
  const r = run({ PUBLISHED: PUBLISHED("1.12.0") });
  t.not(r.status, 0);
  t.regex(r.stderr, /does not declare version 1\.12\.0/);
  t.false(calls().some((l) => l.startsWith("release upload")));
});

test("refuses a missing bundle", (t) => {
  const { run, calls } = setup({ bundle: false });
  const r = run({ PUBLISHED: PUBLISHED("1.12.0") });
  t.not(r.status, 0);
  t.regex(r.stderr, /missing or empty/);
  t.false(calls().some((l) => l.startsWith("release upload")));
});

test("requires PUBLISHED", (t) => {
  const { run } = setup();
  const r = run({});
  t.not(r.status, 0);
  t.regex(r.stderr, /PUBLISHED/);
});

test("the release workflow runs the script after publishing, and README links the rolling release", (t) => {
  const workflow = readFileSync(
    join(ROOT, ".github/workflows/release.yml"),
    "utf8",
  );
  t.regex(workflow, /tools\/design-data-mcp\/scripts\/publish-mcpb\.sh/);
  t.regex(workflow, /steps\.cs\.outputs\.published == 'true'/);
  // After the CLI and Homebrew steps, so a failure here cannot block them.
  t.true(
    workflow.indexOf("publish-mcpb.sh") >
      workflow.indexOf("Bump Homebrew formula"),
  );
  const readme = readFileSync(
    join(ROOT, "tools/design-data-mcp/README.md"),
    "utf8",
  );
  t.true(
    readme.includes(
      "https://github.com/adobe/spectrum-design-data/releases/download/design-data-mcpb/design-data.mcpb",
    ),
    "README must link the rolling release asset the script publishes",
  );
});
