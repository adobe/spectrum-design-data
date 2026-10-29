// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import { resolveColorDocument } from "../color-system/resolution";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import type { TypographyDocument } from "../typography/model";
import { generateTypography } from "../typography/typographyGeneration";
import { resolveTypographyDocument } from "../typography/resolution";
import type { DimensionDocument } from "../scales/foundation";
import { generateDimensionScale } from "../scales/foundation";
import type { ElevationDocument } from "../elevation/model";
import { generateElevation } from "../elevation/generate";
import {
  browserElevationSources,
  elevationOwnerIds,
} from "../elevation/output";
import { resolveElevationDocument } from "../elevation/resolution";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { ModeSet } from "../modes/model";
import { capabilityOwners, parameterOwners } from "../modes/parameters";
import {
  modeCombinationCount,
  modeSelections,
  modesForSelection,
} from "../modes/combinations";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import type { Rule } from "../logic/model";
import type { ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import type { AliasExportTarget, AliasTarget } from "./aliases";
import { buildCascadeTokenInventory } from "./cascadeExport";
import {
  generateColorTokensForScale,
  generatePaletteTokens,
} from "./generation";
import {
  canonicalTokenModeKey,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserToken,
  type BrowserTokenEdits,
} from "./browserModel";
import { browserSourcesFromOutputs } from "./browserSources";
import { tokenUuid } from "./model";
import { primitiveReferenceId } from "./primitiveIdentity";
import type { TokenOverrideMap } from "./model";
import { resolveToken } from "./model";
import { isFoundationPublished } from "../foundations/types";
import type { TshirtArtifactBundle } from "../design-data/tshirtTypes";
import { projectClassification } from "../taxonomy/model";
import { resolveBrowserColorToken } from "./colorResolution";
import { finalUiSwatches } from "../color-system/data-vis/resolution";
import { categoricalBrowserSources } from "../color-system/data-vis/output";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";

export interface AliasAuthoringSource {
  colorSystem: ColorSystemDocument;
  typography: TypographyDocument;
  spacing: DimensionDocument;
  size: DimensionDocument;
  radius: DimensionDocument;
  elevation: ElevationDocument;
  taxonomy: TaxonomyDocument;
  modeSets: ModeSet[];
  rules: Rule[];
  scaleTypes: ScaleType[];
  interpolations: Interpolation[];
  tokenOverrides: TokenOverrideMap;
  browserTokenEdits: BrowserTokenEdits;
}

export interface CanonicalAliasRow extends AliasExportTarget {
  token: BrowserToken;
}

export function completeAliasSource(
  value: Partial<AliasAuthoringSource>,
): AliasAuthoringSource {
  const {
    colorSystem,
    typography,
    spacing,
    size,
    radius,
    elevation,
    taxonomy,
    modeSets,
    rules,
    scaleTypes,
    interpolations,
    tokenOverrides,
    browserTokenEdits,
  } = value;
  if (
    !colorSystem ||
    !typography ||
    !spacing ||
    !size ||
    !radius ||
    !elevation ||
    !taxonomy ||
    !modeSets ||
    !rules ||
    !scaleTypes ||
    !interpolations ||
    !tokenOverrides ||
    !browserTokenEdits
  ) {
    throw new Error(
      "Alias targets require complete authoritative foundation data.",
    );
  }
  return {
    colorSystem,
    typography,
    spacing,
    size,
    radius,
    elevation,
    taxonomy,
    modeSets,
    rules,
    scaleTypes,
    interpolations,
    tokenOverrides,
    browserTokenEdits,
  };
}

/** Stable source coordinates and owning axes, not preview names or Cartesian sample counts. */
export function canonicalAliasRows(
  source: AliasAuthoringSource,
  semantics?: TshirtArtifactBundle,
  projectionPolicy: "strict" | "preserve-for-review" = "strict",
  { excludeColors = false } = {},
): CanonicalAliasRow[] {
  const axes = source.modeSets.filter((axis) => axis.modes.length);
  if (modeCombinationCount(axes) > 4096)
    throw new Error(
      "Too many declared mode combinations to validate alias targets.",
    );
  const combinations = modeSelections(axes);
  const owners = parameterOwners(source.modeSets);
  const capabilities = capabilityOwners(source.modeSets);
  const compatibleModes = Object.fromEntries(
    axes.map((axis) => [axis.id, axis.modes.map((mode) => mode.id)]),
  );
  const rows = new Map<string, CanonicalAliasRow>();
  for (const selection of combinations) {
    const modes = modesForSelection(axes, selection);
    const modeKey = canonicalTokenModeKey(selection);
    const colors = resolveColorDocument(source.colorSystem, modes, undefined, {
      modeSets: source.modeSets,
    });
    const background = resolvedBackgroundLinear(colors);
    const generatedColors = (
      excludeColors
        ? []
        : [
            ...colors.scales.flatMap((scale) =>
              generateColorTokensForScale(
                scale,
                colors.contrasts,
                background,
                colors.settings,
                colors.settings.colorOutput,
                source.rules,
              ),
            ),
            ...generatePaletteTokens(
              colors.palette,
              colors.settings.colorOutput,
            ),
          ]
    ).map((token) =>
      resolveBrowserColorToken(
        resolveToken(token, source.tokenOverrides[token.uuid]),
        source.browserTokenEdits,
        modeKey,
        colors,
      ),
    );
    const typography = resolveTypographyDocument(
      source.typography,
      modes,
      undefined,
      { modeSets: source.modeSets },
    );
    const typeValues = generateTypography(
      typography,
      undefined,
      source.rules,
      source.scaleTypes,
      source.interpolations,
    );
    const parameters = resolveModeParameterValues(
      { color: source.colorSystem, typography: source.typography },
      modes,
      undefined,
      { modeSets: source.modeSets },
    );
    const dimensions = (family: "spacing" | "size" | "radius") =>
      source[family].scales.map((scale) => ({
        scale,
        values: generateDimensionScale(
          family,
          scale,
          [...source.rules, ...(source[family].pendingRules ?? [])],
          source.scaleTypes,
          parameters,
        ),
      }));
    const spacing = dimensions("spacing"),
      size = dimensions("size"),
      radius = dimensions("radius");
    const elevation = resolveElevationDocument(
      source.elevation,
      modes,
      source.modeSets,
    );
    const levels = generateElevation(
      elevation,
      source.scaleTypes,
      colors.settings.colorOutput,
    );
    const sources = [
      ...browserSourcesFromOutputs(
        generatedColors,
        isFoundationPublished(typography) ? typeValues : [],
        spacing,
        size,
        {
          names: typography.metricNames,
          registry: source.taxonomy,
          outputUnit: typography.outputUnit,
        },
        {
          document: source.colorSystem,
          registry: source.taxonomy,
          rules: source.rules,
        },
        radius,
      ),
      ...browserElevationSources(elevation, levels, source.taxonomy),
      ...(excludeColors
        ? []
        : categoricalBrowserSources(
            colors,
            finalUiSwatches(colors, generatedColors),
            source.taxonomy,
          )),
    ];
    for (const token of projectBrowserTokens(
      resolveBrowserTokens(sources, source.browserTokenEdits, modeKey),
      source.taxonomy,
    )) {
      if (
        token.validationError ||
        (projectionPolicy === "strict" && token.projection?.issues.length)
      )
        throw new Error(
          `Cannot save alias targets for ${token.name}. ${token.validationError ?? token.projection?.issues.join(" ")}`,
        );
      let id = token.id;
      const owned = new Set<string>();
      const own = (parameter: string) => {
        if (owners[parameter]) owned.add(owners[parameter]);
      };
      if (token.type === "colors" && !token.paletteColorId) {
        if (token.dataVis) {
          const scale = source.colorSystem.dataVisScales.find(
            (scale) => scale.id === token.dataVis!.scaleId,
          );
          const member =
            scale?.kind === "categorical"
              ? scale.members.find(
                  (member) => member.id === token.dataVis!.memberId,
                )
              : undefined;
          if (!member || scale?.kind !== "categorical")
            throw new Error(
              "A categorical alias target has no saved member identity.",
            );
          for (const axis of categoricalMemberAxes(
            scale.id,
            member,
            source.modeSets,
            source.browserTokenEdits,
            scale,
          ))
            owned.add(axis);
        } else {
          for (const parameter of [
            "color.backgroundScaleId",
            "color.backgroundLightness",
            "color.contrastMultiplier",
          ])
            own(parameter);
          if (capabilities["color.scales"])
            owned.add(capabilities["color.scales"]);
        }
      } else if (token.type === "typography") {
        own("typography.textZoom");
        const value = typeValues.find((item) =>
          token.id.endsWith(`-${item.scale}`),
        );
        if (!value)
          throw new Error("Typography alias target has no source position.");
        id = tokenUuid(
          `authoring-typography:v1:${token.groupId}:${value.position}`,
        );
      } else if (token.type === "elevation") {
        for (const axis of elevationOwnerIds(source.modeSets)) owned.add(axis);
        const level = levels.find((item) => item.id === token.id)!;
        id = primitiveReferenceId(
          "elevation",
          source.elevation.id,
          level.index,
        );
      } else if (
        token.type === "spacing" ||
        token.type === "size" ||
        token.type === "radius"
      ) {
        const scale = source[token.type].scales.find(
          (item) => item.id === token.groupId,
        )!;
        const output = (
          token.type === "spacing"
            ? spacing
            : token.type === "size"
              ? size
              : radius
        ).find((item) => item.scale.id === scale.id)!;
        const value = output.values.find(
          (item) => token.id === `${token.type}-${scale.id}-${item.step}`,
        )!;
        id = primitiveReferenceId(token.type, scale.id, value.index);
        for (const binding of Object.values(scale.bindings ?? {}))
          own(binding.modeParameterId);
      }
      for (const key of Object.keys(
        token.dataVis?.static
          ? {}
          : (source.browserTokenEdits[token.id]?.values ?? {}),
      )) {
        const edited = Object.fromEntries(
          JSON.parse(key) as [string, string][],
        );
        for (const axis of Object.keys(edited)) owned.add(axis);
      }
      const context = canonicalTokenModeKey(
        Object.fromEntries(
          Object.entries(selection).filter(([axis]) => owned.has(axis)),
        ),
      );
      const key = JSON.stringify([id, context]);
      const row = {
        id,
        context,
        rowId: tokenUuid(`canonical-token-row:v1:${id}:${context}`),
        name: token.name,
        token,
        ...(token.dataVis?.static && { compatibleModes }),
      };
      const previous = rows.get(key);
      if (
        previous &&
        (previous.name !== row.name || previous.token.value !== token.value)
      )
        throw new Error(
          `Token ${token.name} has an unclaimed mode dependency.`,
        );
      rows.set(key, row);
    }
  }
  for (const semantic of semantics?.semantics ?? []) {
    const projection = projectClassification(
      source.taxonomy,
      semantic.classification,
      "structures",
    );
    if (projectionPolicy === "strict" && projection.issues.length)
      throw new Error(projection.issues.join(" "));
    const context = canonicalTokenModeKey(
      Object.fromEntries(
        Object.entries(semantic.selection).filter(([axis]) =>
          source.modeSets.some(
            (item) =>
              item.id === axis && semantic.context[item.key] !== undefined,
          ),
        ),
      ),
    );
    const token: BrowserToken = {
      id: semantic.conceptId,
      type:
        semantic.target.family === "color" ? "colors" : semantic.target.family,
      groupId: semantic.structureId,
      groupLabel: semantic.structureName,
      name: projection.name,
      generatedName: projection.name,
      value: semantic.target.value,
      generatedValue: semantic.target.value,
      unit:
        semantic.target.family === "elevation" ||
        semantic.target.family === "color"
          ? ""
          : "px",
      projection,
      semantic,
      shadows: semantic.target.shadows,
      description: "",
      status: "draft",
      nameOverridden: false,
      valueOverridden: false,
      stale: false,
    };
    rows.set(JSON.stringify([semantic.conceptId, context]), {
      id: semantic.conceptId,
      name: token.name,
      context,
      rowId: tokenUuid(
        `canonical-token-row:v1:${semantic.conceptId}:${context}`,
      ),
      token,
    });
  }
  return [...rows.values()];
}

/** Validates source identities without claiming unavailable color values were emitted. */
export function canonicalAliasSourceTargets(
  source: AliasAuthoringSource,
  semantics?: TshirtArtifactBundle,
): AliasTarget[] {
  const inventory = buildCascadeTokenInventory({
    base: source.colorSystem,
    modeSets: source.modeSets,
    activeModes: [],
    activeTokens: [],
    overrides: source.tokenOverrides,
    browserEdits: source.browserTokenEdits,
    taxonomy: source.taxonomy,
    rules: source.rules,
  });
  return [
    ...canonicalAliasRows(source, semantics, "strict", { excludeColors: true }),
    ...inventory.colorReferences,
  ];
}
