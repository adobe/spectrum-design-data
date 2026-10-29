// Copyright 2026 Adobe. All rights reserved.
import { createColorDefaults } from "../../data/defaults";
import type { ColorSystemDocument } from "../color-system/model";
import {
  contrastMultiplier,
  contrastReference,
  polarityCompensation,
} from "../color-system/polarity";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import {
  generateColorTokensForScale,
  generatePaletteTokens,
} from "../tokens/generation";
import {
  PALETTE_SCALE_ID,
  tokenDisplayName,
  type GeneratedToken,
  type ResolvedToken,
} from "../tokens/model";
import {
  classificationPreviewKind,
  createValuePreview,
  PREVIEW_TERM_IDS,
  unavailablePreview,
  type ValuePreviewDescriptor,
  type ValuePreviewKind,
} from "../tokens/valuePreview";
import { STRUCTURE_CATEGORY_IDS } from "../structures/vocabulary";
import { MODE_SET_DEFAULTS, type ModeSet } from "../modes/model";
import type { CascadeTokenRow } from "../tokens/cascadeExport";
import type { TokenOverrideMap } from "../tokens/overrides";
import { TYPOGRAPHY_DEFAULTS } from "../typography/defaults";
import type { TypographyDocument } from "../typography/model";
import { SPACING_DEFAULTS } from "../spacing/defaults";
import type { SpacingDocument } from "../spacing/model";
import { SIZE_DEFAULTS } from "../size/defaults";
import type { SizeDocument } from "../size/model";
import type { RadiusDocument } from "../radius/model";
import { RADIUS_DEFAULTS } from "../radius/defaults";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import {
  INTERPOLATION_DEFAULTS,
  SCALE_TYPE_DEFAULTS,
} from "../logic/scaleTypeLibrary";
import type { Interpolation } from "../scales/interpolationDefinition";
import type { ScaleType } from "../scales/scaleType";
import type { AuthoredAddress, ChangeContext } from "./contract";

export type ChangeTopic =
  | "foundations"
  | "tokens"
  | "modes"
  | "logic"
  | "registry"
  | "structures"
  | "components"
  | "platforms";
export type ChangeKind = "modified" | "new" | "removed" | "deprecated";
export type FoundationKind =
  | "palette-color"
  | "scale"
  | "data-vis-scale"
  | "contrast"
  | "surface"
  | "settings"
  | "typography"
  | "spacing-scale"
  | "size-scale"
  | "radius-scale"
  | "elevation"
  | "mode-set"
  | "mode"
  | "rule"
  | "scale-type"
  | "interpolation"
  | "taxonomy"
  | "structure";

export interface ChangeField {
  id?: string;
  key: string;
  context?: ChangeContext;
  address?: AuthoredAddress;
  tokenValue?: {
    tokenId: string;
    modeKey: string;
    shippedValue?: string | number;
    contexts?: ChangeContext[];
  };
  before?: string;
  after?: string;
  generated?: boolean;
  beforePreview?: ValuePreviewDescriptor;
  afterPreview?: ValuePreviewDescriptor;
}

export interface ChangeItem {
  id: string;
  conceptId?: string;
  topic: ChangeTopic;
  sourceKind:
    | FoundationKind
    | "token"
    | "semantic-token"
    | "compatibility-alias"
    | "mode-set"
    | "component"
    | "platform"
    | "adaptive-claim"
    | "mode-attachment";
  kind: ChangeKind;
  title: string;
  fields: ChangeField[];
  source?: GeneratedToken["source"];
  modeSetId?: string;
  address?: AuthoredAddress;
  addresses?: AuthoredAddress[];
  upstream?: { title: string; address: AuthoredAddress }[];
}

export interface ModeTokenRows {
  baseline: CascadeTokenRow[];
  generated: CascadeTokenRow[];
  current: CascadeTokenRow[];
  overrides: TokenOverrideMap;
}

export interface ChangeGroup {
  id: ChangeTopic;
  label: string;
  count: number;
  items: ChangeItem[];
}

export function createDefaultColorDocument(): ColorSystemDocument {
  return createColorDefaults();
}

export const defaultColorDocument = createDefaultColorDocument();

export function generateDocumentTokens(
  document: ColorSystemDocument,
  rules: readonly Rule[] = RULE_DEFAULTS,
): GeneratedToken[] {
  const background = resolvedBackgroundLinear(document);
  return [
    ...generatePaletteTokens(document.palette, document.settings.colorOutput),
    ...document.scales.flatMap((scale) =>
      generateColorTokensForScale(
        scale,
        document.contrasts,
        background,
        document.settings,
        document.settings.colorOutput,
        rules,
      ),
    ),
  ];
}

function display(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map((item) => display(item)).join(", ");
  return JSON.stringify(value);
}

function compareFields(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  keys: string[],
  previewKinds: Partial<Record<string, ValuePreviewKind>> = {},
): ChangeField[] {
  return keys.flatMap((key) => {
    const oldValue =
      key === "hideFromPublishing" && before
        ? before[key] === true
        : before?.[key];
    const newValue =
      key === "hideFromPublishing" && after
        ? after[key] === true
        : after?.[key];
    if (
      before &&
      after &&
      JSON.stringify(oldValue) === JSON.stringify(newValue)
    )
      return [];
    if (oldValue === undefined && newValue === undefined) return [];
    return [
      {
        key:
          key === "hideFromPublishing"
            ? "Hide from publishing"
            : key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (letter) => letter.toUpperCase()),
        ...(oldValue !== undefined && { before: display(oldValue) }),
        ...(newValue !== undefined && { after: display(newValue) }),
        ...(previewKinds[key] &&
          (typeof oldValue === "number" || typeof oldValue === "string") && {
            beforePreview: createValuePreview(
              previewKinds[key]!,
              oldValue,
              "px",
            ),
          }),
        ...(previewKinds[key] &&
          (typeof newValue === "number" || typeof newValue === "string") && {
            afterPreview: createValuePreview(
              previewKinds[key]!,
              newValue,
              "px",
            ),
          }),
      },
    ];
  });
}

function compareObjects<T extends { id: string; name?: string }>(
  kind: FoundationKind,
  defaults: T[],
  current: T[],
  keys: string[],
): ChangeItem[] {
  const original = new Map(defaults.map((item) => [item.id, item]));
  const latest = new Map(current.map((item) => [item.id, item]));
  return [...new Set([...original.keys(), ...latest.keys()])].flatMap((id) => {
    const before = original.get(id);
    const after = latest.get(id);
    const previewKinds: Partial<Record<string, ValuePreviewKind>> =
      kind === "spacing-scale" || kind === "size-scale"
        ? { base: "block" }
        : kind === "radius-scale"
          ? { base: "radius" }
          : {};
    const fields = compareFields(
      before as Record<string, unknown> | undefined,
      after as Record<string, unknown> | undefined,
      keys,
      previewKinds,
    );
    return fields.length === 0
      ? []
      : [
          {
            id,
            topic: "foundations" as const,
            sourceKind: kind,
            kind: !before
              ? ("new" as const)
              : !after
                ? ("removed" as const)
                : ("modified" as const),
            title:
              after?.name ??
              before?.name ??
              `${kind === "contrast" ? "Contrast" : kind} ${id}`,
            fields,
          },
        ];
  });
}

function colorValuePreview(
  document: ColorSystemDocument,
  source: GeneratedToken["source"] | undefined,
  value: string,
): ValuePreviewDescriptor {
  const reference =
    source?.scaleId === PALETTE_SCALE_ID
      ? document.palette.find((item) => item.id === source.contrastId)?.nameRef
      : document.scales.find((item) => item.id === source?.scaleId)?.nameRef;
  const kind = classificationPreviewKind({
    [STRUCTURE_CATEGORY_IDS.property]: PREVIEW_TERM_IDS.color,
    ...(reference && { [reference.categoryId]: reference.termId }),
  });
  return kind
    ? createValuePreview(kind, value)
    : unavailablePreview(
        "No color preview is defined for this source classification.",
      );
}

function compareModeTokens(
  rows: ModeTokenRows,
  tokens: ResolvedToken[],
  baselineTokens: GeneratedToken[],
  modeSets: ModeSet[],
  document: ColorSystemDocument,
): ChangeItem[] {
  const beforeById = new Map(rows.baseline.map((row) => [row.uuid, row]));
  const generatedById = new Map(rows.generated.map((row) => [row.uuid, row]));
  const afterById = new Map(rows.current.map((row) => [row.uuid, row]));
  const tokenSources = new Map(
    [...baselineTokens, ...tokens].map((token) => [token.uuid, token.source]),
  );
  const modeKeys = new Set(
    [...MODE_SET_DEFAULTS, ...modeSets].map((modeSet) => modeSet.key),
  );
  const conceptIds = new Set(
    [...rows.baseline, ...rows.current].map((row) => row.conceptId),
  );
  const isDefaultRow = (row: CascadeTokenRow) =>
    !Object.keys(row.name).some((key) => modeKeys.has(key));
  const displayName = (row: CascadeTokenRow) =>
    tokenDisplayName({
      colorName: String(row.name.colorName),
      contrastValue: String(row.name.contrastValue ?? row.name.number ?? ""),
    });

  return [...conceptIds].flatMap((conceptId) => {
    const beforeRows = rows.baseline.filter(
      (row) => row.conceptId === conceptId,
    );
    const afterRows = rows.current.filter((row) => row.conceptId === conceptId);
    const sourceRow =
      afterRows.find(isDefaultRow) ??
      beforeRows.find(isDefaultRow) ??
      afterRows[0] ??
      beforeRows[0];
    const override = rows.overrides[sourceRow.uuid];
    const fields: ChangeField[] = [];
    const rowIds = new Set(
      [...beforeRows, ...afterRows].map((row) => row.uuid),
    );
    for (const rowId of rowIds) {
      const before = beforeById.get(rowId);
      const after = afterById.get(rowId);
      const generated = generatedById.get(rowId);
      const mode =
        Object.entries(after?.name ?? before?.name ?? {})
          .filter(([key]) => modeKeys.has(key))
          .map(([, value]) => value)
          .join(" / ") || "Default";
      const oldName =
        override?.name && generated
          ? displayName(generated)
          : before && displayName(before);
      const newName = after && displayName(after);
      if (!before || !after || oldName !== newName) {
        fields.push({
          key: `Name · ${mode}`,
          before: oldName,
          after: newName,
          generated: !!after && !override?.name,
        });
      }
      const oldValue =
        override?.value !== undefined ? generated?.value : before?.value;
      if (!before || !after || oldValue !== after.value) {
        const source =
          tokenSources.get(rowId) ?? tokenSources.get(sourceRow.uuid);
        fields.push({
          key: `Value · ${mode}`,
          before: oldValue?.toString(),
          after: after?.value.toString(),
          generated: !!after && override?.value === undefined,
          ...(oldValue !== undefined && {
            beforePreview: colorValuePreview(
              override?.value !== undefined ? document : defaultColorDocument,
              source,
              String(oldValue),
            ),
          }),
          ...(after && {
            afterPreview: colorValuePreview(
              document,
              source,
              String(after.value),
            ),
          }),
        });
      }
    }
    if (!fields.length) return [];
    return [
      {
        id: sourceRow.uuid,
        conceptId,
        topic: "tokens" as const,
        sourceKind: "token" as const,
        kind: !beforeRows.length
          ? ("new" as const)
          : !afterRows.length
            ? ("removed" as const)
            : ("modified" as const),
        title: displayName(sourceRow),
        fields,
        source: tokenSources.get(sourceRow.uuid),
      },
    ];
  });
}

export const SCALE_FIELDS = [
  "name",
  "stops",
  "hideFromPublishing",
  "customContrasts",
];
export const DATA_VIS_FIELDS = [
  "name",
  "kind",
  "points",
  "members",
  "preferences",
  "staticColors",
  "hideFromPublishing",
];
export const PALETTE_FIELDS = ["name", "lightness", "hue", "chroma"];
// Rounding steps are fixed in code until Rules author them, so they are not tracked as edits.
export const SPACING_SCALE_FIELDS = [
  "name",
  "scaleTypeId",
  "base",
  "below",
  "above",
  "parameters",
  "bindings",
  "roundingRuleId",
  "hideFromPublishing",
];
export const ROUNDING_RULE_FIELDS = [
  "name",
  "description",
  "type",
  "depth",
  "defaultOutcome",
  "conditions",
];
export const TSHIRT_RULE_FIELDS = [
  "name",
  "description",
  "type",
  "movement",
  "mappings",
];
export const SCALE_NAMING_RULE_FIELDS = [
  "name",
  "description",
  "type",
  "baseLabel",
  "aboveIncrement",
  "below",
];
export const RULE_FIELDS = [
  ...new Set([
    ...ROUNDING_RULE_FIELDS,
    ...TSHIRT_RULE_FIELDS,
    ...SCALE_NAMING_RULE_FIELDS,
  ]),
];
export const ruleFields = (rule: Rule) =>
  rule.type === "tshirt-sizing"
    ? TSHIRT_RULE_FIELDS
    : rule.type === "scale-naming"
      ? SCALE_NAMING_RULE_FIELDS
      : ROUNDING_RULE_FIELDS;
export const SCALE_TYPE_FIELDS = [
  "name",
  "description",
  "kind",
  "base",
  "parameters",
  "expression",
  "textSizeAdaptation",
];
export const INTERPOLATION_FIELDS = [
  "name",
  "description",
  "kind",
  "method",
  "parameters",
  "expression",
];
export const CONTRAST_FIELDS = ["value", "oppositeValue"];
export const SURFACE_FIELDS = [
  "name",
  "source",
  "reference",
  "contrast",
  "forceDark",
  "expanded",
  "previewRole",
  "showInPreview",
];

/** Baseline and current color settings, including values derived from the document. */
export function colorSettingsPair(document: ColorSystemDocument) {
  const defaults = defaultColorDocument;
  const before: Record<string, unknown> = {
    ...defaults.settings,
    background: defaults.background,
    backgroundScaleId: defaults.backgroundScaleId,
    backgroundLightness: defaults.backgroundLightness,
  };
  const after: Record<string, unknown> = {
    ...document.settings,
    contrastReference: contrastReference(document),
    polarityCompensation: polarityCompensation(document),
    contrastMultiplier: contrastMultiplier(document),
    background: document.background,
    backgroundScaleId: document.backgroundScaleId,
    backgroundLightness: document.backgroundLightness,
  };
  return { before, after, keys: Object.keys(before) };
}

export function buildChangeGroups(
  document: ColorSystemDocument,
  tokens: ResolvedToken[],
  modeSets: ModeSet[] = [...MODE_SET_DEFAULTS],
  baselineTokens: GeneratedToken[] = generateDocumentTokens(
    defaultColorDocument,
  ),
  modeTokenRows?: ModeTokenRows,
  typography: TypographyDocument = TYPOGRAPHY_DEFAULTS,
  spacing: SpacingDocument = SPACING_DEFAULTS,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = INTERPOLATION_DEFAULTS,
  size: SizeDocument = SIZE_DEFAULTS,
  radius: RadiusDocument = RADIUS_DEFAULTS,
): ChangeGroup[] {
  const defaults = defaultColorDocument;
  const foundations = [
    ...compareObjects(
      "palette-color",
      defaults.palette,
      document.palette,
      PALETTE_FIELDS,
    ),
    ...compareObjects("scale", defaults.scales, document.scales, SCALE_FIELDS),
    ...compareObjects(
      "data-vis-scale",
      defaults.dataVisScales,
      document.dataVisScales,
      DATA_VIS_FIELDS,
    ),
    ...compareObjects(
      "contrast",
      defaults.contrasts,
      document.contrasts,
      CONTRAST_FIELDS,
    ),
    ...compareObjects(
      "surface",
      defaults.surfaces,
      document.surfaces,
      SURFACE_FIELDS,
    ),
  ];
  const modeChanges: ChangeItem[] = [
    ...compareObjects("mode-set", [...MODE_SET_DEFAULTS], modeSets, [
      "name",
      "description",
      "iconId",
      "defaultModeId",
      "authoringCapabilities",
    ]).map((item) => ({ ...item, topic: "modes" as const })),
    ...modeSets.flatMap((modeSet) =>
      compareObjects(
        "mode",
        MODE_SET_DEFAULTS.find((item) => item.id === modeSet.id)?.modes ?? [],
        modeSet.modes,
        ["name", "description", "iconId", "platformIds", "foundations"],
      ).map((item) => ({
        ...item,
        id: `${modeSet.id}/${item.id}`,
        modeSetId: modeSet.id,
        title: `${modeSet.name} / ${item.title}`,
        topic: "modes" as const,
      })),
    ),
  ];
  const settings = colorSettingsPair(document);
  const settingsFields = compareFields(
    settings.before,
    settings.after,
    settings.keys,
    { background: "color" },
  );
  if (settingsFields.length)
    foundations.push({
      id: "settings",
      topic: "foundations",
      sourceKind: "settings",
      kind: "modified",
      title: "Color settings",
      fields: settingsFields,
    });
  const typographyFields = compareFields(
    TYPOGRAPHY_DEFAULTS as unknown as Record<string, unknown>,
    typography as unknown as Record<string, unknown>,
    [
      ...Object.keys(TYPOGRAPHY_DEFAULTS).filter(
        (key) => key !== "schemaVersion",
      ),
      "hideFromPublishing",
    ],
    { minTextSize: "font-size", maxTextSize: "font-size" },
  );
  if (typographyFields.length)
    foundations.push({
      id: "typography",
      topic: "foundations",
      sourceKind: "typography",
      kind: "modified",
      title: "Typography settings",
      fields: typographyFields,
    });
  foundations.push(
    ...compareObjects(
      "spacing-scale",
      SPACING_DEFAULTS.scales,
      spacing.scales,
      SPACING_SCALE_FIELDS,
    ),
  );
  foundations.push(
    ...compareObjects(
      "size-scale",
      SIZE_DEFAULTS.scales,
      size.scales,
      SPACING_SCALE_FIELDS,
    ).map((item) => ({ ...item, title: `Size / ${item.title}` })),
  );
  foundations.push(
    ...compareObjects(
      "radius-scale",
      RADIUS_DEFAULTS.scales,
      radius.scales,
      SPACING_SCALE_FIELDS,
    ).map((item) => ({ ...item, title: `Radius / ${item.title}` })),
  );
  const ruleChanges = [
    ...compareObjects("rule", [...RULE_DEFAULTS], [...rules], RULE_FIELDS),
    ...compareObjects(
      "scale-type",
      [...SCALE_TYPE_DEFAULTS],
      [...scaleTypes],
      SCALE_TYPE_FIELDS,
    ),
    ...compareObjects(
      "interpolation",
      [...INTERPOLATION_DEFAULTS],
      [...interpolations],
      INTERPOLATION_FIELDS,
    ),
  ].map((item) => ({ ...item, topic: "logic" as const }));

  const originalTokens = new Map(
    baselineTokens.map((token) => [token.uuid, token]),
  );
  const currentTokens = new Map(tokens.map((token) => [token.uuid, token]));
  const tokenChanges: ChangeItem[] = modeTokenRows
    ? compareModeTokens(
        modeTokenRows,
        tokens,
        baselineTokens,
        modeSets,
        document,
      )
    : [...new Set([...originalTokens.keys(), ...currentTokens.keys()])].flatMap(
        (id) => {
          const before = originalTokens.get(id);
          const after = currentTokens.get(id);
          const fields: ChangeField[] = [];
          const oldName = after?.nameOverridden
            ? tokenDisplayName(after.generated.name)
            : before && tokenDisplayName(before.name);
          if (!before || !after || oldName !== tokenDisplayName(after.name)) {
            fields.push({
              key: "Name",
              before: oldName,
              after: after && tokenDisplayName(after.name),
              generated: !!after && !after.nameOverridden,
            });
          }
          const oldValue = after?.valueOverridden
            ? after.generated.value
            : before?.value;
          if (!before || !after || oldValue !== after.value) {
            fields.push({
              key: "Value",
              before: oldValue,
              after: after?.value,
              generated: !!after && !after.valueOverridden,
              ...(oldValue !== undefined && {
                beforePreview: colorValuePreview(
                  after?.valueOverridden ? document : defaults,
                  after?.source ?? before?.source,
                  oldValue,
                ),
              }),
              ...(after && {
                afterPreview: colorValuePreview(
                  document,
                  after.source,
                  after.value,
                ),
              }),
            });
          }
          return fields.length === 0
            ? []
            : [
                {
                  id,
                  topic: "tokens",
                  sourceKind: "token",
                  kind: !before ? "new" : !after ? "removed" : "modified",
                  title: after
                    ? tokenDisplayName(after.name)
                    : tokenDisplayName(before!.name),
                  fields,
                  source: after?.source ?? before?.source,
                },
              ];
        },
      );

  return (
    [
      { id: "tokens", label: "Tokens", items: tokenChanges },
      { id: "foundations", label: "Foundations", items: foundations },
      { id: "modes", label: "Modes", items: modeChanges },
      { id: "logic", label: "Logic", items: ruleChanges },
    ] as const
  )
    .filter((group) => group.items.length > 0)
    .map((group) => ({
      ...group,
      count: group.items.reduce((total, item) => total + item.fields.length, 0),
    }));
}
