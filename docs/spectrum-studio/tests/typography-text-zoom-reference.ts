// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { scaleTypesAtom } from "../src/features/logic/scaleTypeLibrary";
import {
  generatedTypographyAtom,
  updateTextZoomAtom,
} from "../src/features/typography/state";
import {
  buildTypographyCss,
  TEXT_ZOOM_ATTRIBUTE,
} from "../src/features/typography/typographyCss";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { editModeAtom } from "../src/state/view/editMode";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { modeSetsAtom } from "../src/features/modes/state";
import { typeScaleWithRatios } from "./typography-fixtures";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";

interface ReferenceCase {
  userTextZoom: number;
  tokens: Record<string, number>;
}
const reference: ReferenceCase[] = JSON.parse(
  readFileSync(
    new URL("./fixtures/spectrum-density-text-zoom.json", import.meta.url),
    "utf8",
  ),
);
const formulas = typeScaleWithRatios(1.118, 1.069);
const fontSubset = (tokens: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(tokens).filter(([name]) => name.startsWith("font-size-")),
  );
const values = (tokens: ReturnType<typeof generateTypography>) =>
  Object.fromEntries(tokens.map((token) => [token.name, token.fontSize]));
function referenceStore() {
  const store = createStore();
  store.set(scaleTypesAtom, formulas);
  return store;
}
for (const { userTextZoom, tokens } of reference) {
  const expected = fontSubset(tokens);
  assert.deepEqual(
    values(
      generateTypography(
        TYPOGRAPHY_DEFAULTS,
        userTextZoom,
        RULE_DEFAULTS,
        formulas,
      ),
    ),
    expected,
  );
  for (const editing of [false, true]) {
    const store = referenceStore();
    store.set(editModeAtom, editing);
    store.set(updateTextZoomAtom, userTextZoom);
    assert.deepEqual(values(store.get(generatedTypographyAtom)), expected);
  }
  const css = buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
    scope: ".preview",
    purpose: "authoring",
    scaleTypes: formulas,
  });
  const block = css
    .split("\n\n")
    .find((chunk) =>
      chunk
        .split("{")[0]
        .includes(`[${TEXT_ZOOM_ATTRIBUTE}="${userTextZoom}"]`),
    )!;
  const declared = Object.fromEntries(
    [...block.matchAll(/--(font-size-\d+):\s*([\d.]+)rem;/g)].map(
      ([, name, value]) => [name, Number(value) * 16],
    ),
  );
  assert.deepEqual(declared, expected);
}
const byZoom = new Map(
  reference.map((entry) => [entry.userTextZoom, fontSubset(entry.tokens)]),
);
const store = referenceStore();
store.set(modeSelectionAtom, { textScaling: "mode-text-scaling-larger" });
assert.deepEqual(values(store.get(generatedTypographyAtom)), byZoom.get(2));
store.set(updateTextZoomAtom, -4);
assert.deepEqual(values(store.get(generatedTypographyAtom)), byZoom.get(-4));
const editing = referenceStore();
editing.set(modeSelectionAtom, { textScaling: "mode-text-scaling-larger" });
editing.set(editModeAtom, true);
editing.set(updateTextZoomAtom, 8);
assert.deepEqual(values(editing.get(generatedTypographyAtom)), byZoom.get(8));
assert.equal(
  editing
    .get(modeSetsAtom)
    .find((set) => set.key === "textScaling")!
    .modes.find((mode) => mode.key === "larger")!.foundations.typography
    ?.textZoom,
  8,
);
assert.ok(
  !("scaleBindings" in TYPOGRAPHY_DEFAULTS) &&
    !("scaleParameters" in TYPOGRAPHY_DEFAULTS),
);
console.log(
  `Font-size reference checks passed for ${reference.length} Text size settings.`,
);
