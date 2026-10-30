// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createTaxonomyDefaults } from "../src/features/taxonomy/defaults";
import {
  assertTaxonomy,
  projectClassification,
  registerTerm,
  taxonomyIssues,
} from "../src/features/taxonomy/model";
import {
  groupBrowserCards,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import { taxonomyTokenTree } from "../src/features/taxonomy/tree";
import { buildTaxonomyExport } from "../src/features/taxonomy/export";
import { createStore } from "jotai";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import {
  changeGroupsAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import {
  captureDimensionSource,
  dimensionSourceHash,
} from "../src/features/design-data/dimensionArtifacts";
import { authoringSnapshotAtom } from "../src/features/edit-session/state";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { typographyDocumentAtom } from "../src/features/typography/state";
import { contributeTerms } from "../src/features/taxonomy/contributions";
import { editReferencedTaxonomyAtom } from "../src/features/taxonomy/editing";
import {
  browserModeContextAtom,
  browserTokenSourcesAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { kebabCaseNameFormatter } from "../src/features/taxonomy/formatting";

assert.equal(kebabCaseNameFormatter.formatValue(-100), "minus-100");
assert.equal(kebabCaseNameFormatter.formatValue(1.25), "1-25");
assert.equal(kebabCaseNameFormatter.formatValue(1e21), "1eplus-21");

let document = createTaxonomyDefaults();
const ids = {
  red: crypto.randomUUID(),
  index: crypto.randomUUID(),
  focus: crypto.randomUUID(),
  focusRing: crypto.randomUUID(),
  words: crypto.randomUUID(),
  hyphen: crypto.randomUUID(),
  ab: crypto.randomUUID(),
  c: crypto.randomUUID(),
  a: crypto.randomUUID(),
  bc: crypto.randomUUID(),
};
document = registerTerm(
  document,
  "b8fbee94-999d-4776-bf18-1b807b3f60b0",
  "red",
  ids.red,
);
document = registerTerm(
  document,
  "fe55c281-7565-40c8-b9d1-3b5f1cfff917",
  100,
  ids.index,
);
const classification = {
  "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
    "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
  "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.red,
  "fe55c281-7565-40c8-b9d1-3b5f1cfff917": ids.index,
};
assertTaxonomy(document);
assert.equal(
  projectClassification(document, classification, "colors").name,
  "red-color-100",
);
assert.deepEqual(
  projectClassification(document, classification, "colors").segments.map(
    (segment) => segment.values,
  ),
  [["red"], ["color"], [100]],
);
assert.equal(
  projectClassification(document, classification, "colors").flat.property,
  "color",
);
const reordered = { ...document, order: [...document.order].reverse() };
assert.equal(
  projectClassification(reordered, classification, "colors").name,
  "100-color-red",
);
const titled = {
  ...document,
  terms: document.terms.map((term) =>
    term.id === ids.red ? { ...term, value: "Red" } : term,
  ),
};
assert.equal(
  projectClassification(titled, classification, "colors").name,
  "red-color-100",
);
assert.deepEqual(
  projectClassification(titled, classification, "colors").segments[0].values,
  ["Red"],
);
assert.deepEqual(
  projectClassification(reordered, classification, "colors").classification,
  classification,
);
assert.throws(
  () =>
    registerTerm(
      document,
      "b8fbee94-999d-4776-bf18-1b807b3f60b0",
      "100",
      crypto.randomUUID(),
    ),
  /already owned/,
);
document = registerTerm(
  document,
  "b8fbee94-999d-4776-bf18-1b807b3f60b0",
  "focus",
  ids.focus,
);
assert.throws(
  () =>
    registerTerm(
      document,
      "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
      " Focus ",
      crypto.randomUUID(),
    ),
  /already owned/,
);
document = registerTerm(
  document,
  "b8fbee94-999d-4776-bf18-1b807b3f60b0",
  "focus-ring",
  ids.focusRing,
);
assert.equal(
  registerTerm(
    document,
    "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    " FOCUS ",
    crypto.randomUUID(),
  ),
  document,
);
assert(
  taxonomyIssues({ ...document, order: [...document.order, document.order[0]] })
    .length,
);
assert(
  taxonomyIssues({
    ...document,
    terms: [
      ...document.terms,
      {
        id: crypto.randomUUID(),
        categoryId: "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
        value: " RED ",
        description: "",
      },
    ],
  }).some((issue) => issue.includes("already owned")),
);
assert(
  taxonomyIssues({
    ...document,
    classifications: { token: { missing: ids.red } },
  }).length,
);
assert(taxonomyIssues({ ...document, unknown: true }).length);
assert(
  taxonomyIssues({
    ...document,
    terms: document.terms.map((term) => ({ ...term, hiddenAlias: "bypass" })),
  }).length,
);
assert.throws(
  () =>
    contributeTerms(
      document,
      [],
      [{ field: "foundationScale", value: " Focus " }],
    ),
  /already owned/,
);
assert(
  !projectClassification(
    document,
    { "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.focusRing },
    "colors",
  ).issues.some((issue) => issue.includes("required")),
  "Property is optional for generic classifications; foundation-specific guards require it where needed.",
);
assert.equal(
  projectClassification(
    document,
    {
      "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
        "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
      "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.focusRing,
    },
    "colors",
  ).segments[0].values[0],
  "focus-ring",
);
assert(
  projectClassification(
    document,
    { ...classification, "b8fbee94-999d-4776-bf18-1b807b3f60b0": "missing" },
    "colors",
  ).issues.some((issue) => issue.includes("Unresolved")),
);

const source: BrowserTokenSource = {
  id: "stable-token",
  type: "colors",
  name: "legacy",
  generatedName: "legacy",
  groupId: "source",
  groupLabel: "Source",
  value: "#ff0000",
  generatedValue: "#ff0000",
  unit: "",
};
const tokens = resolveBrowserTokens([source], {}, "[]");
const mapped = {
  ...document,
  classifications: { [source.id]: classification },
};
const projected = projectBrowserTokens(tokens, mapped);
assert.equal(projected[0].id, source.id);
assert.equal(projected[0].value, source.value);
assert.equal(projected[0].name, "red-color-100");
assert.deepEqual(
  groupBrowserCards(projected).map((group) => group.label),
  ["Red"],
);
const tree = taxonomyTokenTree(projected);
assert.equal(
  taxonomyTokenTree(
    projectBrowserTokens(tokens, {
      ...titled,
      classifications: { [source.id]: classification },
    }),
  )[0].id,
  tree[0].id,
);
const words = registerTerm(
  registerTerm(
    document,
    "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    "My Orange",
    ids.words,
  ),
  "b8fbee94-999d-4776-bf18-1b807b3f60b0",
  "my-orange",
  ids.hyphen,
);
const wordProjection = projectClassification(
  words,
  { ...classification, "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.words },
  "colors",
);
assert.equal(wordProjection.name, "my-orange-color-100");
assert.deepEqual(wordProjection.segments[0].termIds, [ids.words]);
assert.deepEqual(wordProjection.segments[0].values, ["my orange"]);
const formattedCollision = projectBrowserTokens(
  resolveBrowserTokens(
    [source, { ...source, id: "formatted-second" }],
    {},
    "[]",
  ),
  {
    ...words,
    classifications: {
      [source.id]: {
        ...classification,
        "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.words,
      },
      "formatted-second": {
        ...classification,
        "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.hyphen,
      },
    },
  },
);
assert(
  formattedCollision.every((token) =>
    token.projection!.issues.some((issue) => issue.includes("collision")),
  ),
);
assert.equal(
  taxonomyTokenTree(formattedCollision)[0].children.length,
  2,
  "Formatting collisions preserve every leaf in the unresolved area.",
);
assert.equal(tree[0].children[0].children[0].children[0].id, source.id);
const packet = buildTaxonomyExport(mapped, [{ modeKey: "[]", tokens }]);
assert.equal(packet.tokens[0].name, projected[0].name);
assert.deepEqual(packet.tokens[0].path, projected[0].projection!.segments);
assert.throws(
  () => buildTaxonomyExport(mapped, [{ modeKey: "[]", tokens }], "upstream"),
  /Unsupported/,
);
assert.throws(
  () => buildTaxonomyExport(document, [{ modeKey: "[]", tokens }]),
  /blocked/,
);
assert.equal(
  buildTaxonomyExport(mapped, [
    { modeKey: "one", tokens },
    { modeKey: "two", tokens },
  ]).tokens.length,
  2,
);
let delimiterTaxonomy = createTaxonomyDefaults();
for (const [id, category, value] of [
  [ids.ab, "b8fbee94-999d-4776-bf18-1b807b3f60b0", "a-b"],
  [ids.c, "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c", "c"],
  [ids.a, "b8fbee94-999d-4776-bf18-1b807b3f60b0", "a"],
  [ids.bc, "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c", "b-c"],
])
  delimiterTaxonomy = registerTerm(delimiterTaxonomy, category, value, id);
delimiterTaxonomy.classifications = {
  [source.id]: {
    "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
      "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
    "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.ab,
    "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c": ids.c,
  },
  second: {
    "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
      "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
    "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.a,
    "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c": ids.bc,
  },
};
assertTaxonomy(delimiterTaxonomy);
assert.throws(
  () =>
    buildTaxonomyExport(delimiterTaxonomy, [
      {
        modeKey: "one",
        tokens: resolveBrowserTokens(
          [source, { ...source, id: "second" }],
          {},
          "one",
        ),
      },
    ]),
  /collision/,
);
const shared = projectBrowserTokens(
  resolveBrowserTokens([source, { ...source, id: "second" }], {}, "[]"),
  {
    ...mapped,
    classifications: { ...mapped.classifications, second: classification },
  },
);
assert(
  shared.every((token) =>
    token.projection!.issues.some((issue) => issue.includes("collision")),
  ),
);
assert.equal(taxonomyTokenTree(shared)[0].children.length, 2);
assert.throws(
  () =>
    buildTaxonomyExport(
      {
        ...mapped,
        classifications: { ...mapped.classifications, second: classification },
      },
      [
        { modeKey: "one", tokens },
        {
          modeKey: "two",
          tokens: resolveBrowserTokens(
            [{ ...source, id: "second" }],
            {},
            "two",
          ),
        },
      ],
    ),
  /collision across mode contexts/,
);
const ordered = structuredClone({ ...mapped, classifications: {} });
ordered.categories.find(
  (category) => category.id === "b8fbee94-999d-4776-bf18-1b807b3f60b0",
)!.cardinality = "ordered";
const orderedProjection = projectClassification(
  ordered,
  {
    ...classification,
    "b8fbee94-999d-4776-bf18-1b807b3f60b0": [ids.red, ids.focusRing],
  },
  "colors",
);
assert(
  orderedProjection.issues.some((issue) => issue.includes("Only one term")),
);
assert.deepEqual(orderedProjection.segments[0].values, ["red", "focus-ring"]);
const prefix = projectBrowserTokens(
  resolveBrowserTokens([source, { ...source, id: "prefix-token" }], {}, "one"),
  {
    ...mapped,
    classifications: {
      ...mapped.classifications,
      "prefix-token": {
        "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
          "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
        "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.red,
      },
    },
  },
);
assert.equal(
  taxonomyTokenTree(prefix)[0].children[0].children.length,
  2,
  "A prefix leaf and a longer path both remain under their shared category and Property branches",
);
const store = createStore();
const initial = store.get(taxonomyDocumentAtom);
const initialHash = await dimensionSourceHash(
  captureDimensionSource(store.get(authoringSnapshotAtom)),
);
store.set(enterEditModeAtom);
store.set(taxonomyDocumentAtom, {
  ...initial,
  order: [...initial.order].reverse(),
});
assert(store.get(changeGroupsAtom).some((group) => group.id === "registry"));
assert.notEqual(
  await dimensionSourceHash(
    captureDimensionSource(store.get(authoringSnapshotAtom)),
  ),
  initialHash,
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(taxonomyDocumentAtom), initial);
store.set(enterEditModeAtom);
store.set(taxonomyDocumentAtom, {
  ...initial,
  order: [...initial.order].reverse(),
});
store.set(saveEditAtom);
store.set(taxonomyDocumentAtom, initial);
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(taxonomyDocumentAtom).order,
  [...initial.order].reverse(),
);
store.set(revertChangeTopicAtom, "registry");
assert.deepEqual(store.get(taxonomyDocumentAtom), initial);
store.set(saveEditAtom);
for (const field of ["color", "spacing", "typography"] as const) {
  const baseline = store.get(authoringSnapshotAtom);
  store.set(enterEditModeAtom);
  if (field === "color")
    store.set(colorSystemDocumentAtom, {
      ...baseline.colorSystem,
      scales: baseline.colorSystem.scales.map((scale, index) =>
        index ? scale : { ...scale, name: "Unique test hue" },
      ),
    });
  if (field === "spacing")
    store.set(spacingDocumentAtom, {
      ...baseline.spacing!,
      scales: baseline.spacing!.scales.map((scale, index) =>
        index ? scale : { ...scale, name: "Unique test dimensions" },
      ),
    });
  if (field === "typography")
    store.set(typographyDocumentAtom, {
      ...baseline.typography,
      smallSizes: baseline.typography.smallSizes + 1,
    });
  assert.notDeepEqual(store.get(taxonomyDocumentAtom), baseline.taxonomy);
  store.set(cancelEditAtom);
  assert.deepEqual(
    store.get(authoringSnapshotAtom),
    baseline,
    `${field} Cancel must not contribute restored foundation terms`,
  );
}
const renameStore = createStore();
renameStore.set(enterEditModeAtom);
const colorSource = renameStore
  .get(browserTokenSourcesAtom)
  .find(
    (token) =>
      token.taxonomyEvidence?.colorFamily === "red" &&
      token.taxonomyEvidence?.contrastLabel,
  )!;
const reviewed = renameStore.get(taxonomyDocumentAtom);
const before = renameStore
  .get(browserTokensAtom)
  .find((token) => token.id === colorSource.id)!;
const redId =
  before.projection!.classification["b8fbee94-999d-4776-bf18-1b807b3f60b0"];
renameStore.set(editReferencedTaxonomyAtom, {
  ...reviewed,
  terms: reviewed.terms.map((term) =>
    term.id === redId ? { ...term, value: "crimson" } : term,
  ),
});
const after = renameStore
  .get(browserTokensAtom)
  .find((token) => token.id === colorSource.id)!;
assert.equal(after.id, before.id);
assert.equal(after.value, before.value);
assert(after.name.startsWith("crimson-"));
assert.equal(
  after.projection!.classification["b8fbee94-999d-4776-bf18-1b807b3f60b0"],
  redId,
);
assert.throws(
  () =>
    renameStore.set(editReferencedTaxonomyAtom, {
      ...renameStore.get(taxonomyDocumentAtom),
      terms: renameStore
        .get(taxonomyDocumentAtom)
        .terms.filter((term) => term.id !== redId),
    }),
  /unresolved|remap/i,
);
const surfaceStore = createStore();
surfaceStore.set(enterEditModeAtom);
const surface = surfaceStore.get(colorSystemDocumentAtom).surfaces[0];
const surfaceTaxonomy = surfaceStore.get(taxonomyDocumentAtom);
surfaceStore.set(editReferencedTaxonomyAtom, {
  ...surfaceTaxonomy,
  terms: surfaceTaxonomy.terms.map((term) =>
    term.id === surface.nameRef!.termId
      ? { ...term, value: "canvas-surface" }
      : term,
  ),
});
assert.equal(
  surfaceStore.get(colorSystemDocumentAtom).surfaces[0].name,
  "canvas-surface",
);
const paletteStore = createStore();
paletteStore.set(enterEditModeAtom);
const paletteToken = paletteStore
  .get(browserTokensAtom)
  .find((token) => token.paletteColorId)!;
const paletteBefore = structuredClone(
  paletteStore.get(colorSystemDocumentAtom),
);
const taxonomyBefore = structuredClone(paletteStore.get(taxonomyDocumentAtom));
assert.throws(
  () =>
    paletteStore.set(editBrowserTokensAtom, {
      ids: [paletteToken.id],
      modeKey: paletteStore.get(browserModeContextAtom).key,
      patch: {
        classification: {
          "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
            "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
          "b8fbee94-999d-4776-bf18-1b807b3f60b0": ids.focusRing,
        },
        value: "not-a-color",
      },
    }),
  /governed/,
);
assert.deepEqual(paletteStore.get(taxonomyDocumentAtom), taxonomyBefore);
assert.deepEqual(paletteStore.get(colorSystemDocumentAtom), paletteBefore);
const contributionStore = createStore();
assert.throws(
  () =>
    registerTerm(
      contributionStore.get(taxonomyDocumentAtom),
      "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c",
      "100",
      crypto.randomUUID(),
    ),
  /already owned/,
);
const dimensionsBefore = contributionStore.get(spacingDocumentAtom);
contributionStore.set(spacingDocumentAtom, {
  ...dimensionsBefore,
  scales: [
    ...dimensionsBefore.scales,
    {
      ...dimensionsBefore.scales[0],
      id: "new-numeric-source",
      name: "New numeric source",
    },
  ],
});
assert(
  !("sourceAssignments" in contributionStore.get(taxonomyDocumentAtom)),
  "Native source names and typed indices do not create per-source overrides.",
);
assert.equal(
  contributionStore
    .get(taxonomyDocumentAtom)
    .terms.filter((term) => String(term.value) === "100").length,
  1,
);
console.log(
  "Taxonomy normalization, ownership, projections, identity, tree and export guardrails passed.",
);
