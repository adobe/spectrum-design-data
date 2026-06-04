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

import sizes from "@adobe/spectrum-design-data/registry/sizes.json" with { type: "json" };
import states from "@adobe/spectrum-design-data/registry/states.json" with { type: "json" };
import variants from "@adobe/spectrum-design-data/registry/variants.json" with { type: "json" };
import anatomyTerms from "@adobe/spectrum-design-data/registry/anatomy-terms.json" with { type: "json" };
import components from "@adobe/spectrum-design-data/registry/components.json" with { type: "json" };
import scaleValues from "@adobe/spectrum-design-data/registry/scale-values.json" with { type: "json" };
import categories from "@adobe/spectrum-design-data/registry/categories.json" with { type: "json" };
import platforms from "@adobe/spectrum-design-data/registry/platforms.json" with { type: "json" };
import navigationTerms from "@adobe/spectrum-design-data/registry/navigation-terms.json" with { type: "json" };
import tokenTerminology from "@adobe/spectrum-design-data/registry/token-terminology.json" with { type: "json" };
import glossary from "@adobe/spectrum-design-data/registry/glossary.json" with { type: "json" };
import { writeFile, mkdir } from "fs/promises";
import { BASE_SOURCE_URL } from "./constants.js";

const REGISTRIES = [
  { key: "sizes", data: sizes, title: "Sizes" },
  { key: "states", data: states, title: "States" },
  { key: "variants", data: variants, title: "Variants" },
  { key: "anatomy-terms", data: anatomyTerms, title: "Anatomy terms" },
  { key: "components", data: components, title: "Components" },
  { key: "scale-values", data: scaleValues, title: "Scale values" },
  { key: "categories", data: categories, title: "Categories" },
  { key: "platforms", data: platforms, title: "Platforms" },
  { key: "navigation-terms", data: navigationTerms, title: "Navigation terms" },
  {
    key: "token-terminology",
    data: tokenTerminology,
    title: "Token terminology",
  },
  { key: "glossary", data: glossary, title: "Glossary" },
];

function formatValueRow(value) {
  const id = value.id ?? "-";
  const label = value.label ?? "-";
  const description = value.description ?? "-";
  const aliases =
    value.aliases && value.aliases.length > 0 ? value.aliases.join(", ") : "-";
  return `| ${id} | ${label} | ${description} | ${aliases} |`;
}

function formatGlossaryRow(value) {
  const id = value.id ?? "-";
  const label = value.label ?? "-";
  const description = value.description ?? "-";
  const defDesc = value.definition?.description ?? "-";
  return `| ${id} | ${label} | ${description} | ${defDesc} |`;
}

export async function generateRegistryMarkdown(outputDir) {
  const outRegistry = `${outputDir}/registry`;
  await mkdir(outRegistry, { recursive: true });

  let total = 0;
  for (const { key, data, title } of REGISTRIES) {
    const description = data.description || `Registry: ${title}`;
    const values = data.values || [];
    const tags = ["registry", key];

    let table;
    if (key === "glossary" && values.some((v) => v.definition)) {
      const rows = values.map(formatGlossaryRow);
      table = `\n| ID | Label | Description | Definition |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
    } else {
      const rows = values.map(formatValueRow);
      table = `\n| ID | Label | Description | Aliases |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
    }

    const frontmatter = `---
title: ${title}
description: ${JSON.stringify(description)}
source_url: ${BASE_SOURCE_URL}/registry/${key}/
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---

${table}
`;

    await writeFile(`${outRegistry}/${key}.md`, frontmatter, "utf8");
    total += values.length;
  }

  return total;
}
