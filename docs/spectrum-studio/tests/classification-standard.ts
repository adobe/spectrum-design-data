// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import {
  classificationStandard,
  classificationStandardIssues,
  assertClassificationStandard,
} from "../src/features/taxonomy/standardContract";
import {
  assessClassificationStandard,
  assertStandardClassification,
  classificationAssessmentMarkdown,
  COMPATIBILITY_ALIAS_REVIEW,
  standardCategoryName,
} from "../src/features/taxonomy/standardization";
import {
  buildClassificationReviewExport,
  assertClassificationReviewExport,
  classificationContentHash,
} from "../src/features/taxonomy/reviewedExport";
import {
  buildGeneratedClassificationCompatibility,
  assertGeneratedClassificationCompatibility,
} from "../src/features/taxonomy/generatedReviewExport";
import {
  assertTaxonomy,
  projectClassification,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";
import { canonicalTaxonomyValue } from "../src/features/taxonomy/export";
import {
  canonicalAliasRows,
  completeAliasSource,
  type CanonicalAliasRow,
} from "../src/features/tokens/aliasTargets";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";
import { tokenUuid } from "../src/features/tokens/model";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  classificationReviewMessages,
  CLASSIFICATION_REVIEW_CONTEXT,
  CLASSIFICATION_REVIEW_LABEL,
  ALIAS_REVIEW_MESSAGE,
} from "../src/features/taxonomy/reviewPresentation";

function concept(value: string) {
  const found = classificationStandard.concepts.find(
    (entry) => entry.value === value,
  );
  if (!found) throw new Error(`Missing shared fixture concept: ${value}.`);
  return found;
}
function fixture(): TaxonomyDocument {
  const categories = ["property", "element", "attribute"]
    .map((key) => {
      const facet = classificationStandard.facets.find(
        (entry) => entry.key === key,
      )!;
      return {
        id: crypto.randomUUID(),
        key,
        name: facet.name,
        description: facet.question,
        valueType: "string" as const,
        cardinality: "one" as const,
        scopes: ["colors", "typography"] as const,
        required: false,
        includeInProjections: true,
      };
    })
    .map((category) => ({ ...category, scopes: [...category.scopes] }));
  const terms = ["Color", "Text", "Background"].map((value) => ({
    id: crypto.randomUUID(),
    categoryId: categories.find(
      (category) => category.key === concept(value).facet,
    )!.id,
    value,
    description: concept(value).definition,
  }));
  return {
    schemaVersion: 1,
    categories,
    terms,
    order: categories.map((category) => category.id),
    classifications: {},
  };
}
function row(document: TaxonomyDocument, name = "fixture"): CanonicalAliasRow {
  const id = tokenUuid(`classification-fixture:${name}`);
  const classification = Object.fromEntries(
    document.terms.map((term) => [term.categoryId, term.id]),
  );
  const projection = projectClassification(document, classification, "colors");
  return {
    id,
    rowId: tokenUuid(`classification-fixture-row:${name}`),
    name: projection.name,
    context: "[]",
    token: {
      id,
      name: projection.name,
      generatedName: projection.name,
      value: "#ff0000",
      generatedValue: "#ff0000",
      unit: "",
      type: "colors",
      groupId: "fixture",
      groupLabel: "Fixture",
      projection,
      description: "",
      status: "draft",
      nameOverridden: false,
      valueOverridden: false,
      stale: false,
    },
  };
}

assertClassificationStandard(classificationStandard);
assert.equal(classificationStandard.adoption, "proposed");
assert.equal(
  classificationStandard.components.find((entry) => entry.name === "Body")!
    .group,
  "Typography",
);
assert.equal(
  classificationStandard.components.find((entry) => entry.name === "Button")!
    .group,
  "Controls",
);
assert.deepEqual(
  classificationStandard.components.find((entry) => entry.name === "Slider")!
    .elementIds,
  ["element:bar", "element:control"],
);
assert(
  !classificationStandard.concepts.some((entry) =>
    ["Body", "Heading", "Detail", "Code"].includes(entry.value),
  ),
);
assert.equal(concept("Workflow-icon").facet, "element");
assert.equal(concept("UI-icon").facet, "element");
assert.equal(concept("Color").facet, "property");
assert.equal(concept("Border").facet, "attribute");
assert.equal(concept("Emphasized").facet, "prominence");
assert.equal(concept("Accent").facet, "role");
assert.equal(concept("Selected").facet, "interactiveContext");
assert(
  classificationStandardIssues({
    ...classificationStandard,
    adoption: "accepted",
  }).length,
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    concepts: classificationStandard.concepts.map((entry) => ({
      ...entry,
      definition: " ",
    })),
  }).length,
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    concepts: classificationStandard.concepts.map((entry) => ({
      ...entry,
      counterexamples: [],
    })),
  }).length,
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    concepts: [
      ...classificationStandard.concepts,
      {
        ...concept("Color"),
        id: "competing-color",
        facet: "element",
        value: " COLOR ",
      },
    ],
  }).some((issue) => issue.includes("already belongs")),
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    facets: classificationStandard.facets.map((facet) =>
      facet.key === "element" ? { ...facet, sourceKeys: ["property"] } : facet,
    ),
  }).some((issue) => issue.includes("Competing source")),
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    components: [
      ...classificationStandard.components,
      {
        id: "duplicate-body",
        name: " BODY ",
        group: "Controls",
        elementIds: ["element:text"],
      },
    ],
  }).some((issue) => issue.includes("already belongs")),
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    components: classificationStandard.components.map((entry) => ({
      ...entry,
      elementIds: ["not-an-element"],
    })),
  }).some((issue) => issue.includes("unresolved abstract")),
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    retired: [
      ...classificationStandard.retired,
      { value: "Color", reason: "Contradictory retirement" },
    ],
  }).some((issue) => issue.includes("Retired concept")),
);
assert(
  classificationStandardIssues({
    ...classificationStandard,
    sourceReferenceKeys: ["property"],
  }).some((issue) => issue.includes("Unresolved provisional")),
);

const document = fixture();
const source = row(document);
const before = canonicalJson({ document, source });
const review = assessClassificationStandard(document, [
  {
    id: source.rowId,
    scope: "colors",
    classification: source.token.projection!.classification,
  },
]);
assertStandardClassification(review);
assert.equal(review.counts.occurrences, 9);
assert.equal(review.counts.nonStandard, 0);
const standardMarkdown = classificationAssessmentMarkdown(review);
assert(
  standardMarkdown.includes("Shared category question and source binding."),
);
assert(
  !standardMarkdown.includes("undefined"),
  "Standard category records need a meaningful review description without a concept identity.",
);
assert.throws(
  () =>
    assertStandardClassification(
      assessClassificationStandard(document, [
        {
          id: "retained-alias",
          recordKind: "alias-usage",
          scope: "colors",
          classification: source.token.projection!.classification,
        },
      ]),
    ),
  /blocked/,
  "Alias classification cannot bypass its retained-name warning by omitting projection diagnostics.",
);
const standardPacket = await buildClassificationReviewExport(
  document,
  [source],
  EMPTY_ALIASES,
  "standard-compliant",
);
assert.equal(standardPacket.standardConforming, true);
assert.equal(standardPacket.upstreamAdopted, false);
assert.deepEqual(standardPacket.source.taxonomy, document);
assert.equal(
  standardPacket.hashes.sourceSha256,
  await classificationContentHash(standardPacket.source),
);
await assertClassificationReviewExport(
  JSON.parse(JSON.stringify(standardPacket)),
);
assert.equal(
  canonicalJson({ document, source }),
  before,
  "Assessment and export do not mutate authoring data.",
);
await assert.rejects(
  buildClassificationReviewExport(
    document,
    [],
    EMPTY_ALIASES,
    "standard-compliant",
  ),
  /nonempty declared token scope/,
);
assert.throws(
  () =>
    assertStandardClassification(
      assessClassificationStandard({
        schemaVersion: 1,
        categories: [],
        terms: [],
        order: [],
        classifications: {},
      }),
    ),
  /empty assessment/,
);

const unbound = structuredClone(document);
unbound.terms[0].description = "";
unbound.classifications["saved/source~id"] =
  source.token.projection!.classification;
const inherited = assessClassificationStandard(unbound, [
  {
    id: source.rowId,
    scope: "colors",
    classification: source.token.projection!.classification,
  },
]);
const colorId = unbound.terms[0].id;
const unchangedReview = canonicalJson({
  document: unbound,
  assessment: inherited,
});
const definitionMessages = classificationReviewMessages(
  unbound,
  inherited.occurrences.filter((entry) => entry.termId === colorId),
);
assert.equal(
  definitionMessages.length,
  1,
  "Repeated uses of one shared definition show one actionable message.",
);
assert(definitionMessages[0].includes("Registry > Taxonomy > Property"));
assert(
  definitionMessages[0].includes(concept("Color").definition),
  "The expected shared definition is visible, not just a request to find it.",
);
assert(
  definitionMessages[0].includes(
    "Changing this token's own Description will not resolve",
  ),
);
assert.equal(CLASSIFICATION_REVIEW_LABEL, "Classification review needed");
assert(CLASSIFICATION_REVIEW_CONTEXT.includes("not a check of color values"));
assert(ALIAS_REVIEW_MESSAGE.includes("changing its value will not resolve"));
assert.deepEqual(
  classificationReviewMessages(document, review.occurrences),
  [],
  "Conforming data has no presentation warnings.",
);
assert.equal(
  canonicalJson({ document: unbound, assessment: inherited }),
  unchangedReview,
  "Designer-facing messages do not change data, flags or machine-readable evidence.",
);
const categoryMismatch = structuredClone(document);
categoryMismatch.categories[0].description =
  "A characteristic styled by this token.";
const categoryMessages = classificationReviewMessages(
  categoryMismatch,
  assessClassificationStandard(categoryMismatch).occurrences,
);
assert.equal(categoryMessages.length, 1);
assert(
  categoryMessages[0].includes(
    'Category description: "What characteristic is measured or styled?"',
  ),
);
assert(categoryMessages[0].includes("Choose Edit and apply category changes"));
assert(categoryMessages[0].includes("every token using this category"));
const settingsMismatch = structuredClone(categoryMismatch);
settingsMismatch.categories[0].name = "Styling property";
settingsMismatch.categories[0].valueType = "number";
settingsMismatch.terms = settingsMismatch.terms.filter(
  (term) => term.categoryId !== settingsMismatch.categories[0].id,
);
const settingsMessages = classificationReviewMessages(
  settingsMismatch,
  assessClassificationStandard(settingsMismatch).occurrences,
);
assert.equal(
  settingsMessages.length,
  1,
  "Multiple category setting warnings are combined without hiding the expected settings.",
);
assert(settingsMessages[0].includes('Category name: "Property"'));
assert(settingsMessages[0].includes("Value type: Text"));
assert.deepEqual(
  inherited.occurrences
    .filter((entry) => entry.termId === colorId)
    .map((entry) => entry.status),
  ["non-standard", "non-standard", "non-standard"],
);
assert(
  inherited.occurrences.some((entry) =>
    entry.pointer.includes("saved~1source~0id"),
  ),
);
assert(
  inherited.occurrences
    .filter((entry) => entry.fixRequired)
    .every((entry) =>
      entry.issues.every(
        (issue) =>
          issue.owner === "joint" && issue.gapId === "LTAX-011" && !!issue.fix,
      ),
    ),
);
assert.throws(
  () => assertStandardClassification(inherited),
  /classification entries need review against the app's proposed definitions/,
);
assert.throws(
  () => assertStandardClassification(inherited),
  /not a color-value check/,
);
await assert.rejects(
  buildClassificationReviewExport(
    unbound,
    [source],
    EMPTY_ALIASES,
    "standard-compliant",
  ),
  /Standard-compliant export blocked/,
);
const aliases = {
  schemaVersion: 1 as const,
  tokens: [
    {
      id: crypto.randomUUID(),
      name: "old-color",
      $ref: source.id,
      contexts: [source.context],
    },
  ],
};
const compatibility = await buildClassificationReviewExport(
  unbound,
  [source],
  aliases,
  "compatibility",
);
assert.equal(compatibility.standardConforming, false);
assert.equal(compatibility.exportKind, "compatibility");
assert.deepEqual(compatibility.source.aliases, aliases);
assert.equal(compatibility.aliases[0].$ref, source.rowId);
const detached = await buildClassificationReviewExport(
  document,
  [source],
  EMPTY_ALIASES,
  "compatibility",
);
detached.source.usages[0].classification![document.categories[0].id] =
  crypto.randomUUID();
assert.equal(
  canonicalJson({ document, source }),
  before,
  "Mutating an exported usage must not mutate its source input.",
);
assert.deepEqual(compatibility.source.taxonomy, unbound);
assert.equal(compatibility.tokens.length, 1);
assert.equal(compatibility.tokens[0].value, source.token.value);
assert.equal(
  canonicalJson(compatibility.source.records),
  canonicalJson([source]),
);
const aliasOccurrences = compatibility.assessment.occurrences.filter(
  (entry) => entry.recordKind === "alias-usage",
);
assert.equal(
  compatibility.assessment.occurrences.length,
  inherited.occurrences.length + aliasOccurrences.length,
);
assert.equal(aliasOccurrences.length, document.categories.length + 1);
assert(
  aliasOccurrences.every(
    (entry) => entry.recordId === compatibility.aliases[0].uuid,
  ),
);
assert(
  aliasOccurrences.some(
    (entry) => entry.termId === colorId && entry.fixRequired,
  ),
);
assert(
  aliasOccurrences.some((entry) =>
    entry.issues.some((issue) => issue.reason === COMPATIBILITY_ALIAS_REVIEW),
  ),
);
await assert.rejects(
  buildClassificationReviewExport(
    document,
    [source],
    aliases,
    "standard-compliant",
  ),
  /blocked/,
  "A retained legacy alias stays non-standard even if its canonical target conforms.",
);
const otherContext = {
  ...structuredClone(source),
  rowId: crypto.randomUUID(),
  context: '[["mode","other"]]',
};
const contextualAliases = {
  ...aliases,
  tokens: aliases.tokens.map((alias) => ({
    ...alias,
    contexts: [source.context, otherContext.context],
  })),
};
const contextualPacket = await buildClassificationReviewExport(
  unbound,
  [source, otherContext],
  contextualAliases,
  "compatibility",
);
assert.equal(
  contextualPacket.source.usages.filter(
    (usage) => usage.recordKind === "alias-usage",
  ).length,
  2,
);
for (const alias of contextualPacket.aliases) {
  assert(
    contextualPacket.assessment.occurrences.some(
      (entry) =>
        entry.recordKind === "alias-usage" &&
        entry.recordId === alias.uuid &&
        entry.termId === colorId &&
        entry.fixRequired,
    ),
    "Every retained alias mode inherits its target's definition warnings.",
  );
}
const omittedAliasUses = structuredClone(contextualPacket);
omittedAliasUses.source.usages = omittedAliasUses.source.usages.filter(
  (usage) => usage.recordKind !== "alias-usage",
);
omittedAliasUses.hashes.sourceSha256 = await classificationContentHash(
  omittedAliasUses.source,
);
omittedAliasUses.assessment = assessClassificationStandard(
  omittedAliasUses.source.taxonomy,
  omittedAliasUses.source.usages,
);
await assert.rejects(
  assertClassificationReviewExport(omittedAliasUses),
  /complete source rows and alias contexts/,
);
await assert.rejects(
  buildClassificationReviewExport(
    unbound,
    [source, { ...structuredClone(source), rowId: crypto.randomUUID() }],
    aliases,
    "compatibility",
  ),
  /exactly one emitted target/,
);
assert(
  classificationAssessmentMarkdown(inherited).includes(
    "non-standard: needs a fix",
  ),
);
assert(
  classificationAssessmentMarkdown(inherited).includes("not upstream accepted"),
);
await assertClassificationReviewExport(
  JSON.parse(JSON.stringify(compatibility)),
);
await assert.rejects(
  buildClassificationReviewExport(
    unbound,
    [source, source],
    EMPTY_ALIASES,
    "compatibility",
  ),
  /duplicate classification usage|Duplicate exported/i,
);
await assert.rejects(
  buildClassificationReviewExport(
    unbound,
    [source],
    {
      ...aliases,
      tokens: aliases.tokens.map((alias) => ({
        ...alias,
        $ref: "unavailable",
      })),
    },
    "compatibility",
  ),
  /unavailable canonical target/,
);
const missing = structuredClone(source);
delete missing.token.projection;
const unmappedPacket = await buildClassificationReviewExport(
  document,
  [missing],
  EMPTY_ALIASES,
  "compatibility",
);
assert.equal(unmappedPacket.tokens[0].value, missing.token.value);
assert.equal(
  unmappedPacket.assessment.occurrences.filter((entry) =>
    entry.issues.some((issue) => issue.code === "missing-projection"),
  ).length,
  1,
);
await assert.rejects(
  buildClassificationReviewExport(
    document,
    [missing],
    EMPTY_ALIASES,
    "standard-compliant",
  ),
  /blocked/,
);

for (const mutate of [
  (packet: typeof compatibility) => {
    packet.source.records[0].token.value = "#000000";
  },
  (packet: typeof compatibility) => {
    packet.tokens = [];
  },
  (packet: typeof compatibility) => {
    packet.aliases[0].$ref = crypto.randomUUID();
  },
  (packet: typeof compatibility) => {
    packet.assessment.occurrences.pop();
  },
  (packet: typeof compatibility) => {
    packet.assessment.counts.nonStandard = 0;
  },
  (packet: typeof compatibility) => {
    packet.standard.concepts[0].definition = "A different interpretation";
  },
  (packet: typeof compatibility) => {
    packet.standardConforming = true;
  },
]) {
  const tampered = structuredClone(compatibility);
  mutate(tampered);
  await assert.rejects(
    assertClassificationReviewExport(tampered),
    /Invalid|stale|omitted|flags|Unrecognized/,
  );
}
const wrongOwner = structuredClone(document);
wrongOwner.terms[0].categoryId = wrongOwner.categories.find(
  (category) => category.key === "attribute",
)!.id;
assert(
  assessClassificationStandard(wrongOwner).occurrences.some(
    (entry) =>
      entry.termId === colorId &&
      entry.issues.some((issue) => issue.code === "wrong-owner"),
  ),
);
for (const value of ["Body", "Heading", "Detail", "Code"]) {
  const componentAsElement = structuredClone(document);
  componentAsElement.terms.find((term) => term.value === "Text")!.value = value;
  assert(
    assessClassificationStandard(componentAsElement).occurrences.some(
      (entry) =>
        entry.targetId === `component:${value.toLowerCase()}` &&
        entry.fixRequired,
    ),
  );
}
for (const value of ["Edge", "Item", "Substructure", "Fill", "Content"]) {
  const retired = structuredClone(document);
  retired.terms.find((term) => term.value === "Text")!.value = value;
  assert(
    assessClassificationStandard(retired).occurrences.some((entry) =>
      entry.issues.some((issue) => issue.code === "retired-term"),
    ),
  );
}
const ordered = structuredClone(document);
const element = ordered.categories.find(
  (category) => category.key === "element",
)!;
element.cardinality = "ordered";
const visual = {
  ...ordered.terms.find((term) => term.value === "Text")!,
  id: crypto.randomUUID(),
  value: "Visual",
  description: concept("Visual").definition,
};
ordered.terms.push(visual);
ordered.classifications["ordered-instance"] = {
  [element.id]: [
    ordered.terms.find((term) => term.value === "Text")!.id,
    visual.id,
  ],
};
assertTaxonomy(ordered);
const orderedReview = assessClassificationStandard(ordered);
assert(
  orderedReview.occurrences
    .filter((entry) => entry.recordKind === "stored-assignment")
    .every((entry) => entry.fixRequired),
);
assert.deepEqual(ordered.classifications["ordered-instance"][element.id], [
  ordered.terms.find((term) => term.value === "Text")!.id,
  visual.id,
]);
const orderedPacket = await buildClassificationReviewExport(
  ordered,
  [],
  EMPTY_ALIASES,
  "compatibility",
);
assert.deepEqual(
  orderedPacket.source.taxonomy.classifications,
  ordered.classifications,
);
assert.throws(() => assertStandardClassification(orderedReview), /blocked/);

const provisional = structuredClone(document);
provisional.categories[0].key = "colorName";
provisional.categories[0].name = "Color name";
provisional.terms[0].value = "Photoshop Blue";
assert(
  assessClassificationStandard(provisional).occurrences.some(
    (entry) =>
      entry.termId === colorId &&
      entry.issues.some((issue) => issue.code === "source-reference-review"),
  ),
);
const provisionalReview = assessClassificationStandard(provisional);
const sourceMessages = classificationReviewMessages(
  provisional,
  provisionalReview.occurrences,
);
assert.equal(
  sourceMessages.filter((message) => message.includes("has not finalized"))
    .length,
  1,
);
assert(
  sourceMessages.some((message) =>
    message.includes(
      "renaming the color or changing its value will not resolve",
    ),
  ),
);
const sourceCategory = provisional.categories[0];
sourceCategory.description = classificationStandard.facets.find(
  (facet) => facet.key === "colorName",
)!.question;
assert(
  assessClassificationStandard(provisional).occurrences.some(
    (entry) => entry.fixRequired,
  ),
  "Updating a description cannot approve provisional source references.",
);
for (const assessed of [
  assessClassificationStandard(wrongOwner),
  assessClassificationStandard(ordered),
  unmappedPacket.assessment,
  assessClassificationStandard(document, [
    {
      id: "unknown-scope",
      classification: source.token.projection!.classification,
    },
  ]),
]) {
  const messages = classificationReviewMessages(document, assessed.occurrences);
  assert(messages.length > 0);
  assert(
    messages.every(
      (message) => message.trim().length > 0 && !message.includes("undefined"),
    ),
  );
}
const visibility = {
  ...document.categories[0],
  key: "visibility",
  name: "Visibility",
};
assert.equal(standardCategoryName(visibility), "Prominence");
assert.equal(
  visibility.name,
  "Visibility",
  "Display naming does not silently migrate the saved label.",
);
const size = structuredClone(document);
size.terms[0] = {
  ...size.terms[0],
  value: "Size",
  description: concept("Size").definition,
};
const sizeClassification = row(size).token.projection!.classification;
assert(
  assessClassificationStandard(size, [
    { id: "nominal", scope: "typography", classification: sizeClassification },
  ]).occurrences.some((entry) =>
    entry.issues.some((issue) => issue.code === "measurement-review"),
  ),
);
assertStandardClassification(
  assessClassificationStandard(size, [
    {
      id: "nominal",
      scope: "typography",
      classification: sizeClassification,
      measurement: {
        kind: "nominal-font-size",
        unit: "px",
        reference: "CSS font-size nominal em-square size",
      },
    },
  ]),
);

const numeric = fixture();
numeric.categories = ["scaleIndex", "number"].map((key) => ({
  id: crypto.randomUUID(),
  key,
  name: key === "number" ? "Number" : "Scale index",
  description: classificationStandard.facets.find((facet) => facet.key === key)!
    .question,
  valueType: "number",
  cardinality: "one",
  scopes: ["colors"],
  required: false,
  includeInProjections: true,
}));
numeric.order = numeric.categories.map((category) => category.id);
numeric.terms = numeric.categories.map((category) => ({
  id: crypto.randomUUID(),
  categoryId: category.id,
  value: 1,
  description: "",
}));
assertTaxonomy(numeric);
assertStandardClassification(assessClassificationStandard(numeric));
numeric.terms[0].value = -1.25;
assertStandardClassification(assessClassificationStandard(numeric));
assert.throws(
  () =>
    assessClassificationStandard({
      ...numeric,
      terms: numeric.terms.map((term, index) =>
        index ? { ...term, value: 1.5 } : term,
      ),
    }),
  /positive whole number/,
);
assert.throws(
  () =>
    assessClassificationStandard({
      ...numeric,
      terms: numeric.terms.map((term) => ({ ...term, value: "1" })),
    }),
  /incompatible type|already owned/,
);

const snapshot = createDefaultSnapshot();
if (!snapshot.taxonomy) throw new Error("Missing native taxonomy.");
const bundle = buildTshirtArtifacts(snapshot);
const rows = canonicalAliasRows(completeAliasSource(snapshot), bundle);
const nativeBefore = canonicalJson({
  taxonomy: snapshot.taxonomy,
  rows,
  aliases: snapshot.aliases,
});
const nativePacket = await buildClassificationReviewExport(
  snapshot.taxonomy,
  rows,
  snapshot.aliases ?? EMPTY_ALIASES,
  "compatibility",
);
const generatedColor = rows.find(
  (record) =>
    record.token.type === "colors" &&
    !record.token.paletteColorId &&
    !record.token.valueOverridden &&
    !record.token.dataVis?.static,
);
if (!generatedColor)
  throw new Error("Missing default generated color fixture.");
const colorMessages = classificationReviewMessages(
  snapshot.taxonomy,
  nativePacket.assessment.occurrences.filter(
    (entry) => entry.recordId === generatedColor.rowId,
  ),
);
assert(
  colorMessages.some((message) =>
    message.includes(
      'Category description: "What characteristic is measured or styled?"',
    ),
  ),
);
assert(
  colorMessages.some((message) =>
    message.includes(concept("Color").definition),
  ),
);
assert(
  colorMessages.some((message) =>
    message.includes(
      "has not finalized how these source names should be recorded",
    ),
  ),
);
assert(
  !colorMessages.some((message) =>
    /does not bind|source-reference conformance|Matching words alone/.test(
      message,
    ),
  ),
);
assert.equal(
  nativePacket.tokens.find((token) => token.id === generatedColor.rowId)?.value,
  generatedColor.token.value,
  "Clearer review language preserves the generated color value.",
);
const directSemantic = rows.find(
  (record) => record.token.semantic && "$ref" in record.token.semantic.token,
);
if (!directSemantic) throw new Error("Missing native direct semantic fixture.");
const emitted = canonicalTaxonomyValue(directSemantic, rows);
assert("$ref" in emitted);
const primitive = rows.find((record) => record.rowId === emitted.$ref);
if (!primitive) throw new Error("Missing emitted primitive fixture.");
assert.throws(
  () =>
    canonicalTaxonomyValue(
      directSemantic,
      rows.filter((record) => record.rowId !== primitive.rowId),
    ),
  /exactly one emitted primitive target/,
);
assert.throws(
  () =>
    canonicalTaxonomyValue(directSemantic, [
      ...rows,
      { ...primitive, rowId: crypto.randomUUID() },
    ]),
  /exactly one emitted primitive target/,
  "A semantic reference must not pick the first ambiguous primitive row.",
);
assert.equal(nativePacket.tokens.length, rows.length);
assert(nativePacket.assessment.counts.nonStandard > 0);
assert(
  nativePacket.assessment.occurrences.some(
    (entry) =>
      entry.value === "Body" &&
      entry.targetId === "component:body" &&
      entry.fixRequired,
  ),
);
assert(
  nativePacket.source.records.filter(
    (record) => record.token.measurement?.kind === "nominal-font-size",
  ).length > 0,
);
assert(
  nativePacket.source.records
    .filter((record) => record.token.measurement)
    .every(
      (record) =>
        record.token.groupId === "font-size" && record.token.unit === "px",
    ),
);
assert.equal(
  canonicalJson({
    taxonomy: snapshot.taxonomy,
    rows,
    aliases: snapshot.aliases,
  }),
  nativeBefore,
);
await assert.rejects(
  buildClassificationReviewExport(
    snapshot.taxonomy,
    rows,
    snapshot.aliases ?? EMPTY_ALIASES,
    "standard-compliant",
  ),
  /blocked/,
);
const generatedPacket = await buildGeneratedClassificationCompatibility(
  bundle,
  nativePacket,
);
assert.equal(canonicalJson(generatedPacket.bundle), canonicalJson(bundle));
assert(
  generatedPacket.review.occurrences.every(
    (entry) => entry.status === "non-standard" && entry.fixRequired,
  ),
);
assert(
  generatedPacket.review.occurrences.some(
    (entry) =>
      entry.pointer.includes("/semantics/") &&
      entry.pointer.includes("/classification/"),
  ),
);
assert(
  generatedPacket.review.occurrences.some((entry) =>
    entry.pointer.includes("/vocabulary/"),
  ),
);
await assertGeneratedClassificationCompatibility(
  JSON.parse(JSON.stringify(generatedPacket)),
);
const missingFlag = structuredClone(generatedPacket);
missingFlag.review.occurrences.pop();
await assert.rejects(
  assertGeneratedClassificationCompatibility(missingFlag),
  /flags omitted/,
);
const staleBundle = structuredClone(generatedPacket);
staleBundle.bundle.semantics = [];
await assert.rejects(
  assertGeneratedClassificationCompatibility(staleBundle),
  /fingerprint is stale/,
);
for (const alteredBundle of [
  { ...bundle, profile: { ...bundle.profile, gapId: "unrecognized-profile" } },
  { ...bundle, fields: [{ name: "malformed-field" }] },
  { ...bundle, vocabulary: { ...bundle.vocabulary, physicalPositions: [42] } },
  {
    ...bundle,
    modeSets: [
      { id: "bad-axis", key: "bad-axis", defaultModeId: "absent", modes: [] },
    ],
  },
  {
    ...bundle,
    modeSets: [
      {
        id: "bad-default",
        key: "bad-default",
        defaultModeId: "absent",
        modes: [{ id: "available", key: "available" }],
      },
    ],
  },
]) {
  const alteredPacket = {
    ...generatedPacket,
    bundle: alteredBundle,
    bundleSha256: await classificationContentHash(alteredBundle),
  };
  await assert.rejects(
    assertGeneratedClassificationCompatibility(alteredPacket),
    /Invalid|unique identities and an available default/,
  );
}

const legacyEdit = structuredClone(snapshot);
const nativeToken = rows.find((record) => !record.token.semantic)!;
legacyEdit.browserTokenEdits = {
  ...legacyEdit.browserTokenEdits,
  [nativeToken.token.id]: { name: "retained-non-standard-name", values: {} },
};
assert.throws(
  () => canonicalAliasRows(completeAliasSource(legacyEdit), bundle),
  /Cannot save alias targets/,
);
const preserved = canonicalAliasRows(
  completeAliasSource(legacyEdit),
  bundle,
  "preserve-for-review",
);
const retained = preserved.find(
  (record) => record.token.id === nativeToken.token.id,
)!;
assert.equal(retained.name, "retained-non-standard-name");
assert(
  retained.token.projection!.issues.some((issue) =>
    issue.includes("Legacy name edit"),
  ),
);
const legacyPacket = await buildClassificationReviewExport(
  legacyEdit.taxonomy!,
  preserved,
  legacyEdit.aliases ?? EMPTY_ALIASES,
  "compatibility",
);
assert(
  legacyPacket.assessment.occurrences.some(
    (entry) => entry.recordId === retained.rowId && entry.fixRequired,
  ),
);
assert.equal(
  legacyPacket.tokens.find((token) => token.id === retained.rowId)!.value,
  retained.token.value,
);
console.log(
  `Classification schemas, definition/owner/applicability gates, per-instance flags, preservation and ${rows.length} native output rows passed.`,
);
