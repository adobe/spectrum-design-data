#!/usr/bin/env node
/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../../../docs/s2-docs");
const dest = join(__dirname, "../data");

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  console.error("Run 'moon run s2-docs-mcp:index' first to generate the docs.");
  process.exit(1);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true });
}

cpSync(src, dest, { recursive: true });
console.log(`Bundled s2-docs → data/ (${dest})`);
