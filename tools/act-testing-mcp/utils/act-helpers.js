import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

// Get project root from environment or default
export const PROJECT_ROOT =
  process.env.PROJECT_ROOT || "/Users/garthdb/Spectrum/spectrum-tokens";
export const ACT_BINARY = process.env.ACT_BINARY || "act";

/**
 * Helper function to run act commands
 * @param {string[]} args - Command arguments
 * @param {object} options - Execution options
 * @returns {object} Result with success, output, and error
 */
export function runActCommand(args, options = {}) {
  try {
    const result = execSync(`${ACT_BINARY} ${args.join(" ")}`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
      ...options,
    });
    return { success: true, output: result, error: null };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Helper function to get workflows
 * @returns {object} Object with workflows array and error
 */
export function getWorkflows() {
  try {
    const result = runActCommand(["--list"]);
    if (!result.success) {
      return { workflows: [], error: result.error };
    }

    // Parse act --list output
    const lines = result.output.split("\n").filter((line) => line.trim());
    const workflows = [];

    for (const line of lines) {
      if (line.includes(".yml")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          workflows.push({
            stage: parts[0],
            jobId: parts[1],
            jobName: parts[2],
            workflowName: parts[3],
            workflowFile: parts[4],
            events: parts.slice(5),
          });
        }
      }
    }

    return { workflows, error: null };
  } catch (error) {
    return { workflows: [], error: error.message };
  }
}

/**
 * Build act arguments for workflow execution
 * @param {object} params - Parameters for workflow execution
 * @returns {string[]} Array of act command arguments
 */
export function buildActArgs({
  workflow,
  event = "push",
  dryRun = false,
  verbose = false,
  env,
  secrets,
  eventData,
}) {
  let actArgs = [];

  // Add event type
  actArgs.push(event);

  // Add workflow specification
  if (workflow.endsWith(".yml") || workflow.endsWith(".yaml")) {
    actArgs.push("-W", `.github/workflows/${workflow}`);
  } else {
    actArgs.push("-j", workflow);
  }

  // Add flags
  if (dryRun) actArgs.push("--dryrun");
  if (verbose) actArgs.push("--verbose");

  // Handle environment variables
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      actArgs.push("--env", `${key}=${value}`);
    }
  }

  // Handle secrets
  if (secrets) {
    for (const [key, value] of Object.entries(secrets)) {
      actArgs.push("--secret", `${key}=${value}`);
    }
  }

  return actArgs;
}

/**
 * Create temporary event file for act
 * @param {object} eventData - Event data to write
 * @returns {string} Path to the created event file
 */
export function createEventFile(eventData) {
  const eventFile = join(PROJECT_ROOT, ".act-event.json");
  writeFileSync(eventFile, JSON.stringify(eventData, null, 2));
  return eventFile;
}

/**
 * Check if act is available in the system
 * @returns {boolean} True if act is available
 */
export function isActAvailable() {
  try {
    execSync("which act", { encoding: "utf8" });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if act and docker are available
 * @returns {object} Status of system requirements
 */
export function checkSystemRequirements() {
  const checks = [];

  // Check if act is installed
  try {
    const actVersion = execSync(`${ACT_BINARY} --version`, {
      encoding: "utf8",
    });
    checks.push({
      type: "success",
      message: `Act installed: ${actVersion.trim()}`,
    });
  } catch (error) {
    checks.push({
      type: "error",
      message: `Act not found or not working: ${error.message}`,
    });
  }

  // Check if Docker is running
  try {
    execSync("docker --version", { encoding: "utf8" });
    checks.push({ type: "success", message: "Docker is installed" });

    try {
      execSync("docker ps", { encoding: "utf8" });
      checks.push({ type: "success", message: "Docker is running" });
    } catch (error) {
      checks.push({
        type: "error",
        message: "Docker is installed but not running",
      });
    }
  } catch (error) {
    checks.push({ type: "error", message: "Docker not found" });
  }

  // Check project structure
  const workflowsDir = join(PROJECT_ROOT, ".github/workflows");
  if (existsSync(workflowsDir)) {
    checks.push({
      type: "success",
      message: "GitHub Actions workflows directory found",
    });
  } else {
    checks.push({
      type: "error",
      message: "No .github/workflows directory found",
    });
  }

  // Check .actrc configuration
  const actrcPath = join(PROJECT_ROOT, ".actrc");
  if (existsSync(actrcPath)) {
    checks.push({
      type: "success",
      message: ".actrc configuration file found",
    });
  } else {
    checks.push({
      type: "info",
      message: "No .actrc configuration file (optional)",
    });
  }

  return checks;
}
