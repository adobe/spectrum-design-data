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
import { glob } from "glob";
import { isAbsolute, resolve } from "path";
import { readFile } from "fs/promises";
import * as url from "url";

export const getSlugFromDocumentationUrl = (documentationUrl) =>
  documentationUrl
    .split("/")
    .filter((part) => part !== "")
    .pop();

export const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/**
 * Resolves $ref references in allOf properties by merging referenced schemas
 * @param {Object} schema - The schema object to resolve references in
 * @return {Object} - Schema with resolved references
 */
export const resolveRefs = (schema) => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Create a deep copy to avoid mutating the original
  const resolved = JSON.parse(JSON.stringify(schema));

  // Helper function to resolve refs in allOf arrays
  const resolveAllOfRefs = (obj) => {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    // Handle allOf arrays specifically
    if (Array.isArray(obj.allOf)) {
      const resolvedAllOf = obj.allOf.map((item) => {
        if (item.$ref && item.$ref.startsWith("#/definitions/")) {
          const refPath = item.$ref.replace("#/definitions/", "");
          const referencedSchema = resolved.definitions?.[refPath];
          if (referencedSchema) {
            // Return the referenced schema properties merged with any additional properties
            const { $ref, ...additionalProps } = item;
            return {
              ...JSON.parse(JSON.stringify(referencedSchema)),
              ...additionalProps,
            };
          }
        }
        return resolveAllOfRefs(item);
      });

      // Merge all resolved schemas in allOf
      const mergedSchema = {};
      resolvedAllOf.forEach((resolvedItem) => {
        if (resolvedItem && typeof resolvedItem === "object") {
          // Deep merge properties
          if (resolvedItem.properties) {
            mergedSchema.properties = {
              ...mergedSchema.properties,
              ...resolvedItem.properties,
            };
          }
          if (resolvedItem.required) {
            mergedSchema.required = [
              ...(mergedSchema.required || []),
              ...(Array.isArray(resolvedItem.required)
                ? resolvedItem.required
                : [resolvedItem.required]),
            ];
          }
          // Merge other properties
          Object.keys(resolvedItem).forEach((key) => {
            if (key !== "properties" && key !== "required") {
              mergedSchema[key] = resolvedItem[key];
            }
          });
        }
      });

      // Replace allOf with the merged properties
      const { allOf, ...otherProps } = obj;
      return { ...mergedSchema, ...otherProps };
    }

    // Recursively process nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        obj[key] = resolveAllOfRefs(value);
      }
    }

    return obj;
  };

  return resolveAllOfRefs(resolved);
};

export const schemaFileNames = await glob(
  `${resolve(__dirname, "./schemas")}/**/*.json`,
);

/**
 * Accepts either a schema name or an absolute path
 *
 * @param schemaFileName
 * @return {Promise<any>}
 */
export const getSchemaFile = async (schemaFileName) => {
  let filePath = resolve(__dirname, "schemas", schemaFileName);
  if (isAbsolute(schemaFileName)) {
    filePath = schemaFileName;
  }
  return await readJson(resolve(filePath));
};

export const getAllSlugs = async () => {
  return await Promise.all(schemaFileNames.map(getSchemaFile))
    .then((schemaFileDataAr) => {
      return schemaFileDataAr.reduce(
        (slugs, schemaFileData) => [
          ...slugs,
          ...(Object.hasOwn(schemaFileData, "meta") &&
          Object.hasOwn(schemaFileData.meta, "documentationUrl")
            ? [
                getSlugFromDocumentationUrl(
                  schemaFileData.meta.documentationUrl,
                ),
              ]
            : []),
        ],
        [],
      );
    })
    .then((slugs) => slugs.sort());
};

export const getAllSchemas = async () => {
  return await Promise.all(
    schemaFileNames.map(async (schemaFileName) => {
      const data = await getSchemaFile(schemaFileName);
      if (
        Object.hasOwn(data, "meta") &&
        Object.hasOwn(data.meta, "documentationUrl")
      ) {
        return {
          ...resolveRefs(data),
          ...{ slug: getSlugFromDocumentationUrl(data.meta.documentationUrl) },
        };
      } else return resolveRefs(data);
    }),
  );
};

export const getSchemaBySlug = async (slug) => {
  const schema = await getAllSchemas().then((schemas) =>
    schemas.find((schema) => {
      return Object.hasOwn(schema, "slug") && schema.slug === slug;
    }),
  );
  if (schema === undefined) {
    throw new Error(`Schema not found for slug: ${slug}`);
  }
  delete schema.slug;
  return resolveRefs(schema);
};
