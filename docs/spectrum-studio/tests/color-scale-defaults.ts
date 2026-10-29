// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createColorDefaults } from "../src/data/defaults";
import { changeGroupsAtom } from "../src/features/changelog/state";
import {
  paletteConsumers,
  resolvePaletteLinks,
} from "../src/features/color-system/paletteReferences";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  updatePaletteColorAtom,
} from "../src/features/color-system/state";
import { modeSetsAtom } from "../src/features/modes/state";
import { browserTokenImpactRecordsAtom } from "../src/features/tokens/browserSavedState";
import { generatedColorTokensAtom } from "../src/features/tokens/state";

const base = createColorDefaults();
const expectedPaletteLinks = [
  ["scale-14", "Orange", "stop-15", 0, 3, "illustrator-color"],
  ["scale-29", "Celery", "stop-30", 0, 2, "dimension-color"],
  ["scale-44", "Cyan", "stop-46", 1, 3, "photoshop-color"],
  ["scale-53", "Indigo", "stop-54", 0, 3, "after-effects-color"],
  ["scale-60", "Fuchsia", "stop-61", 0, 3, "xd-color"],
  ["scale-3", "Magenta", "stop-4", 0, 2, "indesign-color"],
] as const;
for (const [
  scaleId,
  name,
  stopId,
  index,
  count,
  paletteId,
] of expectedPaletteLinks) {
  const scale = base.scales.find((item) => item.id === scaleId)!;
  assert.equal(scale.name, name);
  assert.equal(
    scale.stops.length,
    count,
    `${name} retains its existing stops.`,
  );
  const stop = scale.stops[index];
  assert.equal(stop.id, stopId);
  assert.equal(stop.paletteColorId, paletteId);
  const palette = base.palette.find((item) => item.id === paletteId)!;
  assert.deepEqual(
    [stop.lightness, stop.hue, stop.chroma],
    [palette.lightness, palette.hue, palette.chroma],
  );
  if (name !== "Cyan")
    assert.equal(
      stop.lightness,
      Math.max(...scale.stops.map((item) => item.lightness)),
    );
}
assert.equal(
  base.scales
    .flatMap((scale) => scale.stops)
    .filter((stop) => stop.paletteColorId).length,
  6,
  "Only the six requested default stops link to palette colors.",
);
assert.deepEqual(
  resolvePaletteLinks(base),
  base,
  "Stored channels already match the linked palette colors.",
);

const store = createStore();
assert.deepEqual(
  store.get(changeGroupsAtom).flatMap((group) => group.items),
  [],
  "Shipped palette links are not working edits.",
);
assert.ok(
  store
    .get(browserTokenImpactRecordsAtom)
    .every(
      (record) =>
        !record.nameChanged &&
        !record.manuallyOverridden &&
        record.modeValues.every((value) => !value.changed),
    ),
  "Fresh palette-linked defaults have no saved token impact.",
);

for (const palette of base.palette) {
  const linkedStore = createStore();
  const consumers = paletteConsumers(
    base,
    linkedStore.get(modeSetsAtom),
    palette.id,
  );
  assert.equal(
    consumers.length,
    1,
    `${palette.name} has one shipped scale consumer.`,
  );
  const { scaleId, stopId } = consumers[0];
  const resolvedStop = () =>
    linkedStore
      .get(resolvedColorSystemDocumentAtom)
      .scales.find((item) => item.id === scaleId)!
      .stops.find((item) => item.id === stopId)!;
  assert.deepEqual(
    [resolvedStop().lightness, resolvedStop().hue, resolvedStop().chroma],
    [palette.lightness, palette.hue, palette.chroma],
  );
  const beforeTokens = linkedStore.get(generatedColorTokensAtom);
  const nextHue = (palette.hue + 40) % 360;
  assert.deepEqual(
    linkedStore.set(updatePaletteColorAtom, { id: palette.id, hue: nextHue }),
    { ok: true },
  );
  const editedPalette = linkedStore
    .get(colorSystemDocumentAtom)
    .palette.find((item) => item.id === palette.id)!;
  assert.ok(Math.abs(editedPalette.hue - nextHue) < 1e-10);
  assert.deepEqual(
    [resolvedStop().lightness, resolvedStop().hue, resolvedStop().chroma],
    [editedPalette.lightness, editedPalette.hue, editedPalette.chroma],
    "Each shipped link follows palette edits.",
  );
  assert.deepEqual(
    linkedStore.get(colorSystemDocumentAtom).scales,
    base.scales,
    "Palette edits do not rewrite stored scale stops.",
  );
  const afterTokens = linkedStore.get(generatedColorTokensAtom);
  assert.deepEqual(
    afterTokens.map((token) => token.uuid),
    beforeTokens.map((token) => token.uuid),
    "Palette edits preserve token identities and counts.",
  );
  assert.ok(
    afterTokens.some(
      (token) =>
        token.source.scaleId === scaleId &&
        token.value !==
          beforeTokens.find((previous) => previous.uuid === token.uuid)!.value,
    ),
    "Linked scale outputs are regenerated after a palette edit.",
  );
  assert.equal(resolvedStop().paletteColorId, palette.id);
}

console.log(
  "Default color scales: six exact palette links, live propagation, stable token identities and clean saved baselines passed.",
);
