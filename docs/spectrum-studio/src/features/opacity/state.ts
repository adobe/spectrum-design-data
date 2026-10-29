// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { colorSystemDocumentAtom } from "../color-system/state";
import { modeSetsAtom } from "../modes/state";
import { activeModesAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdit } from "../tokens/browserEditTypes";
import { OPACITY_DEFAULTS } from "./defaults";
import {
  isAlpha,
  isOpacityDocument,
  type OpacityDocument,
  type OpacityLevel,
} from "./model";
import { resolveOpacity, synchronizeOpacityRows } from "./generation";
import { compensatedOpacity } from "./polarity";
import { registerOpacityVocabulary } from "../taxonomy/opacityGovernance";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";

function writeOpacityLevels(
  get: Getter,
  set: Setter,
  document: OpacityDocument,
) {
  const taxonomy = registerOpacityVocabulary(
    get(taxonomyDocumentAtom),
    document,
  );
  withValidatedAuthoringUpdates(
    get,
    new Map<string, unknown>([
      ["foundations/opacity", document],
      ["registry/taxonomy", taxonomy],
    ]),
    () => {
      set(taxonomyDocumentAtom, taxonomy);
      set(opacityDocumentAtom, document);
    },
  );
}

export const opacityDocumentAtom = persistedAtom<OpacityDocument>({
  key: "foundations/opacity",
  schemaVersion: 1,
  initialize: () => structuredClone(OPACITY_DEFAULTS),
  validate: isOpacityDocument,
  preserveInvalid: true,
});
export const opacitySourceAtom = atom((get) => ({
  opacity: get(opacityDocumentAtom),
  colorSystem: get(colorSystemDocumentAtom),
  modeSets: get(modeSetsAtom),
  browserTokenEdits: get(browserTokenEditsAtom),
}));
export const opacityResultAtom = atom((get) =>
  resolveOpacity(
    get(opacitySourceAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
  ),
);
export const opacityLevelsAtom = atom((get) => get(opacityResultAtom).levels);
function assertEditing(editing: boolean, preview: object) {
  if (!editing) throw new Error("Enter edit mode to change opacity.");
  if (Object.keys(preview).length)
    throw new Error("Select a saved mode before editing opacity.");
}
export const updateOpacitySettingsAtom = atom(
  null,
  (get, set, value: number) => {
    assertEditing(get(editModeAtom), get(previewOverridesAtom));
    if (!isAlpha(value))
      throw new Error("Enter compensation between 0% and 100%.");
    set(opacityDocumentAtom, {
      ...get(opacityDocumentAtom),
      polarityCompensation: value,
    });
  },
);
export const updateOpacityLevelAtom = atom(
  null,
  (get, set, input: { id: string; value: number }) => {
    assertEditing(get(editModeAtom), get(previewOverridesAtom));
    if (!isAlpha(input.value))
      throw new Error("Enter opacity between 0% and 100%.");
    const result = get(opacityResultAtom),
      level = result.levels.find((item) => item.id === input.id);
    if (!level || result.issues.length)
      throw new Error(
        result.issues.join(" ") || "This opacity level is no longer available.",
      );
    if (result.weight < 0.5 && !level.overridden) {
      let low = 0,
        high = 1;
      for (let iteration = 0; iteration < 48; iteration++) {
        const middle = (low + high) / 2;
        if (
          compensatedOpacity(
            middle,
            get(opacityDocumentAtom).polarityCompensation,
            result.weight,
          ) < input.value
        )
          low = middle;
        else high = middle;
      }
      const value =
        input.value === 0 ||
        input.value === 1 ||
        result.weight === 0 ||
        get(opacityDocumentAtom).polarityCompensation === 0
          ? input.value
          : (low + high) / 2;
      set(opacityDocumentAtom, {
        ...get(opacityDocumentAtom),
        levels: get(opacityDocumentAtom).levels.map((item) =>
          item.id === input.id ? { ...item, value } : item,
        ),
      });
    } else {
      const edits = get(browserTokenEditsAtom),
        previous = edits[input.id] ?? { values: {} };
      set(browserTokenEditsAtom, {
        ...edits,
        [input.id]: {
          ...previous,
          values: {
            ...previous.values,
            [level.overrideKey ?? result.modeKey]: {
              value: input.value,
              baseline: level.generatedValue,
            },
          },
        },
      });
    }
  },
);
export const resetOpacityOverrideAtom = atom(null, (get, set, id: string) => {
  assertEditing(get(editModeAtom), get(previewOverridesAtom));
  const edits = { ...get(browserTokenEditsAtom) },
    previous = edits[id];
  if (!previous) return;
  const values = { ...previous.values };
  const level = get(opacityResultAtom).levels.find((item) => item.id === id);
  if (!level?.overrideKey) return;
  delete values[level.overrideKey];
  edits[id] = { ...previous, values };
  set(browserTokenEditsAtom, edits);
});
export const addOpacityLevelAtom = atom(null, (get, set) => {
  assertEditing(get(editModeAtom), get(previewOverridesAtom));
  const level: OpacityLevel = { id: crypto.randomUUID(), value: 0, rows: {} };
  const document = {
    ...get(opacityDocumentAtom),
    levels: [...get(opacityDocumentAtom).levels, level],
  };
  writeOpacityLevels(
    get,
    set,
    synchronizeOpacityRows({ ...get(opacitySourceAtom), opacity: document })!,
  );
  return level.id;
});
export const sortOpacityLevelsAtom = atom(null, (get, set) => {
  assertEditing(get(editModeAtom), get(previewOverridesAtom));
  writeOpacityLevels(get, set, {
    ...get(opacityDocumentAtom),
    levels: [...get(opacityDocumentAtom).levels].sort(
      (a, b) => a.value - b.value,
    ),
  });
});
export const removeOpacityLevelAtom = atom(null, (get, set, id: string) => {
  assertEditing(get(editModeAtom), get(previewOverridesAtom));
  const document = get(opacityDocumentAtom),
    index = document.levels.findIndex((level) => level.id === id);
  if (index < 0) throw new Error("This opacity level is no longer available.");
  const removed = {
    level: document.levels[index],
    index,
    edit: get(browserTokenEditsAtom)[id],
  };
  const edits = { ...get(browserTokenEditsAtom) };
  delete edits[id];
  set(opacityDocumentAtom, {
    ...document,
    levels: document.levels.filter((level) => level.id !== id),
  });
  set(browserTokenEditsAtom, edits);
  return removed;
});
export const restoreOpacityLevelAtom = atom(
  null,
  (
    get,
    set,
    removed: {
      level: OpacityLevel;
      index: number;
      edit?: BrowserTokenEdit;
    },
  ) => {
    assertEditing(get(editModeAtom), get(previewOverridesAtom));
    const document = get(opacityDocumentAtom);
    if (document.levels.some((level) => level.id === removed.level.id))
      throw new Error("This opacity level has already been restored.");
    const levels = [...document.levels];
    levels.splice(Math.min(removed.index, levels.length), 0, removed.level);
    writeOpacityLevels(get, set, { ...document, levels });
    if (removed.edit)
      set(browserTokenEditsAtom, {
        ...get(browserTokenEditsAtom),
        [removed.level.id]: removed.edit,
      });
  },
);
