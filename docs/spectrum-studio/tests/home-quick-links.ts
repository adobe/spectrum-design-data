// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const homeUrl = new URL("../src/views/home/Home.tsx", import.meta.url);
const home = readFileSync(homeUrl, "utf8");
const source = ts.createSourceFile(
  "Home.tsx",
  home,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const imports = new Map<string, string>();
const links: ts.JsxElement[] = [];
for (const statement of source.statements) {
  if (
    ts.isImportDeclaration(statement) &&
    statement.importClause?.name &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    imports.set(
      statement.importClause.name.text,
      statement.moduleSpecifier.text,
    );
  }
}
function attribute(attributes: ts.JsxAttributes, name: string) {
  return attributes.properties.find(
    (item): item is ts.JsxAttribute =>
      ts.isJsxAttribute(item) && item.name.getText(source) === name,
  )?.initializer;
}
function textAttribute(attributes: ts.JsxAttributes, name: string) {
  const value = attribute(attributes, name);
  assert(
    value && ts.isStringLiteral(value),
    `Expected a literal ${name} attribute.`,
  );
  return value.text;
}
function visit(node: ts.Node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(source) === "RouterLink" &&
    textAttribute(node.openingElement.attributes, "className") ===
      "homeQuickLink"
  ) {
    links.push(node);
  }
  ts.forEachChild(node, visit);
}
visit(source);
const expected = [
  ["tokens", "Tokens", "Channel"],
  ["foundations", "Foundations", "Shapes"],
  ["components", "Components", "Briefcase"],
  ["system-health", "System health", "SpeedFast"],
];
assert.equal(links.length, expected.length);
for (const [index, [slug, label, illustration]] of expected.entries()) {
  const link = links[index];
  assert.equal(
    textAttribute(link.openingElement.attributes, "href"),
    `#${slug}`,
  );
  assert.match(
    link.getText(source),
    new RegExp(`<h3>${label}\\s*</h3>`),
    "Keep the existing visible link label.",
  );
  const images = link.children.filter(ts.isJsxSelfClosingElement);
  assert.equal(images.length, 1);
  const image = images[0];
  assert.equal(image.tagName.getText(source), illustration);
  assert.equal(
    imports.get(illustration),
    `@react-spectrum/s2/illustrations/gradient/generic1/${illustration}`,
  );
  assert.equal(
    attribute(image.attributes, "size"),
    undefined,
    "Keep Spectrum's default medium size without unsupported props.",
  );
  assert.equal(
    attribute(image.attributes, "aria-label"),
    undefined,
    "Let Spectrum hide decorative illustrations from assistive technology.",
  );
}
assert.doesNotMatch(home, /quick-link-.*\.svg|homeQuickLinkIcon/);
assert.match(
  home,
  /import \{ Link as RouterLink, RouterProvider \} from "react-aria-components"/,
);
assert.match(home, /const setActivePage = useSetAtom\(activePageAtom\)/);
assert.match(
  home,
  /<RouterProvider navigate=\{\(href\) => setActivePage\(href\.slice\(1\)\)\}>/,
);
console.log(
  "Home quick links: native illustrations, link labels and sidebar-compatible routing passed.",
);
