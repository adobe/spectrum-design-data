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
import tokenDiff from ".";
import fileImport, { fetchBranchTagOptions } from "./file-import.js";
import { writeFile } from "fs/promises";

async function getReleaseLine(reportStyleFunc) {
  const styleFunc = reportStyleFunc || markdownFormatter; // default formatter will be markdown
  const oldVersion = await fetchBranchTagOptions("version")[0].name;
  const [originalSchema, updatedSchema] = await Promise.all([
    fileImport("", oldVersion, "main"),
    fileImport("", "test", "main"),
  ]);
  const report = tokenDiff(originalSchema, updatedSchema);
  styleFunc(report, oldVersion);
  return;
}

async function getDependencyReleaseLine() {}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
};

export async function markdownFormatter(report, oldVersion) {
  const totalTokens =
    Object.keys(report.renamed).length +
    Object.keys(report.deprecated).length +
    Object.keys(report.reverted).length +
    Object.keys(report.added).length +
    Object.keys(report.deleted).length +
    Object.keys(report.updated.added).length +
    Object.keys(report.updated.deleted).length +
    Object.keys(report.updated.updated).length +
    Object.keys(report.updated.renamed).length;
  oldVersion = oldVersion || "latest";
  try {
    await writeFile("report.txt");
    console.log(`# Tokens Changed (${totalTokens})\n`);
    console.log(`#### ${oldVersion} | new`);
    console.log(`#### main | main\n\n`);
    Object.values(report).forEach((category) => {
      let curTotalTokens =
        category !== "updated"
          ? Object.keys(report[category]).length
          : Object.keys(report.updated.added).length +
            Object.keys(report.updated.deleted).length +
            Object.keys(report.updated.updated).length +
            Object.keys(report.updated.renamed).length;
      markdown += `## ${category} (${curTotalTokens})\n`;
      // iterate through value
      let func;
      Object.values(category).forEach((tokenName) => {
        if (category === "renamed") {
          func = markdownRenamed(category, tokenName);
        } else if (
          category === "added" ||
          category === "deleted" ||
          category === "deprecated" ||
          category === "reverted"
        ) {
          func = markdownItems(tokenName);
        } else {
          func = markdownUpdated(category, token);
        }
        console.log(`- ${func()}`);
      });
    });
  } catch (e) {
    console.error("Writing to file failed", e);
  }
  return markdown;
}

function markdownRenamed(tokenName, token) {
  return `${`${token[tokenName]["old-name"]}`} -> ${`${tokenName}`}`;
}

function markdownItems(tokenName) {
  return `${`${tokenName}`}`;
}

function markdownUpdated(categoryName, token) {
  Object.values(categoryName).forEach((category) => {
    printNestedChanges(token[category]);
  });
}

function printNestedChanges(token) {
  if (token["path"] !== undefined) {
    return determineChanges(token);
  }
  return Object.keys(token).map((property) => {
    return printNestedChanges(token[property]);
  });
}

function determineChanges(token) {
  if (token["original-value"] === undefined) {
    return markdownItems(token["new-value"]);
  } else if (token["path"].includes("$schema")) {
    const newValue = token["new-value"].split("/");
    const str =
      `"${token["original-value"]}" ->` +
      `"${token["new-value"].substring(0, token["new-value"].length - newValue[newValue.length - 1].length)}` +
      `${newValue[newValue.length - 1].split(".")[0]}` +
      `.${newValue[newValue.length - 1].split(".")[1]}"`;
    return markdownItems(str);
  } else {
    return markdownRenamed(token["new-value"], token);
  }
}
