import glob from "glob-promise";
import { writeFile } from "fs/promises";

const manifestFileName = "manifest.json";
const files = await glob("src/**/*.json");

await writeFile(manifestFileName, JSON.stringify(files, null, 2));
console.log(`Wrote ${manifestFileName} with ${files.length} files.`);
