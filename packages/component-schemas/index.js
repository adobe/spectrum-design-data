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
          ...data,
          ...{ slug: getSlugFromDocumentationUrl(data.meta.documentationUrl) },
        };
      } else return data;
    }),
  );
};

export const getSchemaBySlug = async (slug) => {
  const schema = await getAllSchemas().then((schemas) =>
    schemas.find((schema) => {
      return Object.hasOwn(schema, "slug") && schema.slug === slug;
    }),
  );
  delete schema.slug;
  return schema;
};
