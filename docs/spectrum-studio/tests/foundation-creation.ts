// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  addColorScaleAtom,
  colorSystemDocumentAtom,
  removeColorScaleAtom,
  restoreColorScaleAtom,
} from "../src/features/color-system/state";
import {
  addContinuousDataVisAtom,
  applyCategoricalDataVisAtom,
  dataVisContextFingerprintAtom,
  dataVisUiSwatchesAtom,
} from "../src/features/color-system/data-vis/state";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  type CategoricalDataVisScale,
} from "../src/features/color-system/data-vis/model";
import {
  addSpacingScaleAtom,
  spacingDocumentAtom,
} from "../src/features/spacing/state";
import { addSizeScaleAtom, sizeDocumentAtom } from "../src/features/size/state";
import {
  addRadiusScaleAtom,
  radiusDocumentAtom,
} from "../src/features/radius/state";
import {
  addLineHeightAtom,
  typographyDocumentAtom,
} from "../src/features/typography/state";
import {
  addShadowLayerAtom,
  elevationDocumentAtom,
} from "../src/features/elevation/state";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import {
  selectedColorScaleIdAtom,
  selectedColorStopIdAtom,
} from "../src/state/view/colorSystemView";
import { selectedDataVisScaleIdAtom } from "../src/state/view/dataVisView";
import {
  captureSnapshot,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import { AUTHORING_STORAGE_KEY } from "../src/features/edit-session/storage";

const store = createStore();
store.set(enterEditModeAtom);
const initialTokens = store.get(browserTokensAtom);
const initial = captureSnapshot(store.get);

for (const [add, document] of [
  [addSpacingScaleAtom, spacingDocumentAtom],
  [addSizeScaleAtom, sizeDocumentAtom],
  [addRadiusScaleAtom, radiusDocumentAtom],
] as const) {
  const before = store.get(document).scales;
  const first = store.set(add);
  const second = store.set(add);
  assert.deepEqual(
    store.get(document).scales.map((scale) => scale.id),
    [second, first, ...before.map((scale) => scale.id)],
  );
  assert.deepEqual(
    store.get(document).scales.slice(2),
    before,
    "Existing scales keep their order and contents.",
  );
}

const colors = store.get(colorSystemDocumentAtom);
const firstColor = store.set(addColorScaleAtom);
const secondColor = store.set(addColorScaleAtom);
assert.deepEqual(
  store.get(colorSystemDocumentAtom).scales.map((scale) => scale.id),
  [secondColor, firstColor, ...colors.scales.map((scale) => scale.id)],
);
assert.equal(
  store.get(colorSystemDocumentAtom).backgroundScaleId,
  colors.backgroundScaleId,
);
assert.equal(store.get(selectedColorScaleIdAtom), secondColor);
assert.equal(
  store.get(selectedColorStopIdAtom),
  store.get(colorSystemDocumentAtom).scales[0].stops[0].id,
);
const removed = store.set(removeColorScaleAtom, firstColor);
assert(removed.ok && removed.removedScale);
store.set(restoreColorScaleAtom, removed.removedScale);
assert.equal(
  store.get(colorSystemDocumentAtom).scales[1].id,
  firstColor,
  "Undo restores the original index, not the top.",
);

const dataVis = store.get(colorSystemDocumentAtom).dataVisScales;
const sequential = store.set(addContinuousDataVisAtom, "sequential");
const diverging = store.set(addContinuousDataVisAtom, "diverging");
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales.map((scale) => scale.id),
  [diverging, sequential, ...dataVis.map((scale) => scale.id)],
);
assert.equal(store.get(selectedDataVisScaleIdAtom), diverging);
const swatch = store.get(dataVisUiSwatchesAtom)[0];
assert(swatch);
const category: CategoricalDataVisScale = {
  id: "creation-test-category",
  name: "Creation test category",
  kind: "categorical",
  members: [{ id: "creation-test-member", source: swatch.source }],
  preferences: {
    ...DEFAULT_CATEGORICAL_PREFERENCES,
    minimumBackgroundContrast: 1,
    minimumDeltaE: 0,
    cvdProfiles: [],
  },
};
store.set(applyCategoricalDataVisAtom, {
  scale: category,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: false,
});
assert.equal(
  store.get(colorSystemDocumentAtom).dataVisScales[0].id,
  category.id,
);
const latest = store.set(addContinuousDataVisAtom, "sequential");
const beforeEdit = store
  .get(colorSystemDocumentAtom)
  .dataVisScales.map((scale) => scale.id);
store.set(applyCategoricalDataVisAtom, {
  scale: category,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: false,
});
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales.map((scale) => scale.id),
  beforeEdit,
  "Editing an existing categorical recipe does not move it.",
);
assert.equal(beforeEdit[0], latest);

const lineHeights = store.get(typographyDocumentAtom).lineHeights;
const firstLineHeight = store.set(addLineHeightAtom);
const secondLineHeight = store.set(addLineHeightAtom);
assert.deepEqual(
  store.get(typographyDocumentAtom).lineHeights.map((card) => card.id),
  [secondLineHeight, firstLineHeight, ...lineHeights.map((card) => card.id)],
);
assert.equal(
  store.get(typographyDocumentAtom).previewLineHeightId,
  initial.typography.previewLineHeightId,
);

const shadows = store.get(elevationDocumentAtom).layers;
const shadow = store.set(addShadowLayerAtom);
assert.deepEqual(
  store.get(elevationDocumentAtom).layers.map((layer) => layer.id),
  [...shadows.map((layer) => layer.id), shadow],
  "Creation focus must not change shadow stacking.",
);
const currentTokens = new Map(
  store.get(browserTokensAtom).map((token) => [token.id, token]),
);
for (const token of initialTokens.filter(
  (token) => token.type !== "elevation",
)) {
  assert.deepEqual(
    currentTokens.get(token.id),
    token,
    `Creation must not change existing token ${token.id}.`,
  );
}

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    throw new Error("Broad storage clearing is prohibited.");
  }
}
const memory = new MemoryStorage();
const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: memory,
    sessionStorage: new MemoryStorage(),
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});
try {
  store.set(saveEditAtom);
  assert(memory.getItem(AUTHORING_STORAGE_KEY));
  const saved = captureSnapshot(store.get);
  store.set(addColorScaleAtom);
  store.set(addSpacingScaleAtom);
  store.set(addLineHeightAtom);
  store.set(cancelEditAtom);
  assert.deepEqual(
    captureSnapshot(store.get),
    saved,
    "Cancel restores the saved order and complete graph.",
  );
  const reloaded = createStore();
  const dispose = initializeAuthoringPersistence(reloaded);
  try {
    assert.deepEqual(
      captureSnapshot(reloaded.get),
      saved,
      "The existing authoring envelope preserves order on reload.",
    );
  } finally {
    dispose();
  }
} finally {
  if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Foundation creation preserves insertion order, identity, references, lifecycle and shadow stacking.",
);
