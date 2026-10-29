// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { modeSetDefaultMode } from "../src/features/modes/model";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { governedSurfaceContext } from "../src/features/taxonomy/colorGovernance";
import { projectClassification } from "../src/features/taxonomy/model";
import { withLineHeightName } from "../src/features/typography/lineHeightNames";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
  DIMENSION_PROFILE,
} from "../src/features/design-data/dimensionArtifacts";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { designSystemDefaults } from "../src/data/defaults";
import { buildCanonicalTaxonomyExport } from "../src/features/taxonomy/export";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";
import { createTshirtFixture } from "./fixtures/tshirt";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";

const snapshot = createDefaultSnapshot();
const taxonomy = snapshot.taxonomy!;
const input = {
  base: snapshot.colorSystem,
  modeSets: snapshot.modeSets,
  activeModes: snapshot.modeSets
    .map(modeSetDefaultMode)
    .filter((mode) => mode !== undefined),
  activeTokens: [],
  overrides: {},
};
const baseline = buildCascadeTokenExport(input);
const canonical = buildCascadeTokenExport({ ...input, taxonomy });
assert.deepEqual(
  canonical.tokens.map(({ uuid, conceptId, value }) => ({
    uuid,
    conceptId,
    value,
  })),
  baseline.tokens.map(({ uuid, conceptId, value }) => ({
    uuid,
    conceptId,
    value,
  })),
);
const palette = canonical.tokens.find(
  (token) => token.name.colorName === "Illustrator Orange",
)!;
assert(palette);
assert.equal(palette.name.property, "color");
assert.equal(palette.name.scaleIndex, undefined);
assert(
  canonical.tokens
    .filter((token) => token.name.scaleIndex !== undefined)
    .every((token) => typeof token.name.scaleIndex === "number"),
);
const floating = snapshot.colorSystem.surfaces.find(
  (surface) => surface.name === "Floating surface",
)!;
assert.equal(
  projectClassification(
    taxonomy,
    governedSurfaceContext(snapshot.colorSystem, taxonomy, floating.id)
      .governed!,
    "colors",
  ).name,
  "floating-surface-color",
);
assert.equal(
  canonical.taxonomy!.surfaces[floating.id].name,
  "floating-surface-color",
);
const css = buildColorLibrary(snapshot.colorSystem, [], [], [], taxonomy);
assert(css.includes("--illustrator-orange-color:"));
assert(
  css.includes(
    "--color-palette-illustrator-orange: var(--illustrator-orange-color);",
  ),
);
assert(css.includes("--red-color-100: var(--color-system-tint);"));
assert(css.includes("--floating-surface-color: var(--surface-color);"));
assert(css.includes(".color-scale-red.color-contrast-100"));
const reordered = { ...taxonomy, order: [...taxonomy.order].reverse() };
const reorderedCss = buildColorLibrary(
  snapshot.colorSystem,
  [],
  [],
  [],
  reordered,
);
assert(reorderedCss.includes("--100-color-red:"));
assert(reorderedCss.includes("--color-illustrator-orange:"));
const missing = {
  ...taxonomy,
  terms: taxonomy.terms.filter(
    (term) => term.id !== snapshot.colorSystem.palette[0].nameRef!.termId,
  ),
};
assert.throws(
  () => buildColorLibrary(snapshot.colorSystem, [], [], [], missing),
  /Unresolved/,
);
const dimension = await buildDimensionArtifacts(
  captureDimensionSource(snapshot),
);
assert.equal(dimension.profileId, DIMENSION_PROFILE);
assert.equal(dimension.schemaVersion, 3);
assert.deepEqual(
  dimension.tokens.find(
    (token) =>
      token.name.tokenCategory === "Spacing" && token.name.scaleIndex === 100,
  )!.name,
  { tokenCategory: "Spacing", scaleIndex: 100 },
);
const renamed = withLineHeightName(
  snapshot.typography,
  taxonomy,
  "body",
  "Reading",
);
assert.equal(
  renamed.document.metricNames["body-lineHeight"].termId,
  snapshot.typography.metricNames["body-lineHeight"].termId,
);
assert.equal(
  renamed.document.metricNames["body-unitlessLineHeight"].termId,
  snapshot.typography.metricNames["body-unitlessLineHeight"].termId,
);
const rows = canonicalAliasRows(
  completeAliasSource({
    ...snapshot,
    typography: renamed.document,
    taxonomy: renamed.taxonomy,
  }),
);
assert(rows.some((row) => row.name === "reading-line-height-100"));
assert(rows.some((row) => row.name === "reading-unitless-line-height-100"));
const editedDataset = structuredClone(designSystemDefaults);
editedDataset.system.browserTokenEdits = {
  "spacing-spacing-scale-1-100": {
    description: "Spacing example",
    values: {
      "[]": { value: 17, baseline: 8 },
    },
  },
};
assert.deepEqual(
  composeDesignSystemDefaults(canonicalDesignSystemDataset(editedDataset))
    .system.browserTokenEdits,
  editedDataset.system.browserTokenEdits,
);
const invalidEdit = structuredClone(editedDataset);
Reflect.set(
  invalidEdit.system.browserTokenEdits!["spacing-spacing-scale-1-100"],
  "unexpected",
  true,
);
assert.throws(
  () => composeDesignSystemDefaults(canonicalDesignSystemDataset(invalidEdit)),
  /additional properties/,
);
for (const hidden of [false, true]) {
  const fixture = createTshirtFixture({ hidden });
  const source = { ...snapshot, ...fixture.source };
  const bundle = buildTshirtArtifacts(source);
  const targets = canonicalAliasRows(completeAliasSource(source), bundle);
  const packet = buildCanonicalTaxonomyExport(
    source.taxonomy!,
    targets,
    EMPTY_ALIASES,
  );
  for (const row of targets.filter((target) => target.token.semantic)) {
    const emitted = packet.tokens.find((token) => token.id === row.rowId)!;
    assert.equal(
      emitted.name,
      projectClassification(
        source.taxonomy!,
        row.token.semantic!.classification,
        "structures",
      ).name,
    );
    if (hidden) assert("value" in emitted);
    else {
      assert("$ref" in emitted);
      const target = packet.tokens.find((token) => token.id === emitted.$ref)!;
      assert(target && "value" in target);
      assert.equal(
        target.value,
        row.token.value,
        "Semantic references target the exact emitted canonical primitive.",
      );
    }
  }
}
console.log(
  "Canonical CSS/cascade names, numeric structured fields, local dimension v3 profile, source/values and shared line-height identities passed.",
);
