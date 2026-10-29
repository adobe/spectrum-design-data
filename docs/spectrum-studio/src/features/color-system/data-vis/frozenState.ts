// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import { colorSystemDocumentAtom } from "../state";
import { resolveColorDocument } from "../resolution";
import { resolvedBackgroundLinear } from "../surfaceGeneration";
import { modeSetsAtom } from "../../modes/state";
import { modeSetDefaultMode } from "../../modes/model";
import { editModeAtom } from "../../../state/view/editMode";
import { rulesAtom } from "../../logic/library";
import {
  generateColorTokensForScale,
  generatePaletteTokens,
} from "../../tokens/generation";
import { tokenOverridesAtom } from "../../tokens/overrides";
import { resolveToken } from "../../tokens/model";
import { browserTokenEditsAtom } from "../../tokens/browserEdits";
import {
  canonicalTokenModeKey,
  resolveBrowserColorToken,
} from "../../tokens/colorResolution";
import {
  dataVisContinuousOutputsAtom,
  dataVisContextFingerprintAtom,
  dataVisInputDocumentAtom,
  dataVisPrimitiveColorsAtom,
  dataVisUiSwatchesAtom,
  resolvedCategoricalTokensAtom,
} from "./state";
import { finalUiSwatches, resolveDataVisPoints } from "./resolution";
import {
  linkedPrimitiveColor,
  publishedPrimitiveColors,
} from "./primitiveColors";
import { resolvedCategoricalColors } from "./categoricalValues";
import {
  isDataVisScale,
  frozenColorValue,
  type DataVisScale,
  type FrozenColor,
} from "./model";
import { dataVisMemberId } from "./identity";
import { dataVisSourceIssues } from "./references";
import { concreteColor } from "./colors";

function editableScale(get: Getter, scaleId: string) {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to change data vis scales.");
  const document = get(colorSystemDocumentAtom),
    scale = document.dataVisScales.find((scale) => scale.id === scaleId);
  if (!scale) throw new Error("This data vis scale is unavailable.");
  return { document, scale };
}

function validate(get: Getter, scale: DataVisScale) {
  if (!isDataVisScale(scale))
    throw new Error(
      "Keep valid colors, ordered endpoints and the diverging center.",
    );
  const document = get(colorSystemDocumentAtom);
  const issues = dataVisSourceIssues(
    {
      ...document,
      dataVisScales: document.dataVisScales.map((item) =>
        item.id === scale.id ? scale : item,
      ),
    },
    get(modeSetsAtom),
  );
  if (issues.length) throw new Error(issues.join(" "));
}

function recipeKey(get: Getter, scale: DataVisScale) {
  const patches = get(modeSetsAtom).flatMap((axis) =>
    axis.modes.flatMap((mode) => {
      const sources = mode.foundations.color?.dataVisSources?.[scale.id],
        contrasts = mode.foundations.color?.dataVisContrasts?.[scale.id];
      return sources || contrasts
        ? [[axis.id, mode.id, sources, contrasts]]
        : [];
    }),
  );
  const values =
    scale.kind === "categorical"
      ? scale.members.map((member) => {
          const id = dataVisMemberId(scale.id, member.id);
          return [id, get(browserTokenEditsAtom)[id]?.values];
        })
      : [];
  return JSON.stringify([
    scale.kind,
    scale.kind === "categorical"
      ? [scale.members, scale.preferences]
      : scale.points,
    patches,
    values,
  ]);
}

export interface StaticColorsUndo {
  scaleId: string;
  before?: FrozenColor[];
  after?: FrozenColor[];
  recipeKey: string;
}

export const setDataVisStaticAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scaleId: string;
      from?: "current" | "default";
      fingerprint?: string;
    },
  ): StaticColorsUndo => {
    const { document, scale } = editableScale(get, input.scaleId);
    if (
      input.fingerprint !== undefined &&
      input.fingerprint !== get(dataVisContextFingerprintAtom)
    ) {
      throw new Error(
        "The displayed colors changed. Reopen the Static choice before applying.",
      );
    }
    if (!input.from && !scale.staticColors)
      throw new Error(
        "Choose current or default-mode colors before turning on Static.",
      );
    let next: DataVisScale;
    if (!input.from) {
      const { staticColors, ...adaptive } = scale;
      void staticColors;
      next = adaptive;
    } else {
      if (scale.staticColors)
        throw new Error("This scale already has Static colors.");
      const sets = get(modeSetsAtom),
        edits = get(browserTokenEditsAtom);
      let raw = get(dataVisInputDocumentAtom),
        swatches = get(dataVisUiSwatchesAtom),
        primitives = get(dataVisPrimitiveColorsAtom);
      let categorical: readonly {
        id: string;
        value: string | number;
        validationError?: string;
      }[] = get(resolvedCategoricalTokensAtom);
      if (input.from === "default") {
        const modes = sets.flatMap((axis) => {
          const mode = modeSetDefaultMode(axis);
          return mode ? [mode] : [];
        });
        const resolved = resolveColorDocument(document, modes, undefined, {
          modeSets: sets,
        });
        raw = resolveColorDocument(document, modes, undefined, {
          modeSets: sets,
          applyMultiplier: false,
          applyPolarity: false,
        });
        const modeKey = canonicalTokenModeKey(
          Object.fromEntries(sets.map((axis) => [axis.id, axis.defaultModeId])),
        );
        const tokens = [
          ...generatePaletteTokens(
            resolved.palette,
            resolved.settings.colorOutput,
          ),
          ...resolved.scales.flatMap((source) =>
            generateColorTokensForScale(
              source,
              resolved.contrasts,
              resolvedBackgroundLinear(resolved),
              resolved.settings,
              resolved.settings.colorOutput,
              get(rulesAtom),
            ),
          ),
        ].map((token) =>
          resolveBrowserColorToken(
            resolveToken(token, get(tokenOverridesAtom)[token.uuid]),
            edits,
            modeKey,
            resolved,
          ),
        );
        swatches = finalUiSwatches(resolved, tokens);
        const members = resolvedCategoricalColors(
          resolved,
          swatches,
          edits,
          modeKey,
          { includeUnpublished: true },
        );
        primitives = publishedPrimitiveColors(resolved, tokens, members);
        categorical = members;
      }
      const effective = raw.dataVisScales.find((item) => item.id === scale.id);
      if (!effective || effective.kind !== scale.kind)
        throw new Error("This scale's displayed recipe is unavailable.");
      const colors: FrozenColor[] =
        effective.kind === "categorical"
          ? effective.members.map((member) => {
              const token = categorical.find(
                (token) => token.id === dataVisMemberId(scale.id, member.id),
              );
              if (
                !token ||
                token.validationError ||
                typeof token.value !== "string"
              )
                throw new Error(
                  token?.validationError ??
                    "A categorical color is unavailable.",
                );
              concreteColor(token.value);
              return { id: member.id, value: token.value };
            })
          : resolveDataVisPoints(raw, effective, swatches, primitives).map(
              (point) => ({
                id: point.id,
                position: point.position,
                value: point.value,
              }),
            );
      next = { ...scale, staticColors: colors };
    }
    validate(get, next);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((item) =>
        item.id === next.id ? next : item,
      ),
    });
    return structuredClone({
      scaleId: scale.id,
      before: scale.staticColors,
      after: next.staticColors,
      recipeKey: recipeKey(get, next),
    });
  },
);

export const undoDataVisStaticAtom = atom(
  null,
  (get, set, undo: StaticColorsUndo) => {
    const { document, scale } = editableScale(get, undo.scaleId);
    if (
      JSON.stringify(scale.staticColors) !== JSON.stringify(undo.after) ||
      recipeKey(get, scale) !== undo.recipeKey
    ) {
      throw new Error(
        "This scale changed. Undo cannot overwrite a later edit.",
      );
    }
    const { staticColors, ...base } = scale;
    void staticColors;
    const next = {
      ...base,
      ...(undo.before && { staticColors: structuredClone(undo.before) }),
    };
    validate(get, next);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((item) =>
        item.id === next.id ? next : item,
      ),
    });
  },
);

export const editDataVisStaticColorAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scaleId: string;
      colorId: string;
      value?: string;
      tokenId?: string | null;
      position?: number;
      resetOverride?: boolean;
    },
  ) => {
    const { document, scale } = editableScale(get, input.scaleId);
    if (!scale.staticColors)
      throw new Error("This scale is Adaptive, not Static.");
    const previous = scale.staticColors.find(
      (color) => color.id === input.colorId,
    );
    if (!previous) throw new Error("This captured color is unavailable.");
    const nextColor = { ...previous };
    if (input.position !== undefined) {
      if (
        scale.kind === "categorical" ||
        previous.position === 0 ||
        previous.position === 1 ||
        (scale.kind === "diverging" && previous.position === 0.5)
      )
        throw new Error("Keep the endpoints and the diverging center.");
      nextColor.position = input.position;
    }
    if (input.tokenId !== undefined) {
      if (input.tokenId === null) {
        nextColor.value = frozenColorValue(previous);
        delete nextColor.tokenId;
      } else {
        const token = linkedPrimitiveColor(
          input.tokenId,
          get(dataVisPrimitiveColorsAtom),
        );
        nextColor.value = token.value;
        nextColor.tokenId = token.id;
      }
      delete nextColor.overrideValue;
    }
    if (input.value !== undefined) {
      concreteColor(input.value);
      nextColor.value = input.value;
      delete nextColor.tokenId;
      delete nextColor.overrideValue;
    }
    if (input.resetOverride) delete nextColor.overrideValue;
    const next = {
      ...scale,
      staticColors: scale.staticColors.map((color) =>
        color.id === previous.id ? nextColor : color,
      ),
    };
    validate(get, next);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((item) =>
        item.id === next.id ? next : item,
      ),
    });
  },
);

export const editDataVisStaticStopsAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scaleId: string;
      kind: "add" | "remove";
      colorId?: string;
      position?: number;
    },
  ) => {
    const { document, scale } = editableScale(get, input.scaleId);
    if (scale.kind === "categorical" || !scale.staticColors)
      throw new Error("This continuous scale has no Static stops.");
    let colors = [...scale.staticColors],
      selectedId: string;
    if (input.kind === "remove") {
      const color = colors.find((color) => color.id === input.colorId);
      if (
        !color ||
        color.position === 0 ||
        color.position === 1 ||
        (scale.kind === "diverging" && color.position === 0.5)
      ) {
        throw new Error("Keep the endpoints and the diverging center.");
      }
      colors = colors.filter((candidate) => candidate.id !== color.id);
      selectedId = colors[0].id;
    } else {
      const gaps = colors.slice(1).map((color, index) => ({
        a: colors[index].position!,
        b: color.position!,
      }));
      const gap = gaps.sort(
        (first, second) => second.b - second.a - (first.b - first.a),
      )[0];
      const position = input.position ?? (gap.a + gap.b) / 2;
      const output = get(dataVisContinuousOutputsAtom).find(
        (output) => output.status === "ready" && output.scale.id === scale.id,
      );
      if (output?.status !== "ready")
        throw new Error(
          "This scale must have valid colors before adding a stop.",
        );
      selectedId = crypto.randomUUID();
      colors.push({
        id: selectedId,
        position,
        value: output.scale.evaluate(position),
      });
      colors.sort((first, second) => first.position! - second.position!);
    }
    const next = { ...scale, staticColors: colors };
    validate(get, next);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((item) =>
        item.id === next.id ? next : item,
      ),
    });
    return {
      selectedId,
      undo: structuredClone({
        scaleId: scale.id,
        before: scale.staticColors,
        after: colors,
        recipeKey: recipeKey(get, next),
      }),
    };
  },
);
