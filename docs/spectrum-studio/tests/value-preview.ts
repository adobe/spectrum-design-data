// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createValuePreview,
  classificationPreviewKind,
  PREVIEW_TERM_IDS as ids,
  sourceValuePreview,
  shadowValuePreview,
  valuePreviewPresentation,
} from "../src/features/tokens/valuePreview";
import { ORDERED_CATEGORY_IDS as categories } from "../src/features/taxonomy/orderedVocabulary";
import {
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERM_IDS,
} from "../src/features/structures/vocabulary";
import { aliasBrowserTokens } from "../src/features/tokens/aliasBrowser";
import type { BrowserToken } from "../src/features/tokens/browserModel";

const classification = (
  property: string,
  element?: string,
  attribute?: string,
) => ({
  [STRUCTURE_CATEGORY_IDS.property]: property,
  ...(element && { [categories.element]: element }),
  ...(attribute && { [categories.attribute]: attribute }),
});
for (const [property, element, attribute, kind] of [
  [ids.color, undefined, undefined, "color"],
  [ids.color, ids.text, undefined, "text-color"],
  [ids.color, ids.workflowIcon, undefined, "icon-color"],
  [ids.size, ids.uiIcon, undefined, "icon-size"],
  [ids.size, ids.text, undefined, "font-size"],
  [ids.color, undefined, ids.border, "border-color"],
  [ids.thickness, undefined, ids.border, "border-width"],
  [ids.color, ids.text, ids.background, "color"],
  [ids.lineHeight, undefined, undefined, "line-height"],
  [STRUCTURE_TERM_IDS.radius, undefined, undefined, "radius"],
  [ids.blur, undefined, ids.shadow, "shadow-blur"],
  [ids.offset, undefined, ids.shadow, "shadow-offset-y"],
] as const)
  assert.equal(
    classificationPreviewKind(classification(property, element, attribute)),
    kind,
  );
assert.equal(
  classificationPreviewKind({
    ...classification(ids.offset, undefined, ids.shadow),
    [STRUCTURE_CATEGORY_IDS.axis]: STRUCTURE_TERM_IDS.horizontal,
  }),
  "shadow-offset-x",
);
assert.equal(
  classificationPreviewKind({
    ...classification(ids.offset, undefined, ids.shadow),
    [STRUCTURE_CATEGORY_IDS.axis]: "unknown",
  }),
  undefined,
);
assert.equal(
  classificationPreviewKind(classification(ids.color, "unknown")),
  undefined,
);

const styles = (
  kind: Parameters<typeof createValuePreview>[0],
  value: number | string,
  unit?: Parameters<typeof createValuePreview>[2],
  fontSize?: number,
) => {
  const result = valuePreviewPresentation(
    createValuePreview(kind, value, unit),
    { fontSize },
  );
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error(result.message);
  return result.styles;
};
assert.deepEqual(styles("line-height", 1.5, "multiplier"), {
  height: 24,
  lineHeight: "24px",
});
assert.deepEqual(styles("line-height", 1.5, "multiplier", 20), {
  height: 30,
  lineHeight: "30px",
});
assert.deepEqual(styles("line-height", 18, "px"), {
  height: 18,
  lineHeight: "18px",
});
assert.deepEqual(styles("font-size", "1.5rem"), { fontSize: 24 });
assert.deepEqual(styles("font-size", "1.5em", undefined, 20), { fontSize: 30 });
assert.deepEqual(styles("icon-size", 42), { width: 42, height: 42 });
assert.deepEqual(styles("block", 2048), { width: 2048 });
assert.deepEqual(styles("block", 0), { width: 0 });
assert.deepEqual(styles("border-width", 0.5), { borderWidth: 0.5 });
assert.deepEqual(styles("radius", 8), { borderTopLeftRadius: 8 });
assert.deepEqual(styles("text-color", "oklch(60% 0.2 40 / 0.5)"), {
  color: "oklch(60% 0.2 40 / 0.5)",
});
assert.deepEqual(styles("border-color", "color(display-p3 1 0 0)"), {
  borderColor: "color(display-p3 1 0 0)",
});
assert.deepEqual(styles("font-weight", 650), { fontWeight: 650 });
assert.deepEqual(styles("font-weight", "bold"), { fontWeight: "bold" });
assert.deepEqual(styles("font-family", "serif"), { fontFamily: "serif" });
assert.deepEqual(styles("shadow-offset-x", -3), {
  boxShadow: "-3px 2px 4px 0px var(--spectrum-gray-600)",
});
assert.deepEqual(styles("shadow-offset-y", 6), {
  boxShadow: "0px 6px 4px 0px var(--spectrum-gray-600)",
});
assert.deepEqual(styles("shadow-blur", 10), {
  boxShadow: "0px 2px 10px 0px var(--spectrum-gray-600)",
});
assert.deepEqual(styles("shadow-spread", -2), {
  boxShadow: "0px 2px 4px -2px var(--spectrum-gray-600)",
});
for (const value of [-1, NaN, Infinity, "2vh", "calc(1px + 2px)", ""]) {
  assert.equal(
    valuePreviewPresentation(createValuePreview("block", value)).status,
    "unavailable",
  );
}
assert.equal(
  valuePreviewPresentation(createValuePreview("block", "2rem", "px")).status,
  "unavailable",
);
assert.equal(
  valuePreviewPresentation(createValuePreview("font-weight", 1001)).status,
  "unavailable",
);
assert.equal(
  valuePreviewPresentation(createValuePreview("font-size", 16), { fontSize: 0 })
    .status,
  "unavailable",
);

const token: BrowserToken = {
  id: "sample",
  name: "arbitrary-renamed-token",
  generatedName: "original",
  type: "typography",
  groupId: "font-size",
  groupLabel: "Any label",
  unit: "px",
  value: 18,
  generatedValue: 18,
  description: "",
  status: "draft",
  stale: false,
  nameOverridden: false,
  valueOverridden: false,
};
const before = structuredClone(token);
assert.deepEqual(
  sourceValuePreview(token),
  createValuePreview("font-size", 18, "px"),
);
assert.deepEqual(
  sourceValuePreview({
    ...token,
    groupId: "body-unitlessLineHeight",
    value: 1.5,
    unit: "",
  }),
  createValuePreview("line-height", 1.5, "multiplier"),
);
assert.equal(
  sourceValuePreview({
    ...token,
    type: "radius",
    validationError: "Unavailable radius",
  }).kind,
  "unavailable",
);
assert.deepEqual(token, before, "adapters do not mutate source data");
const resolved = {
  ...token,
  taxonomySource: {
    id: "source",
    governed: classification(ids.size, ids.workflowIcon),
  },
};
assert.equal(
  sourceValuePreview(resolved).kind,
  "icon-size",
  "governed meaning takes precedence over broad source type",
);
assert.equal(
  sourceValuePreview({
    ...resolved,
    taxonomySource: {
      id: "source",
      governed: { [STRUCTURE_CATEGORY_IDS.property]: [ids.size, ids.color] },
    },
  }).kind,
  "unavailable",
);
const aliases = aliasBrowserTokens(
  {
    schemaVersion: 1,
    tokens: [
      { id: "alias", name: "old-name", $ref: "target", contexts: ["[]"] },
    ],
  },
  [
    {
      id: "target",
      context: "[]",
      rowId: "row",
      name: resolved.name,
      token: resolved,
    },
  ],
  {},
);
assert.equal(
  aliases[0].valuePreview?.kind,
  "icon-size",
  "alias keeps its canonical target's meaning after grouping changes",
);

const shadows = [
  {
    layerId: "first",
    offsetX: 0 as const,
    offsetY: 2,
    blur: 4,
    spread: 0 as const,
    color: "#12345680",
    opacity: 0.5,
    inset: false as const,
  },
  {
    layerId: "second",
    offsetX: 0 as const,
    offsetY: 6,
    blur: 12,
    spread: 0 as const,
    color: "color(display-p3 1 0 0)",
    opacity: 1,
    inset: false as const,
  },
];
assert.deepEqual(
  shadowValuePreview(shadows),
  createValuePreview(
    "shadow",
    "0 2px 4px 0 #12345680, 0 6px 12px 0 color(display-p3 1 0 0)",
  ),
);
assert.deepEqual(shadowValuePreview([]), createValuePreview("shadow", "none"));
const css = readFileSync(
  new URL("../src/components/value-preview/ValuePreview.css", import.meta.url),
  "utf8",
);
assert.match(css, /width: 80px;[\s\S]*height: 32px;[\s\S]*overflow: hidden/);
assert.match(css, /width: 24px;[\s\S]*height: 24px/);
assert.match(css, /spectrum-fuchsia-300/);
console.log("Shared classified-value preview checks passed.");
