// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "./registry-index.js";
import { decompose, serialize } from "./decomposer.js";
import { generateReport } from "./report.js";
import { analyzeProperty } from "./property-atomicity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Structured cascade tree (inline name objects) — the source of truth for
// decomposition state. The legacy flat-key tree (packages/tokens/src) is
// stale here: apply.js already extracts fields into this tree, so analyzing
// the legacy tree would re-report fields as "residual" that are already
// migrated. See spectrum-design-data-dsi.
const TOKENS_DIR = resolve(__dirname, "../../../packages/design-data/tokens");
const OUTPUT_DIR = resolve(__dirname, "../output");

const TOKEN_FILES = readdirSync(TOKENS_DIR)
  .filter((f) => f.endsWith(".tokens.json"))
  .sort();

async function main() {
  console.log("Loading registries...");
  const registry = loadRegistries();

  console.log("Registry loaded:");
  for (const [field, ids] of Object.entries(registry.byField)) {
    console.log(`  ${field}: ${ids.size} values`);
  }

  console.log("\nAnalyzing tokens...");
  const allResults = [];
  // spectrum-design-data-284.1: property-fusion detection is independent of
  // roundtrip/allowlist status, so it runs against the authored
  // `token.name.property` directly rather than reusing `decompose()`'s
  // confidence/roundtrip machinery.
  const fusionResults = [];

  for (const filename of TOKEN_FILES) {
    const filePath = resolve(TOKENS_DIR, filename);
    const tokens = JSON.parse(readFileSync(filePath, "utf-8"));
    // String-name tokens (the escape hatch, proposal 011) have no fields to
    // decompose and are already tracked by token-naming-audit's
    // scan-string-names.js — skip them here.
    const namedTokens = tokens.filter((t) => typeof t.name === "object");
    console.log(`\n  ${filename}: ${namedTokens.length} tokens`);

    for (const token of namedTokens) {
      // A `name.legacyKey` pin is the authored ground truth (mirrors
      // sdk/core/src/naming.rs's extract_legacy_key, which checks it first):
      // it's set explicitly to freeze the published legacy key independent of
      // however the rest of the name object decomposes. serialize() is only a
      // fallback for tokens with no pin.
      const legacyKey =
        token.name.legacyKey ||
        serialize(
          token.name,
          registry.tokenNameMap,
          registry.serializationOrder,
        );
      if (!legacyKey) {
        console.warn(
          `  WARNING: could not reconstruct legacy key for token in ${filename} (name: ${JSON.stringify(token.name)}) — dropped from report`,
        );
        continue;
      }

      const result = decompose(
        legacyKey,
        {
          deprecated: !!token.deprecated,
          private: !!token.private,
          component: token.name.component,
          icon: token.name.icon,
          pinned: !!token.name.legacyKey,
        },
        registry,
        filename,
      );
      allResults.push(result);

      if (token.name.property) {
        const fusion = analyzeProperty(token.name.property, registry);
        if (fusion.fused) {
          fusionResults.push({
            token: legacyKey,
            file: filename,
            property: fusion.property,
            fields: fusion.fields,
            bucket: fusion.bucket,
            deprecated: !!token.deprecated,
            private: !!token.private,
          });
        }
      }
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

  // spectrum-design-data-284.1: property-fusion inventory, independent of
  // roundtrip/naming-exceptions status. See src/property-atomicity.js.
  const activeFusion = fusionResults.filter((r) => !r.deprecated && !r.private);
  const fusionByBucket = {};
  for (const r of activeFusion) {
    (fusionByBucket[r.bucket] ??= []).push(r);
  }
  writeFileSync(
    resolve(OUTPUT_DIR, "property-fusion-inventory.json"),
    JSON.stringify(
      {
        total: fusionResults.length,
        active: activeFusion.length,
        byBucket: Object.fromEntries(
          Object.entries(fusionByBucket).map(([bucket, tokens]) => [
            bucket,
            tokens.length,
          ]),
        ),
        tokens: fusionResults,
      },
      null,
      2,
    ),
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

  console.log(
    "\n=== PROPERTY FUSION (spectrum-design-data-284.1, independent of roundtrip) ===",
  );
  console.log(`Fused properties (active): ${activeFusion.length}`);
  for (const [bucket, tokens] of Object.entries(fusionByBucket)) {
    console.log(`  ${bucket}: ${tokens.length}`);
    for (const ex of tokens.slice(0, 3)) {
      console.log(`    - ${ex.token} (${ex.file})`);
    }
  }

  console.log(`\nFull report written to: output/analysis-report.json`);
  console.log(`All decompositions written to: output/all-decompositions.json`);
  console.log(
    `Property fusion inventory written to: output/property-fusion-inventory.json`,
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
