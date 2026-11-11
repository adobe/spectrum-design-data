// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import schema from "../src/data/design-system.schema.json" with { type: "json" };

// Conditional trees/outcomes are covered by conditional-rules.ts, including nested resets.
// generator-rules.ts covers applicability, ordered mappings, default rebasing, atomic edits and scoped resets.
// accessory-structure-defaults.ts and structure-variant-state.ts cover the existing variant maps and their lifecycle.
// structure-slots.ts covers additive Slot names, element-collection reset, Save/Cancel and zero semantic growth.
// Including the icon declarations changes only union ordering in generated definition names and references.
// changelog-schema-review.ts covers Registry, color, mode, variant, numeric Structure and manual-draft resets.
// structure-portable-contract.ts and structure-portable-persistence.ts cover the stored/runtime mapping,
// publication/resource preservation, Registry dependencies and independent saved/working migrations.
// color-scale-type-lifecycle.ts and changelog-schema-review.ts cover color type/sync settings,
// independent resets, linked opacity propagation, exact source identities and Save/Cancel/reload.
// scale-adjustment-lifecycle.ts and changelog-schema-review.ts cover shared absolute colors,
// atomic method resets, independent envelope upgrades and exact source/token/component impact.
// Optional enabled flags retain settings through Save/Cancel/reload and have narrow resets for both methods.
// swatch-indices.ts covers optional color/opacity indices, atomic uniqueness, stable values/IDs,
// output propagation, semantic Changes counts, scoped resets and backward-compatible restoration.
// token-tiers.ts covers category tier restrictions and manual tiers, exact field counts,
// narrow resets, local output metadata and independent saved/working upgrades.
// reference-overrides.ts covers the corrected assignment/baseline map schema, exact-mode
// writes, baseline exclusions, Changes reset addresses, Save/Cancel/reload and staleness.
// component-sizing-lifecycle.ts and changelog-schema-review.ts --sizing-only cover the shared
// size source, typography baseline, both modal overrides and availability settings, including
// valid narrow resets, independent upgrades, exact Impact unions and Save/Cancel/reload.
// palette-naming.ts covers optional term projection flags, field-level reset, exact Changes counts,
// unchanged values/identities/denominators and independent Save/Cancel/reload without a data migration.
// structure-layout-scales.ts and structure-layout-scale-migration.ts cover component-size
// scaling, linked formulas, explicit static exclusions, Changes/reset, and v31 Save/Cancel/reload.
// styles.ts, styles-integration.ts and styles-lifecycle.ts cover recipe fields, option
// differences, selected rule outputs, named property expansion, stable publications,
// field/domain reset addresses, independent v29 upgrades, Save/Cancel/reload, Delete/Undo,
// real Component Impact and preview-only selections without altering output identities.
// Pin model shape independently from default values and upstream alignment evidence.
const reviewedShape =
  "ee812ed2a5e3e023cfe4f0abec2b1b931d68fcfe89ff119f1ae66de6d5913a85";
const schemaMetadata = new Set([
  "title",
  "description",
  "default",
  "examples",
  "$schema",
  "$id",
]);
function schemaShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(schemaShape);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !schemaMetadata.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, schemaShape(entry)]),
    );
  return value;
}
export function assertChangeSchemaCoverage(value: {
  definitions: Record<string, object>;
}) {
  const definitions = structuredClone(value.definitions);
  // text-styles.ts covers complete references, option removal, map values and atomic resets.
  const propertiesOf = (name: string) => {
    const definition = definitions[name];
    assert(
      definition &&
        "properties" in definition &&
        definition.properties &&
        typeof definition.properties === "object",
    );
    return definition.properties;
  };
  assert.deepEqual(
    schemaShape(definitions.TextStyleReference),
    schemaShape({
      type: "object",
      properties: {
        recipeId: { type: "string" },
        options: { type: "object", additionalProperties: { type: "string" } },
      },
      additionalProperties: false,
      required: ["options", "recipeId"],
    }),
  );
  const elementProperties = propertiesOf("PortableElement");
  assert.deepEqual(Reflect.get(elementProperties, "textStyle"), {
    $ref: "#/definitions/TextStyleReference",
  });
  Reflect.deleteProperty(elementProperties, "textStyle");
  const effect = definitions.StructureEffect;
  assert("anyOf" in effect && Array.isArray(effect.anyOf));
  const fieldsEffect = effect.anyOf.find(
    (entry) => entry.properties?.kind?.const === "elementFields",
  );
  assert(fieldsEffect);
  assert.deepEqual(fieldsEffect.properties.fields.properties.textStyle, {
    $ref: "#/definitions/TextStyleReference",
  });
  assert.deepEqual(fieldsEffect.properties.unset.items.enum, [
    "name",
    "orientation",
    "textStyle",
  ]);
  delete fieldsEffect.properties.fields.properties.textStyle;
  fieldsEffect.properties.unset.items.enum = ["name", "orientation"];
  delete definitions.TextStyleReference;
  // icon-styles.ts covers optional mode indices, atomic color resets and independent saved/working values.
  for (const color of [
    definitions.StyleColor,
    Reflect.get(propertiesOf("Partial<StyleAppearance>"), "color"),
  ]) {
    assert("anyOf" in color && Array.isArray(color.anyOf));
    const families = color.anyOf.find(
      (entry) => entry.properties?.kind?.const === "families",
    );
    assert(families);
    assert.deepEqual(
      schemaShape(families.properties.indexModes),
      schemaShape({
        type: "object",
        properties: {
          modeSetId: { type: "string" },
          values: { type: "object", additionalProperties: { type: "number" } },
        },
        additionalProperties: false,
        required: ["modeSetId", "values"],
      }),
    );
    delete families.properties.indexModes;
  }
  const appearance = structuredClone(definitions.StyleAppearance);
  assert("required" in appearance);
  Reflect.deleteProperty(appearance, "required");
  const appearanceProperties = propertiesOf("StyleAppearance");
  Reflect.set(appearance, "properties", {
    ...appearanceProperties,
    color: definitions.StyleColor,
  });
  assert.deepEqual(
    schemaShape(definitions["Partial<StyleAppearance>"]),
    schemaShape(appearance),
  );
  delete definitions["Partial<StyleAppearance>"];
  for (const [name, field, previous, expected] of [
    [
      "StyleRecipe",
      "differences",
      "Record<string,Partial<StyleAppearance>>",
      {
        type: "object",
        additionalProperties: {
          $ref: "#/definitions/Partial%3CStyleAppearance%3E",
        },
      },
    ],
    [
      "StylePublication",
      "rows",
      "Record<string,string>",
      {
        type: "object",
        additionalProperties: { type: "string" },
      },
    ],
    [
      "StylesDocument",
      "examples",
      "Record<string,{icon:string|null;}>",
      {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: { icon: { type: ["null", "string"] } },
          additionalProperties: false,
          required: ["icon"],
        },
      },
    ],
  ] as const) {
    const properties = propertiesOf(name);
    assert.deepEqual(
      schemaShape(Reflect.get(properties, field)),
      schemaShape(expected),
    );
    Reflect.set(properties, field, {
      $ref: `#/definitions/${encodeURIComponent(previous)}`,
    });
    definitions[previous] = { type: "object", additionalProperties: false };
  }
  // typography-fonts.ts reviews font fields, identity-based resets, Impact and persistence.
  assert.deepEqual(
    schemaShape(definitions.TypographyFont),
    schemaShape({
      type: "object",
      properties: {
        id: { type: "string" },
        uuid: { type: "string" },
        conceptId: { type: "string" },
        nameReference: { $ref: "#/definitions/TaxonomyNameReference" },
        name: { type: "string" },
        fontFamily: { type: "string" },
      },
      additionalProperties: false,
      required: ["conceptId", "fontFamily", "id", "name", "uuid"],
    }),
  );
  const typography = definitions.TypographyDocument;
  assert(
    "properties" in typography &&
      typography.properties &&
      typeof typography.properties === "object",
  );
  assert.deepEqual(Reflect.get(typography.properties, "fonts"), {
    type: "array",
    items: { $ref: "#/definitions/TypographyFont" },
  });
  assert("required" in typography && Array.isArray(typography.required));
  assert(typography.required.includes("fonts"));
  typography.required = typography.required.filter(
    (key: unknown) => key !== "fonts",
  );
  Reflect.deleteProperty(typography.properties, "fonts");
  assert.deepEqual(Reflect.get(typography.properties, "schemaVersion"), {
    type: "number",
    const: 11,
  });
  Reflect.set(typography.properties, "schemaVersion", {
    type: "number",
    const: 9,
  });
  delete definitions.TypographyFont;
  const dimension = definitions["CanonicalNamedSource<DimensionScale>"];
  assert(
    "properties" in dimension &&
      dimension.properties &&
      typeof dimension.properties === "object",
  );
  assert.deepEqual(
    schemaShape(Reflect.get(dimension.properties, "componentSizeScaling")),
    { type: "boolean" },
    "Dimension component-size scaling needs reviewed Changes coverage.",
  );
  Reflect.deleteProperty(dimension.properties, "componentSizeScaling");
  // Publication metadata is checked separately; it must not change authored Changes slots.
  assert.deepEqual(
    schemaShape(definitions.TokenIdentity),
    schemaShape({
      type: "object",
      properties: {
        sourceId: { type: "string" },
        conceptId: { type: "string" },
        name: {
          type: "object",
          additionalProperties: { type: ["string", "number"] },
        },
        rows: { type: "object", additionalProperties: { type: "string" } },
      },
      additionalProperties: false,
      required: ["conceptId", "name", "rows", "sourceId"],
    }),
  );
  const authoring = definitions.TokenAuthoring;
  assert(
    "properties" in authoring &&
      authoring.properties &&
      typeof authoring.properties === "object",
  );
  assert.deepEqual(Reflect.get(authoring.properties, "identity"), {
    $ref: "#/definitions/TokenIdentity",
  });
  Reflect.deleteProperty(authoring.properties, "identity");
  delete definitions.TokenIdentity;
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(schemaShape(definitions)))
      .digest("hex"),
    reviewedShape,
    "Authoring fields changed. Review Changes coverage, reset support and fixtures before accepting the new shape.",
  );
}
assertChangeSchemaCoverage(schema);

/** Foundation domains that intentionally have no foundation impact source. Each needs a reason. */
const IMPACT_EXEMPTIONS: Readonly<Record<string, string>> = {};
/**
 * Every Changes domain under the "foundations" topic must have a foundation impact source, found by its
 * category appearing in `src/features/impact/sources/`. This is a presence check: it cannot prove the source
 * is registered in FOUNDATION_IMPACT_SOURCES or that token and component impact exist.
 */
export function assertImpactSourceCoverage(
  foundationCategories: readonly string[],
  sourceText: string,
  exemptions: Readonly<Record<string, string>> = IMPACT_EXEMPTIONS,
) {
  const missing = foundationCategories.filter(
    (category) =>
      !exemptions[category] && !sourceText.includes(`"${category}"`),
  );
  assert.deepEqual(
    missing,
    [],
    `Foundation domains without a foundation impact source: ${missing.join(", ")}. Add a source under src/features/impact/sources/ and register it in FOUNDATION_IMPACT_SOURCES, or add a documented exemption (see the authoring-lifecycle skill, step 12).`,
  );
}
const source = (file: string) =>
  ts.createSourceFile(
    file,
    readFileSync(new URL(file, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
const snapshot = source("../src/features/edit-session/state.ts");
const registry = source("../src/features/changelog/registry.ts");
const snapshotKeys: string[] = [],
  registeredKeys: string[] = [],
  foundationCategories: string[] = [];
function visitSnapshot(node: ts.Node) {
  if (
    ts.isInterfaceDeclaration(node) &&
    node.name.text === "EditSessionSnapshot"
  ) {
    for (const member of node.members)
      if (
        member.name &&
        (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
      )
        snapshotKeys.push(member.name.text);
  }
  ts.forEachChild(node, visitSnapshot);
}
function visitRegistry(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "CHANGE_DOMAINS" &&
    node.initializer
  ) {
    const initializer = ts.isSatisfiesExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    if (ts.isObjectLiteralExpression(initializer))
      for (const property of initializer.properties) {
        if (
          ts.isPropertyAssignment(property) &&
          (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ) {
          registeredKeys.push(property.name.text);
          if (ts.isObjectLiteralExpression(property.initializer)) {
            const fields = new Map<string, string>();
            for (const field of property.initializer.properties) {
              if (
                ts.isPropertyAssignment(field) &&
                ts.isIdentifier(field.name) &&
                ts.isStringLiteral(field.initializer)
              )
                fields.set(field.name.text, field.initializer.text);
            }
            const category = fields.get("category");
            if (fields.get("topic") === "foundations" && category)
              foundationCategories.push(category);
          }
        }
      }
  }
  ts.forEachChild(node, visitRegistry);
}
visitSnapshot(snapshot);
visitRegistry(registry);
assert.ok(
  snapshotKeys.length && registeredKeys.length,
  "Changes coverage declarations must be discoverable.",
);
assert.deepEqual(
  registeredKeys.sort(),
  snapshotKeys.sort(),
  "Every authored snapshot field needs a Changes registration.",
);
const impactSourcesDir = new URL(
  "../src/features/impact/sources/",
  import.meta.url,
);
const impactSourceText = readdirSync(impactSourcesDir)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => readFileSync(new URL(name, impactSourcesDir), "utf8"))
  .join("\n");
assert.ok(
  foundationCategories.length,
  "Foundation Changes domains must be discoverable.",
);
assertImpactSourceCoverage(
  [...new Set(foundationCategories)],
  impactSourceText,
);
console.log(
  "Changes domain, authoring-schema, and foundation impact-source coverage is complete.",
);
