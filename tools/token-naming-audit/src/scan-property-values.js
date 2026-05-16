/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync } from "node:fs";
import { glob } from "glob";
import {
  propertyTerms,
  anatomyTerms,
  tokenObjects,
  getValues,
} from "@adobe/design-system-registry";

const allowedPropertyValues = new Set(getValues(propertyTerms));
const anatomySet = new Set(getValues(anatomyTerms));
const objectSet = new Set(getValues(tokenObjects));

/**
 * Suggest which field a property value should move to.
 * Returns "anatomy", "object", or undefined if no suggestion can be made.
 * @param {string} value
 * @returns {"anatomy"|"object"|undefined}
 */
function suggestField(value) {
  if (anatomySet.has(value)) return "anatomy";
  if (objectSet.has(value)) return "object";
  return undefined;
}

/**
 * Scan *.tokens.json files under root for structured-name tokens where
 * name.property is not in the property-terms registry.
 *
 * @param {string} root - Workspace root directory
 * @returns {Promise<Array<{token: string, file: string, propertyValue: string, suggestedField?: string}>>}
 */
export async function scanPropertyValues(root) {
  const files = await glob("**/*.tokens.json", {
    cwd: root,
    ignore: ["**/node_modules/**", "**/dist/**"],
    absolute: true,
  });

  const results = [];

  for (const filePath of files) {
    let tokens;
    try {
      tokens = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      continue;
    }

    const entries = Array.isArray(tokens) ? tokens : [tokens];

    for (const token of entries) {
      if (typeof token.name !== "object" || token.name === null) continue;

      const propValue = token.name.property;
      if (typeof propValue !== "string") continue;
      if (allowedPropertyValues.has(propValue)) continue;

      const suggestion = suggestField(propValue);
      results.push({
        token: token.name.component
          ? `${token.name.component}/${propValue}`
          : String(token.name.property),
        file: filePath.slice(root.length + 1),
        propertyValue: propValue,
        ...(suggestion ? { suggestedField: suggestion } : {}),
      });
    }
  }

  return results;
}
