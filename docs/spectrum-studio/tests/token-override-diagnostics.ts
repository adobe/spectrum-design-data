// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createColorDefaults } from "../src/data/defaults";
import { resolveToken } from "../src/features/tokens/model";
import { resolveBrowserColorTokens } from "../src/features/tokens/colorResolution";
import type { BrowserTokenEdits } from "../src/features/tokens/browserModel";
import {
  resolveBrowserTokens,
  projectBrowserTokens,
} from "../src/features/tokens/browserModel";
import { browserColorSources } from "../src/features/tokens/colorBrowserSources";
import {
  normalizeBrowserColorOutputs,
  overrideContrastMessage,
} from "../src/features/tokens/colorOutput";
import { inspectorTaxonomy } from "./fixtures/token-inspector";
import { sourceValuePreview } from "../src/features/tokens/valuePreview";

const document = createColorDefaults();
document.backgroundLightness = 1;
document.scales.push({
  id: "override-scale",
  name: "Red",
  stops: [{ id: "red-key", lightness: 0.5, hue: 30, chroma: 40 }],
  customContrasts: {
    steps: [{ id: "override-step", value: 4.5, scaleIndex: 900 }],
    baseContrastId: "override-step",
    namingRuleId: "rule-standard-scale-naming",
  },
});
const token = resolveToken(
  {
    uuid: "override-color",
    name: { colorName: "red", contrastValue: "900" },
    value: "rgb(0, 0, 0)",
    source: {
      tokenType: "color",
      scaleId: "override-scale",
      contrastId: "override-step",
    },
  },
  undefined,
);
const edits: BrowserTokenEdits = {
  [token.uuid]: {
    values: {},
    authoring: {
      assignments: { "[]": { kind: "literal", value: "#dddddd" } },
    },
  },
};
const resolved = resolveBrowserColorTokens([token], edits, "[]", document);
assert.equal(
  resolved.length,
  1,
  "A contrast shortfall must not remove a token.",
);
assert.equal(resolved[0].value, "rgb(221, 221, 221)");
assert.equal(resolved[0].valueOverridden, true);
assert.deepEqual(resolved[0].contrastWarning, {
  colorName: "red",
  scaleIndex: "900",
  requestedContrast: 4.5,
  actualContrast: resolved[0].contrastWarning?.actualContrast,
  background: "rgb(255, 255, 255)",
});
assert.ok(resolved[0].contrastWarning!.actualContrast < 1.4);
assert.equal(
  overrideContrastMessage(resolved[0].contrastWarning!),
  "Override value does not meet system defined contrast for red 900 of 4.5:1",
);
const sources = browserColorSources([token]);
const browser = normalizeBrowserColorOutputs(
  resolveBrowserTokens(sources, edits, "[]"),
  document.settings.colorOutput,
  new Map(),
  new Set(),
  document,
)[0];
assert.equal(browser.value, resolved[0].value);
assert.deepEqual(browser.contrastWarning, resolved[0].contrastWarning);
assert.equal(browser.validationError, undefined);
assert.ok(
  sourceValuePreview(browser),
  "A low-contrast color remains previewable.",
);
const canonical = projectBrowserTokens([browser], inspectorTaxonomy)[0];
assert.equal(
  canonical.value,
  resolved[0].value,
  "Naming does not discard the chosen value.",
);
const passing = structuredClone(edits);
passing[token.uuid].authoring!.assignments["[]"] = {
  kind: "literal",
  value: "#000000",
};
assert.equal(
  resolveBrowserColorTokens([token], passing, "[]", document)[0]
    .contrastWarning,
  undefined,
);
const changedBackground = structuredClone(document);
changedBackground.backgroundLightness = 0;
assert.equal(
  resolveBrowserColorTokens([token], edits, "[]", changedBackground)[0]
    .contrastWarning,
  undefined,
);
const changedTarget = structuredClone(document);
changedTarget.scales.at(-1)!.customContrasts!.steps[0].value = 1.2;
assert.equal(
  resolveBrowserColorTokens([token], edits, "[]", changedTarget)[0]
    .contrastWarning,
  undefined,
);
assert.deepEqual(resolveBrowserColorTokens([token], {}, "[]", document), [
  token,
]);
const modeEdits: BrowserTokenEdits = {
  [token.uuid]: {
    values: {},
    authoring: {
      assignments: {
        '[["scheme","light"]]': { kind: "literal", value: "#dddddd" },
      },
    },
  },
};
assert.ok(
  resolveBrowserColorTokens(
    [token],
    modeEdits,
    '[["scheme","light"]]',
    document,
  )[0].contrastWarning,
);
assert.equal(
  resolveBrowserColorTokens(
    [token],
    modeEdits,
    '[["scheme","dark"]]',
    document,
  )[0].value,
  token.value,
);
assert.equal(edits[token.uuid].authoring!.assignments["[]"].kind, "literal");
console.log(
  "Override contrast diagnostics preserve values, previews, targets, backgrounds, modes and reset.",
);
