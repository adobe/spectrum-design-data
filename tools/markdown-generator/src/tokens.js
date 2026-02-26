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

import { basename } from "path";
import {
  tokenFileNames,
  getFileTokens,
  getAllTokens,
} from "@adobe/spectrum-tokens";
import {
  buildTokenFileMap,
  buildTokenMap,
  getTokenDisplayInfo,
  getTokenPageForName,
} from "./token-resolver.js";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { BASE_SOURCE_URL } from "./constants.js";

const ALIAS_PATTERN = /^\{([^}]+)\}$/;

/** Short descriptions for each token file so the tokens list differentiates them. */
const TOKEN_FILE_DESCRIPTIONS = {
  "color-aliases":
    "Semantic color tokens that reference the palette (e.g. focus, overlay).",
  "color-palette": "Raw color values (hex/rgb) for the Spectrum palette.",
  "color-component": "Component-specific color tokens.",
  "semantic-color-palette":
    "Semantic palette tokens (e.g. semantic blue, semantic red).",
  typography:
    "Font families, weights, sizes, letter spacing, and text alignment.",
  layout: "Spacing, dimensions, corner radius, and other layout primitives.",
  "layout-component": "Component-specific layout tokens.",
  icons:
    "Color tokens for Spectrum icons (primary, hover, down, background, disabled).",
};

function formatValueDisplay(value, valueLink) {
  if (value == null) return "-";
  const str = String(value);
  if (valueLink && str.match(ALIAS_PATTERN)) {
    return `[${str}](${valueLink})`;
  }
  return str;
}

function formatResolvedDisplay(resolved) {
  if (resolved == null) return "-";
  if (typeof resolved === "object" && !Array.isArray(resolved)) {
    return Object.entries(resolved)
      .map(([k, v]) => {
        const str =
          typeof v === "object" && v && "resolved" in v
            ? (v.resolved ?? v.value ?? "-")
            : (v ?? "-");
        return `${k}: ${str}`;
      })
      .join("; ");
  }
  return String(resolved);
}

export async function generateTokenMarkdown(outputDir) {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();
  const allTokens = await getAllTokens();
  const outTokens = `${outputDir}/tokens`;
  await mkdir(outTokens, { recursive: true });

  const fileToTokens = new Map();
  for (const filePath of tokenFileNames) {
    const fileName = basename(filePath);
    const fileKey = basename(fileName, ".json");
    const data = await getFileTokens(fileName);
    fileToTokens.set(fileKey, data);
  }

  let total = 0;
  for (const [fileKey, tokens] of fileToTokens) {
    const rawTitle = fileKey.replace(/-/g, " ");
    const title =
      rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
    const description =
      TOKEN_FILE_DESCRIPTIONS[fileKey] || `Design tokens from ${fileKey}.json`;
    const tags = ["tokens", fileKey];

    const rows = [];
    for (const [tokenName, token] of Object.entries(tokens)) {
      const info = getTokenDisplayInfo(tokenMap, fileMap, tokenName, token);
      const valueDisplay = formatValueDisplay(info.value, info.valueLink);
      const resolvedDisplay = formatResolvedDisplay(info.resolved);
      const deprecated = token.deprecated ? "Yes" : "No";
      const deprecatedComment = token.deprecated_comment || "-";
      let renamedCell = "-";
      if (token.renamed) {
        renamedCell = info.renamedLink
          ? `Replaced by [${token.renamed}](${info.renamedLink})`
          : `Replaced by ${token.renamed}`;
      }
      const anchor = `<a id="${tokenName}"></a>`;
      rows.push(
        `| ${anchor} ${tokenName} | ${valueDisplay} | ${resolvedDisplay} | ${deprecated} | ${deprecatedComment} | ${renamedCell} |`,
      );
    }

    const table = `\n| Token | Value | Resolved | Deprecated | Deprecated comment | Replaced by |\n| --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`;

    const safeDesc = description.replace(/"/g, '\\"');
    const frontmatter = `---
title: ${title}
description: "${safeDesc}"
source_url: ${BASE_SOURCE_URL}/tokens/${fileKey}/
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---

${table}
`;

    await writeFile(`${outTokens}/${fileKey}.md`, frontmatter, "utf8");
    total += Object.keys(tokens).length;
  }

  return total;
}
