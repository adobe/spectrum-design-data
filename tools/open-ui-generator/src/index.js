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

import { resolve } from "path";
import { readFile } from "fs/promises";
import * as url from "url";
import { writeFile } from "fs/promises";
import { format } from "prettier";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const componentSchemaFileNames = await glob(
  `${resolve(__dirname, "../../../packages/tokens/schemas/components")}/**/*.json`,
);

const parseSlug = (url) => {
  return url.substring(url.lastIndexOf("/") + 1, url.lastIndexOf(".json"));
};

const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

const writeJson = async (fileName, jsonData) => {
  await writeFile(
    fileName,
    await format(JSON.stringify(jsonData), { parser: "json-stringify" }),
  );
};

const openUINameMap = {
  picker: "Select",
  breadcrumbs: "Breadcrumb",
  "text-field": "InputText",
  "text-area": "InputText",
};

const components = await Promise.all(
  componentSchemaFileNames.map(async (schema) => {
    const jsondata = await readJson(schema);
    const slug = parseSlug(jsondata["$id"]);
    return Object.hasOwn(openUINameMap, slug)
      ? {
          name: jsondata.title,
          openUIName: openUINameMap[slug],
          definition: jsondata.description,
          url: jsondata.meta.documentationUrl,
        }
      : {
          name: jsondata.title,
          definition: jsondata.description,
          url: jsondata.meta.documentationUrl,
        };
  }),
).then((values) => {
  return values.sort((a, b) => {
    const nameA = a.name.toUpperCase(); // ignore upper and lowercase
    const nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    // names must be equal
    return 0;
  });
});

await writeJson(resolve(__dirname, "..", "spectrum.json"), {
  $schema: "../schemas/design-system.schema.json",
  name: "Spectrum",
  description:
    "Spectrum provides components and tools to help product teams work more efficiently, and to make Adobe’s applications more cohesive.",
  url: "http://spectrum.adobe.com",
  by: "Adobe",
  components,
});
