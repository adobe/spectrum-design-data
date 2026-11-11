// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createLocalVariantProperty } from "../src/features/option-groups/model";
import {
  renameVariantProperty,
  renameVariantOption,
} from "../src/features/option-groups/naming";
import {
  stylePropertiesEditor,
  stylePropertyOperations,
} from "../src/features/styles/variants";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";

function source(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}
function elements(file: ts.SourceFile, tag: string) {
  const found: (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === tag
    )
      found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}
const styles = source("views/styles/StyleDesignView.tsx");
for (const tag of [
  "DesignMetadataPanel",
  "DesignEditorPanel",
  "DesignProperties",
  "DesignValueDisplay",
])
  assert.equal(
    elements(styles, tag).length,
    1,
    `Styles uses the shared ${tag}, not a parallel form.`,
  );
assert.equal(
  elements(styles, "ClassificationTerms").length,
  0,
  "Styles does not expose term pickers in metadata or properties.",
);
assert.equal(
  elements(styles, "EditableTextField").length,
  0,
  "Inline naming is owned by the shared panels.",
);
for (const [path, tag] of [
  ["panels/structures/StructureMetadataPanel.tsx", "DesignMetadataPanel"],
  ["panels/structures/StructureProperties.tsx", "DesignProperties"],
  ["views/structures/StructureDesignView.tsx", "DesignEditorPanel"],
  ["panels/structures/StructureAppearanceControls.tsx", "DesignValueDisplay"],
])
  assert.equal(
    elements(source(path), tag).length,
    1,
    `Structures also uses ${tag}.`,
  );

const properties = elements(styles, "DesignProperties")[0];
const kinds = properties.attributes.properties.find(
  (attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) &&
    attribute.name.getText(styles) === "supportedKinds",
);
assert(
  kinds?.initializer &&
    ts.isJsxExpression(kinds.initializer) &&
    kinds.initializer.expression,
);
assert.deepEqual(
  Array.from(runInNewContext(kinds.initializer.expression.getText(styles))),
  ["variant"],
  "Styles only offers supported property kinds; Structure Booleans are not silently treated as appearance variants.",
);

const metadata = source("panels/design/DesignMetadataPanel.tsx");
const name = elements(metadata, "EditableTextField")[0];
const blur = name.attributes.properties.find(
  (attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) &&
    attribute.name.getText(metadata) === "onBlur",
)?.initializer;
assert(blur && ts.isJsxExpression(blur) && blur.expression);
const blurCode = ts.transpileModule(`(${blur.expression.getText(metadata)})`, {
  compilerOptions: { target: ts.ScriptTarget.ESNext },
}).outputText;
for (const isReadOnly of [false, true]) {
  const commits: string[] = [],
    resets: string[] = [],
    errors: unknown[] = [];
  const handler: () => void = runInNewContext(blurCode, {
    isReadOnly,
    draft: "Changed",
    name: "Original",
    onRename: (value: string) => commits.push(value),
    setDraft: (value: string) => resets.push(value),
    report: (error: unknown) => errors.push(error),
  });
  handler();
  assert.deepEqual(commits, isReadOnly ? [] : ["Changed"]);
  assert.deepEqual(resets, []);
  assert.deepEqual(errors, []);
}
const errors: unknown[] = [],
  resets: string[] = [];
const failure = new Error("Name unavailable.");
const rejected: () => void = runInNewContext(blurCode, {
  isReadOnly: false,
  draft: "Changed",
  name: "Original",
  onRename: () => {
    throw failure;
  },
  setDraft: (value: string) => resets.push(value),
  report: (error: unknown) => errors.push(error),
});
rejected();
assert.deepEqual(
  resets,
  ["Original"],
  "Rejected metadata edits restore the current name.",
);
assert.deepEqual(
  errors,
  [failure],
  "Rejected edits remain visible, not success-shaped.",
);

const property = createLocalVariantProperty("Tone");
const original = stylePropertiesEditor({
  options: [property],
  differences: {
    [property.options[1].id]: {
      color: { kind: "single", binding: { value: "#123456" } },
    },
  },
});
const before = structuredClone(original);
const option = { id: crypto.randomUUID(), name: "Muted", classification: {} };
const duplicated = stylePropertyOperations.duplicateVariantOption(
  original,
  property.id,
  property.options[1].id,
  option,
);
assert.equal(
  duplicated.properties[0].kind === "variant" &&
    duplicated.properties[0].options.at(-1)?.id,
  option.id,
);
assert.deepEqual(
  duplicated.differences[option.id],
  original.differences[property.options[1].id],
  "Adding an option carries over the selected appearance differences.",
);
assert.notEqual(
  duplicated.differences[option.id],
  original.differences[property.options[1].id],
  "Copied differences are independent.",
);
const removed = stylePropertyOperations.removeVariantOption(
  duplicated,
  property.id,
  option.id,
);
assert.deepEqual(
  removed,
  original,
  "Deleting an option removes only its owned differences.",
);
assert.throws(
  () =>
    stylePropertyOperations.removeVariantOption(
      original,
      property.id,
      property.defaultOptionId,
    ),
  /default/,
);
assert.throws(
  () =>
    stylePropertyOperations.makeVariantOptionDefault(
      original,
      property.id,
      property.options[1].id,
    ),
  /before saving differences/,
);
const local = { ...original, differences: {} };
const changedDefault = stylePropertyOperations.makeVariantOptionDefault(
  local,
  property.id,
  property.options[1].id,
);
assert.equal(
  changedDefault.properties[0].kind === "variant" &&
    changedDefault.properties[0].defaultOptionId,
  property.options[1].id,
);
const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [],
  terms: [],
  order: [],
  classifications: {},
};
const renamed = renameVariantProperty(
  original,
  property.id,
  "Emphasis",
  taxonomy,
  true,
  "styles",
);
assert.equal(renamed.editor.properties[0].name, "Emphasis");
assert.deepEqual(renamed.editor.differences, original.differences);
const renamedOption = renameVariantOption(
  original,
  property.id,
  property.options[1].id,
  "Quiet",
  taxonomy,
  true,
  "styles",
);
assert.equal(
  renamedOption.editor.properties[0].kind === "variant" &&
    renamedOption.editor.properties[0].options[1].name,
  "Quiet",
);
assert.notDeepEqual(
  renamedOption.taxonomy,
  taxonomy,
  "Saving a local name establishes Registry references.",
);
assert.deepEqual(
  original,
  before,
  "Shared editor operations do not mutate saved inputs.",
);
assert.deepEqual(
  stylePropertyOperations.removeProperty(original, property.id),
  {
    properties: [],
    differences: {},
  },
  "Styles retains property removal through the shared row menu.",
);
console.log(
  "Shared Design panels, capability-specific controls, inline naming and Style option differences passed.",
);
