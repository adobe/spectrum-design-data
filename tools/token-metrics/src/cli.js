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
import { writeFile } from "fs/promises";
import { resolve } from "path";
import generateMetricsReport from "./index.js";

const program = new Command();

program
  .name("token-metrics")
  .description(
    "Extract and report design token metrics from @adobe/spectrum-tokens",
  )
  .version("0.1.0")
  .option(
    "-o, --output <path>",
    "Output file path for JSON report",
    "token-metrics-report.json",
  )
  .option("--tokens-src <path>", "Path to tokens/src directory")
  .option("--registry <path>", "Path to design-system-registry components.json")
  .option("--schemas <path>", "Path to component-schemas/schemas/components")
  .option("--summary", "Print only the summary to stdout", false)
  .action(async (options) => {
    try {
      const reportOptions = {};
      if (options.tokensSrc)
        reportOptions.tokensSrc = resolve(options.tokensSrc);
      if (options.registry)
        reportOptions.registryPath = resolve(options.registry);
      if (options.schemas) reportOptions.schemasDir = resolve(options.schemas);

      console.log("Generating token metrics report...\n");
      const report = await generateMetricsReport(reportOptions);

      if (options.summary) {
        printSummary(report);
      } else {
        printSummary(report);
        const outputPath = resolve(options.output);
        await writeFile(outputPath, JSON.stringify(report, null, 2));
        console.log(`\nFull report written to: ${outputPath}`);
      }
    } catch (error) {
      console.error("Error generating metrics:", error.message);
      process.exit(1);
    }
  });

function printSummary(report) {
  const { summary, aliasAnalysis, uuidCoverage, componentCoverage } = report;

  console.log("=== Spectrum Design Token Metrics ===\n");
  console.log(`Generated: ${report.generatedAt}\n`);

  console.log("--- Token Inventory ---");
  console.log(`  Total tokens:              ${summary.totalTokens}`);
  console.log(`  Active tokens:             ${summary.activeTokens}`);
  console.log(
    `  Deprecated tokens:         ${summary.deprecatedTokens} (${summary.deprecationRate}%)`,
  );
  console.log(
    `  Deprecated w/ migration:   ${summary.deprecatedWithMigrationPath} (${summary.migrationPathCoverage}% coverage)`,
  );
  console.log(`  Private tokens:            ${summary.privateTokens}`);

  console.log("\n--- Token Scope ---");
  console.log(`  Global tokens:             ${summary.globalTokenCount}`);
  console.log(`  Component tokens:          ${summary.componentTokenCount}`);
  console.log(`  Unique components:         ${summary.uniqueComponents}`);

  console.log("\n--- Token Architecture ---");
  console.log(`  Alias (reference) tokens:  ${aliasAnalysis.aliasTokens}`);
  console.log(
    `  Direct-value tokens:       ${aliasAnalysis.directValueTokens}`,
  );
  console.log(
    `  Set-based tokens:          ${aliasAnalysis.setBasedTokens.total}`,
  );
  console.log(
    `    Color theme sets:        ${aliasAnalysis.setBasedTokens.colorTheme}`,
  );
  console.log(
    `    Scale sets:              ${aliasAnalysis.setBasedTokens.scale}`,
  );

  console.log("\n--- Data Quality ---");
  console.log(
    `  UUID coverage:             ${uuidCoverage.coveragePercent}% (${uuidCoverage.withUuid}/${uuidCoverage.withUuid + uuidCoverage.withoutUuid})`,
  );
  console.log(
    `  Max alias chain depth:     ${report.aliasChainDepth.maxDepth} (${report.aliasChainDepth.maxDepthToken})`,
  );

  if (componentCoverage) {
    console.log("\n--- Component Coverage ---");
    console.log(
      `  Registered components:     ${componentCoverage.registeredComponentCount}`,
    );
    console.log(
      `  With tokens:               ${componentCoverage.componentsWithTokens} (${componentCoverage.tokenCoveragePercent}%)`,
    );
    console.log(
      `  With schema:               ${componentCoverage.componentsWithSchema} (${componentCoverage.schemaCoveragePercent}%)`,
    );
    console.log(
      `  With both:                 ${componentCoverage.componentsWithBoth}`,
    );
  }

  console.log("\n--- Semantic Categories ---");
  for (const [category, count] of Object.entries(report.semanticCategories)) {
    console.log(`  ${category.padEnd(24)} ${count}`);
  }
}

program.parse();
