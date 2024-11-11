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
      mkdirSync(outputDirectory, { recursive: true });
    }

    writeFileSync(filePath, output);
  } catch (error) {
    console.log("FAILED TO WRITE OUTPUT FILE: " + filePath);
    console.error(error);
  }
}
