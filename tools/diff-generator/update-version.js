import { readFile, writeFile } from "fs/promises";
import { resolve, relative } from "path";
import * as url from "url";

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

const cliFilePath = resolve(__dirname, "src", "lib", "cli.js");

const [packageFile, cliFile] = await Promise.all([
  readJson(resolve(__dirname, "package.json")),
  readFile(cliFilePath, "utf8"),
]);

await writeFile(
  cliFilePath,
  cliFile.replace(
    /const version = \"([^\"]*)\";/,
    `const version = "${packageFile.version}";`,
  ),
);

console.log(
  `Version updated in CLI file ${relative(__dirname, cliFilePath)} to "${packageFile.version}"`,
);
