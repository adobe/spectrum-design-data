// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { v4 as uuid } from "uuid";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  componentKey,
  createComponent,
  parseLiteral,
  renamePart,
  renameCondition,
} from "../src/features/components/model";
import {
  declarationNames,
  reorderDeclarations,
  reorderIds,
} from "../src/features/components/ordering";
import { upgradeComponentOrderSnapshot } from "../src/features/edit-session/componentOrderUpgrade";
import {
  assertComponentDocument,
  assertComponentValueType,
  optionValueIssues,
} from "../src/features/components/validation";
import { componentRelationships } from "../src/features/components/projection";
import {
  assertComponentReferences,
  componentTokenCatalog,
  propertyValueIssue,
} from "../src/features/components/references";
import { upgradeComponentsSnapshot } from "../src/features/edit-session/componentsUpgrade";

const snapshot = createDefaultSnapshot();
const taxonomy = snapshot.taxonomy!;
const document = snapshot.components!;
assertComponentDocument(document, taxonomy);
const tokens = componentTokenCatalog(snapshot);
assertComponentReferences(document, taxonomy, tokens);
assert.equal(document.components.length, 2);
const action = document.components.find(
  (record) => record.declaration.name === "action-button",
)!;
const menu = document.components.find(
  (record) => record.declaration.name === "menu",
)!;
assert.equal(Object.keys(action.declaration.options!).length, 11);
assert.equal(action.declaration.anatomy?.length ?? 0, 0);
assert.equal(Object.keys(menu.declaration.options!).length, 12);
assert.equal(menu.declaration.anatomy!.length, 11);
assert.equal(menu.declaration.states!.length, 5);
assert.equal(
  menu.declaration.anatomy!.find((part) => part.name === "menu-item")!.contains!
    .length,
  9,
);
assert.equal(parseLiteral("100", "string"), "100");
assert.equal(parseLiteral("100", "number"), 100);
assert.equal(parseLiteral("false", "boolean"), false);
assert.deepEqual(parseLiteral('{"value":4}', "json"), { value: 4 });
assert.throws(() => parseLiteral("null", "json"), /non-null/);
assert.throws(() => parseLiteral("", "number"), /finite/);
assert.throws(() => parseLiteral("100", "boolean"), /true or false/);
const renamed = renamePart(menu, "label", "caption");
assert.equal(renamed.identities.parts.caption, menu.identities.parts.label);
assert.deepEqual(renamed.assignments, menu.assignments);
assert(
  componentRelationships(renamed, taxonomy).some(
    (row) => row.scope.part === "caption",
  ),
);
const stateRename = renameCondition(menu, "states", "hover", "pointer-hover");
assert.equal(
  stateRename.identities.states["pointer-hover"],
  menu.identities.states.hover,
);
assert(
  stateRename.assignments.some((row) =>
    row.options?.state?.includes("pointer-hover"),
  ),
);
const copy = structuredClone(document);
copy.components[1] = renamed;
assertComponentDocument(copy, taxonomy);
const cycle = structuredClone(document);
cycle.components[1].declaration.anatomy![0].contains = [
  cycle.components[1].declaration.anatomy![0].name,
];
assert.throws(() => assertComponentDocument(cycle, taxonomy), /cycle/);
const invalid = structuredClone(document);
invalid.components[0].assignments[0] = {
  ...invalid.components[0].assignments[0],
  $ref: uuid(),
};
assert.throws(
  () => assertComponentReferences(invalid, taxonomy, tokens),
  /no longer/,
);
const removed = structuredClone(document);
delete removed.components[1].identities.parts.label;
removed.components[1].declaration.anatomy =
  removed.components[1].declaration.anatomy!.filter(
    (part) => part.name !== "label",
  );
assert.throws(
  () => assertComponentDocument(removed, taxonomy),
  /unavailable|used by/,
);
const legacy = structuredClone(snapshot);
delete legacy.components;
assert.deepEqual(upgradeComponentsSnapshot(legacy, 11).components, {
  schemaVersion: 2,
  components: [],
});
assert.deepEqual(upgradeComponentsSnapshot(snapshot, 11).components, document);
assert.equal(
  createComponent({
    $id: `urn:leonardo:${uuid()}`,
    name: "example",
    displayName: "Example",
    meta: { category: "actions", documentationUrl: "https://example.com/" },
  }).assignments.length,
  0,
);
const xor = structuredClone(document);
Object.assign(xor.components[0].assignments[0], { value: "4px" });
assert.throws(() => assertComponentDocument(xor, taxonomy), /invalid/);
assert(propertyValueIssue("shadow", [{ color: "red" }]));
assert.equal(
  propertyValueIssue("shadow", [
    { x: "0px", y: "1px", blur: "4px", spread: "0px", color: "rgb(0, 0, 0)" },
  ]),
  undefined,
);
assertComponentValueType("value-types/color.schema.json", "rgb(0, 0, 0)");
assert.throws(
  () => assertComponentValueType("value-types/color.schema.json", "#ffffff"),
  /value type/,
);
assert.throws(
  () => assertComponentValueType("unknown.schema.json", "anything"),
  /unavailable/,
);
assert(
  optionValueIssues(action.declaration.options!.selectedTextColor, "#ffffff")
    .length,
  "Preserve and expose the pinned hex-color pattern limitation.",
);
const typedReference = structuredClone(document);
typedReference.components[0].assignments[0].$valueType =
  "value-types/color.schema.json";
assert.throws(
  () => assertComponentReferences(typedReference, taxonomy, tokens),
  /value type/,
);
const contextReference = structuredClone(document);
const contextual = tokens.find(
  (token) =>
    Object.keys(token.context).length &&
    !propertyValueIssue("color", token.value),
)!;
const colorProperty = taxonomy.terms.find(
  (term) =>
    term.categoryId ===
      taxonomy.categories.find((category) => category.key === "property")!.id &&
    String(term.value).toLowerCase() === "color",
)!;
contextReference.components[0].assignments.push({
  id: uuid(),
  property: { categoryId: colorProperty.categoryId, termId: colorProperty.id },
  $ref: contextual.id,
});
assert.throws(
  () => assertComponentReferences(contextReference, taxonomy, tokens),
  /requires/,
);
contextReference.components[0].assignments.at(-1)!.options = Object.fromEntries(
  Object.entries(contextual.context).map(([key, value]) => [
    key,
    String(value),
  ]),
);
assertComponentReferences(contextReference, taxonomy, tokens);
const roundTrip = JSON.parse(JSON.stringify(document));
assertComponentDocument(roundTrip, taxonomy);
assert.deepEqual(roundTrip, document);
assert.equal(componentKey("  ActionButton / quiet  "), "action-button-quiet");
assert.equal(componentKey("Keyboard focus"), "keyboard-focus");
assert.equal(componentKey("..."), "");
for (const section of ["parts", "options", "states"] as const) {
  const names = declarationNames(menu, section);
  const keys = names.map((name) => menu.identities[section][name]);
  const reordered = reorderDeclarations(
    menu,
    section,
    new Set([keys[0]]),
    keys.at(-1)!,
    "after",
  );
  assert.deepEqual(declarationNames(reordered, section), [
    ...names.slice(1),
    names[0],
  ]);
  assert.deepEqual(reordered.identities, menu.identities);
  assert.deepEqual(reordered.assignments, menu.assignments);
  const candidate = structuredClone(document);
  candidate.components[1] = reordered;
  assertComponentDocument(candidate, taxonomy);
}
assert.deepEqual(
  reorderIds(["a", "b", "c", "d"], new Set(["c", "a"]), "d", "after"),
  ["b", "d", "a", "c"],
);
assert.deepEqual(reorderIds(["a", "b"], new Set(["a"]), "a", "before"), [
  "a",
  "b",
]);
assert.throws(
  () => reorderIds(["a", "b"], new Set(["stale"]), "b", "before"),
  /rows changed/,
);
assert.throws(
  () => reorderIds(["a", "b"], new Set(["a"]), "stale", "after"),
  /rows changed/,
);
assert.throws(
  () => reorderIds(["a", "a"], new Set(["a"]), "a", "after"),
  /rows changed/,
);
assert.deepEqual(
  renameCondition(menu, "options", "label", "caption").optionOrder,
  menu.optionOrder,
);
for (const order of [
  menu.optionOrder.slice(1),
  [...menu.optionOrder, menu.optionOrder[0]],
  [uuid(), ...menu.optionOrder.slice(1)],
]) {
  const invalidOrder = structuredClone(document);
  invalidOrder.components[1].optionOrder = order;
  assert.throws(
    () => assertComponentDocument(invalidOrder, taxonomy),
    /invalid/,
  );
}
const older = {
  ...structuredClone(snapshot),
  components: {
    schemaVersion: 1,
    components: document.components.map((record) => {
      const { optionOrder, ...previous } = structuredClone(record);
      void optionOrder;
      return previous;
    }),
  },
};
assert.deepEqual(upgradeComponentOrderSnapshot(older, 13).components, document);
const olderWorking = structuredClone(older);
olderWorking.components.components[1].declaration.options = Object.fromEntries(
  Object.entries(menu.declaration.options!).reverse(),
);
const migratedWorking = upgradeComponentOrderSnapshot(olderWorking, 13);
assert.deepEqual(
  declarationNames(migratedWorking.components!.components[1], "options"),
  Object.keys(menu.declaration.options!).reverse(),
);
assert.deepEqual(
  upgradeComponentOrderSnapshot(older, 13).components,
  document,
  "Saved ordering upgrades independently.",
);
const independentName = structuredClone(older);
independentName.components.components[0].declaration.name =
  "legacy-independent-name";
assert.equal(
  upgradeComponentOrderSnapshot(independentName, 13).components!.components[0]
    .declaration.name,
  "legacy-independent-name",
  "The ordering upgrade does not apply the new UI naming policy to stored records.",
);
const invalidOlder = structuredClone(older);
delete invalidOlder.components.components[1].identities.options.label;
assert.throws(
  () => upgradeComponentOrderSnapshot(invalidOlder, 13),
  /ordering is invalid/,
);
assert.deepEqual(
  upgradeComponentOrderSnapshot(
    { ...older, components: { schemaVersion: 1, components: [] } },
    13,
  ).components,
  { schemaVersion: 2, components: [] },
);
console.log(
  "Component schema, references, stable identities, literal types and legacy migration checks passed.",
);
