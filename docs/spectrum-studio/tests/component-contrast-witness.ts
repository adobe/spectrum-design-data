// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import {
  createComponentContrastWitness,
  matchesComponentContrastWitness,
  componentContrastWitnessAtom,
} from "../src/features/components/contrastWitness";
import { componentTokenCatalog } from "../src/features/components/references";
import {
  captureSnapshot,
  createDefaultSnapshot,
} from "../src/features/edit-session/state";
import {
  colorSystemDocumentAtom,
  contrastTokensAtom,
  updateContrastTokenAtom,
} from "../src/features/color-system/state";
import { editModeAtom } from "../src/state/view/editMode";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";

const source = createDefaultSnapshot();
const witness = createComponentContrastWitness(source);
assert.ok(
  witness,
  "Shipped component references are independent of shared contrast values.",
);
assert.equal(matchesComponentContrastWitness(witness, source), true);
const proposal = structuredClone(source);
proposal.colorSystem.contrasts[0].value += 0.01;
proposal.colorSystem.contrasts[1].oppositeValue = 2;
assert.equal(matchesComponentContrastWitness(witness, proposal), true);
const before = new Map(
  componentTokenCatalog(source).map((token) => [token.id, token]),
);
const after = new Map(
  componentTokenCatalog(proposal).map((token) => [token.id, token]),
);
assert.deepEqual(
  [...after.keys()],
  [...before.keys()],
  "Value edits preserve the complete collision inventory.",
);
for (const component of source.components!.components)
  for (const row of component.assignments)
    if ("$ref" in row) {
      assert.deepEqual(
        after.get(row.$ref),
        before.get(row.$ref),
        "Referenced values, types, ownership and contexts remain exact.",
      );
    }

const invalidations: ((value: typeof source) => void)[] = [
  (value) => {
    value.colorSystem.contrasts[0].id += "-changed";
  },
  (value) => {
    value.colorSystem.contrasts.reverse();
  },
  (value) => {
    value.colorSystem.contrasts.pop();
  },
  (value) => {
    value.colorSystem.contrasts[0].value = NaN;
  },
  (value) => {
    value.colorSystem.contrasts[0].oppositeValue = Infinity;
  },
  (value) => {
    value.colorSystem.contrasts[0].value = 22;
  },
  (value) => {
    value.colorSystem.backgroundLightness = 0.7;
  },
  (value) => {
    value.colorSystem.settings.extOffset += 0.01;
  },
  (value) => {
    value.colorSystem.scales[0].stops[0].hue += 1;
  },
  (value) => {
    value.colorSystem.scales.find(
      (scale) => scale.customContrasts,
    )!.customContrasts!.steps[0].value += 0.01;
  },
  (value) => {
    value.taxonomy!.terms[0].value = "changed";
  },
  (value) => {
    value.modeSets[0].modes.reverse();
  },
  (value) => {
    value.typography.textZoom += 0.1;
  },
  (value) => {
    value.spacing!.scales[0].above += 1;
  },
  (value) => {
    value.components!.components[0].declaration.displayName += " changed";
  },
  (value) => {
    value.browserTokenEdits = { test: { name: "changed", values: {} } };
  },
];
for (const mutate of invalidations) {
  const altered = structuredClone(source);
  mutate(altered);
  assert.equal(
    matchesComponentContrastWitness(witness, altered),
    false,
    "Other source, identity, ordering and declaration changes need full validation.",
  );
}
const mutable = structuredClone(source);
const detachedWitness = createComponentContrastWitness(mutable);
mutable.components!.components[0].declaration.displayName = "Mutated in place";
assert.equal(
  matchesComponentContrastWitness(detachedWitness, mutable),
  false,
  "Proof is detached from mutable input references.",
);

const dependent = structuredClone(source);
const globalScale = dependent.colorSystem.scales.find(
  (scale) => !scale.customContrasts,
)!;
const globalTokenId = tokenUuid(
  tokenStableKey(globalScale.id, dependent.colorSystem.contrasts[0].id),
);
const colorReference = dependent
  .components!.components.flatMap((component) => component.assignments)
  .find((row) => "$ref" in row && before.get(row.$ref)?.property === "color")!;
assert.ok("$ref" in colorReference);
colorReference.$ref = globalTokenId;
assert.equal(
  createComponentContrastWitness(dependent),
  null,
  "A component using shared scale values never receives this proof.",
);
assert.equal(matchesComponentContrastWitness(witness, dependent), false);

const colliding = structuredClone(source);
colliding.components!.components[0].assignments[0].id = [...before.keys()][0];
assert.throws(() => createComponentContrastWitness(colliding), /collides/);
const missing = structuredClone(source);
const missingRef = missing
  .components!.components.flatMap((component) => component.assignments)
  .find((row) => "$ref" in row)!;
assert.ok("$ref" in missingRef);
missingRef.$ref = tokenUuid("missing-witness-reference");
assert.throws(
  () => createComponentContrastWitness(missing),
  /no longer published|unavailable/,
);

const store = createStore();
store.set(editModeAtom, true);
store.set(
  componentContrastWitnessAtom,
  createComponentContrastWitness(captureSnapshot(store.get)),
);
assert.ok(store.get(componentContrastWitnessAtom));
const first = store.get(contrastTokensAtom)[0];
const originalTo = Color.Space.prototype.to;
let catalogConversions = 0;
Color.Space.prototype.to = new Proxy(originalTo, {
  apply(target, receiver, args) {
    if (new Error().stack?.includes("generateColors")) catalogConversions += 1;
    return Reflect.apply(target, receiver, args);
  },
});
try {
  store.set(updateContrastTokenAtom, {
    id: first.id,
    value: first.value + 0.01,
  });
  assert.equal(
    catalogConversions,
    0,
    "A proven independent edit performs no all-mode color evaluation in the guard.",
  );
  const current = store.get(colorSystemDocumentAtom);
  assert.throws(
    () =>
      store.set(colorSystemDocumentAtom, {
        ...current,
        contrasts: current.contrasts.map((contrast, index) =>
          index ? contrast : { ...contrast, value: NaN },
        ),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.stack?.includes("buildComponentTokenCatalog") === true,
  );
  assert.equal(
    store.get(colorSystemDocumentAtom),
    current,
    "Source shape validation is never skipped.",
  );
  const second = createStore();
  second.set(editModeAtom, true);
  second.set(updateContrastTokenAtom, {
    id: first.id,
    value: first.value + 0.01,
  });
  assert.deepEqual(
    store.get(colorSystemDocumentAtom),
    second.get(colorSystemDocumentAtom),
    "The optimized authoring write is identical to the complete guarded path, including polarity rounding.",
  );
  assert.deepEqual(
    store.get(contrastTokensAtom),
    second.get(contrastTokensAtom),
  );
  second.set(updateContrastTokenAtom, {
    id: first.id,
    value: first.value + 0.03,
  });
  assert.ok(
    catalogConversions > 0,
    "Another store without proof uses complete canonical validation.",
  );
} finally {
  Color.Space.prototype.to = originalTo;
}
console.log(
  "Component contrast proof: exact complete inventory/reference parity, selective eligibility, mutation safety, invalidation, collision/missing-source rejection, guarded writes and store isolation passed.",
);
