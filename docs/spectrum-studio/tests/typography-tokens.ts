// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { buildTypographyPrimitiveTable } from "../src/features/tokens/view/tokenPrimitiveAdapters";
import { createTaxonomyDefaults } from "../src/features/taxonomy/defaults";
import { typographyTokenValues } from "../src/features/typography/typographyTokens";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import { designSystemDefaults } from "../src/data/defaults";

const generated = generateTypography(TYPOGRAPHY_DEFAULTS);
const table = buildTypographyPrimitiveTable(generated);

assert.deepEqual(
  table.groups.map((group) => group.label),
  [
    "Font size",
    "Body line height",
    "Body unitless line height",
    "Heading line height",
    "Heading unitless line height",
    "Component line height",
    "Component unitless line height",
    "Icon size",
  ],
);
assert.ok(
  table.groups.every((group) => group.rows.length === generated.length),
);
assert.equal(table.groups[0].rows[2].cells.name.text, "font-size-100");
assert.equal(table.groups[1].rows[2].cells.name.text, "body-line-height-100");
assert.equal(table.groups[7].rows[2].cells.name.text, "workflow-icon-size-100");
assert.match(table.groups[1].rows[2].cells.value.text, /^\d+(\.\d+)?rem$/);
assert.doesNotMatch(table.groups[2].rows[2].cells.value.text, /px|rem|em|pt/);
const taxonomy = structuredClone(designSystemDefaults.system.taxonomy);
const naming = { registry: taxonomy, names: TYPOGRAPHY_DEFAULTS.metricNames };
assert.deepEqual(
  typographyTokenValues(generated, taxonomy, naming).map(
    (token) => token.value,
  ),
  typographyTokenValues(generated).map((token) => token.value),
);
assert.throws(
  () =>
    buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
      taxonomy: createTaxonomyDefaults(),
    }),
  /Unresolved|export blocked/,
);
assert(
  buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
    taxonomy: {
      ...designSystemDefaults.system.taxonomy,
      order: [...designSystemDefaults.system.taxonomy.order].reverse(),
    },
  }).includes("--100-size-text:"),
);
assert.throws(
  () =>
    buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
      taxonomy: {
        ...taxonomy,
        terms: taxonomy.terms.filter(
          (term) =>
            term.id !== TYPOGRAPHY_DEFAULTS.metricNames["font-size"].termId,
        ),
      },
    }),
  /Unresolved|unavailable|export blocked/,
);
const registry = structuredClone(designSystemDefaults.system.taxonomy);
const metricRef = TYPOGRAPHY_DEFAULTS.metricNames!["body-lineHeight"];
registry.terms.find((term) => term.id === metricRef.termId)!.value =
  "Reading height";
const namedCss = buildTypographyCss(TYPOGRAPHY_DEFAULTS, {
  taxonomy: registry,
  registry,
});
assert.match(
  namedCss,
  /--reading-height-line-height-100:/,
  "Strict CSS uses the registered Element and Property references, not its old native ID label.",
);
const renamedValues = typographyTokenValues(generated, registry, {
  names: TYPOGRAPHY_DEFAULTS.metricNames,
  registry,
});
assert.deepEqual(
  renamedValues.map(({ id, value }) => ({ id, value })),
  typographyTokenValues(generated).map(({ id, value }) => ({ id, value })),
);

console.log("Typography token table checks passed.");
