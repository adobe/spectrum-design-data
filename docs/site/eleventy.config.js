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

import { HtmlBasePlugin } from "@11ty/eleventy";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { siteName, siteDescription } from "./src/data/meta.js";
import navigation from "./src/data/navigation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pathPrefix = "/spectrum-design-data";
const outputDir = resolve(__dirname, "../../site");

export default async function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  // Generated .md in src/components, tokens, registry are in .gitignore; we still want 11ty to process them
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.setLiquidOptions({ jsTruthy: true });
  eleventyConfig.addPlugin(HtmlBasePlugin, { pathPrefix });

  eleventyConfig.addGlobalData("pathPrefix", pathPrefix);
  eleventyConfig.addGlobalData("siteName", siteName);
  eleventyConfig.addGlobalData("siteDescription", siteDescription);
  eleventyConfig.addGlobalData("navigation", navigation);

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "public/favicon.png": "favicon.png" });
  eleventyConfig.addPassthroughCopy({ "public/.nojekyll": ".nojekyll" });

  eleventyConfig.addCollection("components", function (api) {
    return api.getFilteredByGlob("src/components/**/*.md");
  });
  eleventyConfig.addCollection("tokens", function (api) {
    return api.getFilteredByGlob("src/tokens/**/*.md");
  });
  eleventyConfig.addCollection("registry", function (api) {
    return api.getFilteredByGlob("src/registry/**/*.md");
  });

  return {
    pathPrefix,
    dir: {
      input: "src",
      output: outputDir,
      data: "data",
      includes: "includes",
      layouts: "layouts",
    },
  };
}
