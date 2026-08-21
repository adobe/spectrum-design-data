// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { matchPaletteSlug, resolveTarget } from "../src/resolve-target.js";

const FAMILIES = new Set(["blue", "static-blue"]);

test("matchPaletteSlug recognizes a known family + numeric index", (t) => {
  t.deepEqual(matchPaletteSlug("blue-1000", FAMILIES), {
    colorFamily: "blue",
    scaleIndex: 1000,
  });
});

test("matchPaletteSlug rejects an unknown family", (t) => {
  t.is(matchPaletteSlug("mauve-1000", FAMILIES), null);
});

test("matchPaletteSlug rejects a slug with no trailing digits", (t) => {
  t.is(matchPaletteSlug("blue", FAMILIES), null);
});

test("resolveTarget uses the token's own name when it resolves", (t) => {
  const decompose = (slug) =>
    slug === "accent-color-1000" ? { property: "accent-color-1000" } : null;
  const result = resolveTarget(
    { "Token Name": "accent-color-1000", Aliases: "" },
    { decompose, colorFamilies: FAMILIES },
  );
  t.is(result.slug, "accent-color-1000");
});

test("resolveTarget falls back through the Aliases chain in order", (t) => {
  const decompose = () => null; // never a semantic-name match in this test
  const result = resolveTarget(
    {
      "Token Name": "accent-content-color-down",
      Aliases: "accent-color-1000, blue-1000",
    },
    { decompose, colorFamilies: FAMILIES },
  );
  // "accent-color-1000" isn't a palette slug (family "accent-color" unknown) and
  // decompose() returns null, so it falls through to "blue-1000".
  t.deepEqual(result, {
    slug: "blue-1000",
    name: { colorFamily: "blue", scaleIndex: 1000 },
  });
});

test("resolveTarget prefers a palette match over calling decompose", (t) => {
  let called = false;
  const decompose = () => {
    called = true;
    return null;
  };
  const result = resolveTarget(
    { "Token Name": "blue-1000", Aliases: "" },
    { decompose, colorFamilies: FAMILIES },
  );
  t.is(result.slug, "blue-1000");
  t.false(called);
});

test("resolveTarget reports unresolved candidates when nothing matches", (t) => {
  const decompose = () => null;
  const result = resolveTarget(
    { "Token Name": "totally-unknown-slug", Aliases: "also-unknown" },
    { decompose, colorFamilies: FAMILIES },
  );
  t.is(result.slug, null);
  t.deepEqual(result.candidates, ["totally-unknown-slug", "also-unknown"]);
});
