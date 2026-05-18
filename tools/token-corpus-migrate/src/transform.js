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

import colorFamiliesData from "@adobe/design-system-registry/registry/color-families.json" assert { type: "json" };
import typographyWeightsData from "@adobe/design-system-registry/registry/typography-weights.json" assert { type: "json" };

const COLOR_FAMILIES = new Set(colorFamiliesData.values.map((v) => v.id));
const TYPOGRAPHY_WEIGHTS = new Set(
  typographyWeightsData.values.map((v) => v.id),
);

const COLOR_SCHEMAS = new Set(["color.json", "color-set.json"]);
const FONT_WEIGHT_SCHEMA = "font-weight.json";

/** Returns true when a $schema URL ends with one of the given suffixes. */
function schemaEndsWith(schemaUrl, suffix) {
  return typeof schemaUrl === "string" && schemaUrl.endsWith(suffix);
}

/**
 * Derive the name object for a color-palette token, or null if unclassifiable.
 *
 * Patterns handled:
 *   <family>-<integer>          → { property, colorFamily, scaleIndex }
 *   <family>                    → { property, colorFamily }            (bare family id)
 *   static-<family>-<integer>   → { property, colorFamily, scaleIndex }
 */
export function colorNameForKey(key) {
  // bare family (black, white, transparent-black, transparent-white, …)
  if (COLOR_FAMILIES.has(key)) {
    return { property: "color", colorFamily: key };
  }

  // <family>-<scaleIndex>  where family is in the registry
  const rampMatch = key.match(/^(.+?)-(\d+)$/);
  if (rampMatch) {
    const [, family, indexStr] = rampMatch;
    if (COLOR_FAMILIES.has(family)) {
      return {
        property: "color",
        colorFamily: family,
        scaleIndex: Number(indexStr),
      };
    }
  }

  // static-<family>-<scaleIndex>  (static-blue-100, etc.)
  const staticRampMatch = key.match(/^(static-.+?)-(\d+)$/);
  if (staticRampMatch) {
    const [, family, indexStr] = staticRampMatch;
    if (COLOR_FAMILIES.has(family)) {
      return {
        property: "color",
        colorFamily: family,
        scaleIndex: Number(indexStr),
      };
    }
  }

  return null;
}

/**
 * Derive the name object for a font-weight token, or null if unclassifiable.
 *
 * Pattern:  <weight>-font-weight  where weight is in the typography-weights registry.
 */
export function fontWeightNameForKey(key) {
  const match = key.match(/^(.+)-font-weight$/);
  if (match) {
    const [, weight] = match;
    if (TYPOGRAPHY_WEIGHTS.has(weight)) {
      return { property: "font-weight", weight };
    }
  }
  return null;
}

/**
 * Classify a single token entry and return a name object, or null to skip.
 *
 * @param {string} key            - Token key (e.g. "blue-100")
 * @param {object} token          - Raw token object
 * @param {object} overrides      - Manual override map keyed by token key
 * @returns {{ name: object }|null}
 */
export function classifyToken(key, token, overrides = {}) {
  // Skip if already has a name field (don't overwrite existing structure)
  if ("name" in token) return null;

  // Manual override wins over all automatic rules
  if (overrides[key]) return { name: overrides[key].name };

  const schema = token["$schema"] ?? "";

  if (COLOR_SCHEMAS.has(schema.split("/").pop())) {
    const name = colorNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, FONT_WEIGHT_SCHEMA)) {
    const name = fontWeightNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  return null; // out of scope for this tool
}

/**
 * Process a parsed token file object and return:
 *   - transformed: new file object with name fields injected
 *   - classified: count of tokens that got a name object
 *   - unclassified: keys whose schema was in-scope but couldn't be mapped
 *   - skipped: keys outside this tool's scope
 */
export function transformFile(tokens, overrides = {}) {
  const transformed = {};
  const unclassified = [];
  let classified = 0;
  let skipped = 0;

  for (const [key, token] of Object.entries(tokens)) {
    const result = classifyToken(key, token, overrides);

    if (result === null) {
      // out of scope — copy as-is
      transformed[key] = token;
      skipped++;
    } else if (result.name === null) {
      // in-scope but unclassified
      transformed[key] = token;
      unclassified.push(key);
    } else {
      // inject name field; keep existing field order then add name
      transformed[key] = { ...token, name: result.name };
      classified++;
    }
  }

  return { transformed, classified, unclassified, skipped };
}
