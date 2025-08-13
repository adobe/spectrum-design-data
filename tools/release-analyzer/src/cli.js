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
import { writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { analyzeReleases } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file if it exists
function loadEnvFile() {
  try {
    const envPath = join(__dirname, "../.env");
    const envContent = readFileSync(envPath, "utf8");

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  } catch (error) {
    // .env file doesn't exist, which is fine
  }
}

const program = new Command();

program
  .name("release-analyzer")
  .description(
    "Analyze Spectrum Tokens release history and generate visualization data",
  )
  .version("0.1.0");

program
  .command("analyze")
  .description("Analyze release history and output JSON data")
  .option("-o, --output <path>", "Output file path (defaults to stdout)")
  .option("-p, --pretty", "Pretty print JSON output")
  .option("-s, --stats-only", "Output only statistics, not full release data")
  .option(
    "--scope",
    "Include GitHub release data for change scope analysis (slower)",
  )
  .option(
    "--github-token <token>",
    "GitHub Personal Access Token to avoid rate limits",
  )
  .option("--repo-path <path>", "Path to git repository", ".")
  .action(async (options) => {
    try {
      console.log("📊 Analyzing releases...");

      // Load .env file first
      loadEnvFile();

      // Use provided token or fall back to environment variable
      const githubToken =
        options.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

      if (options.scope) {
        console.log("🔍 Fetching GitHub release data for scope analysis...");
        if (githubToken) {
          console.log("✅ Using GitHub token for API access");
        } else {
          console.log(
            "⚠️  No GitHub token found. Create a .env file with GITHUB_TOKEN to avoid rate limits.",
          );
        }
      }

      const analysis = await analyzeReleases(
        options.repoPath,
        options.scope,
        githubToken,
      );

      let output;
      if (options.statsOnly) {
        output = {
          stats: analysis.stats,
          timeline: analysis.timeline,
          snapshotFeatures: Object.keys(analysis.snapshotFeatures).map(
            (feature) => ({
              feature,
              count: analysis.snapshotFeatures[feature].length,
              releases: analysis.snapshotFeatures[feature].map((r) => ({
                tag: r.tag,
                date: r.date,
                timestamp: r.timestamp,
              })),
            }),
          ),
        };
      } else {
        output = analysis;
      }

      const jsonString = options.pretty
        ? JSON.stringify(output, null, 2)
        : JSON.stringify(output);

      if (options.output) {
        writeFileSync(options.output, jsonString);
        console.log(`Analysis written to ${options.output}`);
        console.log(`Total releases analyzed: ${analysis.stats.total}`);
        console.log(`  Legacy: ${analysis.stats.byType.legacy}`);
        console.log(`  Stable: ${analysis.stats.byType.stable}`);
        console.log(`  Beta: ${analysis.stats.byType.beta}`);
        console.log(`  Snapshot: ${analysis.stats.byType.snapshot}`);
      } else {
        console.log(jsonString);
      }
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("summary")
  .description("Show a quick summary of release statistics")
  .option("--repo-path <path>", "Path to git repository", ".")
  .action(async (options) => {
    try {
      const analysis = await analyzeReleases(options.repoPath);
      const { stats, snapshotFeatures } = analysis;

      console.log("📊 Spectrum Tokens Release Analysis Summary");
      console.log("==========================================");
      console.log(`Total Releases: ${stats.total}`);
      console.log(
        `Date Range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`,
      );
      console.log("");
      console.log("By Type:");
      console.log(`  🏛️  Legacy (v*):     ${stats.byType.legacy}`);
      console.log(`  ✅ Stable:          ${stats.byType.stable}`);
      console.log(`  🧪 Beta:            ${stats.byType.beta}`);
      console.log(`  📸 Snapshot:        ${stats.byType.snapshot}`);
      console.log("");
      console.log(`Snapshot Features (${stats.snapshotFeatures}):`);

      Object.entries(snapshotFeatures)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([feature, releases]) => {
          console.log(`  📁 ${feature}: ${releases.length} releases`);
        });
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
