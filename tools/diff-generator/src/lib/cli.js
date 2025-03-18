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
import fileImport, { loadLocalData } from "./file-import.js";

import { Command } from "commander";

import chalk from "chalk";
const red = chalk.hex("F37E7E");

import cliFormatter from "./formatterCLI.js";
import markdownFormatter from "./formatterMarkdown.js";
import storeOutput from "./store-output.js";

import { githubAPIKey } from "../../github-api-key.js";

/* this is updated by the npm prepare script using update-version.js */
const version = "1.3.0";

const program = new Command();

let gak = undefined; // github api key storage

program
  .name("tdiff")
  .description("CLI to a Spectrum token diff generator")
  .version(version);
program
  .command("report")
  .description("Generates a diff report for two inputted schema")
  .option(
    "-otv, --old-token-version <oldVersion>",
    "indicates which github tag to pull old tokens from",
  )
  .option(
    "-ntv, --new-token-version <newVersion>",
    "indicates which github tag to pull new tokens from",
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
  .option("-r, --repo <name>", "github repository to target")
  .option("-gak, --githubAPIKey <key>", "github api key to use")
  .option("-f, --format <format>", "cli (default) or markdown")
  .option("-o, --output <path>", "file path to store diff output")
  .option("-d, --debug <path>", "file path to store diff json")
  .action(async (options) => {
    try {
      if (options.githubAPIKey) {
        gak = options.githubAPIKey;
      } else {
        gak = githubAPIKey;
      }
      const [originalFile, updatedFile] = await determineFiles(options);
      const result = tokenDiff(originalFile, updatedFile);
      cliCheck(result, options);
    } catch (error) {
      console.error(error);
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
        options.repo,
        gak,
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
        options.repo,
        gak,
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
        options.repo,
        gak,
      ),
      fileImport(
        options.tokenNames,
        options.newTokenVersion,
        options.newTokenBranch,
        options.repo,
        gak,
      ),
    ]);
  }
}

program.parse();

/**
 * Checks for previously deprecated tokens whose deprecated status is removed and asks
 * the user if that is intended
 * @param {object} result - the updated token report
 * @param {object} options - an array holding the values of options inputted from command line
 */
async function cliCheck(result, options) {
  const log = console.log;
  log(
    cliFormatter.error(
      "\nWARNING: Will either be inaccurate or will throw an error if used for releases before @adobe/spectrum-tokens@12.26.0!\n",
    ),
  );

  return printReport(result, log, options);
}

function printReport(result, log, options) {
  try {
    let reportOutput = [];
    let reportFormatter;
    let reportFunction;
    switch (options.format) {
      case "markdown":
        reportFormatter = markdownFormatter;
        reportFunction = (input) => {
          reportOutput.push(input);
        };
        break;

      default:
        reportFormatter = cliFormatter;
        reportFunction = log;
    }

    if (options.debug) {
      storeOutput(options.debug, JSON.stringify(result, null, 2));
    }

    reportFunction(new Date().toLocaleString());
    const exit = reportFormatter.printReport(result, reportFunction, options)
      ? 0
      : 1;

    if (reportFunction && reportFunction !== log) {
      const output = reportOutput.join("\n").replaceAll("\n\n", "\n");
      if (options.output) {
        storeOutput(options.output, output);
      } else {
        console.log(output);
      }
    } else if (reportFunction && reportFunction === log && options.output) {
      console.log(
        red(
          "Need to specify a supported format to write the result to a file.",
        ),
      );
    }

    return exit;
  } catch (error) {
    console.error(error);

    return console.error(
      cliFormatter.error(
        new Error(
          `either could not format and print the result or failed along the way\n`,
        ),
      ),
    );
  }
}
