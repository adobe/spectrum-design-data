// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import { clearPersistenceIssuesAtom, persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { colorSystemDocumentAtom } from "../color-system/state";
import {
  isColorSystemDocument,
  migrateColorSystemDocument,
  type ColorSystemDocument,
} from "../color-system/model";
import { typographyDocumentAtom } from "../typography/state";
import {
  isTypographyDocument,
  type TypographyDocument,
} from "../typography/model";
import { assertTypographyNames } from "../typography/lineHeightNames";
import { validateTypographyGeneration } from "../typography/typographyGeneration";
import { spacingDocumentAtom } from "../spacing/state";
import {
  isSpacingDocument,
  SPACING_SCHEMA_VERSION,
  type SpacingDocument,
} from "../spacing/model";
import { sizeDocumentAtom } from "../size/state";
import {
  isSizeDocument,
  SIZE_SCHEMA_VERSION,
  type SizeDocument,
} from "../size/model";
import { migrateDimensionScalesToFormulas } from "../scales/foundation";
import {
  migrateScaleTypeLibrary,
  SPACING_SCALE_TYPE_ID,
} from "../scales/scaleType";
import { rulesAtom } from "../logic/library";
import { isRuleList, type Rule } from "../logic/model";
import {
  interpolationsAtom,
  isInterpolationList,
  isScaleTypeList,
  scaleTypesAtom,
} from "../logic/scaleTypeLibrary";
import {
  upgradeLegacyInterpolation,
  type Interpolation,
} from "../scales/interpolationDefinition";
import type { ScaleType } from "../scales/scaleType";
import {
  isTokenOverrideMap,
  tokenOverridesAtom,
  type TokenOverrideMap,
} from "../tokens/overrides";
import { modeSetsAtom } from "../modes/state";
import { isModeSetList, type ModeSet } from "../modes/model";
import {
  adaptiveClaimsAtom,
  isAdaptiveClaims,
  type AdaptiveClaims,
} from "../modes/adaptive";
import {
  isPlatformList,
  platformsAtom,
  type Platform,
} from "../platforms/state";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import {
  isBrowserTokenEdits,
  type BrowserTokenEdits,
} from "../tokens/browserModel";
import {
  restoreTaxonomySnapshotAtom,
  taxonomyDocumentAtom,
} from "../taxonomy/state";
import { taxonomyContributionsEnabledAtom } from "../taxonomy/contributions";
import { isTaxonomyDocument, type TaxonomyDocument } from "../taxonomy/model";
import { designSystemDefaults } from "../../data/defaults";
import { createColorDefaults } from "../../data/defaults";
import { TYPOGRAPHY_DEFAULTS } from "../typography/defaults";
import { SPACING_DEFAULTS } from "../spacing/defaults";
import { SIZE_DEFAULTS } from "../size/defaults";
import { radiusDocumentAtom } from "../radius/state";
import { RADIUS_DEFAULTS } from "../radius/defaults";
import { isRadiusDocument, type RadiusDocument } from "../radius/model";
import { RULE_DEFAULTS } from "../logic/library";
import {
  INTERPOLATION_DEFAULTS,
  SCALE_TYPE_DEFAULTS,
} from "../logic/scaleTypeLibrary";
import { MODE_SET_DEFAULTS } from "../modes/model";
import { ADAPTIVE_CLAIM_DEFAULTS } from "../modes/adaptive";
import { PLATFORM_DEFAULTS } from "../platforms/state";
import {
  foundationModeAttachmentsAtom,
  FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
  savedFoundationModeAttachmentsAtom,
  pruneFoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";
import {
  AUTHORING_RECORD_VERSION,
  writeAuthoringRecord,
  type AuthoringRecord,
} from "./storage";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import {
  resolveColorSourceNames,
  resolveDimensionSourceNames,
} from "../taxonomy/naming";
import { normalizeModeState } from "../modes/integrity";
import { modeSelectionAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { elevationDocumentAtom } from "../elevation/state";
import { ELEVATION_DEFAULTS } from "../elevation/defaults";
import {
  isElevationDocument,
  type ElevationDocument,
} from "../elevation/model";
import { generateElevation } from "../elevation/generate";
import { resolveElevationDocument } from "../elevation/resolution";
import { registeredSourceName } from "../taxonomy/naming";
import {
  structuresDocumentAtom,
  selectedStructureIdAtom,
  clearStructurePreviewsAtom,
} from "../structures/documentState";
import {
  assertStructureReferences,
  assertStructureTaxonomy,
  isStructuresDocument,
  type StructuresDocument,
} from "../structures/model";
import {
  availablePrimitiveReferences,
  typographyReferenceCoordinates,
} from "../tokens/primitiveIdentity";
import { aliasesAtom } from "../tokens/aliasState";
import {
  planAliasesForSave,
  assertAliasTargets,
  EMPTY_ALIASES,
  isAliasDocument,
  type AliasDocument,
} from "../tokens/aliases";
import {
  canonicalAliasSourceTargets,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { assertCustomContrastNaming } from "../color-system/contrastSteps";
import { reindexedCustomContrastTokenIds } from "../color-system/customContrastNamingChanges";
import { dataVisSourceIssues } from "../color-system/data-vis/references";
import { appliedElementBindings } from "../structures/elementResolution";
import {
  componentDraftRevisionAtom,
  componentsDocumentAtom,
} from "../components/documentState";
import { EMPTY_COMPONENTS, type ComponentsDocument } from "../components/model";
import {
  assertComponentDocument,
  isComponentsDocument,
} from "../components/validation";
import {
  assertComponentReferences,
  componentTokenCatalog,
} from "../components/references";
import { registerAuthoringGuard } from "../../state/authoringGuards";
import { selectAtom } from "jotai/utils";
import { prepareAuthoringSnapshot } from "./snapshotPreparation";
import {
  componentContrastWitnessAtom,
  matchesComponentContrastWitness,
} from "../components/contrastWitness";
import { componentColorWitnessAtom } from "../components/colorWitness";
import { opacityDocumentAtom } from "../opacity/state";
import { OPACITY_DEFAULTS } from "../opacity/defaults";
import { isOpacityDocument, type OpacityDocument } from "../opacity/model";

export interface EditSessionSnapshot {
  components?: ComponentsDocument;
  aliases?: AliasDocument;
  taxonomy?: TaxonomyDocument;
  colorSystem: ColorSystemDocument;
  typography: TypographyDocument;
  /** Optional so snapshots saved before spacing existed stay valid. */
  spacing?: SpacingDocument;
  /** Optional so snapshots saved before size existed stay valid. */
  size?: SizeDocument;
  radius?: RadiusDocument;
  elevation?: ElevationDocument;
  opacity?: OpacityDocument;
  structures?: StructuresDocument;
  /** Optional so snapshots saved before Rules existed stay valid. */
  rules?: Rule[];
  /** Optional so snapshots saved before scale types existed stay valid. */
  scaleTypes?: ScaleType[];
  interpolations?: Interpolation[];
  tokenOverrides: TokenOverrideMap;
  browserTokenEdits?: BrowserTokenEdits;
  modeSets: ModeSet[];
  platforms: Platform[];
  adaptiveClaims: AdaptiveClaims;
}

export function isSnapshot(data: unknown): data is EditSessionSnapshot | null {
  if (data === null) return true;
  if (typeof data !== "object") return false;
  const snapshot = data as Partial<EditSessionSnapshot>;
  return (
    isColorSystemDocument(snapshot.colorSystem) &&
    (snapshot.components === undefined ||
      isComponentsDocument(snapshot.components)) &&
    (snapshot.aliases === undefined || isAliasDocument(snapshot.aliases)) &&
    (snapshot.taxonomy === undefined ||
      isTaxonomyDocument(snapshot.taxonomy)) &&
    isTypographyDocument(snapshot.typography) &&
    (snapshot.spacing === undefined || isSpacingDocument(snapshot.spacing)) &&
    (snapshot.size === undefined || isSizeDocument(snapshot.size)) &&
    (snapshot.radius === undefined || isRadiusDocument(snapshot.radius)) &&
    (snapshot.elevation === undefined ||
      isElevationDocument(snapshot.elevation)) &&
    (snapshot.opacity === undefined || isOpacityDocument(snapshot.opacity)) &&
    (snapshot.structures === undefined ||
      isStructuresDocument(snapshot.structures)) &&
    (snapshot.rules === undefined || isRuleList(snapshot.rules)) &&
    (snapshot.scaleTypes === undefined ||
      isScaleTypeList(snapshot.scaleTypes)) &&
    (snapshot.interpolations === undefined ||
      isInterpolationList(snapshot.interpolations)) &&
    isTokenOverrideMap(snapshot.tokenOverrides) &&
    (snapshot.browserTokenEdits === undefined ||
      isBrowserTokenEdits(snapshot.browserTokenEdits)) &&
    isModeSetList(snapshot.modeSets) &&
    isPlatformList(snapshot.platforms) &&
    isAdaptiveClaims(snapshot.adaptiveClaims)
  );
}

// This baseline is serialized together with working data by the lifecycle coordinator.
export const editSessionSnapshotAtom =
  persistedAtom<EditSessionSnapshot | null>({
    key: "edit-session/snapshot",
    schemaVersion: AUTHORING_RECORD_VERSION,
    initialize: () => null,
    validate: isSnapshot,
    // v1 predates the color palette; v1 and v2 predate interpolations (then curves) and typography schema 6;
    // v1 to v3 predate user-defined formulas, so their typography, spacing, size and formula library are upgraded together.
    migrate: (data, fromVersion) => {
      if (
        fromVersion < 1 ||
        fromVersion > 3 ||
        !data ||
        typeof data !== "object"
      )
        return null;
      const { curves, ...rest } = data as Record<string, unknown>;
      const migratedTypography = rest.typography;
      const colorSystem =
        fromVersion === 1
          ? migrateColorSystemDocument(rest.colorSystem, 1)
          : rest.colorSystem;
      const spacing =
        (rest.spacing as { schemaVersion?: unknown } | undefined)
          ?.schemaVersion === 3
          ? migrateDimensionScalesToFormulas(
              rest.spacing,
              SPACING_SCHEMA_VERSION,
              SPACING_SCALE_TYPE_ID,
            )
          : rest.spacing;
      const size =
        (rest.size as { schemaVersion?: unknown } | undefined)
          ?.schemaVersion === 1
          ? migrateDimensionScalesToFormulas(
              rest.size,
              SIZE_SCHEMA_VERSION,
              SPACING_SCALE_TYPE_ID,
            )
          : rest.size;
      const scaleTypes = Array.isArray(rest.scaleTypes)
        ? migrateScaleTypeLibrary(rest.scaleTypes)
        : rest.scaleTypes;
      // Spacing, size and the formula library are optional in older snapshots; only a failed upgrade of a present one discards it.
      if (
        !colorSystem ||
        !migratedTypography ||
        (rest.spacing !== undefined && !spacing) ||
        (rest.size !== undefined && !size) ||
        (Array.isArray(rest.scaleTypes) && !scaleTypes)
      )
        return null;
      return {
        ...rest,
        colorSystem,
        typography: migratedTypography,
        spacing,
        size,
        ...(scaleTypes !== undefined && { scaleTypes }),
        ...(Array.isArray(curves) && {
          interpolations: curves.map(upgradeLegacyInterpolation),
        }),
      } as unknown as EditSessionSnapshot;
    },
  });

function captureSourceSnapshot(get: Getter): EditSessionSnapshot {
  const snapshot: EditSessionSnapshot = {
    components: get(componentsDocumentAtom),
    aliases: get(aliasesAtom),
    taxonomy: get(taxonomyDocumentAtom),
    colorSystem: get(colorSystemDocumentAtom),
    typography: get(typographyDocumentAtom),
    spacing: get(spacingDocumentAtom),
    size: get(sizeDocumentAtom),
    radius: get(radiusDocumentAtom),
    elevation: get(elevationDocumentAtom),
    opacity: get(opacityDocumentAtom),
    structures: get(structuresDocumentAtom),
    rules: get(rulesAtom),
    scaleTypes: get(scaleTypesAtom),
    interpolations: get(interpolationsAtom),
    tokenOverrides: get(tokenOverridesAtom),
    browserTokenEdits: get(browserTokenEditsAtom),
    modeSets: get(modeSetsAtom),
    platforms: get(platformsAtom),
    adaptiveClaims: get(adaptiveClaimsAtom),
  };
  return snapshot;
}

export const authoringSourceSnapshotAtom = selectAtom(
  atom(captureSourceSnapshot),
  (snapshot) => snapshot,
  (left, right) =>
    Object.keys(left).every(
      (key) =>
        left[key as keyof EditSessionSnapshot] ===
        right[key as keyof EditSessionSnapshot],
    ),
);

export function captureSnapshot(get: Getter): EditSessionSnapshot {
  return prepareAuthoringSnapshot(captureSourceSnapshot(get));
}

export const authoringSnapshotAtom = atom((get) =>
  prepareAuthoringSnapshot(get(authoringSourceSnapshotAtom)),
);

export function createDefaultSnapshot(): EditSessionSnapshot {
  return {
    components: structuredClone(
      designSystemDefaults.system.components ?? EMPTY_COMPONENTS,
    ),
    aliases: structuredClone(EMPTY_ALIASES),
    taxonomy: structuredClone(designSystemDefaults.system.taxonomy),
    colorSystem: createColorDefaults(),
    typography: structuredClone(TYPOGRAPHY_DEFAULTS),
    spacing: structuredClone(SPACING_DEFAULTS),
    size: structuredClone(SIZE_DEFAULTS),
    radius: structuredClone(RADIUS_DEFAULTS),
    elevation: structuredClone(ELEVATION_DEFAULTS),
    opacity: structuredClone(OPACITY_DEFAULTS),
    structures: structuredClone(designSystemDefaults.system.structures),
    rules: structuredClone([...RULE_DEFAULTS]),
    scaleTypes: structuredClone([...SCALE_TYPE_DEFAULTS]),
    interpolations: structuredClone([...INTERPOLATION_DEFAULTS]),
    tokenOverrides: {},
    browserTokenEdits: {},
    modeSets: structuredClone([...MODE_SET_DEFAULTS]),
    platforms: structuredClone([...PLATFORM_DEFAULTS]),
    adaptiveClaims: { ...ADAPTIVE_CLAIM_DEFAULTS },
  };
}

export function assertStoredSnapshot(
  value: unknown,
): asserts value is EditSessionSnapshot {
  if (
    !isSnapshot(value) ||
    value === null ||
    !value.taxonomy ||
    !value.spacing ||
    !value.size ||
    !value.radius ||
    !value.elevation ||
    !value.opacity ||
    !value.structures ||
    !value.rules ||
    !value.scaleTypes ||
    !value.interpolations ||
    !value.browserTokenEdits
  ) {
    throw new Error("Stored authoring data is invalid or incomplete.");
  }
  if (!value.components)
    throw new Error("Stored component authoring data is incomplete.");
  assertStructureTaxonomy(value.structures, value.taxonomy);
  assertStructureReferences(
    value.structures,
    availablePrimitiveReferences({
      spacing: value.spacing,
      size: value.size,
      radius: value.radius,
      elevation: value.elevation,
      color: value.colorSystem,
      typography: value.typography,
    }),
    undefined,
    value.typography,
  );
  resolveColorSourceNames(value.colorSystem, value.taxonomy);
  assertCustomContrastNaming(value.colorSystem, value.rules);
  const dataVisIssues = dataVisSourceIssues(value.colorSystem, value.modeSets);
  if (dataVisIssues.length)
    throw new Error(
      `Stored data vis sources are invalid. ${dataVisIssues.join(" ")}`,
    );
  for (const axis of value.modeSets)
    for (const mode of axis.modes) {
      for (const [scaleId, patches] of Object.entries(
        mode.foundations.color?.scaleContrasts ?? {},
      )) {
        const custom = value.colorSystem.scales.find(
          (scale) => scale.id === scaleId,
        )?.customContrasts;
        if (
          !custom ||
          Object.keys(patches).some(
            (id) => !custom.steps.some((step) => step.id === id),
          )
        ) {
          throw new Error(
            "Stored modes reference an unavailable custom contrast step.",
          );
        }
      }
    }
  if (
    !value.colorSystem.scales.some(
      (scale) => scale.id === value.colorSystem.backgroundScaleId,
    ) ||
    value.colorSystem.scales.some((scale) =>
      scale.stops.some(
        (stop) =>
          stop.paletteColorId &&
          !value.colorSystem.palette.some(
            (color) => color.id === stop.paletteColorId,
          ),
      ),
    )
  ) {
    throw new Error(
      "Stored colors reference an unavailable background scale or palette color.",
    );
  }
  const platformIds = new Set(value.platforms.map((platform) => platform.id));
  if (
    value.modeSets.some((set) =>
      set.modes.some((mode) =>
        mode.platformIds.some((id) => !platformIds.has(id)),
      ),
    )
  ) {
    throw new Error("Stored modes reference an unavailable platform.");
  }
  resolveDimensionSourceNames(value.spacing, value.taxonomy, "spacing");
  resolveDimensionSourceNames(value.size, value.taxonomy, "size");
  resolveDimensionSourceNames(value.radius, value.taxonomy, "radius");
  registeredSourceName(value.taxonomy, value.elevation.name, "elevation");
  const opacitySource = {
    opacity: value.opacity,
    colorSystem: value.colorSystem,
    modeSets: value.modeSets,
    browserTokenEdits: value.browserTokenEdits,
  };
  generateElevation(
    resolveElevationDocument(
      value.elevation,
      [],
      value.modeSets,
      {},
      opacitySource,
    ),
    value.scaleTypes,
  );
  if (
    Object.entries(value.browserTokenEdits).some(
      ([id, edit]) =>
        id.startsWith("elevation-") && Object.keys(edit.values).length,
    )
  ) {
    throw new Error(
      "Complete shadow overrides are not supported. Edit Elevation at its source.",
    );
  }
  for (const modeSet of value.modeSets)
    for (const mode of modeSet.modes) {
      if (
        Object.keys(mode.foundations.elevation?.layerOpacities ?? {}).some(
          (id) => !value.elevation!.layers.some((layer) => layer.id === id),
        )
      ) {
        throw new Error("Stored mode references an unavailable shadow.");
      }
      generateElevation(
        resolveElevationDocument(
          value.elevation,
          [mode],
          value.modeSets,
          {},
          opacitySource,
        ),
        value.scaleTypes,
      );
    }
  if (!value.typography.metricNames)
    throw new Error("Stored typography has no registered metric names.");
  assertTypographyNames(value.typography, value.taxonomy);
  const normalized = normalizeModeState({
    modeSets: value.modeSets,
    selection: {},
    claims: value.adaptiveClaims,
  });
  if (normalized.corrections.length)
    throw new Error(
      `Stored mode ownership is invalid: ${normalized.corrections.join("; ")}.`,
    );
  for (const modeSet of value.modeSets)
    for (const mode of modeSet.modes) {
      const color = mode.foundations.color;
      if (
        color?.backgroundScaleId &&
        !value.colorSystem.scales.some(
          (scale) => scale.id === color.backgroundScaleId,
        )
      )
        throw new Error(
          "Stored mode references an unavailable background scale.",
        );
      for (const [scaleId, stops] of Object.entries(color?.scaleStops ?? {})) {
        const scale = value.colorSystem.scales.find(
          (item) => item.id === scaleId,
        );
        if (
          !scale ||
          Object.keys(stops).some(
            (id) => !scale.stops.some((stop) => stop.id === id),
          )
        )
          throw new Error("Stored mode references an unavailable color stop.");
        if (
          Object.values(stops).some(
            (stop) =>
              stop.paletteColorId &&
              !value.colorSystem.palette.some(
                (color) => color.id === stop.paletteColorId,
              ),
          )
        ) {
          throw new Error(
            "Stored mode references an unavailable palette color.",
          );
        }
      }
    }
  const formulas = new Set(value.scaleTypes.map((item) => item.id));
  const rules = new Set(
    value.rules
      .filter((item) => item.type === "rounding")
      .map((item) => item.id),
  );
  const interpolations = new Set(value.interpolations.map((item) => item.id));
  if (
    !formulas.has(value.typography.scaleTypeId) ||
    value.typography.lineHeights.some(
      (card) => !interpolations.has(card.adaptive.interpolationId),
    ) ||
    value.scaleTypes.some(
      (formula) =>
        formula.textSizeAdaptation &&
        !interpolations.has(formula.textSizeAdaptation.interpolationId),
    ) ||
    !rules.has(value.typography.textRoundingRuleId) ||
    !rules.has(value.typography.lineHeightRoundingRuleId) ||
    [
      ...value.spacing.scales,
      ...value.size.scales,
      ...value.radius.scales,
    ].some(
      (scale) =>
        !formulas.has(scale.scaleTypeId) || !rules.has(scale.roundingRuleId),
    )
  ) {
    throw new Error(
      "Stored foundations reference an unavailable formula, interpolation, or rounding rule.",
    );
  }
  validateTypographyGeneration(
    value.typography,
    value.rules,
    value.scaleTypes,
    value.interpolations,
  );
  const typographyCoordinates = [
    ...typographyReferenceCoordinates(value.typography),
  ].map(([id, coordinates]) => ({
    id,
    family: "typography" as const,
    ...coordinates,
  }));
  for (const structure of value.structures.structures)
    appliedElementBindings(structure, value.rules, typographyCoordinates);
  if (value.aliases?.tokens.length) {
    assertAliasTargets(
      value.aliases,
      canonicalAliasSourceTargets(
        completeAliasSource(value),
        value.structures.structures.length
          ? buildTshirtArtifacts(value)
          : undefined,
      ),
    );
  }
  assertComponentDocument(value.components, value.taxonomy);
  if (
    value.components.components.some(
      (component) => component.assignments.length,
    )
  ) {
    assertComponentReferences(
      value.components,
      value.taxonomy,
      componentTokenCatalog(value),
      { sourceOnly: true },
    );
  }
}

export const restoreAuthoringSnapshotAtom = atom(
  null,
  (_get, set, snapshot: EditSessionSnapshot) => {
    assertStoredSnapshot(snapshot);
    set(clearStructurePreviewsAtom);
    set(taxonomyContributionsEnabledAtom, false);
    try {
      set(
        restoreTaxonomySnapshotAtom,
        snapshot.taxonomy ??
          structuredClone(designSystemDefaults.system.taxonomy),
      );
      set(colorSystemDocumentAtom, snapshot.colorSystem);
      set(typographyDocumentAtom, snapshot.typography);
      if (snapshot.spacing) set(spacingDocumentAtom, snapshot.spacing);
      if (snapshot.size) set(sizeDocumentAtom, snapshot.size);
      if (snapshot.radius) set(radiusDocumentAtom, snapshot.radius);
      if (snapshot.elevation) set(elevationDocumentAtom, snapshot.elevation);
      if (snapshot.opacity) set(opacityDocumentAtom, snapshot.opacity);
      set(structuresDocumentAtom, snapshot.structures!);
      if (
        JSON.stringify(_get(componentsDocumentAtom)) !==
        JSON.stringify(snapshot.components)
      ) {
        set(componentDraftRevisionAtom, (revision) => revision + 1);
      }
      set(componentsDocumentAtom, snapshot.components!);
      if (
        !snapshot.structures!.structures.some(
          (item) => item.conceptId === _get(selectedStructureIdAtom),
        )
      )
        set(selectedStructureIdAtom, null);
      if (snapshot.rules) set(rulesAtom, snapshot.rules);
      if (snapshot.scaleTypes) set(scaleTypesAtom, snapshot.scaleTypes);
      if (snapshot.interpolations)
        set(interpolationsAtom, snapshot.interpolations);
      set(tokenOverridesAtom, snapshot.tokenOverrides);
      set(aliasesAtom, snapshot.aliases ?? structuredClone(EMPTY_ALIASES));
      set(browserTokenEditsAtom, snapshot.browserTokenEdits ?? {});
      set(modeSetsAtom, snapshot.modeSets);
      set(platformsAtom, snapshot.platforms);
      set(adaptiveClaimsAtom, snapshot.adaptiveClaims);
      set(
        modeSelectionAtom,
        normalizeModeState({
          modeSets: snapshot.modeSets,
          selection: _get(modeSelectionAtom),
          claims: snapshot.adaptiveClaims,
        }).selection,
      );
      set(previewOverridesAtom, {});
    } finally {
      set(taxonomyContributionsEnabledAtom, true);
    }
  },
);

export function captureAuthoringRecord(
  get: Getter,
): AuthoringRecord<EditSessionSnapshot> {
  const working = captureSnapshot(get);
  const saved = get(editSessionSnapshotAtom) ?? createDefaultSnapshot();
  return {
    version: AUTHORING_RECORD_VERSION,
    working,
    saved,
    isEditing: get(editModeAtom),
    attachments: pruneFoundationModeAttachments(
      get(foundationModeAttachmentsAtom),
      working.modeSets,
    ),
    savedAttachments: pruneFoundationModeAttachments(
      get(savedFoundationModeAttachmentsAtom),
      saved.modeSets,
    ),
  };
}

export const enterEditModeAtom = atom(null, (get, set) => {
  if (!get(editSessionSnapshotAtom))
    set(editSessionSnapshotAtom, captureSnapshot(get));
  set(editModeAtom, true);
});

export const cancelEditAtom = atom(null, (get, set) => {
  const snapshot = get(editSessionSnapshotAtom);
  if (snapshot) {
    const attachments = pruneFoundationModeAttachments(
      get(savedFoundationModeAttachmentsAtom),
      snapshot.modeSets,
    );
    writeAuthoringRecord({
      version: AUTHORING_RECORD_VERSION,
      working: snapshot,
      saved: snapshot,
      isEditing: false,
      attachments,
      savedAttachments: attachments,
    });
    set(restoreAuthoringSnapshotAtom, structuredClone(snapshot));
    set(foundationModeAttachmentsAtom, structuredClone(attachments));
  }
  set(editModeAtom, false);
});

/** Save commits working data and its cancellation baseline together. */
export const saveEditAtom = atom(null, (get, set) => {
  const snapshot = structuredClone(captureSnapshot(get));
  const attachments = structuredClone(
    pruneFoundationModeAttachments(
      get(foundationModeAttachmentsAtom),
      snapshot.modeSets,
    ),
  );
  assertStoredSnapshot({ ...snapshot, aliases: EMPTY_ALIASES });
  const generated = buildTshirtArtifacts(snapshot, "saved");
  const previous = get(editSessionSnapshotAtom) ?? createDefaultSnapshot();
  assertStoredSnapshot(previous);
  const aliasPlan = planAliasesForSave(
    snapshot.aliases ?? EMPTY_ALIASES,
    canonicalAliasSourceTargets(
      completeAliasSource(previous),
      buildTshirtArtifacts(previous, "saved"),
    ),
    canonicalAliasSourceTargets(completeAliasSource(snapshot), generated),
    reindexedCustomContrastTokenIds(
      previous.colorSystem,
      snapshot.colorSystem,
      previous.rules!,
      snapshot.rules!,
    ),
  );
  snapshot.aliases = aliasPlan.document;
  writeAuthoringRecord({
    version: AUTHORING_RECORD_VERSION,
    working: snapshot,
    saved: snapshot,
    isEditing: get(editModeAtom),
    attachments,
    savedAttachments: attachments,
  });
  set(editSessionSnapshotAtom, snapshot);
  set(aliasesAtom, snapshot.aliases);
  set(foundationModeAttachmentsAtom, attachments);
  set(savedFoundationModeAttachmentsAtom, attachments);
  set(clearPersistenceIssuesAtom, "authoring");
  return { skippedAliases: aliasPlan.skippedNames };
});

export const submitForReviewAtom = atom(null, (_get, set) => {
  set(editModeAtom, false);
});

export const resetAllAuthoringAtom = atom(null, (get, set) => {
  const snapshot = createDefaultSnapshot();
  assertStoredSnapshot(snapshot);
  writeAuthoringRecord(
    {
      version: AUTHORING_RECORD_VERSION,
      working: snapshot,
      saved: snapshot,
      isEditing: get(editModeAtom),
      attachments: structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
      savedAttachments: structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
    },
    true,
  );
  set(restoreAuthoringSnapshotAtom, snapshot);
  set(componentDraftRevisionAtom, (revision) => revision + 1);
  set(editSessionSnapshotAtom, structuredClone(snapshot));
  set(
    foundationModeAttachmentsAtom,
    structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
  );
  set(
    savedFoundationModeAttachmentsAtom,
    structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
  );
  set(clearPersistenceIssuesAtom, "authoring");
});

const componentSourceFields: Record<string, keyof EditSessionSnapshot> = {
  "foundations/color": "colorSystem",
  "foundations/typography": "typography",
  "foundations/spacing": "spacing",
  "foundations/size": "size",
  "foundations/radius": "radius",
  "foundations/elevation": "elevation",
  "foundations/opacity": "opacity",
  "design/structures": "structures",
  "registry/taxonomy": "taxonomy",
  "modes/mode-sets": "modeSets",
  "rules/library": "rules",
  "logic/scale-types": "scaleTypes",
  "logic/interpolations": "interpolations",
  components: "components",
  "tokens/browser/edits": "browserTokenEdits",
  "tokens/color/overrides": "tokenOverrides",
};
registerAuthoringGuard("component-dependencies", (get, updates) => {
  const overrides = Object.fromEntries(
    [...updates].flatMap(([key, next]) =>
      componentSourceFields[key] ? [[componentSourceFields[key], next]] : [],
    ),
  );
  if (!Object.keys(overrides).length || !get(taxonomyContributionsEnabledAtom))
    return;
  if (
    !updates.has("components") &&
    !get(componentsDocumentAtom).components.some(
      (component) => component.assignments.length,
    )
  )
    return;
  const candidate = { ...captureSnapshot(get), ...overrides };
  if (!isSnapshot(candidate) || !candidate?.taxonomy)
    throw new Error("The component dependency update has invalid source data.");
  if (
    updates.has("foundations/color") &&
    !updates.has("components") &&
    matchesComponentContrastWitness(
      get(componentContrastWitnessAtom),
      candidate,
    )
  )
    return;
  const components = candidate.components ?? get(componentsDocumentAtom);
  assertComponentDocument(components, candidate.taxonomy);
  assertComponentReferences(
    components,
    candidate.taxonomy,
    componentTokenCatalog(candidate, get(componentColorWitnessAtom)),
    { sourceOnly: true },
  );
});
