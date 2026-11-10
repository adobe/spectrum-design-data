// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { generatePaletteTokens } from "../src/features/tokens/paletteGeneration";
import {
  resolveToken,
  tokenStableKey,
  tokenUuid,
} from "../src/features/tokens/model";
import {
  canonicalTokenModeKey,
  resolveBrowserColorTokens,
} from "../src/features/tokens/colorResolution";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import {
  resolveBrowserTokens,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import { browserSourcesFromOutputs } from "../src/features/tokens/browserSources";
import { browserColorSources } from "../src/features/tokens/colorBrowserSources";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { scaleContrasts } from "../src/features/color-system/contrastSteps";
import {
  categoricalMemberSources,
  resolvedCategoricalColors,
} from "../src/features/color-system/data-vis/categoricalValues";
import { categoricalSelection } from "../src/features/color-system/data-vis/selection";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  type CategoricalDataVisScale,
} from "../src/features/color-system/data-vis/model";
import {
  uiSwatchKey,
  type UiSwatch,
} from "../src/features/color-system/data-vis/resolution";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { createDataVisRuntime } from "../src/features/color-system/data-vis/adapter";

const source = createDefaultSnapshot();
const document = source.colorSystem;
const tokens = generatePaletteTokens(
  document.palette,
  document.settings.colorOutput,
).map((token) => resolveToken(token, undefined));
assert.ok(tokens.length >= 3);
const original = structuredClone(tokens);
assert.deepEqual(
  browserColorSources(tokens),
  browserSourcesFromOutputs(tokens, [], []),
  "The standalone resolver and browser retain the same color source mapping.",
);
const edits = structuredClone(source.browserTokenEdits!);
const first = tokenIdentity(edits, tokens[0].uuid)!.conceptId;
const second = tokenIdentity(edits, tokens[1].uuid)!.conceptId;
const modeKey = canonicalTokenModeKey(
  Object.fromEntries(
    source.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
edits[first].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: second,
};
edits[second].authoring!.assignments["[]"] = {
  kind: "literal",
  value: "#123456",
};
const before = structuredClone(edits);
const resolved = resolveBrowserColorTokens(tokens, edits, modeKey, document);
assert.equal(resolved[0].value, "rgb(18, 52, 86)");
assert.equal(resolved[1].value, resolved[0].value);
assert.equal(resolved[0].valueOverridden, true);
assert.equal(resolved[1].valueOverridden, true);
assert.deepEqual(resolved[2], tokens[2]);
assert.deepEqual(tokens, original);
assert.deepEqual(edits, before);
assert.deepEqual(
  resolveBrowserColorTokens(
    tokens,
    structuredClone(source.browserTokenEdits!),
    modeKey,
    document,
  ),
  original,
  "Identity-only metadata leaves generated colors unchanged.",
);

const scheme = source.modeSets.find((axis) => axis.key === "colorScheme")!;
const dark = scheme.modes.find((mode) => mode.key === "dark")!;
const darkContext = canonicalTokenModeKey({ [scheme.id]: dark.id });
edits[second].authoring!.assignments[darkContext] = {
  kind: "literal",
  value: "#654321",
};
const darkKey = canonicalTokenModeKey({
  ...Object.fromEntries(JSON.parse(modeKey) as [string, string][]),
  [scheme.id]: dark.id,
});
assert.equal(
  resolveBrowserColorTokens(tokens, edits, darkKey, document)[0].value,
  "rgb(101, 67, 33)",
  "References follow the most specific selected assignment.",
);
assert.equal(
  resolveBrowserColorTokens(tokens, edits, modeKey, document)[0].value,
  resolved[0].value,
  "An unrelated mode retains its original output.",
);

const deprecated = structuredClone(edits);
deprecated[first].authoring!.lifecycle = {
  deprecatedComment: "Frozen for the resolution check.",
  replacementIds: [],
  frozen: { "[]": { kind: "literal", value: "#abcdef" } },
};
assert.equal(
  resolveBrowserColorTokens(tokens, deprecated, darkKey, document)[0].value,
  "#abcdef",
  "Frozen values do not follow later referenced-token edits.",
);
assert.equal(
  resolveBrowserColorTokens(tokens, deprecated, darkKey, document)[0]
    .valueOverridden,
  false,
  "Frozen output is preserved without becoming a manual override.",
);
const cyclic = structuredClone(edits);
cyclic[second].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: first,
};
assert.throws(
  () => resolveBrowserColorTokens(tokens, cyclic, modeKey, document),
  /cycle/,
);
const missing = structuredClone(edits);
missing[first].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: crypto.randomUUID(),
};
assert.throws(
  () => resolveBrowserColorTokens(tokens, missing, modeKey, document),
  /referenced token is unavailable/,
);
const staticSource: BrowserTokenSource = {
  ...browserSourcesFromOutputs(tokens, [], [])[0],
  dataVis: {
    scaleId: "static-scale",
    memberId: "static-member",
    ordinal: 1,
    source: {
      kind: "ui-swatch",
      scaleId: document.scales[0].id,
      contrastId: document.contrasts[0].id,
    },
    hidden: false,
    static: true,
  },
};
assert.equal(
  resolveBrowserTokens([staticSource], edits, darkKey)[0].value,
  staticSource.value,
  "Static colors do not evaluate dormant Adaptive reference assignments.",
);
assert.equal(
  resolveBrowserTokens([staticSource], deprecated, darkKey)[0].value,
  "#abcdef",
  "A deprecated Static color still preserves its frozen publication.",
);
const swatch: UiSwatch = {
  id: uiSwatchKey({
    scaleId: document.scales[0].id,
    contrastId: scaleContrasts(document, document.scales[0])[0].id,
  }),
  label: "Categorical source",
  source: {
    kind: "ui-swatch",
    scaleId: document.scales[0].id,
    contrastId: scaleContrasts(document, document.scales[0])[0].id,
  },
  value: "#112233",
  generatedValue: "#112233",
  manuallyOverridden: false,
};
const categorical: CategoricalDataVisScale = {
  id: "categorical-resolution",
  name: "Categorical resolution",
  kind: "categorical",
  preferences: structuredClone(DEFAULT_CATEGORICAL_PREFERENCES),
  members: [
    { id: "first", source: swatch.source },
    { id: "second", source: swatch.source },
  ],
};
const categoricalDocument = {
  ...document,
  dataVisScales: [categorical],
};
const memberSources = categoricalMemberSources(categorical, [swatch]);
const memberConcept = crypto.randomUUID();
const memberEdits = structuredClone(edits);
memberEdits[memberConcept] = {
  values: {},
  authoring: {
    identity: {
      sourceId: memberSources[0].id,
      conceptId: memberConcept,
      name: { property: "color", colorFamily: "categorical", number: "1" },
      rows: { "[]": crypto.randomUUID() },
    },
    assignments: { "[]": { kind: "reference", targetId: second } },
  },
};
const referenceSources = browserColorSources(tokens);
const memberBefore = structuredClone(memberEdits);
const members = resolvedCategoricalColors(
  categoricalDocument,
  [swatch],
  memberEdits,
  modeKey,
  { referenceSources },
);
assert.equal(members[0].id, memberSources[0].id);
assert.equal(members[0].value, resolved[1].value);
assert.equal(members[0].valueOverridden, true);
assert.equal(members[1].value, "rgb(17, 34, 51)");
assert.equal(
  categoricalSelection(
    categorical,
    [swatch],
    memberEdits,
    modeKey,
    referenceSources,
  )[0].value,
  "#123456",
  "Selection and runtime resolve the same canonical reference.",
);
assert.equal(
  resolvedCategoricalColors(
    categoricalDocument,
    [swatch],
    memberEdits,
    darkKey,
    { referenceSources },
  )[0].value,
  "rgb(101, 67, 33)",
  "Categorical references follow the selected target mode.",
);
assert.deepEqual(memberEdits, memberBefore);
assert.deepEqual(categoricalDocument.dataVisScales, [categorical]);
const cascadeInput = {
  base: {
    ...categoricalDocument,
    scales: [document.scales[0]],
    contrasts: [document.contrasts[0]],
  },
  modeSets: [],
  activeModes: [],
  activeTokens: [],
  overrides: {},
  browserEdits: memberBefore,
};
const cascade = buildCascadeTokenExport(cascadeInput);
assert.equal(
  cascade.tokens.find((token) => token.uuid === tokens[1].uuid)?.value,
  resolved[1].value,
  "Palette cascade rows retain canonical assignments.",
);
assert.equal(
  cascade.tokens.find((token) => token.uuid === memberSources[0].id)?.value,
  resolved[1].value,
  "Categorical cascade output resolves references using the full color inventory.",
);
const frozenCascade = buildCascadeTokenExport({
  ...cascadeInput,
  browserEdits: {
    ...memberBefore,
    [first]: deprecated[first],
  },
});
assert.equal(
  frozenCascade.tokens.find((token) => token.uuid === tokens[0].uuid)?.value,
  "#abcdef",
  "Palette cascade output preserves frozen publication values.",
);
const packetSource = { ...source, colorSystem: categoricalDocument };
const minimalPacket = buildDataVisSourcePacket(packetSource);
const omittedScale = document.scales.find(
  (scale) => !minimalPacket.color.scales.some((item) => item.id === scale.id),
)!;
assert.ok(omittedScale, "The fixture has a UI scale outside the recipe.");
const omittedPalette = tokens.find(
  (token) =>
    !minimalPacket.color.palette.some(
      (entry) => entry.id === token.source.contrastId,
    ),
)!;
assert.ok(
  omittedPalette,
  "The fixture has a palette color outside the recipe.",
);
const omittedUiId = tokenUuid(
  tokenStableKey(omittedScale.id, scaleContrasts(document, omittedScale)[0].id),
);
const omittedUiConcept = tokenIdentity(
  source.browserTokenEdits!,
  omittedUiId,
)!.conceptId;
const omittedPaletteConcept = tokenIdentity(
  source.browserTokenEdits!,
  omittedPalette.uuid,
)!.conceptId;
const manualConcept = crypto.randomUUID();
const packetEdits = structuredClone(memberBefore);
packetEdits[memberConcept].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: omittedUiConcept,
};
packetEdits[omittedUiConcept].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: manualConcept,
};
packetEdits[manualConcept] = {
  values: {},
  authoring: {
    manual: { type: "colors", unit: "", groupId: "manual-colors" },
    assignments: {
      "[]": { kind: "reference", targetId: omittedPaletteConcept },
    },
  },
};
packetEdits[omittedPaletteConcept].authoring!.assignments["[]"] = {
  kind: "literal",
  value: "#123456",
};
const beforePacketEdits = structuredClone(packetEdits);
const dependentPacket = buildDataVisSourcePacket({
  ...packetSource,
  browserTokenEdits: packetEdits,
});
assert.ok(
  dependentPacket.color.scales.some((scale) => scale.id === omittedScale.id),
  "Packet pruning retains referenced UI generators.",
);
assert.ok(
  dependentPacket.color.palette.some(
    (entry) => entry.id === omittedPalette.source.contrastId,
  ),
  "Packet pruning retains transitive palette dependencies.",
);
assert.deepEqual(
  dependentPacket.browserTokenEdits[manualConcept],
  packetEdits[manualConcept],
  "Packet pruning retains referenced manual tokens.",
);
assert.equal(
  createDataVisRuntime(dependentPacket).categorical(categorical.id)[0],
  resolved[1].value,
  "The standalone runtime resolves the retained reference chain.",
);
assert.deepEqual(packetEdits, beforePacketEdits);
const staticCategorical = {
  ...categorical,
  staticColors: categorical.members.map((member) => ({
    id: member.id,
    value: "#fedcba",
  })),
};
assert.equal(
  resolvedCategoricalColors(
    { ...categoricalDocument, dataVisScales: [staticCategorical] },
    [swatch],
    memberEdits,
    darkKey,
    { referenceSources },
  )[0].value,
  "rgb(254, 220, 186)",
  "Static categorical output ignores retained Adaptive assignments.",
);
memberEdits[memberConcept].authoring!.assignments["[]"] = {
  kind: "reference",
  targetId: crypto.randomUUID(),
};
assert.throws(
  () =>
    resolvedCategoricalColors(
      categoricalDocument,
      [swatch],
      memberEdits,
      modeKey,
      { referenceSources },
    ),
  /referenced token is unavailable/,
);
assert.throws(
  () =>
    categoricalSelection(
      categorical,
      [swatch],
      memberEdits,
      modeKey,
      referenceSources,
    ),
  /referenced token is unavailable/,
  "Selection does not disguise a blocked assignment as a generated value.",
);
console.log(
  "Color consumers share canonical literal, reference, mode and frozen-value resolution.",
);
