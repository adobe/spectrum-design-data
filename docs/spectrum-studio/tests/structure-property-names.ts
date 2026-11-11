// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createLocalVariantProperty } from "../src/features/option-groups/model";
import {
  renameVariantOption,
  renameVariantProperty,
  variantNameTermRequest,
} from "../src/features/structures/variantOperations";
import { emptyStructureEditor } from "../src/features/structures/variants";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";

const categoryId = crypto.randomUUID();
const termId = crypto.randomUUID();
const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [
    {
      id: categoryId,
      key: "placement",
      name: "Placement",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures"],
      required: false,
      includeInProjections: true,
    },
  ],
  terms: [{ id: termId, categoryId, value: "start", description: "" }],
  order: [categoryId],
  classifications: {},
};
const property = createLocalVariantProperty("Start");
property.classification = { [categoryId]: termId };
property.options[0].classification = { [categoryId]: termId };
const editor = { ...emptyStructureEditor(), properties: [property] };
const before = structuredClone({ editor, taxonomy });

for (const optionId of [undefined, property.options[0].id]) {
  assert.equal(
    variantNameTermRequest(editor, property.id, optionId, " START ", taxonomy),
    null,
    "An existing term is reused, including whitespace and case normalization.",
  );
  assert.deepEqual(
    variantNameTermRequest(editor, property.id, optionId, " End ", taxonomy),
    { categoryId, name: "End" },
    "A new term is a confirmation request, not a validation error.",
  );
  assert.throws(
    () => variantNameTermRequest(editor, property.id, optionId, " ", taxonomy),
    /name/,
  );
}
assert.deepEqual(
  variantNameTermRequest(
    editor,
    property.id,
    property.options[1].id,
    "Local name",
    taxonomy,
  )?.entries,
  ["Category: Start", "Option: Default", "Option: Local name"],
  "Saving a local name requests Registry references instead of retaining a preview-only label.",
);
const local = createLocalVariantProperty("Local");
assert.deepEqual(
  variantNameTermRequest(
    { ...editor, properties: [local] },
    local.id,
    undefined,
    "Renamed",
    taxonomy,
  )?.entries,
  ["Category: Renamed", "Option: Default", "Option: Option 2"],
);
assert.throws(
  () => variantNameTermRequest(editor, property.id, "missing", "End", taxonomy),
  /unavailable/,
);
const ordered = {
  ...property,
  classification: { [categoryId]: [termId] },
};
assert.throws(
  () =>
    variantNameTermRequest(
      { ...editor, properties: [ordered] },
      property.id,
      undefined,
      "End",
      taxonomy,
    ),
  /ordered terms/,
);
assert.deepEqual(
  { editor, taxonomy },
  before,
  "Preparing a rename never saves.",
);

const source = ts.createSourceFile(
  "StructureProperties.tsx",
  readFileSync(
    new URL("../src/panels/design/DesignProperties.tsx", import.meta.url),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const component = source.statements.find(
  (statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "VariantNameEditor",
);
assert(component?.body);
const save = component.body.statements
  .flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations]
      : [],
  )
  .find(
    (declaration) => declaration.name.getText(source) === "save",
  )?.initializer;
assert(save);
const code = ts.transpileModule(`(${save.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ESNext },
}).outputText;

for (const optionId of [undefined, property.options[0].id]) {
  const requests: ReturnType<typeof variantNameTermRequest>[] = [];
  const errors: string[] = [];
  const commits: ReturnType<typeof renameVariantProperty>[] = [];
  const action: (createTerm?: boolean) => void = runInNewContext(code, {
    namingScope: "structures",
    editor,
    propertyId: property.id,
    optionId,
    name: "End",
    taxonomy,
    variantNameTermRequest,
    renameVariantProperty,
    renameVariantOption,
    setTermRequest: (request: ReturnType<typeof variantNameTermRequest>) =>
      requests.push(request),
    setError: (message: string) => errors.push(message),
    onCommit: (nextEditor: typeof editor, nextTaxonomy: TaxonomyDocument) =>
      commits.push({ editor: nextEditor, taxonomy: nextTaxonomy }),
  });
  action();
  assert.deepEqual(requests, [{ categoryId, name: "End" }]);
  assert.deepEqual(errors, [], "New terms never mark the input invalid.");
  assert.equal(commits.length, 0, "Opening confirmation cannot save.");
  assert.deepEqual({ editor, taxonomy }, before);
  action(true);
  assert.equal(commits.length, 1);
  const committed = commits[0];
  assert.equal(committed.taxonomy.terms.length, taxonomy.terms.length + 1);
  const created = committed.taxonomy.terms.find((term) => term.value === "end");
  assert(created);
  const renamed = optionId
    ? committed.editor.properties[0].kind === "variant"
      ? committed.editor.properties[0].options[0]
      : undefined
    : committed.editor.properties[0];
  assert(renamed && "classification" in renamed);
  assert.equal(renamed.classification[categoryId], created.id);
  assert.equal(renamed.name, "End");
  assert.deepEqual(
    committed.editor.properties[0].kind === "variant" &&
      committed.editor.properties[0].options[1],
    property.options[1],
    "Unrelated options stay unchanged.",
  );
  assert.equal(requests.at(-1), null);
  assert.deepEqual(errors, []);
}

for (const name of [
  "BooleanNameEditor",
  "PropertySetup",
  "VariantNameEditor",
]) {
  const declaration = source.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
  assert(declaration);
  const text = declaration.getText(source);
  assert.match(text, /className="structureNameEditor"/);
  assert.match(text, /<Checkmark \/>/);
  assert.match(text, /<Close \/>/);
}
assert.match(
  component.getText(source),
  /<Dialog[\s\S]*aria-label=\{\s*termRequest\?\.entries[\s\S]*"Create Registry term"/,
);
assert.doesNotMatch(
  component.getText(source),
  /Choose an existing Registry term/,
);
assert.match(component.getText(source), /<Popover size="S">/);
assert.match(source.text, /<Heading level=\{3\} styles=\{termHeadingStyles\}>/);
assert.match(
  source.getFullText(),
  /const termHeadingStyles = style\(\{ font: "heading-xs", margin: 0 \}\)/,
);
assert.match(
  source.getFullText(),
  /const termBodyStyles = style\(\{ font: "body-sm" \}\)/,
);
assert.match(
  source.text,
  /<Text UNSAFE_className=\{String\(termBodyStyles\)\}>/,
);
assert.match(
  source.text,
  /<ButtonGroup align="end" styles=\{termActionsStyles\}>/,
);
assert.match(source.text, /Cancel\s*<\/Button>[\s\S]*>\s*Create\s*<\/Button>/);
console.log(
  "Compact name editors and explicit Registry-term confirmation passed.",
);

const row = source.statements.find(
  (statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "StructurePropertyRow",
);
assert(row);
interface RowElement {
  type: string;
  props: {
    size?: string;
    "aria-label"?: string;
    onPress?: () => void;
    UNSAFE_className?: string;
  };
  children: unknown[];
}
const renderRow: (props: {
  name: string;
  isReadOnly: boolean;
  onEditName: () => void;
  nameEditor: RowElement | null;
  children: RowElement;
}) => RowElement = runInNewContext(
  ts.transpileModule(`(${row.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.React },
  }).outputText,
  {
    React: {
      createElement: (
        type: string,
        props: RowElement["props"],
        ...children: unknown[]
      ) => ({ type, props, children }),
    },
    ActionButton: "ActionButton",
    Text: "Text",
    nameTextStyles: "shared-name-typography",
  },
);
for (const type of ["Switch", "Picker"]) {
  let edited = false;
  const control: RowElement = { type, props: {}, children: [] };
  const props = {
    name: type === "Switch" ? "Has icon" : "Placement",
    isReadOnly: false,
    onEditName: () => {
      edited = true;
    },
    nameEditor: null,
    children: control,
  };
  const rendered = renderRow(props);
  const button = rendered.children[0] as RowElement;
  assert.equal(button.type, "ActionButton");
  assert.equal(button.props.size, "S");
  assert.equal(button.props.UNSAFE_className, "structurePropertyNameButton");
  assert.equal(button.props["aria-label"], `Edit property ${props.name}`);
  const label = button.children[0] as RowElement;
  assert.equal(label.props.UNSAFE_className, "shared-name-typography");
  button.props.onPress?.();
  assert(edited, `${type} rows allow editing by clicking the name.`);
  assert.equal(rendered.children[1], control);
  const readOnly = renderRow({ ...props, isReadOnly: true });
  assert.equal((readOnly.children[0] as RowElement).type, "Text");
  assert.equal(
    readOnly.children[1],
    control,
    "Read-only preview stays interactive.",
  );
  const nameEditor: RowElement = {
    type: "NameEditor",
    props: {},
    children: [],
  };
  const editing = renderRow({ ...props, nameEditor });
  assert.equal(editing.children[0], nameEditor);
  assert.equal(editing.children[1], false, "Editing uses the full row.");
}

const rows: ts.JsxOpeningElement[] = [];
function findRows(node: ts.Node) {
  if (
    ts.isJsxOpeningElement(node) &&
    node.tagName.getText(source) === "StructurePropertyRow"
  )
    rows.push(node);
  ts.forEachChild(node, findRows);
}
findRows(source);
assert.equal(rows.length, 1, "Both property kinds use one shared row.");
const editName = rows[0].attributes.properties.find(
  (attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) &&
    attribute.name.getText(source) === "onEditName",
)?.initializer;
assert(editName && ts.isJsxExpression(editName) && editName.expression);
for (const kind of ["boolean", "variant"]) {
  const calls: string[] = [];
  const edit: () => void = runInNewContext(
    ts.transpileModule(`(${editName.expression.getText(source)})`, {
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    }).outputText,
    {
      property: { id: "property", kind },
      setEditingProperty: (id: string) => calls.push(`variant:${id}`),
      setEditing: (id: string) => calls.push(`boolean:${id}`),
    },
  );
  edit();
  assert.deepEqual(calls, [`${kind}:property`]);
}
console.log(
  "Shared Boolean and variant rows: names, editing, controls and read-only passed.",
);
