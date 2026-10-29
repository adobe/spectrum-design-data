// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { spectrumIconLoaders } from "../src/features/icons/spectrumIconCatalog.generated";
import {
  isSpectrumIconName,
  spectrumIconNames,
} from "../src/features/icons/spectrumIconNames.generated";
import {
  createElement,
  isStructureElement,
  UI_GLYPHS,
} from "../src/features/structures/elements";

assert.deepEqual([...spectrumIconNames], Object.keys(spectrumIconLoaders));
assert.equal(new Set(spectrumIconNames).size, spectrumIconNames.length);
const workflow = createElement(
  "workflowIcon",
  "f0000000-0000-4000-8000-000000000001",
);
const ui = createElement("uiIcon", "f0000000-0000-4000-8000-000000000002");
for (const name of spectrumIconNames) {
  assert.equal(isSpectrumIconName(name), true);
  assert.equal(isStructureElement({ ...workflow, glyph: name }), true);
  assert.equal(
    isStructureElement({ ...ui, glyph: name }),
    UI_GLYPHS.some((glyph) => glyph === name),
  );
}
for (const value of [
  "",
  "not-an-icon",
  "constructor",
  "toString",
  "__proto__",
  "home",
  null,
  undefined,
  1,
  {},
]) {
  assert.equal(isSpectrumIconName(value), false);
  assert.equal(isStructureElement({ ...workflow, glyph: value }), false);
}
console.log(
  "Worker-safe icon names exactly match every public lazy icon loader and preserve strict membership.",
);
