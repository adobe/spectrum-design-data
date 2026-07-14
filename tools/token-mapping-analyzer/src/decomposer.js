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
 * Matches the positions declared in packages/design-data/fields/*.json.
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
  "typography-scale",
];

/**
 * Known terms that aren't in registries but represent recognizable concepts.
 * These are classified as gap categories for the report rather than matched to fields.
 */
const KNOWN_GAP_TERMS = {
  // Variant qualifiers — subtle, subdued, and static are now in the variant registry.
  // Only "non" remains unregistered (used as a negation prefix, not a standalone variant).
  "variant-qualifier": ["non"],
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
 * True if `endpoint` is a valid space-between gap endpoint: a registered
 * position, a generic anatomy term, a component-declared anatomy part, or one
 * of those glued to a registered position via a single hyphen-bounded
 * prefix/suffix (e.g. "content-area-bottom" = anatomy "content-area" +
 * position "bottom"). Direct port of SPEC-047's `endpoint_resolves`
 * (sdk/core/src/validate/rules/spec047.rs) — keep the two in sync.
 *
 * Note: `apply.js` always has `declaredParts` populated (it loads components
 * from the registry directly), unlike Rust's `validate-dataset`, which may run
 * with an empty component catalog and defers rather than errors in that case.
 * Do not port that deferral here — this function's callers never hit it.
 *
 * @param {string} endpoint
 * @param {Set<string>|undefined} positionVocab
 * @param {Set<string>|undefined} anatomyVocab
 * @param {Set<string>} declaredParts - component-declared anatomy part names
 * @returns {boolean}
 */
function endpointResolves(
  endpoint,
  positionVocab,
  anatomyVocab,
  declaredParts,
) {
  const isAnatomy = (s) =>
    Boolean(anatomyVocab?.has(s)) || declaredParts.has(s);
  const isPosition = (s) => Boolean(positionVocab?.has(s));

  if (isPosition(endpoint) || isAnatomy(endpoint)) return true;
  if (!positionVocab) return false;

  for (const pos of positionVocab) {
    if (
      endpoint.startsWith(`${pos}-`) &&
      isAnatomy(endpoint.slice(pos.length + 1))
    ) {
      return true;
    }
    const suffix = `-${pos}`;
    if (
      endpoint.endsWith(suffix) &&
      isAnatomy(endpoint.slice(0, -suffix.length))
    ) {
      return true;
    }
  }
  return false;
}

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

  // Phase 2.5: Detect space-between (-to-) gap endpoints.
  //
  // Mirrors sdk/core/src/naming.rs's space-between branch and validates each
  // endpoint the same way SPEC-047 does (spec047.rs `endpoint_resolves`): a
  // position, a generic anatomy term, a component-declared anatomy part, or one
  // of those glued to a registered position via a hyphen-bounded prefix/suffix.
  // Endpoints are stored as their full compound string — not split further.
  {
    let componentEndIdx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (matchDetails[i] === "component") componentEndIdx = i + 1;
    }

    let connectorIdx = -1;
    for (let i = componentEndIdx; i < segments.length; i++) {
      if (segments[i] === "to" && !matched[i]) {
        connectorIdx = i;
        break;
      }
    }

    if (connectorIdx > componentEndIdx) {
      const beforeConnector = segments.slice(componentEndIdx, connectorIdx);

      const positionVocab = registry.byField.position;
      const anatomyVocab = registry.byField.anatomy;
      const declaredParts =
        registry.componentAnatomy?.get(nameObject.component) || new Set();

      // Shrink the "from" window from the left: a leading variant/structure/
      // etc. segment may precede the gap connective (see naming.rs's
      // `{variant?}-{component?}-{structure?}-...-{property}` shape), so try
      // the longest unmatched *suffix* of beforeConnector first.
      let fromStart = -1;
      let fromCandidate = null;
      for (let k = beforeConnector.length; k >= 1; k--) {
        const startOffset = beforeConnector.length - k;
        const absoluteStart = componentEndIdx + startOffset;
        const clean = beforeConnector
          .slice(startOffset)
          .every((_, j) => !matched[absoluteStart + j]);
        if (!clean) continue;
        const candidate = beforeConnector.slice(startOffset).join("-");
        if (
          endpointResolves(
            candidate,
            positionVocab,
            anatomyVocab,
            declaredParts,
          )
        ) {
          fromStart = absoluteStart;
          fromCandidate = candidate;
          break;
        }
      }

      if (fromCandidate) {
        const rest = segments.slice(connectorIdx + 1);
        let toSegs = null;
        for (let k = rest.length; k >= 1; k--) {
          if (matched[connectorIdx + 1 + k - 1]) continue;
          const candidate = rest.slice(0, k).join("-");
          if (
            endpointResolves(
              candidate,
              positionVocab,
              anatomyVocab,
              declaredParts,
            )
          ) {
            toSegs = rest.slice(0, k);
            break;
          }
        }

        if (toSegs) {
          nameObject.property = "space-between";
          nameObject.from = fromCandidate;
          nameObject.to = toSegs.join("-");
          for (let i = fromStart; i < connectorIdx; i++) {
            matched[i] = true;
            matchDetails[i] = "from";
          }
          matched[connectorIdx] = true;
          matchDetails[connectorIdx] = "spacing-between-connector";
          for (let i = 0; i < toSegs.length; i++) {
            matched[connectorIdx + 1 + i] = true;
            matchDetails[connectorIdx + 1 + i] = "to";
          }
        }
      }
    }
  }

  // Phase 2.6: Compound emphasis — hyphen-join a run of adjacent unmatched
  // segments that each independently match an `emphasis` registry term (e.g.
  // "heavy"+"strong" -> "heavy-strong"), mirroring the compound-state pattern
  // (Proposal 001 / 005). Without this, only the first term in the run would
  // be captured and any adjacent ones lost as unmatched segments. Only the
  // leftmost run is combined — real typography tokens carry at most one.
  {
    const emphasisTerms = [...registry.terms]
      .filter((t) => t.field === "emphasis")
      .sort((a, b) => b.segments.length - a.segments.length);

    const matchEmphasisAt = (idx) => {
      for (const term of emphasisTerms) {
        if (matched[idx] || term.segments.length > segments.length - idx)
          continue;
        let ok = true;
        for (let j = 0; j < term.segments.length; j++) {
          if (matched[idx + j] || segments[idx + j] !== term.segments[j]) {
            ok = false;
            break;
          }
        }
        if (ok) return term;
      }
      return null;
    };

    for (let i = 0; i < segments.length && !nameObject.emphasis; i++) {
      const first = matchEmphasisAt(i);
      if (!first) continue;
      const ids = [first.id];
      let cursor = i + first.segments.length;
      for (
        let next = matchEmphasisAt(cursor);
        next;
        next = matchEmphasisAt(cursor)
      ) {
        ids.push(next.id);
        cursor += next.segments.length;
      }
      nameObject.emphasis = ids.join("-");
      for (let k = i; k < cursor; k++) {
        matched[k] = true;
        matchDetails[k] = "emphasis";
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

  // Sort by: longer matches first, then by field priority.
  // Fields not in fieldPriority (e.g. colorFamily, colorRole, weight) get Infinity
  // so they sort AFTER all listed fields, not before them (indexOf returns -1 otherwise).
  const priority = (f) => {
    const i = fieldPriority.indexOf(f);
    return i === -1 ? Infinity : i;
  };
  positionMatches.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return priority(a.field) - priority(b.field);
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

  // Phase 4.5: Color-domain promotion
  // colorFamily/colorRole have Infinity priority so they don't steal segments
  // from object, size, etc. in non-color tokens. But when context confirms a
  // color domain, matched variant/object fields are promoted to the color taxonomy.
  //
  //   Palette ramp (scaleIndex + no component):
  //     variant:"blue" → colorFamily:"blue"
  //   Component color (property:"color" + component):
  //     variant:<hue>  → colorFamily:<hue>, then object:<role> → colorRole:<role>
  //     variant:<role> → colorRole:<role>  (no-hue tokens, e.g. color-primary)
  {
    const hueSet = registry.byField["colorFamily"] || new Set();
    const roleSet = registry.byField["colorRole"] || new Set();

    // Palette ramp: scaleIndex assigned, no component
    if (
      nameObject.scaleIndex !== undefined &&
      nameObject.component === undefined
    ) {
      if (nameObject.variant !== undefined && hueSet.has(nameObject.variant)) {
        nameObject.colorFamily = nameObject.variant;
        delete nameObject.variant;
      }
    }

    // Component color: property === "color" + component present
    if (nameObject.property === "color" && nameObject.component !== undefined) {
      if (nameObject.variant !== undefined && hueSet.has(nameObject.variant)) {
        // Hue in variant → promote to colorFamily; also promote object → colorRole alongside it
        nameObject.colorFamily = nameObject.variant;
        delete nameObject.variant;
        if (nameObject.object !== undefined && roleSet.has(nameObject.object)) {
          nameObject.colorRole = nameObject.object;
          delete nameObject.object;
        }
      } else if (
        nameObject.variant !== undefined &&
        roleSet.has(nameObject.variant) &&
        !hueSet.has(nameObject.variant)
      ) {
        // Role in variant (no hue) → promote to colorRole (e.g. icon-color-primary-default)
        nameObject.colorRole = nameObject.variant;
        delete nameObject.variant;
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
 * Color-domain tokens use explicit ordering that mirrors the Rust naming.rs
 * color-domain branch, bypassing the position-ordered general walk (which
 * would mis-order state@12 before colorFamily@17):
 *   palette ramp (no component): {variant?}-{colorFamily}-{scaleIndex?}
 *   component color (component + colorFamily/colorRole):
 *     {component}-{property}-{colorFamily?}-{colorRole?}-{state?}
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
  const { colorFamily, colorRole, component } = nameObject;

  // Palette ramp: colorFamily present, no component → {variant?}-{colorFamily}-{scaleIndex?}
  if (colorFamily && !component) {
    const parts = [];
    if (nameObject.variant)
      parts.push(tokenNameMap[nameObject.variant] || nameObject.variant);
    parts.push(tokenNameMap[colorFamily] || colorFamily);
    if (nameObject.scaleIndex != null)
      parts.push(String(nameObject.scaleIndex));
    return parts.join("-");
  }

  // Component color: component + (colorFamily and/or colorRole) AND property === "color".
  // The property guard prevents this branch from firing when colorRole terms (e.g. "background",
  // "primary") match a non-color token via the decomposer, which would drop other fields.
  // → {component}-{property}-{colorFamily?}-{colorRole?}-{state?}
  if (
    component &&
    (colorFamily || colorRole) &&
    nameObject.property === "color"
  ) {
    const parts = [component, nameObject.property];
    if (colorFamily) parts.push(tokenNameMap[colorFamily] || colorFamily);
    if (colorRole) parts.push(tokenNameMap[colorRole] || colorRole);
    if (nameObject.state)
      parts.push(tokenNameMap[nameObject.state] || nameObject.state);
    return parts.join("-");
  }

  // Thin-format detection: `property` already begins `{component}-`, meaning
  // the full legacy key is stored verbatim in `property` and `component` is
  // duplicated metadata annotation only. Emitting component then property here
  // would double the prefix (e.g. "heading-heading-cjk-font-style"). Mirrors
  // sdk/core/src/naming.rs's `is_thin` branch — keep in sync.
  if (
    component &&
    nameObject.property &&
    nameObject.property.startsWith(`${component}-`)
  ) {
    return nameObject.property;
  }

  // Space-between (gap) domain: property literal term "space-between", real
  // endpoints live in paired `from`/`to` fields (both excludeFromLegacyKey, so
  // they're skipped below rather than serialized literally). Reconstruct the
  // legacy connective form `{from}-to-{to}` in property's slot. Mirrors
  // sdk/core/src/naming.rs's `property == "space-between"` branch — keep in sync.
  if (
    nameObject.property === "space-between" &&
    nameObject.from &&
    nameObject.to
  ) {
    const parts = [];
    for (const field of serializationOrder) {
      if (field === "from" || field === "to") continue;
      if (field === "property") {
        const fromExpanded = tokenNameMap[nameObject.from] || nameObject.from;
        const toExpanded = tokenNameMap[nameObject.to] || nameObject.to;
        parts.push(`${fromExpanded}-to-${toExpanded}`);
        continue;
      }
      if (nameObject[field]) {
        parts.push(tokenNameMap[nameObject[field]] || nameObject[field]);
      }
    }
    if (nameObject.scaleIndex) parts.push(nameObject.scaleIndex);
    return parts.join("-");
  }

  // General path (non-color tokens)
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
