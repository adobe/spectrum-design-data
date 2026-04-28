// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Fallback serialization order used when the field catalog does not provide one.
 * Matches the positions declared in packages/design-data-spec/fields/*.json.
 */
const FALLBACK_SERIALIZATION_ORDER = [
  "variant",
  "component",
  "structure",
  "substructure",
  "anatomy",
  "object",
  "property",
  "orientation",
  "position",
  "size",
  "density",
  "shape",
  "state",
];

/**
 * Known compound properties that span multiple segments.
 * These are treated as single property values.
 */
const COMPOUND_PROPERTIES = [
  "font-size",
  "font-weight",
  "font-family",
  "font-style",
  "line-height",
  "text-transform",
  "text-align",
  "text-decoration",
  "corner-radius",
  "border-width",
  "minimum-width",
  "minimum-height",
  "maximum-width",
  "maximum-height",
  "underline-gap",
  "drop-shadow",
  "typography-scale",
];

/**
 * Known terms that aren't in registries but represent recognizable concepts.
 * These are classified as gap categories for the report rather than matched to fields.
 */
const KNOWN_GAP_TERMS = {
  // Typography script/family — need a new field or vocabulary expansion
  "typography-script": ["cjk"],
  "typography-family": ["sans", "serif"],
  // Typography weight/emphasis — overlap with states/variants
  "typography-weight": ["emphasized", "strong", "heavy", "light"],
  // Variant qualifiers — subtle, subdued, and static are now in the variant registry.
  // Only "non" remains unregistered (used as a negation prefix, not a standalone variant).
  "variant-qualifier": ["non"],
  // Context modifiers
  "context-modifier": ["elevated", "dragged", "ambient", "pasteboard"],
  // Drop-shadow sub-properties
  "drop-shadow-property": ["blur", "x", "y"],
  // Spatial qualifiers
  "spatial-qualifier": ["inner", "outer"],
};

/**
 * Known multi-segment terms that appear in token names but aren't in registries.
 * These get matched as their target field type.
 * Includes legacy aliases and common patterns.
 *
 * NOTE: focus-ring, focus-indicator, workflow-icon, and ui-icon have been
 * moved into the anatomy-terms registry. Only state aliases remain here.
 */
const EXTRA_TERMS = [
  // State aliases used in tokens (registry has keyboard-focus, tokens use key-focus)
  { segments: ["key", "focus"], field: "state", id: "key-focus" },
];

/**
 * Known numeric scale patterns — these are NOT t-shirt sizes
 * but numeric index values (e.g., spacing-100, blue-900).
 */
const NUMERIC_SCALE_PATTERN = /^\d+$/;

/**
 * Decompose a token name into a 13-field name object.
 *
 * @param {string} tokenName - kebab-case token name
 * @param {object} tokenData - the token's JSON data (for metadata like `component`)
 * @param {object} registry - { byField, terms } from loadRegistries
 * @param {string} sourceFile - which source file this token came from
 * @returns {object} decomposition result
 */
export function decompose(tokenName, tokenData, registry, sourceFile) {
  const segments = tokenName.split("-");
  const nameObject = {};
  const matched = new Array(segments.length).fill(false);
  const matchDetails = new Array(segments.length).fill(null);
  const warnings = [];
  const gaps = [];

  // Phase 1: Use metadata-provided component if available
  if (tokenData.component) {
    const compSegments = tokenData.component.split("-");
    const compLen = compSegments.length;
    // Verify the component appears in the token name
    const compIndex = findSubsequence(segments, compSegments);
    if (compIndex !== -1) {
      nameObject.component = tokenData.component;
      for (let i = compIndex; i < compIndex + compLen; i++) {
        matched[i] = true;
        matchDetails[i] = "component";
      }
    } else {
      // Component is in metadata but not in name — record this
      nameObject.component = tokenData.component;
      warnings.push(
        `component "${tokenData.component}" in metadata but not found in name segments`,
      );
    }
  }

  // Phase 2: Try matching compound properties (longest first)
  const sortedCompound = [...COMPOUND_PROPERTIES].sort(
    (a, b) => b.split("-").length - a.split("-").length,
  );
  for (const compound of sortedCompound) {
    if (nameObject.property) break;
    const compSegs = compound.split("-");
    const idx = findSubsequenceUnmatched(segments, compSegs, matched);
    if (idx !== -1) {
      nameObject.property = compound;
      for (let i = idx; i < idx + compSegs.length; i++) {
        matched[i] = true;
        matchDetails[i] = "property";
      }
    }
  }

  // Phase 3: Match registry terms + extra terms against unmatched segments
  const fieldPriority = [
    "component",
    "variant",
    "object",
    "anatomy",
    "structure",
    "substructure",
    "state",
    "size",
    "density",
    "shape",
    "orientation",
    "position",
    "property",
  ];

  // Combine registry terms with extra terms for matching
  const allTerms = {
    byField: registry.byField,
    terms: [...registry.terms, ...EXTRA_TERMS],
  };
  // Re-sort by segment count descending
  allTerms.terms.sort((a, b) => b.segments.length - a.segments.length);

  // Build a list of all possible matches at every unmatched position
  const positionMatches = [];
  for (let i = 0; i < segments.length; i++) {
    if (matched[i]) continue;
    const matches = findRegistryMatches(segments, i, allTerms, matched);
    for (const m of matches) {
      positionMatches.push({ ...m, startIndex: i });
    }
  }

  // Sort by: longer matches first, then by field priority
  positionMatches.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return fieldPriority.indexOf(a.field) - fieldPriority.indexOf(b.field);
  });

  // Greedily assign matches, skipping conflicts
  for (const match of positionMatches) {
    const { field, id, length, startIndex } = match;

    // Skip if field already assigned (except component from metadata)
    if (nameObject[field] !== undefined && field !== "component") continue;
    if (field === "component" && nameObject.component) continue;

    // Skip if any segment in this range is already matched
    let conflict = false;
    for (let i = startIndex; i < startIndex + length; i++) {
      if (matched[i]) {
        conflict = true;
        break;
      }
    }
    if (conflict) continue;

    nameObject[field] = id;
    for (let i = startIndex; i < startIndex + length; i++) {
      matched[i] = true;
      matchDetails[i] = field;
    }
  }

  // Phase 4: Handle numeric scale values
  for (let i = 0; i < segments.length; i++) {
    if (matched[i]) continue;
    if (NUMERIC_SCALE_PATTERN.test(segments[i])) {
      nameObject.scaleIndex = segments[i];
      matched[i] = true;
      matchDetails[i] = "scaleIndex";
      if (!registry.allFields?.has("scaleIndex")) {
        gaps.push({
          type: "numeric-scale-index",
          value: segments[i],
          description:
            "Numeric scale index has no field in the 13-field taxonomy",
        });
      }
    }
  }

  // Phase 5: Check for -to- spacing pattern
  const toIndex = segments.indexOf("to");
  if (toIndex > 0 && !matched[toIndex]) {
    gaps.push({
      type: "spacing-between",
      value: tokenName,
      description:
        "Spacing-between (-to-) pattern has no representation in the 13-field spec",
    });
    matched[toIndex] = true;
    matchDetails[toIndex] = "spacing-between-connector";
  }

  // Phase 6: Classify known gap terms
  for (let i = 0; i < segments.length; i++) {
    if (matched[i]) continue;
    for (const [gapType, terms] of Object.entries(KNOWN_GAP_TERMS)) {
      if (terms.includes(segments[i])) {
        matched[i] = true;
        matchDetails[i] = `gap:${gapType}`;
        gaps.push({
          type: gapType,
          value: segments[i],
          description: `"${segments[i]}" is a known ${gapType} term with no field in the taxonomy`,
        });
        break;
      }
    }
  }

  // Phase 7: Assign remaining unmatched segments as property (if no property yet)
  const unmatchedSegments = [];
  for (let i = 0; i < segments.length; i++) {
    if (!matched[i]) {
      unmatchedSegments.push({ index: i, value: segments[i] });
    }
  }

  if (unmatchedSegments.length > 0 && !nameObject.property) {
    // Join consecutive unmatched segments as property
    const propertyParts = [];
    for (const { index, value } of unmatchedSegments) {
      propertyParts.push(value);
      matched[index] = true;
      matchDetails[index] = "property";
    }
    nameObject.property = propertyParts.join("-");
  }

  // Phase 8: Flag remaining unmatched segments
  const finalUnmatched = [];
  for (let i = 0; i < segments.length; i++) {
    if (!matched[i]) {
      finalUnmatched.push({ index: i, segment: segments[i] });
    }
  }

  // Record unmatched segments as gaps
  for (const { segment } of finalUnmatched) {
    gaps.push({
      type: "unmatched-segment",
      value: segment,
      description: `Segment "${segment}" could not be assigned to any field`,
    });
  }

  // Phase 9: Roundtrip check
  const serialized = serialize(
    nameObject,
    registry.tokenNameMap,
    registry.serializationOrder,
  );
  const roundtrips = serialized === tokenName;
  if (!roundtrips) {
    warnings.push(`Roundtrip mismatch: "${serialized}" !== "${tokenName}"`);
  }

  // Phase 10: Score
  const unmatchedCount = finalUnmatched.length;
  const hasProperty = !!nameObject.property;
  let confidence;
  if (unmatchedCount === 0 && hasProperty && roundtrips) {
    confidence = "HIGH";
  } else if (unmatchedCount === 0 && hasProperty) {
    confidence = "MEDIUM";
  } else if (unmatchedCount <= 2) {
    confidence = "MEDIUM";
  } else if (unmatchedCount <= 4) {
    confidence = "LOW";
  } else {
    confidence = "FAIL";
  }

  return {
    tokenName,
    sourceFile,
    nameObject,
    confidence,
    roundtrips,
    serialized,
    warnings,
    gaps,
    unmatchedSegments: finalUnmatched,
    matchDetails: segments.map((seg, i) => ({
      segment: seg,
      field: matchDetails[i],
    })),
    deprecated: !!tokenData.deprecated,
    private: !!tokenData.private,
  };
}

/**
 * Serialize a name object to kebab-case using the declared field order.
 * Uses tokenNameMap to output long-form aliases (e.g., xl → extra-large)
 * for legacy compatibility.
 *
 * @param {object} nameObject
 * @param {object} tokenNameMap - id → tokenName for legacy alias expansion
 * @param {string[]} [serializationOrder] - ordered field names from field catalog
 */
export function serialize(
  nameObject,
  tokenNameMap = {},
  serializationOrder = FALLBACK_SERIALIZATION_ORDER,
) {
  const parts = [];
  for (const field of serializationOrder) {
    if (nameObject[field]) {
      const value = nameObject[field];
      // Use tokenName long form if available (e.g., xl → extra-large)
      parts.push(tokenNameMap[value] || value);
    }
  }
  // Append scaleIndex at end if present (non-standard)
  if (nameObject.scaleIndex) {
    parts.push(nameObject.scaleIndex);
  }
  return parts.join("-");
}

/**
 * Find the first occurrence of subsequence in segments.
 */
function findSubsequence(segments, subsequence) {
  outer: for (let i = 0; i <= segments.length - subsequence.length; i++) {
    for (let j = 0; j < subsequence.length; j++) {
      if (segments[i + j] !== subsequence[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Find the first occurrence of subsequence in unmatched segments.
 */
function findSubsequenceUnmatched(segments, subsequence, matched) {
  outer: for (let i = 0; i <= segments.length - subsequence.length; i++) {
    for (let j = 0; j < subsequence.length; j++) {
      if (matched[i + j] || segments[i + j] !== subsequence[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Find all registry matches starting at a given index, respecting already-matched segments.
 */
function findRegistryMatches(segments, startIndex, registry, matched) {
  const results = [];
  const remaining = segments.length - startIndex;

  for (const term of registry.terms) {
    if (term.segments.length > remaining) continue;

    let isMatch = true;
    for (let i = 0; i < term.segments.length; i++) {
      if (
        matched[startIndex + i] ||
        segments[startIndex + i] !== term.segments[i]
      ) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      results.push({
        field: term.field,
        id: term.id,
        length: term.segments.length,
      });
    }
  }

  return results;
}
