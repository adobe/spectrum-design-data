/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function renderReport(stringNames, propertyValues) {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const unrecorded = stringNames.filter((r) => r.status === "unrecorded");
  const known = stringNames.filter((r) => r.status === "known");

  const lines = [
    `# Token naming audit`,
    ``,
    `Generated: ${generatedAt}`,
    ``,
    `| Category | Count |`,
    `|---|---|`,
    `| String-name tokens (unrecorded) | ${unrecorded.length} |`,
    `| String-name tokens (known exceptions) | ${known.length} |`,
    `| Overloaded \`property\` values | ${propertyValues.length} |`,
    ``,
    `**References:** [RFC #806](https://github.com/adobe/spectrum-design-data/discussions/806) · ` +
      `[SPEC-017 escalation #953](https://github.com/adobe/spectrum-design-data/issues/953) · ` +
      `[Property migration #941 / PR #955](https://github.com/adobe/spectrum-design-data/pull/955)`,
    ``,
    `---`,
    ``,
    `## String-form name tokens`,
    ``,
    `Tokens where \`name\` is a plain string instead of a structured name object.`,
    `SPEC-017 fires a warning for all of these; it graduates to **error** at spec 2.0.0.`,
    ``,
  ];

  // Unrecorded subsection
  lines.push(`### Unrecorded (action required)`);
  lines.push(``);

  if (unrecorded.length === 0) {
    lines.push(`_No unrecorded string-name tokens found._`);
    lines.push(``);
  } else {
    const byFile = groupBy(unrecorded, (r) => r.file);
    for (const [file, entries] of byFile) {
      lines.push(`**${file}**`);
      lines.push(``);
      lines.push(`| Token |`);
      lines.push(`|---|`);
      for (const entry of entries) {
        lines.push(`| \`${entry.token}\` |`);
      }
      lines.push(``);
    }
  }

  // Known exceptions subsection
  lines.push(`### Known exceptions (#953 scope)`);
  lines.push(``);

  if (known.length === 0) {
    lines.push(`_No known exceptions found._`);
    lines.push(``);
  } else {
    const byFile = groupBy(known, (r) => r.file);
    for (const [file, entries] of byFile) {
      lines.push(`**${file}**`);
      lines.push(``);
      lines.push(`| Token | Category | Reason |`);
      lines.push(`|---|---|---|`);
      for (const entry of entries) {
        lines.push(
          `| \`${entry.token}\` | ${entry.category ?? ""} | ${entry.reason ?? ""} |`,
        );
      }
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Overloaded \`property\` values`);
  lines.push(``);
  lines.push(
    `Tokens with a structured name object where \`name.property\` is not in ` +
      `[\`property-terms.json\`](packages/design-system-registry/registry/property-terms.json).`,
  );
  lines.push(
    `Migrate the value to the suggested field, or add it to the property-terms registry if it is a valid CSS/design-system attribute.`,
  );
  lines.push(``);

  if (propertyValues.length === 0) {
    lines.push(`_No overloaded property values found._`);
    lines.push(``);
  } else {
    const byFile = groupBy(propertyValues, (r) => r.file);
    for (const [file, entries] of byFile) {
      lines.push(`**${file}**`);
      lines.push(``);
      lines.push(`| Token | Current \`property\` | Suggested field |`);
      lines.push(`|---|---|---|`);
      for (const entry of entries) {
        lines.push(
          `| \`${entry.token}\` | \`${entry.propertyValue}\` | ${entry.suggestedField ? `\`${entry.suggestedField}\`` : "—"} |`,
        );
      }
      lines.push(``);
    }
  }

  return lines.join("\n");
}
