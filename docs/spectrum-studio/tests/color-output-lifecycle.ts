// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  isSnapshot,
} from "../src/features/edit-session/state";
import { upgradeColorOutputSnapshot } from "../src/features/edit-session/colorOutputUpgrade";
import {
  isColorSystemDocument,
  migrateColorSystemDocument,
} from "../src/features/color-system/model";
import {
  colorSystemDocumentAtom,
  colorOutputSettingsAtom,
  updateColorOutputSettingsAtom,
} from "../src/features/color-system/state";
import { editModeAtom } from "../src/state/view/editMode";
import { AUTHORING_RECORD_VERSION } from "../src/features/edit-session/storage";

const baseline = createDefaultSnapshot();
for (const outputGamut of ["srgb", "display-p3", "oklch"] as const) {
  const { colorOutput, ...settings } = baseline.colorSystem.settings;
  void colorOutput;
  const legacy = {
    ...baseline,
    colorSystem: {
      ...baseline.colorSystem,
      schemaVersion: 4,
      settings: { ...settings, outputGamut },
    },
  };
  const migrated = upgradeColorOutputSnapshot(legacy, 12);
  assert(isSnapshot(migrated));
  assert.equal(migrated.colorSystem.schemaVersion, 5);
  assert.equal(
    migrated.structures?.schemaVersion,
    baseline.structures?.schemaVersion,
  );
  assert.deepEqual(migrated.components, baseline.components);
  assert.deepEqual(migrated.taxonomy, baseline.taxonomy);
  assert.deepEqual(migrated.colorSystem.scales, baseline.colorSystem.scales);
  assert.equal(
    migrated.colorSystem.settings.colorOutput.outputFormat,
    outputGamut === "srgb"
      ? "hex"
      : outputGamut === "display-p3"
        ? "rgb"
        : "oklch",
  );
  assert.equal(
    migrated.colorSystem.settings.colorOutput.authoringGamut,
    outputGamut === "display-p3" ? "display-p3" : "srgb",
  );
  const invalid = {
    ...legacy.colorSystem,
    settings: { ...legacy.colorSystem.settings, outputGamut: "rec2020" },
  };
  assert.equal(migrateColorSystemDocument(invalid, 4), null);
}
assert.equal(AUTHORING_RECORD_VERSION, 20);
const store = createStore();
const original = structuredClone(store.get(colorSystemDocumentAtom));
assert.throws(
  () => store.set(updateColorOutputSettingsAtom, { authoringGamut: "rec2020" }),
  /Choose Edit/,
);
store.set(editModeAtom, true);
store.set(updateColorOutputSettingsAtom, { outputFormat: "hex" });
assert.match(
  store.set(updateColorOutputSettingsAtom, { authoringGamut: "rec2020" }) ?? "",
  /changed to RGB/,
);
assert.deepEqual(store.get(colorOutputSettingsAtom), {
  authoringGamut: "rec2020",
  outputFormat: "rgb",
  mapOutputsToSrgb: false,
});
store.set(updateColorOutputSettingsAtom, { mapOutputsToSrgb: true });
store.set(updateColorOutputSettingsAtom, { outputFormat: "hex" });
assert.equal(store.get(colorOutputSettingsAtom).outputFormat, "hex");
assert.match(
  store.set(updateColorOutputSettingsAtom, { mapOutputsToSrgb: false }) ?? "",
  /changed to RGB/,
);
assert.deepEqual(store.get(colorSystemDocumentAtom).palette, original.palette);
assert.deepEqual(store.get(colorSystemDocumentAtom).scales, original.scales);
const invalid = structuredClone(original);
invalid.settings.colorOutput = {
  authoringGamut: "display-p3",
  outputFormat: "hex",
  mapOutputsToSrgb: false,
};
assert.equal(isColorSystemDocument(invalid), false);
assert.throws(
  () => store.set(colorSystemDocumentAtom, invalid),
  /Invalid Color/,
);
console.log(
  "Color output: independent legacy semantics, schema/envelope boundaries, source preservation, edit guards and atomic format fallback passed.",
);
