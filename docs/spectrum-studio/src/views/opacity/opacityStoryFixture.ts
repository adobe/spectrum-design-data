// Copyright 2026 Adobe. All rights reserved.
import { createStore } from "jotai";
import {
  opacityDocumentAtom,
  opacityResultAtom,
} from "../../features/opacity/state";
import { modeSetsAtom } from "../../features/modes/state";
import { modeSelectionAtom } from "../../features/modes/selection";
import { browserTokenEditsAtom } from "../../features/tokens/browserEdits";
import {
  appColorSchemeAtom,
  type AppColorScheme,
} from "../../state/view/appAppearance";
import { editModeAtom } from "../../state/view/editMode";
import { OPACITY_DEFAULTS } from "../../features/opacity/defaults";
import { createColorDefaults } from "../../data/defaults";
import { colorSystemDocumentAtom } from "../../features/color-system/state";
import { MODE_SET_DEFAULTS } from "../../features/modes/model";
import { previewOverridesAtom } from "../../features/modes/previewState";

export function createOpacityStoryStore({
  appearance = "light",
  editing = false,
  darkMode = false,
  override = false,
  boundaries = false,
  stale = false,
}: {
  appearance?: AppColorScheme;
  editing?: boolean;
  darkMode?: boolean;
  override?: boolean;
  boundaries?: boolean;
  stale?: boolean;
} = {}) {
  const store = createStore();
  store.set(appColorSchemeAtom, appearance);
  store.set(editModeAtom, editing);
  store.set(opacityDocumentAtom, structuredClone(OPACITY_DEFAULTS));
  store.set(colorSystemDocumentAtom, createColorDefaults());
  store.set(
    modeSetsAtom,
    MODE_SET_DEFAULTS.map((set) => structuredClone(set)),
  );
  store.set(modeSelectionAtom, {});
  store.set(browserTokenEditsAtom, {});
  store.set(previewOverridesAtom, {});

  if (boundaries) {
    const document = store.get(opacityDocumentAtom);
    store.set(opacityDocumentAtom, {
      ...document,
      levels: document.levels.map((level, index) =>
        index === 0
          ? { ...level, value: 0 }
          : index === document.levels.length - 1
            ? { ...level, value: 1 }
            : level,
      ),
    });
  }

  if (darkMode) {
    const set = store
      .get(modeSetsAtom)
      .find((item) => item.key === "colorScheme");
    const mode = set?.modes.find((item) => item.name.toLowerCase() === "dark");
    if (set && mode) store.set(modeSelectionAtom, { [set.key]: mode.id });
  }

  if (override) {
    const result = store.get(opacityResultAtom);
    const level = result.levels.find((item) => item.scaleIndex === 800);
    if (level) {
      const edits = store.get(browserTokenEditsAtom);
      store.set(browserTokenEditsAtom, {
        ...edits,
        [level.id]: {
          ...(edits[level.id] ?? { values: {} }),
          values: {
            ...(edits[level.id]?.values ?? {}),
            [result.modeKey]: {
              value: 0.31,
              baseline: stale ? 0.1 : level.generatedValue,
            },
          },
        },
      });
    }
  }

  return store;
}
