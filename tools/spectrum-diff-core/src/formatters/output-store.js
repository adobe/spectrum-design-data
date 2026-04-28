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

import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Store output to a file, creating directories if needed
 * @param {string} content - Content to write
 * @param {string} filePath - Path to write to
 * @throws {Error} If write operation fails
 */
export async function storeOutput(content, filePath) {
  try {
    // Create directory if it doesn't exist
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    // Write the file
    await writeFile(filePath, content, "utf8");
  } catch (error) {
    throw new Error(`Failed to write output to ${filePath}: ${error.message}`);
  }
}
