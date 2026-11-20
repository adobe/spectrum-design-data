// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { editModeAtom } from "../../state/view/editMode";
import { rulesAtom } from "../logic/library";
import { interpolationsAtom, scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { clampScaleRange } from "../scales/generate";
import { TYPOGRAPHY_SCALE_TYPE_ID } from "../scales/scaleType";
import {
  resolvedTypographyDocumentAtom,
  typographyDocumentAtom,
} from "../typography/state";
import { iconsDocumentAtom } from "./documentState";
import { generateIconScale, validateIconsGeneration } from "./generate";
import {
  isIconsDocument,
  WORKFLOW_ICON_SCALE_ID,
  withIconsRoundingRule,
  type GeneratedIconValue,
  type IconScale,
  type IconsDocument,
} from "./model";
import type { SpectrumIconName } from "./spectrumIconCatalog.generated";
import { deferPersistedNumeric } from "../edit-session/numericProposal";

export { iconsDocumentAtom } from "./documentState";

export type IconScalePatch = Partial<
  Pick<
    IconScale,
    | "name"
    | "source"
    | "lineHeightId"
    | "scaleTypeId"
    | "base"
    | "below"
    | "above"
    | "startStep"
    | "parameters"
    | "bindings"
  >
>;

export type IconsSettingsPatch = Partial<
  Pick<IconsDocument, "roundingRuleId" | "minIconSize" | "maxIconSize">
>;

export interface GeneratedIconScale {
  scale: IconScale;
  values: GeneratedIconValue[];
  issue?: string;
}

const ICON_SCALE_ID_PREFIX = "icons-scale-custom";

/** Preview-only sample icon chosen for each icon scale, keyed by scale id; not saved with the design data. */
export const iconScaleSampleIconsAtom = atom<Record<string, SpectrumIconName>>(
  {},
);

/** Icon sizes at the active text zoom, one entry per scale; a scale that cannot generate reports why instead. */
export const generatedIconsAtom = atom((get): GeneratedIconScale[] => {
  const icons = get(iconsDocumentAtom);
  const typography = get(resolvedTypographyDocumentAtom);
  const library = {
    rules: get(rulesAtom),
    scaleTypes: get(scaleTypesAtom),
    interpolations: get(interpolationsAtom),
  };
  return icons.scales.map((scale) => {
    try {
      const values = generateIconScale(
        icons,
        scale,
        typography,
        typography.textZoom,
        library,
      );
      return values.every((value) => Number.isFinite(value.value))
        ? { scale, values }
        : {
            scale,
            values,
            issue: "Some icon sizes could not be calculated.",
          };
    } catch (failure) {
      return {
        scale,
        values: [],
        issue: failure instanceof Error ? failure.message : String(failure),
      };
    }
  });
});

export function isIconScaleNameTaken(
  document: IconsDocument,
  name: string,
  exceptId?: string,
) {
  const key = name.trim().toLowerCase();
  return document.scales.some(
    (scale) => scale.id !== exceptId && scale.name.trim().toLowerCase() === key,
  );
}

function commitIcons(get: Getter, set: Setter, next: IconsDocument) {
  if (!get(editModeAtom)) throw new Error("Enter edit mode to change Icons.");
  if (!isIconsDocument(next))
    throw new Error("Enter valid Icons settings, ranges, and references.");
  if (
    !get(rulesAtom).some(
      (rule) => rule.id === next.roundingRuleId && rule.type === "rounding",
    )
  )
    throw new Error("Choose an available rounding rule.");
  if (deferPersistedNumeric("foundations/icons", get(iconsDocumentAtom), next))
    return;
  validateIconsGeneration(next, get(typographyDocumentAtom), {
    rules: get(rulesAtom),
    scaleTypes: get(scaleTypesAtom),
    interpolations: get(interpolationsAtom),
  });
  withValidatedAuthoringUpdates(
    get,
    new Map([["foundations/icons", next]]),
    () => {
      set(iconsDocumentAtom, next);
    },
  );
}

export const updateIconsSettingsAtom = atom(
  null,
  (get, set, patch: IconsSettingsPatch) => {
    const document = get(iconsDocumentAtom);
    const { roundingRuleId, ...limits } = patch;
    const next = {
      ...(roundingRuleId === undefined
        ? document
        : withIconsRoundingRule(document, roundingRuleId)),
      ...limits,
    };
    commitIcons(get, set, next);
  },
);

/** Applies a scale patch; changing the size source or formula starts from that source's own settings. */
export function patchIconScale(
  scale: IconScale,
  patch: IconScalePatch,
  fallbackLineHeightId?: string,
): IconScale {
  const clean: IconScalePatch = { ...patch };
  if (clean.name !== undefined) clean.name = clean.name.trim();
  if (clean.below !== undefined || clean.above !== undefined) {
    const range = clampScaleRange(
      clean.below ?? scale.below,
      clean.above ?? scale.above,
    );
    if (clean.below !== undefined) clean.below = range.below;
    if (clean.above !== undefined) clean.above = range.above;
  }
  const source = clean.source ?? scale.source;
  const scaleTypeId =
    source === "follow-typography"
      ? TYPOGRAPHY_SCALE_TYPE_ID
      : (clean.scaleTypeId ?? scale.scaleTypeId);
  const { lineHeightId, bindings, base, parameters, ...rest } = {
    ...scale,
    ...clean,
  };
  const resetsFormula = scaleTypeId !== scale.scaleTypeId;
  const nextLineHeight = lineHeightId ?? fallbackLineHeightId;
  return {
    ...rest,
    source,
    scaleTypeId,
    ...(source === "line-height" &&
      nextLineHeight !== undefined && { lineHeightId: nextLineHeight }),
    ...(base !== undefined &&
      (!resetsFormula || clean.base !== undefined) && { base }),
    parameters: resetsFormula ? (clean.parameters ?? {}) : parameters,
    ...(!resetsFormula &&
      bindings &&
      Object.keys(bindings).length > 0 && { bindings }),
  };
}

export const updateIconScaleAtom = atom(
  null,
  (get, set, { id, patch }: { id: string; patch: IconScalePatch }) => {
    const document = get(iconsDocumentAtom);
    const current = document.scales.find((scale) => scale.id === id);
    if (!current) return false;
    if (
      patch.name !== undefined &&
      (!patch.name.trim() || isIconScaleNameTaken(document, patch.name, id))
    )
      return false;
    const typography = get(typographyDocumentAtom);
    const next = {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id === id
          ? patchIconScale(
              scale,
              patch,
              typography.previewLineHeightId ?? typography.lineHeights[0]?.id,
            )
          : scale,
      ),
    };
    commitIcons(get, set, next);
    return true;
  },
);

function nextScaleName(document: IconsDocument) {
  let index = document.scales.length + 1;
  while (isIconScaleNameTaken(document, `Scale ${index}`)) index++;
  return `Scale ${index}`;
}

/** New scales start as a copy of Workflow so they render immediately. */
export const addIconScaleAtom = atom(null, (get, set) => {
  const document = get(iconsDocumentAtom);
  const workflow =
    document.scales.find((scale) => scale.id === WORKFLOW_ICON_SCALE_ID) ??
    document.scales[0];
  const scale: IconScale = {
    ...structuredClone(workflow),
    id: `${ICON_SCALE_ID_PREFIX}-${crypto.randomUUID()}`,
    name: nextScaleName(document),
  };
  const next = { ...document, scales: [...document.scales, scale] };
  commitIcons(get, set, next);
  return scale.id;
});

export interface RemovedIconScale {
  scale: IconScale;
  index: number;
}

/** Workflow publishes the icon size tokens, so it cannot be removed. */
export const removeIconScaleAtom = atom(
  null,
  (get, set, id: string): RemovedIconScale | undefined => {
    if (id === WORKFLOW_ICON_SCALE_ID) return undefined;
    const document = get(iconsDocumentAtom);
    const index = document.scales.findIndex((scale) => scale.id === id);
    if (index < 0) return undefined;
    const next = {
      ...document,
      scales: document.scales.filter((scale) => scale.id !== id),
    };
    commitIcons(get, set, next);
    return { scale: document.scales[index], index };
  },
);

export const restoreIconScaleAtom = atom(
  null,
  (get, set, { scale, index }: RemovedIconScale) => {
    const document = get(iconsDocumentAtom);
    if (document.scales.some((candidate) => candidate.id === scale.id)) return;
    const scales = [...document.scales];
    scales.splice(Math.min(index, scales.length), 0, {
      ...scale,
      roundingRuleId: document.roundingRuleId,
    });
    const next = { ...document, scales };
    commitIcons(get, set, next);
  },
);
