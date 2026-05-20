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

import { componentAnatomy } from "./registry-data.js";

/** Options derived from a component's anatomy registry and JSON schema. */
export interface ComponentOptions {
  /** Anatomy parts for this component (from S2 docs via component-anatomy.json). */
  anatomy: string[];
  /** Allowed variant values (from component schema). */
  variants: string[];
  /** Allowed state values (from component schema). */
  states: string[];
  /** Allowed size values (from component schema). */
  sizes: string[];
}

// Lazily loaded component schema modules for variant/state/size extraction.
const schemaModules = import.meta.glob(
  "../../../packages/component-schemas/schemas/components/*.json",
);

interface ComponentSchemaProps {
  variant?: { enum?: string[] };
  state?: { enum?: string[] };
  size?: { enum?: string[] };
  [key: string]: unknown;
}

interface ComponentSchemaModule {
  default: {
    properties?: ComponentSchemaProps;
  };
}

/**
 * Get component options by combining:
 * - Anatomy from the component-anatomy registry (extracted from S2 docs)
 * - Variant/state/size from the component JSON schema
 *
 * Returns null only if neither data source has data for this component.
 */
export async function loadComponentOptions(
  componentId: string,
): Promise<ComponentOptions | null> {
  if (!componentId) return null;

  // Anatomy from the component-anatomy registry (synchronous lookup)
  const anatomyEntry = componentAnatomy.components[componentId];
  const anatomy = anatomyEntry ? anatomyEntry.parts.map((p) => p.id) : [];

  // Variant/state/size from component schema (async, lazy loaded)
  let variants: string[] = [];
  let states: string[] = [];
  let sizes: string[] = [];

  const key = Object.keys(schemaModules).find((k) =>
    k.endsWith(`/${componentId}.json`),
  );
  if (key) {
    const mod = (await schemaModules[key]()) as ComponentSchemaModule;
    const props = mod.default?.properties ?? {};
    variants = props.variant?.enum ?? [];
    states = props.state?.enum ?? [];
    sizes = props.size?.enum ?? [];
  }

  // Return null only if we have no data at all
  if (
    anatomy.length === 0 &&
    variants.length === 0 &&
    states.length === 0 &&
    sizes.length === 0
  ) {
    return null;
  }

  return { anatomy, variants, states, sizes };
}
