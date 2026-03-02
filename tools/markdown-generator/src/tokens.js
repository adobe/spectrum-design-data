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

/** Match rgb(...), rgba(...), or #hex color values. */
const COLOR_PATTERN = /^rgb\([^)]+\)$|^rgba\([^)]+\)$|^#[0-9a-fA-F]{3,8}$/;

/** Spectrum Code class for smaller, consistent code styling in Resolved column (spectrum-Code--sizeS). */
const CODE_CLASS = 'class="spectrum-Code spectrum-Code--sizeS"';

function isColorValue(str) {
  if (typeof str !== "string") return false;
  return COLOR_PATTERN.test(str.trim());
}

/** Detect rgba(...) with alpha less than 1 for checkerboard background. */
function isTransparentColor(str) {
  if (typeof str !== "string") return false;
  const m = str.trim().match(/^rgba\s*\(\s*[^)]+\s*\)$/);
  if (!m) return false;
  const inner = str.replace(/^rgba\s*\(\s*|\s*\)$/g, "");
  const parts = inner.split(/\s*,\s*/);
  const alpha = parseFloat(parts[3], 10);
  return Number.isFinite(alpha) && alpha < 1;
}

/**
 * Generate an inline SVG color swatch matching Spectrum 2 Swatch: 3px radius,
 * checkerboard for transparent colors, inset border at 42% opacity.
 * @param {string} colorStr - CSS color (e.g. rgb(75, 117, 255), rgba(0,0,0,0.5), #fff)
 * @returns {string} HTML img tag with embedded SVG
 */
function colorSwatch(colorStr) {
  const safe = colorStr.replace(/"/g, "'");
  const showCheckerboard = isTransparentColor(colorStr);
  const checkerboard = showCheckerboard
    ? '<rect width="16" height="16" fill="#fff"/><rect x="0" y="0" width="8" height="8" fill="#e1e1e1"/><rect x="8" y="8" width="8" height="8" fill="#e1e1e1"/>'
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">` +
    `<defs><clipPath id="c"><rect width="16" height="16" rx="3"/></clipPath></defs>` +
    `<g clip-path="url(#c)">` +
    checkerboard +
    `<rect width="16" height="16" fill="${safe}"/>` +
    `<rect width="15" height="15" x="0.5" y="0.5" rx="2.5" fill="none" stroke="rgba(0,0,0,0.42)" stroke-width="1"/>` +
    `</g></svg>`;
  const encoded = encodeURIComponent(svg);
  return `<img alt="" class="spectrum-TokenResolvedSwatch" style="display:inline;vertical-align:middle" src="data:image/svg+xml,${encoded}" />`;
}

/**
 * Extract schema slug and relative path from token.$schema URL.
 * @param {string} [schemaUrl] - e.g. "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json"
 * @returns {{ slug: string, path: string } | null} - e.g. { slug: "alias", path: "/schemas/token-types/alias.json" } or null
 */
function getSchemaTypeInfo(schemaUrl) {
  if (typeof schemaUrl !== "string" || !schemaUrl.trim()) return null;
  try {
    const url = new URL(schemaUrl);
    const schemasIdx = url.pathname.indexOf("/schemas/");
    const path =
      schemasIdx >= 0 ? url.pathname.slice(schemasIdx) : url.pathname;
    if (!path.includes("/schemas/")) return null;
    const slug =
      path
        .split("/")
        .pop()
        ?.replace(/\.json$/, "") ?? "";
    return slug ? { slug, path } : null;
  } catch {
    return null;
  }
}

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

function formatObjectDisplay(obj) {
  if (obj == null || typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) return obj.map(formatShadowItem).join(", ");
  return Object.entries(obj)
    .map(([k, v]) => {
      const val =
        v != null && typeof v === "object"
          ? formatObjectDisplay(v)
          : (v ?? "-");
      return `${k}: ${val}`;
    })
    .join("; ");
}

function formatValueDisplay(value, valueLink) {
  if (value == null) return "-";
  if (Array.isArray(value)) {
    return value.map(formatShadowItem).join(", ");
  }
  if (typeof value === "object") {
    return formatObjectDisplay(value);
  }
  const str = String(value);
  if (valueLink && str.match(ALIAS_PATTERN)) {
    return `[${str}](${valueLink})`;
  }
  return str;
}

function formatShadowItem(item) {
  if (item && typeof item === "object" && "x" in item && "y" in item) {
    const { x = "0", y = "0", blur = "0", spread = "0", color = "" } = item;
    return `${x} ${y} ${blur} ${spread} ${color}`.trim();
  }
  return String(item);
}

function formatResolvedDisplay(resolved) {
  if (resolved == null) return "-";
  if (Array.isArray(resolved)) {
    return resolved.map(formatShadowItem).join(", ");
  }
  if (typeof resolved === "object") {
    const lines = Object.entries(resolved).map(([k, v]) => {
      let str =
        typeof v === "object" && v && "resolved" in v
          ? (v.resolved ?? v.value ?? "-")
          : (v ?? "-");
      if (typeof str === "object" && str !== null && k in str) {
        str = str[k];
      }
      if (typeof str === "object" || typeof str === "undefined") {
        str = str == null ? "-" : formatObjectDisplay(str);
      }
      const displayStr = String(str);
      const swatch = isColorValue(displayStr)
        ? " " + colorSwatch(displayStr)
        : "";
      const valuePart = swatch
        ? `<span class="spectrum-TokenResolvedValue"><code ${CODE_CLASS}>${displayStr}</code>${swatch}</span>`
        : `<code ${CODE_CLASS}>${displayStr}</code>`;
      return `<code ${CODE_CLASS}>${k}</code>: ${valuePart}`;
    });
    return lines.join("<br>");
  }
  const displayStr = String(resolved);
  const swatch = isColorValue(displayStr) ? " " + colorSwatch(displayStr) : "";
  if (swatch) {
    return `<span class="spectrum-TokenResolvedValue"><code ${CODE_CLASS}>${displayStr}</code>${swatch}</span>`;
  }
  return `<code ${CODE_CLASS}>${displayStr}</code>`;
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
      const schemaInfo = getSchemaTypeInfo(token.$schema);
      const typeDisplay =
        schemaInfo !== null
          ? `<a href="${schemaInfo.path}" target="_blank">${schemaInfo.slug}</a>`
          : "-";
      const anchor = `<a id="${tokenName}"></a>`;
      rows.push(
        `| ${anchor} ${tokenName} | ${typeDisplay} | ${valueDisplay} | ${resolvedDisplay} | ${deprecated} | ${deprecatedComment} | ${renamedCell} |`,
      );
    }

    const table = `\n| Token | Type | Value | Resolved | Deprecated | Deprecated comment | Replaced by |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`;

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
