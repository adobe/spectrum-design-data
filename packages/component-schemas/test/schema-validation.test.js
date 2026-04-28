import test from "ava";
import {
  readJSON,
  getSchemaFiles,
  createAjvInstance,
  validateSchema,
  validateExamples,
} from "./utils/test-helpers.js";

// Setup Ajv instance once for all tests
let ajv;

test.before(async () => {
  ajv = await createAjvInstance();
});

test("component schema should be valid", async (t) => {
  const componentSchema = await readJSON("schemas/component.json");
  const result = validateSchema(componentSchema, ajv);

  t.true(
    result.valid,
    `Component schema validation failed: ${JSON.stringify(result.errors, null, 2)}`,
  );
});

test("all component schemas should validate against the definition", async (t) => {
  const componentFiles = await getSchemaFiles("schemas/components/*.json");
  const validationResults = [];

  for (const filePath of componentFiles) {
    const schema = await readJSON(filePath);
    const result = validateSchema(schema, ajv);

    if (!result.valid) {
      validationResults.push({
        file: filePath,
        errors: result.errors,
      });
    }
  }

  t.is(
    validationResults.length,
    0,
    `Schema validation failed for:\n${validationResults
      .map((r) => `${r.file}:\n${JSON.stringify(r.errors, null, 2)}`)
      .join("\n\n")}`,
  );
});

test("all component examples should validate against their schemas", async (t) => {
  const componentFiles = await getSchemaFiles("schemas/components/*.json");
  const validationResults = [];

  for (const filePath of componentFiles) {
    const schema = await readJSON(filePath);
    const result = validateExamples(schema, ajv);

    if (!result.valid) {
      validationResults.push({
        file: filePath,
        errors: result.errors,
      });
    }
  }

  t.is(
    validationResults.length,
    0,
    `Example validation failed for:\n${validationResults
      .map((r) => `${r.file}:\n${JSON.stringify(r.errors, null, 2)}`)
      .join("\n\n")}`,
  );
});

test("all type schemas should be valid JSON Schema", async (t) => {
  const typeFiles = await getSchemaFiles("schemas/types/*.json");
  const validationResults = [];

  for (const filePath of typeFiles) {
    const schema = await readJSON(filePath);
    const result = validateSchema(schema, ajv);

    if (!result.valid) {
      validationResults.push({
        file: filePath,
        errors: result.errors,
      });
    }
  }

  t.is(
    validationResults.length,
    0,
    `Type schema validation failed for:\n${validationResults
      .map((r) => `${r.file}:\n${JSON.stringify(r.errors, null, 2)}`)
      .join("\n\n")}`,
  );
});

test("component schemas should have required metadata", async (t) => {
  const componentFiles = await getSchemaFiles("schemas/components/*.json");
  const missingMetadata = [];

  for (const filePath of componentFiles) {
    const schema = await readJSON(filePath);

    if (!schema.meta?.category) {
      missingMetadata.push(`${filePath}: missing category`);
    }

    if (!schema.meta?.documentationUrl) {
      missingMetadata.push(`${filePath}: missing documentationUrl`);
    }

    if (!schema.title) {
      missingMetadata.push(`${filePath}: missing title`);
    }

    if (!Object.hasOwn(schema, "description")) {
      missingMetadata.push(`${filePath}: missing description`);
    }
  }

  t.is(
    missingMetadata.length,
    0,
    `Missing required metadata:\n${missingMetadata.join("\n")}`,
  );
});
