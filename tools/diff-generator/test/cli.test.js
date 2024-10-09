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
import packageJSON from "../package.json" with { type: "json" };

const path = fs.realpathSync("./") + "/test/";
const schemaPath = "test-schemas/";
const outputPath = "test-cli-outputs/";

test("cli should return correct version number", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect((result) => {
          t.true(result.stdout.includes(packageJSON.version));
        })
        .run("./src/lib/cli.js --version")
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for simple diff", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-all-tokens.txt`;
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
          `./src/lib/cli.js report -y -t ${path}${schemaPath}entire-schema.json ${path}${schemaPath}renamed-added-deleted-deprecated-updated-reverted-tokens.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for updated (added) property", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-added-property.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}basic-set-token-property.json ${path}${schemaPath}added-property-set-token.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for updated (deleted) property", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-deleted-property.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}added-property-set-token.json ${path}${schemaPath}basic-set-token-property.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for renamed, added, and deleted tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-renamed-added-deleted.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}several-set-tokens.json ${path}${schemaPath}renamed-added-deleted-set-tokens.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for renamed, added, deleted, and deprecated tokens", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-renamed-added-deleted-deprecated.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}entire-schema.json ${path}${schemaPath}renamed-added-deleted-deprecated-tokens.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for added non-schema property", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-non-schema-property.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}basic-set-token.json ${path}${schemaPath}added-non-schema-property-token.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for deleted non-schema property", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-deleted-property-token.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}added-non-schema-property-token.json ${path}${schemaPath}basic-set-token.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output for renamed property", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-renamed-property-token.txt`;
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
          `./src/lib/cli.js report -t ${path}${schemaPath}basic-set-token-property.json ${path}${schemaPath}renamed-added-deleted-property-set-token.json`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});

test("check cli output testing local and remote branch", async (t) => {
  t.plan(1);
  return new Promise((resolve, reject) => {
    try {
      nixt()
        .expect(async () => {
          try {
            const expectedFileName = `${path}${outputPath}expected-local-branch.txt`;
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
          `./src/lib/cli.js report -l packages/tokens/src -ntb shirlsli/file-import-tests`,
        )
        .end(resolve);
    } catch (error) {
      reject(error);
    }
  });
});
