// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import {
  componentColorWitnessAtom,
  createComponentColorWitness,
  matchesComponentColorWitness,
} from "../src/features/components/colorWitness";
import { createComponentReferenceWitnesses } from "../src/features/components/contrastWitness";
import {
  assertComponentReferences,
  componentTokenCatalog,
  componentTokenCatalogWithColorWitness,
} from "../src/features/components/references";
import {
  captureSnapshot,
  createDefaultSnapshot,
} from "../src/features/edit-session/state";
import {
  scaleTypesAtom,
  replaceScaleTypeAtom,
} from "../src/features/logic/scaleTypeLibrary";
import { editModeAtom } from "../src/state/view/editMode";
import { ColorOutputError } from "../src/features/color-system/outputContrast";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";
import { componentTokensAtom } from "../src/features/components/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";

const source = createDefaultSnapshot();
const before = structuredClone(source);
const prepared = componentTokenCatalogWithColorWitness(source);
const witness = prepared.componentColorWitness;
assert.ok(witness);
assert.ok(
  witness.scaleColors?.length,
  "Worker preparation must capture actual complete scale inputs, not just the final color partition.",
);
assert.equal(matchesComponentColorWitness(witness, source), true);
assert.deepEqual(prepared.tokens, componentTokenCatalog(source));
assert.deepEqual(
  componentTokenCatalog(source, witness),
  prepared.tokens,
  "The complete collision inventory and every output remain exact.",
);
assert.deepEqual(source, before);
const transported = structuredClone(witness);
assert.deepEqual(
  componentTokenCatalog(source, transported),
  prepared.tokens,
  "Worker transport preserves usable plain-data evidence.",
);
const changedOutput = componentTokenCatalog(source, transported);
const color = changedOutput.find(
  (token) => token.id === transported.tokens[0].id,
)!;
color.name = "Changed by a consumer";
color.value = "not a color";
color.context.changed = "changed";
assert.deepEqual(
  componentTokenCatalog(source, transported),
  prepared.tokens,
  "Returned values and contexts cannot mutate the reusable partition.",
);

const independent: ((value: typeof source) => void)[] = [
  (value) => {
    value.typography.textZoom += 1;
  },
  (value) => {
    value.scaleTypes!.find(
      (formula) => formula.kind === "type-scale",
    )!.base.default += 1;
  },
  (value) => {
    value.spacing!.scales[0].above += 1;
  },
  (value) => {
    value.size!.scales[0].above += 1;
  },
  (value) => {
    value.radius!.scales[0].above += 1;
  },
  (value) => {
    value.elevation!.above += 1;
  },
];
for (const mutate of independent) {
  const proposal = structuredClone(source);
  mutate(proposal);
  assert.equal(matchesComponentColorWitness(witness, proposal), true);
  assert.deepEqual(
    componentTokenCatalog(proposal, witness),
    componentTokenCatalog(proposal),
    "Other foundations are rebuilt, never borrowed from the color partition.",
  );
}
const invalidations: ((value: typeof source) => void)[] = [
  (value) => {
    value.colorSystem.contrasts[0].value += 0.01;
  },
  (value) => {
    value.colorSystem.scales[0].stops[0].hue += 1;
  },
  (value) => {
    value.colorSystem.palette.reverse();
  },
  (value) => {
    value.colorSystem.surfaces.reverse();
  },
  (value) => {
    value.colorSystem.settings.extOffset += 0.01;
  },
  (value) => {
    value.colorSystem.settings.colorOutput.outputFormat = "rgb";
  },
  (value) => {
    value.taxonomy!.terms[0].value = "Changed";
  },
  (value) => {
    value.modeSets[0].modes.reverse();
  },
  (value) => {
    value.rules!.reverse();
  },
  (value) => {
    value.browserTokenEdits = { changed: { name: "Changed", values: {} } };
  },
  (value) => {
    value.tokenOverrides = {
      changed: {
        value: "#fff",
        baseline: {
          name: { colorName: "Changed", contrastValue: "" },
          value: "#000",
        },
        editedAt: "2026-01-01T00:00:00.000Z",
      },
    };
  },
  (value) => {
    value.colorSystem.contrasts[0].value = NaN;
  },
  (value) => {
    value.colorSystem.backgroundLightness = Infinity;
  },
];
for (const mutate of invalidations) {
  const proposal = structuredClone(source);
  mutate(proposal);
  assert.equal(
    matchesComponentColorWitness(witness, proposal),
    false,
    "Any complete color input change invalidates reuse, including in-place mutation and non-finite values.",
  );
}
for (const mutate of invalidations.slice(0, -2)) {
  const proposal = structuredClone(source);
  mutate(proposal);
  assert.deepEqual(
    componentTokenCatalog(proposal, witness),
    componentTokenCatalog(proposal),
    "Exact prepared scale inputs cannot hide new settings, modes, overrides, names, classifications or ordering.",
  );
}
const mutated = structuredClone(source);
mutated.colorSystem.palette[0].name = "Changed in place";
assert.equal(matchesComponentColorWitness(witness, mutated), false);
assert.equal(matchesComponentColorWitness(null, source), false);
assert.equal(
  createComponentColorWitness(source, [
    {
      ...witness.tokens[0],
      value: undefined,
      outputError: new ColorOutputError({
        requestedContrast: 21,
        achievableContrast: 4,
        gamut: "srgb",
        background: "#fff",
        source: "Test",
      }),
    },
  ]),
  null,
  "Typed color failures are never cached or converted to plain Error objects.",
);
const largeColorSource = {
  ...source.colorSystem,
  cachePressure: "x".repeat(5_000_001),
};
assert.equal(
  createComponentColorWitness(
    { ...source, colorSystem: largeColorSource },
    witness.tokens,
  ),
  null,
  "A single proof is byte-bounded; oversized input uses canonical generation.",
);
const nonJsonColorSource = { ...source.colorSystem, optional: undefined };
assert.equal(
  createComponentColorWitness(
    { ...source, colorSystem: nonJsonColorSource },
    witness.tokens,
  ),
  null,
  "Non-JSON inputs cannot acquire an ambiguous signature.",
);

const colliding = structuredClone(source);
colliding.components!.components[0].assignments[0].id = witness.tokens[0].id;
assert.throws(
  () =>
    assertComponentReferences(
      colliding.components!,
      colliding.taxonomy!,
      componentTokenCatalog(colliding, witness),
      { sourceOnly: true },
    ),
  /collides/,
);
const missing = structuredClone(source);
const row = missing
  .components!.components.flatMap((component) => component.assignments)
  .find((assignment) => "$ref" in assignment)!;
assert.ok("$ref" in row);
row.$ref = "missing-color-witness-reference";
assert.throws(
  () =>
    assertComponentReferences(
      missing.components!,
      missing.taxonomy!,
      componentTokenCatalog(missing, witness),
      { sourceOnly: true },
    ),
  /no longer published|unavailable/,
);
const dependent = structuredClone(source);
const sharedScale = dependent.colorSystem.scales.find(
  (scale) => !scale.customContrasts,
)!;
const dependentRow = dependent
  .components!.components.flatMap((component) => component.assignments)
  .find(
    (assignment) =>
      "$ref" in assignment &&
      prepared.tokens.some(
        (token) => token.id === assignment.$ref && token.property === "color",
      ),
  )!;
assert.ok("$ref" in dependentRow);
dependentRow.$ref = tokenUuid(
  tokenStableKey(sharedScale.id, dependent.colorSystem.contrasts[0].id),
);
const independentProofs = createComponentReferenceWitnesses(dependent);
assert.equal(independentProofs.componentContrastWitness, null);
assert.ok(
  independentProofs.componentColorWitness,
  "Color reuse does not require components to be independent of contrast values.",
);
const blocked = structuredClone(source);
blocked.colorSystem.backgroundLightness = 0.5;
blocked.colorSystem.contrasts[0].value = 21;
const failures = componentTokenCatalogWithColorWitness(blocked);
assert.ok(
  failures.tokens.some(
    (token) => token.outputError instanceof ColorOutputError,
  ),
);
assert.equal(failures.componentColorWitness, null);
assert.deepEqual(
  componentTokenCatalog(blocked, witness),
  failures.tokens,
  "Changed output availability preserves exact typed failures and never uses an old ready result.",
);
assert.equal(
  createComponentColorWitness(source, witness.tokens, [
    {
      input: "x".repeat(5_000_001),
      tokens: [],
    },
  ]),
  null,
  "The existing total proof byte bound also includes prepared scale inputs and outputs.",
);
assert.equal(
  createComponentColorWitness(source, witness.tokens, [
    {
      input: "x".repeat(1_000_001),
      tokens: [],
    },
  ]),
  null,
  "The prepared pool must respect its own byte limit even below the total proof limit.",
);
assert.equal(
  createComponentColorWitness(
    source,
    witness.tokens,
    Array.from({ length: 129 }, () => witness.scaleColors![0]),
  ),
  null,
  "The store-owned proof cannot accept a prepared pool beyond its entry limit.",
);

for (const paletteLinked of [false, true]) {
  const paletteSource = structuredClone(source);
  if (paletteLinked)
    paletteSource.colorSystem.scales[0].stops[0].paletteColorId =
      paletteSource.colorSystem.palette[0].id;
  const previous =
    componentTokenCatalogWithColorWitness(paletteSource).componentColorWitness;
  assert.ok(previous?.scaleColors?.length);
  const changed = structuredClone(paletteSource);
  changed.colorSystem.palette[0].lightness = 0.456789;
  changed.colorSystem.palette[0].hue += 7;
  assert.equal(
    matchesComponentColorWitness(previous, changed),
    false,
    "Palette coordinates still invalidate the complete color partition.",
  );
  assert.deepEqual(
    componentTokenCatalog(changed, previous),
    componentTokenCatalog(changed),
    "Only exact resolved generator arguments may be reused, including palette-linked stops and all primitive-sourced Data vis recipes.",
  );
  assert.deepEqual(
    componentTokenCatalog(blocked, previous),
    failures.tokens,
    "Prepared scale outputs cannot suppress changed output availability.",
  );
}

const store = createStore();
store.set(editModeAtom, true);
const evidence = createComponentReferenceWitnesses(captureSnapshot(store.get));
assert.ok(evidence.componentColorWitness);
store.set(componentColorWitnessAtom, evidence.componentColorWitness);
const formula = store
  .get(scaleTypesAtom)
  .find((item) => item.kind === "type-scale")!;
const expectedCatalog = componentTokenCatalog(captureSnapshot(store.get));
const original = Color.Space.prototype.to;
let conversions = 0;
Color.Space.prototype.to = new Proxy(original, {
  apply(target, receiver, args) {
    if (new Error().stack?.includes("buildComponentColorTokens"))
      conversions += 1;
    return Reflect.apply(target, receiver, args);
  },
});
try {
  assert.deepEqual(store.get(componentTokensAtom), expectedCatalog);
  assert.equal(
    conversions,
    0,
    "The visible Component catalog must use the same exact prepared colors as authoritative guards.",
  );
  const spacing = store.get(spacingDocumentAtom);
  const expandedSpacing = {
    ...spacing,
    scales: spacing.scales.map((scale, index) =>
      index === 0 ? { ...scale, above: scale.above + 1 } : scale,
    ),
  };
  store.set(spacingDocumentAtom, expandedSpacing);
  const proposal = {
    ...formula,
    base: { ...formula.base, default: formula.base.default + 1 },
  };
  store.set(replaceScaleTypeAtom, proposal);
  assert.equal(
    conversions,
    0,
    "Even the first accepted Typography write avoids unchanged all-mode color generation when the worker has prepared it.",
  );
  const updatedCatalog = store.get(componentTokensAtom);
  assert.equal(
    conversions,
    0,
    "A changed dimension source must not regenerate unchanged colors in the visible catalog.",
  );
  assert.notDeepEqual(
    updatedCatalog,
    expectedCatalog,
    "Non-color values still follow the current source.",
  );
  assert.deepEqual(
    updatedCatalog,
    componentTokenCatalog(captureSnapshot(store.get)),
  );
  conversions = 0;
  const second = createStore();
  second.set(editModeAtom, true);
  assert.equal(second.get(componentColorWitnessAtom), null);
  second.set(replaceScaleTypeAtom, proposal);
  second.set(spacingDocumentAtom, expandedSpacing);
  assert.ok(
    conversions > 0,
    "A separate store without evidence performs complete canonical generation.",
  );
  assert.deepEqual(
    captureSnapshot(store.get),
    captureSnapshot(second.get),
    "Accepted authoring data is identical with and without reuse.",
  );
  conversions = 0;
  assert.deepEqual(second.get(componentTokensAtom), updatedCatalog);
  assert.ok(
    conversions > 0,
    "A visible catalog without evidence still performs canonical color generation.",
  );
  conversions = 0;
  second.set(
    componentColorWitnessAtom,
    structuredClone(evidence.componentColorWitness),
  );
  assert.deepEqual(second.get(componentTokensAtom), updatedCatalog);
  assert.equal(
    conversions,
    0,
    "Late worker evidence preserves the complete current catalog without regenerating its colors.",
  );
  second.set(componentColorWitnessAtom, null);
  assert.deepEqual(second.get(componentTokensAtom), updatedCatalog);
  assert.ok(
    conversions > 0,
    "Disposal of evidence restores the uncached path without stale catalog values.",
  );
} finally {
  Color.Space.prototype.to = original;
}
console.log(
  "Component color evidence: complete canonical parity, independent-foundation rebuilding, exact mutable-source invalidation, detached outputs, worker transport, bounded memory, uncached errors, protected collisions/references and isolated authoritative writes passed.",
);
