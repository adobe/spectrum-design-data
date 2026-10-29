// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import {
  categoryIconConfiguration as config,
  registeredCategoryKeys,
  resolveCategoryIcon,
  validateCategoryIcons,
  createCategoryIconReporter,
} from "../src/features/icons/categoryIcons";

assert.deepEqual(validateCategoryIcons(config), []);
assert.deepEqual(resolveCategoryIcon("opacity"), {
  iconName: "ViewTransparency",
});
assert.deepEqual(resolveCategoryIcon("source.opacity"), {
  iconName: "ViewTransparency",
});
for (const [category, iconName] of Object.entries(config.categories)) {
  assert.deepEqual(resolveCategoryIcon(category), { iconName });
  assert.deepEqual(resolveCategoryIcon(` ${category.toUpperCase()} `), {
    iconName,
  });
}
for (const [alias, target] of Object.entries(config.aliases)) {
  assert.deepEqual(resolveCategoryIcon(alias), resolveCategoryIcon(target));
}
assert.equal(
  new Set(registeredCategoryKeys).size,
  registeredCategoryKeys.length,
);

const changed = {
  ...config,
  categories: { ...config.categories, color: "Star", foundations: "Circle" },
};
for (const category of [
  "color",
  "colors",
  "source.palette-color",
  "source.settings",
]) {
  assert.deepEqual(
    resolveCategoryIcon(category, changed),
    { iconName: "Star" },
    "One edit updates canonical and aliased consumers.",
  );
}
assert.deepEqual(resolveCategoryIcon("foundations", changed), {
  iconName: "Circle",
});
assert.deepEqual(
  resolveCategoryIcon("source.rule"),
  resolveCategoryIcon("logic"),
);
assert.deepEqual(
  resolveCategoryIcon("source.compatibility-alias"),
  resolveCategoryIcon("tokens"),
);
assert.deepEqual(
  resolveCategoryIcon("source.platform"),
  resolveCategoryIcon("platforms"),
);
assert.deepEqual(
  resolveCategoryIcon("source.adaptive-claim"),
  resolveCategoryIcon("modes"),
);
assert.deepEqual(
  resolveCategoryIcon("source.mode-attachment"),
  resolveCategoryIcon("modes"),
);

for (const category of [
  "unknown",
  "red-color-100",
  "all",
  "view.grid",
  "adaptive-controls",
]) {
  const result = resolveCategoryIcon(category);
  assert.equal(result.iconName, "Circle");
  assert.match(result.issue!, /missing association/);
}
assert.ok(
  validateCategoryIcons({
    ...config,
    categories: { ...config.categories, COLOR: "Star" },
  }).some((issue) => issue.includes("Duplicate")),
);
assert.match(
  resolveCategoryIcon("color", {
    ...config,
    categories: { ...config.categories, COLOR: "Star" },
  }).issue!,
  /ambiguous/,
);
assert.ok(
  validateCategoryIcons({
    ...config,
    aliases: { ...config.aliases, tokens: "color" },
  }).some((issue) => issue.includes("Duplicate")),
);
const chain = { ...config, aliases: { ...config.aliases, another: "colors" } };
assert.ok(
  validateCategoryIcons(chain).some((issue) => issue.includes("canonical")),
);
assert.match(resolveCategoryIcon("another", chain).issue!, /invalid target/);
const cycle = { ...config, aliases: { first: "second", second: "first" } };
assert.equal(validateCategoryIcons(cycle).length, 2);
assert.match(resolveCategoryIcon("first", cycle).issue!, /invalid target/);
const invalid = {
  ...config,
  categories: { ...config.categories, color: "NotAnInstalledIcon" },
};
assert.ok(
  validateCategoryIcons(invalid).some((issue) =>
    issue.includes("Unsupported icon"),
  ),
);
assert.equal(resolveCategoryIcon("colors", invalid).iconName, "Circle");
assert.match(resolveCategoryIcon("colors", invalid).issue!, /unsupported icon/);
assert.ok(validateCategoryIcons({ ...config, fallbackIcon: "Missing" }).length);
assert.match(
  resolveCategoryIcon("tokens", { ...config, fallbackIcon: "Missing" }).issue!,
  /fallback icon/,
);
assert.ok(
  validateCategoryIcons({
    ...config,
    categories: { ...config.categories, " ": "Circle" },
  }).length,
);
const messages: string[] = [];
const report = createCategoryIconReporter((message) => messages.push(message));
report("Missing category");
report("Missing category");
report("Invalid icon");
assert.deepEqual(
  messages,
  ["Missing category", "Invalid icon"],
  "Diagnostics are explicit and deduplicated.",
);

const sourceRoot = new URL("../src/", import.meta.url);
let checked = 0;
for (const file of readdirSync(sourceRoot, { recursive: true })) {
  if (
    typeof file !== "string" ||
    !/\.(ts|tsx)$/.test(file) ||
    file.includes(".stories.")
  )
    continue;
  const content = readFileSync(new URL(file, sourceRoot), "utf8");
  if (!content.includes("CategoryIcon")) continue;
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function check(category: string) {
    assert.equal(
      resolveCategoryIcon(category).issue,
      undefined,
      `${file}: missing category ${category}`,
    );
    checked++;
  }
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "getCategoryIcon" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      check(node.arguments[0].text);
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(source) === "CategoryIcon"
    ) {
      const category = node.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText(source) === "category",
      );
      if (
        category &&
        ts.isJsxAttribute(category) &&
        category.initializer &&
        ts.isStringLiteral(category.initializer)
      )
        check(category.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
assert.ok(checked >= 60, "Cover all migrated static category assignments.");
const unchanged = [
  ["src/components/AdaptiveControlsMenu.tsx", /<UserSettings \/>/],
  ["src/components/TopBar.tsx", /<Saturation \/>/],
  ["src/views/tokens/TokenBrowserView.tsx", /<AppsAll \/>.*<Text>All<\/Text>/],
  ["src/views/tokens/TokenBrowserView.tsx", /<ViewGrid \/>/],
  ["src/views/tokens/TokenBrowserView.tsx", /<ViewList \/>/],
  ["src/components/fields/DividableComboBox.tsx", /<ViewGrid \/>/],
  ["src/features/modes/icons.ts", /createElement\(Moon\)/],
  ["src/views/structures/StructureElementPreview.tsx", /useIconSample\(name\)/],
  ["src/views/SampleApp.tsx", /<AppsAll \/>/],
] as const;
for (const [path, pattern] of unchanged)
  assert.match(
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
    pattern,
  );
console.log(
  `Category icons: ${registeredCategoryKeys.length} associations, ${checked} static consumers, aliases, validation, diagnostics, Circle fallback and exclusions passed.`,
);
