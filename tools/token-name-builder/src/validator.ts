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

import type { NameObject } from "./name-object.js";
import { SEMANTIC_FIELDS, DIMENSION_FIELDS } from "./name-object.js";
import { registries, dimensionModes, hasValue } from "./registry-data.js";

export type Severity = "error" | "warning" | "info";

export interface ValidationMessage {
  field: string;
  severity: Severity;
  message: string;
}

/**
 * Validate a name object against registries and dimension declarations.
 *
 * - Semantic fields: advisory (warning) if value not in registry
 * - Dimension fields: strict (error) if value not in declared modes
 * - Structural: error if `property` is empty, warning if `substructure` without `structure`
 */
export function validate(name: NameObject): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // property is required
  if (!name.property || name.property.trim().length === 0) {
    messages.push({
      field: "property",
      severity: "error",
      message: "Property is required.",
    });
  }

  // substructure without structure
  if (name.substructure && !name.structure) {
    messages.push({
      field: "substructure",
      severity: "warning",
      message: "Substructure is set without a parent structure.",
    });
  }

  // Validate semantic fields against registries (advisory)
  for (const field of SEMANTIC_FIELDS) {
    if (field === "property") continue; // no registry for property
    const value = name[field as keyof NameObject];
    if (!value) continue;

    const registry = registries[field];
    if (!registry) continue;

    if (!hasValue(registry, value)) {
      messages.push({
        field,
        severity: "warning",
        message: `"${value}" is not in the ${registry.type} registry. This is allowed but may indicate a typo.`,
      });
    }

    // Check for deprecated values
    const entry = registry.values.find(
      (v) => v.id === value || v.aliases?.includes(value),
    );
    if (entry?.deprecated) {
      messages.push({
        field,
        severity: "warning",
        message: `"${value}" is deprecated in the ${registry.type} registry.`,
      });
    }
  }

  // Validate dimension fields against declared modes (strict)
  for (const field of DIMENSION_FIELDS) {
    const value = name[field as keyof NameObject];
    if (!value) continue;

    const dim = dimensionModes[field];
    if (!dim) continue;

    if (!dim.modes.includes(value)) {
      messages.push({
        field,
        severity: "error",
        message: `Invalid mode "${value}" for ${field}. Allowed: ${dim.modes.join(", ")}.`,
      });
    }
  }

  return messages;
}

/** Check if validation passed with no errors (warnings are OK). */
export function isValid(messages: ValidationMessage[]): boolean {
  return !messages.some((m) => m.severity === "error");
}
