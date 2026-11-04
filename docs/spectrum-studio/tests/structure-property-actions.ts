// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  createBooleanProperty,
  createLocalVariantProperty,
  type OptionProperty,
} from "../src/features/option-groups/model";
import {
  emptyStructureEditor,
  type StructureEditorData,
} from "../src/features/structures/variants";
import {
  makeVariantOptionDefault,
  removeBooleanProperty,
  removeVariantOption,
} from "../src/features/structures/variantOperations";

const source = ts.createSourceFile(
  "StructureProperties.tsx",
  readFileSync(
    new URL(
      "../src/panels/structures/StructureProperties.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const menus: ts.JsxElement[] = [];
function visit(node: ts.Node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(source) === "Menu"
  )
    menus.push(node);
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(menus.length, 2, "Keep the header menu and one row menu.");
const menu = menus[1];
function attribute(name: string) {
  return menu.openingElement.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(source) === name,
  )?.initializer;
}
const handler = attribute("onAction");
assert(handler && ts.isJsxExpression(handler) && handler.expression);
const handlerCode = ts.transpileModule(
  `(${handler.expression.getText(source)})`,
  { compilerOptions: { target: ts.ScriptTarget.ESNext } },
).outputText;
const disabled = attribute("disabledKeys");
assert(disabled && ts.isJsxExpression(disabled) && disabled.expression);
const disabledCode = disabled.expression.getText(source);
assert.deepEqual(
  Array.from(runInNewContext(disabledCode, { deletingDefault: true })),
  ["delete"],
);
assert.deepEqual(
  Array.from(runInNewContext(disabledCode, { deletingDefault: false })),
  [],
);
assert(ts.isJsxElement(menu.parent));
const trigger = menu.parent;
assert.equal(trigger.openingElement.tagName.getText(source), "MenuTrigger");
assert.equal(
  trigger.children.filter(
    (child) =>
      ts.isJsxElement(child) &&
      child.openingElement.tagName.getText(source) === "ActionButton",
  ).length,
  1,
  "One More button replaces the three row action buttons.",
);
assert(ts.isParenthesizedExpression(trigger.parent));
const condition = trigger.parent.parent;
assert(ts.isBinaryExpression(condition));
assert.equal(condition.left.getText(source), "!isReadOnly && !editingName");
assert.equal(
  condition.operatorToken.kind,
  ts.SyntaxKind.AmpersandAmpersandToken,
);
for (const id of ["add", "default", "edit", "delete"])
  assert.match(menu.getText(source), new RegExp(`<MenuItem\\s+id="${id}"`));

const variant = createLocalVariantProperty("Placement");
const boolean = createBooleanProperty("Has icon");
function harness(
  property: OptionProperty,
  optionIndex = 1,
  acceptsChange = true,
) {
  const editor: StructureEditorData = {
    ...emptyStructureEditor(),
    properties: [variant, boolean],
    visibilityBindings: {
      icon: { propertyId: boolean.id, inverted: false },
    },
  };
  const changes: StructureEditorData[] = [];
  const selections: string[] = [];
  const edits: string[] = [];
  const setups: string[] = [];
  const errors: unknown[] = [];
  const selected =
    property.kind === "variant" ? property.options[optionIndex] : undefined;
  const action: (key: string) => void = runInNewContext(handlerCode, {
    property,
    selected,
    editor,
    deletingDefault:
      property.kind === "variant" && selected?.id === property.defaultOptionId,
    change: (next: StructureEditorData) => {
      changes.push(next);
      return acceptsChange;
    },
    select: (_property: OptionProperty, id: string) => selections.push(id),
    setEditing: (id: string) => edits.push(id),
    setSetup: (kind: string) => setups.push(kind),
    report: (error: unknown) => errors.push(error),
    makeVariantOptionDefault,
    removeBooleanProperty,
    removeVariantOption,
  });
  return { action, changes, selections, edits, setups, errors };
}
for (const property of [variant, boolean]) {
  const edited = harness(property);
  edited.action("edit");
  assert.deepEqual(edited.edits, [property.id]);
  assert.equal(edited.changes.length, 0, "Opening an editor does not save.");
}
const added = harness(variant);
added.action("add");
assert.deepEqual(added.selections, [variant.options[1].id]);
assert.deepEqual(added.setups, ["option"]);
assert.equal(added.changes.length, 0);

const madeDefault = harness(variant);
madeDefault.action("default");
assert.equal(
  madeDefault.changes[0].properties[0].kind === "variant" &&
    madeDefault.changes[0].properties[0].defaultOptionId,
  variant.options[1].id,
);

const removedOption = harness(variant);
removedOption.action("delete");
assert.equal(
  removedOption.changes[0].properties[0].kind === "variant" &&
    removedOption.changes[0].properties[0].options.length,
  1,
);
assert.deepEqual(removedOption.selections, [variant.defaultOptionId]);
const protectedOption = harness(variant, 0);
protectedOption.action("delete");
assert.equal(protectedOption.changes.length, 0);
assert.equal(protectedOption.errors.length, 0);

const removedBoolean = harness(boolean);
removedBoolean.action("delete");
assert.deepEqual(removedBoolean.changes[0].properties, [variant]);
assert.deepEqual(removedBoolean.changes[0].visibilityBindings, {});
assert.deepEqual(removedBoolean.selections, []);

const rejected = harness(variant, 1, false);
rejected.action("delete");
assert.deepEqual(rejected.selections, [], "Do not switch after a failed edit.");
const invalid = harness(variant, 99);
invalid.action("delete");
assert.equal(invalid.errors.length, 1, "Report action errors.");
assert.equal(invalid.changes.length, 0);

console.log(
  "Structure More menu actions, read-only gate and default protection passed.",
);
