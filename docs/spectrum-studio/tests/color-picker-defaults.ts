// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorPickerDefaultsProvider } from "../src/components/color-picker/ColorPickerDefaults";
import { useDefaultPickerGamut } from "../src/components/color-picker/pickerGamut";
import type { ColorGamut } from "../src/features/color-system/outputSettings";

function CurrentGamut() {
  return createElement("output", null, useDefaultPickerGamut());
}

const withGamut = (
  gamut: ColorGamut,
  children: ReactNode = createElement(CurrentGamut),
) => createElement(ColorPickerDefaultsProvider, { gamut, children });

assert.equal(
  renderToStaticMarkup(createElement(CurrentGamut)),
  "<output>sRGB</output>",
);
for (const [gamut, label] of [
  ["srgb", "sRGB"],
  ["display-p3", "Display-P3"],
  ["rec2020", "Rec2020"],
] as const)
  assert.equal(
    renderToStaticMarkup(withGamut(gamut)),
    `<output>${label}</output>`,
  );
assert.equal(
  renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      withGamut(
        "display-p3",
        createElement(
          Fragment,
          null,
          createElement(CurrentGamut),
          withGamut("rec2020"),
          createElement(CurrentGamut),
        ),
      ),
      createElement(CurrentGamut),
    ),
  ),
  "<output>Display-P3</output><output>Rec2020</output><output>Display-P3</output><output>sRGB</output>",
  "Nested picker defaults do not change their parent or unrelated consumers.",
);
console.log(
  "Picker gamut defaults, supported gamuts and nested scopes passed.",
);
