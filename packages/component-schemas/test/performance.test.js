import test from "ava";
import { performance } from "perf_hooks";
import {
  getAllSchemas,
  getSchemaBySlug,
  getAllSlugs,
  getSchemaFile,
} from "../index.js";

test("getAllSchemas should complete within reasonable time", async (t) => {
  const start = performance.now();
  const schemas = await getAllSchemas();
  const end = performance.now();
  const duration = end - start;

  // Should complete within 1 second
  t.true(
    duration < 1000,
    `getAllSchemas took ${duration.toFixed(2)}ms, expected < 1000ms`,
  );
  t.true(schemas.length > 0);
});

test("getAllSlugs should complete within reasonable time", async (t) => {
  const start = performance.now();
  const slugs = await getAllSlugs();
  const end = performance.now();
  const duration = end - start;

  // Should complete within 500ms
  t.true(
    duration < 500,
    `getAllSlugs took ${duration.toFixed(2)}ms, expected < 500ms`,
  );
  t.true(slugs.length > 0);
});

test("getSchemaBySlug should complete within reasonable time", async (t) => {
  const slugs = await getAllSlugs();

  if (slugs.length === 0) {
    t.skip("No slugs available for testing");
    return;
  }

  const testSlug = slugs[0];
  const start = performance.now();
  const schema = await getSchemaBySlug(testSlug);
  const end = performance.now();
  const duration = end - start;

  // Should complete within 100ms
  t.true(
    duration < 100,
    `getSchemaBySlug took ${duration.toFixed(2)}ms, expected < 100ms`,
  );
  t.truthy(schema);
});

test("getSchemaFile should complete within reasonable time", async (t) => {
  const start = performance.now();
  const schema = await getSchemaFile("component.json");
  const end = performance.now();
  const duration = end - start;

  // Should complete within 100ms
  t.true(
    duration < 100,
    `getSchemaFile took ${duration.toFixed(2)}ms, expected < 100ms`,
  );
  t.truthy(schema);
});

test("multiple concurrent getSchemaBySlug calls should complete efficiently", async (t) => {
  const slugs = await getAllSlugs();

  if (slugs.length < 3) {
    t.skip("Not enough slugs for concurrent testing");
    return;
  }

  const testSlugs = slugs.slice(0, 3);
  const start = performance.now();

  const results = await Promise.all(
    testSlugs.map((slug) => getSchemaBySlug(slug)),
  );

  const end = performance.now();
  const duration = end - start;

  // Should complete within 200ms for 3 concurrent calls
  t.true(
    duration < 200,
    `Concurrent getSchemaBySlug calls took ${duration.toFixed(2)}ms, expected < 200ms`,
  );
  t.is(results.length, 3);
  t.true(results.every((schema) => schema !== null));
});

test("memory usage should be reasonable", async (t) => {
  const initialMemory = process.memoryUsage().heapUsed;

  // Perform multiple operations
  const schemas = await getAllSchemas();
  const slugs = await getAllSlugs();

  if (slugs.length > 0) {
    await getSchemaBySlug(slugs[0]);
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;

  // Memory increase should be less than 10MB
  const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
  t.true(
    memoryIncreaseMB < 10,
    `Memory usage increased by ${memoryIncreaseMB.toFixed(2)}MB, expected < 10MB`,
  );
});
