// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { colorSystemDocumentAtom, cssBaseDocumentAtom } from "./state";
import { assertCustomContrastNaming, sortContrastSteps } from "./contrastSteps";
import type { ColorScale, ContrastToken } from "./model";
import { rulesAtom } from "../logic/library";
import { STANDARD_SCALE_NAMING_RULE_ID } from "../logic/model";
import { modeSetsAtom } from "../modes/state";
import { parameterOwners } from "../modes/parameters";
import { modeSelectionAtom, resolveActiveMode } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { tokenOverridesAtom } from "../tokens/overrides";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import { tokenStableKey, tokenUuid } from "../tokens/model";
import {
  assertCustomContrastPatchRestore,
  pruneCustomContrastPatches,
} from "./customContrastPatches";
import type { TokenOverrideMap } from "../tokens/overrides";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { aliasesAtom } from "../tokens/aliasState";
import type { AliasDocument } from "../tokens/aliases";
import { captureSnapshot } from "../edit-session/state";
import {
  contrastForEffectiveEdit,
  editsOppositeValue,
  polarityContext,
} from "./polarity";

export const customContrastEditingContextAtom = atom((get) => {
  const sets = get(modeSetsAtom);
  const owners = parameterOwners(sets);
  const owner = sets.find(
    (axis) => axis.id === owners["color.contrastMultiplier"],
  );
  const mode = owner && resolveActiveMode(owner, get(modeSelectionAtom));
  const modeOverride = mode && mode.id !== owner?.defaultModeId;
  const polarity = polarityContext(get(cssBaseDocumentAtom));
  const opposite = !modeOverride && editsOppositeValue(polarity);
  const backgroundOwner = sets.find(
    (axis) => axis.id === owners["color.backgroundLightness"],
  );
  const backgroundMode =
    backgroundOwner &&
    resolveActiveMode(backgroundOwner, get(modeSelectionAtom));
  return {
    owner,
    mode: modeOverride ? mode : undefined,
    polarity,
    opposite,
    modeLabel: modeOverride
      ? `${owner?.name}: ${mode.name}`
      : opposite
        ? backgroundOwner && backgroundMode
          ? `${backgroundOwner.name}: ${backgroundMode.name}`
          : polarity.reference === "light"
            ? "Dark background"
            : "Light background"
        : undefined,
  };
});

export type CustomContrastAction =
  | { kind: "enable"; scaleId: string }
  | { kind: "disable"; scaleId: string }
  | { kind: "add"; scaleId: string }
  | { kind: "sort"; scaleId: string }
  | { kind: "base"; scaleId: string; stepId: string }
  | { kind: "rule"; scaleId: string; ruleId: string }
  | { kind: "remove"; scaleId: string; stepId: string }
  | {
      kind: "value";
      scaleId: string;
      stepId: string;
      value: number;
    }
  | { kind: "reset"; scaleId: string; stepId: string };

export interface CustomContrastUndo {
  scaleId: string;
  before: ColorScale["customContrasts"];
  after: ColorScale["customContrasts"];
  patches: { modeId: string; values: Record<string, number> }[];
  overrides: TokenOverrideMap;
  browserEdits: BrowserTokenEdits;
  aliases: AliasDocument["tokens"];
}

export const editCustomContrastsAtom = atom(
  null,
  (get, set, action: CustomContrastAction) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to edit custom contrast steps.");
    if (
      Object.keys(get(previewOverridesAtom)).some((id) =>
        id.startsWith("color."),
      )
    ) {
      throw new Error(
        "Select a saved mode before editing custom contrast steps.",
      );
    }
    const document = get(colorSystemDocumentAtom);
    const scale = document.scales.find((scale) => scale.id === action.scaleId);
    if (!scale) throw new Error("This color scale is unavailable.");
    const sets = get(modeSetsAtom);
    const { owner, mode, polarity, opposite } = get(
      customContrastEditingContextAtom,
    );
    if (mode && owner) {
      if (action.kind !== "value" && action.kind !== "reset")
        throw new Error(
          "Choose the default Contrast mode to change the step list or naming.",
        );
      if (
        !scale.customContrasts?.steps.some((step) => step.id === action.stepId)
      )
        throw new Error("This custom step is unavailable.");
      if (
        action.kind === "value" &&
        (!Number.isFinite(action.value) ||
          action.value < 1 ||
          action.value > 21)
      )
        throw new Error("Enter a contrast ratio between 1 and 21.");
      set(
        modeSetsAtom,
        sets.map((axis) =>
          axis.id !== owner.id
            ? axis
            : {
                ...axis,
                modes: axis.modes.map((candidate) => {
                  if (candidate.id !== mode.id) return candidate;
                  const color = { ...candidate.foundations.color };
                  const patches = { ...color.scaleContrasts };
                  const steps = { ...patches[scale.id] };
                  if (action.kind === "reset") delete steps[action.stepId];
                  else steps[action.stepId] = action.value;
                  if (Object.keys(steps).length) patches[scale.id] = steps;
                  else delete patches[scale.id];
                  if (Object.keys(patches).length)
                    color.scaleContrasts = patches;
                  else delete color.scaleContrasts;
                  return {
                    ...candidate,
                    foundations: { ...candidate.foundations, color },
                  };
                }),
              },
        ),
      );
      return;
    }
    if (opposite) {
      if (action.kind !== "value" && action.kind !== "reset")
        throw new Error(
          "Choose the reference color scheme to change the step list or naming.",
        );
      if (
        !scale.customContrasts?.steps.some((step) => step.id === action.stepId)
      )
        throw new Error("This custom step is unavailable.");
      if (
        action.kind === "value" &&
        (!Number.isFinite(action.value) ||
          action.value < 1 ||
          action.value > 21)
      )
        throw new Error("Enter a contrast ratio between 1 and 21.");
      set(colorSystemDocumentAtom, {
        ...document,
        scales: document.scales.map((candidate) =>
          candidate.id !== scale.id || !candidate.customContrasts
            ? candidate
            : {
                ...candidate,
                customContrasts: {
                  ...candidate.customContrasts,
                  steps: candidate.customContrasts.steps.map((step) => {
                    if (step.id !== action.stepId) return step;
                    if (action.kind === "value")
                      return contrastForEffectiveEdit(
                        step,
                        action.value,
                        polarity,
                      );
                    const next = { ...step };
                    delete next.oppositeValue;
                    return next;
                  }),
                },
              },
        ),
      });
      return;
    }
    let custom = scale.customContrasts;
    if (action.kind === "enable") {
      if (custom) return;
      custom = {
        steps: document.contrasts.map((step) => ({ ...step })),
        baseContrastId: document.contrasts[0].id,
        namingRuleId: STANDARD_SCALE_NAMING_RULE_ID,
      };
    } else if (action.kind === "disable") {
      custom = undefined;
    } else {
      if (!custom) throw new Error("Enable custom contrast steps first.");
      if (action.kind === "base")
        custom = { ...custom, baseContrastId: action.stepId };
      else if (action.kind === "rule")
        custom = { ...custom, namingRuleId: action.ruleId };
      else if (action.kind === "sort") {
        custom = {
          ...custom,
          steps: sortContrastSteps(custom.steps),
        };
      } else if (action.kind === "add") {
        const step: ContrastToken = {
          id: `contrast-custom-${crypto.randomUUID()}`,
          value: Math.min(21, custom.steps.at(-1)!.value + 0.5),
        };
        custom = { ...custom, steps: [...custom.steps, step] };
      } else if (action.kind === "remove") {
        if (!custom.steps.some((step) => step.id === action.stepId))
          throw new Error("This custom step is unavailable.");
        if (action.stepId === custom.baseContrastId)
          throw new Error(
            "Choose another base swatch before deleting this one.",
          );
        custom = {
          ...custom,
          steps: custom.steps.filter((step) => step.id !== action.stepId),
        };
      } else {
        if (!custom.steps.some((step) => step.id === action.stepId))
          throw new Error("This custom step is unavailable.");
        custom = {
          ...custom,
          steps: custom.steps.map((step) => {
            if (step.id !== action.stepId) return step;
            if (action.kind === "reset") {
              const next = { ...step };
              delete next.oppositeValue;
              return next;
            }
            if (
              !Number.isFinite(action.value) ||
              action.value < 1 ||
              action.value > 21
            )
              throw new Error("Enter a contrast ratio between 1 and 21.");
            return { ...step, value: action.value };
          }),
        };
      }
    }
    const nextScale = { ...scale };
    if (custom) nextScale.customContrasts = custom;
    else delete nextScale.customContrasts;
    const next = {
      ...document,
      scales: document.scales.map((candidate) =>
        candidate.id === scale.id ? nextScale : candidate,
      ),
    };
    assertCustomContrastNaming(next, get(rulesAtom));
    const remaining = new Set(
      (custom?.steps ?? document.contrasts).map((step) => step.id),
    );
    const removed = new Set(
      (scale.customContrasts?.steps ?? document.contrasts)
        .filter((step) => !remaining.has(step.id))
        .map((step) => tokenUuid(tokenStableKey(scale.id, step.id))),
    );
    const undo: CustomContrastUndo = {
      scaleId: scale.id,
      before: scale.customContrasts,
      after: custom,
      patches: sets.flatMap((axis) =>
        axis.modes.flatMap((mode) => {
          const values = mode.foundations.color?.scaleContrasts?.[scale.id];
          return values ? [{ modeId: mode.id, values }] : [];
        }),
      ),
      overrides: Object.fromEntries(
        Object.entries(get(tokenOverridesAtom)).filter(([id]) =>
          removed.has(id),
        ),
      ),
      browserEdits: Object.fromEntries(
        Object.entries(get(browserTokenEditsAtom)).filter(([id]) =>
          removed.has(id),
        ),
      ),
      aliases: [],
    };
    set(colorSystemDocumentAtom, next);
    set(modeSetsAtom, pruneCustomContrastPatches(sets, next.scales));
    if (removed.size) {
      set(
        tokenOverridesAtom,
        Object.fromEntries(
          Object.entries(get(tokenOverridesAtom)).filter(
            ([id]) => !removed.has(id),
          ),
        ),
      );
      set(
        browserTokenEditsAtom,
        Object.fromEntries(
          Object.entries(get(browserTokenEditsAtom)).filter(
            ([id]) => !removed.has(id),
          ),
        ),
      );
      const previous = get(aliasesAtom);
      const pruned = captureSnapshot(get).aliases;
      if (pruned) {
        undo.aliases = previous.tokens.filter(
          (alias) => !pruned.tokens.some((current) => current.id === alias.id),
        );
        set(aliasesAtom, pruned);
      }
    }
    return undo;
  },
);

export const restoreCustomContrastsAtom = atom(
  null,
  (get, set, undo: CustomContrastUndo) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to undo this change.");
    const document = get(colorSystemDocumentAtom);
    const scale = document.scales.find((scale) => scale.id === undo.scaleId);
    if (
      !scale ||
      JSON.stringify(scale.customContrasts) !== JSON.stringify(undo.after)
    )
      throw new Error(
        "This scale changed after deletion. Use Cancel to restore the last save.",
      );
    const restored = { ...scale };
    if (undo.before) restored.customContrasts = undo.before;
    else delete restored.customContrasts;
    const next = {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id === restored.id ? restored : scale,
      ),
    };
    assertCustomContrastNaming(next, get(rulesAtom));
    const retainedIds = new Set(undo.after?.steps.map((step) => step.id));
    const patches = undo.patches
      .map((patch) => ({
        ...patch,
        values: Object.fromEntries(
          Object.entries(patch.values).filter(([id]) => !retainedIds.has(id)),
        ),
      }))
      .filter((patch) => Object.keys(patch.values).length);
    assertCustomContrastPatchRestore(get(modeSetsAtom), patches);
    set(colorSystemDocumentAtom, next);
    set(
      modeSetsAtom,
      get(modeSetsAtom).map((axis) => ({
        ...axis,
        modes: axis.modes.map((mode) => {
          const patch = patches.find((patch) => patch.modeId === mode.id);
          if (!patch) return mode;
          return {
            ...mode,
            foundations: {
              ...mode.foundations,
              color: {
                ...mode.foundations.color,
                scaleContrasts: {
                  ...mode.foundations.color?.scaleContrasts,
                  [undo.scaleId]: {
                    ...patch.values,
                    ...mode.foundations.color?.scaleContrasts?.[undo.scaleId],
                  },
                },
              },
            },
          };
        }),
      })),
    );
    set(tokenOverridesAtom, { ...undo.overrides, ...get(tokenOverridesAtom) });
    set(browserTokenEditsAtom, {
      ...undo.browserEdits,
      ...get(browserTokenEditsAtom),
    });
    if (undo.aliases.length)
      set(aliasesAtom, (current) => ({
        ...current,
        tokens: [
          ...current.tokens,
          ...undo.aliases.filter(
            (alias) => !current.tokens.some((item) => item.id === alias.id),
          ),
        ],
      }));
  },
);
