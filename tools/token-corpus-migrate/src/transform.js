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

import alignmentsData from "@adobe/design-system-registry/registry/alignments.json" with { type: "json" };
import colorFamiliesData from "@adobe/design-system-registry/registry/color-families.json" with { type: "json" };
import typographyFamiliesData from "@adobe/design-system-registry/registry/typography-families.json" with { type: "json" };
import typographyStylesData from "@adobe/design-system-registry/registry/typography-styles.json" with { type: "json" };
import typographyWeightsData from "@adobe/design-system-registry/registry/typography-weights.json" with { type: "json" };

const ALIGNMENTS = new Set(alignmentsData.values.map((v) => v.id));
const COLOR_FAMILIES = new Set(colorFamiliesData.values.map((v) => v.id));
const TYPOGRAPHY_FAMILIES = new Set(
  typographyFamiliesData.values.map((v) => v.id),
);
const TYPOGRAPHY_STYLES = new Set(typographyStylesData.values.map((v) => v.id));
const TYPOGRAPHY_WEIGHTS = new Set(
  typographyWeightsData.values.map((v) => v.id),
);

const COLOR_SCHEMAS = new Set(["color.json", "color-set.json"]);
const ALIGNMENT_SCHEMA = "alignment.json";
const DIMENSION_SCHEMA = "dimension.json";
const FONT_FAMILY_SCHEMA = "font-family.json";
const FONT_STYLE_SCHEMA = "font-style.json";
const FONT_WEIGHT_SCHEMA = "font-weight.json";
const MULTIPLIER_SCHEMA = "multiplier.json";
const SCALE_SET_SCHEMA = "scale-set.json";

/** Returns true when a $schema URL ends with the given suffix. */
function schemaEndsWith(schemaUrl, suffix) {
  return typeof schemaUrl === "string" && schemaUrl.endsWith(suffix);
}

function isColorSchema(schemaUrl) {
  return (
    typeof schemaUrl === "string" &&
    COLOR_SCHEMAS.has(schemaUrl.split("/").pop())
  );
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
 * Derive the name object for a font-family token, or null if unclassifiable.
 *
 * Pattern:  <family>-font-family  where family is in the typography-families registry.
 */
export function fontFamilyNameForKey(key) {
  const match = key.match(/^(.+)-font-family$/);
  if (match) {
    const [, family] = match;
    if (TYPOGRAPHY_FAMILIES.has(family)) {
      return { property: "font-family", family };
    }
  }
  return null;
}

/**
 * Derive the name object for a font-style token, or null if unclassifiable.
 *
 * Patterns:
 *   <style>-font-style  where <style> is in the typography-styles registry.
 *   <anything>-font-style  where the token value is a registry style id
 *   (handles "default-font-style" whose value is "normal").
 */
export function fontStyleNameForKey(key, token) {
  const match = key.match(/^(.+)-font-style$/);
  if (!match) return null;
  const [, candidate] = match;
  if (TYPOGRAPHY_STYLES.has(candidate)) {
    return { property: "font-style", style: candidate };
  }
  // Key prefix isn't a registry id — fall back to the token's value.
  const value = typeof token?.value === "string" ? token.value : null;
  if (value && TYPOGRAPHY_STYLES.has(value)) {
    return { property: "font-style", style: value };
  }
  return null;
}

/**
 * Derive the name object for an icon-color token, or null if unclassifiable.
 *
 * Patterns handled:
 *   icon-color-<family>-background           → { property, colorFamily, object }
 *   icon-color-<family>-primary              → { property, colorFamily, variant }
 *   icon-color-<family>-primary-<state>      → { property, colorFamily, variant, state }
 *
 * Called for color-set.json tokens only; alias tokens are filtered upstream by
 * classifyToken (SPEC-042 prohibits colorFamily on alias.json schemas).
 */
export function iconColorNameForKey(key) {
  if (!key.startsWith("icon-color-")) return null;

  // icon-color-<family>-background
  const bgMatch = key.match(/^icon-color-(.+)-background$/);
  if (bgMatch) {
    const [, family] = bgMatch;
    if (COLOR_FAMILIES.has(family)) {
      return {
        property: "icon-color",
        colorFamily: family,
        object: "background",
      };
    }
    return null;
  }

  // icon-color-<family>-primary-<state>
  const stateMatch = key.match(
    /^icon-color-(.+)-primary-(default|down|hover)$/,
  );
  if (stateMatch) {
    const [, family, state] = stateMatch;
    if (COLOR_FAMILIES.has(family)) {
      const name = {
        property: "icon-color",
        colorFamily: family,
        variant: "primary",
      };
      if (state !== "default") name.state = state;
      return name;
    }
    return null;
  }

  // icon-color-<family>-primary (bare, no state)
  const primaryMatch = key.match(/^icon-color-(.+)-primary$/);
  if (primaryMatch) {
    const [, family] = primaryMatch;
    if (COLOR_FAMILIES.has(family)) {
      return {
        property: "icon-color",
        colorFamily: family,
        variant: "primary",
      };
    }
    return null;
  }

  return null;
}

/**
 * Derive the name object for a font-size scale-set token, or null if unclassifiable.
 *
 * Pattern:  font-size-<N>
 */
export function fontSizeNameForKey(key) {
  const match = key.match(/^font-size-(\d+)$/);
  if (match) {
    return { property: "font-size", scaleIndex: Number(match[1]) };
  }
  return null;
}

/**
 * Derive the name object for a line-height scale-set token expressed in font-size
 * units, or null if unclassifiable.
 *
 * Pattern:  line-height-font-size-<N>
 */
export function lineHeightNameForKey(key) {
  const match = key.match(/^line-height-font-size-(\d+)$/);
  if (match) {
    return { property: "line-height", scaleIndex: Number(match[1]) };
  }
  return null;
}

/**
 * Derive the name object for a text-align token, or null if unclassifiable.
 *
 * Pattern:  text-align-<alignment>  where alignment is in the alignments registry.
 */
export function alignmentNameForKey(key) {
  const match = key.match(/^text-align-(.+)$/);
  if (match) {
    const [, alignment] = match;
    if (ALIGNMENTS.has(alignment)) {
      return { property: "text-align", alignment };
    }
  }
  return null;
}

/**
 * Derive the name object for a line-height multiplier token, or null if unclassifiable.
 *
 * Pattern:  line-height-<N>  → { property, scaleIndex }
 *
 * cjk-line-height-<N> is deferred: SPEC-042 prohibits the `family` field on
 * multiplier.json tokens (not in the typography domain schema set).
 *
 * Distinct from lineHeightNameForKey which handles line-height-font-size-<N> / scale-set.json.
 */
export function lineHeightMultiplierNameForKey(key) {
  const plainMatch = key.match(/^line-height-(\d+)$/);
  if (plainMatch) {
    return { property: "line-height", scaleIndex: Number(plainMatch[1]) };
  }
  return null;
}

/**
 * Derive the name object for the bare letter-spacing canonical token.
 *
 * Only the exact key "letter-spacing" is in scope; semantic dimension tokens
 * such as "detail-letter-spacing" are deferred.
 */
export function letterSpacingNameForKey(key) {
  if (key === "letter-spacing") {
    return { property: "letter-spacing" };
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

  if (isColorSchema(schema)) {
    // Icon-color tokens share the color-set schema; classify before color-palette
    if (key.startsWith("icon-color-")) {
      const name = iconColorNameForKey(key);
      if (name) return { name };
      return { name: null }; // in-scope but unclassified (e.g. semantic aliases via color-set)
    }
    const name = colorNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, FONT_WEIGHT_SCHEMA)) {
    const name = fontWeightNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, FONT_FAMILY_SCHEMA)) {
    const name = fontFamilyNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, FONT_STYLE_SCHEMA)) {
    const name = fontStyleNameForKey(key, token);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, SCALE_SET_SCHEMA)) {
    const name = fontSizeNameForKey(key) ?? lineHeightNameForKey(key);
    if (name) return { name };
    return null; // other scale-set tokens (layout, etc.) are out of scope
  }

  if (schemaEndsWith(schema, ALIGNMENT_SCHEMA)) {
    const name = alignmentNameForKey(key);
    if (name) return { name };
    return { name: null }; // in-scope but unclassified
  }

  if (schemaEndsWith(schema, MULTIPLIER_SCHEMA)) {
    // line-height multipliers (line-height-100, cjk-line-height-100) are deferred:
    // - line-height-N collides with line-height-font-size-N (SPEC-006 specificity tie)
    // - cjk-line-height-N would need `family` field, prohibited on multiplier.json (SPEC-042)
    // When SPEC-006 is resolved, use lineHeightMultiplierNameForKey(key) here.
    return null; // out of scope
  }

  if (schemaEndsWith(schema, DIMENSION_SCHEMA)) {
    // Only the bare canonical letter-spacing token is in scope.
    const name = letterSpacingNameForKey(key);
    if (name) return { name };
    return null; // out of scope (detail-letter-spacing etc. deferred)
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
