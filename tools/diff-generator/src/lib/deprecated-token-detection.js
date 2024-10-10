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

/**
 * Detects newly deprecated tokens in the diff
 * @param {object} renamedTokens - the newly renamed tokens
 * @param {object} changes - the changed token data
 * @returns {object} result - a JSON object containing the newly deprecated tokens and (potentially) "undeprecated" tokens
 */

export default function detectDeprecatedTokens(renamedTokens, changes) {
  const result = {
    deprecated: {},
    reverted: {},
  };
  const deprecatedTokens = { ...changes.added };
  const possibleMistakenRevert = { ...changes.deleted };
  Object.keys(changes.added).forEach((token) => {
    if (
      (token !== undefined && !isDeprecated(deprecatedTokens[token])) ||
      renamedTokens[token] !== undefined
    ) {
      delete deprecatedTokens[token];
    }
  });
  Object.keys(changes.deleted).forEach((token) => {
    const t = possibleMistakenRevert[token]; // a token marked as deleted
    if (t === undefined || (typeof t !== "string" && !("deprecated" in t))) {
      delete possibleMistakenRevert[token];
    }
  });
  result.deprecated = deprecatedTokens;
  result.reverted = possibleMistakenRevert;
  return result;
}

function isDeprecated(tokenObj) {
  if (typeof tokenObj !== "object") {
    return false;
  } else if (tokenObj.deprecated) {
    return true;
  } else {
    let result = false;

    Object.keys(tokenObj).forEach((property) => {
      result = result || isDeprecated(tokenObj[property]);
    });

    return result;
  }
}
