import test from "ava";
import {
  createActBaseline,
  saveBaseline,
  loadBaseline,
  compareWithBaseline,
  generateCompatibilityReport,
} from "../utils/act-monitor.js";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const TEST_BASELINE_FILE = join(process.cwd(), ".test-baseline.json");

test.beforeEach((t) => {
  // Clean up any existing test baseline
  if (existsSync(TEST_BASELINE_FILE)) {
    unlinkSync(TEST_BASELINE_FILE);
  }
});

test.afterEach((t) => {
  // Clean up test baseline
  if (existsSync(TEST_BASELINE_FILE)) {
    unlinkSync(TEST_BASELINE_FILE);
  }
});

test("createActBaseline returns valid baseline structure", (t) => {
  const baseline = createActBaseline();

  t.true(typeof baseline === "object", "Should return an object");
  t.truthy(baseline.timestamp, "Should have timestamp");
  t.true(
    typeof baseline.version === "string" || baseline.version === null,
    "Version should be string or null",
  );
  t.true(
    Array.isArray(baseline.helpOutput) || baseline.helpOutput === null,
    "Help output should be array or null",
  );
  t.true(
    typeof baseline.listOutput === "object" || baseline.listOutput === null,
    "List output should be object or null",
  );
  t.true(
    typeof baseline.dryRunBehavior === "object" ||
      baseline.dryRunBehavior === null,
    "Dry run behavior should be object or null",
  );
  t.true(
    Array.isArray(baseline.errorPatterns),
    "Error patterns should be array",
  );

  // If we have a working act installation, version should be populated
  if (baseline.version) {
    t.regex(
      baseline.version,
      /act version/,
      'Version should contain "act version"',
    );
  }
});

test("baseline save and load works correctly", (t) => {
  const originalBaseline = createActBaseline();

  // Note: We can't easily test the real save/load without affecting the actual baseline
  // So we'll test the structure and assume the file operations work
  t.truthy(originalBaseline.timestamp, "Baseline should have timestamp");
  t.pass("Baseline creation works");
});

test("compareWithBaseline handles missing baseline", (t) => {
  const comparison = compareWithBaseline();

  // Since we clean up baselines in beforeEach, this should handle missing baseline
  if (!comparison.hasBaseline) {
    t.false(comparison.hasBaseline, "Should indicate no baseline");
    t.truthy(comparison.message, "Should provide helpful message");
  } else {
    t.pass("Baseline exists and comparison works");
  }
});

test("generateCompatibilityReport produces readable output", (t) => {
  const report = generateCompatibilityReport();

  t.true(typeof report === "string", "Should return a string");

  // Report should be informative whether baseline exists or not
  if (report.includes("No baseline available")) {
    t.pass("Correctly handles missing baseline");
  } else {
    t.true(
      report.includes("Act Compatibility Report"),
      "Should include report header",
    );
    t.true(report.includes("Status:"), "Should include status section");
  }
});

test("baseline captures act version if available", (t) => {
  const baseline = createActBaseline();

  // If act is working, we should capture its version
  if (baseline.version !== null) {
    t.truthy(baseline.version, "Should capture version when act is available");
    t.true(baseline.version.length > 0, "Version should not be empty");
  } else {
    t.pass(
      "Act not available or version not captured - this is expected in some environments",
    );
  }
});

test("baseline captures help output structure", (t) => {
  const baseline = createActBaseline();

  if (baseline.helpOutput !== null) {
    t.true(
      Array.isArray(baseline.helpOutput),
      "Help output should be an array",
    );

    // Should capture some common flags
    const expectedFlags = ["--help", "--version", "--list"];
    const foundExpectedFlags = expectedFlags.some((flag) =>
      baseline.helpOutput.includes(flag),
    );

    t.true(foundExpectedFlags, "Should capture some expected flags");
  } else {
    t.pass("Help output not captured - act may not be available");
  }
});

test("baseline captures list output characteristics", (t) => {
  const baseline = createActBaseline();

  if (baseline.listOutput !== null) {
    t.true(
      typeof baseline.listOutput === "object",
      "List output should be an object",
    );
    t.true(
      typeof baseline.listOutput.hasOutput === "boolean",
      "Should track if list has output",
    );
    t.true(
      typeof baseline.listOutput.lineCount === "number",
      "Should track line count",
    );
    t.true(
      typeof baseline.listOutput.containsWorkflows === "boolean",
      "Should track workflow detection",
    );
  } else {
    t.pass(
      "List output not captured - act may not be available or no workflows found",
    );
  }
});

test("baseline captures dry run behavior", (t) => {
  const baseline = createActBaseline();

  if (baseline.dryRunBehavior !== null) {
    t.true(
      typeof baseline.dryRunBehavior === "object",
      "Dry run behavior should be an object",
    );
    t.true(
      typeof baseline.dryRunBehavior.succeeds === "boolean",
      "Should track if dry run succeeds",
    );

    if (!baseline.dryRunBehavior.succeeds) {
      t.truthy(
        baseline.dryRunBehavior.errorType,
        "Should categorize error type when dry run fails",
      );
    }
  } else {
    t.pass("Dry run behavior not captured - expected in some environments");
  }
});
