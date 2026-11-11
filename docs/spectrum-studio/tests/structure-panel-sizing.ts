// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function elements(path: string) {
  const source = ts.createSourceFile(
    path,
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const result: (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function sizeAttribute(
  element: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
) {
  return element.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText() === "size",
  )?.initializer;
}

const panelControlSize = /const CONTROL_SIZE = "([A-Z]+)"/.exec(
  readFileSync(
    new URL(
      "../src/panels/structures/StructureAppearanceControls.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
)?.[1];
assert.equal(panelControlSize, "S", "Appearance controls use small sizing.");

// Dialogs keep their own sizes, and tree rows are scaled down with CSS zoom.
const exempt: Record<string, readonly string[]> = {
  StructureLayers: [
    "SpectrumDialog",
    "Button",
    "ActionButtonGroup",
    "ActionButton",
  ],
  StructureRuleDialog: ["*"],
};
for (const name of [
  "StructureMetadataPanel",
  "StructureGenerationControls",
  "StructureLayers",
  "StructureProperties",
  "StructureEditorPanel",
  "StructureElementEditorPanel",
  "StructureAppearanceControls",
  "StructureRuleDialog",
]) {
  for (const element of elements(`panels/structures/${name}.tsx`)) {
    const size = sizeAttribute(element);
    const tag = element.tagName.getText();
    if (exempt[name]?.includes("*") || exempt[name]?.includes(tag)) continue;
    if (size && ts.isStringLiteral(size))
      assert.equal(size.text, "S", `${name}: ${tag} must use small sizing.`);
    if (size && ts.isJsxExpression(size))
      assert.equal(
        size.expression?.getText(),
        "CONTROL_SIZE",
        `${name}: ${tag} must use the shared small control size.`,
      );
  }
}

const appearance = elements(
  "panels/structures/StructureAppearanceControls.tsx",
);
for (const name of ["TokenComboBox", "DividableComboBox"]) {
  const controls = appearance.filter(
    (element) => element.tagName.getText() === name,
  );
  assert(controls.length > 0, `Check the ${name} appearance fields.`);
  for (const control of controls) {
    const size = sizeAttribute(control);
    assert(size && ts.isJsxExpression(size));
    assert.equal(
      size.expression?.getText(),
      "CONTROL_SIZE",
      `${name} opts into small sizing.`,
    );
    const placeholder = control.attributes.properties.find(
      (attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) &&
        attribute.name.getText() === "placeholder",
    )?.initializer;
    assert(placeholder && ts.isStringLiteral(placeholder));
    assert.equal(placeholder.text, "Undefined");
  }
}

for (const [path, name, expected, count] of [
  ["fields/TokenComboBox.tsx", "ComboBox", "size", 1],
  ["fields/TokenComboBox.tsx", "ActionButton", 'size ?? "S"', 1],
  ["fields/DividableComboBox.tsx", "TokenComboBox", "size", 2],
  ["fields/DividableComboBox.tsx", "ToggleButton", "size", 1],
] as const) {
  const controls = elements(`components/${path}`).filter(
    (element) =>
      element.tagName.getText() === name &&
      (name !== "ActionButton" ||
        element.attributes.properties.some(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText() === "aria-label" &&
            attribute.initializer?.getText().includes("Clear "),
        )),
  );
  assert.equal(controls.length, count);
  for (const control of controls) {
    const size = sizeAttribute(control);
    assert(size && ts.isJsxExpression(size));
    assert.equal(
      size.expression?.getText(),
      expected,
      `${path} forwards size to ${name} without changing other views' defaults.`,
    );
  }
}

for (const control of elements(
  "components/fields/DividableComboBox.tsx",
).filter((element) => element.tagName.getText() === "TokenComboBox")) {
  const placeholder = control.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText() === "placeholder",
  )?.initializer;
  assert(placeholder && ts.isJsxExpression(placeholder));
  assert.equal(placeholder.expression?.getText(), "placeholder");
}
const combo = elements("components/fields/TokenComboBox.tsx").find(
  (element) => element.tagName.getText() === "ComboBox",
);
assert(combo);
const placeholder = combo.attributes.properties.find(
  (attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === "placeholder",
)?.initializer;
assert(
  placeholder && ts.isJsxExpression(placeholder) && placeholder.expression,
);
const expression = placeholder.expression.getText();
for (const customValue of [undefined, { displayValue: "" }]) {
  const context = {
    customValue,
    isMixed: false,
    selectedKey: null,
    selected: undefined,
  };
  assert.equal(
    runInNewContext(expression, { ...context, placeholder: "Undefined" }),
    "Undefined",
  );
  assert.equal(
    runInNewContext(expression, { ...context, placeholder: undefined }),
    customValue ? "Enter a value or choose a token" : "Choose a token",
    "Other views retain their placeholders.",
  );
  assert.equal(
    runInNewContext(expression, {
      ...context,
      placeholder: "Undefined",
      isMixed: true,
    }),
    "Mixed",
  );
  assert.equal(
    runInNewContext(expression, {
      ...context,
      placeholder: "Undefined",
      selectedKey: "missing",
    }),
    "Unavailable token",
  );
}
const library = readFileSync(
  new URL("../src/panels/structures/StructureCard.tsx", import.meta.url),
  "utf8",
);
const thumbnail = readFileSync(
  new URL("../src/views/structures/StructureThumbnail.tsx", import.meta.url),
  "utf8",
);
assert.match(
  library,
  /import "\.\/StructureCard\.css";/,
  "Library row styles load with the sidebar, even without a selected Structure.",
);
assert.match(
  thumbnail,
  /import "\.\/StructureThumbnail\.css";/,
  "Thumbnail sizing loads with each thumbnail, not the selected editor.",
);
assert.match(
  thumbnail,
  /preview=\{EMPTY_STRUCTURE_PREVIEW\}/,
  "Thumbnails explicitly select the authored default variation.",
);
assert.match(
  thumbnail,
  /previewSelections=\{\{\}\}/,
  "Thumbnails exclude temporary root and owned-layout selections.",
);
const optionSample = readFileSync(
  new URL("../src/views/structures/StructureOptionSample.tsx", import.meta.url),
  "utf8",
);
assert.match(
  optionSample,
  /previewSelections \?\? previews/,
  "An isolated sample's selections take precedence over editor selections.",
);
const libraryStyles = readFileSync(
  new URL("../src/panels/structures/StructureCard.css", import.meta.url),
  "utf8",
);
const thumbnailStyles = readFileSync(
  new URL("../src/views/structures/StructureThumbnail.css", import.meta.url),
  "utf8",
);
const card = /\.structureListCard\s*\{([^}]+)\}/.exec(libraryStyles)?.[1];
assert(card, "Library cards retain their own row layout.");
assert.match(card, /grid-column:\s*1\s*\/\s*-1;/);
assert.match(card, /grid-row:\s*1\s*\/\s*span 2;/);
const viewport = /\.structureThumbnail\s*\{([^}]+)\}/.exec(
  thumbnailStyles,
)?.[1];
assert(viewport, "Each thumbnail has a bounded viewport.");
assert.match(viewport, /width:\s*80px;/);
assert.match(viewport, /height:\s*40px;/);
assert.match(viewport, /overflow:\s*hidden;/);
assert.match(viewport, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
assert.match(
  viewport,
  /grid-template-rows:\s*minmax\(0,\s*1fr\);/,
  "Oversized natural samples stay centered in the viewport, not expanded tracks.",
);
const canvasStyles = readFileSync(
  new URL("../src/views/structures/StructureDesignView.css", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  canvasStyles,
  /\.structureListCard\b|\.structuresList\b|\.structureThumbnail(?:Natural)?\b/,
  "Sidebar geometry and appearance do not depend on the canvas stylesheet.",
);

console.log(
  "Structure panel sizing, placeholders, field forwarding and selection-independent library styles passed.",
);
