/*
Copyright {{ now() | date(format="%Y") }} Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import nixt from "nixt";
import fs from "fs";
import { access, readFile } from "fs/promises";

const path = fs.realpathSync("./") + "/test/";
const schemaPath = "test-schemas/";
const outputPath = "test-cli-outputs/";

test("checking file import for two branches (both main)", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-main-branch.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run("./src/lib/cli.js report -otb main -ntb main")
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("checking cli output for two branches (shirlsli/file-import-tests-1 and shirlsli/file-import-tests) for added color-component tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-branches-added.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run(
          "./src/lib/cli.js report -otb shirlsli/file-import-tests-1 -ntb shirlsli/file-import-tests -tn src/color-component.json",
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("checking cli output for two branches (shirlsli/file-import-tests-1 and shirlsli/file-import-tests) for deleted layout tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-branches-deleted.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run(
          "./src/lib/cli.js report -otb shirlsli/file-import-tests-1 -ntb shirlsli/file-import-tests -tn src/layout.json",
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("checking cli output for two branches (shirlsli/file-import-tests-1 and shirlsli/file-import-tests) for renamed, deprecated, added, deleted, and updated tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-branches-changes.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run(
          "./src/lib/cli.js report -otb shirlsli/file-import-tests-1 -ntb shirlsli/file-import-tests",
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("checking cli output between a release and a branch (@adobe/spectrum-tokens@12.26.0 and shirlsli/file-import-tests) for renamed, deprecated, added, deleted, and updated tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-release-branch-compare.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run(
          "./src/lib/cli.js report -otv @adobe/spectrum-tokens@12.26.0 -ntb shirlsli/file-import-tests",
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("checking cli output between a branch and a release (shirlsli/file-import-tests and @adobe/spectrum-tokens@12.26.0) for renamed, deprecated, added, deleted, and updated tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-branch-release-compare.txt`;
            await access(expectedFileName);
            const expected = await readFile(expectedFileName, {
              encoding: "utf8",
            });
            t.snapshot(expected.trim());
          } catch (error) {
            reject(error);
          }
        })
        .run(
          "./src/lib/cli.js report -y -otb shirlsli/file-import-tests -ntv @adobe/spectrum-tokens@12.26.0",
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});
