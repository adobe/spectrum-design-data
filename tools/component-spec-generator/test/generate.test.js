// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.
import test from "ava";
import { generateComponentSpec, parseDensitySize } from "../src/index.js";

test("parseDensitySize matches the longest size suffix, not a substring of it", (t) => {
  t.deepEqual(parseDensitySize("top-to-text-compact-medium"), {
    density: "compact",
    size: "medium",
  });
  t.deepEqual(parseDensitySize("base-padding-vertical-extra-large"), {
    density: "default",
    size: "extra-large",
  });
  t.deepEqual(parseDensitySize("corner-radius-medium-size-small"), {
    density: "default",
    size: "small",
  });
  t.deepEqual(parseDensitySize("no-size-here"), {
    density: "default",
    size: null,
  });
});

test("generateComponentSpec: accordion resolves its size/density variants to live values", async (t) => {
  const spec = await generateComponentSpec("accordion");

  t.is(spec.displayName, "Accordion");
  t.true(spec.groups.length > 0);

  const topToText = spec.groups.find(
    (g) => g.label === "Spacing (top edge to text)",
  );
  t.truthy(topToText, "expected a 'Spacing (top edge to text)' group");

  const compactSmall = topToText.rows.find(
    (r) => r.density === "compact" && r.size === "small",
  );
  t.truthy(compactSmall);
  t.is(compactSmall.tokenName, "base-padding-vertical-small");
  t.is(compactSmall.values.desktop, "4px");
  t.is(compactSmall.values.mobile, "4px");

  const defaultMedium = topToText.rows.find(
    (r) => r.density === "default" && r.size === "medium",
  );
  t.truthy(defaultMedium);
  t.is(defaultMedium.tokenName, "base-padding-vertical-medium");
  t.is(defaultMedium.values.desktop, "7px");
});

test("generateComponentSpec: dangling/malformed CTR rows are bucketed as unmapped, not dropped silently", async (t) => {
  const spec = await generateComponentSpec("accordion");
  t.true(spec.unmapped.length > 0);
  for (const entry of spec.unmapped) {
    t.truthy(entry.reason);
  }
});

test("generateComponentSpec: unknown component returns an empty, well-formed spec", async (t) => {
  const spec = await generateComponentSpec("not-a-real-component");
  t.deepEqual(spec.groups, []);
  t.deepEqual(spec.unmapped, []);
});
