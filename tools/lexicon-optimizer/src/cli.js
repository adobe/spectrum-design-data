#!/usr/bin/env node

/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { Command } from "commander";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import LexiconOptimizer from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name("lexicon-optimizer")
  .description(
    "Analyze and optimize terminology used in component option definitions",
  )
  .version("0.0.1");

program
  .command("analyze")
  .description("Analyze component schemas and generate lexicon report")
  .option(
    "-f, --format <format>",
    "Output format (json, csv, markdown)",
    "json",
  )
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-v, --verbose", "Enable verbose output")
  .option("-t, --tokens", "Include design token analysis")
  .action(async (options) => {
    try {
      const optimizer = new LexiconOptimizer();

      if (options.verbose) {
        console.log("🚀 Starting lexicon analysis...");
      }

      const report = optimizer.analyze(options.tokens);

      if (options.verbose) {
        console.log("✅ Analysis complete!");
        console.log(`📊 Found ${report.summary.totalComponents} components`);
        console.log(
          `📝 Found ${report.summary.totalPropertyNames} unique property names`,
        );
        console.log(
          `🎯 Found ${report.summary.totalEnumValues} unique enum values`,
        );
        console.log(`📂 Found ${report.summary.totalCategories} categories`);

        if (options.tokens && report.tokens) {
          console.log(
            `🎨 Found ${report.tokens.summary.totalTokens} design tokens`,
          );
          console.log(
            `🔤 Found ${report.tokens.summary.uniqueSegments} unique token segments`,
          );
          console.log(
            `🔗 Found ${report.tokens.summary.compoundTerms} compound terms`,
          );
        }
      }

      const output = optimizer.exportToFormat(options.format);

      if (options.output) {
        writeFileSync(options.output, output, "utf8");
        console.log(`📁 Report saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("❌ Error during analysis:", error.message);
      process.exit(1);
    }
  });

program
  .command("insights")
  .description("Generate insights and recommendations for lexicon optimization")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-v, --verbose", "Enable verbose output")
  .action(async (options) => {
    try {
      const optimizer = new LexiconOptimizer();

      if (options.verbose) {
        console.log("🔍 Analyzing component schemas for insights...");
      }

      const report = optimizer.analyze();

      if (options.verbose) {
        console.log("✅ Analysis complete!");
        console.log(`💡 Generated ${report.insights.length} insights`);
      }

      const insights = {
        summary: report.summary,
        insights: report.insights,
        recommendations: report.insights.map((insight) => ({
          type: insight.type,
          recommendation: insight.recommendation,
        })),
      };

      const output = JSON.stringify(insights, null, 2);

      if (options.output) {
        writeFileSync(options.output, output, "utf8");
        console.log(`📁 Insights saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("❌ Error generating insights:", error.message);
      process.exit(1);
    }
  });

program
  .command("compare")
  .description(
    "Compare lexicon between different schema versions or components",
  )
  .option(
    "-c, --components <components>",
    "Comma-separated list of components to compare",
  )
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-v, --verbose", "Enable verbose output")
  .action(async (options) => {
    try {
      const optimizer = new LexiconOptimizer();

      if (options.verbose) {
        console.log("🔍 Analyzing component schemas for comparison...");
      }

      const report = optimizer.analyze();

      // Filter components if specified
      let componentsToCompare = Object.keys(report.componentStats);
      if (options.components) {
        const requestedComponents = options.components
          .split(",")
          .map((c) => c.trim());
        componentsToCompare = requestedComponents.filter(
          (comp) => report.componentStats[comp],
        );

        if (componentsToCompare.length === 0) {
          console.error("❌ No valid components found for comparison");
          process.exit(1);
        }
      }

      // Generate comparison data
      const comparison = {
        components: componentsToCompare,
        stats: componentsToCompare.reduce((acc, comp) => {
          acc[comp] = report.componentStats[comp];
          return acc;
        }, {}),
        commonProperties: [],
        uniqueProperties: {},
        sizeConsistency: {
          values: Array.from(report.lexicon.enumValues).filter((v) =>
            ["s", "m", "l", "xl", "xs", "xxl"].includes(v),
          ),
          components: componentsToCompare.filter(
            (comp) => report.componentStats[comp].hasSize,
          ),
        },
        stateConsistency: {
          values: Array.from(report.lexicon.stateValues),
          components: componentsToCompare.filter(
            (comp) => report.componentStats[comp].hasState,
          ),
        },
      };

      // Find common properties
      const allProperties = new Set();
      const propertyCounts = new Map();

      componentsToCompare.forEach((comp) => {
        const stats = report.componentStats[comp];
        // This would need to be enhanced to track actual property names per component
      });

      const output = JSON.stringify(comparison, null, 2);

      if (options.output) {
        writeFileSync(options.output, output, "utf8");
        console.log(`📁 Comparison saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("❌ Error during comparison:", error.message);
      process.exit(1);
    }
  });

program
  .command("tokens")
  .description("Analyze design token names and patterns")
  .option(
    "-f, --format <format>",
    "Output format (json, csv, markdown)",
    "json",
  )
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-v, --verbose", "Enable verbose output")
  .action(async (options) => {
    try {
      const optimizer = new LexiconOptimizer();

      if (options.verbose) {
        console.log("🎨 Starting design token analysis...");
      }

      const report = optimizer.analyze(true);

      if (options.verbose) {
        console.log("✅ Token analysis complete!");
        console.log(
          `🎨 Found ${report.tokens.summary.totalTokens} design tokens`,
        );
        console.log(
          `🔤 Found ${report.tokens.summary.uniqueSegments} unique token segments`,
        );
        console.log(
          `🔗 Found ${report.tokens.summary.compoundTerms} compound terms`,
        );
        console.log(
          `📊 Found ${report.tokens.summary.patterns} naming patterns`,
        );
      }

      const output = JSON.stringify(report.tokens, null, 2);

      if (options.output) {
        writeFileSync(options.output, output, "utf8");
        console.log(`📁 Token analysis saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("❌ Error during token analysis:", error.message);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate lexicon consistency and identify potential issues")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-v, --verbose", "Enable verbose output")
  .action(async (options) => {
    try {
      const optimizer = new LexiconOptimizer();

      if (options.verbose) {
        console.log("🔍 Validating lexicon consistency...");
      }

      const report = optimizer.analyze();

      const validation = {
        summary: report.summary,
        issues: [],
        recommendations: [],
      };

      // Check for inconsistent size values
      const sizeValues = Array.from(report.lexicon.enumValues).filter((v) =>
        ["s", "m", "l", "xl", "xs", "xxl"].includes(v),
      );
      if (sizeValues.length > 4) {
        validation.issues.push({
          type: "inconsistent_sizes",
          severity: "warning",
          message: `Found ${sizeValues.length} different size values: ${sizeValues.join(", ")}`,
          recommendation:
            "Consider standardizing to a consistent set of size values",
        });
      }

      // Check for inconsistent state values
      const stateValues = Array.from(report.lexicon.stateValues);
      if (stateValues.length > 5) {
        validation.issues.push({
          type: "inconsistent_states",
          severity: "warning",
          message: `Found ${stateValues.length} different state values: ${stateValues.join(", ")}`,
          recommendation:
            "Consider standardizing state values across components",
        });
      }

      // Check for boolean property naming consistency
      const booleanProps = Array.from(report.lexicon.propertyNames).filter(
        (name) =>
          name.startsWith("is") ||
          name.startsWith("has") ||
          name.startsWith("show"),
      );
      const namingPatterns = {
        is: booleanProps.filter((name) => name.startsWith("is")).length,
        has: booleanProps.filter((name) => name.startsWith("has")).length,
        show: booleanProps.filter((name) => name.startsWith("show")).length,
      };

      if (Object.values(namingPatterns).some((count) => count > 0)) {
        validation.issues.push({
          type: "boolean_naming_patterns",
          severity: "info",
          message: `Boolean property naming patterns: ${JSON.stringify(namingPatterns)}`,
          recommendation:
            "Consider standardizing boolean property naming conventions",
        });
      }

      const output = JSON.stringify(validation, null, 2);

      if (options.output) {
        writeFileSync(options.output, output, "utf8");
        console.log(`📁 Validation results saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("❌ Error during validation:", error.message);
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
