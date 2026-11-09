// Copyright 2026 Adobe. All rights reserved.
export interface ComponentSizingDocument {
  schemaVersion: 1;
  componentSize: number;
}

export const COMPONENT_SIZING_DEFAULTS: ComponentSizingDocument = {
  schemaVersion: 1,
  componentSize: 1,
};

export const SIZING_PARAMETER_IDS = [
  "size.componentSize",
  "typography.textSize",
] as const;

export function upgradeTypographySizingDocument(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("schemaVersion" in value))
    return value;
  return value.schemaVersion === 8
    ? {
        ...value,
        schemaVersion: 9,
        ...(!("textSize" in value) && { textSize: 1 }),
      }
    : value;
}

export function upgradeSizingSettings(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    ...Object.fromEntries(
      SIZING_PARAMETER_IDS.filter((id) => !(id in value)).map((id) => [
        id,
        { modal: true, adaptive: false },
      ]),
    ),
  };
}

export function upgradeNativeSizingFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("foundations" in value))
    return value;
  const foundations = value.foundations;
  if (
    !foundations ||
    typeof foundations !== "object" ||
    !("typography" in foundations)
  )
    return value;
  return {
    ...value,
    ...(!("componentSizing" in value) && {
      componentSizing: { ...COMPONENT_SIZING_DEFAULTS },
    }),
    ...("foundationParameterSettings" in value && {
      foundationParameterSettings: upgradeSizingSettings(
        value.foundationParameterSettings,
      ),
    }),
    foundations: {
      ...foundations,
      typography: upgradeTypographySizingDocument(foundations.typography),
    },
  };
}

export function isSizingMultiplier(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isComponentSizingDocument(
  value: unknown,
): value is ComponentSizingDocument {
  return (
    value !== null &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    value.schemaVersion === 1 &&
    "componentSize" in value &&
    isSizingMultiplier(value.componentSize)
  );
}

export function resolveSizingFactors(values: Readonly<Record<string, number>>) {
  const componentSize = values["size.componentSize"] ?? 1;
  const textSize = values["typography.textSize"] ?? 1;
  const issues = SIZING_PARAMETER_IDS.filter(
    (id) => !isSizingMultiplier(values[id] ?? 1),
  ).map((id) => `${id} must be a positive finite multiplier.`);
  return issues.length
    ? ({ status: "unavailable", issues } as const)
    : ({ status: "ready", componentSize, textSize } as const);
}
