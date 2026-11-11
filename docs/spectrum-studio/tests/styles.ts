// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  buildStyleArtifacts,
  synchronizeStylePublications,
  type StyleContext,
} from "../src/features/styles/generation";
import {
  EMPTY_STYLES,
  isStylesDocument,
  type StyleRecipe,
} from "../src/features/styles/model";
import { offsetAvailableToken } from "../src/features/logic/conditional";
import type { ConditionalRule } from "../src/features/logic/model";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";
import { stylePreview } from "../src/features/styles/preview";
import { measureOutputContrast } from "../src/features/color-system/outputContrast";
import { switchStyleColor } from "../src/features/styles/variants";
import { withStylesVocabulary } from "../src/features/styles/vocabulary";
import { createLocalVariantProperty } from "../src/features/option-groups/model";

const ids = new Map<string, string>();
function registryId(value: string) {
  if (!ids.has(value)) ids.set(value, crypto.randomUUID());
  return ids.get(value)!;
}
const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [
    "style",
    "property",
    "colorFamily",
    "interaction",
    "scaleIndex",
  ].map((key) => ({
    id: registryId(`category:${key}`),
    key,
    name: key,
    description: "",
    valueType: key === "scaleIndex" ? "number" : "string",
    cardinality: "one",
    scopes: ["styles"],
    required: false,
    includeInProjections: true,
  })),
  terms: [
    { id: "accent", categoryId: "style", value: "accent", description: "" },
    { id: "color", categoryId: "property", value: "color", description: "" },
    {
      id: "font-family",
      categoryId: "property",
      value: "font-family",
      description: "",
    },
    {
      id: "font-weight",
      categoryId: "property",
      value: "font-weight",
      description: "",
    },
    {
      id: "thickness",
      categoryId: "property",
      value: "thickness",
      description: "",
    },
    {
      id: "line-height",
      categoryId: "property",
      value: "unitless line height",
      description: "",
    },
    { id: "blue", categoryId: "colorFamily", value: "blue", description: "" },
    { id: "red", categoryId: "colorFamily", value: "red", description: "" },
    { id: "hover", categoryId: "interaction", value: "hover", description: "" },
    { id: "100", categoryId: "scaleIndex", value: 100, description: "" },
    { id: "200", categoryId: "scaleIndex", value: 200, description: "" },
  ].map((term) => ({
    ...term,
    id: registryId(`term:${term.id}`),
    categoryId: registryId(`category:${term.categoryId}`),
  })),
  order: ["style", "colorFamily", "property", "interaction", "scaleIndex"].map(
    (key) => registryId(`category:${key}`),
  ),
  classifications: {},
};
const recipe: StyleRecipe = {
  id: crypto.randomUUID(),
  kind: "background",
  name: {
    categoryId: registryId("category:style"),
    termId: registryId("term:accent"),
  },
  classification: {},
  appearance: {
    color: { kind: "families", familyIds: ["blue", "red"], scaleIndex: 900 },
  },
  options: [],
  differences: {},
  applications: [],
};
const context: StyleContext = {
  selection: {},
  modes: {},
  references: ["blue", "red"].flatMap((familyId) =>
    [900, 1000].map((index) => ({
      id: `${familyId}-${index}`,
      uuid: crypto.randomUUID(),
      familyId,
      index,
      property: "color" as const,
      name: `${familyId}-${index}`,
      value: index === 900 ? "#123456" : "#345678",
      classification: {
        [registryId("category:colorFamily")]: registryId(`term:${familyId}`),
      },
    })),
  ),
};
function generate(
  input = recipe,
  contexts = [context],
  rules: ConditionalRule[] = [],
) {
  const document = synchronizeStylePublications(
    { ...structuredClone(EMPTY_STYLES), recipes: [input] },
    contexts,
    rules,
  );
  assert(isStylesDocument(document));
  return {
    document,
    result: buildStyleArtifacts(document, taxonomy, rules, [], contexts),
  };
}
const basic = generate();
const twoProperties = generate({
  ...recipe,
  options: [
    createLocalVariantProperty("Tone"),
    createLocalVariantProperty("Emphasis"),
  ],
});
const reorderedProperties = structuredClone(twoProperties.document);
reorderedProperties.recipes[0].options.reverse();
assert.deepEqual(
  synchronizeStylePublications(reorderedProperties, [context], []).publications,
  twoProperties.document.publications,
  "Reordering authored properties does not replace publication identities.",
);
assert.equal(
  withStylesVocabulary(taxonomy),
  taxonomy,
  "Ordinary Style edits do not replace an unchanged Registry.",
);
assert.deepEqual(basic.result.issues, []);
assert.equal(basic.result.rows.length, 2);
assert(
  basic.result.rows.every((row) => row.token.$ref && !("value" in row.token)),
);
assert.equal(basic.result.rows[0].name, "accent-blue-color");
const identities = basic.document.publications;
const prepared = synchronizeStylePublications(basic.document, [context], []);
assert.deepEqual(prepared.publications, identities);
const renamed = structuredClone(taxonomy);
renamed.terms.find((term) => term.id === registryId("term:accent"))!.value =
  "brand";
const renamedRows = buildStyleArtifacts(
  prepared,
  renamed,
  [],
  [],
  [context],
).rows;
assert.equal(renamedRows[0].conceptId, basic.result.rows[0].conceptId);
assert.equal(renamedRows[0].name, "brand-blue-color");
assert.equal(
  generate({
    ...recipe,
    appearance: {
      color: { kind: "families", familyIds: ["blue"], scaleIndex: 901 },
    },
  }).result.rows.length,
  0,
);
assert.match(
  generate({
    ...recipe,
    appearance: {
      color: { kind: "families", familyIds: ["blue"], scaleIndex: 901 },
    },
  }).result.issues[0].message,
  /unavailable/,
);
const rule: ConditionalRule = {
  id: crypto.randomUUID(),
  type: "conditional",
  name: "Interaction",
  description: "",
  when: {
    id: "when",
    kind: "group",
    operator: "and",
    children: [
      {
        id: "state",
        kind: "condition",
        source: "taxonomy",
        sourceId: registryId("category:interaction"),
        matcher: "is",
        valueId: registryId("term:hover"),
      },
    ],
  },
  branches: [],
  otherwise: { offset: 1 },
  outputs: [
    {
      id: crypto.randomUUID(),
      classification: {
        [registryId("category:interaction")]: registryId("term:hover"),
      },
    },
  ],
};
const interactive = {
  ...recipe,
  applications: [
    {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      outputIds: [rule.outputs![0].id],
    },
  ],
};
const generated = generate(interactive, [context], [rule]);
assert.deepEqual(generated.result.issues, []);
assert.equal(generated.result.rows.length, 4);
assert.equal(generated.result.rows.filter((row) => row.outputId).length, 2);
assert(
  generated.result.rows
    .filter((row) => row.outputId)
    .every((row) => row.value === "#345678"),
);
const unsupportedRule = generate(
  interactive,
  [context],
  [{ ...rule, applicability: { kind: "specific", types: ["opacity"] } }],
);
assert.equal(unsupportedRule.result.rows.length, basic.result.rows.length);
assert(
  unsupportedRule.result.issues.some((issue) =>
    /supports color/.test(issue.message),
  ),
);
const tooFar = generate(
  interactive,
  [context],
  [{ ...rule, otherwise: { offset: 2 } }],
);
assert.equal(tooFar.result.rows.length, 2);
assert.match(tooFar.result.issues[0].message, /outside/);
const options = context.references.map((reference) => ({
  ...reference,
  sourceId: reference.familyId,
  index: reference.index!,
  value: String(reference.value),
}));
assert.throws(
  () => offsetAvailableToken(options[0].id, options, 9, "strict"),
  /outside/,
);
assert(offsetAvailableToken(options[0].id, options, 9).warning);
const text = generate({
  ...recipe,
  kind: "text",
  appearance: {
    ...recipe.appearance,
    fontFamily: { value: "sans-serif" },
    fontWeight: { value: 400 },
  },
});
assert.equal(
  text.result.rows.filter((row) => row.property === "fontFamily").length,
  1,
);
assert.equal(
  text.result.rows.filter((row) => row.property === "fontWeight").length,
  1,
);
const changedContext = {
  ...context,
  references: context.references.map((reference) =>
    reference.id === "blue-900"
      ? { ...reference, value: "#ffffff" }
      : reference,
  ),
};
const changed = buildStyleArtifacts(
  basic.document,
  taxonomy,
  [],
  [],
  [changedContext],
);
assert.equal(
  changed.rows.find((row) => row.familyId === "blue")?.value,
  "#ffffff",
);
assert.equal(
  changed.rows.find((row) => row.familyId === "red")?.value,
  basic.result.rows.find((row) => row.familyId === "red")?.value,
);
assert.deepEqual(
  changed.rows.map((row) => row.conceptId),
  basic.result.rows.map((row) => row.conceptId),
);
assert(
  !isStylesDocument({
    ...EMPTY_STYLES,
    recipes: [
      {
        ...recipe,
        appearance: {
          color: { kind: "single", binding: { value: "red", $ref: "token" } },
        },
      },
    ],
  }),
);
const white = basic.result.rows
  .filter((row) => row.familyId === "blue")
  .map((row) => ({ ...row, value: "#ffffff" }));
const dark = white.map((row) => ({ ...row, value: "#000000" }));
assert(stylePreview(recipe, white, "#ffffff", "srgb").appearance.boxShadow);
assert.equal(
  stylePreview(recipe, dark, "#ffffff", "srgb").appearance.boxShadow,
  undefined,
);
const atThreshold = "color(srgb-linear 0.3 0.3 0.3)";
assert(
  Math.abs(measureOutputContrast(atThreshold, "#ffffff", "srgb") - 3) < 1e-12,
);
assert.equal(
  stylePreview(
    recipe,
    white.map((row) => ({ ...row, value: atThreshold })),
    "#ffffff",
    "srgb",
  ).appearance.boxShadow,
  undefined,
);
for (const [linear, outlined] of [
  [0.300001, true],
  [0.299999, false],
] as const) {
  const value = `color(srgb-linear ${linear} ${linear} ${linear})`;
  assert.equal(
    !!stylePreview(
      recipe,
      white.map((row) => ({ ...row, value })),
      "#ffffff",
      "srgb",
    ).appearance.boxShadow,
    outlined,
  );
}
assert(
  stylePreview(
    recipe,
    dark.map((row) => ({ ...row, value: "rgb(0 0 0 / 10%)" })),
    "#ffffff",
    "srgb",
  ).appearance.boxShadow,
  "Translucent colors use rendered contrast, not opaque foreground contrast.",
);
assert(
  stylePreview(
    recipe,
    dark.map((row) => ({
      ...row,
      value: "color(display-p3 0.9 0.2 0.1 / 20%)",
    })),
    "#ffffff",
    "display-p3",
  ).appearance.boxShadow,
);
assert.equal(
  stylePreview(recipe, [], "#ffffff", "srgb").preview.kind,
  "unavailable",
);
const icon = generate({ ...recipe, kind: "icon" });
assert.deepEqual(icon.result.issues, []);
assert.equal(icon.result.rows.length, 2);
assert.equal(
  stylePreview({ ...recipe, kind: "icon" }, icon.result.rows, "#ffffff", "srgb")
    .preview.kind,
  "icon-color",
);
const border = generate({
  ...recipe,
  kind: "border",
  appearance: { ...recipe.appearance, borderWidth: { value: 2 } },
});
assert.deepEqual(border.result.issues, []);
assert.equal(border.result.rows.length, 3);
const borderPreview = stylePreview(
  { ...recipe, kind: "border" },
  border.result.rows,
  "#ffffff",
  "srgb",
);
assert.equal(borderPreview.appearance.background, "transparent");
assert.equal(borderPreview.appearance.borderWidth, "2px");
const textPreview = stylePreview(
  { ...recipe, kind: "text" },
  text.result.rows,
  "#ffffff",
  "srgb",
);
assert.equal(textPreview.appearance.fontFamily, "sans-serif");
assert.equal(textPreview.appearance.fontWeight, 400);
assert.deepEqual(
  white.map((row) => row.value),
  ["#ffffff"],
  "Preview outlines never change token colors.",
);
const lineContexts: StyleContext[] = [
  {
    ...context,
    references: [
      ...context.references,
      ...[100, 200].map((index) => ({
        id: `line-${index}`,
        uuid: crypto.randomUUID(),
        familyId: "line-scale",
        metricId: "line-scale",
        index,
        property: "lineHeight" as const,
        name: `line-${index}`,
        value: index === 100 ? 1.5 : 1.3,
      })),
    ],
  },
];
const lineText = generate(
  {
    ...recipe,
    kind: "text",
    appearance: {
      ...recipe.appearance,
      lineHeight: { metricId: "line-scale" },
    },
  },
  lineContexts,
);
assert.deepEqual(lineText.result.issues, []);
assert.equal(
  lineText.result.rows.filter((row) => row.property === "lineHeight").length,
  2,
  "Line-height indices do not multiply by color families.",
);
assert(
  lineText.result.rows
    .filter((row) => row.property === "lineHeight")
    .every((row) => row.unit === ""),
);
const newContext = {
  ...context,
  selection: { axis: "another-mode" },
  modes: { colorScheme: "dark" },
};
const expanded = synchronizeStylePublications(
  basic.document,
  [context, newContext],
  [],
);
assert.deepEqual(
  expanded.publications.map((publication) => publication.id),
  identities.map((publication) => publication.id),
);
assert(
  expanded.publications.every(
    (publication, index) =>
      publication.rows["[]"] === identities[index].rows["[]"] &&
      Object.keys(publication.rows).length === 2,
  ),
);
for (const [kind, appearance, message] of [
  [
    "background",
    { color: { kind: "single", binding: { value: "invalid-color(" } } },
    /color/i,
  ],
  ["text", { ...recipe.appearance, fontWeight: { value: 1001 } }, /weight/i],
  ["border", { ...recipe.appearance, borderWidth: { value: -1 } }, /width/i],
] as const) {
  const result = generate({ ...recipe, kind, appearance }).result;
  assert(result.issues.some((issue) => message.test(issue.message)));
}
assert(
  !isStylesDocument({
    ...basic.document,
    recipes: [{ ...recipe, id: "not-a-uuid" }],
  }),
);
assert(!isStylesDocument({ ...basic.document, recipes: [recipe, recipe] }));
const duplicatedKey = structuredClone(basic.document.publications[0]);
duplicatedKey.id = crypto.randomUUID();
duplicatedKey.rows = Object.fromEntries(
  Object.keys(duplicatedKey.rows).map((key) => [key, crypto.randomUUID()]),
);
assert(
  !isStylesDocument({
    ...basic.document,
    publications: [...basic.document.publications, duplicatedKey],
  }),
);
const conflicting = generate({
  ...recipe,
  classification: {
    [registryId("category:colorFamily")]: registryId("term:red"),
  },
});
assert(
  conflicting.result.issues.length > 0,
  "Generated family classifications never silently overwrite authored contributions.",
);
const single = { kind: "single" as const, binding: { $ref: "blue-900" } };
assert.deepEqual(
  switchStyleColor(
    { kind: "single", binding: { $ref: "unindexed" } },
    "families",
    [{ ...context.references[0], id: "unindexed", index: undefined }],
  ),
  { kind: "families", familyIds: [], scaleIndex: 100 },
  "Unindexed fixed colors do not become invented family steps.",
);
assert.deepEqual(switchStyleColor(single, "families", context.references), {
  kind: "families",
  familyIds: ["blue"],
  scaleIndex: 900,
});
assert.deepEqual(
  switchStyleColor(
    { kind: "families", familyIds: ["blue"], scaleIndex: 900 },
    "single",
    context.references,
  ),
  single,
);
assert.deepEqual(
  switchStyleColor(
    { kind: "families", familyIds: ["blue"], scaleIndex: 901 },
    "single",
    context.references,
  ),
  { kind: "single", binding: { value: "" } },
  "Missing indices never silently choose another color.",
);
console.log(
  "Styles recipes, Registry naming, shared rule outputs, strict steps, stable publications, property counts and upstream propagation passed.",
);
