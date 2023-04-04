import { access, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { detailedDiff, diff } from "deep-object-diff";
import { exec } from "node:child_process";
import { promisify } from "util";
import tar from "tar";
import tmp from "tmp-promise";

const execP = promisify(exec);

const tag = "next-major";
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
    return JSON.parse(await readFile(localTokenPath, { encoding: "utf8" }));
  } catch {
    console.error("cannot access");
  }
}

async function getOldTokens() {
  const tmpDir = await tmp.dir();
  console.log(tmpDir);
  console.log(tag);
  const { stdout, stderr } = await execP(
    `npm pack @adobe/spectrum-tokens@${tag} --pack-destination ${tmpDir.path}`
  );
  await tar.x({
    cwd: tmpDir.path,
    file: join(tmpDir.path, stdout.trim()),
  });
  const oldTokenPath = join(tmpDir.path, "package", tokenPath);
  await access(oldTokenPath);
  return JSON.parse(await readFile(oldTokenPath, { encoding: "utf8" }));
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
                `  - Old name: \`${oldTokenName}\`, new name options:`
              );
              results[oldTokenName].forEach((newTokenName) =>
                console.log(`    - \`${newTokenName}\``)
              );
            } else {
              console.log(
                `  - \`${oldTokenName}\` -> \`${results[oldTokenName][0]}\``
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
