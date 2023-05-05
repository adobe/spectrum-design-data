import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import {
  allTokensStudioTokensJsonData,
  expressTokensStudioTokensJsonData,
  mergeAllWorkingJson,
  resetWorkingJson,
  spectrumTokensStudioTokensJsonData,
} from "./lib/jsondata.js";
import {
  handleTokenEntryForAll,
  handleTokenEntryForExpress,
  handleTokenEntryForSpectrum,
} from "./lib/handleTokenEntry.js";

/**
 * files that go in
 * @type {string[]}
 */
const srcFiles = [
  // typography (this is hacky, instead the converter needs a two pass strategy, first collecting the aliases, second generate the tokens)
  "temp/typography.json",

  // layout
  "temp/layout.json",
  "temp/layout-component.json",
  // color
  "temp/color-palette.json",
  "temp/semantic-color-palette.json",
  "temp/color-aliases.json",
  "temp/color-component.json",

  // two-pass to collect all new aliases before assigning/overwriting the values

  // typography
  "temp/typography.json",

  // layout
  "temp/layout.json",
  "temp/layout-component.json",
  // color
  "temp/color-palette.json",
  "temp/semantic-color-palette.json",
  "temp/color-aliases.json",
  "temp/color-component.json",
];

/**
 * files that come out
 * @type {string}
 */
const destAllTokensJsonFile = "./src/all/tokens.json";
const destSpectrumTokensJsonFile = "./src/spectrum/tokens.json";
const destExpressTokensJsonFile = "./src/express/tokens.json";

async function convertTokensForAll() {
  for (const file of srcFiles) {
    console.log(`Convert file ${file}...`);
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );

    // reset working data
    resetWorkingJson();

    Object.entries(jsonData).forEach(([key, value]) => {
      handleTokenEntryForAll(key, value);
    });

    // merge data into token studio data
    mergeAllWorkingJson(allTokensStudioTokensJsonData);
  }

  // write data
  await writeFile(
    destAllTokensJsonFile,
    JSON.stringify(allTokensStudioTokensJsonData, null, 2),
  );
  console.log(
    `Wrote ${destAllTokensJsonFile} with ${
      Object.keys(allTokensStudioTokensJsonData).length
    } entries.`,
  );
}

async function convertTokensForSpectrum() {
  for (const file of srcFiles) {
    console.log(`Convert file ${file}...`);
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );
    // reset working data
    resetWorkingJson();

    Object.entries(jsonData).forEach(([key, value]) => {
      handleTokenEntryForSpectrum(key, value);
    });

    // merge data into token studio data
    mergeAllWorkingJson(spectrumTokensStudioTokensJsonData);
  }

  // write data
  await writeFile(
    destSpectrumTokensJsonFile,
    JSON.stringify(spectrumTokensStudioTokensJsonData, null, 2),
  );
  console.log(
    `Wrote ${destSpectrumTokensJsonFile} with ${
      Object.keys(spectrumTokensStudioTokensJsonData).length
    } entries.`,
  );
}

async function convertTokensForExpress() {
  for (const file of srcFiles) {
    console.log(`Convert file ${file}...`);
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );
    // reset working data
    resetWorkingJson();

    Object.entries(jsonData).forEach(([key, value]) => {
      handleTokenEntryForExpress(key, value);
    });

    // merge data into token studio data
    mergeAllWorkingJson(expressTokensStudioTokensJsonData);
  }

  // write data
  await writeFile(
    destExpressTokensJsonFile,
    JSON.stringify(expressTokensStudioTokensJsonData, null, 2),
  );
  console.log(
    `Wrote ${destExpressTokensJsonFile} with ${
      Object.keys(expressTokensStudioTokensJsonData).length
    } entries.`,
  );
}

const main = async () => {
  // // TODO: two pass:
  // // - 1. go through every file and look for aliases
  // // - 2. go through every file and create new tokens
  await convertTokensForAll();
  await convertTokensForSpectrum();
  await convertTokensForExpress();

  // test data
  // todo: apply token type of alias source to alias ?

  // todo: check if an alias is used before it is defined...

  // todo: check if a token is referenced by alias and types do not match

  // todo: check if a token is referencing a token, that does not exists (or the syntax is wrong, dash vs period notation)?
};

await main();
