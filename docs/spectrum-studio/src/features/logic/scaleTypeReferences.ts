// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { BINDABLE_PARAMETER_RANGES } from "../modes/parameters";
import { setBindingPoint } from "../scales/binding";
import { BASE_BINDING_KEY } from "../scales/generate";
import type { ParameterBinding } from "../scales/interpolation";
import type { SpacingDocument } from "../spacing/model";
import { spacingDocumentAtom } from "../spacing/state";
import type { SizeDocument } from "../size/model";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import type { RadiusDocument } from "../radius/model";
import { RADIUS_SCALE_TYPE_ID } from "../scales/scaleType";
import type { DimensionScope } from "../taxonomy/model";
import type { DimensionScale } from "../scales/foundation";
import {
  GEOMETRIC_SCALE_TYPE_ID,
  SIZE_SCALE_TYPE_ID,
  SPACING_SCALE_TYPE_ID,
  TYPOGRAPHY_SCALE_TYPE_ID,
  type ScaleType,
} from "../scales/scaleType";
import type { TypographyDocument } from "../typography/model";
import { typographyDocumentAtom } from "../typography/state";
import {
  removeScaleTypeAtom,
  scaleTypeLibraryWithReplacement,
  scaleTypesAtom,
  type RemovedLibraryItem,
} from "./scaleTypeLibrary";
import { elevationDocumentAtom } from "../elevation/state";
import type { ElevationDocument } from "../elevation/model";
import type { IconScale, IconsDocument } from "../icons/model";
import { iconsDocumentAtom } from "../icons/documentState";
import {
  assertAuthoringUpdates,
  withValidatedAuthoringUpdates,
} from "../../state/authoringGuards";

export interface ScaleTypeConsumer {
  id: string;
  scaleTypeId: string;
  label: string;
}

/** Line height icon scales read a Typography line height, so they use no formula. */
function iconFormulaScales(icons?: IconsDocument) {
  return (icons?.scales ?? []).filter(
    (scale) => scale.source !== "line-height",
  );
}

/** Every foundation scale that uses a formula; the source for "Used by", the delete guard and the fallback. */
export function scaleTypeConsumers(
  spacing: SpacingDocument,
  size?: SizeDocument,
  typography?: TypographyDocument,
  radius?: RadiusDocument,
  elevation?: ElevationDocument,
  icons?: IconsDocument,
): ScaleTypeConsumer[] {
  return [
    ...(typography
      ? [
          {
            id: "typography/text-size",
            scaleTypeId: typography.scaleTypeId,
            label: "Typography › Font sizes",
          },
        ]
      : []),
    ...iconFormulaScales(icons).map((scale) => ({
      id: `icons/${scale.id}`,
      scaleTypeId:
        scale.source === "follow-typography"
          ? TYPOGRAPHY_SCALE_TYPE_ID
          : scale.scaleTypeId,
      label: `Icons › ${scale.name}`,
    })),
    ...spacing.scales.map((scale) => ({
      id: `spacing/${scale.id}`,
      scaleTypeId: scale.scaleTypeId,
      label: `Spacing › ${scale.name}`,
    })),
    ...(size?.scales ?? []).map((scale) => ({
      id: `size/${scale.id}`,
      scaleTypeId: scale.scaleTypeId,
      label: `Size › ${scale.name}`,
    })),
    ...(radius?.scales ?? []).map((scale) => ({
      id: `radius/${scale.id}`,
      scaleTypeId: scale.scaleTypeId,
      label: `Radius › ${scale.name}`,
    })),
    ...(elevation?.layers ?? []).map((layer) => ({
      id: `elevation/${layer.id}`,
      scaleTypeId: layer.scaleTypeId,
      label: `Elevation › ${layer.label}`,
    })),
  ];
}

export const scaleTypeConsumersAtom = atom((get) =>
  scaleTypeConsumers(
    get(spacingDocumentAtom),
    get(sizeDocumentAtom),
    get(typographyDocumentAtom),
    get(radiusDocumentAtom),
    get(elevationDocumentAtom),
    get(iconsDocumentAtom),
  ),
);

type Foundation = "typography" | "icons" | DimensionScope;

export interface IgnoredOverride {
  consumer: ScaleTypeConsumer;
  /** Names of the parts whose override the formula no longer allows. */
  parts: string[];
}

/** Foundation scales that set their own value for a part the draft formula does not allow overriding. */
export function ignoredOverrides(
  draft: ScaleType,
  typography: TypographyDocument,
  spacing: SpacingDocument,
  size: SizeDocument,
  radius?: RadiusDocument,
  icons?: IconsDocument,
): IgnoredOverride[] {
  const locked = draft.parameters.filter((parameter) => !parameter.overridable);
  const partsFor = (
    overrides: Readonly<Record<string, number>>,
    base: number | undefined,
  ) => [
    ...(!draft.base.overridable && base !== undefined ? ["Base"] : []),
    ...locked
      .filter((parameter) => overrides[parameter.id] !== undefined)
      .map((parameter) => parameter.label),
  ];
  const consumers = scaleTypeConsumers(
    spacing,
    size,
    typography,
    radius,
    undefined,
    icons,
  ).filter((consumer) => consumer.scaleTypeId === draft.id);
  const scales = (prefix: string, list: readonly DimensionScale[]) =>
    list.map((scale) => [`${prefix}/${scale.id}`, scale] as const);
  const byConsumer = new Map<
    string,
    Pick<DimensionScale, "parameters" | "base">
  >([
    ...scales("spacing", spacing.scales),
    ...scales("size", size.scales),
    ...scales("radius", radius?.scales ?? []),
    // Follow Typography uses the Type scale's own parameters, so only its base can be overridden.
    ...(icons?.scales ?? []).map(
      (scale) =>
        [
          `icons/${scale.id}`,
          scale.source === "formula"
            ? scale
            : { parameters: {}, base: scale.base },
        ] as const,
    ),
  ]);
  return consumers.flatMap((consumer) => {
    const scale = byConsumer.get(consumer.id);
    const parts = scale ? partsFor(scale.parameters, scale.base) : [];
    return parts.length > 0 ? [{ consumer, parts }] : [];
  });
}
const SHIPPED_FORMULA: Readonly<Record<Foundation, string>> = {
  typography: TYPOGRAPHY_SCALE_TYPE_ID,
  icons: TYPOGRAPHY_SCALE_TYPE_ID,
  spacing: SPACING_SCALE_TYPE_ID,
  size: SIZE_SCALE_TYPE_ID,
  radius: RADIUS_SCALE_TYPE_ID,
};

/** A missing formula falls back to the foundation's shipped one, else the first formula, else the hidden geometric fallback. */
export function fallbackScaleTypeId(
  foundation: Foundation,
  library: readonly ScaleType[],
  excludeId?: string,
) {
  const available = library.filter((scaleType) => scaleType.id !== excludeId);
  return (
    available.find((scaleType) => scaleType.id === SHIPPED_FORMULA[foundation])
      ?.id ??
    available[0]?.id ??
    GEOMETRIC_SCALE_TYPE_ID
  );
}

/** Parameters, bindings and the base override belong to one formula, so a fallback starts from its own values. */
function withFallback<Scale extends DimensionScale | IconScale>(
  scale: Scale,
  scaleTypeId: string,
): Scale {
  const { bindings, base, ...rest } = scale;
  void bindings;
  void base;
  return { ...rest, scaleTypeId, parameters: {} } as Scale;
}

function typographyWithFallback(
  document: TypographyDocument,
  scaleTypeId: string,
): TypographyDocument {
  if (scaleTypeId !== TYPOGRAPHY_SCALE_TYPE_ID)
    throw new Error("Typography requires its shared Type scale.");
  return { ...document, scaleTypeId };
}

export type RemovedScaleType = RemovedLibraryItem<ScaleType>;

type ScaleTransform = <Scale extends DimensionScale | IconScale>(
  scale: Scale,
  foundation: DimensionScope | "icons",
) => Scale;

/** Only Formula icon scales own their formula settings; the others follow Typography. */
function iconsWithTransform(icons: IconsDocument, transform: ScaleTransform) {
  const scales = icons.scales.map((scale) =>
    scale.source === "formula" ? transform(scale, "icons") : scale,
  );
  return scales.some((scale, index) => scale !== icons.scales[index])
    ? { ...icons, scales }
    : icons;
}

function mapScales(get: Getter, set: Setter, transform: ScaleTransform) {
  const spacing = get(spacingDocumentAtom);
  const spacingScales = spacing.scales.map((scale) =>
    transform(scale, "spacing"),
  );
  if (spacingScales.some((scale, index) => scale !== spacing.scales[index]))
    set(spacingDocumentAtom, { ...spacing, scales: spacingScales });
  const size = get(sizeDocumentAtom);
  const sizeScales = size.scales.map((scale) => transform(scale, "size"));
  if (sizeScales.some((scale, index) => scale !== size.scales[index]))
    set(sizeDocumentAtom, { ...size, scales: sizeScales });
  const radius = get(radiusDocumentAtom);
  const radiusScales = radius.scales.map((scale) => transform(scale, "radius"));
  if (radiusScales.some((scale, index) => scale !== radius.scales[index]))
    set(radiusDocumentAtom, { ...radius, scales: radiusScales });
  const icons = get(iconsDocumentAtom);
  const nextIcons = iconsWithTransform(icons, transform);
  if (nextIcons !== icons) set(iconsDocumentAtom, nextIcons);
}

/** Deleting is refused while any foundation scale uses the formula; the editor lists where it is used. */
export const deleteScaleTypeAtom = atom(
  null,
  (get, set, id: string): RemovedScaleType | null => {
    if (
      get(scaleTypeConsumersAtom).some(
        (consumer) => consumer.scaleTypeId === id,
      )
    )
      return null;
    return set(removeScaleTypeAtom, id);
  },
);

/** Removal that cannot be refused, such as reverting a formula a saved change added: consumers move to the fallback. */
export const removeScaleTypeWithFallbackAtom = atom(
  null,
  (get, set, id: string): RemovedScaleType | null => {
    const current = get(scaleTypesAtom);
    const item = current.find((formula) => formula.id === id);
    if (!item || item.locked || id === TYPOGRAPHY_SCALE_TYPE_ID) return null;
    const library = current.filter((formula) => formula.id !== id);
    const transform: ScaleTransform = (scale, foundation) =>
      scale.scaleTypeId === id
        ? withFallback(scale, fallbackScaleTypeId(foundation, library))
        : scale;
    const typography = get(typographyDocumentAtom);
    const nextTypography =
      typography.scaleTypeId === id
        ? typographyWithFallback(
            typography,
            fallbackScaleTypeId("typography", library),
          )
        : typography;
    const updates = new Map<string, unknown>([
      ["logic/scale-types", library],
      ["foundations/typography", nextTypography],
      [
        "foundations/icons",
        iconsWithTransform(get(iconsDocumentAtom), transform),
      ],
    ]);
    for (const [scope, document] of [
      ["spacing", get(spacingDocumentAtom)],
      ["size", get(sizeDocumentAtom)],
      ["radius", get(radiusDocumentAtom)],
    ] as const)
      updates.set(`foundations/${scope}`, {
        ...document,
        scales: document.scales.map((scale) => transform(scale, scope)),
      });
    assertAuthoringUpdates(get, updates);
    mapScales(get, set, transform);
    if (nextTypography !== typography)
      set(typographyDocumentAtom, nextTypography);
    return set(removeScaleTypeAtom, id);
  },
);

/** References to a missing formula move to the foundation's fallback. Safe to run after every change. */
export const normalizeScaleTypeReferencesAtom = atom(null, (get, set) => {
  const library = get(scaleTypesAtom);
  // With no formulas left every reference resolves to the hidden fallback, so there is nothing to move to.
  if (library.length === 0) return false;
  const known = new Set(library.map((scaleType) => scaleType.id));
  const typography = get(typographyDocumentAtom);
  const typographyMissing = !known.has(typography.scaleTypeId);
  const scalesMissing = [
    ...get(spacingDocumentAtom).scales,
    ...get(sizeDocumentAtom).scales,
    ...get(radiusDocumentAtom).scales,
    ...get(iconsDocumentAtom).scales.filter(
      (scale) => scale.source === "formula",
    ),
  ].some((scale) => !known.has(scale.scaleTypeId));
  if (!typographyMissing && !scalesMissing) return false;
  mapScales(get, set, (scale, foundation) =>
    known.has(scale.scaleTypeId)
      ? scale
      : withFallback(scale, fallbackScaleTypeId(foundation, library)),
  );
  if (typographyMissing)
    set(
      typographyDocumentAtom,
      typographyWithFallback(
        typography,
        fallbackScaleTypeId("typography", library),
      ),
    );
  return true;
});

type Bindings = Readonly<Record<string, ParameterBinding>>;

/** A locked part always equals the formula's value, so its binding's neutral point must too. */
function alignLockedBindings(
  bindings: Bindings | undefined,
  formula: ScaleType,
  includeBase: boolean,
): Bindings | undefined {
  if (!bindings) return bindings;
  const next = { ...bindings };
  let changed = false;
  const align = (key: string, locked: boolean, value: number) => {
    const binding = bindings[key];
    const neutral =
      binding && BINDABLE_PARAMETER_RANGES[binding.modeParameterId]?.neutral;
    if (!locked || neutral === undefined) return;
    const point = binding.points.find((candidate) => candidate.at === neutral);
    if (!point || point.value === value) return;
    next[key] = setBindingPoint(binding, neutral, value);
    changed = true;
  };
  if (includeBase)
    align(BASE_BINDING_KEY, !formula.base.overridable, formula.base.default);
  for (const parameter of formula.parameters)
    align(parameter.id, !parameter.overridable, parameter.default);
  return changed ? next : bindings;
}

function withAlignedBindings<Scale extends DimensionScale | IconScale>(
  scale: Scale,
  formula?: ScaleType,
): Scale {
  const bindings =
    formula && alignLockedBindings(scale.bindings, formula, true);
  return bindings && bindings !== scale.bindings
    ? { ...scale, bindings }
    : scale;
}

export const replaceScaleTypeWithConsumersAtom = atom(
  null,
  (get, set, item: ScaleType) => {
    const library = scaleTypeLibraryWithReplacement(get, item);
    const transform: ScaleTransform = (scale) =>
      withAlignedBindings(
        scale,
        library.find((formula) => formula.id === scale.scaleTypeId),
      );
    const spacing = get(spacingDocumentAtom);
    const size = get(sizeDocumentAtom);
    const radius = get(radiusDocumentAtom);
    const icons = get(iconsDocumentAtom);
    const nextSpacing = {
      ...spacing,
      scales: spacing.scales.map((scale) => transform(scale, "spacing")),
    };
    const nextSize = {
      ...size,
      scales: size.scales.map((scale) => transform(scale, "size")),
    };
    const nextRadius = {
      ...radius,
      scales: radius.scales.map((scale) => transform(scale, "radius")),
    };
    const nextIcons = iconsWithTransform(icons, transform);
    const updates = new Map<string, unknown>([
      ["logic/scale-types", library],
      ["foundations/spacing", nextSpacing],
      ["foundations/size", nextSize],
      ["foundations/radius", nextRadius],
      ["foundations/icons", nextIcons],
    ]);
    withValidatedAuthoringUpdates(get, updates, () => {
      set(scaleTypesAtom, library);
      if (
        nextSpacing.scales.some(
          (scale, index) => scale !== spacing.scales[index],
        )
      )
        set(spacingDocumentAtom, nextSpacing);
      if (nextSize.scales.some((scale, index) => scale !== size.scales[index]))
        set(sizeDocumentAtom, nextSize);
      if (
        nextRadius.scales.some((scale, index) => scale !== radius.scales[index])
      )
        set(radiusDocumentAtom, nextRadius);
      if (nextIcons !== icons) set(iconsDocumentAtom, nextIcons);
    });
  },
);

/** Re-aligns adaptive bindings of locked parts after a formula changes. Safe to run after every change. */
export const normalizeLockedBindingsAtom = atom(null, (get, set) => {
  const library = get(scaleTypesAtom);
  const formulaFor = (id: string) =>
    library.find((scaleType) => scaleType.id === id);
  mapScales(get, set, (scale) => {
    const formula = formulaFor(scale.scaleTypeId);
    return withAlignedBindings(scale, formula);
  });
});
