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

import {
  schemaFileNames,
  getSchemaFile,
  getAllSchemas,
  getSlugFromDocumentationUrl,
  getAllSlugs,
  componentsDir,
  getSchemaBySlug,
} from "../index.js";
import test from "ava";
import { glob } from "glob";
import { resolve, parse } from "path";

test("the number of schemas returned by getAllSchemas should match the number of schemaFileNames", async (t) => {
  const allSchemas = await getAllSchemas();
  t.is(schemaFileNames.length, allSchemas.length);
});

test("getSchemaFile should fetch schema data using a relative filename", async (t) => {
  const schema = await getSchemaFile("action-bar.json");
  // new-format field
  t.is(schema.displayName, "Action bar");
  // backward-compat alias
  t.is(schema.title, "Action bar");
  t.truthy(schema.name);
  t.truthy(schema.meta?.documentationUrl);
});

test("getSchemaFile should fetch schema data using an absolute path", async (t) => {
  const schema = await getSchemaFile(resolve(componentsDir, "action-bar.json"));
  t.is(schema.displayName, "Action bar");
  t.is(schema.title, "Action bar");
});

test("getSchemaFile returned objects include backward-compat properties alias", async (t) => {
  const schema = await getSchemaFile("checkbox.json");
  // options is the new-format field
  t.truthy(schema.options);
  // properties is the compat alias
  t.is(schema.properties, schema.options);
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

test("getAllSlugs should return all component slugs sorted", async (t) => {
  // getAllSlugs() extracts slugs from documentationUrl. This asserts that
  // URL slugs match filename stems — a required invariant for all components.
  const files = await glob(`${componentsDir}/*.json`);
  const expected = files.map((f) => parse(f).name).sort();
  t.deepEqual(await getAllSlugs(), expected);
});

test("getAllSchemas should include slug, title, displayName, properties, and options on each schema", async (t) => {
  const schemas = await getAllSchemas();
  for (const schema of schemas) {
    if (
      Object.hasOwn(schema, "meta") &&
      Object.hasOwn(schema.meta, "documentationUrl")
    ) {
      t.truthy(schema.slug, `${schema.name}: missing slug`);
      t.truthy(schema.displayName, `${schema.name}: missing displayName`);
      t.is(
        schema.title,
        schema.displayName,
        `${schema.name}: title alias mismatch`,
      );
      t.truthy(schema.name, `${schema.name}: missing name`);
    }
  }
});

test("getSchemaBySlug should return a schema without a slug field", async (t) => {
  const schema = await getSchemaBySlug("tooltip");
  t.is(schema.displayName, "Tooltip");
  t.is(schema.title, "Tooltip");
  t.is(schema.name, "tooltip");
  t.false(Object.hasOwn(schema, "slug"));
});

test("getSchemaBySlug should throw for unknown slug", async (t) => {
  await t.throwsAsync(async () => getSchemaBySlug("not-a-real-component"), {
    message: /Schema not found for slug: not-a-real-component/,
  });
});
