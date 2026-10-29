// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { designSystemDefaults } from "../src/data/defaults";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import {
  formatTypographyLength,
  toTypographyUnit,
  TYPOGRAPHY_UNITS,
} from "../src/features/typography/units";
import { typographyAnalysisSection } from "../src/views/typography/typographyAnalysis";
import { typographyDisplayModes } from "../src/views/typography/typographyPreview";

assert.deepEqual(typographyDisplayModes, [
  "font-size",
  "line-height",
  "icon-size",
]);
const registry = structuredClone(designSystemDefaults.system.taxonomy);
for (const outputUnit of TYPOGRAPHY_UNITS) {
  for (const alignment of ["text", "line-height"] as const) {
    const document = {
      ...structuredClone(TYPOGRAPHY_DEFAULTS),
      outputUnit,
      iconography:
        alignment === "text"
          ? { alignment, baseSize: 18 }
          : { alignment, baseSize: 18, lineHeightId: "heading" },
    };
    const before = structuredClone(document);
    for (const zoom of [-4, 0, 3, 8]) {
      const tokens = generateTypography(document, zoom);
      const section = typographyAnalysisSection(tokens, document, registry);
      const graph = section.graphs.find(
        (graph) => graph.label === "Icon size by index",
      )!;
      assert.ok(graph);
      assert.equal(graph.heading, `Icon size (${outputUnit})`);
      assert.equal(
        section.columns.filter((column) => column === "Icon size").length,
        1,
      );
      assert.equal(section.rows.length, tokens.length);
      const iconColumn = section.columns.indexOf("Icon size");
      assert.deepEqual(
        graph.points,
        tokens.map((token) => ({
          index: token.position,
          step: token.scale,
          raw: toTypographyUnit(token.iconSize, outputUnit),
          value: toTypographyUnit(token.iconSize, outputUnit),
        })),
      );
      for (const [index, token] of tokens.entries()) {
        assert.equal(
          section.rows[index].cells[iconColumn],
          formatTypographyLength(token.iconSize, outputUnit),
        );
        assert.equal(section.rows[index].isBase, token.position === 0);
        assert.equal(section.rows[index].key, String(token.position));
        if (alignment === "line-height")
          assert.equal(token.iconSize, token.lineHeights.heading.length);
      }
    }
    assert.deepEqual(
      document,
      before,
      "Analysis does not mutate authoring data.",
    );
  }
}
const catalog = readFileSync(
  new URL(
    "../src/features/icons/spectrumIconCatalog.generated.ts",
    import.meta.url,
  ),
  "utf8",
);
assert.match(
  catalog,
  /"Home": \(\) => import\("@react-spectrum\/s2\/icons\/Home"\)/,
);
assert.doesNotMatch(
  catalog,
  /^import .*@react-spectrum\/s2\/icons/m,
  "The catalog must not eagerly import glyphs.",
);
assert.doesNotMatch(
  catalog,
  /"(Icon|Skeleton|runtime|useMediaQuery|useSpectrumContextProps)":/,
  "Support modules are not selectable glyphs.",
);
console.log("Typography preview and Icon size analysis checks passed.");
