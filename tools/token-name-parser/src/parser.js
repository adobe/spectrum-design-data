/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFile } from "fs/promises";

/**
 * Parse a token name into structured parts (Anonymous Token format)
 * @param {string} tokenName - The hyphenated token name
 * @param {Object} tokenData - The token's value, uuid, $schema, etc.
 * @param {Object} rules - Naming rules from Excel parser
 * @returns {Object} Anonymous structured token
 */
export function parseTokenName(tokenName, tokenData, rules = {}) {
  const parts = tokenName.split("-");

  // Detect pattern and extract structured parts
  let nameStructure = detectPattern(tokenName, parts, rules);

  // Check if this is a semantic alias (references another token for semantic meaning)
  const isAlias = tokenData.$schema && tokenData.$schema.includes("alias");
  const referencesToken =
    typeof tokenData.value === "string" &&
    tokenData.value.startsWith("{") &&
    tokenData.value.endsWith("}");

  // Check if this is a color-set alias (sets contain alias references)
  const isColorSetAlias =
    tokenData.$schema &&
    tokenData.$schema.includes("color-set") &&
    tokenData.sets &&
    Object.values(tokenData.sets).some(
      (set) => set.$schema && set.$schema.includes("alias"),
    );

  if (
    (isAlias &&
      referencesToken &&
      (nameStructure.category === "special" ||
        nameStructure.category === "component-property")) ||
    (isColorSetAlias &&
      (nameStructure.category === "special" ||
        nameStructure.category === "component-property"))
  ) {
    // Upgrade from "special" or "component-property" to "semantic-alias"
    let referencedToken = null;
    if (referencesToken) {
      referencedToken = tokenData.value.slice(1, -1); // Remove { and }
    } else if (isColorSetAlias) {
      // For color-set aliases, extract the first set's reference as example
      const firstSet = Object.values(tokenData.sets)[0];
      if (
        firstSet.value &&
        typeof firstSet.value === "string" &&
        firstSet.value.startsWith("{") &&
        firstSet.value.endsWith("}")
      ) {
        referencedToken = firstSet.value.slice(1, -1);
      }
    }

    nameStructure = {
      category: "semantic-alias",
      property: tokenName, // Use full token name as property for regeneration
      referencedToken: referencedToken,
      notes: "Semantic alias providing contextual naming",
    };
  }

  // Build anonymous token structure
  const token = {
    id: tokenData.uuid,
    $schema: tokenData.$schema,
    value: tokenData.value,
  };

  // Add name structure as property
  token.name = {
    original: tokenName,
    structure: nameStructure,
    semanticComplexity: calculateSemanticComplexity(nameStructure),
  };

  // Add optional fields
  if (tokenData.component) {
    token.component = tokenData.component;
  }

  if (tokenData.deprecated) {
    token.deprecated = tokenData.deprecated;
  }

  if (tokenData.deprecated_comment) {
    token.deprecated_comment = tokenData.deprecated_comment;
  }

  if (tokenData.private) {
    token.private = tokenData.private;
  }

  if (tokenData.sets) {
    token.sets = tokenData.sets;
  }

  // Add validation
  token.validation = validateParsed(nameStructure, rules);

  return token;
}

/**
 * Helper: Check if a string is a component option
 */
function isComponentOption(str) {
  const options = [
    "small",
    "medium",
    "large",
    "extra-large",
    "quiet",
    "compact",
    "spacious",
  ];
  return options.includes(str);
}

/**
 * Helper: Extract options from the end of parts array
 * Handles compound options like "extra-large"
 */
function extractTrailingOptions(parts) {
  const options = [];
  let i = parts.length - 1;

  // Check for compound options like "extra-large"
  if (i >= 1 && parts[i] === "large" && parts[i - 1] === "extra") {
    options.unshift("extra-large");
    i -= 2;
  } else if (i >= 0 && isComponentOption(parts[i])) {
    options.unshift(parts[i]);
    i--;
  }

  // Check for additional options (like "quiet", "compact", "spacious")
  while (i >= 0 && isComponentOption(parts[i])) {
    options.unshift(parts[i]);
    i--;
  }

  return {
    options,
    remainingParts: parts.slice(0, i + 1),
  };
}

/**
 * Detect the pattern type and extract name parts following wiki structure
 * @param {string} tokenName - Full token name
 * @param {Array} parts - Split token name parts
 * @param {Object} rules - Naming rules
 * @returns {Object} Name structure following Token name structure wiki
 */
function detectPattern(tokenName, parts, rules) {
  // PATTERN GROUP 1: SPACING TOKENS (all have "-to-" in them)
  if (tokenName.includes("-to-")) {
    const toIndex = parts.indexOf("to");
    if (toIndex > 0) {
      const beforeTo = parts.slice(0, toIndex);
      const afterTo = parts.slice(toIndex + 1);

      // Check if there are trailing options
      const { options, remainingParts: toParts } =
        extractTrailingOptions(afterTo);

      if (options.length > 0) {
        // Pattern 1a: Spacing with component options
        // {component}-{from}-to-{to}-{option1}-{option2}...
        let component = null;
        let from = null;

        const knownComponents = [
          "field",
          "component",
          "disclosure-indicator",
          "navigational-indicator",
          "checkbox",
          "switch",
          "radio-button",
          "accordion",
          "action-bar",
          "action-button",
          "alert-banner",
          "alert-dialog",
          "avatar",
          "breadcrumbs",
          "card",
          "coach-mark",
          "color-area",
          "color-slider",
          "color-wheel",
          "combo-box",
          "date-picker",
          "help-text",
          "in-field-progress-circle",
          "list-view",
          "menu",
          "number-field",
          "picker",
          "popover",
          "radio",
          "rating",
          "select",
          "side-navigation",
          "slider",
          "stack-view",
          "standard-tabs",
          "status-light",
          "steplist",
          "tab-list",
          "table",
          "tag",
          "time-picker",
          "toast",
          "tray",
          "tree-view",
        ];

        if (beforeTo.length === 1) {
          from = beforeTo[0];
        } else {
          // Try to match compound components first (longer names)
          let foundComponent = false;
          for (let i = Math.min(beforeTo.length - 1, 3); i >= 1; i--) {
            const potentialComponent = beforeTo.slice(0, i).join("-");
            if (knownComponents.includes(potentialComponent)) {
              component = potentialComponent;
              from = beforeTo.slice(i).join("-");
              foundComponent = true;
              break;
            }
          }
          if (!foundComponent) {
            from = beforeTo.join("-");
          }
        }

        return {
          category: "spacing",
          component,
          property: "spacing",
          spaceBetween: {
            from,
            to: toParts.join("-"),
          },
          options,
        };
      }

      // Pattern 1b: Standard spacing with numeric index
      const lastPart = afterTo[afterTo.length - 1];
      if (/^\d+$/.test(lastPart)) {
        return {
          category: "spacing",
          property: "spacing",
          spaceBetween: {
            from: beforeTo.join("-"),
            to: afterTo.slice(0, -1).join("-"),
          },
          index: lastPart,
        };
      }

      // Pattern 1c: Spacing without options or index (scale-set)
      return {
        category: "spacing",
        property: "spacing",
        spaceBetween: {
          from: beforeTo.join("-"),
          to: afterTo.join("-"),
        },
      };
    }
  }

  // PATTERN GROUP 2: GRADIENT STOPS
  if (
    parts.length === 4 &&
    parts[0] === "gradient" &&
    parts[1] === "stop" &&
    /^\d+$/.test(parts[2])
  ) {
    return {
      category: "gradient-color",
      property: "gradient-stop",
      index: parts[2],
      variant: parts[3],
    };
  }

  // PATTERN GROUP 3: COMPONENT PROPERTIES WITH CALCULATION AND STATE
  if (parts.length >= 4 && parts[0] === "component" && parts[1] === "size") {
    const states = ["down"];
    const lastPart = parts[parts.length - 1];

    if (states.includes(lastPart)) {
      return {
        category: "component-property",
        component: "component",
        property: "size",
        calculation: parts.slice(2, -1).join("-"),
        state: lastPart,
      };
    }
  }

  // PATTERN GROUP 4: JUST ANATOMY PART OR SPECIAL STANDALONE (no standard pattern)
  const specialTokens = ["side-focus-indicator", "android-elevation"];
  if (specialTokens.includes(tokenName)) {
    return {
      category: "special",
      property: tokenName,
      notes: "Platform-specific or standalone token",
    };
  }

  // PATTERN GROUP 6: ANATOMY PART + PROPERTY (No component, no index)

  // Pattern 6a: Compound anatomy + property + option
  // e.g., side-label-character-count-top-margin-small (7 parts)
  //       side-label-character-count-top-margin-extra-large (8 parts)
  if (
    (parts.length === 7 || parts.length === 8) &&
    parts[0] === "side" &&
    parts[1] === "label" &&
    parts[2] === "character" &&
    parts[3] === "count" &&
    parts[4] === "top" &&
    parts[5] === "margin"
  ) {
    let option;
    if (parts.length === 7) {
      // Simple option: small, medium, large
      option = parts[6];
    } else if (
      parts.length === 8 &&
      parts[6] === "extra" &&
      parts[7] === "large"
    ) {
      // Compound option: extra-large
      option = "extra-large";
    }

    if (option && isComponentOption(option)) {
      return {
        category: "generic-property",
        anatomyPart: "side-label-character-count",
        property: "top-margin",
        options: [option],
      };
    }
  }

  // Pattern 6b: Simple anatomy + property (2 parts)
  const anatomyPropertyPatterns = [
    { anatomy: "focus-indicator", property: "gap" },
    { anatomy: "focus-indicator", property: "thickness" },
    { anatomy: "text-underline", property: "gap" },
    { anatomy: "text-underline", property: "thickness" },
  ];

  for (const pattern of anatomyPropertyPatterns) {
    const expectedName = `${pattern.anatomy}-${pattern.property}`;
    if (tokenName === expectedName) {
      return {
        category: "generic-property",
        anatomyPart: pattern.anatomy,
        property: pattern.property,
      };
    }
  }

  // PATTERN GROUP 6c: TYPOGRAPHY BASE TOKENS (direct font property values)
  // Pattern: {value}-font-{property}
  const typographyPatterns = [
    { suffix: "font-weight", examples: ["light", "bold", "black"] },
    { suffix: "font-family", examples: ["sans-serif", "serif", "cjk"] },
    { suffix: "font-style", examples: ["italic", "default"] },
  ];

  for (const pattern of typographyPatterns) {
    if (tokenName.endsWith(`-${pattern.suffix}`)) {
      return {
        category: "typography-base",
        property: tokenName,
        notes: `Base typography property: ${pattern.suffix}`,
      };
    }
  }

  // Pattern: Standalone typography properties
  const typographyProperties = [
    "letter-spacing",
    "text-align-start",
    "text-align-center",
    "text-align-end",
    "heading-margin-top-multiplier",
    "heading-margin-bottom-multiplier",
    "body-margin-multiplier",
    "detail-margin-top-multiplier",
    "detail-margin-bottom-multiplier",
  ];

  if (typographyProperties.includes(tokenName)) {
    return {
      category: "typography-base",
      property: tokenName,
      notes: "Base typography property",
    };
  }

  // Pattern: Component-specific typography properties
  // detail-letter-spacing, detail-*-text-transform, line-height-*, cjk-line-height-*
  if (
    tokenName.endsWith("-letter-spacing") ||
    tokenName.endsWith("-text-transform") ||
    tokenName.match(/^(cjk-)?line-height-\d+$/)
  ) {
    return {
      category: "typography-base",
      property: tokenName,
      notes: "Component-specific typography property",
    };
  }

  // PATTERN GROUP 7: COLOR TOKENS (check early to avoid false matches with generic properties)

  // Pattern 7a: Base color (1 part)
  if (parts.length === 1) {
    const baseColors = ["white", "black"];
    if (baseColors.includes(parts[0])) {
      return {
        category: "color-base",
        color: parts[0],
      };
    }
  }

  // Pattern 7b: Color scale (2 parts) - {color}-{index}
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    const colors = [
      "blue",
      "brown",
      "celery",
      "chartreuse",
      "cinnamon",
      "cyan",
      "fuchsia",
      "gray",
      "green",
      "indigo",
      "magenta",
      "orange",
      "pink",
      "purple",
      "red",
      "seafoam",
      "silver",
      "turquoise",
      "yellow",
    ];
    if (colors.includes(parts[0])) {
      return {
        category: "color-scale",
        color: parts[0],
        index: parts[1],
      };
    }
  }

  // Pattern 7c: Modified color scale (3 parts) - {modifier}-{color}-{index}
  // transparent-white-100, static-blue-900
  if (parts.length === 3 && /^\d+$/.test(parts[2])) {
    const modifiers = ["transparent", "static"];
    const colors = [
      "white",
      "black",
      "blue",
      "brown",
      "celery",
      "chartreuse",
      "cinnamon",
      "cyan",
      "fuchsia",
      "gray",
      "green",
      "indigo",
      "magenta",
      "orange",
      "pink",
      "purple",
      "red",
      "seafoam",
      "silver",
      "turquoise",
      "yellow",
    ];
    if (modifiers.includes(parts[0]) && colors.includes(parts[1])) {
      return {
        category: "color-scale",
        modifier: parts[0],
        color: parts[1],
        index: parts[2],
      };
    }
  }

  // PATTERN GROUP 8: GENERIC PROPERTIES WITH INDEX

  // Pattern 8a: {property}-{index} (2 parts)
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return {
      category: "generic-property",
      property: parts[0],
      index: parts[1],
    };
  }

  // Pattern 8b: {compound-property}-{index} (3 parts, first 2 form property)
  if (parts.length === 3 && /^\d+$/.test(parts[2])) {
    const compoundPropertyNames = ["corner-radius"];
    const potentialProperty = `${parts[0]}-${parts[1]}`;

    if (compoundPropertyNames.includes(potentialProperty)) {
      return {
        category: "generic-property",
        property: potentialProperty,
        index: parts[2],
      };
    }
  }

  // Pattern 8c: {compound-property}-{index} (4 parts, first 3 form property)
  if (parts.length === 4 && /^\d+$/.test(parts[3])) {
    const compoundPropertyNames = [
      "drop-shadow-x",
      "drop-shadow-y",
      "drop-shadow-blur",
    ];
    const potentialProperty = `${parts[0]}-${parts[1]}-${parts[2]}`;

    if (compoundPropertyNames.includes(potentialProperty)) {
      return {
        category: "generic-property",
        property: potentialProperty,
        index: parts[3],
      };
    }
  }

  // PATTERN GROUP 9: COMPONENT PROPERTIES
  const lastPart = parts[parts.length - 1];
  const hasNumericIndex = /^\d+$/.test(lastPart);

  if (parts.length >= 3) {
    if (hasNumericIndex) {
      // Pattern 8a: component-padding-vertical-{index}
      if (
        parts.length === 4 &&
        parts[0] === "component" &&
        parts[1] === "padding"
      ) {
        return {
          category: "component-property",
          component: "component",
          property: `${parts[1]}-${parts[2]}`,
          index: lastPart,
        };
      }

      // Pattern 8b: Multi-word property or component with index
      const knownProperties = [
        "size",
        "height",
        "width",
        "spacing",
        "radius",
        "color",
        "padding",
      ];
      for (let i = 1; i < parts.length - 1; i++) {
        if (knownProperties.includes(parts[i])) {
          return {
            category: "component-property",
            component: parts.slice(0, i).join("-"),
            property: parts.slice(i, parts.length - 1).join("-"),
            index: lastPart,
          };
        }
      }

      // Pattern 8c: Standard {component}-{property}-{index}
      if (parts.length === 3) {
        return {
          category: "component-property",
          component: parts[0],
          property: parts[1],
          index: lastPart,
        };
      }
    }
  }

  // Pattern 8d: {compound-component}-{anatomy-part}-{property} (scale-set, no index)
  if (parts.length === 4 && !hasNumericIndex) {
    const compoundComponents = ["color-control"];
    const compoundComponent = `${parts[0]}-${parts[1]}`;
    const knownAnatomyParts = ["track"];
    const knownProperties = ["width", "height"];

    if (
      compoundComponents.includes(compoundComponent) &&
      knownAnatomyParts.includes(parts[2]) &&
      knownProperties.includes(parts[3])
    ) {
      return {
        category: "component-property",
        component: compoundComponent,
        anatomyPart: parts[2],
        property: parts[3],
      };
    }
  }

  // Pattern 8e: {component}-{property} (scale-set, no index)
  if (parts.length === 2 && !hasNumericIndex) {
    const knownComponents = ["field"];
    const knownProperties = ["width", "height"];

    if (
      knownComponents.includes(parts[0]) &&
      knownProperties.includes(parts[1])
    ) {
      return {
        category: "component-property",
        component: parts[0],
        property: parts[1],
      };
    }
  }

  // Pattern 8f: Component properties with component options instead of numeric index
  // {component}-{anatomy}-{property}-{option} or {component}-{property}-{option}
  if (parts.length >= 3 && !hasNumericIndex) {
    // Extract trailing options (handles compound options like "extra-large")
    const { options: trailingOptions, remainingParts } =
      extractTrailingOptions(parts);

    // Check if there are trailing options
    if (trailingOptions.length > 0) {
      const knownProperties = [
        "size",
        "height",
        "width",
        "spacing",
        "margin",
        "padding",
        "gap",
        "radius",
        "thickness",
      ];

      // Pattern: {component}-{anatomy}-{property}-{option} (4+ parts before options)
      if (remainingParts.length >= 3) {
        const lastPart = remainingParts[remainingParts.length - 1];

        // Check if last part of remaining is a known property
        if (knownProperties.includes(lastPart)) {
          return {
            category: "component-property",
            component: remainingParts[0],
            anatomyPart: remainingParts.slice(1, -1).join("-"),
            property: lastPart,
            options: trailingOptions,
          };
        }
      }

      // Pattern: {component}-{property}-{option} (2 parts before options)
      if (remainingParts.length === 2) {
        if (knownProperties.includes(remainingParts[1])) {
          return {
            category: "component-property",
            component: remainingParts[0],
            property: remainingParts[1],
            options: trailingOptions,
          };
        }
      }
    }
  }

  // PATTERN GROUP 10: SPECIAL CATCH-ALL
  if (parts.length >= 2 && !hasNumericIndex) {
    return {
      category: "special",
      property: tokenName,
      notes: "No index suffix detected",
    };
  }

  // PATTERN GROUP 11: UNKNOWN
  return {
    category: "unknown",
    raw: tokenName,
    parts: parts,
    notes: "Pattern not recognized",
  };
}

/**
 * Calculate semantic complexity based on name structure fields
 * @param {Object} nameStructure - The token's name structure
 * @returns {number} Semantic complexity score
 */
function calculateSemanticComplexity(nameStructure) {
  // Unknown tokens have no parseable semantic structure
  if (nameStructure.category === "unknown") {
    return 0;
  }

  let complexity = 0;

  // +1 for component specificity
  if (nameStructure.component) complexity++;

  // +1 for relationship between parts
  if (nameStructure.spaceBetween) complexity++;

  // +1 for anatomy part specificity (sub-component detail)
  if (nameStructure.anatomyPart) complexity++;

  // +1 for property definition
  if (nameStructure.property) complexity++;

  // +1 for semantic aliasing
  if (nameStructure.referencedToken) complexity++;

  // +1 for component options (size, variant, etc.)
  if (nameStructure.options && nameStructure.options.length > 0) complexity++;

  // +1 for state specificity
  if (nameStructure.state) complexity++;

  // +1 for calculation/formula
  if (nameStructure.calculation) complexity++;

  // +1 for variant (like genai, premium, avatar)
  if (nameStructure.variant) complexity++;

  // +1 for platform specificity
  if (nameStructure.platform) complexity++;

  // +1 for color specificity
  if (nameStructure.color) complexity++;

  // +1 for color modifier (transparent, static)
  if (nameStructure.modifier) complexity++;

  return complexity;
}

/**
 * Validate parsed token against rules
 * @param {Object} parsed - Parsed token structure
 * @param {Object} rules - Naming rules
 * @returns {Object} Validation result
 */
function validateParsed(nameStructure, rules) {
  const errors = [];

  if (!nameStructure || !nameStructure.category) {
    errors.push("No category detected");
    return { isValid: false, errors };
  }

  // Validate spacing tokens structure
  if (nameStructure.category === "spacing" && nameStructure.spaceBetween) {
    if (!nameStructure.spaceBetween.from) {
      errors.push("Missing 'from' in spaceBetween");
    }
    if (!nameStructure.spaceBetween.to) {
      errors.push("Missing 'to' in spaceBetween");
    }
  }

  // Unknown categories are flagged
  if (nameStructure.category === "unknown") {
    errors.push("Unknown token pattern");
  }

  // Note: Index/property/component value validation is handled by JSON schemas
  // This parser-level validation only checks structural completeness

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parse all tokens from a file into anonymous token array
 * @param {string} filePath - Path to token JSON file
 * @param {Object} rules - Naming rules from Excel
 * @returns {Promise<Array>} Array of anonymous tokens
 */
export async function parseTokenFile(filePath, rules = {}) {
  const content = await readFile(filePath, "utf8");
  const tokens = JSON.parse(content);

  const parsedArray = [];

  for (const [tokenName, tokenData] of Object.entries(tokens)) {
    const token = parseTokenName(tokenName, tokenData, rules);
    parsedArray.push(token);
  }

  return parsedArray;
}

export default { parseTokenName, parseTokenFile };
