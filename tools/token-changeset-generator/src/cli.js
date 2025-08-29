#! /usr/bin/env node

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
import { generateTokenChangeset } from "./index.js";
import { readFileSync } from "fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const program = new Command();

program
  .name("token-changeset")
  .description(
    "Generate changeset files for Spectrum token changes from tokens studio PR data",
  )
  .version(packageJson.version);

program
  .command("generate")
  .description(
    "Generate a changeset from tokens studio and spectrum tokens PRs",
  )
  .requiredOption(
    "--tokens-studio-pr <url>",
    "GitHub PR URL from tokens studio repository",
  )
  .requiredOption(
    "--spectrum-tokens-pr <url>",
    "GitHub PR URL from spectrum tokens repository",
  )
  .option("--output <dir>", "Output directory for changeset file", ".changeset")
  .option(
    "--github-token <token>",
    "GitHub API token (can also be set via GITHUB_TOKEN env var)",
  )
  .action(async (options) => {
    try {
      const githubToken = options.githubToken || process.env.GITHUB_TOKEN;

      if (!githubToken) {
        console.warn(
          "⚠️  No GitHub token provided. API requests may be rate limited.",
        );
        console.warn(
          "   Set GITHUB_TOKEN environment variable or use --github-token option.",
        );
      }

      const changesetPath = await generateTokenChangeset({
        tokensStudioPR: options.tokensStudioPr,
        spectrumTokensPR: options.spectrumTokensPr,
        outputDir: options.output,
        githubToken,
      });

      console.log("🎉 Changeset generation completed successfully!");
      console.log(`📁 File created: ${changesetPath}`);
    } catch (error) {
      console.error("❌ Error generating changeset:", error.message);
      process.exit(1);
    }
  });

// Only execute CLI when run directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
