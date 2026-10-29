// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const iconSource = readFileSync(
  new URL("../src/assets/svgs/PaddingIcons.tsx", import.meta.url),
  "utf8",
);
const source = ts.createSourceFile(
  "PaddingIcons.tsx",
  iconSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const declarations = source.statements.flatMap((statement) =>
  ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations]
    : [],
);
const expectedInnerPaths = {
  IconPaddingAll:
    "M11.774 14H6.025C4.90879 14 4 13.0912 4 11.975V6.025C4 4.90879 4.90879 4 6.025 4H11.774C12.8902 4 13.799 4.90879 13.799 6.025V11.975C13.799 13.0912 12.8902 14 11.774 14ZM6.025 5.35C5.65322 5.35 5.35 5.65322 5.35 6.025V11.975C5.35 12.3468 5.65322 12.65 6.025 12.65H11.774C12.1458 12.65 12.449 12.3468 12.449 11.975V6.025C12.449 5.65322 12.1458 5.35 11.774 5.35H6.025Z",
  IconPaddingTop:
    "M4 6.375V6.025C4 4.90879 4.90879 4 6.025 4H11.975C13.0912 4 14 4.90879 14 6.025V6.375C14 7.49121 13.0912 8.4 11.975 8.4H6.025C4.90879 8.4 4 7.49121 4 6.375ZM12.65 6.025C12.65 5.65322 12.3468 5.35 11.975 5.35H6.025C5.65322 5.35 5.35 5.65322 5.35 6.025V6.375C5.35 6.74678 5.65322 7.05 6.025 7.05H11.975C12.3468 7.05 12.65 6.74678 12.65 6.375V6.025Z",
  IconPaddingBottom:
    "M4 11.625V11.975C4 13.0912 4.90879 14 6.025 14H11.975C13.0912 14 14 13.0912 14 11.975V11.625C14 10.5088 13.0912 9.6 11.975 9.6H6.025C4.90879 9.6 4 10.5088 4 11.625ZM12.65 11.975C12.65 12.3468 12.3468 12.65 11.975 12.65H6.025C5.65322 12.65 5.35 12.3468 5.35 11.975V11.625C5.35 11.2532 5.65322 10.95 6.025 10.95H11.975C12.3468 10.95 12.65 11.2532 12.65 11.625V11.975Z",
  IconPaddingLeft:
    "M6.375 14H6.025C4.90879 14 4 13.0912 4 11.975V6.025C4 4.90879 4.90879 4 6.025 4H6.375C7.49121 4 8.4 4.90879 8.4 6.025V11.975C8.4 13.0912 7.49121 14 6.375 14ZM6.025 5.35C5.65322 5.35 5.35 5.65322 5.35 6.025V11.975C5.35 12.3468 5.65322 12.65 6.025 12.65H6.375C6.74678 12.65 7.05 12.3468 7.05 11.975V6.025C7.05 5.65322 6.74678 5.35 6.375 5.35H6.025Z",
  IconPaddingRight:
    "M11.625 14H11.975C13.0912 14 14 13.0912 14 11.975V6.025C14 4.90879 13.0912 4 11.975 4H11.625C10.5088 4 9.6 4.90879 9.6 6.025V11.975C9.6 13.0912 10.5088 14 11.625 14ZM11.975 5.35C12.3468 5.35 12.65 5.65322 12.65 6.025V11.975C12.65 12.3468 12.3468 12.65 11.975 12.65H11.625C11.2532 12.65 10.95 12.3468 10.95 11.975V6.025C10.95 5.65322 11.2532 5.35 11.625 5.35H11.975Z",
};
function attribute(attributes: ts.JsxAttributes, name: string) {
  const match = attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText(source) === name,
  );
  assert(
    match &&
      ts.isJsxAttribute(match) &&
      match.initializer &&
      ts.isStringLiteral(match.initializer),
    `Keep the ${name} SVG attribute.`,
  );
  return match.initializer.text;
}
assert.match(iconSource, /import \{ createIcon \} from "@react-spectrum\/s2";/);
assert.equal(declarations.length, 5);
for (const [name, expectedPath] of Object.entries(expectedInnerPaths)) {
  const icon = declarations.find(
    (declaration) =>
      ts.isIdentifier(declaration.name) && declaration.name.text === name,
  )?.initializer;
  assert(
    icon &&
      ts.isCallExpression(icon) &&
      ts.isIdentifier(icon.expression) &&
      icon.expression.text === "createIcon",
    `${name} uses native S2 icon sizing, color and accessibility.`,
  );
  const render = icon.arguments[0];
  assert(
    ts.isArrowFunction(render) &&
      ts.isParenthesizedExpression(render.body) &&
      ts.isJsxElement(render.body.expression),
  );
  const svg = render.body.expression;
  assert.equal(svg.openingElement.tagName.getText(source), "svg");
  assert.equal(
    attribute(svg.openingElement.attributes, "viewBox"),
    "0 0 18 18",
  );
  assert.equal(attribute(svg.openingElement.attributes, "width"), "18");
  assert.equal(attribute(svg.openingElement.attributes, "height"), "18");
  assert.equal(
    attribute(svg.openingElement.attributes, "fill"),
    "var(--iconPrimary, currentColor)",
  );
  assert(
    svg.openingElement.attributes.properties.some(
      (property) =>
        ts.isJsxSpreadAttribute(property) &&
        property.expression.getText(source) === "props",
    ),
    "Forward S2's styles and decorative accessibility props.",
  );
  const paths = svg.children.filter(ts.isJsxSelfClosingElement);
  assert.equal(paths.length, 2);
  assert(paths.every((path) => path.tagName.getText(source) === "path"));
  assert.equal(
    attribute(paths[1].attributes, "d"),
    expectedPath,
    `${name} preserves the supplied directional artwork.`,
  );
  assert(
    paths.every(
      (path) =>
        !path.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(source) === "fill",
        ),
    ),
    "Paths inherit Spectrum color instead of fixed light-theme fills.",
  );
}
const panel = readFileSync(
  new URL("../src/panels/structures/StructureEditorPanel.tsx", import.meta.url),
  "utf8",
);
assert.match(panel, /label="Padding" prefix=\{<IconPaddingAll \/>\}/);
for (const side of ["Top", "Right", "Bottom", "Left"]) {
  assert.match(
    panel,
    new RegExp(`label: "${side} padding", prefix: <IconPadding${side} />`),
    `${side} padding uses its matching icon.`,
  );
}
assert.doesNotMatch(panel, /RectangleHoriz/);
console.log(
  "Padding icons: supplied artwork, native Spectrum wrapper/color and all five field mappings passed.",
);
