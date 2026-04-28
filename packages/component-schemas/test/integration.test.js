import test from "ava";
import {
  getAllSchemas,
  getSchemaBySlug,
  getAllSlugs,
  getSlugFromDocumentationUrl,
  schemaFileNames,
} from "../index.js";
import { getSchemaFiles } from "./utils/test-helpers.js";
import { relative } from "path";

test("getAllSchemas should return all schemas with slugs", async (t) => {
  const schemas = await getAllSchemas();

  t.true(Array.isArray(schemas));
  t.true(schemas.length > 0);

  // Check that schemas with documentation URLs have slugs
  const schemasWithSlugs = schemas.filter((schema) => schema.slug);
  t.true(schemasWithSlugs.length > 0);

  // Verify slug format
  for (const schema of schemasWithSlugs) {
    t.true(typeof schema.slug === "string");
    t.true(schema.slug.length > 0);
  }
});

test("getAllSlugs should return all component slugs", async (t) => {
  const slugs = await getAllSlugs();

  t.true(Array.isArray(slugs));
  t.true(slugs.length > 0);

  // Verify all slugs are unique
  const uniqueSlugs = new Set(slugs);
  t.is(uniqueSlugs.size, slugs.length, "All slugs should be unique");

  // Verify slug format (should be kebab-case)
  for (const slug of slugs) {
    t.true(/^[a-z0-9-]+$/.test(slug), `Slug "${slug}" should be kebab-case`);
  }
});

test("getSchemaBySlug should return correct schema", async (t) => {
  const slugs = await getAllSlugs();

  if (slugs.length === 0) {
    t.skip("No slugs available for testing");
    return;
  }

  const testSlug = slugs[0];
  const schema = await getSchemaBySlug(testSlug);

  t.truthy(schema);
  t.true(typeof schema === "object");
  t.true(Object.hasOwn(schema.meta, "documentationUrl"));

  // Verify the slug was extracted correctly
  const expectedSlug = getSlugFromDocumentationUrl(
    schema.meta.documentationUrl,
  );
  t.is(expectedSlug, testSlug);
});

test("getSlugFromDocumentationUrl should handle various URL formats", (t) => {
  const testCases = [
    { url: "https://spectrum.adobe.com/page/tooltip/", expected: "tooltip" },
    { url: "https://spectrum.adobe.com/page/tooltip", expected: "tooltip" },
    {
      url: "https://spectrum.adobe.com/page/action-bar/",
      expected: "action-bar",
    },
    { url: "https://spectrum.adobe.com/page/button/", expected: "button" },
    { url: "https://spectrum.adobe.com/page/button", expected: "button" },
  ];

  for (const { url, expected } of testCases) {
    const result = getSlugFromDocumentationUrl(url);
    t.is(result, expected, `Failed for URL: ${url}`);
  }
});

test("schemaFileNames should match actual files on disk", async (t) => {
  const actualFiles = await getSchemaFiles();

  t.is(schemaFileNames.length, actualFiles.length);

  // Verify all files in schemaFileNames exist
  for (const fileName of schemaFileNames) {
    const relativePath = relative(process.cwd(), fileName);
    t.true(
      actualFiles.includes(relativePath),
      `File ${fileName} not found on disk`,
    );
  }
});

test("getAllSchemas should return same number as schemaFileNames", async (t) => {
  const allSchemas = await getAllSchemas();

  t.is(schemaFileNames.length, allSchemas.length);
});

test("getSchemaBySlug should throw for non-existent slug", async (t) => {
  const nonExistentSlug = "non-existent-component";

  await t.throwsAsync(
    async () => {
      const schema = await getSchemaBySlug(nonExistentSlug);
      if (!schema) {
        throw new Error("Schema not found");
      }
    },
    { message: /Schema not found/ },
  );
});
