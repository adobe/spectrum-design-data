// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import {
  contrastMultiplier,
  contrastReference,
  polarityCompensation,
} from "../color-system/polarity";
import { resolveColorDocument } from "../color-system/resolution";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import { modeSetDefaultMode, type Mode, type ModeSet } from "../modes/model";
import {
  capabilityOwners,
  effectiveParameterValue,
  parameterOwners,
} from "../modes/parameters";
import { modeCombinationCount, modeCombinations } from "../modes/combinations";
import type { PreviewOverrides } from "../modes/previewState";
import { contrastTokenLabel, generatePaletteTokens } from "./generation";
import {
  generateScaleColorTokenOutcomes,
  type ColorTokenOutcomeReuse,
} from "./colorGeneration";
import { ColorOutputError } from "../color-system/outputContrast";
import {
  tokenStableKey,
  tokenUuid,
  type ResolvedToken,
  type TokenOverrideMap,
} from "./model";
import {
  canonicalTokenModeKey,
  resolveBrowserColorToken,
  resolveBrowserTokens,
  tokenModeSetIds,
  type BrowserTokenEdits,
  type BrowserTokenSource,
} from "./browserModel";
import {
  resolveSourceClassification,
  taxonomySurfaceSourceId,
  type TaxonomyDocument,
  type TaxonomyProjection,
  type TaxonomySourceContext,
} from "../taxonomy/model";
import {
  governedColorContext,
  governedDataVisContext,
  governedSurfaceContext,
} from "../taxonomy/colorGovernance";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../color-system/contrastSteps";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { isFoundationPublished } from "../foundations/types";
import { sanitizeTokenName } from "../color-system/cssLibrary";
import { finalUiSwatches } from "../color-system/data-vis/resolution";
import { categoricalMemberValue } from "../color-system/data-vis/categoricalValues";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";
import { concreteColor } from "../color-system/data-vis/colors";
import { serializeOutputColor } from "../color-system/outputSerialization";
import type { AliasTarget } from "./aliases";

export const CASCADE_EXPORT_SCHEMA_VERSION = 2;

export interface CascadeTokenRow {
  uuid: string;
  conceptId: string;
  name: Record<string, string | number>;
  value: string | number;
}

export interface CascadeTokenExport {
  taxonomy?: {
    profileId: "leonardo-flat-taxonomy-v1";
    projections: Record<string, TaxonomyProjection>;
    surfaces: Record<string, TaxonomyProjection>;
  };
  schemaVersion: number;
  modeSets: { name: string; modes: string[]; default: string }[];
  tokens: CascadeTokenRow[];
}

export interface BlockedCascadeColor extends Omit<CascadeTokenRow, "value"> {
  error: ColorOutputError;
}
export interface CascadeTokenInventory extends CascadeTokenExport {
  blockedColors: BlockedCascadeColor[];
  colorReferences: AliasTarget[];
}

export interface CascadeExportInput {
  taxonomy?: TaxonomyDocument;
  base: ColorSystemDocument;
  modeSets: ModeSet[];
  activeModes: readonly Mode[];
  activeTokens: ResolvedToken[];
  overrides: TokenOverrideMap;
  preview?: PreviewOverrides;
  browserEdits?: BrowserTokenEdits;
  rules?: readonly Rule[];
}

const conceptIdFor = (seed: string) => tokenUuid(`concept:${seed}`);

/**
 * Design-data cascade rows: default modes are omitted, with explicit rows for each owned mode combination.
 */
export function buildCascadeTokenExport(
  input: CascadeExportInput,
): CascadeTokenExport {
  const { blockedColors, colorReferences, ...packet } =
    buildCascadeTokenInventory(input);
  void colorReferences;
  if (blockedColors.length) throw blockedColors[0].error;
  return packet;
}

/** Source inventory retains failed concepts; only ready values belong in an export. */
export function buildCascadeTokenInventory(
  {
    base,
    modeSets,
    activeModes,
    activeTokens,
    overrides,
    preview,
    browserEdits = {},
    taxonomy,
    rules = RULE_DEFAULTS,
  }: CascadeExportInput,
  reuse?: ColorTokenOutcomeReuse,
): CascadeTokenInventory {
  const blockedColors: BlockedCascadeColor[] = [];
  const colorReferences = new Map<string, AliasTarget>();
  const projections: Record<string, TaxonomyProjection> = {};
  const canonicalName = (
    uuid: string,
    fallback: Record<string, string | number>,
  ): Record<string, string | number> => {
    const projection = projections[uuid];
    if (!projection) return fallback;
    if (projection.issues.length)
      throw new Error(`Cascade export blocked: ${projection.issues.join(" ")}`);
    return Object.fromEntries(
      Object.entries(projection.flat).map(([key, value]) => {
        if (Array.isArray(value))
          throw new Error("Cascade export supports one term per category.");
        return [key, value];
      }),
    );
  };
  function classify(
    uuid: string,
    tokenId: string,
    evidence: Record<string, string | number>,
    legacyName: boolean,
    context: TaxonomySourceContext,
  ) {
    if (!taxonomy) return;
    const assigned = taxonomy.classifications[tokenId];
    const projection = resolveSourceClassification(
      taxonomy,
      tokenId,
      evidence,
      "colors",
      context,
    );
    if (legacyName && !assigned)
      projection.issues.push(
        "Legacy name edit requires reviewed classification.",
      );
    projections[uuid] = projection;
  }
  const owners = parameterOwners(modeSets);
  const contrastOwnerId = owners["color.contrastMultiplier"];
  const scaleOwnerId = capabilityOwners(modeSets)["color.scales"];
  const colorOwners = new Set([
    contrastOwnerId,
    scaleOwnerId,
    owners["color.backgroundLightness"],
    owners["color.backgroundScaleId"],
  ]);
  const colorTokenIds = new Set(
    base.scales.flatMap((scale) =>
      scaleContrasts(base, scale).map((contrast) =>
        tokenUuid(tokenStableKey(scale.id, contrast.id)),
      ),
    ),
  );
  const explicitAxes = new Set(
    Object.entries(browserEdits)
      .filter(([id]) => colorTokenIds.has(id))
      .flatMap(([, edit]) => Object.keys(edit.values).flatMap(tokenModeSetIds)),
  );
  const uiAxes = new Set([...colorOwners, ...explicitAxes]);
  const memberAxes = new Map(
    base.dataVisScales.flatMap((scale) =>
      scale.kind === "categorical"
        ? scale.members.map(
            (member) =>
              [
                dataVisMemberId(scale.id, member.id),
                categoricalMemberAxes(
                  scale.id,
                  member,
                  modeSets,
                  browserEdits,
                  scale,
                ),
              ] as const,
          )
        : [],
    ),
  );
  const allAxes = new Set([
    ...uiAxes,
    ...[...memberAxes.values()].flatMap((axes) => [...axes]),
  ]);
  const axes = modeSets.filter(
    (modeSet) => modeSet.modes.length > 0 && allAxes.has(modeSet.id),
  );
  if (modeCombinationCount(axes) > 4096)
    throw new Error(
      "Too many declared color-mode combinations to export. No contexts were silently omitted.",
    );
  const combinations = modeCombinations(axes);
  const activeIds = new Set(activeModes.map((mode) => mode.id));
  const activeByUuid = new Map(
    activeTokens.map((token) => [token.uuid, token]),
  );
  const tokens: CascadeTokenRow[] = [];

  for (const combination of combinations) {
    const modes = modeSets.flatMap((axis) => {
      const index = axes.findIndex((candidate) => candidate.id === axis.id);
      const mode =
        index >= 0
          ? combination[index]
          : (activeModes.find((mode) =>
              axis.modes.some((candidate) => candidate.id === mode.id),
            ) ?? modeSetDefaultMode(axis));
      return mode ? [mode] : [];
    });
    // The active combination reflects what's on screen, including previews and value overrides.
    const isActive = combination.every((mode) => activeIds.has(mode.id));
    const document = resolveColorDocument(
      base,
      modes,
      isActive ? preview : undefined,
      { modeSets },
    );
    const fieldsFor = (
      owned: ReadonlySet<string | undefined>,
    ): Record<string, string> =>
      Object.fromEntries(
        combination.flatMap((mode, index) =>
          !owned.has(axes[index].id) ||
          mode.id === modeSetDefaultMode(axes[index])?.id
            ? []
            : [[axes[index].key, mode.key]],
        ),
      );
    const modeFields = fieldsFor(uiAxes);
    const combinationKey = Object.entries(modeFields)
      .map(([key, value]) => `${key}=${value}`)
      .join("|");
    const rowUuid = (seed: string) =>
      combinationKey ? tokenUuid(`${seed}|${combinationKey}`) : seed;
    const modeKey = canonicalTokenModeKey(
      Object.fromEntries(
        modeSets.flatMap((modeSet) => {
          const mode =
            modes.find((item) =>
              modeSet.modes.some((candidate) => candidate.id === item.id),
            ) ?? modeSetDefaultMode(modeSet);
          return mode ? [[modeSet.id, mode.id]] : [];
        }),
      ),
    );
    const remember = (
      id: string,
      owned: ReadonlySet<string | undefined>,
      uuid: string,
      name: Record<string, string | number>,
      isStatic = false,
    ) => {
      const context = canonicalTokenModeKey(
        Object.fromEntries(
          modeSets.flatMap((axis) => {
            const mode = modes.find((mode) =>
              axis.modes.some((candidate) => candidate.id === mode.id),
            );
            return owned.has(axis.id) && mode ? [[axis.id, mode.id]] : [];
          }),
        ),
      );
      const target: AliasTarget = {
        id,
        context,
        name: projections[uuid]?.name ?? Object.values(name).join("-"),
        ...(isStatic && {
          compatibleModes: Object.fromEntries(
            modeSets.map((axis) => [
              axis.id,
              axis.modes.map((mode) => mode.id),
            ]),
          ),
        }),
      };
      const key = JSON.stringify([id, context]);
      const previous = colorReferences.get(key);
      if (previous && previous.name !== target.name)
        throw new Error(
          "A color reference has conflicting names in the same mode context.",
        );
      colorReferences.set(key, target);
    };

    const background = resolvedBackgroundLinear(document),
      finalColors: ResolvedToken[] = [];
    const blockedUi = new Map<string, ColorOutputError>();
    const block = (
      id: string,
      name: Record<string, string | number>,
      error: ColorOutputError,
      fields = modeFields,
      uuid = rowUuid(id),
    ) => {
      blockedColors.push({
        uuid,
        conceptId: conceptIdFor(id),
        name: { ...canonicalName(uuid, name), ...fields },
        error,
      });
    };
    for (const scale of document.scales) {
      for (const outcome of generateScaleColorTokenOutcomes(
        scale,
        document.contrasts,
        background,
        document.settings,
        document.settings.colorOutput,
        rules,
        reuse,
      )) {
        const { token } = outcome;
        const owned = new Set([
          ...colorOwners,
          ...Object.keys(browserEdits[token.uuid]?.values ?? {}).flatMap(
            tokenModeSetIds,
          ),
        ]);
        if (outcome.status === "blocked") {
          if (taxonomy)
            classify(
              rowUuid(token.uuid),
              token.uuid,
              { property: "color", colorFamily: token.name.colorName },
              !!overrides[token.uuid]?.name ||
                browserEdits[token.uuid]?.name !== undefined,
              governedColorContext(
                base,
                taxonomy,
                scale.id,
                token.source.contrastId,
                rules,
              ),
            );
          block(
            token.uuid,
            { property: "color", ...token.name },
            outcome.error,
          );
          remember(token.uuid, owned, rowUuid(token.uuid), { ...token.name });
          blockedUi.set(token.uuid, outcome.error);
          continue;
        }
        const generatedToken = outcome.token;
        const active = isActive ? activeByUuid.get(token.uuid) : undefined;
        const legacyName = overrides[token.uuid]?.name ?? token.name;
        const legacyValue =
          overrides[token.uuid]?.value ?? active?.value ?? generatedToken.value;
        let resolved: ResolvedToken;
        try {
          resolved = resolveBrowserColorToken(
            {
              ...generatedToken,
              name: legacyName,
              value: legacyValue,
              generated: { name: token.name, value: generatedToken.value },
              nameOverridden: !!overrides[token.uuid]?.name,
              valueOverridden: !!overrides[token.uuid]?.value,
              stale: false,
            },
            browserEdits,
            modeKey,
            document,
          );
        } catch (error) {
          if (!(error instanceof ColorOutputError)) throw error;
          if (taxonomy)
            classify(
              rowUuid(token.uuid),
              token.uuid,
              { property: "color", colorFamily: token.name.colorName },
              !!overrides[token.uuid]?.name ||
                browserEdits[token.uuid]?.name !== undefined,
              governedColorContext(
                base,
                taxonomy,
                scale.id,
                token.source.contrastId,
                rules,
              ),
            );
          block(token.uuid, { property: "color", ...token.name }, error);
          remember(token.uuid, owned, rowUuid(token.uuid), { ...token.name });
          blockedUi.set(token.uuid, error);
          continue;
        }
        finalColors.push(resolved);
        if (taxonomy)
          classify(
            rowUuid(token.uuid),
            token.uuid,
            { property: "color", colorFamily: token.name.colorName },
            resolved.nameOverridden,
            governedColorContext(
              base,
              taxonomy,
              scale.id,
              token.source.contrastId,
              rules,
            ),
          );
        remember(token.uuid, owned, rowUuid(token.uuid), { ...resolved.name });
        tokens.push({
          uuid: rowUuid(token.uuid),
          conceptId: conceptIdFor(token.uuid),
          name: {
            ...canonicalName(rowUuid(token.uuid), {
              property: "color",
              ...resolved.name,
            }),
            ...modeFields,
          },
          value: resolved.value,
        });
      }

      if (scale.customContrasts && isFoundationPublished(scale))
        scale.customContrasts.steps.forEach((contrast, index) => {
          const seed = tokenUuid(`contrast-ratio:${scale.id}:${contrast.id}`);
          tokens.push({
            uuid: rowUuid(seed),
            conceptId: conceptIdFor(seed),
            name: {
              property: "contrast-ratio",
              colorFamily: sanitizeTokenName(scale.name),
              contrastValue: String(contrastStepIndex(index, scale, rules)),
              ...modeFields,
            },
            value: Number(contrast.value.toFixed(3)),
          });
        });
    }

    const swatches = finalUiSwatches(document, finalColors);
    for (const scale of document.dataVisScales)
      if (scale.kind === "categorical" && isFoundationPublished(scale)) {
        scale.members.forEach((member, index) => {
          const id = dataVisMemberId(scale.id, member.id);
          const fields = fieldsFor(memberAxes.get(id)!),
            key = Object.entries(fields)
              .map(([key, value]) => `${key}=${value}`)
              .join("|");
          const uuid = key ? tokenUuid(`${id}|${key}`) : id;
          const failure =
            !scale.staticColors &&
            blockedUi.get(
              tokenUuid(
                tokenStableKey(member.source.scaleId, member.source.contrastId),
              ),
            );
          if (failure) {
            if (taxonomy)
              classify(
                uuid,
                id,
                {
                  property: "color",
                  colorFamily: scale.name,
                  number: index + 1,
                },
                false,
                governedDataVisContext(base, taxonomy, scale.id, member.id),
              );
            block(
              id,
              {
                property: "color",
                colorFamily: sanitizeTokenName(scale.name),
                number: String(index + 1),
              },
              failure,
              fields,
              uuid,
            );
            remember(
              id,
              memberAxes.get(id)!,
              uuid,
              {
                colorFamily: sanitizeTokenName(scale.name),
                number: String(index + 1),
              },
              !!scale.staticColors,
            );
            return;
          }
          const output = categoricalMemberValue(
            scale,
            member.id,
            swatches,
            document.settings.colorOutput,
          );
          const source: BrowserTokenSource = {
            id,
            type: "colors",
            groupId: scale.id,
            groupLabel: scale.name,
            name: `${sanitizeTokenName(scale.name)}-${index + 1}`,
            generatedName: `${sanitizeTokenName(scale.name)}-${index + 1}`,
            value: output.value,
            generatedValue: output.generatedValue,
            unit: "",
            legacyOverridden: output.overridden,
            dataVis: {
              scaleId: scale.id,
              memberId: member.id,
              ordinal: index + 1,
              source: member.source,
              hidden: false,
              static: !!scale.staticColors,
            },
          };
          const [resolved] = resolveBrowserTokens(
            [source],
            browserEdits,
            modeKey,
          );
          if (taxonomy)
            classify(
              uuid,
              id,
              { property: "color", colorFamily: scale.name, number: index + 1 },
              resolved.nameOverridden,
              governedDataVisContext(base, taxonomy, scale.id, member.id),
            );
          remember(
            id,
            memberAxes.get(id)!,
            uuid,
            {
              colorFamily: sanitizeTokenName(scale.name),
              number: String(index + 1),
            },
            !!scale.staticColors,
          );
          tokens.push({
            uuid,
            conceptId: conceptIdFor(id),
            name: {
              ...canonicalName(uuid, {
                property: "color",
                colorFamily: sanitizeTokenName(scale.name),
                number: String(index + 1),
              }),
              ...fields,
            },
            value:
              scale.staticColors || resolved.valueOverridden
                ? serializeOutputColor(
                    concreteColor(String(resolved.value)),
                    document.settings.colorOutput,
                  )
                : resolved.value,
          });
        });
      }

    document.contrasts.forEach((contrast, index) => {
      const seed = tokenUuid(`contrast-ratio:${contrast.id}`);
      tokens.push({
        uuid: rowUuid(seed),
        conceptId: conceptIdFor(seed),
        name: {
          property: "contrast-ratio",
          contrastValue: contrastTokenLabel(index),
          ...modeFields,
        },
        value: Number(contrast.value.toFixed(3)),
      });
    });
  }

  // Palette colors are fixed across modes, so each has one row with no mode fields.
  for (const token of generatePaletteTokens(
    base.palette,
    base.settings.colorOutput,
  )) {
    if (taxonomy)
      classify(
        token.uuid,
        token.uuid,
        { property: "color", colorFamily: token.name.colorName },
        !!browserEdits[token.uuid]?.name,
        governedColorContext(
          base,
          taxonomy,
          token.source.scaleId,
          token.source.contrastId,
        ),
      );
    colorReferences.set(JSON.stringify([token.uuid, "[]"]), {
      id: token.uuid,
      context: "[]",
      name: projections[token.uuid]?.name ?? token.name.colorName,
    });
    tokens.push({
      uuid: token.uuid,
      conceptId: conceptIdFor(token.uuid),
      name: canonicalName(token.uuid, {
        property: "color",
        colorFamily: token.name.colorName,
      }),
      value: token.value,
    });
  }

  const multiplierSeed = tokenUuid("system:contrast-multiplier");
  const contrastSet = modeSets.find(
    (modeSet) => modeSet.id === contrastOwnerId,
  );
  if (contrastSet && contrastSet.modes.length > 0) {
    for (const mode of contrastSet.modes) {
      const isDefault = mode.id === modeSetDefaultMode(contrastSet)?.id;
      tokens.push({
        uuid: isDefault
          ? multiplierSeed
          : tokenUuid(`${multiplierSeed}|${contrastSet.key}=${mode.key}`),
        conceptId: conceptIdFor(multiplierSeed),
        name: {
          property: "contrast-multiplier",
          ...(isDefault ? {} : { [contrastSet.key]: mode.key }),
        },
        value: Number(
          effectiveParameterValue(mode, "color.contrastMultiplier", {
            color: base,
          }) ?? 1,
        ),
      });
    }
  } else {
    tokens.push({
      uuid: multiplierSeed,
      conceptId: conceptIdFor(multiplierSeed),
      name: { property: "contrast-multiplier" },
      value: contrastMultiplier(base),
    });
  }

  for (const [property, value] of [
    ["polarity-compensation", polarityCompensation(base)],
    ["contrast-reference", contrastReference(base)],
  ] as const) {
    const seed = tokenUuid(`system:${property}`);
    tokens.push({
      uuid: seed,
      conceptId: conceptIdFor(seed),
      name: { property },
      value,
    });
  }

  const scopedTokens = new Map<string, CascadeTokenRow>();
  for (const row of tokens) {
    const prior = scopedTokens.get(row.uuid);
    if (
      prior &&
      (prior.value !== row.value ||
        JSON.stringify(prior.name) !== JSON.stringify(row.name))
    ) {
      throw new Error(
        "A color token has an undeclared mode dependency. Its scoped rows cannot be merged.",
      );
    }
    scopedTokens.set(row.uuid, row);
  }
  return {
    ...(taxonomy && {
      taxonomy: {
        profileId: "leonardo-flat-taxonomy-v1" as const,
        projections,
        surfaces: Object.fromEntries(
          base.surfaces.map((surface) => [
            surface.id,
            resolveSourceClassification(
              taxonomy,
              taxonomySurfaceSourceId(surface.id),
              {},
              "colors",
              governedSurfaceContext(base, taxonomy, surface.id),
            ),
          ]),
        ),
      },
    }),
    schemaVersion: CASCADE_EXPORT_SCHEMA_VERSION,
    modeSets: axes.map((modeSet) => ({
      name: modeSet.key,
      modes: modeSet.modes.map((mode) => mode.key),
      default: modeSetDefaultMode(modeSet)!.key,
    })),
    tokens: [...scopedTokens.values()],
    blockedColors: [
      ...new Map(blockedColors.map((row) => [row.uuid, row])).values(),
    ],
    colorReferences: [...colorReferences.values()],
  };
}
