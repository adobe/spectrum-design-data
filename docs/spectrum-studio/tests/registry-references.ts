// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  indexRegistryReferences,
  type RegistryReference,
} from "../src/features/taxonomy/registryReferences";
import { registryReferences } from "../src/features/taxonomy/registryReferences";
import { createStore } from "jotai";
import { referencedTaxonomySourceAtom } from "../src/features/taxonomy/editing";
import { leafElements } from "../src/features/structures/children";

const token: RegistryReference = {
  id: "token:one",
  label: "Base color",
  owner: "Tokens",
  href: "#tokens",
  group: "Token uses",
  classification: { category: ["first", "second"] },
};
const assignment: RegistryReference = {
  id: "component:one:assignment",
  label: "Button property assignment",
  owner: "Components",
  href: "#components",
  group: "Authoring references",
  classification: { category: "first" },
};
const style: RegistryReference = {
  id: "style:one",
  label: "Text style",
  owner: "Styles",
  href: "#design",
  designSection: "concepts",
  group: "Authoring references",
  classification: { category: "first" },
};
const index = indexRegistryReferences([token, token, assignment, style]);
assert.equal(
  index.categories.get("category")?.length,
  3,
  "Category counts reference locations, not term totals.",
);
assert.equal(index.terms.get("first")?.length, 3);
assert.equal(index.terms.get("second")?.length, 1);
assert.deepEqual(
  index.terms.get("first")?.filter((row) => row.group === "Token uses"),
  [token],
);
assert.deepEqual(
  index.terms
    .get("first")
    ?.filter((row) => row.group === "Authoring references"),
  [assignment, style],
);
assert.equal(
  indexRegistryReferences([
    { ...token, classification: { category: ["first", "first"] } },
  ]).terms.get("first")?.length,
  1,
);
assert.equal(index.terms.get("missing"), undefined);
const source = createStore().get(referencedTaxonomySourceAtom);
const term = source.previous.terms[0];
const category = source.previous.categories.find(
  (row) => row.id === term.categoryId,
)!;
const ruleId = "registry-reference-rule";
const conditionId = "registry-reference-condition";
const actual = registryReferences(source.previous, {
  ...source,
  snapshot: {
    ...source.snapshot,
    rules: [
      ...source.snapshot.rules!,
      {
        id: ruleId,
        type: "conditional",
        name: "Registry reference example",
        description: "",
        when: {
          id: "registry-reference-group",
          kind: "group",
          operator: "and",
          children: [
            {
              id: conditionId,
              kind: "condition",
              source: "taxonomy",
              sourceId: category.id,
              valueId: term.id,
              matcher: "is",
            },
          ],
        },
        branches: [],
        otherwise: { offset: 0 },
        outputs: [
          { id: "example-output", classification: { [category.id]: term.id } },
        ],
      },
    ],
  },
});
const locations = actual.terms.get(term.id)!;
assert(
  locations.some(
    (row) =>
      row.id === `condition:${ruleId}:${conditionId}` && row.href === "#logic",
  ),
);
assert(
  locations.some((row) => row.id === `rule-output:${ruleId}:example-output`),
);
const styleRecipe = source.snapshot.styles!.recipes[0];
const styleName = actual.terms
  .get(styleRecipe.name.termId)!
  .find((row) => row.id === `style-name:${styleRecipe.id}`)!;
assert.equal(styleName.group, "Authoring references");
assert.equal(styleName.href, "#design");
assert.equal(styleName.designSection, "concepts");
const foundationSource = source.sources.find(
  (row) => row.referenceKind === "foundation",
)!;
assert(
  [...actual.categories.values()]
    .flat()
    .some(
      (row) =>
        row.id === `foundation:${foundationSource.id}` &&
        row.href === "#foundations" &&
        row.foundation === foundationSource.scope,
    ),
);
const template = source.snapshot.structures!.structures.find(
  (row) => leafElements(row).length,
)!;
const element = leafElements(template)[0];
assert(
  actual.terms
    .get(element.termId)!
    .some(
      (row) =>
        row.id === `element:${template.conceptId}:${element.id}` &&
        row.designSection === "structures",
    ),
);
for (const component of source.snapshot.components!.components)
  for (const assignment of component.assignments)
    assert(
      actual.terms
        .get(assignment.property.termId)!
        .some(
          (row) =>
            row.id === `component:${component.id}:${assignment.id}` &&
            row.href === "#components",
        ),
    );
for (const records of [...actual.categories.values(), ...actual.terms.values()])
  assert.equal(new Set(records.map((row) => row.id)).size, records.length);
console.log(
  "Registry reference deduplication, grouped counts and category/term location agreement passed.",
);
