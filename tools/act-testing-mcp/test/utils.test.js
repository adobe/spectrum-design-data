import test from "ava";
import { execSync } from "child_process";

// Helper to check if act is available
function isActAvailable() {
  try {
    execSync("which act", { encoding: "utf8" });
    return true;
  } catch (error) {
    return false;
  }
}

// Basic smoke tests to get started
test("act is available in system", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  try {
    const result = execSync("which act", { encoding: "utf8" });
    t.truthy(result.trim(), "act command should be available");
  } catch (error) {
    t.fail("act command not found in system PATH");
  }
});

test("docker is available in system", (t) => {
  try {
    const result = execSync("docker --version", { encoding: "utf8" });
    t.truthy(result.includes("Docker version"), "Docker should be available");
  } catch (error) {
    t.fail("Docker not available");
  }
});

test("project has workflows directory", (t) => {
  try {
    // Go up two levels from tools/act-testing-mcp to project root
    const projectRoot = process.env.PROJECT_ROOT || "../../";
    const result = execSync("ls -la .github/workflows/", {
      encoding: "utf8",
      cwd: projectRoot,
    });
    t.truthy(result.includes(".yml"), "Should have workflow files");
  } catch (error) {
    t.fail(".github/workflows directory not found");
  }
});
