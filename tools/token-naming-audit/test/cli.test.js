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

import test from "ava";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");
const cliPath = join(__dirname, "../src/cli.js");

test("cli produces a non-empty Markdown report to stdout", async (t) => {
  const { stdout } = await execFileAsync("node", [
    cliPath,
    "--root",
    fixturesDir,
  ]);
  t.true(stdout.length > 0);
  t.true(stdout.includes("# Token naming audit"));
});

test("cli report includes both section headers", async (t) => {
  const { stdout } = await execFileAsync("node", [
    cliPath,
    "--root",
    fixturesDir,
  ]);
  t.true(stdout.includes("## String-form name tokens"));
  t.true(stdout.includes("## Overloaded `property` values"));
});

test("cli exits with code 0 even when debt is found", async (t) => {
  const { exitCode } = await execFileAsync(
    "node",
    [cliPath, "--root", fixturesDir],
    { encoding: "utf-8" },
  ).then(
    () => ({ exitCode: 0 }),
    (err) => ({ exitCode: err.code ?? 1 }),
  );
  t.is(exitCode, 0);
});
