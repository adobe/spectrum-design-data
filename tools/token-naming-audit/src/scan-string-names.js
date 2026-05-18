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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "glob";

function loadExceptions(root) {
  const path = resolve(root, "packages/tokens/naming-exceptions.json");
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const entry of data.exceptions ?? []) {
    map.set(entry.token, { category: entry.category, reason: entry.reason });
  }
  return map;
}

export async function scanStringNames(root) {
  const exceptions = loadExceptions(root);

  const files = await glob("**/*.tokens.json", {
    cwd: root,
    ignore: ["**/node_modules/**", "**/dist/**"],
    absolute: true,
  });

  const results = [];

  for (const filePath of files) {
    let tokens;
    try {
      tokens = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      continue;
    }

    const entries = Array.isArray(tokens) ? tokens : [tokens];

    for (const token of entries) {
      if (typeof token.name !== "string") continue;

      const tokenName = token.name;
      const exc = exceptions.get(tokenName);

      results.push({
        token: tokenName,
        file: filePath.slice(root.length + 1),
        status: exc ? "known" : "unrecorded",
        ...(exc ?? {}),
      });
    }
  }

  return results;
}
