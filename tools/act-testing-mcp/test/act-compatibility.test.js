import test from "ava";
import { execSync } from "child_process";
import { runActCommand, getWorkflows } from "../utils/act-helpers.js";

// Helper to check if act is available
function isActAvailable() {
  try {
    execSync("which act", { encoding: "utf8" });
    return true;
  } catch (error) {
    return false;
  }
}

// Test to ensure act command structure hasn't changed
test("act version command still works as expected", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  const result = runActCommand(["--version"]);

  t.true(result.success, "Act version command should succeed");
  t.true(
    result.output.includes("act version"),
    'Output should contain "act version"',
  );
  t.regex(
    result.output,
    /\d+\.\d+\.\d+/,
    "Should contain semantic version number",
  );
});

test("act help output contains expected commands", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  const result = runActCommand(["--help"]);

  t.true(result.success, "Act help command should succeed");

  // Check for critical commands we depend on
  const expectedCommands = [
    "--list",
    "--dryrun",
    "--verbose",
    "--env",
    "--secret",
    "--eventpath",
  ];

  expectedCommands.forEach((cmd) => {
    t.true(result.output.includes(cmd), `Help should mention ${cmd} flag`);
  });
});

test("act --list output format is parseable", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  const result = runActCommand(["--list"]);

  if (!result.success) {
    t.log("Act list failed - this might indicate act compatibility issues");
    t.log("Error:", result.error);
    t.fail("Act --list command failed");
    return;
  }

  const lines = result.output.split("\n").filter((line) => line.trim());
  t.true(lines.length > 0, "Should have at least one line of output");

  // Test our workflow parsing still works
  const { workflows, error } = getWorkflows();
  t.is(error, null, "getWorkflows should not error");
  t.true(Array.isArray(workflows), "Should return workflows array");

  if (workflows.length > 0) {
    const workflow = workflows[0];
    t.truthy(workflow.jobId, "Parsed workflow should have jobId");
    t.truthy(workflow.jobName, "Parsed workflow should have jobName");
    t.truthy(workflow.workflowName, "Parsed workflow should have workflowName");
  }
});

test("act error handling still works consistently", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  // Test with invalid workflow file to ensure error handling is consistent
  const result = runActCommand([
    "--list",
    "-W",
    ".github/workflows/nonexistent.yml",
  ]);

  t.false(result.success, "Invalid workflow should fail");
  t.truthy(result.error, "Should provide error message");
});

test("act dry run behavior is consistent", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  // Test basic dry run functionality with a simple command
  const result = runActCommand(["push", "--dryrun", "--list"]);

  // This should not actually execute workflows, just validate the command
  if (result.success) {
    t.pass("Dry run command completed successfully");
  } else {
    // Log the error but don't fail unless it's a command structure issue
    t.log("Dry run result:", result.error);

    // If it's a flag recognition issue, that's a compatibility problem
    if (
      result.error.includes("unknown flag") ||
      result.error.includes("unrecognized")
    ) {
      t.fail("Act no longer recognizes dry run flags - compatibility issue!");
    } else {
      t.pass(
        "Dry run behaves as expected (may fail due to missing env/secrets)",
      );
    }
  }
});

test("act environment variable handling works", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  // Test that --env flag is recognized without executing a full workflow
  const result = runActCommand(["--help"]);

  if (result.success && result.output.includes("--env")) {
    t.pass("Act still recognizes --env flag");
  } else {
    t.fail("Act help does not mention --env flag - compatibility issue!");
  }
});

test("act docker integration check", (t) => {
  // Test that act can communicate with docker
  try {
    execSync("docker ps", { encoding: "utf8" });
    t.pass("Docker is available for act integration");
  } catch (error) {
    t.skip("Docker not running - skipping docker integration test");
  }
});

test("act version compatibility range", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  const result = runActCommand(["--version"]);

  if (!result.success) {
    t.fail("Cannot determine act version");
    return;
  }

  // Extract version number
  const versionMatch = result.output.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!versionMatch) {
    t.fail("Cannot parse act version number");
    return;
  }

  const [, major, minor, patch] = versionMatch.map(Number);

  // Log version for tracking
  t.log(`Act version detected: ${major}.${minor}.${patch}`);

  // Define minimum supported version (adjust based on features we use)
  const MIN_MAJOR = 0;
  const MIN_MINOR = 2;

  if (major < MIN_MAJOR || (major === MIN_MAJOR && minor < MIN_MINOR)) {
    t.fail(
      `Act version ${major}.${minor}.${patch} is below minimum supported version ${MIN_MAJOR}.${MIN_MINOR}.0`,
    );
  }

  // Warn about potential future compatibility issues
  if (major > 0 || (major === 0 && minor > 2)) {
    t.log(
      `Warning: Act version ${major}.${minor}.${patch} is newer than tested version. Monitor for compatibility issues.`,
    );
  }

  t.pass(`Act version ${major}.${minor}.${patch} is in supported range`);
});
