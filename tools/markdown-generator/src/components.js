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

import { getAllSchemas } from "@adobe/spectrum-component-api-schemas";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

export async function generateComponentMarkdown(outputDir) {
  const schemas = await getAllSchemas();
  const componentSchemas = schemas.filter(
    (s) => s.slug && s.meta?.documentationUrl,
  );
  const outComponents = `${outputDir}/components`;
  await mkdir(outComponents, { recursive: true });

  for (const schema of componentSchemas) {
    const slug = schema.slug;
    const title = schema.title || slug;
    const description = schema.description || "";
    const category = schema.meta?.category || "";
    const documentationUrl = schema.meta?.documentationUrl || "";
    const tags = ["component", "schema", category].filter(Boolean);

    const rows = [];
    if (schema.properties && typeof schema.properties === "object") {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const type = propSchema.type || (propSchema.enum ? "enum" : "-");
        const values = propSchema.enum ? propSchema.enum.join(", ") : "-";
        const defaultVal =
          propSchema.default !== undefined ? String(propSchema.default) : "-";
        const required = schema.required?.includes(propName) ? "Yes" : "No";
        const desc = propSchema.description || "-";
        rows.push(
          `| ${propName} | ${type} | ${values} | ${defaultVal} | ${required} | ${desc} |`,
        );
      }
    }

    const table =
      rows.length > 0
        ? `\n| Property | Type | Values | Default | Required | Description |\n| --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`
        : "";

    const body = `${description}\n${table}`.trim();
    const safeDesc = description
      .replace(/\n/g, " ")
      .slice(0, 160)
      .replace(/"/g, '\\"');
    const frontmatter = `---
title: ${title}
description: "${safeDesc}"
category: ${category}
documentationUrl: ${documentationUrl}
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---

${body}
`;

    await writeFile(`${outComponents}/${slug}.md`, frontmatter, "utf8");
  }

  return componentSchemas.length;
}
