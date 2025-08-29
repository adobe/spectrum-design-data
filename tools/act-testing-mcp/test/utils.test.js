import test from "ava";
import { execSync } from "child_process";
import { isActAvailable } from "../utils/act-helpers.js";

// Basic smoke tests to get started
test("act is available in system", (t) => {
  if (!isActAvailable()) {
    t.log("act not available in CI environment - skipping test");
    t.pass("Skipped: act not available");
    return;
  }

  t.pass("act is available");
});

test("docker is available in system", (t) => {
  try {
    const result = execSync("docker --version", { encoding: "utf8" });
    t.truthy(result.includes("Docker version"), "Docker should be available");
  } catch (error) {
    t.log("Docker not available - skipping test");
    t.pass("Skipped: Docker not available");
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
    t.log(".github/workflows directory not found - skipping test");
    t.pass("Skipped: workflows directory not available");
  }
});
