import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import {
  allTokensStudioTokensJsonData,
  expressOverwritesTokensStudioTokensJsonData,
  expressTokensStudioTokensJsonData,
  mergeAllWorkingJson,
  resetWorkingJson,
  spectrumTokensStudioTokensJsonData,
} from "./lib/jsondata.js";
import {
  handleTokenEntryForAll,
  handleTokenEntryForExpress,
  handleTokenEntryForExpressOverwrite,
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
const destExpressOverwriteTokensJsonFile =
  "./src/express-overwrite/tokens.json";

async function convertTokensForAll(tokenHandler, tokenJson, tokenDestination) {
  for (const file of srcFiles) {
    console.log(`Convert file ${file}...`);
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );

    // reset working data
    resetWorkingJson();

    Object.entries(jsonData).forEach(([key, value]) => {
      let component;

      if (file.endsWith("/color-palette.json")) {
        component = "palette";
      } else if (
        file.endsWith("/color-aliases.json") ||
        file.endsWith("/semantic-color-palette.json")
      ) {
        component = "alias";
      }
      tokenHandler(key, value, component);
    });

    // merge data into token studio data
    mergeAllWorkingJson(tokenJson);
  }

  // write data
  await writeFile(tokenDestination, JSON.stringify(tokenJson, null, 2));
  console.log(
    `Wrote ${tokenDestination} with ${Object.keys(tokenJson).length} entries.`,
  );
}

const main = async () => {
  // // TODO: two pass:
  // // - 1. go through every file and look for aliases
  // // - 2. go through every file and create new tokens
  await convertTokensForAll(
    handleTokenEntryForAll,
    allTokensStudioTokensJsonData,
    destAllTokensJsonFile,
  );
  await convertTokensForAll(
    handleTokenEntryForSpectrum,
    spectrumTokensStudioTokensJsonData,
    destSpectrumTokensJsonFile,
  );
  await convertTokensForAll(
    handleTokenEntryForExpress,
    expressTokensStudioTokensJsonData,
    destExpressTokensJsonFile,
  );

  await convertTokensForAll(
    handleTokenEntryForExpressOverwrite,
    expressOverwritesTokensStudioTokensJsonData,
    destExpressOverwriteTokensJsonFile,
  );

  // sort and re-grouping should be added here, e.g.
  // visual-color tokens before
  // const SEMANTICS = ['accent', 'informative', 'negative', 'neutral', 'notice', 'positive', 'disabled'];
  // const SORTORDER = ['Content (visual + text)', 'Backgrounds', 'Border', 'Focus', 'Semantic colors', 'App frame', 'Neutral', 'Neutral-subdued', 'Disabled', 'Semantic', 'Non-semantic'];

  // test data
  // todo: apply token type of alias source to alias ?

  // todo: add check if a token entry has mixed a nested token with an actual token value entry...

  // todo: check if an alias is used before it is defined...

  // todo: check if a token is referenced by alias and types do not match

  // todo: check if a token is referencing a token, that does not exists (or the syntax is wrong, dash vs period notation)?
};

await main();
