// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  buildChangeGroups,
  generateDocumentTokens,
  defaultColorDocument,
} from "../src/features/changelog/changes";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import {
  COLOR_SYSTEM_SCHEMA_VERSION,
  isColorSystemDocument,
  migrateColorSystemDocument,
  type ColorSystemDocument,
} from "../src/features/color-system/model";
import {
  paletteChannelsFromCss,
  paletteColorCss,
  paletteSwatches,
  validatePaletteName,
} from "../src/features/color-system/palette";
import { normalizePaletteReferencesAtom } from "../src/features/color-system/paletteIntegrity";
import {
  applyStopPatch,
  paletteConsumers,
} from "../src/features/color-system/paletteReferences";
import {
  addPaletteColorAtom,
  colorSystemDocumentAtom,
  removePaletteColorAtom,
  resolveColorDocument,
  resolvedColorSystemDocumentAtom,
  restorePaletteColorAtom,
  updateColorStopAtom,
  updatePaletteColorAtom,
} from "../src/features/color-system/state";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import { modeSetsAtom } from "../src/features/modes/state";
import type { Mode } from "../src/features/modes/model";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { canBulkEditValue } from "../src/features/tokens/browserModel";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import {
  colorTokenSetAtom,
  generatedColorTokensAtom,
  setTokenNameAtom,
  setTokenValueAtom,
} from "../src/features/tokens/state";
import {
  PALETTE_SCALE_ID,
  isPaletteToken,
  tokenDisplayName,
} from "../src/features/tokens/model";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { registerTerm } from "../src/features/taxonomy/model";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";

const store = createStore();
const base = store.get(colorSystemDocumentAtom);
assert.equal(base.schemaVersion, COLOR_SYSTEM_SCHEMA_VERSION);
assert.ok(isColorSystemDocument(base));
assert.equal(
  base.palette.length,
  6,
  "the shipped palette holds the product colors",
);
assert.ok(
  base.palette.every((color) => paletteColorCss(color, "srgb").startsWith("#")),
  "shipped palette values resolve to colors",
);
// Everything below starts from an empty palette.
store.set(colorSystemDocumentAtom, { ...base, palette: [] });

// Schema 1 documents migrate with an empty palette and stay valid.
const withoutPalette: Partial<ColorSystemDocument> = { ...base };
delete withoutPalette.palette;
const migrated = migrateColorSystemDocument(
  { ...withoutPalette, schemaVersion: 1 },
  1,
);
assert.ok(migrated && isColorSystemDocument(migrated));
assert.deepEqual(migrated.palette, []);
assert.equal(migrateColorSystemDocument(withoutPalette, 7), null);

// Adding creates a unique name and a value no other palette color has.
const firstId = store.set(addPaletteColorAtom);
const secondId = store.set(addPaletteColorAtom);
let document = store.get(colorSystemDocumentAtom);
assert.equal(document.palette.length, 2);
assert.notEqual(document.palette[0].name, document.palette[1].name);
assert.notEqual(
  paletteColorCss(document.palette[0], "srgb"),
  paletteColorCss(document.palette[1], "srgb"),
);

// Palette labels remain unique within the palette, but may match a color scale.
assert.deepEqual(
  store.set(updatePaletteColorAtom, { id: firstId, name: "Brand color" }),
  { ok: true },
);
assert.equal(
  store.set(updatePaletteColorAtom, { id: secondId, name: "brand-color" }).ok,
  false,
);
assert.equal(
  store.set(updatePaletteColorAtom, {
    id: secondId,
    name: document.scales[0].name,
  }).ok,
  false,
  "A duplicate rename is not a deliberate selection.",
);
store.set(enterEditModeAtom);
store.set(editFoundationNameAtom, {
  id: `palette:${secondId}`,
  termId: document.scales[0].nameRef!.termId,
});
assert.equal(
  store.get(colorSystemDocumentAtom).palette[1].name,
  document.scales[0].name,
);
assert.equal(
  store.set(updatePaletteColorAtom, { id: secondId, name: "  " }).ok,
  false,
);
assert.equal(
  validatePaletteName(
    store.get(colorSystemDocumentAtom),
    "Brand color",
    firstId,
  ),
  null,
);

// Values must stay distinct in the output format.
const firstValue = store.get(colorSystemDocumentAtom).palette[0];
assert.equal(
  store.set(updatePaletteColorAtom, {
    id: secondId,
    lightness: firstValue.lightness,
    hue: firstValue.hue,
    chroma: firstValue.chroma,
  }).ok,
  false,
);
assert.deepEqual(
  store.set(updatePaletteColorAtom, {
    id: firstId,
    lightness: 0.4,
    hue: 30,
    chroma: 80,
  }),
  { ok: true },
);
assert.deepEqual(
  store.set(updatePaletteColorAtom, {
    id: secondId,
    lightness: 2,
    hue: -10,
    chroma: 500,
  }),
  { ok: true },
);
const clamped = store.get(colorSystemDocumentAtom).palette[1];
assert.deepEqual(
  [clamped.lightness, clamped.hue, clamped.chroma],
  [1, 350, 100],
);

// Parsing maps into the output gamut and tolerates invalid input.
assert.equal(paletteChannelsFromCss("not a color", "srgb"), null);
const parsedWhite = paletteChannelsFromCss("#ffffff", "srgb")!;
assert.equal(paletteColorCss(parsedWhite, "srgb"), "#ffffff");
const p3 = paletteChannelsFromCss("color(display-p3 1 0 0)", "srgb")!;
assert.match(paletteColorCss(p3, "srgb"), /^#[0-9a-f]{6}$/);
assert.match(
  paletteColorCss(
    paletteChannelsFromCss("#336699", "display-p3")!,
    "display-p3",
  ),
  /^color\(display-p3 /,
);
assert.match(
  paletteColorCss(paletteChannelsFromCss("#336699", "oklch")!, "oklch"),
  /^oklch\(/,
);

// Linking: the resolved stop follows the palette color; the stored stop only keeps a link.
const scale = base.scales[1];
const stop = scale.stops[0];
store.set(updateColorStopAtom, {
  scaleId: scale.id,
  stopId: stop.id,
  paletteColorId: firstId,
});
const linkedBase = store.get(colorSystemDocumentAtom).scales[1].stops[0];
assert.equal(linkedBase.paletteColorId, firstId);
const resolvedStop = () =>
  store.get(resolvedColorSystemDocumentAtom).scales[1].stops[0];
assert.deepEqual(
  [resolvedStop().lightness, resolvedStop().hue, resolvedStop().chroma],
  [0.4, 30, 80],
);
store.set(updatePaletteColorAtom, {
  id: firstId,
  lightness: 0.25,
  hue: 200,
  chroma: 40,
});
assert.deepEqual(
  [resolvedStop().lightness, resolvedStop().hue, resolvedStop().chroma],
  [0.25, 200, 40],
);
assert.equal(
  store.get(colorSystemDocumentAtom).scales[1].stops[0].lightness,
  0.4,
);
store.set(updateColorStopAtom, {
  scaleId: scale.id,
  stopId: stop.id,
  paletteColorId: "palette-missing",
});
assert.equal(
  store.get(colorSystemDocumentAtom).scales[1].stops[0].paletteColorId,
  firstId,
);

// Mode patches: a literal override replaces the base link; a mode link beats everything.
document = store.get(colorSystemDocumentAtom);
const linkedStop = document.scales[1].stops[0];
assert.deepEqual(
  applyStopPatch(linkedStop, { lightness: 0.9 }).paletteColorId,
  undefined,
);
assert.equal(
  applyStopPatch(linkedStop, { paletteColorId: secondId, lightness: 0.9 })
    .paletteColorId,
  secondId,
);
assert.equal(applyStopPatch(linkedStop, undefined), linkedStop);
const fakeMode = (patch: object): Mode => ({
  id: "mode-test",
  key: "test",
  name: "Test",
  description: "",
  iconId: "none",
  platformIds: [],
  foundations: { color: { scaleStops: { [scale.id]: { [stop.id]: patch } } } },
});
const withLiteralMode = resolveColorDocument(
  document,
  [fakeMode({ lightness: 0.9 })],
  undefined,
  { applyMultiplier: false },
);
assert.equal(withLiteralMode.scales[1].stops[0].lightness, 0.9);
// A literal mode edit starts from the linked color, not from the stale stored copy.
assert.equal(withLiteralMode.scales[1].stops[0].hue, 200);
const withModeLink = resolveColorDocument(
  document,
  [fakeMode({ paletteColorId: secondId })],
  undefined,
  { applyMultiplier: false },
);
assert.equal(withModeLink.scales[1].stops[0].lightness, 1);
assert.equal(withModeLink.scales[1].stops[0].paletteColorId, secondId);

// Mode-scoped writes go through the same atom as base writes.
const modeStore = createStore();
const modeBase = modeStore.get(colorSystemDocumentAtom);
const modeColorId = modeStore.set(addPaletteColorAtom);
modeStore.set(updateColorStopAtom, {
  scaleId: modeBase.scales[0].id,
  stopId: modeBase.scales[0].stops[0].id,
  paletteColorId: modeColorId,
});
assert.equal(
  paletteConsumers(
    modeStore.get(colorSystemDocumentAtom),
    modeStore.get(modeSetsAtom),
    modeColorId,
  ).length,
  1,
);

// Removing detaches every consumer onto the color's current value, and undo relinks them.
const removed = store.set(removePaletteColorAtom, firstId)!;
assert.equal(removed.consumers.length, 1);
document = store.get(colorSystemDocumentAtom);
assert.equal(
  document.palette.some((color) => color.id === firstId),
  false,
);
assert.equal(document.scales[1].stops[0].paletteColorId, undefined);
assert.deepEqual(
  [
    document.scales[1].stops[0].lightness,
    document.scales[1].stops[0].hue,
    document.scales[1].stops[0].chroma,
  ],
  [0.25, 200, 40],
);
store.set(restorePaletteColorAtom, removed);
document = store.get(colorSystemDocumentAtom);
assert.equal(document.palette[0].id, firstId);
assert.equal(document.scales[1].stops[0].paletteColorId, firstId);

// Dangling links (from a revert or cancelled session) are dropped; the stop keeps its own value.
const danglingStore = createStore();
const danglingBase = danglingStore.get(colorSystemDocumentAtom);
danglingStore.set(colorSystemDocumentAtom, {
  ...danglingBase,
  scales: danglingBase.scales.map((item, index) =>
    index === 0
      ? {
          ...item,
          stops: item.stops.map((candidate, stopIndex) =>
            stopIndex === 0
              ? { ...candidate, paletteColorId: "palette-gone" }
              : candidate,
          ),
        }
      : item,
  ),
});
danglingStore.set(normalizePaletteReferencesAtom);
assert.equal(
  danglingStore.get(colorSystemDocumentAtom).scales[0].stops[0].paletteColorId,
  undefined,
);

// Swatches must be unique, so colors that render the same are flagged and the later one is left out.
const twin = { ...document.palette[0], id: "palette-twin", name: "Twin" };
const swatches = paletteSwatches([document.palette[0], twin], "srgb");
assert.equal(swatches[0].duplicateOf, undefined);
assert.equal(swatches[1].duplicateOf?.id, document.palette[0].id);

// Tokens: one per palette color, in the output format, no contrast set.
const tokens = store.get(generatedColorTokensAtom).filter(isPaletteToken);
assert.equal(tokens.length, 2);
assert.equal(tokens[0].source.scaleId, PALETTE_SCALE_ID);
assert.equal(tokens[0].name.colorName, "brand-color");
assert.equal(tokenDisplayName(tokens[0].name), "brand-color");
assert.equal(tokens[0].value, paletteColorCss(document.palette[0], "srgb"));
assert.equal(
  new Set(store.get(generatedColorTokensAtom).map((token) => token.uuid)).size,
  store.get(generatedColorTokensAtom).length,
);
assert.equal(store.get(generatedColorTokensAtom)[0].uuid, tokens[0].uuid);
store.set(colorSystemDocumentAtom, {
  ...document,
  settings: {
    ...document.settings,
    colorOutput: {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    },
  },
});
assert.match(
  store.get(generatedColorTokensAtom).filter(isPaletteToken)[0].value,
  /^color\(display-p3 /,
);
store.set(colorSystemDocumentAtom, document);

// Legacy token table edits write through to the palette color instead of creating overrides.
store.set(setTokenNameAtom, {
  uuid: tokens[0].uuid,
  name: { colorName: "brand", contrastValue: "primary" },
});
assert.equal(
  store.get(colorSystemDocumentAtom).palette[0].name,
  "brand-primary",
);
store.set(setTokenValueAtom, { uuid: tokens[0].uuid, value: "#336699" });
assert.equal(
  paletteColorCss(store.get(colorSystemDocumentAtom).palette[0], "srgb"),
  "#336699",
);
assert.equal(
  store
    .get(colorTokenSetAtom)
    .tokens.find((token) => token.uuid === tokens[0].uuid)!.valueOverridden,
  false,
);

// Cascade export: palette rows appear once, without mode fields.
const exported = buildCascadeTokenExport({
  base: store.get(colorSystemDocumentAtom),
  modeSets: store.get(modeSetsAtom),
  activeModes: [],
  activeTokens: [],
  overrides: {},
});
const paletteRows = exported.tokens.filter(
  (row) =>
    row.name.property === "color" && row.name.colorFamily === "brand-primary",
);
assert.equal(paletteRows.length, 1);
assert.deepEqual(Object.keys(paletteRows[0].name).sort(), [
  "colorFamily",
  "property",
]);

// CSS library: static custom properties on :root only.
const css = buildColorLibrary(store.get(colorSystemDocumentAtom));
assert.match(css, /:root \{[^}]*--color-palette-brand-primary: #336699;/);
assert.equal(css.split("--color-palette-brand-primary").length - 1, 1);

// Changelog: palette colors are new foundation items and revert removes them, detaching their links.
const changeStore = createStore();
const changeColorId = changeStore.set(addPaletteColorAtom);
const changeBase = changeStore.get(colorSystemDocumentAtom);
changeStore.set(updateColorStopAtom, {
  scaleId: changeBase.scales[0].id,
  stopId: changeBase.scales[0].stops[0].id,
  paletteColorId: changeColorId,
});
const groups = changeStore.get(changeGroupsAtom);
const foundationItems = groups.find(
  (group) => group.id === "foundations",
)!.items;
const paletteItem = foundationItems.find(
  (item) => item.sourceKind === "palette-color",
)!;
assert.equal(paletteItem.kind, "new");
assert.ok(foundationItems.some((item) => item.sourceKind === "scale"));
const tokenItem = groups
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.source?.scaleId === PALETTE_SCALE_ID)!;
assert.equal(tokenItem.kind, "new");
changeStore.set(revertChangeItemAtom, tokenItem);
const reverted = changeStore.get(colorSystemDocumentAtom);
assert.equal(
  reverted.palette.length,
  defaultColorDocument.palette.length,
  "reverting a new palette color leaves the shipped palette",
);
assert.ok(!reverted.palette.some((color) => color.id === changeColorId));
assert.equal(reverted.scales[0].stops[0].paletteColorId, undefined);
assert.deepEqual(
  buildChangeGroups(
    defaultColorDocument,
    generateDocumentTokens(defaultColorDocument),
  ).flatMap((group) => group.items),
  [],
);

// Token browser: name and value edits write through; metadata stays in the browser; bulk value edits are refused.
const browserStore = createStore();
browserStore.set(colorSystemDocumentAtom, {
  ...browserStore.get(colorSystemDocumentAtom),
  palette: [],
});
const browserColorId = browserStore.set(addPaletteColorAtom);
browserStore.set(addPaletteColorAtom);
const browserKey = browserStore.get(browserModeContextAtom).key;
const paletteTokens = browserStore
  .get(browserTokensAtom)
  .filter((token) => token.paletteColorId);
assert.equal(paletteTokens.length, 2);
assert.equal(canBulkEditValue(paletteTokens), false);
assert.equal(canBulkEditValue([paletteTokens[0]]), true);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [paletteTokens[0].id],
      modeKey: browserKey,
      patch: { value: "#123456" },
    }),
  /edit mode/,
);
browserStore.set(enterEditModeAtom);
browserStore.set(editBrowserTokensAtom, {
  ids: [paletteTokens[0].id],
  modeKey: browserKey,
  patch: { value: "#123456", description: "Primary brand color" },
});
const editedPalette = browserStore
  .get(colorSystemDocumentAtom)
  .palette.find((color) => color.id === browserColorId)!;
assert.equal(paletteColorCss(editedPalette, "srgb"), "#123456");
const editedToken = browserStore
  .get(browserTokensAtom)
  .find((token) => token.id === paletteTokens[0].id)!;
assert.equal(editedToken.description, "Primary brand color");
assert.equal(editedToken.value, "#123456");
assert.equal(editedToken.valueOverridden, false);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [paletteTokens[0].id],
      modeKey: browserKey,
      patch: { name: "primary-brand" },
    }),
  /registered category/,
);
const brandTermId = crypto.randomUUID();
browserStore.set(
  taxonomyDocumentAtom,
  registerTerm(
    browserStore.get(taxonomyDocumentAtom),
    "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    "primary-brand",
    brandTermId,
  ),
);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [paletteTokens[0].id],
      modeKey: browserKey,
      patch: {
        classification: {
          "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
            "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
          "b8fbee94-999d-4776-bf18-1b807b3f60b0": brandTermId,
        },
      },
    }),
  /governed/,
);
browserStore.set(editFoundationNameAtom, {
  id: `palette:${browserColorId}`,
  termId: brandTermId,
});
assert.equal(
  browserStore
    .get(browserTokensAtom)
    .find((token) => token.id === paletteTokens[0].id)!.name,
  "primary-brand",
);
assert.equal(
  browserStore
    .get(colorSystemDocumentAtom)
    .palette.find((color) => color.id === browserColorId)!.name,
  "primary-brand",
  "The source name and token projection share the registered reference.",
);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [paletteTokens[0].id],
      modeKey: browserKey,
      patch: { value: "not a color" },
    }),
  /valid color/,
);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: paletteTokens.map((token) => token.id),
      modeKey: browserKey,
      patch: { value: "#abcdef" },
    }),
  /distinct values/,
);
const otherValue = paletteColorCss(
  browserStore.get(colorSystemDocumentAtom).palette[1],
  "srgb",
);
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [paletteTokens[0].id],
      modeKey: browserKey,
      patch: { value: otherValue },
    }),
  /already in the palette/,
);
assert.equal(
  paletteColorCss(
    browserStore
      .get(colorSystemDocumentAtom)
      .palette.find((color) => color.id === browserColorId)!,
    "srgb",
  ),
  "#123456",
);

const typed: ColorSystemDocument = browserStore.get(colorSystemDocumentAtom);
assert.ok(isColorSystemDocument(typed));
console.log("Palette checks passed.");
