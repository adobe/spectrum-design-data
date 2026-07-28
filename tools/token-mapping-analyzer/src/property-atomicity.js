// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { COMPOUND_PROPERTIES } from "./decomposer.js";

// Fields whose presence in name.property means the property is fusing a
// concept that belongs in a dedicated structured field instead (spectrum-design-data-284).
// Deliberately excludes "property" itself and non-taxonomy fields (component,
// variant, icon, ...) -- this detector only asks "does this property string
// smuggle one of these seven concepts?"
const STRUCTURAL_FIELDS = [
  "anatomy",
  "object", // "surface" in the epic's language
  "position",
  "size",
  "state",
  "colorRole",
  "emphasis",
];

/**
 * Scan `property`'s hyphen-segments for every contiguous run that matches a
 * registered id in one of STRUCTURAL_FIELDS. Mirrors
 * sdk/core/src/validate/rules/spec050.rs::structural_hits exactly -- both
 * check every contiguous substring against each field's id set, not just the
 * longest match anchored at each start position (unlike matchLongestTerm,
 * which is tuned for left-to-right decomposition, not fusion detection).
 *
 * @param {string} property
 * @param {ReturnType<import("./registry-index.js").loadRegistries>} registry
 * @returns {Record<string, string[]>}
 */
function structuralHits(property, registry) {
  const segments = property.split("-");
  const fields = {};

  for (const field of STRUCTURAL_FIELDS) {
    const ids = registry.byField[field];
    if (!ids) continue;
    for (let start = 0; start < segments.length; start++) {
      for (let end = start + 1; end <= segments.length; end++) {
        const candidate = segments.slice(start, end).join("-");
        if (ids.has(candidate)) {
          (fields[field] ??= new Set()).add(candidate);
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(fields).map(([field, ids]) => [field, [...ids].sort()]),
  );
}

/**
 * Classify a single token's `name.property` string for decomposition
 * completeness, independent of roundtrip or naming-exceptions allowlist
 * status (that's the point of spectrum-design-data-284.1 -- SPEC-007's
 * roundtrip-keyed MEDIUM bucket misses fused properties that happen to
 * serialize back cleanly, e.g. "icon-color-informative", "background-color").
 *
 * Note this deliberately does NOT ask "is the whole property string a
 * registered property-terms id" -- legacy aliases like "background-color"
 * and "icon-color" ARE registered there, but their *segments* also
 * independently collide with the object/anatomy registries, which is
 * exactly the fusion this bead exists to surface.
 *
 * @param {string} property - the authored `name.property` value
 * @param {ReturnType<import("./registry-index.js").loadRegistries>} registry
 * @returns {{ property: string, atomic: boolean, fused: boolean, fields: Record<string, string[]>, bucket: string|null }}
 */
export function analyzeProperty(property, registry) {
  if (COMPOUND_PROPERTIES.includes(property)) {
    return { property, atomic: true, fused: false, fields: {}, bucket: null };
  }

  const fieldsOut = structuralHits(property, registry);
  const fused = Object.keys(fieldsOut).length > 0;

  if (fused) {
    return {
      property,
      atomic: false,
      fused: true,
      fields: fieldsOut,
      bucket: classifyBucket(fieldsOut),
    };
  }

  const atomic = !!registry.byField.property?.has(property);
  return {
    property,
    atomic,
    fused: false,
    fields: {},
    bucket: atomic ? null : "unclassified",
  };
}

/**
 * Map a fused-property's matched structural fields to the sibling bead that
 * owns that decomposition work.
 *
 * @param {Record<string, string[]>} fields
 * @returns {"compound-state" | "surface-colorRole" | "position-size-state" | "other"}
 */
export function classifyBucket(fields) {
  const stateCount = fields.state?.length ?? 0;
  if (stateCount >= 2 || (stateCount >= 1 && fields.emphasis)) {
    return "compound-state"; // spectrum-design-data-284.5
  }
  // position/size checked before object/colorRole: a layout token like
  // "edge-to-content-default-large" matches object ("edge") *and* size
  // ("large"), but it lives in layout*.tokens.json and belongs to 284.2, not
  // the color/typography scope of 284.3.
  if (fields.position || fields.size) {
    return "position-size-state"; // spectrum-design-data-284.2
  }
  if (fields.object || fields.colorRole) {
    return "surface-colorRole"; // spectrum-design-data-284.3
  }
  if (fields.state) {
    return "position-size-state"; // spectrum-design-data-284.2
  }
  return "other";
}
