// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { buildGapsReport } from "../src/gaps-report.js";

test("includes known vocabulary gaps and each unresolved row", (t) => {
  const md = buildGapsReport([
    {
      row: { "Token Name": "mystery-color", "Override Source": "switch.json" },
      candidates: ["mystery-color"],
    },
  ]);
  t.true(md.includes("Known vocabulary gaps"));
  t.true(md.includes("elevated"));
  t.true(md.includes("### mystery-color"));
  t.true(md.includes("Candidates tried: mystery-color"));
  t.true(md.includes("Source: switch.json"));
});

test("handles an empty unresolved list", (t) => {
  const md = buildGapsReport([]);
  t.true(md.includes("Unresolved rows (0)"));
});
