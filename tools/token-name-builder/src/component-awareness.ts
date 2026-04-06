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

import { registries } from "./registry-data.js";

/** Options derived from a component's JSON schema. */
export interface ComponentOptions {
  /** Schema property keys that match registered anatomy terms. */
  anatomy: string[];
  /** Allowed variant values for this component. */
  variants: string[];
  /** Allowed state values for this component. */
  states: string[];
  /** Allowed size values for this component. */
  sizes: string[];
}

// Set of active anatomy term IDs from the registry, for fast lookup.
const ANATOMY_IDS = new Set(
  (registries.anatomy?.values ?? [])
    .filter((v) => !v.deprecated)
    .map((v) => v.id),
);

// Lazily loaded component schema modules, keyed by relative path.
// import.meta.glob paths must be literal strings relative to this file.
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
 * Dynamically load a component schema and extract token-relevant options.
 * Returns null if the component has no schema file.
 */
export async function loadComponentOptions(
  componentId: string,
): Promise<ComponentOptions | null> {
  if (!componentId) return null;

  // Find the matching module key (ends with `/${componentId}.json`)
  const key = Object.keys(schemaModules).find((k) =>
    k.endsWith(`/${componentId}.json`),
  );
  if (!key) return null;

  const mod = (await schemaModules[key]()) as ComponentSchemaModule;
  const props = mod.default?.properties ?? {};

  return {
    // Anatomy: schema property keys that are registered anatomy terms
    anatomy: Object.keys(props).filter((k) => ANATOMY_IDS.has(k)),
    variants: props.variant?.enum ?? [],
    states: props.state?.enum ?? [],
    sizes: props.size?.enum ?? [],
  };
}
