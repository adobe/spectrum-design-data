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
import { cssConfig } from "./config/plugins/css-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pathPrefix = "/spectrum-design-data";
const outputDir = resolve(__dirname, "../../site");

export default async function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  // Generated .md in src/components, tokens, registry are in .gitignore; we still want 11ty to process them
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.setLiquidOptions({ jsTruthy: true });
  eleventyConfig.addPlugin(HtmlBasePlugin, { pathPrefix });
  eleventyConfig.addPlugin(cssConfig, {
    outputPath: resolve(outputDir, "assets", "css", "index.css"),
  });

  eleventyConfig.addGlobalData("siteName", siteName);
  eleventyConfig.addGlobalData("siteDescription", siteDescription);
  eleventyConfig.addGlobalData("navigation", navigation);

  eleventyConfig.addPassthroughCopy({ "public/favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({
    "public/adobe_logo.svg": "adobe_logo.svg",
  });
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

  // Apply spectrum-Link to anchors in main article (body content) so links use Spectrum link styling
  eleventyConfig.addTransform("spectrum-body-links", (content, outputPath) => {
    if (typeof content !== "string" || !outputPath?.endsWith(".html"))
      return content;
    return content.replace(
      /<article[^>]*>([\s\S]*?)<\/article>/g,
      (articleBlock) =>
        articleBlock.replace(/<a(\s)/g, '<a class="spectrum-Link"$1'),
    );
  });

  // Apply Spectrum table classes to token, component, and registry pages so markdown tables use @spectrum-css/table
  eleventyConfig.addTransform("spectrum-tables", (content, outputPath) => {
    if (
      !outputPath ||
      (!outputPath.includes("/tokens/") &&
        !outputPath.includes("/components/") &&
        !outputPath.includes("/registry/"))
    )
      return content;
    return content
      .replace(
        /<table(\s|>)/g,
        '<table class="spectrum-Table spectrum-Table--sizeM"$1',
      )
      .replace(/<thead(\s|>)/g, '<thead class="spectrum-Table-head"$1')
      .replace(/<th(\s|>)/g, '<th class="spectrum-Table-headCell"$1')
      .replace(/<tbody(\s|>)/g, '<tbody class="spectrum-Table-body"$1')
      .replace(/<td(\s|>)/g, '<td class="spectrum-Table-cell"$1')
      .replace(
        /<tbody class="spectrum-Table-body">\s*<tr>(\s*)<td/g,
        '<tbody class="spectrum-Table-body">\n<tr class="spectrum-Table-row">$1<td',
      )
      .replace(
        /(<\/tr>\s*)<tr>(\s*)<td/g,
        '$1<tr class="spectrum-Table-row">$2<td',
      );
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
