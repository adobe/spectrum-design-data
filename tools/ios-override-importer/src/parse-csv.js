// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Minimal quote-aware CSV parser for override-log.csv. Values contain commas
 * inside quoted fields (e.g. "ColorSet(light: Color(59, 99, 251, 1.0), ...)"),
 * so a naive `split(',')` corrupts every row. ponytail: hand-rolled instead of
 * a dependency — this file's shape (quoted fields, no embedded newlines, no
 * escaped quotes) is small enough that a real CSV parser would be overkill.
 */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const [header, ...rows] = lines.map(parseLine);
  return rows.map((fields) =>
    Object.fromEntries(header.map((key, i) => [key, fields[i] ?? ""])),
  );
}

function parseLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}
