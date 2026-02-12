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

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateComponentMarkdown } from "./components.js";
import { generateTokenMarkdown } from "./tokens.js";
import { generateRegistryMarkdown } from "./registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output");

async function main() {
  const componentCount = await generateComponentMarkdown(OUTPUT_DIR);
  const tokenCount = await generateTokenMarkdown(OUTPUT_DIR);
  const registryCount = await generateRegistryMarkdown(OUTPUT_DIR);
  console.log(
    `Generated: ${componentCount} component(s), ${tokenCount} token(s), ${registryCount} registry entries.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
