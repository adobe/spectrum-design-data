/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get schema data from the component-schemas package
 * @returns {Promise<Object>} Schema data organized by type
 */
export async function getSchemaData() {
  try {
    // Try to import from the workspace package first
    const componentSchemas = await import(
      "@adobe/spectrum-component-api-schemas"
    );

    // If the package exports schema data directly, use it
    if (componentSchemas.default || componentSchemas.schemas) {
      return componentSchemas.default || componentSchemas.schemas;
    }

    // Otherwise, read the schema files directly from the package
    return await loadSchemaFilesDirectly();
  } catch (error) {
    console.error(
      "Failed to load schema data from package, trying direct file access:",
      error,
    );
    return await loadSchemaFilesDirectly();
  }
}

/**
 * Load schema files directly from the repository structure
 * @returns {Promise<Object>} Schema data
 */
async function loadSchemaFilesDirectly() {
  const schemaData = {
    components: {},
    types: {},
  };

  // Path to the schemas directory
  const schemasPath = join(
    __dirname,
    "../../../../packages/component-schemas/schemas",
  );

  // Load component schemas
  const componentsPath = join(schemasPath, "components");
  try {
    const componentFiles = readdirSync(componentsPath).filter((file) =>
      file.endsWith(".json"),
    );

    for (const fileName of componentFiles) {
      try {
        const filePath = join(componentsPath, fileName);
        const fileContent = readFileSync(filePath, "utf8");
        schemaData.components[fileName] = JSON.parse(fileContent);
      } catch (error) {
        console.error(`Failed to load component schema ${fileName}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to read components directory:", error);
  }

  // Load type schemas
  const typesPath = join(schemasPath, "types");
  try {
    const typeFiles = readdirSync(typesPath).filter((file) =>
      file.endsWith(".json"),
    );

    for (const fileName of typeFiles) {
      try {
        const filePath = join(typesPath, fileName);
        const fileContent = readFileSync(filePath, "utf8");
        schemaData.types[fileName] = JSON.parse(fileContent);
      } catch (error) {
        console.error(`Failed to load type schema ${fileName}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to read types directory:", error);
  }

  return schemaData;
}

/**
 * Get available component names
 * @returns {Promise<Array<string>>} List of component names
 */
export async function getComponentNames() {
  const schemaData = await getSchemaData();
  return Object.keys(schemaData.components).map((fileName) =>
    fileName.replace(".json", ""),
  );
}

/**
 * Get schema for a specific component
 * @param {string} componentName - Component name
 * @returns {Promise<Object|null>} Component schema
 */
export async function getComponentSchema(componentName) {
  const schemaData = await getSchemaData();
  const fileName = componentName.endsWith(".json")
    ? componentName
    : `${componentName}.json`;
  return schemaData.components[fileName] || null;
}

/**
 * Get available type names
 * @returns {Promise<Array<string>>} List of type names
 */
export async function getTypeNames() {
  const schemaData = await getSchemaData();
  return Object.keys(schemaData.types).map((fileName) =>
    fileName.replace(".json", ""),
  );
}

/**
 * Get schema for a specific type
 * @param {string} typeName - Type name
 * @returns {Promise<Object|null>} Type schema
 */
export async function getTypeSchema(typeName) {
  const schemaData = await getSchemaData();
  const fileName = typeName.endsWith(".json") ? typeName : `${typeName}.json`;
  return schemaData.types[fileName] || null;
}
