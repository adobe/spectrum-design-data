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

import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const siteOutputDir = join(projectRoot, "../../site/release-timeline");

try {
  console.log("🏗️  Building release timeline for site deployment...");

  // Ensure output directory exists
  if (!existsSync(siteOutputDir)) {
    mkdirSync(siteOutputDir, { recursive: true });
  }

  // Ensure data directory exists
  const dataOutputDir = join(siteOutputDir, "data");
  if (!existsSync(dataOutputDir)) {
    mkdirSync(dataOutputDir, { recursive: true });
  }

  // Copy HTML file
  copyFileSync(
    join(projectRoot, "index.html"),
    join(siteOutputDir, "index.html"),
  );
  console.log("✅ Copied index.html");

  // Copy data file
  copyFileSync(
    join(projectRoot, "public/data/releases.json"),
    join(dataOutputDir, "releases.json"),
  );
  console.log("✅ Copied releases.json");

  console.log("🎉 Release timeline built successfully!");
  console.log(`📁 Output directory: ${siteOutputDir}`);
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
