// Copyright 2026 Adobe. All rights reserved.
// Deletion, deprecation, rename-instead and "Remove all deprecations" guardrails.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { readPath } from "../src/features/changelog/contract";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import type { ChangeField } from "../src/features/changelog/changes";
import { projectSnapshot } from "../src/features/design-data/authoringProjection";
import {
  deprecatedItems,
  previewSummary,
  removalSummary,
  removeDeprecationsAtom,
} from "../src/features/changelog/removeDeprecations";
import {
  finalTermReplacement,
  finalTokenReplacement,
  planTokenRemoval,
  replaceIdDeep,
} from "../src/features/changelog/deprecationRemoval";
import {
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import type { BrowserTokenEdits } from "../src/features/tokens/browserEditTypes";
import { resolveDialogTokens } from "../src/features/tokens/dialogModel";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";
import {
  assertTaxonomy,
  taxonomyColorSourceId,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";
import { createTaxonomyDefaults } from "../src/features/taxonomy/defaults";
import {
  deprecateTaxonomyCategory,
  deprecateTaxonomyTerm,
  deprecatedTaxonomyItems,
  renameTaxonomyTerm,
  termReplacementCandidates,
} from "../src/features/taxonomy/lifecycle";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { editReferencedTaxonomyAtom } from "../src/features/taxonomy/editing";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import {
  colorScaleReplacementCandidates,
  colorScaleStepTokenIds,
} from "../src/features/color-system/lifecycle";

const shipped = createDefaultSnapshot();

// Lifecycle and removal fields appear in Changes and reset to shipped values.
function reviewField(
  name: string,
  mutate: (snapshot: EditSessionSnapshot) => void,
  matches: (field: ChangeField) => boolean,
) {
  const working = structuredClone(shipped);
  working.platforms[0].name = "Keep this unrelated edit";
  mutate(working);
  assertStoredSnapshot(working);
  const field = compareAuthoring(shipped, working)
    .groups.flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .find(matches);
  assert.ok(field?.address, `${name} needs a field-level reset address.`);
  const reset = prepareChangeReset(
    { ...working, attachments: {} },
    sourceResetPlan(`Restore ${name}`, [field.address]),
  );
  assertStoredSnapshot(reset);
  assert.deepEqual(
    readPath(reset, field.address.path),
    readPath(shipped, field.address.path),
    `${name} resets to its shipped value.`,
  );
  assert.equal(reset.platforms[0].name, "Keep this unrelated edit");
}
const hasLifecycle = (field: ChangeField) =>
  field.address?.path.includes("lifecycle") === true;
reviewField(
  "Registry term lifecycle",
  (snapshot) => {
    snapshot.taxonomy!.terms[0].lifecycle = { deprecated: true };
  },
  hasLifecycle,
);
reviewField(
  "Registry category lifecycle",
  (snapshot) => {
    snapshot.taxonomy!.categories[0].lifecycle = { deprecated: true };
  },
  hasLifecycle,
);
{
  const working = structuredClone(shipped);
  const [term] = working.taxonomy!.terms;
  const replacement = working.taxonomy!.terms.find(
    (item) => item.id !== term.id && item.categoryId === term.categoryId,
  )!;
  term.lifecycle = { deprecated: true, replacedBy: replacement.id };
  const fields = compareAuthoring(shipped, working)
    .groups.flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .filter(hasLifecycle);
  assert.equal(fields.length, 1, "A lifecycle shows as one Changes field.");
  assert.equal(fields[0].after, `Deprecated, replaced by ${replacement.value}`);
  const reset = prepareChangeReset(
    { ...working, attachments: {} },
    sourceResetPlan("Restore lifecycle", [fields[0].address!]),
  );
  assert.equal(reset.taxonomy!.terms[0].lifecycle, undefined);
}
reviewField(
  "Color scale lifecycle",
  (snapshot) => {
    snapshot.colorSystem.scales[0].lifecycle = { deprecated: true };
  },
  hasLifecycle,
);
reviewField(
  "Removed token",
  (snapshot) => {
    const [id, edit] = Object.entries(snapshot.browserTokenEdits)[0];
    snapshot.browserTokenEdits[id] = { ...edit, removed: true };
  },
  (field) => field.address?.path.at(-1) === "removed",
);

// "Remove all deprecations" lists every deprecated item once, in removal
// order. Step tokens are removed with their scale, so they are not repeated.
const withDeprecations = structuredClone(shipped);
withDeprecations.taxonomy!.terms[0].lifecycle = { deprecated: true };
const deprecatedScale = withDeprecations.colorSystem.scales[0];
deprecatedScale.lifecycle = { deprecated: true };
const stepTokenId = colorScaleStepTokenIds(
  withDeprecations.colorSystem,
  deprecatedScale,
)[0];
const planned = deprecatedItems({
  taxonomy: withDeprecations.taxonomy!,
  colorSystem: withDeprecations.colorSystem,
  edits: {
    [stepTokenId]: { status: "deprecated", values: {} },
    "other-token": { status: "deprecated", name: "Other token", values: {} },
  },
});
assert.deepEqual(
  planned.map((item) => [item.kind, item.id]),
  [
    ["term", withDeprecations.taxonomy!.terms[0].id],
    ["colorScale", deprecatedScale.id],
    ["token", "other-token"],
  ],
);
assert.ok(
  colorScaleReplacementCandidates(
    withDeprecations.colorSystem,
    withDeprecations.colorSystem.scales[1].id,
  ).every((item) => item.id !== deprecatedScale.id),
  "Deprecated scales are not offered as replacements.",
);
assert.equal(
  removalSummary({
    removed: planned.slice(0, 2),
    kept: [],
    repointed: 0,
    hardCoded: 0,
  }),
  "Removed 2 deprecated items",
);
assert.equal(
  removalSummary({
    removed: planned.slice(0, 1),
    kept: [{ ...planned[2], reason: "Still in use." }],
    repointed: 3,
    hardCoded: 1,
  }),
  "Removed 1 deprecated item, moved 3 uses to replacements, hard-coded 1 value. Kept 1 still in use",
);
assert.equal(
  previewSummary({ deleted: 2, repointed: 1, hardCoded: 0, kept: 1 }),
  "deletes 2 deprecated items, moves 1 use to replacements and keeps 1 that can't be removed safely",
);

// Replacement chains end at the first active item.
const chainEdits: BrowserTokenEdits = {
  a: {
    values: {},
    status: "deprecated",
    authoring: {
      assignments: {},
      lifecycle: { deprecatedComment: "", replacementIds: ["b"] },
    },
  },
  b: {
    values: {},
    status: "deprecated",
    authoring: {
      assignments: {},
      lifecycle: { deprecatedComment: "", replacementIds: ["c"] },
    },
  },
  loop: {
    values: {},
    status: "deprecated",
    authoring: {
      assignments: {},
      lifecycle: { deprecatedComment: "", replacementIds: ["a"] },
    },
  },
};
assert.equal(
  finalTokenReplacement(chainEdits, "a", () => true),
  "c",
);
assert.equal(
  finalTokenReplacement(
    chainEdits,
    "a",
    () => true,
    (id) => id === "c",
  ),
  undefined,
  "A chain that ends at a token being removed has no replacement.",
);
assert.equal(
  finalTokenReplacement(chainEdits, "a", (id) => id !== "c"),
  undefined,
);
chainEdits.b.authoring!.lifecycle!.replacementIds = ["loop"];
assert.equal(
  finalTokenReplacement(chainEdits, "a", () => true),
  undefined,
);

// Term remapping replaces values and keys, skips the term's own record and
// removes duplicates it creates.
const ownRecord = { id: "old-term" };
const remapped = replaceIdDeep(
  {
    own: ownRecord,
    ref: "old-term",
    list: ["old-term", "new-term"],
    byTerm: { "old-term": 1 },
  },
  "old-term",
  "new-term",
  ownRecord,
);
assert.equal(remapped.count, 3);
assert.deepEqual(remapped.value, {
  own: { id: "old-term" },
  ref: "new-term",
  list: ["new-term"],
  byTerm: { "new-term": 1 },
});
assert.equal(
  finalTermReplacement(
    {
      ...withDeprecations.taxonomy!,
      terms: [
        {
          ...withDeprecations.taxonomy!.terms[0],
          id: "t1",
          lifecycle: { deprecated: true, replacedBy: "t2" },
        },
        {
          ...withDeprecations.taxonomy!.terms[0],
          id: "t2",
          lifecycle: { deprecated: true, replacedBy: "t3" },
        },
        {
          ...withDeprecations.taxonomy!.terms[0],
          id: "t3",
          lifecycle: undefined,
        },
      ],
    },
    "t1",
  ),
  "t3",
);

// Removing a deprecated token moves its uses to the replacement, or writes
// its value per mode when there is none. Styles or structures keep it.
const removalCategory = "11111111-1111-4111-8111-111111111111";
const removalTerms = {
  old: "22222222-2222-4222-8222-222222222222",
  next: "33333333-3333-4333-8333-333333333333",
  user: "44444444-4444-4444-8444-444444444444",
};
const removalTaxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  order: [removalCategory],
  classifications: {},
  categories: [
    {
      id: removalCategory,
      key: "label",
      name: "Label",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["spacing"],
      required: true,
      includeInProjections: true,
    },
  ],
  terms: Object.entries(removalTerms).map(([value, id]) => ({
    id,
    categoryId: removalCategory,
    value,
    description: "",
  })),
};
const removalSource = (id: keyof typeof removalTerms, value: number) =>
  ({
    id,
    tier: "primitive",
    name: id,
    generatedName: id,
    value,
    generatedValue: value,
    type: "spacing",
    unit: "px",
    groupId: "scale",
    groupLabel: "Spacing",
    taxonomySource: { id, governed: { [removalCategory]: removalTerms[id] } },
  }) as BrowserTokenSource;
const lightMode = JSON.stringify([["scheme", "light"]]);
const darkMode = JSON.stringify([["scheme", "dark"]]);
const removalRows: CanonicalAliasRow[] = [lightMode, darkMode].flatMap(
  (context) => {
    const scale = context === darkMode ? 2 : 1;
    return projectBrowserTokens(
      resolveBrowserTokens(
        [
          removalSource("old", 4 * scale),
          removalSource("next", 8 * scale),
          removalSource("user", 1),
        ],
        {},
        context,
      ),
      removalTaxonomy,
    ).map((token) => ({
      token,
      id: token.id,
      rowId: `${token.id}-${context}`,
      name: token.name,
      context,
    }));
  },
);
const removalEdits = (replacementIds: string[]): BrowserTokenEdits => ({
  old: {
    values: {},
    status: "deprecated",
    authoring: {
      assignments: {},
      lifecycle: { deprecatedComment: "", replacementIds },
    },
  },
  user: {
    values: {},
    authoring: {
      assignments: { "[]": { kind: "reference", targetId: "old" } },
    },
  },
});
const removalInput = (edits: BrowserTokenEdits) => ({
  rows: removalRows,
  edits,
  taxonomy: removalTaxonomy,
  aliases: {
    schemaVersion: 1 as const,
    tokens: [{ id: "alias", name: "Alias", $ref: "old", contexts: [] }],
  },
  components: { schemaVersion: 2 as const, components: [] },
  componentTokens: [],
  fixedReferences: [],
  tokenIds: ["old"],
});
const userValue = (edits: BrowserTokenEdits, mode: string) =>
  resolveDialogTokens(removalRows, edits, removalTaxonomy, mode).find(
    (token) => token.id === "user",
  );

const repointPlan = planTokenRemoval(removalInput(removalEdits(["next"])));
assert.deepEqual(repointPlan.kept, []);
assert.deepEqual(repointPlan.removed, ["old"]);
assert.equal(repointPlan.edits.old.removed, true);
assert.equal(repointPlan.aliases.tokens[0].$ref, "next");
assert.equal(repointPlan.repointed, 2, "One token use and one alias move.");
assert.equal(userValue(repointPlan.edits, lightMode)?.referenceId, "next");
assert.equal(userValue(repointPlan.edits, darkMode)?.value, 16);

const hardCodePlan = planTokenRemoval({
  ...removalInput(removalEdits([])),
  aliases: { schemaVersion: 1, tokens: [] },
});
assert.deepEqual(hardCodePlan.kept, []);
assert.equal(hardCodePlan.hardCoded, 2, "Light and dark values differ.");
assert.equal(userValue(hardCodePlan.edits, lightMode)?.value, 4);
assert.equal(userValue(hardCodePlan.edits, darkMode)?.value, 8);
assert.equal(userValue(hardCodePlan.edits, darkMode)?.referenceId, undefined);

const aliasKept = planTokenRemoval(removalInput(removalEdits([])));
assert.deepEqual(aliasKept.removed, []);
assert.match(aliasKept.kept[0].reason, /alias/);
assert.equal(aliasKept.edits.old.removed, undefined);

const styleKept = planTokenRemoval({
  ...removalInput(removalEdits(["next"])),
  fixedReferences: [{ textStyle: { tokenId: "old" } }],
});
assert.deepEqual(styleKept.removed, []);
assert.match(styleKept.kept[0].reason, /Styles or structures/);
assert.equal(
  styleKept.edits.user.authoring?.assignments["[]"]?.kind,
  "reference",
);
// Lifecycle and removal fields must pass the authoring schema, or the Changes
// analysis rejects the whole working snapshot.
const lifecycleProjection = structuredClone(withDeprecations);
lifecycleProjection.taxonomy!.categories[0].lifecycle = { deprecated: true };
const [removedId, removedEdit] = Object.entries(
  lifecycleProjection.browserTokenEdits,
)[0];
lifecycleProjection.browserTokenEdits[removedId] = {
  ...removedEdit,
  removed: true,
};
assert.deepEqual(projectSnapshot(lifecycleProjection, "working").errors, []);

// Registry terms: rename keeps the ID; deprecation adds lifecycle.
const defaults = createTaxonomyDefaults();
const lifecycleCategory = defaults.categories.find(
  (category) =>
    category.valueType === "string" &&
    defaults.terms.filter((term) => term.categoryId === category.id).length > 2,
)!;
const [oldTerm, newTerm, laterTerm] = defaults.terms.filter(
  (term) => term.categoryId === lifecycleCategory.id,
);
const renamed = renameTaxonomyTerm(defaults, oldTerm.id, "  Renamed  ");
assert.equal(
  renamed.terms.find((term) => term.id === oldTerm.id)?.value,
  "Renamed",
);
assert.throws(
  () => renameTaxonomyTerm(defaults, oldTerm.id, " "),
  /Enter a name/,
);
assert.ok(
  termReplacementCandidates(defaults, oldTerm.id).every(
    (term) => term.id !== oldTerm.id,
  ),
);
const deprecated = deprecateTaxonomyTerm(defaults, oldTerm.id, newTerm.id);
assert.deepEqual(
  deprecated.terms.find((term) => term.id === oldTerm.id)?.lifecycle,
  { deprecated: true, replacedBy: newTerm.id },
);
assert.doesNotThrow(() => assertTaxonomy(deprecated));
assert.ok(
  termReplacementCandidates(deprecated, laterTerm.id).every(
    (term) => term.id !== oldTerm.id,
  ),
  "Deprecated terms are not offered as replacements.",
);
// The replacement can be deprecated later without breaking the first one.
assert.doesNotThrow(() =>
  assertTaxonomy(deprecateTaxonomyTerm(deprecated, newTerm.id, laterTerm.id)),
);
const otherCategory = defaults.categories.find(
  (category) => category.id !== lifecycleCategory.id,
)!;
const otherCategoryTerm = {
  ...oldTerm,
  id: crypto.randomUUID(),
  categoryId: otherCategory.id,
  value: "Other category term",
};
assert.throws(
  () =>
    deprecateTaxonomyTerm(
      { ...defaults, terms: [...defaults.terms, otherCategoryTerm] },
      oldTerm.id,
      otherCategoryTerm.id,
    ),
  /same category/,
);
assert.throws(() =>
  assertTaxonomy({
    ...deprecated,
    terms: deprecated.terms.filter((term) => term.id !== newTerm.id),
  }),
);
const deprecatedCategory = deprecateTaxonomyCategory(
  defaults,
  lifecycleCategory.id,
);
assert.doesNotThrow(() => assertTaxonomy(deprecatedCategory));
assert.throws(() =>
  assertTaxonomy({
    ...deprecatedCategory,
    categories: deprecatedCategory.categories.map((category) =>
      category.id === lifecycleCategory.id
        ? {
            ...category,
            lifecycle: { deprecated: true, replacedBy: newTerm.id },
          }
        : category,
    ),
  }),
);
assert.deepEqual(
  deprecatedTaxonomyItems(deprecated).terms.map((term) => term.id),
  [oldTerm.id],
);

// Remove all deprecations handles a replacement chain in any order: the
// replacement listed first can only go after the term that points at it.
const removalStore = createStore();
removalStore.set(enterEditModeAtom);
const removalBase = removalStore.get(taxonomyDocumentAtom);
const chainEnd = {
  ...oldTerm,
  id: "0f6c3a52-7f0e-4c1a-9d1e-2b7a4c9e5a01",
  value: "lifecycle-chain-end",
  description: "",
  lifecycle: { deprecated: true as const },
};
const chainStart = {
  ...chainEnd,
  id: "0f6c3a52-7f0e-4c1a-9d1e-2b7a4c9e5a02",
  value: "lifecycle-chain-start",
  lifecycle: { deprecated: true as const, replacedBy: chainEnd.id },
};
removalStore.set(editReferencedTaxonomyAtom, {
  ...removalBase,
  terms: [...removalBase.terms, chainEnd, chainStart],
});
const removal = removalStore.set(removeDeprecationsAtom);
const removedIds = new Set(removal.removed.map((item) => item.id));
assert.ok(removedIds.has(chainEnd.id) && removedIds.has(chainStart.id));
assert.deepEqual(
  removal.kept.filter((item) => item.kind !== "token"),
  [],
);
// Undo restores the working data from before the removal.
removalStore.set(restoreAuthoringSnapshotAtom, removal.undo);
assert.ok(
  removalStore
    .get(taxonomyDocumentAtom)
    .terms.some((term) => term.id === chainEnd.id),
);
removalStore.set(removeDeprecationsAtom);
// "Rename instead" for a shipped color scale keeps its ID, its registry term
// and its step token IDs, so nothing downstream breaks.
const renamedScale = removalStore
  .get(colorSystemDocumentAtom)
  .scales.find((scale) => scale.nameRef)!;
const stepIdsBefore = colorScaleStepTokenIds(
  removalStore.get(colorSystemDocumentAtom),
  renamedScale,
);
removalStore.set(editFoundationNameAtom, {
  id: taxonomyColorSourceId(renamedScale.id),
  value: "lifecycle renamed scale",
});
const afterRename = removalStore
  .get(colorSystemDocumentAtom)
  .scales.find((scale) => scale.id === renamedScale.id)!;
assert.deepEqual(afterRename.nameRef, renamedScale.nameRef);
assert.notEqual(afterRename.name, renamedScale.name);
assert.deepEqual(
  colorScaleStepTokenIds(
    removalStore.get(colorSystemDocumentAtom),
    afterRename,
  ),
  stepIdsBefore,
);
assert.ok(
  !removalStore
    .get(taxonomyDocumentAtom)
    .terms.some((term) => term.id === chainEnd.id || term.id === chainStart.id),
);

console.log("Deletion and deprecation guardrails passed.");
