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

import {
  sizes,
  states,
  variants,
  anatomyTerms,
  components,
  scaleValues,
  categories,
  platforms,
  navigationTerms,
  tokenTerminology,
  glossary,
} from "@adobe/design-system-registry";
import { writeFile, mkdir } from "fs/promises";

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
description: ${description}
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
