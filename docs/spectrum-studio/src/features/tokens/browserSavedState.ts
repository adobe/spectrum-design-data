// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { isFoundationPublished } from "../foundations/types";
import {
  colorSystemDocumentAtom,
  resolveColorDocument,
} from "../color-system/state";
import {
  defaultColorDocument,
  generateDocumentTokens,
} from "../changelog/changes";
import {
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../edit-session/state";
import { modeSetsAtom } from "../modes/state";
import {
  MODE_SET_DEFAULTS,
  modeSetDefaultMode,
  type Mode,
  type ModeSet,
} from "../modes/model";
import {
  typographyDocumentAtom,
  resolveTypographyDocument,
} from "../typography/state";
import { TYPOGRAPHY_DEFAULTS } from "../typography/defaults";
import { generateTypography } from "../typography/typographyGeneration";
import { spacingDocumentAtom } from "../spacing/state";
import { SPACING_DEFAULTS } from "../spacing/defaults";
import { SIZE_DEFAULTS } from "../size/defaults";
import { sizeDocumentAtom } from "../size/state";
import { generateSizeScale } from "../size/generate";
import type { SizeDocument } from "../size/model";
import { generateSpacingScale } from "../spacing/generate";
import { rulesAtom } from "../logic/library";
import {
  INTERPOLATION_DEFAULTS,
  interpolationsAtom,
  scaleTypesAtom,
} from "../logic/scaleTypeLibrary";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import { RULE_DEFAULTS } from "../logic/defaults";
import type { Rule } from "../logic/model";
import type { ColorSystemDocument } from "../color-system/model";
import type { TypographyDocument } from "../typography/model";
import type { SpacingDocument } from "../spacing/model";
import type { TokenImpactRecord } from "../impact/model";
import { tokenOverridesAtom, type TokenOverrideMap } from "./overrides";
import { resolveToken } from "./state";
import { browserSourcesFromOutputs } from "./browserSources";
import { browserTokenEditsAtom } from "./browserEdits";
import {
  canonicalTokenModeKey,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserTokenEdits,
} from "./browserModel";
import { resolveBrowserColorToken } from "./colorResolution";
import { finalUiSwatches } from "../color-system/data-vis/resolution";
import { categoricalBrowserSources } from "../color-system/data-vis/output";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { designSystemDefaults } from "../../data/defaults";
import type { TaxonomyDocument } from "../taxonomy/model";
import { radiusDocumentAtom } from "../radius/state";
import { RADIUS_DEFAULTS } from "../radius/defaults";
import { generateRadiusScale } from "../radius/generate";
import type { RadiusDocument } from "../radius/model";
import { parameterOwners } from "../modes/parameters";
import { modeCombinations, selectionForModes } from "../modes/combinations";
import { ELEVATION_DEFAULTS } from "../elevation/defaults";
import { elevationDocumentAtom } from "../elevation/state";
import { generateElevation } from "../elevation/generate";
import { resolveElevationDocument } from "../elevation/resolution";
import {
  browserElevationSources,
  elevationOwnerIds,
} from "../elevation/output";
import type { ElevationDocument } from "../elevation/model";
import { savedTshirtArtifactsAtom } from "../design-data/tshirtState";
import { colorSourceTokenIds } from "./colorGeneration";
import { normalizeBrowserColorOutputs } from "./colorOutput";

function savedSources(
  color: ColorSystemDocument,
  typography: TypographyDocument,
  spacing: SpacingDocument,
  size: SizeDocument,
  rules: readonly Rule[],
  scaleTypes: readonly ScaleType[],
  interpolations: readonly Interpolation[],
  sets: ModeSet[],
  modes: Mode[],
  overrides: TokenOverrideMap,
  registry: TaxonomyDocument = designSystemDefaults.system.taxonomy,
  radius: RadiusDocument = RADIUS_DEFAULTS,
  elevation: ElevationDocument = ELEVATION_DEFAULTS,
  edits: BrowserTokenEdits = {},
  { includeColors = true }: { includeColors?: boolean } = {},
) {
  const library = spacing.pendingRules
    ? [...rules, ...spacing.pendingRules]
    : rules;
  const document = resolveColorDocument(color, modes, undefined, {
    modeSets: sets,
  });
  const modeKey = canonicalTokenModeKey(
    Object.fromEntries(
      sets.flatMap((axis) => {
        const mode =
          modes.find((mode) =>
            axis.modes.some((candidate) => candidate.id === mode.id),
          ) ?? modeSetDefaultMode(axis);
        return mode ? [[axis.id, mode.id]] : [];
      }),
    ),
  );
  const colors = includeColors
    ? generateDocumentTokens(document, rules).map((token) =>
        resolveBrowserColorToken(
          resolveToken(token, overrides[token.uuid]),
          edits,
          modeKey,
          document,
        ),
      )
    : [];
  return [
    ...browserSourcesFromOutputs(
      colors,
      generateTypography(
        resolveTypographyDocument(typography, modes, undefined, {
          modeSets: sets,
        }),
        undefined,
        rules,
        scaleTypes,
        interpolations,
      ),
      spacing.scales.map((scale) => ({
        scale,
        values: generateSpacingScale(
          scale,
          library,
          scaleTypes,
          resolveModeParameterValues({ color, typography }, modes, undefined, {
            modeSets: sets,
          }),
        ),
      })),
      size.scales.map((scale) => ({
        scale,
        values: generateSizeScale(
          scale,
          size.pendingRules ? [...rules, ...size.pendingRules] : rules,
          scaleTypes,
          resolveModeParameterValues({ color, typography }, modes, undefined, {
            modeSets: sets,
          }),
        ),
      })),
      {
        names: typography.metricNames,
        outputUnit: typography.outputUnit,
        registry,
      },
      { document: color, registry, rules },
      radius.scales.map((scale) => ({
        scale,
        values: generateRadiusScale(
          scale,
          radius.pendingRules ? [...rules, ...radius.pendingRules] : rules,
          scaleTypes,
          resolveModeParameterValues({ color, typography }, modes, undefined, {
            modeSets: sets,
          }),
        ),
      })),
    ),
    ...browserElevationSources(
      elevation,
      generateElevation(
        resolveElevationDocument(elevation, modes, sets),
        scaleTypes,
        document.settings.colorOutput,
      ),
      registry,
    ),
    ...(includeColors
      ? categoricalBrowserSources(
          document,
          finalUiSwatches(document, colors),
          registry,
        )
      : []),
  ];
}

/** Generate from an explicit authored snapshot, without selected modes or temporary previews. */
export function browserSourcesForSnapshot(
  snapshot: ReturnType<typeof createDefaultSnapshot>,
  modes: Mode[],
) {
  return savedSources(
    snapshot.colorSystem,
    snapshot.typography,
    snapshot.spacing ?? SPACING_DEFAULTS,
    snapshot.size ?? SIZE_DEFAULTS,
    snapshot.rules ?? RULE_DEFAULTS,
    snapshot.scaleTypes ?? SCALE_TYPE_DEFAULTS,
    snapshot.interpolations ?? INTERPOLATION_DEFAULTS,
    snapshot.modeSets,
    modes,
    snapshot.tokenOverrides,
    snapshot.taxonomy ?? designSystemDefaults.system.taxonomy,
    snapshot.radius ?? RADIUS_DEFAULTS,
    snapshot.elevation ?? ELEVATION_DEFAULTS,
    snapshot.browserTokenEdits ?? {},
  );
}

export const savedBrowserTokensAtom = atom((get) => {
  const sets = get(modeSetsAtom);
  const axes = sets.filter((modeSet) => modeSet.modes.length);
  const combinations = modeCombinations(axes);
  const defaults = [...MODE_SET_DEFAULTS];
  const defaultModes = defaults
    .map(modeSetDefaultMode)
    .filter((mode): mode is Mode => !!mode);
  const baseline = savedSources(
    defaultColorDocument,
    TYPOGRAPHY_DEFAULTS,
    SPACING_DEFAULTS,
    SIZE_DEFAULTS,
    RULE_DEFAULTS,
    SCALE_TYPE_DEFAULTS,
    INTERPOLATION_DEFAULTS,
    defaults,
    defaultModes,
    {},
  );
  const edits = get(browserTokenEditsAtom);
  return combinations.map((modes) => {
    const modeKey = canonicalTokenModeKey(selectionForModes(axes, modes));
    const sources = savedSources(
      get(colorSystemDocumentAtom),
      get(typographyDocumentAtom),
      get(spacingDocumentAtom),
      get(sizeDocumentAtom),
      get(rulesAtom),
      get(scaleTypesAtom),
      get(interpolationsAtom),
      sets,
      modes,
      get(tokenOverridesAtom),
      get(taxonomyDocumentAtom),
      get(radiusDocumentAtom),
      get(elevationDocumentAtom),
      edits,
    );
    const baselineModes = defaults
      .map(
        (modeSet) =>
          modeSet.modes.find((candidate) =>
            modes.some((mode) => candidate.id === mode.id),
          ) ?? modeSetDefaultMode(modeSet),
      )
      .filter((mode): mode is Mode => !!mode);
    const baselineSources = savedSources(
      defaultColorDocument,
      TYPOGRAPHY_DEFAULTS,
      SPACING_DEFAULTS,
      SIZE_DEFAULTS,
      RULE_DEFAULTS,
      SCALE_TYPE_DEFAULTS,
      INTERPOLATION_DEFAULTS,
      defaults,
      baselineModes,
      {},
    );
    const finalUiValues = new Map(
      sources
        .filter((source) => source.type === "colors" && !source.dataVis)
        .map((source) => [source.id, String(source.value)]),
    );
    return {
      modeKey,
      label: modes.map((mode) => mode.name).join(" / ") || "Default",
      sources,
      tokens: projectBrowserTokens(
        normalizeBrowserColorOutputs(
          resolveBrowserTokens(sources, edits, modeKey),
          get(colorSystemDocumentAtom).settings.colorOutput,
          finalUiValues,
        ),
        get(taxonomyDocumentAtom),
      ),
      baseline: baselineSources,
      defaultBaseline: baseline,
    };
  });
});

export const publishedBrowserTokensAtom = atom((get) => {
  const typographyIsPublished = isFoundationPublished(
    get(typographyDocumentAtom),
  );
  return get(savedBrowserTokensAtom).map(({ modeKey, label, tokens }) => ({
    modeKey,
    label,
    tokens: tokens.filter(
      (token) => token.type !== "typography" || typographyIsPublished,
    ),
  }));
});

export const savedBrowserConceptIdsAtom = atom((get) => {
  const snapshot = get(editSessionSnapshotAtom) ?? createDefaultSnapshot();
  const modes = snapshot.modeSets
    .map(modeSetDefaultMode)
    .filter((mode): mode is Mode => !!mode);
  const generated = get(savedTshirtArtifactsAtom);
  if (generated.status === "error") throw new Error(generated.error);
  return new Set([
    ...colorSourceTokenIds(snapshot.colorSystem),
    ...savedSources(
      snapshot.colorSystem,
      snapshot.typography,
      snapshot.spacing ?? SPACING_DEFAULTS,
      snapshot.size ?? SIZE_DEFAULTS,
      snapshot.rules ?? RULE_DEFAULTS,
      snapshot.scaleTypes ?? SCALE_TYPE_DEFAULTS,
      snapshot.interpolations ?? INTERPOLATION_DEFAULTS,
      snapshot.modeSets,
      modes,
      snapshot.tokenOverrides,
      snapshot.taxonomy ?? designSystemDefaults.system.taxonomy,
      snapshot.radius ?? RADIUS_DEFAULTS,
      snapshot.elevation ?? ELEVATION_DEFAULTS,
      snapshot.browserTokenEdits,
      { includeColors: false },
    ).map((token) => token.id),
    ...generated.bundle.semantics.map((row) => row.conceptId),
  ]);
});

export const browserTokenImpactRecordsAtom = atom(
  (get): TokenImpactRecord[] => {
    const records = new Map<string, TokenImpactRecord>();
    const owners = parameterOwners(get(modeSetsAtom));
    const radius = get(radiusDocumentAtom);
    const edits = get(browserTokenEditsAtom);
    for (const combination of get(savedBrowserTokensAtom)) {
      const baseline = new Map(
        projectBrowserTokens(
          resolveBrowserTokens(combination.baseline, {}, combination.modeKey),
          designSystemDefaults.system.taxonomy,
        ).map((token) => [token.id, token]),
      );
      for (const token of combination.tokens) {
        const before = baseline.get(token.id);
        const record = records.get(token.id) ?? {
          tokenId: token.id,
          tier: "primitive",
          category: token.type === "colors" ? "color" : token.type,
          modeValues: [],
          nameChanged: false,
          manuallyOverridden: false,
          metadataChanged: false,
        };
        let scopeKey = combination.modeKey;
        if (token.dataVis) {
          const scale = get(colorSystemDocumentAtom).dataVisScales.find(
            (scale) => scale.id === token.dataVis!.scaleId,
          );
          const member =
            scale?.kind === "categorical"
              ? scale.members.find(
                  (member) => member.id === token.dataVis!.memberId,
                )
              : undefined;
          if (!scale || !member)
            throw new Error(
              "Categorical impact requires its saved member identity.",
            );
          const axes = categoricalMemberAxes(
            scale.id,
            member,
            get(modeSetsAtom),
            edits,
            scale,
          );
          const selection = Object.fromEntries(
            JSON.parse(combination.modeKey) as [string, string][],
          );
          scopeKey = canonicalTokenModeKey(
            Object.fromEntries(
              Object.entries(selection).filter(([axis]) => axes.has(axis)),
            ),
          );
        }
        if (token.type === "elevation") {
          const axes = elevationOwnerIds(get(modeSetsAtom));
          const selection = Object.fromEntries(
            JSON.parse(combination.modeKey) as [string, string][],
          );
          scopeKey = canonicalTokenModeKey(
            Object.fromEntries(
              Object.entries(selection).filter(([axis]) => axes.has(axis)),
            ),
          );
        }
        if (
          token.type === "radius" &&
          !edits[token.id]?.values[combination.modeKey]
        ) {
          const scale = radius.scales.find(
            (scale) => scale.id === token.groupId,
          );
          const axes = new Set(
            Object.values(scale?.bindings ?? {}).map(
              (binding) => owners[binding.modeParameterId],
            ),
          );
          const selection = Object.fromEntries(
            JSON.parse(combination.modeKey) as [string, string][],
          );
          scopeKey = canonicalTokenModeKey(
            Object.fromEntries(
              Object.entries(selection).filter(([axis]) => axes.has(axis)),
            ),
          );
        }
        const valueId = `${token.id}:${scopeKey}`;
        const prior = record.modeValues.find(
          (value) => value.valueId === valueId,
        );
        if (prior) prior.changed ||= before?.value !== token.value;
        else
          record.modeValues.push({
            valueId,
            changed: before?.value !== token.value,
          });
        record.nameChanged ||= before?.name !== token.name;
        record.manuallyOverridden ||= token.valueOverridden;
        record.metadataChanged ||=
          !!token.description ||
          token.status !== "draft" ||
          JSON.stringify(before?.projection?.classification) !==
            JSON.stringify(token.projection?.classification);
        records.set(token.id, record);
      }
    }
    return [...records.values()];
  },
);
