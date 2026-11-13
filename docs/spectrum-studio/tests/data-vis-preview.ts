// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveBrowserTokens } from "../src/features/tokens/browserResolution";
import type { BrowserTokenEdits } from "../src/features/tokens/browserEditTypes";
import { categoricalMemberSources } from "../src/features/color-system/data-vis/categoricalValues";
import { categoricalPreviewMembers } from "../src/features/color-system/data-vis/categoricalPreview";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  type CategoricalDataVisScale,
} from "../src/features/color-system/data-vis/model";
import {
  uiSwatchKey,
  type UiSwatch,
} from "../src/features/color-system/data-vis/resolution";
import { quantitativeExample } from "../src/features/color-system/data-vis/examples";
import { DataVisHeatmap } from "../src/views/color-system/data-vis/DataVisHeatmap";

const scale: CategoricalDataVisScale = {
  id: "preview",
  name: "Preview categories",
  kind: "categorical",
  members: ["first", "second"].map((id) => ({
    id,
    source: { kind: "ui-swatch", scaleId: id, contrastId: "step" },
  })),
  preferences: structuredClone(DEFAULT_CATEGORICAL_PREFERENCES),
};
const swatches: UiSwatch[] = scale.members.map((member, index) => ({
  id: uiSwatchKey(member.source),
  source: member.source,
  label: `Color ${index + 1}`,
  value: ["#1645a1", "#b74716"][index],
  generatedValue: ["#1645a1", "#b74716"][index],
  manuallyOverridden: false,
}));
const sources = categoricalMemberSources(scale, swatches);
const concepts = [
  "38044966-cfd2-4c62-9ca7-50fe26ab0539",
  "64144146-bbf8-4efb-8547-444761043cd7",
];
const edits: BrowserTokenEdits = Object.fromEntries(
  sources.map((source, index) => [
    concepts[index],
    {
      values: {},
      authoring: {
        assignments: {},
        identity: {
          sourceId: source.id,
          conceptId: concepts[index],
          name: { color: `category-${index + 1}` },
          rows: {},
        },
      },
    },
  ]),
);
const unchangedScale = structuredClone(scale);
const legacy = resolveBrowserTokens(sources, {}, "[]");
const saved = resolveBrowserTokens(sources, edits, "[]");
assert.deepEqual(
  saved.map((token) => token.id),
  concepts,
);
assert.ok(saved.every((token) => token.id !== token.sourceId));
const initial = categoricalPreviewMembers(scale, legacy);
const afterIdentity = categoricalPreviewMembers(scale, [...saved].reverse());
assert.deepEqual(
  afterIdentity.map((member) => member.value),
  initial.map((member) => member.value),
);
assert.deepEqual(
  afterIdentity.map((member) => member.id),
  concepts,
);
assert.deepEqual(
  afterIdentity.map((member) => member.source),
  scale.members.map((member) => member.source),
);
assert.deepEqual(
  afterIdentity.map((member) => member.label),
  ["Color 1", "Color 2"],
);

const overridden = structuredClone(edits);
overridden[concepts[0]].values["[]"] = {
  value: "#123456",
  baseline: sources[0].value,
};
const manual = categoricalPreviewMembers(
  scale,
  resolveBrowserTokens(sources, overridden, "[]"),
);
assert.equal(manual[0].value, "#123456");
assert.equal(manual[0].manuallyOverridden, true);
assert.deepEqual(manual[1], afterIdentity[1]);
const changed = categoricalMemberSources(
  scale,
  swatches.map((swatch, index) =>
    index === 1 ? { ...swatch, value: "#228833" } : swatch,
  ),
);
const updated = categoricalPreviewMembers(
  scale,
  resolveBrowserTokens(changed, overridden, "[]"),
);
assert.equal(updated[0].value, "#123456");
assert.equal(updated[1].value, "#228833");
assert.deepEqual(scale, unchangedScale);
assert.throws(
  () => categoricalPreviewMembers(scale, saved.slice(1)),
  /output is unavailable/,
);
assert.throws(
  () =>
    categoricalPreviewMembers(
      scale,
      saved.map((token, index) =>
        index === 0
          ? { ...token, validationError: "Source color is unavailable." }
          : token,
      ),
    ),
  /Source color is unavailable/,
);
assert.throws(
  () =>
    categoricalPreviewMembers(
      scale,
      saved.map((token, index) =>
        index === 0 ? { ...token, value: 123 } : token,
      ),
    ),
  /concrete color/,
);

for (const kind of ["sequential", "diverging"] as const) {
  const records = quantitativeExample(
    kind,
    (position) => `rgb(${Math.round(position * 255)} 0 0)`,
  );
  const svg = renderToStaticMarkup(
    createElement(DataVisHeatmap, { name: kind, records }),
  );
  const cells = [...svg.matchAll(/<rect\b([^>]*)>/g)].map(([, attributes]) =>
    Object.fromEntries(
      [...attributes.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [
        key,
        value,
      ]),
    ),
  );
  assert.equal(cells.length, 50);
  assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
  for (const [index, cell] of cells.entries()) {
    assert.equal(
      Number(cell.width),
      Number(cell.height),
      "Heat-map cells must be square.",
    );
    assert.equal(Number(cell.x), records[index].column * 40 + 1);
    assert.equal(Number(cell.y), records[index].row * 40 + 1);
    assert.equal(cell.fill, records[index].color);
    assert.ok(Number(cell.x) + Number(cell.width) <= 400);
    assert.ok(Number(cell.y) + Number(cell.height) <= 200);
  }
}
console.log(
  "Data vis preview: canonical identity transitions, final colors and square rendered heat-map cells passed.",
);
