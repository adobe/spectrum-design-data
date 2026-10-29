// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  createDimensionFoundationState,
  isDimensionScaleNameTaken,
} from "../scales/foundationState";
import {
  replaceScaleTypeAtom,
  scaleTypesAtom,
} from "../logic/scaleTypeLibrary";
import { BASE_BINDING_KEY } from "../scales/generate";
import { setBindingPoint } from "../scales/binding";
import { BINDABLE_PARAMETER_RANGES } from "../modes/parameters";
import { RADIUS_DEFAULTS } from "./defaults";
import { RADIUS_SCHEMA_VERSION } from "./model";

const foundation = createDimensionFoundationState({
  key: "foundations/radius",
  schemaVersion: RADIUS_SCHEMA_VERSION,
  defaults: RADIUS_DEFAULTS,
  tokenPrefix: "radius",
  customIdPrefix: "radius-scale-custom",
});
export const radiusDocumentAtom = foundation.documentAtom;
export const generatedRadiusAtom = foundation.generatedAtom;
export const addRadiusScaleAtom = foundation.addScaleAtom;
export const updateRadiusScaleAtom = foundation.updateScaleAtom;
export const removeRadiusScaleAtom = foundation.removeScaleAtom;
export const restoreRadiusScaleAtom = foundation.restoreScaleAtom;
export const isRadiusScaleNameTaken = isDimensionScaleNameTaken;

export const updateRadiusFormulaPartAtom = atom(
  null,
  (
    get,
    set,
    {
      scaleId,
      parameterId,
      value,
    }: {
      scaleId: string;
      parameterId: string;
      value: number;
    },
  ) => {
    const document = get(radiusDocumentAtom);
    const scale = document.scales.find((scale) => scale.id === scaleId);
    const formula = get(scaleTypesAtom).find(
      (formula) => formula.id === scale?.scaleTypeId,
    );
    if (!scale || !formula)
      throw new Error(
        "This radius scale or its formula is no longer available.",
      );
    if (formula.locked) throw new Error("This formula is read-only.");
    if (!Number.isFinite(value))
      throw new Error("Enter a finite formula value.");
    const base = parameterId === BASE_BINDING_KEY;
    if (
      !base &&
      !formula.parameters.some((parameter) => parameter.id === parameterId)
    ) {
      throw new Error("This formula variable is no longer available.");
    }
    set(
      replaceScaleTypeAtom,
      base
        ? { ...formula, base: { ...formula.base, default: value } }
        : {
            ...formula,
            parameters: formula.parameters.map((parameter) =>
              parameter.id === parameterId
                ? { ...parameter, default: value }
                : parameter,
            ),
          },
    );
    set(radiusDocumentAtom, {
      ...document,
      scales: document.scales.map((candidate) => {
        if (candidate.scaleTypeId !== formula.id) return candidate;
        const parameters = { ...candidate.parameters };
        const { base: previousBase, ...rest } = candidate;
        if (!base) delete parameters[parameterId];
        const bindings = { ...candidate.bindings };
        const binding = bindings[parameterId];
        const neutral =
          binding &&
          BINDABLE_PARAMETER_RANGES[binding.modeParameterId]?.neutral;
        if (binding && neutral !== undefined)
          bindings[parameterId] = setBindingPoint(binding, neutral, value);
        return {
          ...rest,
          ...(!base && previousBase !== undefined && { base: previousBase }),
          parameters,
          ...(candidate.bindings && { bindings }),
        };
      }),
    });
  },
);
