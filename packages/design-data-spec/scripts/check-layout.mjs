#!/usr/bin/env node
/**
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredPaths = [
  "spec/index.md",
  "spec/token-format.md",
  "spec/cascade.md",
  "spec/mode-sets.md",
  "spec/manifest.md",
  "spec/dataset-layout.md",
  "schemas/token.schema.json",
  "schemas/mode-set.schema.json",
  "schemas/manifest.schema.json",
  "schemas/dataset.schema.json",
  "schemas/value-types",
  "rules/rules.yaml",
  "conformance/valid",
  "conformance/invalid/SPEC-001",
  "conformance/invalid/SPEC-002",
  "conformance/invalid/SPEC-003",
  "conformance/invalid/SPEC-004",
  "conformance/invalid/SPEC-005",
  "conformance/invalid/SPEC-006",
  "conformance/invalid/SPEC-044",
  "conformance/valid/SPEC-044",
  "schemas/guideline.schema.json",
  "spec/guideline-format.md",
  "conformance/invalid/SPEC-045",
  "conformance/valid/SPEC-045",
  "conformance/invalid/SPEC-046",
  "conformance/generation/flat-token/input",
  "conformance/generation/flat-token/expected",
  "conformance/generation/mode-set-token/input",
  "conformance/generation/mode-set-token/expected",
  "spec/relationship-format.md",
  "schemas/relationship.schema.json",
  "conformance/invalid/SPEC-051",
  "conformance/invalid/SPEC-052",
  "conformance/invalid/SPEC-053",
  "conformance/invalid/SPEC-054",
  "conformance/invalid/SPEC-055",
  "conformance/invalid/SPEC-056",
  "conformance/invalid/SPEC-057",
  "conformance/valid/SPEC-051",
  "conformance/generation/ctr-legacy-key/input",
  "conformance/generation/ctr-legacy-key/relationships",
  "conformance/generation/ctr-legacy-key/expected",
];

for (const rel of requiredPaths) {
  await access(join(root, rel));
}

console.log("@adobe/design-data-spec layout OK");
