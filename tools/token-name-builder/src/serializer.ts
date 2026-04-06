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

import { type NameObject, SERIALIZATION_ORDER } from "./name-object.js";

export type FormatStyle = "kebab" | "camel" | "cssVar" | "constant";

/**
 * Collect the non-empty values from a name object in serialization order.
 * Dimension fields are excluded — serialization is semantic fields only.
 */
function orderedParts(name: NameObject): string[] {
  const parts: string[] = [];
  for (const field of SERIALIZATION_ORDER) {
    const value = name[field as keyof NameObject];
    if (value && value.trim().length > 0) {
      parts.push(value.trim());
    }
  }
  return parts;
}

/** Split a kebab-case part into individual words. */
function words(parts: string[]): string[] {
  return parts.flatMap((p) => p.split("-"));
}

/** Capitalize first letter. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Serialize a name object into a flat string using the given format.
 *
 * Formats:
 * - kebab:    accent-button-icon-background-color-hover
 * - camel:    accentButtonIconBackgroundColorHover
 * - cssVar:   --spectrum-accent-button-icon-background-color-hover
 * - constant: ACCENT_BUTTON_ICON_BACKGROUND_COLOR_HOVER
 */
export function serialize(
  name: NameObject,
  format: FormatStyle = "kebab",
): string {
  const parts = orderedParts(name);
  if (parts.length === 0) return "";

  switch (format) {
    case "kebab":
      return parts.join("-");

    case "camel": {
      const w = words(parts);
      return w[0] + w.slice(1).map(capitalize).join("");
    }

    case "cssVar":
      return `--spectrum-${parts.join("-")}`;

    case "constant":
      return words(parts).join("_").toUpperCase();
  }
}

/** All supported format styles for iteration. */
export const FORMAT_STYLES: FormatStyle[] = [
  "kebab",
  "camel",
  "cssVar",
  "constant",
];

/** Human-readable label for each format style. */
export const FORMAT_LABELS: Record<FormatStyle, string> = {
  kebab: "kebab-case",
  camel: "camelCase",
  cssVar: "CSS custom property",
  constant: "CONSTANT_CASE",
};
