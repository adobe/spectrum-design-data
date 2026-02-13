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

import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssImportExtGlob from "postcss-import-ext-glob";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

export const cssConfig = (eleventyConfig, options = {}) => {
  const outputPath =
    options.outputPath ||
    path.join(process.cwd(), "..", "..", "site", "assets", "css", "index.css");

  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async (inputContent, inputPath) => {
      if (inputPath.endsWith("index.css")) {
        return async () => {
          const result = await postcss([
            postcssImportExtGlob,
            postcssImport,
            autoprefixer,
            cssnano,
          ]).process(inputContent, { from: inputPath });

          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, result.css);

          return result.css;
        };
      }
    },
  });
};
