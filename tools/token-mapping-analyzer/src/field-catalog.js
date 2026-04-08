// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

const DEFAULT_FIELDS_DIR = resolve(
  REPO_ROOT,
  "packages/design-data-spec/fields",
);

/**
 * Load all field declarations from a fields directory.
 *
 * Returns:
 * - registryFiles: { fieldName: absoluteFilePath } for fields with a registry
 * - serializationOrder: string[] of field names sorted by serialization.position
 *   (semantic fields only, in ascending position order)
 * - allFields: Map<fieldName, declaration> for the full catalog
 */
export function loadFieldCatalog(fieldsDir = DEFAULT_FIELDS_DIR) {
  const declarations = [];

  for (const filename of readdirSync(fieldsDir)) {
    if (!filename.endsWith(".json")) continue;
    const filePath = resolve(fieldsDir, filename);
    const decl = JSON.parse(readFileSync(filePath, "utf-8"));
    declarations.push(decl);
  }

  // Build registry file map for fields that have a registry path
  const registryFiles = {};
  for (const decl of declarations) {
    if (decl.registry) {
      registryFiles[decl.name] = resolve(REPO_ROOT, decl.registry);
    }
  }

  // Build serialization order: semantic fields sorted by position
  const serializationOrder = declarations
    .filter((d) => d.kind === "semantic")
    .sort((a, b) => a.serialization.position - b.serialization.position)
    .map((d) => d.name);

  // Full catalog map
  const allFields = new Map(declarations.map((d) => [d.name, d]));

  return { registryFiles, serializationOrder, allFields };
}
