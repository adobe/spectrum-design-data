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
import { access, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { glob } from "glob";

const source = "https://raw.githubusercontent.com/";
const defaultRepo = "adobe/spectrum-tokens/";

/**
 * Returns file with given file name as a JSON object (took this from diff.js)
 * @param {string} tokenName - the name of the target file
 * @param {string} version - the intended package version (full name)
 * @returns {object} the target file as a JSON object
 */
export default async function fileImport(
  givenTokenNames,
  givenVersion,
  givenLocation,
  givenRepo,
  githubAPIKey,
) {
  const version = givenVersion || "latest";
  const location = givenLocation || "main";
  const result = {};
  const tokenNames =
    givenTokenNames ||
    (await fetchTokens(
      "manifest.json",
      version,
      location,
      givenRepo,
      githubAPIKey,
    ));
  for (let i = 0; i < tokenNames.length; i++) {
    const name = givenTokenNames ? "src/" + tokenNames[i] : tokenNames[i];
    const tokens = await fetchTokens(
      name,
      version,
      location,
      givenRepo,
      githubAPIKey,
    );
    Object.assign(result, tokens);
  }
  return result;
}

export async function loadLocalData(dirName, tokenNames) {
  try {
    const startDir = process.cwd();
    const root = getRootPath(startDir, "pnpm-lock.yaml");
    const fileNames = await glob(`${dirName}/*.json`, {
      ignore: ["node_modules/**", "coverage/**"],
      cwd: "../../",
    }); // i.e. packages/tokens/src
    return tokenNames
      ? loadData(
          root.substring(0, root.lastIndexOf("/")) + "/" + dirName + "/",
          tokenNames,
        )
      : loadData(root.substring(0, root.lastIndexOf("/")) + "/", fileNames);
  } catch (error) {
    console.error(error);
  }
}

async function loadData(startDir, tokenNames) {
  let result = {};
  for (let i = 0; i < tokenNames.length; i++) {
    const tokenPath =
      startDir + tokenNames[i].trim().replaceAll('"', "").replace(",", "");
    await access(tokenPath);
    const temp = JSON.parse(await readFile(tokenPath, { encoding: "utf8" }));
    Object.assign(result, temp);
  }
  return result;
}

function getRootPath(startDir, targetDir) {
  let curDir = startDir;
  while (existsSync(curDir)) {
    const curDirPath = path.join(curDir, targetDir);
    if (existsSync(curDirPath)) {
      return curDirPath;
    }
    const parentDir = path.dirname(curDir);
    if (parentDir === curDir) {
      return null;
    }
    curDir = parentDir;
  }
}

async function fetchTokens(tokenName, version, location, repo, githubAPIKey) {
  const repoURL = source + "/" + (repo && repo.length ? repo : defaultRepo);
  const link =
    version !== "latest" ? repoURL + "/" + version : repoURL + "/" + location;

  const url = `${link}/packages/tokens/${tokenName}`.replaceAll("//", "/");
  const result = await fetch(
    url,
    githubAPIKey && githubAPIKey.length
      ? {
          headers: {
            Authorization: "Bearer " + githubAPIKey, // api is rate limited without a personal access token
          },
        }
      : {},
  );

  if (result && result.status === 200) {
    return result
      .json()
      .then((tokens) => {
        return tokens;
      })
      .catch((error) => {
        console.log(error);
      });
  } else {
    throw new Error(url + "\n\t" + result.status + ": " + result.statusText);
  }
}
