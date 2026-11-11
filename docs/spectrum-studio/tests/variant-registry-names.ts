// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  createLocalVariantProperty,
  hasVariantTokenNaming,
  type VariantProperty,
} from "../src/features/option-groups/model";
import {
  registerVariantProperty,
  registeredPropertyNames,
  renameVariantOption,
  renameVariantProperty,
  variantRegistrationRequest,
  type VariantRegistryRequest,
} from "../src/features/option-groups/naming";
import {
  projectClassification,
  updateTaxonomy,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";

const empty: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [],
  terms: [],
  order: [],
  classifications: {},
};
const draft = createLocalVariantProperty("Emphasis");
draft.options[0].name = "Regular";
draft.options[1].name = "Quiet";
const before = structuredClone({ draft, empty });
assert.deepEqual(variantRegistrationRequest(draft, empty)?.entries, [
  "Category: Emphasis",
  "Option: Regular",
  "Option: Quiet",
]);
assert.throws(() => registerVariantProperty(draft, empty), /Confirm/);
assert.deepEqual(
  { draft, empty },
  before,
  "Preparing or cancelling registration writes nothing.",
);
const registered = registerVariantProperty(draft, empty, true);
const property = registered.property;
const taxonomy = updateTaxonomy(empty, registered.taxonomy);
assert(property.categoryId);
assert.equal(taxonomy.categories.length, 1);
assert.equal(taxonomy.terms.length, 2);
assert.deepEqual(taxonomy.order, [property.categoryId]);
assert.deepEqual(taxonomy.categories[0].scopes, ["structures", "styles"]);
assert.equal(property.id, draft.id);
assert.equal(property.defaultOptionId, draft.defaultOptionId);
assert.deepEqual(
  property.options.map((option) => option.id),
  draft.options.map((option) => option.id),
);
for (const option of property.options) {
  assert(hasVariantTokenNaming(property, option));
  const projection = projectClassification(
    taxonomy,
    option.classification,
    "structures",
  );
  assert.deepEqual(projection.issues, []);
  assert.equal(projection.name, option.name.toLowerCase());
  assert.equal(
    projectClassification(taxonomy, option.classification, "styles").name,
    projection.name,
    "Both domains use the Registry's shared projection.",
  );
}
assert.equal(variantRegistrationRequest(property, taxonomy), null);
const reused = registerVariantProperty(
  {
    ...draft,
    name: " EMPHASIS ",
    options: draft.options.map((option) => ({
      ...option,
      name: option.name.toUpperCase(),
    })),
  },
  taxonomy,
  false,
  "styles",
);
assert.equal(
  reused.taxonomy,
  taxonomy,
  "Existing entries need no confirmation or Registry write.",
);
assert.equal(reused.property.categoryId, property.categoryId);
assert.deepEqual(reused.property.options, property.options);
const editor = { properties: [property], differences: { preserved: true } };
const renamed = renameVariantOption(
  editor,
  property.id,
  property.options[1].id,
  "Bold",
  taxonomy,
  true,
);
assert.equal(renamed.taxonomy.terms.length, 3);
assert.deepEqual(renamed.editor.differences, editor.differences);
assert.equal(renamed.editor.properties[0].id, property.id);
const selected = renamed.editor.properties[0];
assert(selected.kind === "variant");
assert.equal(selected.options[1].id, property.options[1].id);
assert.equal(selected.defaultOptionId, property.defaultOptionId);
assert.equal(selected.options[1].name, "Bold");
assert.deepEqual(selected.options[0], property.options[0]);
const reusedRename = renameVariantOption(
  renamed.editor,
  property.id,
  property.options[1].id,
  "quiet",
  renamed.taxonomy,
);
assert.equal(reusedRename.taxonomy, renamed.taxonomy);
assert.deepEqual(reusedRename.editor.properties[0], property);
const renamedCategory = renameVariantProperty(
  editor,
  property.id,
  "Treatment",
  taxonomy,
);
assert.equal(renamedCategory.taxonomy.categories[0].id, property.categoryId);
assert.equal(
  renamedCategory.taxonomy.categories[0].key,
  taxonomy.categories[0].key,
);
const registryRename = {
  ...renamedCategory.taxonomy,
  terms: renamedCategory.taxonomy.terms.map((term) =>
    term.id === property.options[1].classification[property.categoryId!]
      ? { ...term, value: "subtle" }
      : term,
  ),
};
const resolved = registeredPropertyNames(editor, registryRename).properties[0];
assert(resolved.kind === "variant");
assert.equal(resolved.name, "Treatment");
assert.equal(resolved.options[1].name, "Subtle");
assert.deepEqual(
  editor.properties[0],
  property,
  "Registry presentation never mutates authored inputs.",
);
const staleNames = registerVariantProperty(
  {
    ...property,
    options: [
      ...property.options,
      {
        id: crypto.randomUUID(),
        name: "Outlined",
        classification: {},
      },
    ],
  },
  registryRename,
  true,
);
assert.equal(staleNames.taxonomy.terms.length, 3);
assert.equal(staleNames.property.options[1].name, "Subtle");
assert.deepEqual(
  staleNames.property.options[1].classification,
  property.options[1].classification,
  "Adding an option preserves existing UUID references after a Registry rename.",
);
assert.throws(
  () => registerVariantProperty({ ...draft, name: "Other" }, taxonomy, true),
  /already belongs to Emphasis/,
  "Term ownership is never silently reassigned.",
);
const ordered: VariantProperty = {
  ...property,
  options: property.options.map((option, index) =>
    index
      ? option
      : {
          ...option,
          classification: { [property.categoryId!]: [taxonomy.terms[0].id] },
        },
  ),
};
assert.throws(
  () => registerVariantProperty(ordered, taxonomy, true),
  /ordered terms/,
);
assert.throws(
  () =>
    registerVariantProperty(property, {
      ...taxonomy,
      categories: taxonomy.categories.map((category) => ({
        ...category,
        scopes: ["styles"],
      })),
    }),
  /available to Structures/,
);
assert.deepEqual({ draft, empty }, before);
const source = ts.createSourceFile(
  "DesignProperties.tsx",
  readFileSync(
    new URL("../src/panels/design/DesignProperties.tsx", import.meta.url),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const setup = source.statements.find(
  (statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "PropertySetup",
);
assert(setup?.body);
const submit = setup.body.statements
  .flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations]
      : [],
  )
  .find(
    (declaration) => declaration.name.getText(source) === "submit",
  )?.initializer;
assert(submit);
const submitCode = ts.transpileModule(`(${submit.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ESNext },
}).outputText;
for (const fixture of [
  {
    kind: "variant",
    name: "Emphasis",
    defaultName: "Regular",
    taxonomy: empty,
    property: undefined,
    pending: true,
  },
  {
    kind: "variant",
    name: "Emphasis",
    defaultName: "Regular",
    taxonomy,
    property: undefined,
    pending: false,
  },
  {
    kind: "option",
    name: "Bold",
    defaultName: "",
    taxonomy,
    property,
    pending: true,
  },
]) {
  const commits: { property: VariantProperty; taxonomy: TaxonomyDocument }[] =
    [];
  const requests: (VariantRegistryRequest | null)[] = [];
  const errors: unknown[] = [];
  const original = structuredClone(fixture);
  const action: (create?: boolean) => void = runInNewContext(submitCode, {
    ...fixture,
    namingScope: "styles",
    crypto,
    variantRegistrationRequest,
    registerVariantProperty,
    setRequest: (request: VariantRegistryRequest | null) =>
      requests.push(request),
    onSubmit: (property: VariantProperty, taxonomy: TaxonomyDocument) =>
      commits.push({ property, taxonomy }),
    report: (error: unknown) => errors.push(error),
  });
  action();
  assert.deepEqual(errors, []);
  assert.equal(commits.length, fixture.pending ? 0 : 1);
  assert.deepEqual(
    fixture,
    original,
    "Opening or cancelling confirmation cannot change either source.",
  );
  if (fixture.pending) {
    assert(requests[0]?.entries?.length);
    action(true);
  }
  assert.deepEqual(errors, []);
  assert.equal(commits.length, 1);
  const committed = structuredClone(commits[0]);
  assert(committed.property.categoryId);
  assert.equal(
    committed.property.options.length,
    fixture.kind === "option" ? property.options.length + 1 : 1,
  );
  assert(
    committed.property.options.every((option) =>
      hasVariantTokenNaming(committed.property, option),
    ),
  );
  if (fixture.kind === "variant") {
    assert.equal(
      committed.property.defaultOptionId,
      committed.property.options[0].id,
    );
    assert.equal(committed.property.options[0].name, "Regular");
    assert(!committed.taxonomy.terms.some((term) => term.value === "option 2"));
  } else {
    assert.equal(committed.property.defaultOptionId, property.defaultOptionId);
    assert.deepEqual(committed.property.options.slice(0, -1), property.options);
  }
}
console.log(
  "Variant Registry naming: confirmation, reuse, ownership, stable IDs, shared projection and Registry-driven labels passed.",
);
