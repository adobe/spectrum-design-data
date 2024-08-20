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
import { detailedDiff } from "deep-object-diff";

/**
 * Detects updates made to tokens
 * @param {object} renamed - a list containing tokens that were renamed
 * @param {object} original - the original token data
 * @param {object} changes - the changed token data
 * @returns {object} updatedTokens - a JSON object containing the updated tokens (with new name, if renamed)
 */
export default function detectUpdatedTokens(
  renamed,
  original,
  changes,
  newTokens,
  deprecatedTokens,
) {
  const updatedTokens = {
    renamed: {},
    added: {},
    deleted: {},
    updated: { ...changes.updated },
  };
  Object.keys(changes.added).forEach((token) => {
    if (renamed[token] !== undefined) {
      const tokenDiff = detailedDiff(
        original[renamed[token]["old-name"]],
        changes.added[token],
      ).updated;
      if (Object.keys(tokenDiff).length !== 0) {
        updatedTokens.updated[token] = tokenDiff;
      }
    } else if (
      newTokens[token] === undefined &&
      original[token] !== undefined &&
      deprecatedTokens.deprecated[token] === undefined
    ) {
      updatedTokens.added[token] = changes.added[token];
      formatJSON(
        updatedTokens,
        updatedTokens.added[token],
        token,
        original,
        renamed,
        false,
      );
    }
  });
  Object.keys(changes.deleted).forEach((token) => {
    const t = changes.deleted[token];
    if (t !== undefined && !("deprecated" in t)) {
      const tokenDiff = detailedDiff(
        t, // switching the order to easily get change
        original[token],
      ).updated;
      updatedTokens.deleted[token] = tokenDiff;
      formatJSON(
        updatedTokens,
        updatedTokens.deleted[token],
        token,
        original,
        renamed,
        false,
      );
    }
  });
  Object.keys(updatedTokens.updated).forEach((token) => {
    formatJSON(
      updatedTokens,
      updatedTokens.updated[token],
      token,
      original,
      renamed,
      true,
    );
  });
  return updatedTokens;
}

/**
 * Appends original token properties to updatedTokens JSON
 * @param {object} tokens - the updated tokens (added, deleted, or updated)
 * @param {string} properties - the path containing all the keys required to traverse through to get to value
 * @param {object} original - the original token
 * @param {object} renamed - a JSON object containing the renamed tokens
 * @param {boolean} update - a boolean indicating whether token property is added, deleted, or updated
 */
function formatJSON(
  updatedTokens,
  tokens,
  properties,
  original,
  renamed,
  update,
) {
  if (renamed[properties] !== undefined) {
    includeOldProperties(
      updatedTokens,
      tokens,
      tokens,
      properties,
      original,
      original[renamed[properties]["old-name"]],
      renamed,
      update,
    );
  } else {
    includeOldProperties(
      updatedTokens,
      tokens,
      tokens,
      properties,
      original,
      original[properties],
      renamed,
      update,
    );
  }
}

/**
 * Traverses original and result token to insert the original value, path to the value, and new value
 * @param {object} token - the current token from updatedTokens
 * @param {object} curTokenLevel - the current key
 * @param {string} properties - a string containing the path to get to the value
 * @param {object} originalToken - the original token
 * @param {object} curOriginalLevel - the current key for original token
 * @param {object} renamed - the renamed tokens
 */
function includeOldProperties(
  updatedTokens,
  token,
  curTokenLevel,
  properties,
  originalToken,
  curOriginalLevel,
  renamed,
  update,
) {
  Object.keys(curTokenLevel).forEach((property) => {
    if (
      property === "path" ||
      property === "new-value" ||
      property === "original-value"
    ) {
      return;
    }
    if (typeof curTokenLevel[property] === "string") {
      const newValue = curTokenLevel[property];
      const path = !properties.includes(".")
        ? property
        : `${properties.substring(properties.indexOf(".") + 1)}.${property}`;
      curTokenLevel[property] = update
        ? JSON.parse(`{ 
        "new-value": "${newValue}",
        "path": "${path}",
        "original-value": "${curOriginalLevel[property]}"
        }`)
        : JSON.parse(`{ 
          "new-value": "${newValue}",
          "path": "${path}"
          }`);
      return;
    }
    const nextProperties = properties + "." + property;
    const keys = nextProperties.split(".");
    curOriginalLevel = originalToken;
    curTokenLevel = token;
    keys.forEach((key) => {
      if (curOriginalLevel[key] === undefined) {
        if (
          renamed[key] !== undefined &&
          curOriginalLevel[renamed[key]["old-name"]] !== undefined
        ) {
          curOriginalLevel = curOriginalLevel[renamed[key]["old-name"]];
        }
      } else {
        curOriginalLevel = curOriginalLevel[key];
      }
      curTokenLevel =
        curTokenLevel[key] === undefined ? token : curTokenLevel[key];
    });
    if (!update) {
      Object.keys(curOriginalLevel).forEach((originalProp) => {
        Object.keys(curTokenLevel).forEach((curProp) => {
          if (
            curTokenLevel[curProp] !== undefined &&
            typeof curOriginalLevel[originalProp] !== "string" &&
            typeof curTokenLevel[curProp] !== "string" &&
            curOriginalLevel[originalProp].uuid !== undefined &&
            curTokenLevel[curProp].uuid !== undefined &&
            curOriginalLevel[originalProp].uuid ===
              curTokenLevel[curProp].uuid &&
            originalProp !== curProp
          ) {
            updatedTokens.renamed[curProp] = {
              "old-name": originalProp,
            };
            delete curTokenLevel[curProp];
          }
          Object.keys(updatedTokens["renamed"]).forEach((prop) => {
            if (updatedTokens["renamed"][prop]["old-name"] === curProp) {
              delete curTokenLevel[curProp];
            }
          });
        });
      });
    }
    includeOldProperties(
      updatedTokens,
      token,
      curTokenLevel,
      nextProperties,
      originalToken,
      curOriginalLevel,
      renamed,
      update,
    );
  });
}
