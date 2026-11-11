// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SpectrumDash from "../src/features/icons/SpectrumDash";
import { createStore } from "jotai";
import ts from "typescript";
import {
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  resetAllAuthoringAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  buildStyleArtifacts,
  styleName,
} from "../src/features/styles/generation";
import { styleContexts } from "../src/features/styles/artifacts";
import { isStylesDocument } from "../src/features/styles/model";
import { stylePreview } from "../src/features/styles/preview";
import {
  styleIconChoices,
  styleSampleIcon,
} from "../src/features/styles/iconPreview";
import {
  saveStyleAtom,
  selectedStyleIdAtom,
  styleSampleIconsAtom,
  stylesDocumentAtom,
} from "../src/features/styles/state";
import { switchStyleColor } from "../src/features/styles/variants";
import { UI_GLYPHS } from "../src/features/structures/elements";
import { PREVIEW_TERM_IDS } from "../src/features/tokens/valuePreview";
import { ORDERED_CATEGORY_IDS } from "../src/features/taxonomy/orderedVocabulary";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import {
  encodeStructureSource,
  decodeStructureSource,
} from "../src/features/edit-session/structureSourceCodec";
import { readAuthoringRecord } from "../src/features/edit-session/storage";
import { isRule } from "../src/features/logic/model";
import { ruleConsumers } from "../src/features/logic/consumers";
import { spectrumIconNames } from "../src/features/icons/spectrumIconNames.generated";

const defaults = createDefaultSnapshot();
assertStoredSnapshot(defaults);
const styles = defaults.styles!;
const icons = styles.recipes.filter((recipe) => recipe.kind === "icon");
assert.equal(icons.length, 2);
const workflow = icons.find(
  (recipe) => recipe.name.termId === PREVIEW_TERM_IDS.workflowIcon,
)!;
const ui = icons.find(
  (recipe) => recipe.name.termId === PREVIEW_TERM_IDS.uiIcon,
)!;
assert(workflow && ui);
const color = workflow.appearance.color;
assert(color.kind === "families" && color.indexModes);
assert.equal(color.scaleIndex, 800);
assert.deepEqual(
  color.familyIds,
  defaults.colorSystem.scales.map((scale) => scale.id),
);
const scheme = defaults.modeSets.find(
  (axis) => axis.id === color.indexModes!.modeSetId,
)!;
const dark = scheme.modes.find((mode) => mode.key === "dark")!;
assert.deepEqual(color.indexModes.values, { [dark.id]: 900 });
assert(isStylesDocument(styles));
for (const value of [NaN, 800.5, "900", null]) {
  const invalid = structuredClone(styles);
  const invalidColor = invalid.recipes.find(
    (recipe) => recipe.id === workflow.id,
  )!.appearance.color;
  assert(invalidColor.kind === "families" && invalidColor.indexModes);
  Reflect.set(invalidColor.indexModes.values, dark.id, value);
  assert.equal(isStylesDocument(invalid), false);
}
const variants = ui.options[0];
assert(variants.kind === "variant");
assert.deepEqual(
  variants.options.map((option) => option.name),
  ["Default", "Subdued", "Subtle"],
);
assert.equal(variants.defaultOptionId, variants.options[0].id);
const rule = defaults.rules!.find(
  (rule) => rule.id === workflow.applications[0].ruleId,
)!;
assert(isRule(rule) && rule.type === "conditional");
assert.equal(ui.applications[0].ruleId, rule.id);
assert.equal(rule.outputs?.length, 2);
assert.equal(
  ruleConsumers({
    ...defaults,
    color: defaults.colorSystem,
    snapshot: defaults,
  }).filter((consumer) => consumer.ruleId === rule.id).length,
  2,
  "Both recipes are tracked consumers of the shared icon rule.",
);

const contexts = styleContexts(defaults);
const generate = (document = styles) =>
  buildStyleArtifacts(
    document,
    defaults.taxonomy!,
    defaults.rules!,
    defaults.modeSets,
    contexts,
  );
const output = generate();
assert.deepEqual(output.issues, []);
assert.equal(
  output.rows.filter((row) =>
    icons.some((recipe) => recipe.id === row.recipeId),
  ).length,
  contexts.length * (color.familyIds.length + 3) * 3,
);
assert.equal(
  new Set(output.rows.map((row) => `${row.name}:${row.modeKey}`)).size,
  output.rows.length,
);
for (const context of contexts) {
  const isDark = context.selection[scheme.id] === dark.id;
  for (const recipe of icons) {
    const rows = output.rows.filter(
      (row) =>
        row.recipeId === recipe.id &&
        Object.entries(context.selection).every(([axis, id]) =>
          JSON.parse(row.modeKey).some(
            ([key, value]: [string, string]) => key === axis && value === id,
          ),
        ),
    );
    for (const row of rows) {
      const base =
        recipe.id === workflow.id
          ? isDark
            ? 900
            : 800
          : [800, 500, 200][
              variants.options.findIndex((option) =>
                row.optionIds.includes(option.id),
              )
            ];
      const expectedIndex = base + (row.outputId ? (isDark ? -100 : 100) : 0);
      assert.equal(row.scaleIndex, expectedIndex);
      const reference = context.references.find(
        (entry) =>
          entry.property === "color" &&
          entry.index === expectedIndex &&
          entry.familyId === (row.familyId ?? "scale-gray"),
      )!;
      assert(reference);
      assert.equal(row.token.$ref, reference.uuid);
      assert.equal(row.value, reference.value);
      const preview = stylePreview(recipe, [row], "#ffffff", "srgb").preview;
      assert(preview.kind === "icon-color");
      assert.equal(preview.value, row.value);
    }
  }
}
const darkContext = contexts.find(
  (context) => context.selection[scheme.id] === dark.id,
)!;
const single = switchStyleColor(
  color,
  "single",
  darkContext.references,
  darkContext.selection,
);
assert(single.kind === "single");
assert.equal(
  darkContext.references.find(
    (reference) => reference.id === single.binding.$ref,
  )?.index,
  900,
);
const unavailable = structuredClone(styles);
const missingColor = unavailable.recipes.find(
  (recipe) => recipe.id === workflow.id,
)!.appearance.color;
assert(missingColor.kind === "families" && missingColor.indexModes);
missingColor.indexModes.modeSetId = "missing-axis";
assert(
  generate(unavailable).issues.some((issue) =>
    /available mode set/.test(issue.message),
  ),
);
assert.equal(
  generate(unavailable).rows.filter((row) => row.recipeId === workflow.id)
    .length,
  0,
);

const working = structuredClone(defaults);
const edited = working.styles!.recipes.find(
  (recipe) => recipe.id === workflow.id,
)!;
const editedColor = edited.appearance.color;
assert(editedColor.kind === "families" && editedColor.indexModes);
editedColor.indexModes.values[dark.id] = 800;
const changed = generate(working.styles);
assert.deepEqual(changed.issues, []);
for (const before of output.rows) {
  const after = changed.rows.find(
    (row) => row.token.uuid === before.token.uuid,
  )!;
  assert(after, "Editing mode values preserves concept and row identities.");
  assert.equal(after.conceptId, before.conceptId);
  const affected =
    before.recipeId === workflow.id && before.context.colorScheme === "dark";
  assert.equal(
    after.scaleIndex,
    affected ? before.scaleIndex! - 100 : before.scaleIndex,
  );
  if (!affected) assert.deepEqual(after, before);
}
working.platforms[0].name = "Keep unrelated edit";
const comparison = compareAuthoring(defaults, working);
const styleItems = comparison.groups
  .flatMap((group) => group.items)
  .filter((item) => item.sourceKind === "style");
assert.equal(styleItems.length, 1);
assert.equal(
  styleItems[0].fields.length,
  1,
  "The mode mapping is part of the atomic color field.",
);
const address = styleItems[0].fields[0].address!;
assert(address);
const reset = prepareChangeReset(
  { ...working, attachments: {} },
  sourceResetPlan("Restore icon color", [address]),
);
assert.deepEqual(reset.styles, defaults.styles);
assert.equal(reset.platforms[0].name, "Keep unrelated edit");
assert.deepEqual(
  decodeStructureSource(encodeStructureSource(working)),
  working,
);

assert.deepEqual(styleIconChoices(ui), UI_GLYPHS);
assert.equal(styleIconChoices(workflow), undefined);
for (const name of spectrumIconNames) {
  assert.equal(styleSampleIcon(workflow, name), name);
  assert.equal(
    styleSampleIcon(ui, name),
    UI_GLYPHS.some((allowed) => allowed === name) ? name : "ChevronDown",
  );
}
assert.equal(styleSampleIcon(workflow, undefined), "Home");
assert.equal(styleSampleIcon(ui, "Home"), "ChevronDown");
for (const name of [
  "Add",
  "Dash",
  "DragHandle",
  "Checkmark",
  "ChevronDown",
] as const)
  assert.equal(styleSampleIcon(ui, name), name);
const dashMarkup = renderToStaticMarkup(
  React.createElement(SpectrumDash, {
    "aria-label": "Dash sample",
    UNSAFE_style: { color: "#123456" },
  }),
);
assert.match(dashMarkup, /viewBox="0 0 10 10"/);
assert.match(dashMarkup, /fill="currentColor"/);
assert.match(dashMarkup, /aria-label="Dash sample"/);
assert.match(dashMarkup, /<path /);
const renamed = structuredClone(ui);
renamed.name = workflow.name;
assert.deepEqual(
  styleIconChoices(renamed),
  UI_GLYPHS,
  "UI membership follows classification, not the display name.",
);
assert.equal(
  ui.classification[ORDERED_CATEGORY_IDS.element],
  PREVIEW_TERM_IDS.uiIcon,
);

const pickerSource = readFileSync(
  new URL("../src/components/fields/IconSamplePicker.tsx", import.meta.url),
  "utf8",
);
const parsed = ts.createSourceFile(
  "picker.tsx",
  pickerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const declaration = parsed.statements.find(
  (node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "IconSamplePicker",
)!;
const createPicker = runInNewContext(
  ts.transpileModule(
    `(${declaration.getText(parsed).replace(/^export\s+/, "")})`,
    {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ESNext,
      },
    },
  ).outputText,
  {
    React,
    useRef: () => ({ current: null }),
    useState: () => [0],
    useLayoutEffect() {},
    items: spectrumIconNames.map((id) => ({ id, label: id })),
    ComboBox: "div",
    ComboBoxItem: "span",
    Text: "span",
    MenuIcon: "span",
    style: () => "",
    spectrumIconLoaders: Object.fromEntries(
      spectrumIconNames.map((name) => [name, true]),
    ),
  },
) as (props: {
  selectedIcon: string;
  allowedIcons: readonly string[];
  onChange: (value: string) => void;
}) => React.ReactElement<{ children: React.ReactNode[] }>;
const selections: string[] = [];
const picker = createPicker({
  selectedIcon: "ChevronDown",
  allowedIcons: UI_GLYPHS,
  onChange: (value) => selections.push(value),
});
const input = picker.props.children[0];
assert(
  React.isValidElement<{
    onSelectionChange: (key: string) => void;
    defaultItems: { id: string }[];
  }>(input),
);
assert.deepEqual(
  Array.from(input.props.defaultItems, (item) => item.id).sort(),
  [...UI_GLYPHS].sort(),
);
input.props.onSelectionChange("Home");
input.props.onSelectionChange("Add");
assert.deepEqual(
  selections,
  ["Add"],
  "The shared picker rejects selections outside its allowed set.",
);

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    assert(
      value.length * 2 < 5 * 1024 * 1024,
      "Defaults fit the authoring storage quota.",
    );
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    throw new Error("Unscoped clearing is not allowed.");
  }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: storage,
    addEventListener() {},
    removeEventListener() {},
  },
});
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, defaults);
const beforePreview = structuredClone(store.get(authoringSourceSnapshotAtom));
store.set(styleSampleIconsAtom, { [workflow.id]: "Add", [ui.id]: "Dash" });
store.set(selectedStyleIdAtom, ui.id);
assert.equal(store.get(styleSampleIconsAtom)[workflow.id], "Add");
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforePreview);
assert.deepEqual(
  compareAuthoring(
    beforePreview,
    store.get(authoringSourceSnapshotAtom),
  ).groups.flatMap((group) => group.items),
  [],
);
store.set(enterEditModeAtom);
store.set(saveStyleAtom, edited);
assert.deepEqual(
  store.get(stylesDocumentAtom).publications,
  styles.publications,
);
store.set(saveEditAtom);
const record = readAuthoringRecord(assertStoredSnapshot)!;
assert(record);
assert.deepEqual(record.working.styles, store.get(stylesDocumentAtom));
assert.deepEqual(record.saved.styles, record.working.styles);
store.set(enterEditModeAtom);
store.set(saveStyleAtom, workflow);
store.set(cancelEditAtom);
assert.deepEqual(
  store
    .get(stylesDocumentAtom)
    .recipes.find((recipe) => recipe.id === workflow.id)!.appearance.color,
  editedColor,
);
store.set(enterEditModeAtom);
store.set(resetAllAuthoringAtom);
assert.deepEqual(store.get(stylesDocumentAtom), styles);
const older = structuredClone(defaults);
older.styles!.recipes = older.styles!.recipes.filter(
  (recipe) => recipe.kind !== "icon",
);
store.set(restoreAuthoringSnapshotAtom, older);
assert.equal(
  store
    .get(stylesDocumentAtom)
    .recipes.filter((recipe) => recipe.kind === "icon").length,
  0,
  "Restoring existing designs does not reseed new defaults.",
);
assert.equal(styleName(ui, defaults.taxonomy!), "ui-icon");
console.log(
  "Icon defaults, all-mode/state aliases, stable identities, restricted previews, Changes/reset and Save/Cancel/reload passed.",
);
