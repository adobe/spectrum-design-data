// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import {
  colorSystemDocumentAtom,
  removePaletteColorAtom,
  resolveColorDocument,
} from "../color-system/state";
import { modeSetsAtom } from "../modes/state";
import {
  MODE_SET_DEFAULTS,
  cloneModeSet,
  ensureModeSetKeys,
  modeSetDefaultMode,
  type ModeSet,
} from "../modes/model";
import { capabilityOwners, parameterOwners } from "../modes/parameters";
import { ADAPTIVE_CLAIM_DEFAULTS, adaptiveClaimsAtom } from "../modes/adaptive";
import type { ColorSystemDocument } from "../color-system/model";
import { resolveToken } from "../tokens/state";
import { PALETTE_SCALE_ID } from "../tokens/model";
import { buildCascadeTokenExport } from "../tokens/cascadeExport";
import { tokenOverridesAtom } from "../tokens/overrides";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import { resetBrowserTokenAtom } from "../tokens/browserState";
import { savedBrowserTokensAtom } from "../tokens/browserSavedState";
import { tokenValueText } from "../tokens/browserModel";
import { sourceValuePreview } from "../tokens/valuePreview";
import { TYPOGRAPHY_DEFAULTS } from "../typography/defaults";
import {
  restoreTypographyDefaultsAtom,
  typographyDocumentAtom,
} from "../typography/state";
import { assertTypographyNames } from "../typography/lineHeightNames";
import { SPACING_DEFAULTS } from "../spacing/defaults";
import { spacingDocumentAtom } from "../spacing/state";
import { SIZE_DEFAULTS } from "../size/defaults";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { RADIUS_DEFAULTS } from "../radius/defaults";
import {
  RULE_DEFAULTS,
  removeRuleAtom,
  rulesAtom,
  writeReferences,
} from "../logic/state";
import {
  reassignConsumers,
  ruleConsumers,
  type RuleReferenceDocuments,
} from "../logic/consumers";
import { WHOLE_NUMBERS_RULE_ID } from "../logic/model";
import {
  INTERPOLATION_DEFAULTS,
  SCALE_TYPE_DEFAULTS,
  interpolationsAtom,
  scaleTypesAtom,
} from "../logic/scaleTypeLibrary";
import { removeInterpolationWithFallbackAtom } from "../logic/interpolationReferences";
import { removeScaleTypeWithFallbackAtom } from "../logic/scaleTypeReferences";
import {
  defaultColorDocument,
  buildChangeGroups,
  generateDocumentTokens,
  type ChangeItem,
  type ChangeTopic,
} from "./changes";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { taxonomyChangeFields } from "../taxonomy/changes";
import { designSystemDefaults } from "../../data/defaults";
import {
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
  restoreAuthoringSnapshotAtom,
} from "../edit-session/state";
import { aliasesAtom } from "../tokens/aliasState";
import { elevationDocumentAtom } from "../elevation/state";
import { ELEVATION_DEFAULTS } from "../elevation/defaults";
import { elevationChanges, elevationTokenChanges } from "../elevation/changes";
import { elevationOwnerIds } from "../elevation/output";
import {
  assertStructureReferences,
  assertStructureTaxonomy,
  structureGeneration,
} from "../structures/model";
import {
  structuresDocumentAtom,
  selectedStructureIdAtom,
  removeStructureAtom,
} from "../structures/state";
import { structureChanges } from "../structures/changes";
import { availablePrimitiveReferences } from "../tokens/primitiveIdentity";
import { editModeAtom } from "../../state/view/editMode";
import {
  shippedTshirtArtifactsAtom,
  workingTshirtArtifactsAtom,
} from "../design-data/tshirtState";
import { tshirtTokenChanges } from "../design-data/tshirtChanges";
import { removeDataVisScaleAtom } from "../color-system/data-vis/state";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { tokenUuid } from "../tokens/model";
import { removeColorTokenRecords } from "../color-system/colorTokenCleanup";
import {
  editStaticMemberOverrides,
  staticCategoricalTokenIds,
} from "../color-system/data-vis/frozenColors";
import { componentsDocumentAtom } from "../components/documentState";
import { EMPTY_COMPONENTS } from "../components/model";
import { componentChanges } from "../components/changes";
import { editComponentsAtom } from "../components/state";
import { ColorOutputError } from "../color-system/outputContrast";
import {
  parityChangeGroupsAtom,
  tokenComparisonResultAtom,
} from "./comparisonState";

const savedChangeTokensAtom = atom((get) => {
  const document = get(colorSystemDocumentAtom);
  const modeSets = get(modeSetsAtom);
  const overrides = get(tokenOverridesAtom);
  const defaultModes = modeSets
    .map(modeSetDefaultMode)
    .filter((mode) => mode !== undefined);
  return generateDocumentTokens(
    resolveColorDocument(document, defaultModes, undefined, { modeSets }),
    get(rulesAtom),
  ).map((generated) => resolveToken(generated, overrides[generated.uuid]));
});

export const savedModeTokenRowsAtom = atom((get) => {
  const document = get(colorSystemDocumentAtom);
  const modeSets = get(modeSetsAtom);
  const defaults = [...MODE_SET_DEFAULTS];
  const overrides = get(tokenOverridesAtom);
  const defaultModes = defaults
    .map(modeSetDefaultMode)
    .filter((mode) => mode !== undefined);
  const currentModes = modeSets
    .map(modeSetDefaultMode)
    .filter((mode) => mode !== undefined);
  const colorRows = (
    base: ColorSystemDocument,
    sets: typeof modeSets,
    modes: typeof currentModes,
    tokenOverrides: typeof overrides,
    includeBrowserEdits = false,
  ) =>
    buildCascadeTokenExport({
      base,
      modeSets: sets,
      activeModes: modes,
      activeTokens: [],
      overrides: tokenOverrides,
      rules: get(rulesAtom),
      ...(includeBrowserEdits && { browserEdits: get(browserTokenEditsAtom) }),
    }).tokens.filter((row) => row.name.property === "color");
  return {
    baseline: colorRows(defaultColorDocument, defaults, defaultModes, {}),
    generated: colorRows(document, modeSets, currentModes, {}),
    current: colorRows(document, modeSets, currentModes, overrides, true),
    overrides,
  };
});

export const legacyChangeGroupsAtom = atom((get) => {
  const groups = buildChangeGroups(
    get(colorSystemDocumentAtom),
    get(savedChangeTokensAtom),
    get(modeSetsAtom),
    generateDocumentTokens(
      resolveColorDocument(
        defaultColorDocument,
        MODE_SET_DEFAULTS.map(modeSetDefaultMode).filter(
          (mode) => mode !== undefined,
        ),
        undefined,
        { modeSets: [...MODE_SET_DEFAULTS] },
      ),
    ),
    get(savedModeTokenRowsAtom),
    get(typographyDocumentAtom),
    get(spacingDocumentAtom),
    get(rulesAtom),
    get(scaleTypesAtom),
    get(interpolationsAtom),
    get(sizeDocumentAtom),
    get(radiusDocumentAtom),
  );
  const edits = get(browserTokenEditsAtom);
  const combinations = get(savedBrowserTokensAtom);
  const elevationItems = elevationChanges(
    ELEVATION_DEFAULTS,
    get(elevationDocumentAtom),
  );
  if (elevationItems.length) {
    const foundationGroup = groups.find((group) => group.id === "foundations");
    if (foundationGroup) {
      foundationGroup.items.push(...elevationItems);
      foundationGroup.count += elevationItems.reduce(
        (total, item) => total + item.fields.length,
        0,
      );
    } else
      groups.push({
        id: "foundations",
        label: "Foundations",
        count: elevationItems.reduce(
          (total, item) => total + item.fields.length,
          0,
        ),
        items: elevationItems,
      });
  }
  const tokenGroup = groups.find((group) => group.id === "tokens") ?? {
    id: "tokens" as const,
    label: "Tokens",
    count: 0,
    items: [],
  };
  const aliases = get(authoringSnapshotAtom).aliases?.tokens ?? [];
  for (const alias of aliases)
    tokenGroup.items.push({
      id: alias.id,
      topic: "tokens",
      sourceKind: "compatibility-alias",
      kind: "new",
      title: alias.name,
      fields: [{ key: "Compatibility alias target", after: alias.$ref }],
    });
  for (const alias of get(editSessionSnapshotAtom)?.aliases?.tokens ?? [])
    if (!aliases.some((item) => item.id === alias.id))
      tokenGroup.items.push({
        id: alias.id,
        topic: "tokens",
        sourceKind: "compatibility-alias",
        kind: "removed",
        title: alias.name,
        fields: [{ key: "Compatibility alias target", before: alias.$ref }],
      });
  const variants = get(workingTshirtArtifactsAtom),
    shipped = get(shippedTshirtArtifactsAtom);
  if (variants.status === "ready" && shipped.status === "ready")
    tokenGroup.items.push(
      ...tshirtTokenChanges(shipped.bundle, variants.bundle),
    );
  tokenGroup.items.push(
    ...elevationTokenChanges(
      combinations,
      elevationOwnerIds(get(modeSetsAtom)),
    ),
  );
  for (const scale of get(colorSystemDocumentAtom).dataVisScales)
    if (scale.kind === "categorical") {
      for (const color of scale.staticColors ?? [])
        if (color.overrideValue !== undefined) {
          const id = dataVisMemberId(scale.id, color.id);
          const source = combinations
            .flatMap((combination) => combination.sources)
            .find((source) => source.id === id);
          if (!source)
            throw new Error(
              "A shared Static edit has no categorical token identity.",
            );
          const existing = tokenGroup.items.find((item) => item.id === id);
          const field = {
            key: "Value (all modes)",
            before: color.value,
            after: color.overrideValue,
            beforePreview: sourceValuePreview(source, color.value),
            afterPreview: sourceValuePreview(source, color.overrideValue),
          };
          if (existing) existing.fields.push(field);
          else
            tokenGroup.items.push({
              id,
              conceptId: tokenUuid(`concept:${id}`),
              topic: "tokens",
              sourceKind: "token",
              kind: "modified",
              title: source.name,
              fields: [field],
            });
        }
    }
  for (const [id, edit] of Object.entries(edits)) {
    const source = combinations
      .flatMap((combination) => combination.sources)
      .find((token) => token.id === id);
    if (!source) continue;
    const fields: ChangeItem["fields"] = [];
    if (edit.name !== undefined)
      fields.push({ key: "Name", before: source.name, after: edit.name });
    if (edit.description !== undefined)
      fields.push({ key: "Description", before: "", after: edit.description });
    if (edit.status !== undefined)
      fields.push({ key: "Status", before: "Draft", after: "Deprecated" });
    for (const combination of combinations) {
      const value = edit.values[combination.modeKey];
      const generated = combination.sources.find((token) => token.id === id);
      if (value && generated && !source.dataVis?.static)
        fields.push({
          key: `Value (${combination.label})`,
          before: tokenValueText(generated),
          after: tokenValueText({ value: value.value, unit: generated.unit }),
          beforePreview: sourceValuePreview(generated),
          afterPreview: sourceValuePreview(generated, value.value),
        });
    }
    if (!fields.length) continue;
    const existing = tokenGroup.items.find((item) => item.id === id);
    if (existing) existing.fields.push(...fields);
    else
      tokenGroup.items.push({
        id,
        conceptId: id,
        topic: "tokens",
        sourceKind: "token",
        kind: "modified",
        title: edit.name ?? source.name,
        fields,
      });
  }
  tokenGroup.count = tokenGroup.items.reduce(
    (total, item) => total + item.fields.length,
    0,
  );
  if (tokenGroup.count && !groups.includes(tokenGroup)) groups.push(tokenGroup);
  const taxonomyFields = taxonomyChangeFields(
    designSystemDefaults.system.taxonomy,
    get(taxonomyDocumentAtom),
  );
  if (taxonomyFields.length)
    groups.push({
      id: "registry",
      label: "Registry",
      count: taxonomyFields.length,
      items: [
        {
          id: "taxonomy",
          topic: "registry",
          sourceKind: "taxonomy",
          kind: "modified",
          title: "Taxonomy and classifications",
          fields: taxonomyFields,
        },
      ],
    });
  const structures = structureChanges(
    get(structuresDocumentAtom),
    get(taxonomyDocumentAtom),
    designSystemDefaults.system.structures,
  );
  if (structures.length)
    groups.push({
      id: "structures",
      label: "Structures",
      count: structures.reduce((count, item) => count + item.fields.length, 0),
      items: structures,
    });
  const components = componentChanges(
    get(componentsDocumentAtom),
    designSystemDefaults.system.components ?? EMPTY_COMPONENTS,
  );
  if (components.length)
    groups.push({
      id: "components",
      label: "Components",
      count: components.reduce((count, item) => count + item.fields.length, 0),
      items: components,
    });
  return groups;
});

export const changeGroupsAtom = parityChangeGroupsAtom;

function referenceDocuments(get: Getter): RuleReferenceDocuments {
  return {
    typography: get(typographyDocumentAtom),
    spacing: get(spacingDocumentAtom),
    size: get(sizeDocumentAtom),
    radius: get(radiusDocumentAtom),
  };
}

/** Slots on the fallback or on a missing rule return to the rule they shipped with. */
function repointToShippedRules(get: Getter, set: Setter, onlyRuleId?: string) {
  const rules = get(rulesAtom);
  const shipped = new Map(
    ruleConsumers({
      typography: TYPOGRAPHY_DEFAULTS,
      spacing: SPACING_DEFAULTS,
      size: SIZE_DEFAULTS,
      radius: RADIUS_DEFAULTS,
    }).map((consumer) => [consumer.id, consumer.ruleId]),
  );
  const documents = referenceDocuments(get);
  const stale = ruleConsumers(documents).filter((consumer) => {
    const target = shipped.get(consumer.id);
    if (
      !target ||
      target === consumer.ruleId ||
      (onlyRuleId && target !== onlyRuleId)
    )
      return false;
    return (
      consumer.ruleId === WHOLE_NUMBERS_RULE_ID ||
      !rules.some((rule) => rule.id === consumer.ruleId)
    );
  });
  if (stale.length > 0)
    writeReferences(
      set,
      reassignConsumers(
        documents,
        stale,
        (consumer) => shipped.get(consumer.id)!,
      ),
    );
}

function revertRule(get: Getter, set: Setter, id: string) {
  if (!RULE_DEFAULTS.some((rule) => rule.id === id)) {
    set(removeRuleAtom, id);
    return;
  }
  set(
    rulesAtom,
    restoreObject(structuredClone([...RULE_DEFAULTS]), get(rulesAtom), id),
  );
  repointToShippedRules(get, set, id);
}

export const changeCountAtom = atom((get) =>
  get(changeGroupsAtom).reduce((total, group) => total + group.count, 0),
);

export const changeGroupsResultAtom = atom((get) => {
  const comparison = get(tokenComparisonResultAtom);
  if (comparison.status === "unavailable") {
    return comparison.failure instanceof ColorOutputError
      ? {
          status: "blocked" as const,
          error: comparison.failure,
          groups: get(changeGroupsAtom),
        }
      : {
          status: "unavailable" as const,
          error: comparison.error,
          groups: get(changeGroupsAtom),
        };
  }
  try {
    return { status: "ready" as const, groups: get(changeGroupsAtom) };
  } catch (error) {
    if (!(error instanceof ColorOutputError)) throw error;
    return { status: "blocked" as const, error };
  }
});

export const revertBlockedColorValueAtom = atom(
  null,
  (get, set, tokenId: string) => {
    const result = get(changeGroupsResultAtom);
    if (
      result.status !== "blocked" ||
      result.error.details.tokenId !== tokenId
    ) {
      throw new Error("This color no longer has a blocked manual output.");
    }
    const overrides = { ...get(tokenOverridesAtom) };
    if (overrides[tokenId]) {
      const { value, ...override } = overrides[tokenId];
      void value;
      if (override.name !== undefined) overrides[tokenId] = override;
      else delete overrides[tokenId];
      set(tokenOverridesAtom, overrides);
    }
    const edits = get(browserTokenEditsAtom);
    if (edits[tokenId])
      set(browserTokenEditsAtom, {
        ...edits,
        [tokenId]: { ...edits[tokenId], values: {} },
      });
  },
);

function restoreObject<T extends { id: string }>(
  defaults: T[],
  current: T[],
  id: string,
): T[] {
  const baseline = defaults.find((item) => item.id === id);
  const without = current.filter((item) => item.id !== id);
  if (!baseline) return without;
  const preceding = defaults.slice(
    0,
    defaults.findIndex((item) => item.id === id),
  );
  const index = preceding.filter((item) =>
    without.some((other) => other.id === item.id),
  ).length;
  return [...without.slice(0, index), baseline, ...without.slice(index)];
}

function restoreFoundation(
  document: ColorSystemDocument,
  item: ChangeItem,
): ColorSystemDocument {
  const defaults = defaultColorDocument;
  switch (item.sourceKind) {
    case "palette-color":
      return {
        ...document,
        palette: restoreObject(defaults.palette, document.palette, item.id),
      };
    case "scale":
      return {
        ...document,
        scales: restoreObject(defaults.scales, document.scales, item.id),
      };
    case "contrast":
      return {
        ...document,
        contrasts: restoreObject(
          defaults.contrasts,
          document.contrasts,
          item.id,
        ),
      };
    case "surface":
      return {
        ...document,
        surfaces: restoreObject(defaults.surfaces, document.surfaces, item.id),
      };
    case "settings":
      return {
        ...document,
        settings: defaults.settings,
        background: defaults.background,
        backgroundScaleId: defaults.backgroundScaleId,
        backgroundLightness: defaults.backgroundLightness,
      };
    default:
      return document;
  }
}

function restoreTokenStructure(
  document: ColorSystemDocument,
  item: ChangeItem,
): ColorSystemDocument {
  if (!item.source) return document;
  const { scaleId, contrastId } = item.source;
  if (defaultColorDocument.scales.some((scale) => scale.id === scaleId)) {
    if (document.scales.some((scale) => scale.id === scaleId)) {
      return {
        ...document,
        contrasts: restoreObject(
          defaultColorDocument.contrasts,
          document.contrasts,
          contrastId,
        ),
      };
    }
    return {
      ...document,
      scales: restoreObject(
        defaultColorDocument.scales,
        document.scales,
        scaleId,
      ),
    };
  }
  return {
    ...document,
    scales: document.scales.filter((scale) => scale.id !== scaleId),
  };
}

/** A shipped color is restored in place; an added one is removed and its links keep the color's value. */
function revertPaletteColor(get: Getter, set: Setter, id: string) {
  if (defaultColorDocument.palette.some((color) => color.id === id)) {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      palette: restoreObject(
        defaultColorDocument.palette,
        document.palette,
        id,
      ),
    });
    return;
  }
  set(removePaletteColorAtom, id);
}

function restoreModeColorSource(
  item: ChangeItem,
  modeSets: ModeSet[],
): ModeSet[] | null {
  const changedModes = item.fields
    .filter((field) => field.generated && field.key.startsWith("Value · "))
    .flatMap((field) => field.key.slice("Value · ".length).split(" / "));
  const owners = parameterOwners(modeSets);
  const scaleOwner = capabilityOwners(modeSets)["color.scales"];
  const scaleId = item.source?.scaleId;
  let restored = false;
  const next = modeSets.map((modeSet) => ({
    ...modeSet,
    modes: modeSet.modes.map((mode) => {
      if (
        restored ||
        mode.id === modeSet.defaultModeId ||
        !changedModes.includes(mode.key) ||
        !mode.foundations.color
      )
        return mode;
      const baseline = MODE_SET_DEFAULTS.find(
        (set) => set.id === modeSet.id,
      )?.modes.find((candidate) => candidate.id === mode.id)?.foundations.color;
      const color = { ...mode.foundations.color };
      const contrastId = item.source?.contrastId;
      if (
        scaleId &&
        contrastId &&
        owners["color.contrastMultiplier"] === modeSet.id &&
        color.scaleContrasts?.[scaleId]?.[contrastId] !== undefined
      ) {
        const scales = { ...color.scaleContrasts },
          steps = { ...scales[scaleId] };
        delete steps[contrastId];
        if (Object.keys(steps).length) scales[scaleId] = steps;
        else delete scales[scaleId];
        if (Object.keys(scales).length) color.scaleContrasts = scales;
        else delete color.scaleContrasts;
      } else if (
        scaleId &&
        scaleOwner === modeSet.id &&
        color.scaleStops?.[scaleId]
      ) {
        const scaleStops = { ...color.scaleStops };
        delete scaleStops[scaleId];
        if (Object.keys(scaleStops).length) color.scaleStops = scaleStops;
        else delete color.scaleStops;
      } else if (
        owners["color.backgroundScaleId"] === modeSet.id &&
        color.backgroundScaleId !== baseline?.backgroundScaleId
      ) {
        if (baseline?.backgroundScaleId !== undefined)
          color.backgroundScaleId = baseline.backgroundScaleId;
        else delete color.backgroundScaleId;
      } else if (
        owners["color.backgroundLightness"] === modeSet.id &&
        color.backgroundLightness !== baseline?.backgroundLightness
      ) {
        if (baseline?.backgroundLightness !== undefined)
          color.backgroundLightness = baseline.backgroundLightness;
        else delete color.backgroundLightness;
      } else if (
        owners["color.contrastMultiplier"] === modeSet.id &&
        color.contrastMultiplier !== baseline?.contrastMultiplier
      ) {
        if (baseline?.contrastMultiplier !== undefined)
          color.contrastMultiplier = baseline.contrastMultiplier;
        else delete color.contrastMultiplier;
      } else return mode;
      restored = true;
      return {
        ...mode,
        foundations: {
          ...mode.foundations,
          color: Object.keys(color).length ? color : undefined,
        },
      };
    }),
  }));
  return restored ? next : null;
}

export const revertChangeItemAtom = atom(null, (get, set, item: ChangeItem) => {
  if (item.topic === "components") {
    const baseline = designSystemDefaults.system.components ?? EMPTY_COMPONENTS;
    const original = baseline.components.find(
      (record) => record.id === item.id,
    );
    const document = get(componentsDocumentAtom);
    const index = document.components.findIndex(
      (record) => record.id === item.id,
    );
    const records = document.components.filter(
      (record) => record.id !== item.id,
    );
    if (original)
      records.splice(
        index < 0
          ? Math.min(baseline.components.indexOf(original), records.length)
          : index,
        0,
        structuredClone(original),
      );
    set(editComponentsAtom, { ...document, components: records });
    return;
  }
  if (item.topic === "tokens") {
    const document = get(colorSystemDocumentAtom);
    const scale = document.dataVisScales.find(
      (scale) =>
        scale.kind === "categorical" &&
        scale.staticColors?.some(
          (color) =>
            color.overrideValue !== undefined &&
            (dataVisMemberId(scale.id, color.id) === item.id ||
              tokenUuid(`concept:${dataVisMemberId(scale.id, color.id)}`) ===
                item.conceptId),
        ),
    );
    const color = scale?.staticColors?.find(
      (color) =>
        dataVisMemberId(scale.id, color.id) === item.id ||
        tokenUuid(`concept:${dataVisMemberId(scale.id, color.id)}`) ===
          item.conceptId,
    );
    if (scale && color) {
      if (!get(editModeAtom))
        throw new Error("Enter edit mode to revert a shared Static color.");
      set(resetBrowserTokenAtom, dataVisMemberId(scale.id, color.id));
      return;
    }
  }
  if (item.sourceKind === "compatibility-alias") {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to revert an alias change.");
    const current = get(aliasesAtom);
    const saved = get(editSessionSnapshotAtom)?.aliases?.tokens.find(
      (alias) => alias.id === item.id,
    );
    set(aliasesAtom, {
      ...current,
      tokens:
        item.kind === "removed" && saved
          ? [...current.tokens.filter((alias) => alias.id !== item.id), saved]
          : current.tokens.filter((alias) => alias.id !== item.id),
    });
    return;
  }
  if (item.sourceKind === "semantic-token")
    throw new Error(
      "Revert generated variants through their Structure application, rule or foundation source.",
    );
  if (item.topic === "structures") {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to revert structures.");
    const defaults = designSystemDefaults.system.structures.structures;
    const baseline = defaults.find(
      (structure) => structure.conceptId === item.id,
    );
    if (!baseline) {
      set(removeStructureAtom, item.id);
      return;
    }
    const document = get(structuresDocumentAtom);
    const existingIndex = document.structures.findIndex(
      (structure) => structure.conceptId === item.id,
    );
    const index =
      existingIndex < 0
        ? Math.min(defaults.indexOf(baseline), document.structures.length)
        : existingIndex;
    const structures = document.structures.filter(
      (structure) => structure.conceptId !== item.id,
    );
    structures.splice(index, 0, structuredClone(baseline));
    set(restoreAuthoringSnapshotAtom, {
      ...get(authoringSnapshotAtom),
      structures: { ...document, structures },
    });
    return;
  }
  if (item.topic === "registry") {
    assertTypographyNames(
      get(typographyDocumentAtom),
      designSystemDefaults.system.taxonomy,
    );
    assertStructureTaxonomy(
      get(structuresDocumentAtom),
      designSystemDefaults.system.taxonomy,
    );
    set(
      taxonomyDocumentAtom,
      structuredClone(designSystemDefaults.system.taxonomy),
    );
    return;
  }
  if (item.topic === "tokens" && get(browserTokenEditsAtom)[item.id]) {
    const next = { ...get(browserTokenEditsAtom) };
    delete next[item.id];
    set(browserTokenEditsAtom, next);
    const legacy = { ...get(tokenOverridesAtom) };
    delete legacy[item.id];
    set(tokenOverridesAtom, legacy);
    return;
  }
  if (item.topic === "tokens" && item.id.startsWith("elevation-")) {
    set(elevationDocumentAtom, structuredClone(ELEVATION_DEFAULTS));
    set(
      modeSetsAtom,
      get(modeSetsAtom).map((modeSet) => ({
        ...modeSet,
        modes: modeSet.modes.map((mode) => {
          const baseline = MODE_SET_DEFAULTS.find(
            (candidate) => candidate.id === modeSet.id,
          )?.modes.find((candidate) => candidate.id === mode.id)?.foundations
            .elevation;
          const foundations = { ...mode.foundations };
          if (baseline) foundations.elevation = structuredClone(baseline);
          else delete foundations.elevation;
          return { ...mode, foundations };
        }),
      })),
    );
    return;
  }
  if (item.topic === "logic") {
    if (item.sourceKind === "scale-type") {
      if (!SCALE_TYPE_DEFAULTS.some((scaleType) => scaleType.id === item.id))
        set(removeScaleTypeWithFallbackAtom, item.id);
      else
        set(
          scaleTypesAtom,
          restoreObject(
            structuredClone([...SCALE_TYPE_DEFAULTS]),
            get(scaleTypesAtom),
            item.id,
          ),
        );
      return;
    }
    if (item.sourceKind === "interpolation") {
      if (
        !INTERPOLATION_DEFAULTS.some(
          (interpolation) => interpolation.id === item.id,
        )
      )
        set(removeInterpolationWithFallbackAtom, item.id);
      else
        set(
          interpolationsAtom,
          restoreObject(
            structuredClone([...INTERPOLATION_DEFAULTS]),
            get(interpolationsAtom),
            item.id,
          ),
        );
      return;
    }
    revertRule(get, set, item.id);
    return;
  }
  if (item.topic === "modes") {
    if (item.sourceKind === "mode" && item.modeSetId) {
      const modeId = item.id.slice(item.modeSetId.length + 1);
      const baseline = MODE_SET_DEFAULTS.find(
        (modeSet) => modeSet.id === item.modeSetId,
      );
      set(
        modeSetsAtom,
        get(modeSetsAtom).map((modeSet) =>
          modeSet.id !== item.modeSetId
            ? modeSet
            : ensureModeSetKeys({
                ...modeSet,
                modes: restoreObject(
                  baseline?.modes ?? [],
                  modeSet.modes,
                  modeId,
                ),
              }),
        ),
      );
      return;
    }
    const baseline = MODE_SET_DEFAULTS.find(
      (modeSet) => modeSet.id === item.id,
    );
    set(
      modeSetsAtom,
      baseline
        ? get(modeSetsAtom).map((modeSet) =>
            modeSet.id === item.id ? cloneModeSet(baseline) : modeSet,
          )
        : get(modeSetsAtom).filter((modeSet) => modeSet.id !== item.id),
    );
    return;
  }
  if (item.topic === "foundations") {
    if (item.sourceKind === "data-vis-scale") {
      if (
        defaultColorDocument.dataVisScales.some((scale) => scale.id === item.id)
      ) {
        const document = get(colorSystemDocumentAtom);
        set(colorSystemDocumentAtom, {
          ...document,
          dataVisScales: restoreObject(
            structuredClone(defaultColorDocument.dataVisScales),
            document.dataVisScales,
            item.id,
          ),
        });
      } else set(removeDataVisScaleAtom, item.id);
      return;
    }
    if (item.sourceKind === "elevation") {
      const defaults = structuredClone(ELEVATION_DEFAULTS);
      set(elevationDocumentAtom, defaults);
      const ids = new Set(defaults.layers.map((layer) => layer.id));
      set(
        modeSetsAtom,
        get(modeSetsAtom).map((modeSet) => ({
          ...modeSet,
          modes: modeSet.modes.map((mode) => ({
            ...mode,
            foundations: {
              ...mode.foundations,
              ...(mode.foundations.elevation && {
                elevation: {
                  ...mode.foundations.elevation,
                  layerOpacities: Object.fromEntries(
                    Object.entries(
                      mode.foundations.elevation.layerOpacities ?? {},
                    ).filter(([id]) => ids.has(id)),
                  ),
                },
              }),
            },
          })),
        })),
      );
      return;
    }
    if (item.sourceKind === "typography") {
      set(restoreTypographyDefaultsAtom);
      return;
    }
    if (item.sourceKind === "spacing-scale") {
      const spacing = get(spacingDocumentAtom);
      set(spacingDocumentAtom, {
        ...spacing,
        scales: restoreObject(
          structuredClone(SPACING_DEFAULTS.scales),
          spacing.scales,
          item.id,
        ),
      });
      return;
    }
    if (item.sourceKind === "size-scale") {
      const size = get(sizeDocumentAtom);
      set(sizeDocumentAtom, {
        ...size,
        scales: restoreObject(
          structuredClone(SIZE_DEFAULTS.scales),
          size.scales,
          item.id,
        ),
      });
      return;
    }
    if (item.sourceKind === "radius-scale") {
      const radius = get(radiusDocumentAtom);
      set(radiusDocumentAtom, {
        ...radius,
        scales: restoreObject(
          structuredClone(RADIUS_DEFAULTS.scales),
          radius.scales,
          item.id,
        ),
      });
      return;
    }
    if (item.sourceKind === "palette-color") {
      revertPaletteColor(get, set, item.id);
      return;
    }
    set(
      colorSystemDocumentAtom,
      restoreFoundation(get(colorSystemDocumentAtom), item),
    );
    return;
  }
  if (item.source?.scaleId === PALETTE_SCALE_ID) {
    revertPaletteColor(get, set, item.source.contrastId);
    return;
  }
  if (item.kind !== "modified") {
    const categorical = get(colorSystemDocumentAtom).dataVisScales.find(
      (scale) =>
        scale.kind === "categorical" &&
        scale.members.some(
          (member) =>
            tokenUuid(`concept:${dataVisMemberId(scale.id, member.id)}`) ===
            item.conceptId,
        ),
    );
    if (categorical) {
      set(removeDataVisScaleAtom, categorical.id);
      return;
    }
    set(
      colorSystemDocumentAtom,
      restoreTokenStructure(get(colorSystemDocumentAtom), item),
    );
    return;
  }
  const overrides = get(tokenOverridesAtom);
  if (overrides[item.id]) {
    const next = { ...overrides };
    delete next[item.id];
    set(tokenOverridesAtom, next);
    return;
  }
  // A generated-only difference has no token override to remove. Restore its
  // changed Foundations source rather than pinning an app-default token value.
  const document = get(colorSystemDocumentAtom);
  const scaleId = item.source?.scaleId;
  const contrastId = item.source?.contrastId;
  if (
    scaleId &&
    JSON.stringify(document.scales.find((scale) => scale.id === scaleId)) !==
      JSON.stringify(
        defaultColorDocument.scales.find((scale) => scale.id === scaleId),
      )
  ) {
    set(colorSystemDocumentAtom, {
      ...document,
      scales: restoreObject(
        defaultColorDocument.scales,
        document.scales,
        scaleId,
      ),
    });
  } else if (
    contrastId &&
    JSON.stringify(
      document.contrasts.find((contrast) => contrast.id === contrastId),
    ) !==
      JSON.stringify(
        defaultColorDocument.contrasts.find(
          (contrast) => contrast.id === contrastId,
        ),
      )
  ) {
    set(colorSystemDocumentAtom, {
      ...document,
      contrasts: restoreObject(
        defaultColorDocument.contrasts,
        document.contrasts,
        contrastId,
      ),
    });
  } else {
    const modeSets = restoreModeColorSource(item, get(modeSetsAtom));
    if (modeSets) {
      set(modeSetsAtom, modeSets);
      return;
    }
    set(
      colorSystemDocumentAtom,
      restoreFoundation(document, { ...item, sourceKind: "settings" }),
    );
  }
});

export const revertChangeTopicAtom = atom(
  null,
  (get, set, topic: ChangeTopic) => {
    if (topic === "components") {
      set(
        editComponentsAtom,
        structuredClone(
          designSystemDefaults.system.components ?? EMPTY_COMPONENTS,
        ),
      );
      return;
    }
    if (topic === "structures") {
      if (!get(editModeAtom))
        throw new Error("Enter edit mode to revert structures.");
      set(restoreAuthoringSnapshotAtom, {
        ...get(authoringSnapshotAtom),
        structures: structuredClone(designSystemDefaults.system.structures),
      });
      set(selectedStructureIdAtom, null);
      return;
    }
    if (topic === "registry") {
      assertStructureTaxonomy(
        get(structuresDocumentAtom),
        designSystemDefaults.system.taxonomy,
      );
      set(
        taxonomyDocumentAtom,
        structuredClone(designSystemDefaults.system.taxonomy),
      );
      return;
    }
    if (topic === "logic") {
      if (
        get(colorSystemDocumentAtom).scales.some(
          (scale) =>
            scale.customContrasts &&
            !RULE_DEFAULTS.some(
              (rule) => rule.id === scale.customContrasts?.namingRuleId,
            ),
        )
      ) {
        throw new Error(
          "Choose a shipped naming rule on custom color scales before reverting Logic.",
        );
      }
      if (
        get(structuresDocumentAtom).structures.some((structure) =>
          structureGeneration(structure).applications.some(
            (application) =>
              !RULE_DEFAULTS.some(
                (rule) =>
                  rule.id === application.ruleId &&
                  rule.type === "tshirt-sizing",
              ),
          ),
        )
      ) {
        throw new Error(
          "Remove Structure generation applications before reverting the rules they use.",
        );
      }
      set(rulesAtom, structuredClone([...RULE_DEFAULTS]));
      set(scaleTypesAtom, structuredClone([...SCALE_TYPE_DEFAULTS]));
      set(interpolationsAtom, structuredClone([...INTERPOLATION_DEFAULTS]));
      repointToShippedRules(get, set);
      return;
    }
    if (topic === "modes") {
      set(modeSetsAtom, MODE_SET_DEFAULTS.map(cloneModeSet));
      const ids = new Set(MODE_SET_DEFAULTS.map((modeSet) => modeSet.id));
      set(adaptiveClaimsAtom, {
        ...Object.fromEntries(
          Object.entries(get(adaptiveClaimsAtom)).filter(([, ownerId]) =>
            ids.has(ownerId),
          ),
        ),
        ...ADAPTIVE_CLAIM_DEFAULTS,
      });
      return;
    }
    if (topic === "foundations") {
      const categoricalIds = new Set(
        get(colorSystemDocumentAtom).dataVisScales.flatMap((scale) =>
          scale.kind === "categorical"
            ? scale.members.map((member) =>
                dataVisMemberId(scale.id, member.id),
              )
            : [],
        ),
      );
      if (
        get(aliasesAtom).tokens.some((alias) => categoricalIds.has(alias.$ref))
      ) {
        throw new Error(
          "Choose replacement alias targets before reverting the categorical foundations.",
        );
      }
      assertStructureReferences(
        get(structuresDocumentAtom),
        availablePrimitiveReferences({
          spacing: SPACING_DEFAULTS,
          size: SIZE_DEFAULTS,
          radius: RADIUS_DEFAULTS,
          elevation: ELEVATION_DEFAULTS,
          color: defaultColorDocument,
          typography: TYPOGRAPHY_DEFAULTS,
        }),
        undefined,
        TYPOGRAPHY_DEFAULTS,
      );
      set(colorSystemDocumentAtom, structuredClone(defaultColorDocument));
      removeColorTokenRecords(get, set, categoricalIds);
      set(typographyDocumentAtom, structuredClone(TYPOGRAPHY_DEFAULTS));
      set(spacingDocumentAtom, structuredClone(SPACING_DEFAULTS));
      set(sizeDocumentAtom, structuredClone(SIZE_DEFAULTS));
      set(radiusDocumentAtom, structuredClone(RADIUS_DEFAULTS));
      set(elevationDocumentAtom, structuredClone(ELEVATION_DEFAULTS));
      const ids = new Set(ELEVATION_DEFAULTS.layers.map((layer) => layer.id));
      set(
        modeSetsAtom,
        get(modeSetsAtom).map((modeSet) => ({
          ...modeSet,
          modes: modeSet.modes.map((mode) => ({
            ...mode,
            foundations: {
              ...mode.foundations,
              ...(mode.foundations.elevation && {
                elevation: {
                  ...mode.foundations.elevation,
                  layerOpacities: Object.fromEntries(
                    Object.entries(
                      mode.foundations.elevation.layerOpacities ?? {},
                    ).filter(([id]) => ids.has(id)),
                  ),
                },
              }),
            },
          })),
        })),
      );
      return;
    }
    // Generated differences belong to Foundations. Removing manual overrides
    // reveals the latest generated values without changing their sources.
    const document = get(colorSystemDocumentAtom),
      dormant = staticCategoricalTokenIds(document);
    set(
      colorSystemDocumentAtom,
      editStaticMemberOverrides(
        document,
        new Map([...dormant].map((id) => [id, null])),
      ),
    );
    set(
      tokenOverridesAtom,
      Object.fromEntries(
        Object.entries(get(tokenOverridesAtom)).filter(([id]) =>
          dormant.has(id),
        ),
      ),
    );
    set(
      browserTokenEditsAtom,
      Object.fromEntries(
        Object.entries(get(browserTokenEditsAtom))
          .filter(
            ([id, edit]) => dormant.has(id) && Object.keys(edit.values).length,
          )
          .map(([id, edit]) => [id, { values: edit.values }]),
      ),
    );
    set(aliasesAtom, { schemaVersion: 1, tokens: [] });
  },
);

export const resetAllChangeDataAtom = resetAllAuthoringAtom;
