// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { presetForRatio } from "../src/features/typography/typeScalePresets";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import { typographyTokenValues } from "../src/features/typography/typographyTokens";
import { COMPONENT_SIZES } from "../src/features/typography/model";
import { typeScaleWithRatios } from "./typography-fixtures";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { TYPOGRAPHY_INTERPOLATIONS } from "../src/features/typography/lineHeightInterpolations";

const tokens = generateTypography(TYPOGRAPHY_DEFAULTS);
assert.equal(tokens.length, 17);
assert.equal(tokens[0].name, "font-size-50");
assert.equal(tokens[2].name, "font-size-100");
assert.equal(tokens[2].fontSize, 14);
assert.equal(tokens.at(-1)?.name, "font-size-1500");
assert.equal(typographyTokenValues(tokens).length, 136);
// Font sizes retain their independent numerical reference; removed spacing and revised line-height forms do not.
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/typography-reference.json", import.meta.url),
    "utf8",
  ),
) as Record<string, Record<string, number>>;
const formulas = typeScaleWithRatios(1.118, 1.069);
for (const size of COMPONENT_SIZES)
  for (let textZoom = -4; textZoom <= 8; textZoom++) {
    const expected = Object.fromEntries(
      Object.entries(reference[`${size.id}:${textZoom}`]).filter(([name]) =>
        name.startsWith("font-size-"),
      ),
    );
    const actual = Object.fromEntries(
      generateTypography(
        { ...TYPOGRAPHY_DEFAULTS, componentSize: size.id },
        textZoom,
        RULE_DEFAULTS,
        formulas,
      ).map((token) => [token.name, token.fontSize]),
    );
    assert.deepEqual(
      actual,
      expected,
      `${size.id} font sizes at zoom ${textZoom}`,
    );
  }
assert.equal(presetForRatio(1.25).id, "major-third");
assert.equal(presetForRatio(1.234).id, "custom");
const linearShapes = TYPOGRAPHY_INTERPOLATIONS.map((shape) =>
  shape.kind === "method" && shape.id === "interpolation-cosine"
    ? { ...shape, method: "linear" as const }
    : shape,
);
const linear = generateTypography(
  TYPOGRAPHY_DEFAULTS,
  0,
  RULE_DEFAULTS,
  SCALE_TYPE_DEFAULTS,
  linearShapes,
);
assert.notDeepEqual(
  linear.map((token) => token.lineHeights.body.length),
  tokens.map((token) => token.lineHeights.body.length),
);
const css = buildTypographyCss(TYPOGRAPHY_DEFAULTS);
const blocks = new Map(
  [...css.matchAll(/^(.+) \{\n([\s\S]*?)\n\}/gm)].map((match) => [
    match[1],
    match[2],
  ]),
);
assert.equal(blocks.size, 13);
assert.ok([...blocks.keys()][0].startsWith(':root, [data-text-zoom="0"]'));
assert.ok(!/(^|\n)\s*font-size:/.test(css));
assert.doesNotMatch(css, /@media|paragraph-spacing|heading-spacing/);
for (const textZoom of [-4, 0, 3, 8]) {
  const selector = [...blocks.keys()].find((key) =>
    key.includes(`[data-text-zoom="${textZoom}"]`),
  )!;
  const declared = Object.fromEntries(
    [...blocks.get(selector)!.matchAll(/--([\w-]+): ([\d.]+)(rem)?;/g)].map(
      ([, name, value, unit]) => [
        name,
        unit ? Number(value) * 16 : Number(value),
      ],
    ),
  );
  for (const { name, value } of typographyTokenValues(
    generateTypography(TYPOGRAPHY_DEFAULTS, textZoom),
  )) {
    assert.ok(
      Math.abs(declared[name] - value) < 0.00001,
      `${name} at ${textZoom}`,
    );
  }
}
assert.match(
  buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
    scope: ".preview",
    purpose: "authoring",
  }),
  /^\.preview, \.preview\[data-text-zoom="0"\], \.preview \[data-text-zoom="0"\] \{/,
);
console.log("Typography generation checks passed.");
