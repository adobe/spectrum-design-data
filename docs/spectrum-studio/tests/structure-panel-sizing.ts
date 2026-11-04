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
    if (
      name === "StructureProperties" &&
      element.tagName.getText() === "Popover"
    ) {
      assert(size && ts.isStringLiteral(size));
      assert.equal(
        size.text,
        "S",
        "Registry confirmation uses a small popover.",
      );
      continue;
    }
    if (size && ts.isStringLiteral(size))
      assert(
        size.text !== "S" && size.text !== "XS",
        `${name}: ${element.tagName.getText()} must not use a small size.`,
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
    assert(size && ts.isStringLiteral(size));
    assert.equal(size.text, "M", `${name} opts into medium sizing.`);
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
console.log(
  "Structure panel sizing, placeholders and nested field forwarding passed.",
);
