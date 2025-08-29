#!/usr/bin/env node

import {
  createActBaseline,
  saveBaseline,
  loadBaseline,
  compareWithBaseline,
  generateCompatibilityReport,
} from "../utils/act-monitor.js";
import { isActAvailable } from "../utils/act-helpers.js";

const command = process.argv[2];

function printUsage() {
  console.log(`
Act Compatibility Checker

Usage:
  node scripts/check-act-compatibility.js <command>

Commands:
  create-baseline    Create a new baseline of current act behavior
  check             Compare current act behavior with baseline
  report            Generate a detailed compatibility report
  help              Show this help message

Examples:
  # Create initial baseline
  node scripts/check-act-compatibility.js create-baseline

  # Check for changes
  node scripts/check-act-compatibility.js check

  # Get detailed report
  node scripts/check-act-compatibility.js report
`);
}

function createBaseline() {
  console.log("🔍 Creating act baseline...");

  if (!isActAvailable()) {
    console.log(
      "⚠️  Act not available - creating minimal baseline for CI compatibility",
    );
  }

  const baseline = createActBaseline();
  saveBaseline(baseline);

  console.log("✅ Baseline created successfully!");
  console.log(`📅 Timestamp: ${baseline.timestamp}`);

  if (baseline.version) {
    console.log(
      `📦 Act version: ${baseline.version.replace("act version ", "")}`,
    );
  }

  if (baseline.helpOutput) {
    console.log(`🔧 Captured ${baseline.helpOutput.length} command flags`);
  }

  if (baseline.listOutput) {
    console.log(
      `📋 List command: ${baseline.listOutput.hasOutput ? "working" : "no output"}`,
    );
  }

  console.log('\n💡 Run "check" command regularly to detect act changes');
}

function checkCompatibility() {
  console.log("🔍 Checking act compatibility...");

  const comparison = compareWithBaseline();

  if (!comparison.hasBaseline) {
    console.log('❌ No baseline found. Run "create-baseline" first.');
    process.exit(1);
  }

  if (comparison.actAvailable === false) {
    console.log("⚠️  Act not available - skipping compatibility check");
    console.log("✅ CI compatibility check passed (act not required)");
    return;
  }

  console.log(
    `📅 Baseline from: ${new Date(comparison.baselineDate).toLocaleDateString()}`,
  );
  console.log(
    `🕐 Current check: ${new Date(comparison.currentDate).toLocaleDateString()}`,
  );

  if (comparison.isCompatible) {
    console.log("✅ Act is compatible with baseline");

    if (comparison.differences.length > 0) {
      console.log(
        `ℹ️  Found ${comparison.differences.length} non-breaking change(s):`,
      );
      comparison.differences.forEach((diff) => {
        if (diff.type === "version_change") {
          console.log(
            `  📦 Version updated: ${diff.baseline} → ${diff.current}`,
          );
        } else if (diff.type === "new_flag") {
          console.log(`  🆕 New flag: ${diff.flag}`);
        }
      });
    }
  } else {
    console.log("⚠️  Compatibility issues detected!");

    const errors = comparison.differences.filter((d) => d.severity === "error");
    const warnings = comparison.differences.filter(
      (d) => d.severity === "warning",
    );

    if (errors.length > 0) {
      console.log(`🚨 ${errors.length} breaking change(s):`);
      errors.forEach((err) => {
        console.log(
          `  - ${err.type}: ${err.description || err.flag || "See details"}`,
        );
      });
    }

    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} warning(s):`);
      warnings.forEach((warn) => {
        console.log(
          `  - ${warn.type}: ${warn.description || warn.flag || "See details"}`,
        );
      });
    }

    console.log("\n🔧 Consider updating the MCP tool to handle these changes");
    process.exit(1);
  }
}

function showReport() {
  const report = generateCompatibilityReport();
  console.log(report);
}

switch (command) {
  case "create-baseline":
    createBaseline();
    break;

  case "check":
    checkCompatibility();
    break;

  case "report":
    showReport();
    break;

  case "help":
  case "--help":
  case "-h":
    printUsage();
    break;

  default:
    console.log("❌ Unknown command:", command || "(none)");
    printUsage();
    process.exit(1);
}
