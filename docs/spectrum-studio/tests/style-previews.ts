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
  stylePreviewFamily,
  stylePreviewColors,
  styleVariantLabel,
} from "../src/features/styles/preview";
import { styleSampleIcon } from "../src/features/styles/iconPreview";
import {
  selectedStyleIdAtom,
  styleSampleTextAtom,
  stylePreviewAtom,
  stylesDocumentAtom,
} from "../src/features/styles/state";
import { authoringSourceSnapshotAtom } from "../src/features/edit-session/state";
import {
  PREVIEW_DEFAULTS,
  valuePreviewPresentation,
} from "../src/features/tokens/valuePreview";
import type { StyleRow } from "../src/features/styles/generation";
import type { ValuePreviewProps } from "../src/components/value-preview/ValuePreview";
import type { StyleAppearanceFields } from "../src/panels/styles/StyleAppearanceFields";
import type { StyleAppearance } from "../src/features/styles/model";
import type { TokenComboBoxProps } from "../src/components/fields/TokenComboBox";
import { modeSetGroupIconId } from "../src/features/modes/controlPresentation";
import { styleColorIndex } from "../src/features/styles/generation";

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
  styleSampleIcon,
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
const workflow = document.recipes.find(
  (recipe) =>
    recipe.kind === "icon" && recipe.appearance.color.kind === "families",
)!;
assert(workflow && workflow.appearance.color.kind === "families");
const supported = workflow.appearance.color;
const familyRows = supported.familyIds.flatMap((familyId, index) => [
  { ...color, recipeId: workflow.id, familyId, value: `rgb(${index}, 0, 0)` },
  {
    ...color,
    recipeId: workflow.id,
    familyId,
    outputId: "hover",
    value: `rgb(${index}, 1, 0)`,
  },
]);
const colorSelection = { optionIds: [] };
const initialColors = stylePreviewColors(familyRows, supported, colorSelection);
assert.equal(
  initialColors.length,
  1,
  "Design starts with exactly one supported color.",
);
const variantRows: StyleRow[] = [
  { ...familyRows[0], optionIds: ["regular"] },
  { ...familyRows[0], optionIds: ["bold"] },
  { ...familyRows[0], property: "lineHeight" },
];
assert.deepEqual(
  stylePreviewColors(variantRows, supported, { optionIds: ["bold"] }),
  [variantRows[1]],
  "Design preserves authored variant selection and excludes non-color rows.",
);
const singleColor = { kind: "single", binding: { value: "#123456" } } as const;
assert.equal(stylePreviewFamily(singleColor), undefined);
assert.deepEqual(stylePreviewColors([color], singleColor, colorSelection), [
  color,
]);
assert.equal(initialColors[0].familyId, supported.familyIds[0]);
const alternate = supported.familyIds[1];
assert(alternate);
assert.equal(
  stylePreviewColors(familyRows, supported, {
    ...colorSelection,
    familyId: alternate,
  })[0].familyId,
  alternate,
);
assert.equal(
  stylePreviewColors(familyRows, supported, {
    ...colorSelection,
    familyId: alternate,
    outputId: "hover",
  })[0].outputId,
  "hover",
);
assert.equal(
  stylePreviewColors(familyRows, supported, {
    ...colorSelection,
    permutations: true,
  }).length,
  familyRows.length,
  "Permutations retains the generated combinations.",
);
assert.equal(
  stylePreviewFamily(supported, "removed-family"),
  supported.familyIds[0],
);
assert.equal(
  stylePreviewFamily({ ...supported, familyIds: [] }, alternate),
  undefined,
);
assert.equal(
  stylePreviewColors(
    familyRows.filter((row) => row.familyId !== alternate),
    supported,
    { ...colorSelection, familyId: alternate },
  ).length,
  0,
  "A supported but unavailable color does not silently show another family.",
);
const beforeColorPreview = structuredClone(
  store.get(authoringSourceSnapshotAtom),
);
store.set(stylePreviewAtom, {
  options: {},
  familyId: alternate,
  display: "tokens",
});
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom),
  beforeColorPreview,
  "Color preview selection changes neither support, publications nor authored variants.",
);

let removeFamily: ((keys: Set<string>) => void) | undefined;
let addFamily: ((id: string) => void) | undefined;
let enableIndexModes: ((id: string) => void) | undefined;
let modeMenuSelection: string | undefined;
let modeButton: {
  isSelected: boolean;
  isDisabled: boolean;
  onChange?: (selected: boolean) => void;
};
const indexFields = new Map<string, TokenComboBoxProps>();
const Box = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", {}, children);
const Fields = component<React.ComponentProps<typeof StyleAppearanceFields>>(
  "panels/styles/StyleAppearanceFields.tsx",
  "StyleAppearanceFields",
  {
    colorFamiliesFieldStyles: "supported-color-field",
    Picker: ({
      label,
      children,
    }: {
      label: string;
      children?: React.ReactNode;
    }) => React.createElement("div", { "data-picker": label }, children),
    PickerItem: Box,
    TokenComboBox: (props: TokenComboBoxProps) => {
      indexFields.set(props.ariaLabel ?? props.label ?? "", props);
      return React.createElement("input", {
        "aria-label": props.ariaLabel ?? props.label,
        "data-label-position": props.label ? "top" : "side",
        disabled: props.isDisabled,
        value:
          props.options.find((option) => option.id === props.selectedKey)
            ?.name ?? "",
        readOnly: true,
      });
    },
    CategoryIcon: ({ category }: { category: string }) =>
      React.createElement("span", { "data-category-icon": category }),
    modeSetGroupIconId,
    MODE_ICONS: {},
    ToggleButton: (
      props: typeof modeButton & { children: React.ReactNode },
    ) => {
      modeButton = props;
      return React.createElement(
        "button",
        {
          "aria-pressed": props.isSelected,
          disabled: props.isDisabled,
        },
        props.children,
      );
    },
    MenuSection: Box,
    Header: Box,
    Heading: Box,
    Text: Box,
    SideLabelRow: ({
      label,
      children,
    }: {
      label: string;
      children: (id: string) => React.ReactNode;
    }) =>
      React.createElement(
        "section",
        { "data-label": label },
        children("family-label"),
      ),
    TagGroup: ({
      size,
      children,
      onRemove,
    }: {
      size: string;
      children: React.ReactNode;
      onRemove?: typeof removeFamily;
    }) => {
      removeFamily = onRemove;
      return React.createElement("div", { "data-tag-size": size }, children);
    },
    Tag: Box,
    MenuTrigger: Box,
    ActionButton: Box,
    Add: () => React.createElement("span", {}, "+"),
    Menu: ({
      children,
      onAction,
      "aria-label": label,
      selectionMode,
    }: {
      children: React.ReactNode;
      onAction: typeof addFamily;
      "aria-label": string;
      selectionMode?: string;
    }) => {
      if (label === "Available color families") addFamily = onAction;
      else if (label === "Select mode set") {
        enableIndexModes = onAction;
        modeMenuSelection = selectionMode;
      }
      return React.createElement(
        "div",
        { "data-menu": "add-family" },
        children,
      );
    },
    MenuItem: Box,
  },
);
const changes: Partial<StyleAppearance>[] = [];
const fieldProps: React.ComponentProps<typeof StyleAppearanceFields> = {
  kind: "icon",
  value: { color: { ...supported, familyIds: [supported.familyIds[0]] } },
  references: [],
  taxonomy: original.taxonomy!,
  modeSets: original.modeSets,
  families: supported.familyIds
    .slice(0, 2)
    .map((id, index) => ({ id, name: index ? "Blue" : "Gray" })),
  display: "tokens",
  isReadOnly: false,
  onChange: (value) => changes.push(value),
};
const supportedField = renderToStaticMarkup(
  React.createElement(Fields, fieldProps),
);
assert.match(supportedField, /data-label="Color families"/);
assert.match(supportedField, /class="supported-color-field"/);
assert.match(supportedField, /data-tag-size="S"/);
assert.doesNotMatch(supportedField, /data-picker="Color families"/);
assert(addFamily && removeFamily);
addFamily(alternate);
assert.deepEqual(structuredClone(changes[0].color), {
  ...supported,
  familyIds: supported.familyIds.slice(0, 2),
});
removeFamily(new Set([supported.familyIds[0]]));
assert.deepEqual(structuredClone(changes[1].color), {
  ...supported,
  familyIds: [],
});
addFamily(supported.familyIds[0]);
assert.equal(
  changes.length,
  2,
  "Adding an existing family cannot duplicate support.",
);
addFamily("unavailable-family");
assert.equal(changes.length, 2);
addFamily = undefined;
const readOnlyField = renderToStaticMarkup(
  React.createElement(Fields, { ...fieldProps, isReadOnly: true }),
);
assert.equal(removeFamily, undefined);
assert.equal(addFamily, undefined);
assert.doesNotMatch(readOnlyField, /data-menu="add-family"/);
assert(
  modeButton!.isDisabled,
  "Read-only mode cannot change the enabled mode set.",
);
assert([...indexFields.values()].every((field) => field.isDisabled));

indexFields.clear();
const modeFieldsMarkup = renderToStaticMarkup(
  React.createElement(Fields, fieldProps),
);
assert.match(modeFieldsMarkup, /class="dividableComboBoxPrimary"/);
assert.match(modeFieldsMarkup, /data-category-icon="modes"/);
assert.match(
  modeFieldsMarkup,
  /aria-label="Scale index" data-label-position="top"/,
);
assert.doesNotMatch(modeFieldsMarkup, /data-picker="Index mode set"/);
assert.equal(modeButton!.isSelected, true);
assert.equal(indexFields.get("Scale index")!.isDisabled, true);
const indexAxis = original.modeSets.find(
  (axis) => axis.id === supported.indexModes!.modeSetId,
)!;
assert(indexAxis);
const registeredIndices = original.taxonomy!.terms.filter((term) =>
  original.taxonomy!.categories.some(
    (category) =>
      category.key === "scaleIndex" && category.id === term.categoryId,
  ),
);
for (const mode of indexAxis.modes) {
  const field = indexFields.get(mode.name)!;
  assert(field, `There is a field labelled only ${mode.name}.`);
  assert.equal(field.label, undefined);
  assert.equal(field.isDisabled, false);
  assert.equal(field.isRequired, true);
  assert.equal(field.customValue, undefined);
  assert.equal(field.options.length, registeredIndices.length);
  assert(
    field.options.every((option) =>
      registeredIndices.some((term) => term.id === option.id),
    ),
  );
  const value = registeredIndices.find(
    (term) => term.id === field.selectedKey,
  )?.value;
  assert.equal(
    value,
    styleColorIndex(supported, { [indexAxis.id]: mode.id }),
    "The editor uses the same mode fallback as token generation.",
  );
}
const darkIndex = indexFields.get("Dark")!;
const index1000 = registeredIndices.find((term) => term.value === 1000)!;
assert(index1000);
const beforeInvalid = changes.length;
assert.throws(
  () => darkIndex.onChange("not-a-registered-index"),
  /Choose a registered scale index/,
);
assert.throws(
  () => darkIndex.onChange(null),
  /Choose a registered scale index/,
);
assert.equal(changes.length, beforeInvalid);
darkIndex.onChange(index1000.id);
const edited = changes.at(-1)!.color!;
assert(edited.kind === "families");
assert.equal(edited.scaleIndex, supported.scaleIndex);
assert.deepEqual(
  structuredClone(edited.familyIds),
  fieldProps.value.color.kind === "families"
    ? fieldProps.value.color.familyIds
    : [],
);
assert.equal(edited.indexModes!.values["mode-dark"], 1000);
assert.equal(edited.indexModes!.modeSetId, indexAxis.id);
assert.equal(
  supported.indexModes!.values["mode-dark"],
  900,
  "The original source is not mutated.",
);
modeButton!.onChange!(false);
const shared = changes.at(-1)!.color!;
assert(shared.kind === "families");
assert.equal(shared.indexModes, undefined);
assert.equal(shared.scaleIndex, supported.scaleIndex);

indexFields.clear();
const sharedMarkup = renderToStaticMarkup(
  React.createElement(Fields, {
    ...fieldProps,
    value: { color: shared },
  }),
);
assert.equal(modeButton!.isSelected, false);
assert.equal(indexFields.get("Scale index")!.isDisabled, false);
assert.equal(indexFields.size, 1, "Disabling Modes hides the mode fields.");
assert.match(sharedMarkup, /Select mode set/);
assert.equal(modeMenuSelection, "single");
assert(enableIndexModes);
const otherAxis = original.modeSets.find(
  (axis) => axis.id !== indexAxis.id && axis.modes.length,
)!;
enableIndexModes(otherAxis.id);
const enabled = changes.at(-1)!.color!;
assert(enabled.kind === "families");
assert.equal(enabled.indexModes!.modeSetId, otherAxis.id);
assert.equal(Object.keys(enabled.indexModes!.values).length, 0);
assert.equal(enabled.scaleIndex, shared.scaleIndex);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom),
  beforeColorPreview,
  "Control callbacks do not mutate authored snapshots in place.",
);

const unregistered = { ...shared, scaleIndex: 123456 };
renderToStaticMarkup(
  React.createElement(Fields, {
    ...fieldProps,
    value: { color: unregistered },
  }),
);
assert.match(
  indexFields.get("Scale index")!.error!,
  /123456 is not registered/,
);
assert(
  !indexFields
    .get("Scale index")!
    .options.some((option) => option.name === "123456"),
);
assert.match(view, /<StyleAppearanceFields\s+taxonomy=\{taxonomy\}/);
assert.match(view, /const colors = stylePreviewColors\(/);
assert.match(
  view,
  /previewControls=\{[\s\S]*?label="Color"[\s\S]*?setPreview\(\{ \.\.\.preview, familyId: id \}\)/,
);
assert.match(
  source("panels/design/DesignProperties.tsx").text,
  /\{props\.previewControls\}/,
);
console.log(
  "Shared previews, supported colors, Registry-only scale indices and single-set mode breakout passed.",
);
