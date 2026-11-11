// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  addFontAtom,
  updateFontAtom,
  removeFontAtom,
  restoreFontAtom,
  typographyDocumentAtom,
  generatedTypographyAtom,
} from "../src/features/typography/state";
import {
  isTypographyDocument,
  isTypographyFont,
} from "../src/features/typography/model";
import {
  upgradeTypographyFontsDocument,
  upgradeTypographyFontsSnapshot,
} from "../src/features/typography/fontsUpgrade";
import {
  upgradeTypographySizingDocument,
  upgradeNativeSizingFields,
} from "../src/features/foundations/componentSizing";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  restoreAuthoringSnapshotAtom,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  resetAllAuthoringAtom,
  authoringSourceSnapshotAtom,
} from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { buildChangeGroups } from "../src/features/changelog/changes";
import { readPath } from "../src/features/changelog/contract";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { typographyFoundationParameters } from "../src/features/impact/sources/typographyFoundation";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { componentTokenCatalog } from "../src/features/components/references";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";
import { encodeStructureSource } from "../src/features/edit-session/structureSourceCodec";
import {
  addedText,
  deletedText,
  deleteFlow,
} from "../src/features/notifications/policy";

const baseline = createDefaultSnapshot();
const defaults = baseline.typography;
assert.deepEqual(
  defaults.fonts.map(({ name, fontFamily }) => ({ name, fontFamily })),
  [
    { name: "Sans-serif", fontFamily: "Adobe Clean Spectrum VF" },
    { name: "Serif", fontFamily: "Adobe Clean Serif" },
    { name: "Monospace", fontFamily: "Source Code Pro" },
  ],
);
assert(defaults.fonts.every(isTypographyFont));
assert.equal(isTypographyDocument({ ...defaults, fonts: [] }), true);
assert.equal(
  isTypographyDocument({
    ...defaults,
    fonts: [defaults.fonts[0], defaults.fonts[0]],
  }),
  false,
);
assert.equal(
  isTypographyFont({ ...defaults.fonts[0], id: "Sans-serif" }),
  false,
);
assert.equal(isTypographyFont({ ...defaults.fonts[0], name: " " }), false);
assert.equal(isTypographyFont({ ...defaults.fonts[0], fontFamily: "" }), true);
assert.equal(isTypographyFont({ ...defaults.fonts[0], fontFamily: 1 }), false);

const { fonts, ...oldFields } = defaults;
const legacy = { ...oldFields, schemaVersion: 9, textZoom: 1 };
const upgraded = upgradeTypographyFontsDocument(legacy);
assert(isTypographyDocument(upgraded));
assert.deepEqual(upgraded.fonts, fonts);
assert.equal(upgraded.textZoom, 1);
assert.equal(upgradeTypographyFontsDocument(upgraded), upgraded);
assert.deepEqual(upgradeTypographyFontsDocument({ ...legacy, fonts: [] }), {
  ...upgraded,
  fonts: [],
});
assert.deepEqual(
  upgradeTypographyFontsDocument({
    ...legacy,
    fonts: [{ ...fonts[0], fontFamily: "Keep me" }],
  }),
  { ...upgraded, fonts: [{ ...fonts[0], fontFamily: "Keep me" }] },
);
assert.deepEqual(
  upgradeTypographySizingDocument({ ...legacy, schemaVersion: 8 }),
  upgraded,
);
const native = upgradeNativeSizingFields({
  foundations: { typography: legacy },
});
assert(native && typeof native === "object" && "foundations" in native);
assert.deepEqual(native.foundations, { typography: upgraded });
assert.equal(upgradeTypographyFontsSnapshot(baseline), baseline);
assert.equal(upgradeTypographyFontsSnapshot(null), null);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, baseline);
store.set(editSessionSnapshotAtom, structuredClone(baseline));
assert.throws(() => store.set(addFontAtom), /edit mode/);
store.set(enterEditModeAtom);
const generatedBefore = store.get(generatedTypographyAtom);
const id = store.set(addFontAtom);
assert.equal(store.get(typographyDocumentAtom).fonts[0].id, id);
assert.equal(store.get(typographyDocumentAtom).fonts[0].name, "New font");
assert.equal(store.get(typographyDocumentAtom).fonts[0].fontFamily, "");
const secondId = store.set(addFontAtom);
assert.equal(store.get(typographyDocumentAtom).fonts[0].name, "New font 2");
store.set(updateFontAtom, { id, name: "Custom", fontFamily: "Example Family" });
assert.equal(
  store.get(typographyDocumentAtom).fonts.find((font) => font.id === id)!.name,
  "Custom",
);
assert.throws(() => store.set(updateFontAtom, { id, name: "serif" }), /unique/);
assert.throws(() => store.set(updateFontAtom, { id, name: " " }), /font name/);
assert.throws(
  () => store.set(updateFontAtom, { id: "missing", name: "Missing" }),
  /no longer/,
);
const beforeRemoval = structuredClone(store.get(typographyDocumentAtom).fonts);
const removed = store.set(removeFontAtom, id);
assert(!store.get(typographyDocumentAtom).fonts.some((font) => font.id === id));
store.set(restoreFontAtom, removed);
assert.deepEqual(store.get(typographyDocumentAtom).fonts, beforeRemoval);
assert.throws(() => store.set(restoreFontAtom, removed), /already/);
assert.throws(() => store.set(removeFontAtom, "missing"), /no longer/);
assert.deepEqual(store.get(generatedTypographyAtom), generatedBefore);
store.set(removeFontAtom, secondId);
store.set(cancelEditAtom);
assert.deepEqual(store.get(typographyDocumentAtom), defaults);

const changed = structuredClone(baseline);
changed.typography.fonts[0].fontFamily = "Another Family";
changed.typography.fonts[1].name = "Serif display";
changed.platforms[0].name = "Keep unrelated edit";
const comparison = compareAuthoring(baseline, changed);
const fontSlots = comparison.slots.filter((slot) =>
  slot.id.includes('"fonts"'),
);
assert.equal(fontSlots.length, 7);
assert.equal(fontSlots.filter((slot) => slot.changed).length, 2);
const fields = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .filter((field) => field.address?.path.includes("fonts"));
assert.equal(fields.length, 2);
for (const field of fields) {
  assert(field.address);
  const reset = prepareChangeReset(
    { ...changed, attachments: {} },
    sourceResetPlan("Restore font field", [field.address]),
  );
  assert.deepEqual(
    readPath(reset, field.address.path),
    readPath(baseline, field.address.path),
  );
  assert.equal(reset.platforms[0].name, changed.platforms[0].name);
  const other = fields.find((candidate) => candidate !== field)!;
  assert.deepEqual(
    readPath(reset, other.address!.path),
    readPath(changed, other.address!.path),
  );
}
const impact = typographyFoundationParameters(changed.typography).filter(
  (record) => record.id.includes("/fonts/") || record.id.endsWith("/fontOrder"),
);
assert.equal(impact.length, 7);
assert.equal(impact.filter((record) => record.edited).length, 2);
assert.deepEqual(
  generateTypography(changed.typography),
  generateTypography(defaults),
);
assert.equal(
  buildTypographyCss(changed.typography),
  buildTypographyCss(defaults),
);
assert.deepEqual(
  componentTokenCatalog(changed).filter(
    (token) => !fonts.some((font) => font.conceptId === token.id),
  ),
  componentTokenCatalog(baseline).filter(
    (token) => !fonts.some((font) => font.conceptId === token.id),
  ),
);
const componentImpact = componentImpactForSnapshots(baseline, changed);
assert.equal(componentImpact.status, "ready");
if (componentImpact.status === "ready")
  assert.equal(componentImpact.summary.affected.count, 0);
const legacyChanges = buildChangeGroups(
  changed.colorSystem,
  [],
  changed.modeSets,
  [],
  undefined,
  changed.typography,
);
assert(
  legacyChanges
    .flatMap((group) => group.items)
    .some(
      (item) =>
        item.sourceKind === "typography" &&
        item.fields.some((field) => /Fonts/i.test(field.key)),
    ),
);

for (const operation of ["add", "remove", "order"] as const) {
  const working = structuredClone(baseline);
  if (operation === "add")
    working.typography.fonts.unshift({
      id: crypto.randomUUID(),
      uuid: crypto.randomUUID(),
      conceptId: crypto.randomUUID(),
      name: "Extra",
      fontFamily: "",
    });
  if (operation === "remove") working.typography.fonts.splice(1, 1);
  if (operation === "order") working.typography.fonts.reverse();
  working.platforms[0].name = "Keep unrelated edit";
  const result = compareAuthoring(baseline, working);
  const changedSlots = result.slots.filter(
    (slot) => slot.id.includes('"fonts"') && slot.changed,
  );
  assert.equal(changedSlots.length, operation === "order" ? 1 : 2);
  const addresses = result.groups
    .flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .filter((field) => field.address?.path.includes("fonts"))
    .map((field) => field.address!);
  const reset = prepareChangeReset(
    { ...working, attachments: {} },
    sourceResetPlan("Restore fonts", addresses),
  );
  assert.deepEqual(reset.typography.fonts, defaults.fonts);
  assert.equal(reset.platforms[0].name, working.platforms[0].name);
}

const data = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
  },
});
for (const version of [29, 30, 31]) {
  data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version,
      working: encodeStructureSource({ ...baseline, typography: legacy }),
      saved: encodeStructureSource({
        ...baseline,
        typography: { ...legacy, textZoom: 0 },
      }),
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const record = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
  assert.equal(record.version, AUTHORING_RECORD_VERSION);
  assert.deepEqual(record.working.typography.fonts, fonts);
  assert.deepEqual(record.saved.typography.fonts, fonts);
  assert.equal(record.working.typography.textZoom, 1);
  assert.equal(record.saved.typography.textZoom, 0);
  writeAuthoringRecord(record);
  assert.deepEqual(readAuthoringRecord(assertStoredSnapshot), record);
}
store.set(enterEditModeAtom);
store.set(updateFontAtom, { id: fonts[0].id, fontFamily: "Saved Family" });
store.set(saveEditAtom);
store.set(updateFontAtom, { id: fonts[0].id, fontFamily: "Unsaved Family" });
store.set(cancelEditAtom);
assert.equal(
  store.get(typographyDocumentAtom).fonts[0].fontFamily,
  "Saved Family",
);
const saved = readAuthoringRecord(assertStoredSnapshot)!;
const reloaded = createStore();
reloaded.set(restoreAuthoringSnapshotAtom, saved.working);
reloaded.set(editSessionSnapshotAtom, saved.saved);
assert.equal(
  reloaded.get(typographyDocumentAtom).fonts[0].fontFamily,
  "Saved Family",
);
reloaded.set(enterEditModeAtom);
for (const font of [...reloaded.get(typographyDocumentAtom).fonts])
  reloaded.set(removeFontAtom, font.id);
reloaded.set(saveEditAtom);
assert.deepEqual(
  readAuthoringRecord(assertStoredSnapshot)!.saved.typography.fonts,
  [],
);
reloaded.set(resetAllAuthoringAtom);
assert.deepEqual(
  reloaded.get(authoringSourceSnapshotAtom).typography.fonts,
  fonts,
);
Reflect.deleteProperty(globalThis, "window");
assert.equal(addedText("font"), "Font added");
assert.equal(deletedText("font"), "Font deleted");
assert.equal(deleteFlow("font", 0), "toast");
console.log(
  "Typography Fonts: defaults, editing, identity, migrations, Changes/reset, Impact, unchanged output and Save/Cancel/reload passed.",
);
