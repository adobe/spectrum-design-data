// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "./registry-index.js";
import { decompose } from "./decomposer.js";
import { generateReport } from "./report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, "../../../packages/tokens/src");
const OUTPUT_DIR = resolve(__dirname, "../output");

const TOKEN_FILES = [
  "color-palette.json",
  "semantic-color-palette.json",
  "color-aliases.json",
  "color-component.json",
  "icons.json",
  "layout.json",
  "layout-component.json",
  "typography.json",
];

async function main() {
  console.log("Loading registries...");
  const registry = loadRegistries();

  console.log("Registry loaded:");
  for (const [field, ids] of Object.entries(registry.byField)) {
    console.log(`  ${field}: ${ids.size} values`);
  }

  console.log("\nAnalyzing tokens...");
  const allResults = [];

  for (const filename of TOKEN_FILES) {
    const filePath = resolve(TOKENS_DIR, filename);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const tokenCount = Object.keys(data).length;
    console.log(`\n  ${filename}: ${tokenCount} tokens`);

    for (const [tokenName, tokenData] of Object.entries(data)) {
      const result = decompose(tokenName, tokenData, registry, filename);
      allResults.push(result);
    }

    // Per-file quick stats
    const fileResults = allResults.filter((r) => r.sourceFile === filename);
    const active = fileResults.filter((r) => !r.deprecated && !r.private);
    const byConf = { HIGH: 0, MEDIUM: 0, LOW: 0, FAIL: 0 };
    for (const r of active) byConf[r.confidence]++;
    console.log(
      `    Active: ${active.length} | HIGH: ${byConf.HIGH} MEDIUM: ${byConf.MEDIUM} LOW: ${byConf.LOW} FAIL: ${byConf.FAIL}`,
    );
  }

  console.log("\nGenerating report...");
  const report = generateReport(allResults);

  // Write outputs
  writeFileSync(
    resolve(OUTPUT_DIR, "analysis-report.json"),
    JSON.stringify(report, null, 2),
  );

  writeFileSync(
    resolve(OUTPUT_DIR, "all-decompositions.json"),
    JSON.stringify(allResults, null, 2),
  );

  // Print summary
  console.log("\n=== ANALYSIS SUMMARY ===");
  console.log(`Total tokens: ${report.summary.total}`);
  console.log(`Active public: ${report.summary.active}`);
  console.log(`Deprecated: ${report.summary.deprecated}`);
  console.log(`Private: ${report.summary.private}`);
  console.log("\nActive tokens by confidence:");
  for (const [conf, count] of Object.entries(
    report.summary.activeByConfidence,
  )) {
    const pct =
      report.summary.active > 0
        ? ((count / report.summary.active) * 100).toFixed(1)
        : "0.0";
    console.log(`  ${conf}: ${count} (${pct}%)`);
  }
  console.log(
    `\nRoundtrip rate (active): ${report.summary.roundtripRate.active}`,
  );

  console.log("\n=== STRUCTURAL GAPS ===");
  for (const [type, data] of Object.entries(report.structuralGaps)) {
    console.log(`\n  ${type} (${data.count} tokens):`);
    console.log(`    ${data.description}`);
    for (const ex of data.examples.slice(0, 3)) {
      console.log(`    - ${ex.token}`);
    }
  }

  console.log("\n=== TOP UNMATCHED SEGMENTS ===");
  for (const item of report.unmatchedSegments.slice(0, 20)) {
    console.log(`  "${item.segment}" (${item.count}x) e.g. ${item.tokens[0]}`);
  }

  console.log(`\nFull report written to: output/analysis-report.json`);
  console.log(`All decompositions written to: output/all-decompositions.json`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
