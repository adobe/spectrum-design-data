import glob from "glob-promise";
import { readFile, writeFile } from "fs/promises";
import augmentExpressTokens from "./lib/augmentExpressTokens.js";

const files = await glob("src/**/*.json");
files.forEach(async (fileName) => {
  const fileTokens = JSON.parse(await readFile(fileName, "utf8"));
  const result = augmentExpressTokens(fileTokens);
  await writeFile(fileName, JSON.stringify(result, null, 2));
  console.log(`Updated ${fileName}.`);
});
