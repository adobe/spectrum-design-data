// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  cancelEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { MISSING_VALUE_MESSAGE } from "../src/features/tokens/browserModel";
import {
  createNewTokenAtom,
  saveTokenDialogAtom,
  tokenDialogCatalogAtom,
} from "../src/features/tokens/dialogState";
import { createDialogDraft } from "../src/features/tokens/dialogModel";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  createNewTokenEdit,
  newTokenPreview,
  newTokenQuestions,
  newTokenSteps,
  type NewTokenAnswers,
} from "../src/features/tokens/creationFlow";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";

const store = createStore();
const before = store.get(authoringSnapshotAtom);
const taxonomy = before.taxonomy!;
const key = (id: string) =>
  taxonomy.categories.find((category) => category.id === id)!.key;
const keys = (tier: "raw" | "purpose", type: "colors" | "spacing") =>
  newTokenQuestions(taxonomy, tier, type).map((question) =>
    key(question.category.id),
  );

// Questions follow scope, appliesTo and the taxonomy's name order.
const rawColors = keys("raw", "colors");
assert.ok(rawColors.includes("colorFamily"));
assert.ok(rawColors.includes("property"));
assert.ok(
  !rawColors.includes("structure"),
  "Purpose-only categories are hidden.",
);
const purposeColors = keys("purpose", "colors");
assert.ok(purposeColors.includes("structure"));
assert.ok(
  !purposeColors.includes("colorFamily"),
  "Raw-only categories are hidden.",
);
assert.ok(
  !purposeColors.includes("number"),
  "Categories without terms are skipped.",
);
const orderIndex = (id: string) => taxonomy.order.indexOf(id);
const rawIds = newTokenQuestions(taxonomy, "raw", "colors").map(
  (question) => question.category.id,
);
assert.deepEqual(
  rawIds,
  [...rawIds].sort((a, b) => orderIndex(a) - orderIndex(b)),
);

// A missing appliesTo counts as "both".
const structure = taxonomy.categories.find((item) => item.key === "structure")!;
const legacy: TaxonomyDocument = {
  ...taxonomy,
  categories: taxonomy.categories.map((category) => {
    if (category.id !== structure.id) return category;
    const { appliesTo: _omit, ...rest } = category;
    return rest;
  }),
};
assert.ok(
  newTokenQuestions(legacy, "raw", "colors").some(
    (question) => question.category.id === structure.id,
  ),
);

// Steps: tier, type, one per question, review.
assert.equal(newTokenSteps(taxonomy, { terms: {} }).length, 3);
assert.equal(
  newTokenSteps(taxonomy, { tier: "raw", type: "colors", terms: {} }).length,
  rawColors.length + 3,
);

const term = (categoryKey: string, value: string | number) => {
  const category = taxonomy.categories.find(
    (item) => item.key === categoryKey,
  )!;
  const match = taxonomy.terms.find(
    (item) => item.categoryId === category.id && item.value === value,
  );
  assert.ok(match, `${categoryKey} has ${value}.`);
  return [category.id, match.id] as const;
};
const answers: NewTokenAnswers = {
  tier: "raw",
  type: "colors",
  terms: Object.fromEntries([
    term("colorFamily", "photoshop blue"),
    term("scaleIndex", 20),
  ]),
};
const preview = newTokenPreview(taxonomy, answers, []);
assert.deepEqual(preview.issues, []);
assert.ok(preview.name, "A name is generated.");
assert.deepEqual(
  newTokenPreview(taxonomy, { ...answers, terms: {} }, []).issues,
  ["Answer at least one question."],
);

// Answers outside the current questions are ignored.
const stray = newTokenPreview(
  taxonomy,
  { ...answers, terms: { ...answers.terms, [structure.id]: "x" } },
  [],
);
assert.equal(stray.name, preview.name);

// Duplicate names block creation.
const duplicate = newTokenPreview(taxonomy, answers, [
  { id: "existing", name: preview.name },
]);
assert.equal(duplicate.duplicate?.id, "existing");
assert.throws(
  () =>
    createNewTokenEdit(taxonomy, answers, {}, [
      { id: "existing", name: preview.name },
    ]),
  /already exists/,
);

// Creating needs edit mode.
assert.throws(
  () => store.set(createNewTokenAtom, { answers }),
  /Enter edit mode/,
);
store.set(enterEditModeAtom);
const existingNames = store.get(browserTokensAtom);
assert.ok(
  !existingNames.some((token) => token.name === preview.name),
  "The fixture name is unused.",
);
const id = store.set(createNewTokenAtom, { answers });
const edit = store.get(browserTokenEditsAtom)[id];
assert.equal(edit.authoring?.manual?.type, "colors");
assert.equal(edit.authoring?.manual?.targetId, undefined);
assert.equal(edit.authoring?.manual?.scope, undefined);

const created = store.get(browserTokensAtom).find((token) => token.id === id);
assert.ok(created, "The new draft is listed.");
assert.equal(created.name, preview.name);
assert.equal(created.status, "draft");
assert.equal(created.validationError, MISSING_VALUE_MESSAGE);

const working = store.get(authoringSnapshotAtom);
const restored: unknown = JSON.parse(JSON.stringify(working));
assertStoredSnapshot(restored);
assert.ok(
  JSON.stringify(compareAuthoring(before, working)).includes(id),
  "Changes lists the new token.",
);

// Changes lists an appliesTo edit as its own resettable field.
{
  const edited = structuredClone(before);
  const category = edited.taxonomy.categories[0];
  category.appliesTo = "raw";
  const field = compareAuthoring(before, edited)
    .groups.flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .find((entry) => entry.address?.path.at(-1) === "appliesTo");
  assert.ok(field, "Changes lists the appliesTo edit.");
  assert.equal(field.after, "raw");
}

// The new color draft gets the color mode axes and accepts a value in the dialog.
const catalog = store.get(tokenDialogCatalogAtom);
assert.equal(catalog.status, "ready");
if (catalog.status !== "ready") throw new Error(catalog.error);
const rows = catalog.rows.filter((row) => row.token.id === id);
assert.ok(rows.length > 1, "Color drafts vary by mode.");
const draft = createDialogDraft(rows[0].token, rows[0].context);
for (const row of rows)
  draft.assignments[row.context] = { kind: "literal", value: "#336699" };
store.set(saveTokenDialogAtom, { draft, expected: working });
const valued = store.get(browserTokensAtom).find((token) => token.id === id);
assert.equal(valued?.validationError, undefined);
assert.ok(valued?.value, "The saved value resolves.");

// Purpose-based drafts use structure scope.
const purposeAnswers: NewTokenAnswers = {
  tier: "purpose",
  type: "spacing",
  terms: Object.fromEntries([
    term("structure", "list"),
    term("property", "gap"),
  ]),
};
const purposeId = store.set(createNewTokenAtom, { answers: purposeAnswers });
assert.equal(
  store.get(browserTokenEditsAtom)[purposeId].authoring?.manual?.scope,
  "structures",
);

// Cancelling the edit session discards the drafts.
store.set(cancelEditAtom);
assert.equal(store.get(browserTokenEditsAtom)[id], undefined);

console.log("Token creation flow checks passed.");
