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

/**
 * Structured token identity. Semantic fields describe identity and structure;
 * dimension fields drive cascade resolution.
 * See: packages/design-data-spec/spec/taxonomy.md
 */
export interface NameObject {
  // Semantic fields (advisory validation)
  property: string; // REQUIRED
  component?: string;
  structure?: string;
  substructure?: string;
  anatomy?: string;
  object?: string;
  variant?: string;
  state?: string;
  orientation?: string;
  position?: string;
  size?: string;
  density?: string;
  shape?: string;
  // Dimension fields (strict validation)
  colorScheme?: string;
  scale?: string;
  contrast?: string;
}

/** Semantic fields in default serialization order (from taxonomy.md). */
export const SERIALIZATION_ORDER = [
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
] as const;

/** All semantic field keys. */
export const SEMANTIC_FIELDS = [
  "property",
  "component",
  "structure",
  "substructure",
  "anatomy",
  "object",
  "variant",
  "state",
  "orientation",
  "position",
  "size",
  "density",
  "shape",
] as const;

/** Dimension field keys. */
export const DIMENSION_FIELDS = ["colorScheme", "scale", "contrast"] as const;

export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type DimensionField = (typeof DIMENSION_FIELDS)[number];
export type NameField = SemanticField | DimensionField;

/**
 * Build a clean name object, omitting undefined/empty fields.
 * Only includes `property` (required) plus any non-empty optional fields.
 */
export function buildNameObject(
  fields: Partial<NameObject> & { property: string },
): NameObject {
  const result: NameObject = { property: fields.property };
  for (const key of [...SEMANTIC_FIELDS, ...DIMENSION_FIELDS]) {
    if (key === "property") continue;
    const value = fields[key as keyof NameObject];
    if (value && value.trim().length > 0) {
      (result as Record<string, string>)[key] = value.trim();
    }
  }
  return result;
}
