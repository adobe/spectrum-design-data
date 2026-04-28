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

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the path to the release analyzer
const analyzerPath = join(__dirname, "../../../tools/release-analyzer");
const outputPath = join(__dirname, "../public/data/releases.json");

try {
  console.log("🔄 Updating release timeline data...");

  // Run the release analyzer with scope analysis
  // The release-analyzer tool will handle loading its own .env file

  execSync(
    `node src/cli.js analyze --stats-only --scope --repo-path ../.. --pretty --output "${outputPath}"`,
    {
      cwd: analyzerPath,
      stdio: "inherit",
    },
  );

  console.log("✅ Release timeline data updated successfully!");
  console.log(`📊 Data written to: ${outputPath}`);
} catch (error) {
  console.error("❌ Error updating release timeline data:", error.message);
  process.exit(1);
}
