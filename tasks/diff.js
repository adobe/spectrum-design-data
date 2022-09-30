const { access, readFile, writeFile } = require("fs/promises");
const fetch = require("node-fetch");
const { detailedDiff, diff } = require("deep-object-diff");

const tag = "beta";
const tokenPath = "dist/json/variables.json";

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
  diffResult.possiblyRenamed = {};
  Object.keys(diffResult.deleted).forEach((deletedTokenName) => {
    const oldTokenValue = oldTokens[deletedTokenName];
    Object.keys(diffResult.added).forEach((addedTokenName, i) => {
      const newTokenValue = newTokens[addedTokenName];
      if (Object.keys(diff(oldTokenValue, newTokenValue)).length === 0) {
        diffResult.possiblyRenamed[deletedTokenName] = addedTokenName;
      }
    });
  });
  console.log(diffResult);
}

async function getNewTokens() {
  try {
    await access(tokenPath);
    return JSON.parse(await readFile(tokenPath, { encoding: "utf8" }));
  } catch {
    console.error("cannot access");
  }
}

async function getOldTokens() {
  try {
    const response = await fetch(
      `https://unpkg.com/@adobe/spectrum-tokens@${tag}/${tokenPath}`
    );
    console.log(`Fetched ${response.url}`);
    return await response.json();
  } catch {
    console.error("cannot access");
  }
}
