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
 * @deprecated This package is deprecated. The registry data and API have moved to
 * @adobe/spectrum-design-data. Update your imports:
 *
 *   import { sizes, getValues } from "@adobe/spectrum-design-data";
 *   import sizesJson from "@adobe/spectrum-design-data/registry/sizes.json" with { type: "json" };
 *
 * This shim will be removed in a future major version.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, resolve as resolveUrl } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registryPkg = require.resolve("@adobe/spectrum-design-data/package.json");
const registryDir = join(dirname(registryPkg), "registry");

function load(name) {
  return JSON.parse(readFileSync(join(registryDir, name), "utf-8"));
}

export const sizes = load("sizes.json");
export const states = load("states.json");
export const variants = load("variants.json");
export const anatomyTerms = load("anatomy-terms.json");
export const propertyTerms = load("property-terms.json");
export const components = load("components.json");
export const scaleValues = load("scale-values.json");
export const categories = load("categories.json");
export const platforms = load("platforms.json");
export const navigationTerms = load("navigation-terms.json");
export const tokenTerminology = load("token-terminology.json");
export const glossary = load("glossary.json");
export const tokenObjects = load("token-objects.json");
export const structures = load("structures.json");
export const substructures = load("substructures.json");
export const orientations = load("orientations.json");
export const positions = load("positions.json");
export const densities = load("densities.json");
export const shapes = load("shapes.json");

export function getValues(registry) {
  return registry.values.map((v) => v.id);
}

export function findValue(registry, searchTerm) {
  return registry.values.find(
    (v) => v.id === searchTerm || v.aliases?.includes(searchTerm),
  );
}

export function hasValue(registry, searchTerm) {
  return findValue(registry, searchTerm) !== undefined;
}

export function getDefault(registry) {
  return registry.values.find((v) => v.default === true);
}

export function getActiveValues(registry) {
  return registry.values.filter((v) => !v.deprecated);
}

export function loadPlatformExtension(extensionPath) {
  return JSON.parse(readFileSync(extensionPath, "utf-8"));
}

export function getTermForPlatform(registry, termId, platform, extension) {
  const baseTerm = findValue(registry, termId);
  if (!baseTerm) return undefined;

  if (baseTerm.platforms && baseTerm.platforms[platform]) {
    return { ...baseTerm, platform: baseTerm.platforms[platform] };
  }

  if (extension && extension.platform === platform) {
    const ext = extension.extensions.find((e) => e.termId === termId);
    if (ext) {
      return {
        ...baseTerm,
        platform: {
          term: ext.platformTerm || baseTerm.label,
          aliases: ext.platformAliases,
          notes: ext.notes,
          reference: ext.reference,
          codeExample: ext.codeExample,
          differences: ext.differences,
        },
      };
    }
  }

  return baseTerm;
}

export function getPlatformExtensions(extensions, platform) {
  return extensions.filter((ext) => ext.platform === platform);
}

export function loadAllPlatformExtensions(extensionsDir) {
  const extensionFiles = readdirSync(extensionsDir).filter((f) =>
    f.endsWith(".json"),
  );
  return extensionFiles.map((file) =>
    loadPlatformExtension(join(extensionsDir, file)),
  );
}
