// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { rulesAtom } from "../logic/library";
import { scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { modeParameterValuesAtom } from "../modes/parameterValues";
import {
  dimensionScaleSlug,
  generateDimensionScale,
  isDimensionDocument,
  type DimensionDocument,
  type DimensionScale,
} from "./foundation";
import { clampScaleRange, scaleStepName } from "./generate";
import {
  taxonomyContributionsEnabledAtom,
  withTaxonomyContributions,
} from "../taxonomy/contributions";
import { taxonomyDimensionSourceId } from "../taxonomy/model";
import {
  reconcileDimensionSourceNames,
  resolveDimensionSourceNames,
} from "../taxonomy/naming";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { governedFoundationContext } from "../taxonomy/foundationGovernance";
import { projectClassification } from "../taxonomy/model";
import { structuresDocumentAtom } from "../structures/documentState";
import { assertStructureReferences } from "../structures/model";
import { dimensionReferenceIds } from "../tokens/primitiveIdentity";

export type DimensionScalePatch = Partial<
  Pick<
    DimensionScale,
    | "name"
    | "scaleTypeId"
    | "base"
    | "below"
    | "above"
    | "parameters"
    | "bindings"
    | "roundingRuleId"
    | "hideFromPublishing"
  >
>;

export interface DimensionFoundationOptions<Version extends number> {
  /** Persistence key, such as `foundations/spacing`. */
  key: string;
  schemaVersion: Version;
  defaults: DimensionDocument<Version>;
  /** First part of every token name, such as `spacing`. */
  tokenPrefix: string;
  /** Prefix for ids of scales added by the user. */
  customIdPrefix: string;
  /** Upgrades documents saved under an older schema version. */
  migrate?: (
    data: unknown,
    fromVersion: number,
  ) => DimensionDocument<Version> | null;
}

/** Names must be unique by token slug, since the slug is part of every token name. */
export function isDimensionScaleNameTaken(
  document: DimensionDocument,
  name: string,
  exceptId?: string,
) {
  const slug = dimensionScaleSlug(name);
  return document.scales.some(
    (scale) => scale.id !== exceptId && dimensionScaleSlug(scale.name) === slug,
  );
}

/** State for a foundation made of dimension scales; spacing and size are two instances. */
export function createDimensionFoundationState<Version extends number>(
  options: DimensionFoundationOptions<Version>,
) {
  const { key, schemaVersion, defaults, tokenPrefix, customIdPrefix, migrate } =
    options;
  const scope =
    tokenPrefix === "spacing"
      ? "spacing"
      : tokenPrefix === "size"
        ? "size"
        : tokenPrefix === "radius"
          ? "radius"
          : undefined;
  if (!scope)
    throw new Error(`Unsupported dimension taxonomy scope ${tokenPrefix}.`);

  const storedDocumentAtom = persistedAtom<DimensionDocument<Version>>({
    key,
    schemaVersion,
    initialize: () => structuredClone(defaults),
    validate: (value): value is DimensionDocument<Version> =>
      isDimensionDocument(value, schemaVersion),
    migrate,
  });
  const namedDocumentAtom = withTaxonomyContributions(
    storedDocumentAtom,
    (document) =>
      document.scales.flatMap((scale) => [
        {
          sourceId: taxonomyDimensionSourceId(scope, scale.id),
          field: "foundationScale",
          value: scale.name,
        },
        ...Array.from(
          { length: scale.below + scale.above + 1 },
          (_, index) => ({
            sourceId: taxonomyDimensionSourceId(scope, scale.id),
            field: "scaleIndex",
            value: scaleStepName(index - scale.below, scale.below),
          }),
        ),
      ]),
    (value): value is DimensionDocument<Version> =>
      isDimensionDocument(value, schemaVersion),
    key,
    {
      resolve: (document, taxonomy) =>
        resolveDimensionSourceNames(document, taxonomy, scope),
      reconcile: (taxonomy, previous, next) =>
        reconcileDimensionSourceNames(taxonomy, previous, next, scope),
    },
  );
  const documentAtom = atom(
    (get) => get(namedDocumentAtom),
    (
      get,
      set,
      update:
        | DimensionDocument<Version>
        | ((
            previous: DimensionDocument<Version>,
          ) => DimensionDocument<Version>),
    ) => {
      const next =
        typeof update === "function" ? update(get(namedDocumentAtom)) : update;
      if (get(taxonomyContributionsEnabledAtom))
        assertStructureReferences(
          get(structuresDocumentAtom),
          new Map(
            [...dimensionReferenceIds(scope, next)].map((id) => [id, scope]),
          ),
          scope,
        );
      set(namedDocumentAtom, next);
    },
  );

  const generatedAtom = atom((get) => {
    const document = get(documentAtom);
    const rules = document.pendingRules
      ? [...get(rulesAtom), ...document.pendingRules]
      : get(rulesAtom);
    const scaleTypes = get(scaleTypesAtom);
    const modeValues = get(modeParameterValuesAtom);
    const taxonomy = get(taxonomyDocumentAtom);
    return document.scales.map((scale) => ({
      scale,
      values: generateDimensionScale(
        tokenPrefix,
        scale,
        rules,
        scaleTypes,
        modeValues,
      ).map((token) => {
        if (!scale.nameRef)
          throw new Error(`Source ${scale.id} has no registered name.`);
        const context = governedFoundationContext(
          taxonomy,
          scope,
          scale.nameRef,
          taxonomyDimensionSourceId(scope, scale.id),
          token.step,
        );
        const projection = projectClassification(
          taxonomy,
          context.governed!,
          scope,
        );
        if (projection.issues.length)
          throw new Error(projection.issues.join(" "));
        return { ...token, name: projection.name };
      }),
    }));
  });

  function nextScaleName(document: DimensionDocument) {
    let index = document.scales.length + 1;
    while (isDimensionScaleNameTaken(document, `Scale ${index}`)) index++;
    return `Scale ${index}`;
  }

  const addScaleAtom = atom(null, (get, set) => {
    const document = get(documentAtom);
    const scale: DimensionScale = {
      ...structuredClone(defaults.scales[0]),
      id: `${customIdPrefix}-${crypto.randomUUID()}`,
      name: nextScaleName(document),
    };
    set(documentAtom, { ...document, scales: [scale, ...document.scales] });
    return scale.id;
  });

  const updateScaleAtom = atom(
    null,
    (get, set, { id, patch }: { id: string; patch: DimensionScalePatch }) => {
      const document = get(documentAtom);
      if (
        patch.name !== undefined &&
        (!patch.name.trim() ||
          isDimensionScaleNameTaken(document, patch.name, id))
      )
        return false;
      const current = document.scales.find((scale) => scale.id === id);
      if (!current) return false;
      const clean: DimensionScalePatch = { ...patch };
      if (clean.name !== undefined) clean.name = clean.name.trim();
      if (clean.below !== undefined || clean.above !== undefined) {
        const range = clampScaleRange(
          clean.below ?? current.below,
          clean.above ?? current.above,
        );
        if (clean.below !== undefined) clean.below = range.below;
        if (clean.above !== undefined) clean.above = range.above;
      }
      // Parameters, bindings and the base override belong to one formula, so a new formula starts from its own values.
      const changesType =
        clean.scaleTypeId !== undefined &&
        clean.scaleTypeId !== current.scaleTypeId;
      set(documentAtom, {
        ...document,
        scales: document.scales.map((scale) => {
          if (scale.id !== id) return scale;
          const next = { ...scale, ...clean };
          if (clean.bindings && Object.keys(clean.bindings).length === 0)
            delete next.bindings;
          if (!changesType) return next;
          const { bindings, base, ...rest } = next;
          void bindings;
          void base;
          return {
            ...rest,
            ...(clean.base !== undefined && { base: clean.base }),
            parameters: clean.parameters ?? {},
          };
        }),
      });
      return true;
    },
  );

  const removeScaleAtom = atom(null, (get, set, id: string) => {
    const document = get(documentAtom);
    if (document.scales.length <= 1) return;
    set(documentAtom, {
      ...document,
      scales: document.scales.filter((scale) => scale.id !== id),
    });
  });

  const restoreScaleAtom = atom(
    null,
    (get, set, { scale, index }: { scale: DimensionScale; index: number }) => {
      const document = get(documentAtom);
      if (document.scales.some((candidate) => candidate.id === scale.id))
        return;
      const scales = [...document.scales];
      scales.splice(Math.min(index, scales.length), 0, scale);
      set(documentAtom, { ...document, scales });
    },
  );

  return {
    documentAtom,
    generatedAtom,
    addScaleAtom,
    updateScaleAtom,
    removeScaleAtom,
    restoreScaleAtom,
  };
}

export type DimensionFoundationState = ReturnType<
  typeof createDimensionFoundationState
>;
