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

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

export default function storeOutput(filePath, output) {
  try {
    const outputDirectory = filePath.slice(0, filePath.lastIndexOf(path.sep));
    if (!existsSync(outputDirectory)) {
      try {
        mkdirSync(outputDirectory, { recursive: true });
      } catch (dirError) {
        if (dirError.code === "EACCES") {
          throw new Error(
            `Permission denied creating directory "${outputDirectory}". Check directory permissions.`,
          );
        } else if (dirError.code === "ENOTDIR") {
          throw new Error(
            `Cannot create directory "${outputDirectory}": a file with this name already exists.`,
          );
        } else {
          throw new Error(
            `Failed to create output directory "${outputDirectory}": ${dirError.message}`,
          );
        }
      }
    }

    try {
      writeFileSync(filePath, output);
    } catch (writeError) {
      if (writeError.code === "EACCES") {
        throw new Error(
          `Permission denied writing to file "${filePath}". Check file and directory permissions.`,
        );
      } else if (writeError.code === "ENOSPC") {
        throw new Error(`Not enough disk space to write file "${filePath}".`);
      } else if (writeError.code === "EISDIR") {
        throw new Error(
          `Cannot write to "${filePath}": it is a directory, not a file.`,
        );
      } else {
        throw new Error(
          `Failed to write output file "${filePath}": ${writeError.message}`,
        );
      }
    }
  } catch (error) {
    const contextualError = error.message.includes("Failed to")
      ? error.message
      : `Output file operation failed for "${filePath}": ${error.message}`;

    console.error(contextualError);

    // Re-throw to allow calling code to handle appropriately
    throw error;
  }
}
