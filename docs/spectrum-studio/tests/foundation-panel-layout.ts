// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { createStore } from "jotai";
import { typographyPanelTabAtom } from "../src/state/view/typographyView";

function parse(url: URL) {
  const file = ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const elements: ts.JsxElement[] = [];
  const owners: ts.JsxOpeningLikeElement[] = [];
  const variables = new Map<string, ts.Expression>();
  const objects: ts.ObjectLiteralExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) elements.push(node);
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === "FoundationModeSettings"
    )
      owners.push(node);
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    )
      variables.set(node.name.text, node.initializer);
    if (ts.isObjectLiteralExpression(node)) objects.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { file, elements, owners, variables, objects };
}

function attribute(node: ts.JsxOpeningLikeElement, name: string) {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )?.initializer;
}

function stringAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  const value = attribute(node, name);
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}

const page = parse(new URL("../src/pages/Foundations.tsx", import.meta.url));
const typography = parse(
  new URL(
    "../src/panels/foundations/FoundationsTypographyPanel.tsx",
    import.meta.url,
  ),
);
const typographyTabs = typography.elements
  .filter(
    (element) =>
      element.openingElement.tagName.getText(typography.file) === "Tab",
  )
  .map((element) => stringAttribute(element.openingElement, "id"));
assert.deepEqual(typographyTabs, [
  "fonts",
  "font-sizes",
  "line-heights",
  "iconography",
]);
assert.deepEqual(
  typography.elements
    .filter(
      (element) =>
        element.openingElement.tagName.getText(typography.file) ===
        "AccordionItem",
    )
    .map((element) => stringAttribute(element.openingElement, "id")),
  ["system-settings"],
);
const color = parse(
  new URL(
    "../src/panels/foundations/FoundationsColorPanel.tsx",
    import.meta.url,
  ),
);
const colorTabs = color.elements.find(
  (element) => element.openingElement.tagName.getText(color.file) === "Tabs",
)!;
const tabs = typography.elements.find(
  (element) =>
    element.openingElement.tagName.getText(typography.file) === "Tabs",
)!;
assert.equal(
  stringAttribute(tabs.openingElement, "density"),
  stringAttribute(colorTabs.openingElement, "density"),
);
assert.equal(
  stringAttribute(tabs.openingElement, "aria-label"),
  "Typography controls",
);
assert.deepEqual(
  typography.elements
    .filter(
      (element) =>
        element.openingElement.tagName.getText(typography.file) === "TabPanel",
    )
    .map((element) => stringAttribute(element.openingElement, "id")),
  typographyTabs,
);
assert.match(
  typography.variables.get("controls")!.getText(typography.file),
  /padding:\s*16/,
);
assert.match(
  typography.variables.get("tabPanelStyles")!.getText(typography.file),
  /marginTop:\s*16/,
);
const root = typography.elements.find(
  (element) =>
    stringAttribute(element.openingElement, "data-component") ===
    "FoundationsTypographyPanel",
)!;
assert(
  root.children.some(
    (child) =>
      ts.isJsxExpression(child) &&
      child.expression?.getText(typography.file) === "sections",
  ),
);
assert.equal(
  attribute(typography.owners[0], "after"),
  undefined,
  "Typography tabs must be siblings of, not children inside, the settings accordion.",
);
const selection = createStore();
assert.equal(selection.get(typographyPanelTabAtom), "fonts");
selection.set(typographyPanelTabAtom, "font-sizes");
assert.equal(selection.get(typographyPanelTabAtom), "font-sizes");
selection.set(typographyPanelTabAtom, "line-heights");
assert.equal(selection.get(typographyPanelTabAtom), "line-heights");
const fonts = typography.elements.find(
  (element) =>
    element.openingElement.tagName.getText(typography.file) === "TabPanel" &&
    stringAttribute(element.openingElement, "id") === "fonts",
)!;
assert.match(fonts.getText(typography.file), /aria-label="Add font"/);
assert.match(fonts.getText(typography.file), /className=\{tabActions\}/);
assert.match(fonts.getText(typography.file), /className=\{tabStack\}/);
assert.match(typography.file.text, /foundationCardStyles/);
assert.match(typography.file.text, /label="Font family"/);
const directory = new URL("../src/panels/foundations/", import.meta.url);
let checked = 0;
for (const name of readdirSync(directory).filter((file) =>
  /^Foundations.+Panel\.tsx$/.test(file),
)) {
  const source = parse(new URL(name, directory));
  const settings = source.elements.filter(
    (element) =>
      element.openingElement.tagName.getText(source.file) === "AccordionItem" &&
      stringAttribute(element.openingElement, "id") === "system-settings",
  );
  for (const setting of settings) {
    const owner = source.owners.find((candidate) => {
      const before = attribute(candidate, "before");
      if (!before || !ts.isJsxExpression(before) || !before.expression)
        return false;
      let expression = before.expression;
      if (ts.isIdentifier(expression)) {
        const initializer = source.variables.get(expression.text);
        if (!initializer) return false;
        expression = initializer;
      }
      while (ts.isParenthesizedExpression(expression))
        expression = expression.expression;
      return expression === setting;
    });
    assert.ok(
      owner,
      `${name}: System settings must be a direct FoundationModeSettings.before item.`,
    );
    const foundation = stringAttribute(owner, "foundation");
    const tab = page.objects.find((object) =>
      object.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(page.file) === "id" &&
          ts.isStringLiteral(property.initializer) &&
          property.initializer.text === foundation,
      ),
    );
    assert.ok(tab, `${name}: its foundation tab must exist.`);
    const content = tab.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) &&
        property.name.getText(page.file) === "content",
    );
    assert.ok(
      content && ts.isJsxSelfClosingElement(content.initializer),
      `${name}: its tab must not add another FoundationModeSettings wrapper.`,
    );
    assert.equal(
      content.initializer.tagName.getText(page.file),
      name.replace(".tsx", ""),
    );
    checked += 1;
  }
}
assert.ok(
  checked >= 4,
  "Size, Opacity, Typography and Elevation must use the shared settings layout.",
);

const shared = parse(
  new URL(
    "../src/panels/foundations/FoundationModeSettings.tsx",
    import.meta.url,
  ),
);
const accordion = shared.elements.find(
  (element) =>
    element.openingElement.tagName.getText(shared.file) === "Accordion",
)!;
assert.equal(stringAttribute(accordion.openingElement, "size"), "M");
assert.equal(stringAttribute(accordion.openingElement, "density"), "spacious");
const beforeIndex = accordion.children.findIndex(
  (child) =>
    ts.isJsxExpression(child) &&
    child.expression?.getText(shared.file) === "before",
);
const modesIndex = accordion.children.findIndex(
  (child) =>
    ts.isJsxElement(child) &&
    stringAttribute(child.openingElement, "id") === "mode-sets",
);
assert.ok(
  beforeIndex >= 0 && modesIndex > beforeIndex,
  "System settings must precede Mode sets in the same top-level accordion.",
);
console.log(
  `Foundation panels: ${checked} System settings sections use the shared top-level layout.`,
);
