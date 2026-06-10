/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

/**
 * Format `obj` as JSON with Prettier (using the file's own config) and write to `filePath`.
 * Uses 2-space indent, trailing newline — matches the repo's existing JSON style.
 *
 * @param {string} filePath - absolute path to write
 * @param {object} obj - plain object to serialize
 */
export async function writeJson(filePath, obj) {
  const prettierCfg = (await resolveConfig(filePath)) ?? {};
  const out = await format(JSON.stringify(obj), {
    ...prettierCfg,
    parser: "json",
    filepath: filePath,
  });
  writeFileSync(filePath, out, "utf8");
}
