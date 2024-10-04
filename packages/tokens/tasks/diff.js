/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { access, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { detailedDiff, diff } from "deep-object-diff";
import { exec } from "node:child_process";
import { promisify } from "util";
import { x } from "tar";
import tmp from "tmp-promise";

const execP = promisify(exec);

const tag = process.argv[2] || "latest";
const tokenPath = "dist/json/variables.json";
const localRootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const localTokenPath = join(localRootDir, tokenPath);

run()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

async function run() {
  const [newTokens, oldTokens] = await Promise.all([
    getNewTokens(),
    getOldTokens(),
  ]);

  const diffResult = detailedDiff(oldTokens, newTokens);

  calculatePossibleRenames(diffResult, oldTokens, newTokens);

  logResultCategory(diffResult, "added");
  logResultCategory(diffResult, "deleted");
  logResultCategory(diffResult, "updated", "Token values updated");
  logResultCategory(diffResult, "possiblyRenamed", "Tokens possibly renamed");
}

async function getNewTokens() {
  try {
    await access(localTokenPath);
    return JSON.parse(
      convertNumberStringsToNumbers(
        await readFile(localTokenPath, { encoding: "utf8" }),
      ),
    );
  } catch {
    console.error("cannot access");
  }
}

async function getOldTokens() {
  const tmpDir = await tmp.dir();
  const { stdout, stderr } = await execP(
    `npm pack @adobe/spectrum-tokens@${tag} --pack-destination ${tmpDir.path}`,
  );
  await x({
    cwd: tmpDir.path,
    file: join(tmpDir.path, stdout.trim()),
  });
  const oldTokenPath = join(tmpDir.path, "package", tokenPath);
  await access(oldTokenPath);
  console.log(`Comparing against ${stdout.trim()}`);
  return JSON.parse(
    convertNumberStringsToNumbers(
      await readFile(oldTokenPath, { encoding: "utf8" }),
    ),
  );
}

function calculatePossibleRenames(diffResult, oldTokens, newTokens) {
  diffResult.possiblyRenamed = {};
  Object.keys(diffResult.deleted).forEach((deletedTokenName) => {
    const oldTokenValue = oldTokens[deletedTokenName];
    const allValueMatches = [];
    Object.keys(diffResult.added).forEach((addedTokenName, i) => {
      const newTokenValue = newTokens[addedTokenName];
      if (Object.keys(diff(oldTokenValue, newTokenValue)).length === 0) {
        allValueMatches.push(addedTokenName);
      }
    });
    if (allValueMatches.length > 0) {
      diffResult.possiblyRenamed[deletedTokenName] = allValueMatches;
    }
  });
}

function convertNumberStringsToNumbers(dataString) {
  return dataString.replace(/"([\d]*\.?[\d]*)"/g, (match, p1) => {
    return p1;
  });
}

function logResultCategory(diffResult, categoryKey, msg) {
  const results = diffResult[categoryKey];
  const resultCount = Object.keys(results).length;
  if (!msg) {
    msg = `Tokens ${categoryKey}`;
  }
  if (resultCount > 0) {
    console.log(`\n*${msg} (${resultCount}):*`);
    switch (categoryKey) {
      case "possiblyRenamed":
        Object.keys(results)
          .sort()
          .forEach((oldTokenName, i) => {
            if (
              Array.isArray(results[oldTokenName]) &&
              results[oldTokenName].length > 1
            ) {
              console.log(
                `  - Old name: \`${oldTokenName}\`, new name options:`,
              );
              results[oldTokenName].forEach((newTokenName) =>
                console.log(`    - \`${newTokenName}\``),
              );
            } else {
              console.log(
                `  - \`${oldTokenName}\` -> \`${results[oldTokenName][0]}\``,
              );
            }
          });
        break;
      default:
        Object.keys(results)
          .sort()
          .forEach((tokenName, i) => console.log(`  - \`${tokenName}\``));
    }
  }
}
