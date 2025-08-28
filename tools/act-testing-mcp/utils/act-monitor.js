import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { runActCommand, PROJECT_ROOT } from "./act-helpers.js";

const BASELINE_FILE = join(
  PROJECT_ROOT,
  "tools/act-testing-mcp/.act-baseline.json",
);

/**
 * Create a baseline snapshot of act behavior for future comparison
 * @returns {object} Baseline data
 */
export function createActBaseline() {
  const baseline = {
    timestamp: new Date().toISOString(),
    version: null,
    helpOutput: null,
    listOutput: null,
    dryRunBehavior: null,
    errorPatterns: [],
  };

  // Capture version
  const versionResult = runActCommand(["--version"]);
  if (versionResult.success) {
    baseline.version = versionResult.output.trim();
  }

  // Capture help output structure
  const helpResult = runActCommand(["--help"]);
  if (helpResult.success) {
    // Store just the flags we care about, not the entire help text
    const flags = extractFlags(helpResult.output);
    baseline.helpOutput = flags;
  }

  // Capture list output format
  const listResult = runActCommand(["--list"]);
  if (listResult.success) {
    baseline.listOutput = {
      hasOutput: listResult.output.length > 0,
      lineCount: listResult.output.split("\n").filter((l) => l.trim()).length,
      containsWorkflows: listResult.output.includes(".yml"),
    };
  }

  // Test dry run behavior
  const dryRunResult = runActCommand(["push", "--dryrun", "--list"]);
  baseline.dryRunBehavior = {
    succeeds: dryRunResult.success,
    errorType: dryRunResult.success
      ? null
      : categorizeError(dryRunResult.error),
  };

  return baseline;
}

/**
 * Save baseline to file
 * @param {object} baseline - Baseline data to save
 */
export function saveBaseline(baseline) {
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
}

/**
 * Load existing baseline from file
 * @returns {object|null} Baseline data or null if not found
 */
export function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }

  try {
    const data = readFileSync(BASELINE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.warn("Failed to load act baseline:", error.message);
    return null;
  }
}

/**
 * Compare current act behavior with baseline
 * @returns {object} Comparison results
 */
export function compareWithBaseline() {
  const baseline = loadBaseline();
  if (!baseline) {
    return {
      hasBaseline: false,
      message: "No baseline found. Run createBaseline() first.",
    };
  }

  const current = createActBaseline();
  const differences = [];

  // Compare version
  if (baseline.version !== current.version) {
    differences.push({
      type: "version_change",
      baseline: baseline.version,
      current: current.version,
      severity: "info",
    });
  }

  // Compare help flags
  if (baseline.helpOutput && current.helpOutput) {
    const missingFlags = baseline.helpOutput.filter(
      (flag) => !current.helpOutput.includes(flag),
    );
    const newFlags = current.helpOutput.filter(
      (flag) => !baseline.helpOutput.includes(flag),
    );

    missingFlags.forEach((flag) => {
      differences.push({
        type: "missing_flag",
        flag,
        severity: "warning",
      });
    });

    newFlags.forEach((flag) => {
      differences.push({
        type: "new_flag",
        flag,
        severity: "info",
      });
    });
  }

  // Compare list output format
  if (baseline.listOutput && current.listOutput) {
    if (
      baseline.listOutput.containsWorkflows !==
      current.listOutput.containsWorkflows
    ) {
      differences.push({
        type: "list_format_change",
        description: "Workflow detection in --list output changed",
        severity: "error",
      });
    }
  }

  // Compare dry run behavior
  if (baseline.dryRunBehavior && current.dryRunBehavior) {
    if (baseline.dryRunBehavior.succeeds !== current.dryRunBehavior.succeeds) {
      differences.push({
        type: "dryrun_behavior_change",
        baseline: baseline.dryRunBehavior.succeeds,
        current: current.dryRunBehavior.succeeds,
        severity: "warning",
      });
    }
  }

  return {
    hasBaseline: true,
    baselineDate: baseline.timestamp,
    currentDate: current.timestamp,
    differences,
    isCompatible:
      differences.filter((d) => d.severity === "error").length === 0,
  };
}

/**
 * Extract command line flags from help output
 * @param {string} helpOutput - Raw help text
 * @returns {string[]} Array of flags
 */
function extractFlags(helpOutput) {
  const flagPattern = /--[\w-]+/g;
  const matches = helpOutput.match(flagPattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Categorize error messages for comparison
 * @param {string} error - Error message
 * @returns {string} Error category
 */
function categorizeError(error) {
  if (!error) return "unknown";

  const errorLower = error.toLowerCase();

  if (errorLower.includes("docker")) return "docker";
  if (errorLower.includes("workflow")) return "workflow";
  if (errorLower.includes("permission")) return "permission";
  if (errorLower.includes("not found")) return "not_found";
  if (errorLower.includes("secret")) return "secret";
  if (errorLower.includes("env")) return "environment";

  return "other";
}

/**
 * Generate a compatibility report
 * @returns {string} Human-readable report
 */
export function generateCompatibilityReport() {
  const comparison = compareWithBaseline();

  if (!comparison.hasBaseline) {
    return "No baseline available. Run act compatibility check to create one.";
  }

  let report = `Act Compatibility Report\n`;
  report += `========================\n\n`;
  report += `Baseline: ${comparison.baselineDate}\n`;
  report += `Current:  ${comparison.currentDate}\n`;
  report += `Status:   ${comparison.isCompatible ? "✅ Compatible" : "⚠️  Issues Found"}\n\n`;

  if (comparison.differences.length === 0) {
    report += "No differences detected from baseline.\n";
  } else {
    report += `Found ${comparison.differences.length} difference(s):\n\n`;

    comparison.differences.forEach((diff, index) => {
      const severity =
        diff.severity === "error"
          ? "🚨"
          : diff.severity === "warning"
            ? "⚠️"
            : "ℹ️";

      report += `${index + 1}. ${severity} ${diff.type}\n`;

      switch (diff.type) {
        case "version_change":
          report += `   Version: ${diff.baseline} → ${diff.current}\n`;
          break;
        case "missing_flag":
          report += `   Missing flag: ${diff.flag}\n`;
          break;
        case "new_flag":
          report += `   New flag: ${diff.flag}\n`;
          break;
        default:
          if (diff.description) {
            report += `   ${diff.description}\n`;
          }
      }
      report += "\n";
    });
  }

  return report;
}
