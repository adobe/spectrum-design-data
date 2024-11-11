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
import detectRenamedTokens from "./renamed-token-detection.js";
import detectNewTokens from "./added-token-detection.js";
import detectDeletedTokens from "./deleted-token-detection.js";
import detectDeprecatedTokens from "./deprecated-token-detection.js";
import detectUpdatedTokens from "./updated-token-detection.js";

/**
 * Token diff generator
 * @param {object} original - token data to compare against
 * @param {object} updated - updated token data
 * @return {object} resultJSON - a JSON object containing the new tokens, newly deprecated tokens, deleted tokens, updated values, renamed, updated type
 */
export default function tokenDiff(original, updated) {
  const changes = detailedDiff(original, updated);
  const renamedTokens = detectRenamedTokens(original, changes.added);
  const deprecatedTokens = detectDeprecatedTokens(renamedTokens, changes);
  const newTokens = detectNewTokens(
    renamedTokens,
    deprecatedTokens,
    changes.added,
    original,
  );
  const deletedTokens = detectDeletedTokens(renamedTokens, changes.deleted);
  const updatedTokens = detectUpdatedTokens(
    renamedTokens,
    original,
    changes,
    newTokens,
    deprecatedTokens,
  );
  return formatResult(
    renamedTokens,
    deprecatedTokens,
    newTokens,
    deletedTokens,
    updatedTokens,
  );
}

/**
 * Formats the results from all the different diff categories
 * @param {object} renamedTokens - a list containing the renamed tokens and their old names
 * @param {object} deprecatedTokens - a JSON object containing the newly deprecated tokens
 * @param {object} newTokens - a JSON object containing the added tokens
 * @param {object} deletedTokens - a JSON object containing the deleted tokens
 * @param {object} updatedTokens - a JSON object containing tokens that had updated properties
 * @returns {object} resultJSON - a JSON object containing the new tokens, newly deprecated tokens, deleted tokens, updated values, renamed, updated type
 */
function formatResult(
  renamedTokens,
  deprecatedTokens,
  newTokens,
  deletedTokens,
  updatedTokens,
) {
  const resultJSON = {
    renamed: {},
    deprecated: {},
    reverted: {},
    added: {},
    deleted: {},
    updated: {},
  };
  resultJSON.renamed = renamedTokens;
  resultJSON.deprecated = deprecatedTokens.deprecated;
  resultJSON.reverted = deprecatedTokens.reverted;
  resultJSON.added = newTokens;
  resultJSON.deleted = deletedTokens;
  resultJSON.updated = updatedTokens;
  return resultJSON;
}
