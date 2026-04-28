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

import {
  schemaFileNames,
  getSchemaFile,
  getAllSchemas,
  getSlugFromDocumentationUrl,
  getAllSlugs,
  __dirname,
  getSchemaBySlug,
} from "../index.js";
import test from "ava";
import { glob } from "glob";
import { resolve, parse } from "path";

test("the number of schema returned by getAllSchemas should match the number of schema returned by schemaFileNames", async (t) => {
  const allSchemas = await getAllSchemas();
  t.is(schemaFileNames.length, allSchemas.length);
});
test("getSchemaFile should fetch schema data", async (t) => {
  const relativeSchemaComponent = await getSchemaFile("component.json");
  t.is(relativeSchemaComponent.title, "Component");

  const relativeSchemaActionBar = await getSchemaFile(
    "components/action-bar.json",
  );
  t.is(relativeSchemaActionBar.title, "Action bar");

  const absoluteSchemaComponent = await getSchemaFile(
    resolve(__dirname, "schemas", "component.json"),
  );
  t.is(absoluteSchemaComponent.title, "Component");

  const absoluteSchemaActionBar = await getSchemaFile(
    resolve(__dirname, "schemas", "components", "action-bar.json"),
  );
  t.is(absoluteSchemaActionBar.title, "Action bar");
  // t.snapshot(await getSchemaFile(schemaFileNames[0]));
});
test("getSlugFromDocumentationUrl should return last part of documentationUrl", (t) => {
  t.is(
    getSlugFromDocumentationUrl("https://spectrum.adobe.com/page/tooltip/"),
    "tooltip",
  );
});
test("getSlugFromDocumentationUrl should return last part of documentationUrl even without trailing slash", (t) => {
  t.is(
    getSlugFromDocumentationUrl("https://spectrum.adobe.com/page/tooltip"),
    "tooltip",
  );
});
test("getAllSlugs should return all component slugs", async (t) => {
  const slugs = await glob(
    `${resolve(__dirname, "./schemas/components")}/**/*.json`,
  );
  t.deepEqual(
    await getAllSlugs(),
    slugs.map((slug) => parse(slug).name).sort(),
  );
});
test("getSchemaBySlug should return a schema", async (t) => {
  t.deepEqual(
    await getSchemaBySlug("tooltip"),
    await getSchemaFile(
      resolve(__dirname, "./schemas/components/tooltip.json"),
    ),
  );
});
