// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  resolveBrowserTokens,
  isBrowserTokenEdits,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import {
  assignmentForMode,
  compatibleTokenTypes,
  modePairs,
} from "../src/features/tokens/tokenAssignments";
import {
  commitDialogDraft,
  createDialogDraft,
  resolveDialogTokens,
  tokenComponentUsage,
} from "../src/features/tokens/dialogModel";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";
import { projectBrowserTokens } from "../src/features/tokens/browserModel";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";
import { canonicalTaxonomyValue } from "../src/features/taxonomy/export";
import {
  tokenOutputDiagnostics,
  tokenOutputMetadata,
} from "../src/features/tokens/outputMetadata";

const source = (id: string, value: number): BrowserTokenSource => ({
  id,
  name: id,
  generatedName: id,
  value,
  generatedValue: value,
  type: "spacing",
  unit: "px",
  groupId: "scale",
  groupLabel: "Spacing",
});
const sources = [source("first", 4), source("second", 8)];
const key = '[["scheme","dark"]]';
assert.equal(assignmentForMode({ "[]": 1, [key]: 2 }, key), 2);
assert.equal(assignmentForMode({ [key]: 2 }, "[]"), undefined);
assert.throws(() => modePairs('[["a","b"],["a","c"]]'), /repeats/);
assert.equal(
  compatibleTokenTypes(sources[0], { ...sources[1], type: "opacity" }),
  false,
);
const references = {
  first: {
    values: {},
    authoring: {
      assignments: {
        "[]": { kind: "reference" as const, targetId: "second" },
      },
    },
  },
};
assert.equal(isBrowserTokenEdits(references), true);
assert.equal(resolveBrowserTokens(sources, references, key)[0].value, 8);
assert.equal(
  resolveBrowserTokens(sources, references, key)[0].referenceId,
  "second",
);
const cycle = {
  ...references,
  second: {
    values: {},
    authoring: {
      assignments: {
        "[]": { kind: "reference" as const, targetId: "first" },
      },
    },
  },
};
assert.match(
  resolveBrowserTokens(sources, cycle, key)[0].validationError!,
  /cycle/,
);
const frozen = {
  first: {
    values: {},
    status: "deprecated" as const,
    authoring: {
      assignments: {},
      lifecycle: {
        deprecatedComment: "Use second",
        replacementIds: ["second"],
        frozen: { [key]: { kind: "literal" as const, value: 4 } },
      },
    },
  },
};
assert.equal(
  resolveBrowserTokens([source("first", 100)], frozen, key)[0].value,
  4,
);
assert.match(
  resolveBrowserTokens(sources, frozen, "[]")[0].validationError!,
  /no frozen value/,
);
assert.equal(
  isBrowserTokenEdits({
    first: {
      values: {},
      authoring: { assignments: { bad: { kind: "literal", value: 1 } } },
    },
  }),
  false,
);
const tokens = resolveBrowserTokens(sources, references, key);
const rows: CanonicalAliasRow[] = tokens.map((token) => ({
  id: token.id,
  rowId: `${token.id}-row`,
  name: token.name,
  context: "[]",
  token,
}));
const usage = tokenComponentUsage("second", rows, [
  {
    id: "button",
    declaration: { displayName: "Button" },
    assignments: [
      { id: "a", $ref: "first-row" },
      { id: "b", $ref: "second" },
      { id: "c", $ref: "second-row" },
      { id: "d", $ref: "first" },
    ],
  },
]);
assert.deepEqual(usage, [{ id: "button", label: "Button", count: 4 }]);
const categoryId = "11111111-1111-4111-8111-111111111111";
const termIds = {
  first: "22222222-2222-4222-8222-222222222222",
  second: "33333333-3333-4333-8333-333333333333",
  alias: "44444444-4444-4444-8444-444444444444",
};
const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  order: [categoryId],
  classifications: {},
  categories: [
    {
      id: categoryId,
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
  terms: Object.entries(termIds).map(([value, id]) => ({
    id,
    categoryId,
    value,
    description: "",
  })),
};
const fixtureRows: CanonicalAliasRow[] = ["light", "dark"].flatMap((scheme) => {
  const context = JSON.stringify([["scheme", scheme]]);
  return projectBrowserTokens(
    resolveBrowserTokens(
      sources.map((source) => ({
        ...source,
        value: scheme === "dark" ? Number(source.value) * 2 : source.value,
        generatedValue:
          scheme === "dark" ? Number(source.value) * 2 : source.value,
        taxonomySource: {
          id: source.id,
          governed: { [categoryId]: termIds[source.id as "first" | "second"] },
        },
      })),
      {},
      context,
    ),
    taxonomy,
  ).map((token) => ({
    token,
    id: token.id,
    rowId: `${token.id}-${scheme}`,
    name: token.name,
    context,
  }));
});
const first = fixtureRows[0].token;
const lightKey = '[["scheme","light"]]';
const untouched = {};
assert.equal(
  commitDialogDraft(
    createDialogDraft(first, lightKey),
    fixtureRows,
    untouched,
    taxonomy,
  ),
  untouched,
  "Saving an unchanged dialog does not create empty authoring edits.",
);
const draft = createDialogDraft(first, lightKey);
draft.assignments[lightKey] = { kind: "literal", value: 12 };
draft.assignments[key] = { kind: "reference", targetId: "second" };
const committed = commitDialogDraft(draft, fixtureRows, {}, taxonomy);
assert.equal(
  resolveDialogTokens(fixtureRows, committed, taxonomy, lightKey)[0].value,
  12,
);
assert.equal(
  resolveDialogTokens(fixtureRows, committed, taxonomy, key)[0].value,
  16,
);
assert.equal(first.value, 4);
assert.equal(draft.modeKey, lightKey);
const reset = {
  ...createDialogDraft(first, lightKey),
  assignments: { [lightKey]: null },
};
const resetEdits = commitDialogDraft(reset, fixtureRows, committed, taxonomy);
assert.equal(resetEdits.first.authoring?.assignments[lightKey], undefined);
assert.equal(resetEdits.first.authoring?.assignments[key]?.kind, "reference");
const deprecated = commitDialogDraft(
  { ...draft, deprecated: true, replacementIds: ["second"] },
  fixtureRows,
  {},
  taxonomy,
);
assert.equal(
  deprecated.first.authoring?.lifecycle?.frozen?.[lightKey].value,
  12,
);
assert.equal(deprecated.first.authoring?.lifecycle?.frozen?.[key].value, 16);
const frozenTokens = resolveDialogTokens(
  fixtureRows.map((row) => ({
    ...row,
    token: { ...row.token, value: 200, generatedValue: 200 },
  })),
  deprecated,
  taxonomy,
  lightKey,
);
assert.equal(frozenTokens[0].value, 12);
assert.equal(frozenTokens[0].referenceId, undefined);
assert.throws(
  () =>
    commitDialogDraft(
      { ...draft, deprecated: true, replacementIds: ["first"] },
      fixtureRows,
      {},
      taxonomy,
    ),
  /replacement/,
);
assert.throws(
  () =>
    commitDialogDraft(
      { ...draft, deprecated: true, replacementIds: ["second", "missing"] },
      fixtureRows,
      {},
      taxonomy,
    ),
  /Explain/,
);
const withAlias = commitDialogDraft(
  {
    ...createDialogDraft(first, lightKey),
    aliases: [
      { id: "manual-alias", classification: { [categoryId]: termIds.alias } },
    ],
  },
  fixtureRows,
  {},
  taxonomy,
);
const alias = resolveDialogTokens(fixtureRows, withAlias, taxonomy, key).find(
  (token) => token.id === "manual-alias",
)!;
assert.equal(alias.name, "alias");
assert.equal(alias.value, 8);
assert.equal(alias.status, "draft");
assert.equal(alias.referenceId, "first");
assert.equal(isBrowserTokenEdits(withAlias), true);
const aliasRows = fixtureRows.map((row) => ({
  ...row,
  token: resolveDialogTokens(
    fixtureRows,
    withAlias,
    taxonomy,
    row.context,
  ).find((token) => token.id === row.token.id)!,
}));
const aliasRow = {
  ...fixtureRows[0],
  rowId: "alias-light",
  id: alias.id,
  token: alias,
};
assert.deepEqual(
  canonicalTaxonomyValue({ ...aliasRow, context: key }, [
    ...aliasRows,
    aliasRow,
  ]),
  { $ref: "first-dark" },
);
assert.deepEqual(
  tokenOutputMetadata(
    { ...fixtureRows[0], token: frozenTokens[0] },
    fixtureRows,
  ),
  {},
);
assert.equal(
  tokenOutputDiagnostics([{ ...fixtureRows[0], token: frozenTokens[0] }])
    .length,
  1,
);
const editedRows = fixtureRows.map((row) => ({
  ...row,
  token: resolveDialogTokens(
    fixtureRows,
    committed,
    taxonomy,
    row.context,
  ).find((token) => token.id === row.token.id)!,
}));
const previewReset = createDialogDraft(editedRows[0].token, lightKey);
previewReset.assignments[lightKey] = null;
assert.equal(
  resolveDialogTokens(
    editedRows,
    committed,
    taxonomy,
    lightKey,
    previewReset,
  )[0].value,
  4,
  "Reset uses the original generator source, not a previously resolved edited row.",
);
assert.equal(
  editedRows[0].token.value,
  12,
  "A reset preview does not mutate saved edits.",
);
const deprecatedRows = fixtureRows.map((row) => ({
  ...row,
  token: resolveDialogTokens(
    fixtureRows,
    deprecated,
    taxonomy,
    row.context,
  ).find((token) => token.id === row.token.id)!,
}));
const restoredDraft = createDialogDraft(deprecatedRows[0].token, lightKey);
restoredDraft.deprecated = false;
restoredDraft.assignments[lightKey] = { kind: "literal", value: 9 };
const restoredEdits = commitDialogDraft(
  restoredDraft,
  deprecatedRows,
  deprecated,
  taxonomy,
);
assert.equal(restoredEdits.first.authoring?.lifecycle?.frozen, undefined);
assert.equal(
  resolveDialogTokens(deprecatedRows, restoredEdits, taxonomy, lightKey)[0]
    .value,
  9,
);
assert.throws(
  () =>
    commitDialogDraft(
      { ...draft, assignments: { [lightKey]: { kind: "literal", value: -1 } } },
      fixtureRows,
      {},
      taxonomy,
    ),
  /non-negative/,
);
assert.throws(
  () =>
    assignmentForMode(
      { '[["a","1"]]': 1, '[["b","1"]]': 2 },
      '[["a","1"],["b","1"]]',
    ),
  /Overlapping/,
);
console.log("Token dialog reference, mode, freeze and usage checks passed.");
