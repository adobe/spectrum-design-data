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

import type { SemanticField } from "./name-object.js";

// Registry JSON imports (resolved via Vite aliases to ../../packages/design-system-registry/registry/)
import componentsJson from "@registry/components.json";
import structuresJson from "@registry/structures.json";
import substructuresJson from "@registry/substructures.json";
import anatomyTermsJson from "@registry/anatomy-terms.json";
import tokenObjectsJson from "@registry/token-objects.json";
import variantsJson from "@registry/variants.json";
import statesJson from "@registry/states.json";
import orientationsJson from "@registry/orientations.json";
import positionsJson from "@registry/positions.json";
import sizesJson from "@registry/sizes.json";
import densitiesJson from "@registry/densities.json";
import shapesJson from "@registry/shapes.json";
import componentAnatomyJson from "@registry/component-anatomy.json";

/** A single value entry from a registry file. */
export interface RegistryValue {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  deprecated?: boolean;
  default?: boolean;
}

/** A registry file's top-level shape. */
export interface Registry {
  type: string;
  description: string;
  values: RegistryValue[];
}

/** All loaded registries keyed by their semantic field name. */
export const registries: Partial<Record<SemanticField, Registry>> = {
  component: componentsJson as Registry,
  structure: structuresJson as Registry,
  substructure: substructuresJson as Registry,
  anatomy: anatomyTermsJson as Registry,
  object: tokenObjectsJson as Registry,
  variant: variantsJson as Registry,
  state: statesJson as Registry,
  orientation: orientationsJson as Registry,
  position: positionsJson as Registry,
  size: sizesJson as Registry,
  density: densitiesJson as Registry,
  shape: shapesJson as Registry,
  // `property` has no registry — free-form input
};

/** Dimension modes (hardcoded for now; could be loaded from dimension declarations). */
export const dimensionModes: Record<
  string,
  { modes: string[]; defaultMode: string }
> = {
  colorScheme: { modes: ["light", "dark", "wireframe"], defaultMode: "light" },
  scale: { modes: ["desktop", "mobile"], defaultMode: "desktop" },
  contrast: { modes: ["regular", "high"], defaultMode: "regular" },
};

/** Common property values extracted from existing tokens for combobox suggestions. */
export const commonProperties = [
  "color",
  "background-color",
  "border-color",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "padding",
  "padding-top",
  "padding-bottom",
  "margin",
  "gap",
  "opacity",
  "border-width",
  "border-radius",
  "corner-radius",
  "font-size",
  "font-weight",
  "line-height",
  "icon-size",
  "animation-duration",
];

/** Get all non-deprecated value IDs from a registry. */
export function getActiveIds(registry: Registry): string[] {
  return registry.values.filter((v) => !v.deprecated).map((v) => v.id);
}

/** Find a value in a registry by ID or alias. */
export function findValue(
  registry: Registry,
  searchTerm: string,
): RegistryValue | undefined {
  return registry.values.find(
    (v) => v.id === searchTerm || v.aliases?.includes(searchTerm),
  );
}

/** Check if a value exists in a registry. */
export function hasValue(registry: Registry, searchTerm: string): boolean {
  return findValue(registry, searchTerm) !== undefined;
}

/** A single anatomy part for a component. */
export interface AnatomyPart {
  id: string;
  label: string;
  optional: boolean;
}

/** A component's anatomy entry. */
export interface ComponentAnatomyEntry {
  label: string;
  source: string;
  parts: AnatomyPart[];
}

/** The component-anatomy registry shape. */
export interface ComponentAnatomyRegistry {
  type: string;
  description: string;
  components: Record<string, ComponentAnatomyEntry>;
}

/** Component → anatomy parts mapping, extracted from S2 docs. */
export const componentAnatomy =
  componentAnatomyJson as unknown as ComponentAnatomyRegistry;
