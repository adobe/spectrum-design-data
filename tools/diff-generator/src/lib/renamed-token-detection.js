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
 * Check if a change is a rename by comparing the tokens' UUIDs
 * @param {object} original - the original token data
 * @param {object} added - the added token data from deep-obj-diff
 * @returns {object} renamedTokens - an array containing the renamed tokens
 */

export default function detectRenamedTokens(original, added) {
  const renamedTokens = {};
  Object.keys(added).forEach((change) => {
    Object.keys(original).forEach((originalToken) => {
      if (
        added[change].uuid &&
        original[originalToken].uuid &&
        original[originalToken].uuid === added[change].uuid &&
        originalToken !== change
      ) {
        renamedTokens[change] = {
          "old-name": originalToken,
        };
      }
    });
  });
  return renamedTokens;
}
