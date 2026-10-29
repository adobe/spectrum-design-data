// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { modeSetsAtom } from "./state";
import { parameterOwners, setParameterValue } from "./parameters";
import {
  createMode,
  ensureModeSetKeys,
  type Mode,
  type ModeSet,
} from "./model";
import { displayedModeIdsAtom, CUSTOM_MODE_KEY } from "./preview";
import {
  previewOverridesAtom,
  clearPreviewParametersAtom,
} from "./previewState";

export const MODE_SELECTION_SCHEMA_VERSION = 1;

export type ModeSelection = Record<string, string>;

function isModeSelection(data: unknown): data is ModeSelection {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.values(data as Record<string, unknown>).every(
    (value) => typeof value === "string",
  );
}

export const modeSelectionAtom = persistedAtom<ModeSelection>({
  key: "modes/selection",
  schemaVersion: MODE_SELECTION_SCHEMA_VERSION,
  initialize: () => ({}),
  validate: isModeSelection,
});

export function resolveActiveMode(
  modeSet: ModeSet,
  selection: ModeSelection,
): Mode | undefined {
  const selectedId = selection[modeSet.key];
  return (
    modeSet.modes.find((mode) => mode.id === selectedId) ??
    modeSet.modes.find((mode) => mode.id === modeSet.defaultModeId) ??
    modeSet.modes[0]
  );
}

/** Mirrors the spec's resolution context: every mode set resolves, defaulting when unselected. */
export const resolutionContextAtom = atom((get) => {
  const selection = get(modeSelectionAtom);
  const context: Record<string, string> = {};
  for (const modeSet of get(modeSetsAtom)) {
    const mode = resolveActiveMode(modeSet, selection);
    if (mode) context[modeSet.key] = mode.key;
  }
  return context;
});

export const activeModesAtom = atom((get) => {
  const selection = get(modeSelectionAtom);
  return get(modeSetsAtom)
    .map((modeSet) => resolveActiveMode(modeSet, selection))
    .filter((mode): mode is Mode => mode !== undefined);
});

export const selectModeAtom = atom(
  null,
  (get, set, input: { modeSetKey: string; modeId: string }) => {
    set(modeSelectionAtom, {
      ...get(modeSelectionAtom),
      [input.modeSetKey]: input.modeId,
    });
  },
);

/** Unclaimed parameters and the owner's default mode edit the universal base. */
export function resolveParameterTarget(
  modeSets: ModeSet[],
  selection: ModeSelection,
  parameterId: string,
): { modeSet: ModeSet; mode: Mode } | undefined {
  const owners = parameterOwners(modeSets);
  const ownerId = owners[parameterId];
  const modeSet = modeSets.find((candidate) => candidate.id === ownerId);
  const mode = modeSet && resolveActiveMode(modeSet, selection);
  return modeSet && mode && mode.id !== modeSet.defaultModeId
    ? { modeSet, mode }
    : undefined;
}

/** Returns false when the edit belongs to the base document rather than a mode. */
export const pendingModeParameterAtom = atom<{
  modeSetId: string;
  parameterId: string;
  value: string | number;
} | null>(null);

export const setActiveModeParameterAtom = atom(
  null,
  (get, set, input: { parameterId: string; value: string | number }) => {
    const modeSets = get(modeSetsAtom);
    const target = resolveParameterTarget(
      modeSets,
      get(modeSelectionAtom),
      input.parameterId,
    );
    if (!target) return false;
    if (get(displayedModeIdsAtom)[target.modeSet.key] === CUSTOM_MODE_KEY) {
      set(pendingModeParameterAtom, { modeSetId: target.modeSet.id, ...input });
      return "pending" as const;
    }
    set(
      modeSetsAtom,
      modeSets.map((modeSet) => ({
        ...modeSet,
        modes: modeSet.modes.map((mode) =>
          mode.id === target.mode.id
            ? setParameterValue(mode, input.parameterId, input.value)
            : mode,
        ),
      })),
    );
    return true;
  },
);

export const applyPendingModeParameterAtom = atom(
  null,
  (get, set, input: { modeId?: string; name?: string }) => {
    const pending = get(pendingModeParameterAtom);
    if (!pending) return;
    const modeSets = get(modeSetsAtom);
    const owner = modeSets.find((modeSet) => modeSet.id === pending.modeSetId);
    if (!owner || parameterOwners(modeSets)[pending.parameterId] !== owner.id)
      return;
    let targetId = input.modeId;
    if (!targetId) {
      const name = input.name?.trim();
      if (!name) return;
      const preview = get(previewOverridesAtom);
      const owners = parameterOwners(modeSets);
      const captured = Object.keys(preview).filter(
        (id) => owners[id] === owner.id,
      );
      let created = { ...createMode(), name };
      for (const id of captured)
        created = setParameterValue(created, id, preview[id]);
      created = setParameterValue(created, pending.parameterId, pending.value);
      targetId = created.id;
      set(
        modeSetsAtom,
        modeSets.map((modeSet) =>
          modeSet.id === owner.id
            ? ensureModeSetKeys({
                ...modeSet,
                modes: [...modeSet.modes, created],
              })
            : modeSet,
        ),
      );
      set(clearPreviewParametersAtom, captured);
    } else {
      if (
        !owner.modes.some(
          (mode) => mode.id === targetId && mode.id !== owner.defaultModeId,
        )
      )
        return;
      set(
        modeSetsAtom,
        modeSets.map((modeSet) =>
          modeSet.id !== owner.id
            ? modeSet
            : {
                ...modeSet,
                modes: modeSet.modes.map((mode) =>
                  mode.id === targetId
                    ? setParameterValue(
                        mode,
                        pending.parameterId,
                        pending.value,
                      )
                    : mode,
                ),
              },
        ),
      );
    }
    set(modeSelectionAtom, {
      ...get(modeSelectionAtom),
      [owner.key]: targetId,
    });
    set(pendingModeParameterAtom, null);
  },
);
