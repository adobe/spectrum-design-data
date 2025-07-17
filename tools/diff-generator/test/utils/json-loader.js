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

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads a JSON file from the test-schemas directory
 * @param {string} filename - The name of the JSON file to load
 * @returns {object} - The parsed JSON data
 */
export function loadTestSchema(filename) {
  const filePath = resolve(__dirname, "../test-schemas", filename);
  const data = readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

/**
 * Loads a JSON file from a relative path
 * @param {string} relativePath - The relative path to the JSON file
 * @returns {object} - The parsed JSON data
 */
export function loadJSON(relativePath) {
  const filePath = resolve(__dirname, relativePath);
  const data = readFileSync(filePath, "utf8");
  return JSON.parse(data);
}
