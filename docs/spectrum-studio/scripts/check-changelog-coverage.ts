// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import schema from "../src/data/design-system.schema.json" with { type: "json" };

// Pin model shape independently from default values and upstream alignment evidence.
const reviewedShape =
  "49645ba58e0278a12589d0eb9ec9b4dcc5e6fb090b847dd5ed6fb823a4110ff4";
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
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(schemaShape(value.definitions)))
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
