#! /usr/bin/env node

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

import tokenDiff from "./index.js";
import chalk from "chalk";
import inquirer from "inquirer";
import fileImport, { loadLocalData } from "./file-import.js";
import * as emoji from "node-emoji";

import { Command } from "commander";

const yellow = chalk.hex("F3EE7E");
const red = chalk.hex("F37E7E");
const green = chalk.hex("7EF383");
const white = chalk.white;

/* this is updated by the npm prepare script using update-version.js */
const version = "1.1.2";

const program = new Command();

program
  .name("tdiff")
  .description("CLI to a Spectrum token diff generator")
  .version(version);
program
  .command("report")
  .description("Generates a diff report for two inputted schema")
  .option("-y", "answers yes to removing deprecated status of token(s)")
  .option(
    "-otv, --old-token-version <oldVersion>",
    "indicates which npm package version/github tag to pull old tokens from",
  )
  .option(
    "-ntv, --new-token-version <newVersion>",
    "indicates which npm package version/github tag to pull new tokens from",
  )
  .option(
    "-otb, --old-token-branch <oldBranch>",
    "indicates which branch to fetch old token data from",
  )
  .option(
    "-ntb, --new-token-branch <newBranch>",
    "indicates which branch to fetch updated token data from",
  )
  .option(
    "-tn, --token-names <tokens...>",
    "indicates specific tokens to compare",
  )
  .option("-l, --local <path>", "indicates to compare to local data")
  .action(async (options) => {
    try {
      const [originalFile, updatedFile] = await determineFiles(options);
      const result = tokenDiff(originalFile, updatedFile);
      cliCheck(result, options);
    } catch (e) {
      console.error(red("\n" + e + "\n"));
    }
  });

async function determineFiles(options) {
  if (options.local && (options.newTokenBranch || options.newTokenVersion)) {
    return await Promise.all([
      loadLocalData(options.local, options.tokenNames),
      fileImport(
        options.tokenNames,
        options.newTokenVersion,
        options.newTokenBranch,
      ),
    ]);
  } else if (
    options.local &&
    (options.oldTokenBranch || options.oldTokenVersion)
  ) {
    return await Promise.all([
      fileImport(
        options.tokenNames,
        options.oldTokenVersion,
        options.oldTokenBranch,
      ),
      loadLocalData(options.local, options.tokenNames),
    ]);
  } else if (options.local) {
    return await Promise.all([
      loadLocalData(options.local, options.tokenNames),
    ]);
  } else {
    return await Promise.all([
      fileImport(
        options.tokenNames,
        options.oldTokenVersion,
        options.oldTokenBranch,
      ),
      fileImport(
        options.tokenNames,
        options.newTokenVersion,
        options.newTokenBranch,
      ),
    ]);
  }
}

program.parse();

/**
 * Formatting helper function for indentation
 * @param {object} text - the string that needs to be indented
 * @param {object} amount - the amount of indents (x3 spaces each indent)
 * @returns {object} indented string
 */
function indent(text, amount) {
  const str = `\n${"   ".repeat(amount)}${text}`;
  return str.replace(/{|}/g, "");
}

/**
 * Styling for renamed tokens
 * @param {object} result - the JSON object with the report results
 * @param {object} token - the current token
 * @param {object} log - the console.log object being used
 * @param {object} i - the number of times to indent
 */
const printStyleRenamed = (result, token, log, i) => {
  const str =
    white(`"${result[token]["old-name"]}" -> `) + yellow(`"${token}"`);
  log(indent(str, i));
};

/**
 * Styling for deprecated tokens
 * @param {object} result - the JSON object with the report results
 * @param {object} token - the current token
 * @param {object} log - the console.log object being used
 * @param {object} i - the number of times to indent
 */
const printStyleDeprecated = (result, token, log, i) => {
  log(
    indent(
      yellow(`"${token}"`) +
        white(": ") +
        yellow(`"${result[token]["deprecated_comment"]}"`),
      i,
    ),
  );
};

/**
 * Styling for reverted, added, and deleted tokens
 * @param {object} token - the current token
 * @param {object} color - intended color
 * @param {object} log - the console.log object being used
 */
const printStyleColored = (token, color, log) => {
  log(indent(color(`"${token}"`), 1));
};

/**
 * Styling for updated tokens
 * @param {object} result - the JSON object with the report results
 * @param {object} token - the current token
 * @param {object} log - the console.log object being used
 * @param {object} i - the number of times to indent
 */
const printStyleUpdated = (result, token, log, i) => {
  log(indent(yellow(`"${token}"`), i));
  printNestedChanges(result[token], log);
};

/**
 * Checks for previously deprecated tokens whose deprecated status is removed and asks
 * the user if that is intended
 * @param {object} result - the updated token report
 * @param {object} options - an array holding the values of options inputted from command line
 */
async function cliCheck(result, options) {
  const log = console.log;
  log(
    red(
      "\nWARNING: Will either be inaccurate or will throw an error if used for releases before @adobe/spectrum-tokens@12.26.0!\n",
    ),
  );
  if (Object.keys(result.reverted).length > 0 && !options.y) {
    printSection(
      "alarm_clock",
      'Newly "Un-deprecated"',
      Object.keys(result.reverted).length,
      result.reverted,
      log,
      printStyleColored,
      yellow,
    );
    log(
      white(
        "\n-------------------------------------------------------------------------------------------",
      ),
    );
    inquirer
      .prompt([
        {
          type: "confirm",
          name: "confirmation",
          message:
            "Are you sure this token is supposed to lose its `deprecated` status (y/n)?",
          default: false,
        },
      ])
      .then((response) => {
        if (response.confirmation) {
          // console.clear();
          log(
            white(
              "\n-------------------------------------------------------------------------------------------",
            ),
          );
          return printReport(result, log, options);
        } else {
          log(
            yellow(
              emoji.emojify(
                "\n:+1: Cool, closing diff generator CLI, see you next time!\n",
              ),
            ),
          );
          return 1;
        }
      });
  } else {
    return printReport(result, log, options);
  }
}

/**
 * Formats and prints the report
 * @param {object} result - the updated token report
 * @param {object} log - console.log object used in previous function (don't really need this, but decided to continue using same variable)
 * @param {object} options - an array holding the values of options inputted from command line
 * @returns {int} exit code
 */
function printReport(result, log, options) {
  try {
    const totalTokens =
      Object.keys(result.renamed).length +
      Object.keys(result.deprecated).length +
      Object.keys(result.reverted).length +
      Object.keys(result.added).length +
      Object.keys(result.deleted).length +
      Object.keys(result.updated.added).length +
      Object.keys(result.updated.deleted).length +
      Object.keys(result.updated.updated).length +
      Object.keys(result.updated.renamed).length;
    log(white("\n**Tokens Changed (" + totalTokens + ")**"));
    let originalSchema = "";
    let updatedSchema = "";
    if (options.oldTokenBranch !== undefined) {
      originalSchema = white(`\n${options.oldTokenBranch} | `);
    } else if (options.oldTokenVersion !== undefined) {
      originalSchema = white(`\n${options.oldTokenVersion} | `);
    }
    if (options.newTokenBranch !== undefined) {
      updatedSchema = yellow(`${options.newTokenBranch}`);
    } else if (options.newTokenVersion !== undefined) {
      updatedSchema = yellow(`${options.newTokenVersion}`);
    }
    if (originalSchema !== "" && updatedSchema !== "") {
      log(`${originalSchema}${updatedSchema}`);
    }
    log(
      white(
        "-------------------------------------------------------------------------------------------\n",
      ),
    );
    if (Object.keys(result.renamed).length > 0) {
      printSection(
        "memo",
        "Renamed",
        Object.keys(result.renamed).length,
        result.renamed,
        log,
        printStyleRenamed,
        1,
      );
    }
    if (Object.keys(result.deprecated).length > 0) {
      printSection(
        "clock3",
        "Newly Deprecated",
        Object.keys(result.deprecated).length,
        result.deprecated,
        log,
        printStyleDeprecated,
        1,
      );
    }
    if (Object.keys(result.reverted).length > 0) {
      printSection(
        "alarm_clock",
        'Newly "Un-deprecated"',
        Object.keys(result.reverted).length,
        result.reverted,
        log,
        printStyleColored,
        yellow,
      );
    }
    if (Object.keys(result.added).length > 0) {
      printSection(
        "arrow_up_small",
        "Added",
        Object.keys(result.added).length,
        result.added,
        log,
        printStyleColored,
        green,
      );
    }
    if (Object.keys(result.deleted).length > 0) {
      printSection(
        "arrow_down_small",
        "Deleted",
        Object.keys(result.deleted).length,
        result.deleted,
        log,
        printStyleColored,
        red,
      );
    }
    const totalUpdatedTokens =
      Object.keys(result.updated.added).length +
      Object.keys(result.updated.deleted).length +
      Object.keys(result.updated.updated).length +
      Object.keys(result.updated.renamed).length;
    if (totalUpdatedTokens > 0) {
      printTitle("new", "Updated", totalUpdatedTokens, log);
      if (Object.keys(result.updated.renamed).length > 0) {
        printSection(
          "new",
          "Renamed Properties",
          Object.keys(result.updated.renamed).length,
          result.updated.renamed,
          log,
          printStyleRenamed,
          2,
        );
      }
      if (Object.keys(result.updated.added).length > 0) {
        printSection(
          "new",
          "Added Properties",
          Object.keys(result.updated.added).length,
          result.updated.added,
          log,
          printStyleUpdated,
          2,
        );
      }
      if (Object.keys(result.updated.deleted).length > 0) {
        printSection(
          "new",
          "Deleted Properties",
          Object.keys(result.updated.deleted).length,
          result.updated.deleted,
          log,
          printStyleUpdated,
          2,
        );
      }
      if (Object.keys(result.updated.updated).length > 0) {
        printSection(
          "new",
          "Updated Properties",
          Object.keys(result.updated.updated).length,
          result.updated.updated,
          log,
          printStyleUpdated,
          2,
        );
      }
    }
  } catch {
    return console.error(
      red(
        new Error(
          `either could not format and print the result or failed along the way\n`,
        ),
      ),
    );
  }
  return 0;
}

/**
 * Helper function to print and format titles/subtitles
 * @param {string} emojiName - the name of the category's emoji
 * @param {string} title - the category name
 * @param {int} numTokens - the number of tokens changed in that category
 * @param {object} log - the console.log object being used
 * @param {object} i - the number of times to indent
 */
function printTitle(emojiName, title, numTokens, log, i) {
  log(
    indent(white(emoji.emojify(`:${emojiName}: ${title} (${numTokens})`)), i),
  );
}

/**
 * General helper function for printing each category
 * @param {string} emojiName - the name of the category's emoji
 * @param {string} title - the category name
 * @param {int} numTokens - the number of tokens changed in that category
 * @param {object} result - the json object holding the report
 * @param {object} log - the console.log object being used
 * @param {object} func - the styling function that will be used
 * @param {object} colorOrIndent - can be either the intended text color or the number of times to indent
 */
function printSection(
  emojiName,
  title,
  numTokens,
  result,
  log,
  func,
  colorOrIndent,
) {
  if (
    title === "Added Properties" ||
    title === "Deleted Properties" ||
    title === "Updated Properties" ||
    title === "Renamed Properties"
  ) {
    printTitle(emojiName, title, numTokens, log, 1);
  } else {
    printTitle(emojiName, title, numTokens, log, 0);
  }
  Object.keys(result).forEach((token) => {
    if (typeof colorOrIndent !== "number") {
      func(token, colorOrIndent, log);
    } else {
      func(result, token, log, colorOrIndent);
    }
  });
  log("\n");
}

/**
 * Traverse through the updated token's keys and prints a simple changelog
 * @param {object} token - the updated token
 * @param {object} log - the console.log object used
 */
function printNestedChanges(token, log) {
  if (token["path"] !== undefined) {
    log(indent(yellow(token["path"]), 3));

    if (token["original-value"] === undefined) {
      if (token["path"].includes("$schema")) {
        log(indent(yellow(`"${token["new-value"]}"`), 4));
      } else {
        log(indent(yellow(`${token["new-value"]}`), 4));
      }
    } else if (token["path"].includes("$schema")) {
      const newValue = token["new-value"].split("/");
      const str =
        indent(white(`"${token["original-value"]}" -> \n`), 4) +
        indent(
          white(
            `"${token["new-value"].substring(0, token["new-value"].length - newValue[newValue.length - 1].length)}`,
          ) +
            yellow(
              `${newValue[newValue.length - 1].split(".")[0]}` +
                white(`.${newValue[newValue.length - 1].split(".")[1]}"`),
            ),
          4,
        );
      log(str);
    } else {
      log(
        indent(
          white(`${token["original-value"]} -> `) +
            yellow(`${token["new-value"]}`),
          4,
        ),
      );
    }
    return;
  }
  Object.keys(token).forEach((property) => {
    printNestedChanges(token[property], log);
  });
}
