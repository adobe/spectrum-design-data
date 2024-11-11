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

import { detailedDiff } from "./diff.js";
import { assert, isBoolean, isNumber, isObject, isString } from "./helpers.js";

/**
 * Detects updates made to tokens
 * @param {object} renamed - a list containing tokens that were renamed
 * @param {object} original - the original token data
 * @param {object} changes - the changed token data
 * @returns {object} updatedTokens - a JSON object containing the updated tokens (with new name, if renamed)
 */
export default function detectModifiedTokens(
  renamed,
  original,
  changes,
  newTokens,
  deprecatedTokens,
) {
  const modifiedTokens = {
    renamed: {},
    added: {},
    deleted: {},
    updated: { ...changes.updated },
  };

  // checks new stuff
  Object.keys(changes.added).forEach((tokenName) => {
    if (renamed[tokenName] !== undefined) {
      const tokenDiff = detailedDiff(
        original[renamed[tokenName]["old-name"]],
        changes.added[tokenName],
      ).updated;
      if (Object.keys(tokenDiff).length !== 0) {
        modifiedTokens.updated[tokenName] = tokenDiff;
      }
    } else if (
      newTokens[tokenName] === undefined &&
      original[tokenName] !== undefined &&
      deprecatedTokens.deprecated[tokenName] === undefined
    ) {
      modifiedTokens.added[tokenName] = changes.added[tokenName];
      parseTokenChanges(
        modifiedTokens,
        modifiedTokens.added[tokenName],
        tokenName,
        original,
        renamed,
        false,
      );
    }
  });

  // checks removed stuff
  Object.keys(changes.deleted).forEach((tokenName) => {
    const t = changes.deleted[tokenName];
    if (t !== undefined && !("deprecated" in t)) {
      const tokenDiff = detailedDiff(
        t, // switching the order to easily get change
        original[tokenName],
      ).updated;

      modifiedTokens.deleted[tokenName] = tokenDiff;
      parseTokenChanges(
        modifiedTokens,
        modifiedTokens.deleted[tokenName],
        tokenName,
        original,
        renamed,
        false,
      );
    }
  });

  // checks changed stuff
  Object.keys(modifiedTokens.updated).forEach((tokenName) => {
    parseTokenChanges(
      modifiedTokens,
      modifiedTokens.updated[tokenName],
      tokenName,
      original,
      renamed,
      true,
    );
  });

  /// !!! there should be a verification step to ensure all the data was processed otherwise
  /// !!! we get a weird blitz in the output section

  return modifiedTokens;
}

/**
 * Appends original token properties to modifiedTokens JSON
 * @param {object} tokenChanges - the updated tokens (added, deleted, or updated)
 * @param {string} tokenName - the path containing all the keys required to traverse through to get to value
 * @param {object} original - the original token
 * @param {object} renamed - a JSON object containing the renamed tokens
 * @param {boolean} update - a boolean indicating whether token property is added, deleted, or updated
 */
function parseTokenChanges(
  modifiedTokens,
  tokenChanges,
  tokenName,
  original,
  renamed,
  update,
) {
  assert(isObject(modifiedTokens));
  assert(isObject(tokenChanges));
  assert(isString(tokenName));
  assert(isObject(original));
  assert(isObject(renamed));
  assert(isBoolean(update));

  // we'll use the original token data in the result, but we'll need to hunt around
  // for it if the token name was changed
  let originalToken;
  if (!renamed[tokenName]) {
    originalToken = original[tokenName];
  } else {
    originalToken = original[renamed[tokenName]["old-name"]];
  }

  // we start checking properties starting from the root of the token changes and original token data tree objects
  try {
    checkProperties(
      modifiedTokens,
      tokenChanges,
      tokenChanges,
      originalToken,
      originalToken,
      update,
    );
  } catch (error) {
    console.error(
      "FAILED TO PARSE DIFF RESULT FOR: " +
        "\n" +
        tokenName +
        "\n" +
        JSON.stringify(tokenChanges, null, 2),
    );
    throw error;
  }
}

/**
 * Traverses original and result token to insert the original value, path to the value, and new value
 * @param {object} rootTokenLevel - the current token from updatedTokens
 * @param {object} currentTokenLevel - the current key
 * @param {string} currentTokenPath - a string containing the path to get to the value
 * @param {object} rootOriginalLevel - the original token
 * @param {object} currentOriginalLevel - the current key for original token
 * @param {object} renamed - the renamed tokens
 */
function checkProperties(
  modifiedTokens,
  rootTokenLevel,
  currentTokenLevel,
  rootOriginalLevel,
  currentOriginalLevel,
  update,
  currentTokenPath = "",
) {
  assert(isObject(modifiedTokens));
  assert(isObject(rootTokenLevel));
  assert(isObject(currentTokenLevel));
  assert(isObject(rootOriginalLevel));
  assert(isObject(currentOriginalLevel));
  assert(isBoolean(update));
  assert(isString(currentTokenPath));

  Object.keys(currentTokenLevel).forEach((property) => {
    // these are part of the result, so we've already processed them
    if (
      property === "path" ||
      property === "new-value" ||
      property === "original-value"
    ) {
      return;
    }

    const propertyPath = currentTokenPath.length
      ? currentTokenPath + "." + property
      : property;

    if (
      isString(currentTokenLevel[property]) ||
      isBoolean(currentTokenLevel[property]) ||
      isNumber(currentTokenLevel[property])
    ) {
      // we've got an actual property we want to log in the result (values, uuids, schemas, and whatnot)
      handleLeafProperty(
        property,
        propertyPath,
        currentTokenLevel,
        currentOriginalLevel,
        update,
      );
    } else if (isObject(currentTokenLevel[property])) {
      // we've got an object that has properties in it we need to check (probably set stuff!)
      handleBranchProperty(
        modifiedTokens,
        rootTokenLevel,
        currentTokenLevel,
        rootOriginalLevel,
        currentOriginalLevel,
        update,
        property,
        propertyPath,
      );
    } else {
      throw new Error(
        "UNHANDLED PROPERTY DATA TYPE: " + typeof currentTokenLevel[property],
      );
    }
  });
}

function handleLeafProperty(
  property,
  propertyPath,
  currentTokenLevel,
  currentOriginalLevel,
  update,
) {
  const newValue = currentTokenLevel[property];
  if (update) {
    // a property value is being updated
    currentTokenLevel[property] = JSON.parse(`{
      "path": "${propertyPath}",
      "new-value": "${newValue}",
      "original-value": "${currentOriginalLevel[property]}"
    }`);
  } else {
    // a property value is either being added or removed
    currentTokenLevel[property] = JSON.parse(`{
      "path": "${propertyPath}",
      "new-value": "${newValue}"
    }`);
  }
}

function handleBranchProperty(
  modifiedTokens,
  rootTokenLevel,
  currentTokenLevel,
  rootOriginalLevel,
  currentOriginalLevel,
  update,
  property,
  currentTokenPath,
) {
  // adjust the token objects to the new depth
  currentTokenLevel = currentTokenLevel[property];

  if (currentOriginalLevel && currentOriginalLevel[property] !== undefined) {
    currentOriginalLevel = currentOriginalLevel[property];
  }

  if (!update) {
    // this checks for renamed branches, by checking uuids
    Object.keys(currentOriginalLevel).forEach((originalProp) => {
      Object.keys(currentTokenLevel).forEach((curProp) => {
        if (
          currentTokenLevel[curProp] !== undefined &&
          isObject(currentOriginalLevel[originalProp]) &&
          isObject(currentTokenLevel[curProp]) &&
          currentOriginalLevel[originalProp].uuid !== undefined &&
          currentTokenLevel[curProp].uuid !== undefined &&
          currentOriginalLevel[originalProp].uuid ===
            currentTokenLevel[curProp].uuid &&
          originalProp !== curProp
        ) {
          modifiedTokens.renamed[curProp] = {
            "old-name": originalProp,
          };
          delete currentTokenLevel[curProp];
        }
        Object.keys(modifiedTokens.renamed).forEach((prop) => {
          if (modifiedTokens.renamed[prop]["old-name"] === curProp) {
            delete currentTokenLevel[curProp];
          }
        });
      });
    });
  }

  // check the properties at this depth
  checkProperties(
    modifiedTokens,
    rootTokenLevel,
    currentTokenLevel,
    rootOriginalLevel,
    currentOriginalLevel,
    update,
    currentTokenPath,
  );
}
