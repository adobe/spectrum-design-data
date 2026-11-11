// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStore } from "jotai";
import ts from "typescript";
import {
  stylePreview,
  styleVariantLabel,
} from "../src/features/styles/preview";
import {
  selectedStyleIdAtom,
  styleSampleTextAtom,
  stylesDocumentAtom,
} from "../src/features/styles/state";
import { authoringSourceSnapshotAtom } from "../src/features/edit-session/state";
import {
  PREVIEW_DEFAULTS,
  valuePreviewPresentation,
} from "../src/features/tokens/valuePreview";
import type { StyleRow } from "../src/features/styles/generation";
import type { ValuePreviewProps } from "../src/components/value-preview/ValuePreview";

function source(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}
function component<P>(
  path: string,
  name: string,
  bindings: Record<string, unknown> = {},
): React.ComponentType<P> {
  const file = source(path);
  const declaration = file.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert(declaration);
  const code = ts.transpileModule(
    `(${declaration.getText(file).replace(/^export\s+/, "")})`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  return runInNewContext(code, { React, ...bindings });
}
function styleObject(path: string, name: string) {
  const file = source(path);
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (node) => node.name.getText(file) === name,
    );
    if (
      declaration?.initializer &&
      ts.isCallExpression(declaration.initializer)
    )
      return runInNewContext(
        `(${declaration.initializer.arguments[0].getText(file)})`,
      ) as Record<string, unknown>;
  }
  throw new Error(`Missing shared style ${name}.`);
}

const rowPath = "components/PreviewListItem.tsx";
const rowStyles = styleObject(rowPath, "row");
assert.equal(rowStyles.gridColumnStart, 1);
assert.equal(rowStyles.gridColumnEnd, -1);
assert.equal(rowStyles.gridRowEnd, "span 2");
assert.equal(rowStyles.width, "full");
assert.equal(rowStyles.minWidth, 0);
assert.equal(rowStyles.gap, 8);
assert.equal(styleObject(rowPath, "insetStyles").padding, 8);
const Row = component<{
  label: string;
  preview: React.ReactNode;
  actions?: React.ReactNode;
  inset?: boolean;
}>(rowPath, "PreviewListItem", {
  row: "preview-row",
  insetStyles: "preview-inset",
  labelStyles: "preview-label",
  Text: ({
    children,
    UNSAFE_className,
    slot,
  }: {
    children: React.ReactNode;
    UNSAFE_className: string;
    slot: string;
  }) =>
    React.createElement(
      "span",
      { className: UNSAFE_className, slot },
      children,
    ),
});
const row = renderToStaticMarkup(
  React.createElement(Row, {
    label: "Body",
    preview: React.createElement("span", {}, "Ag"),
    actions: React.createElement("button", {}, "Delete"),
    inset: true,
  }),
);
assert.match(row, /preview-row preview-inset/);
assert.match(row, /slot="label"[^>]*>Body</);
assert.match(row, />Ag</);
assert.match(row, />Delete</);
assert.doesNotMatch(
  renderToStaticMarkup(
    React.createElement(Row, {
      label: "Scale",
      preview: React.createElement("span", {}, "Scale preview"),
    }),
  ),
  /preview-inset/,
  "Existing scale editors do not acquire extra padding.",
);
for (const path of [
  "panels/styles/StylesPanel.tsx",
  "panels/structures/StructureCard.tsx",
]) {
  const text = source(path).text;
  assert.match(text, /<PreviewListItem\s+inset/);
}
for (const path of [
  "panels/styles/StylesPanel.tsx",
  "panels/structures/StructuresPanel.tsx",
])
  assert.match(source(path).text, /UNSAFE_className="[^"]*\bpreviewList\b/);

const store = createStore();
const document = store.get(stylesDocumentAtom);
const body = document.recipes.find((recipe) => !recipe.options.length)!;
const componentStyle = document.recipes.find(
  (recipe) => recipe.options.length,
)!;
assert(body && componentStyle);
assert.equal(styleVariantLabel(body, []), "");
for (const property of componentStyle.options) {
  assert.equal(property.kind, "variant");
  if (property.kind !== "variant") continue;
  for (const option of property.options)
    assert.equal(styleVariantLabel(componentStyle, [option.id]), option.name);
}
const original = store.get(authoringSourceSnapshotAtom);
assert.equal(store.get(styleSampleTextAtom), "Ag");
store.set(styleSampleTextAtom, "Custom sample");
store.set(selectedStyleIdAtom, body.id);
store.set(selectedStyleIdAtom, componentStyle.id);
assert.equal(store.get(styleSampleTextAtom), "Custom sample");
assert.equal(
  store.get(authoringSourceSnapshotAtom),
  original,
  "Preview text and selections do not change authored data or publications.",
);
assert.equal(store.get(stylesDocumentAtom), document);
assert.equal(createStore().get(styleSampleTextAtom), "Ag");

const TextPreview = component<{
  sampleText?: string;
  style?: React.CSSProperties;
}>("components/value-preview/TextValuePreview.tsx", "TextValuePreview", {
  PREVIEW_DEFAULTS,
});
const ValuePreview = component<ValuePreviewProps>(
  "components/value-preview/ValuePreview.tsx",
  "ValuePreview",
  { valuePreviewPresentation, TextValuePreview: TextPreview },
);
const text = (sampleText?: string) =>
  renderToStaticMarkup(
    React.createElement(ValuePreview, {
      label: "Body",
      preview: { kind: "text-color", value: "#123456" },
      sampleText,
    }),
  );
assert.match(text(), />Ag</);
assert.doesNotMatch(text(), /valuePreviewSampleText/);
assert.match(text("Hello & <text>"), /Hello &amp; &lt;text&gt;/);
assert.match(text("Custom sample"), /valuePreviewSampleText/);
assert.doesNotMatch(text(""), />Ag</, "Clearing the field clears the sample.");
const Sample = component<{
  recipe: typeof body;
  rows: StyleRow[];
  label: string;
  surface: string;
  gamut: "srgb";
  sampleText: string;
  large?: boolean;
}>("components/styles/StyleSample.tsx", "StyleSample", {
  stylePreview,
  ValuePreview,
  useIconSample: () => ({ status: "idle" }),
});
const color: StyleRow = {
  conceptId: crypto.randomUUID(),
  recipeId: body.id,
  key: "color",
  name: "body-color",
  classification: {},
  property: "color",
  value: "#123456",
  unit: "",
  optionIds: [],
  context: {},
  modeKey: "[]",
  token: { uuid: crypto.randomUUID(), name: {}, value: "#123456" },
};
const thumbnail = renderToStaticMarkup(
  React.createElement(Sample, {
    recipe: body,
    rows: [color],
    label: "Body",
    surface: "#ffffff",
    gamut: "srgb",
    sampleText: "Custom sample",
  }),
);
assert.match(thumbnail, />Custom sample</);
assert.match(thumbnail, /valuePreviewCompact/);
const view = source("views/styles/StyleDesignView.tsx").text;
assert.match(view, /styleVariantLabel\(recipe, color\.optionIds\) &&/);
assert.doesNotMatch(view, /<figcaption>\{permutations \? color\.name : name\}/);
assert(
  view.indexOf('label="Sample text"') < view.indexOf("<DesignValueDisplay"),
);
assert.match(view, /onChange=\{setSampleText\}/);
for (const path of [
  "views/styles/StyleDesignView.tsx",
  "panels/styles/StylesPanel.tsx",
]) {
  const file = source(path);
  let samples = 0;
  function visit(node: ts.Node) {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(file) === "StyleSample"
    ) {
      samples++;
      assert(
        node.attributes.properties.some(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(file) === "sampleText" &&
            attribute.initializer?.getText(file) === "{sampleText}",
        ),
        `${path} passes the sample text to the preview, not the list row.`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert(samples > 0);
}
assert.match(
  readFileSync(
    new URL(
      "../src/components/value-preview/ValuePreview.css",
      import.meta.url,
    ),
    "utf8",
  ),
  /\.valuePreviewSampleText \.valuePreviewText\s*\{[^}]*width: auto;[^}]*height: auto;/,
  "Custom text is not constrained to the fixed Ag glyph box.",
);
console.log(
  "Shared list layout/names, variant-only captions, custom sample rendering and preview-only state passed.",
);
