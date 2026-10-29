// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { TYPOGRAPHY_DEFAULTS } from "./defaults";
import {
  generateTypography,
  validateTypographyGeneration,
} from "./typographyGeneration";
import {
  clampTextZoom,
  isTypographyDocument,
  TYPOGRAPHY_SCHEMA_VERSION,
  type TypographyDocument,
  type TypographyLineHeight,
} from "./model";
import {
  activeModesAtom,
  setActiveModeParameterAtom,
} from "../modes/selection";
import {
  clearPreviewParametersAtom,
  previewOverridesAtom,
  setPreviewParameterAtom,
} from "../modes/previewState";
import { modeSetsAtom } from "../modes/state";
import { editModeAtom } from "../../state/view/editMode";
import { rulesAtom } from "../logic/library";
import { interpolationsAtom, scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { resolveTypographyDocument } from "./resolution";
import { withTaxonomyContributions } from "../taxonomy/contributions";
import { TYPE_SCALE_MAX_POSITION } from "./typographyGeneration";
import { scaleStepName } from "../scales/generate";
import {
  assertTypographyNames,
  lineHeightName,
  withLineHeightName,
} from "./lineHeightNames";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { designSystemDefaults } from "../../data/defaults";
import { assertTaxonomy } from "../taxonomy/model";
import { typographyTokenValues } from "./typographyTokens";
import { structuresDocumentAtom } from "../structures/documentState";
import { assertStructureReferences } from "../structures/model";
import { typographyReferenceCoordinates } from "../tokens/primitiveIdentity";
export { resolveTypographyDocument } from "./resolution";

const storedTypographyDocumentAtom = persistedAtom<TypographyDocument>({
  key: "foundations/typography",
  schemaVersion: TYPOGRAPHY_SCHEMA_VERSION,
  initialize: () => TYPOGRAPHY_DEFAULTS,
  validate: isTypographyDocument,
});
export const typographyDocumentAtom = withTaxonomyContributions(
  storedTypographyDocumentAtom,
  (document) => {
    const below = Math.abs(Math.round(document.smallSizes));
    const above = Math.min(
      TYPE_SCALE_MAX_POSITION,
      Math.max(0, Math.round(document.largeSizes)),
    );
    return [
      ...Array.from({ length: below + above + 1 }, (_, index) => ({
        field: "scaleIndex",
        value: scaleStepName(index - below, below),
      })),
    ];
  },
  isTypographyDocument,
  "foundations/typography",
);

export const updateTypographyAtom = atom(
  null,
  (get, set, patch: Partial<TypographyDocument>) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change Typography.");
    const document = get(typographyDocumentAtom);
    const next = {
      ...document,
      ...patch,
      lineHeights: (patch.lineHeights ?? document.lineHeights).map((card) =>
        card.isAdaptive && !card.hasAdaptiveSettings
          ? {
              ...card,
              hasAdaptiveSettings: true,
              adaptive: {
                ...card.adaptive,
                outputAtFrom: card.defaultValue,
                outputAtTo: card.defaultValue,
              },
            }
          : card,
      ),
    };
    if (!isTypographyDocument(next))
      throw new Error(
        "Enter valid Typography settings, ranges, and references.",
      );
    if (
      ![next.textRoundingRuleId, next.lineHeightRoundingRuleId].every((id) =>
        get(rulesAtom).some(
          (rule) => rule.id === id && rule.type === "rounding",
        ),
      ) ||
      next.lineHeights.some(
        (card) =>
          !get(interpolationsAtom).some(
            (shape) => shape.id === card.adaptive.interpolationId,
          ),
      )
    )
      throw new Error("Choose available rounding rules and interpolations.");
    assertTypographyNames(next, get(taxonomyDocumentAtom));
    validateTypographyGeneration(
      next,
      get(rulesAtom),
      get(scaleTypesAtom),
      get(interpolationsAtom),
    );
    assertStructureReferences(
      get(structuresDocumentAtom),
      new Map(
        [...typographyReferenceCoordinates(next).keys()].map((id) => [
          id,
          "typography" as const,
        ]),
      ),
      "typography",
      next,
    );
    set(typographyDocumentAtom, next);
  },
);

export function lineHeightConsumers(
  document: TypographyDocument,
  id: string,
): string[] {
  return [
    ...(document.previewLineHeightId === id ? ["Elements text sample"] : []),
    ...(document.iconography.alignment === "line-height" &&
    document.iconography.lineHeightId === id
      ? ["Iconography"]
      : []),
  ];
}

export const addLineHeightAtom = atom(null, (get, set) => {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to add a line height.");
  const document = get(typographyDocumentAtom);
  const registry = get(taxonomyDocumentAtom);
  const names = new Set(
    document.lineHeights.map((card) =>
      lineHeightName(document, registry, card.id).toLowerCase(),
    ),
  );
  let name = "New line height",
    suffix = 2;
  while (names.has(name.toLowerCase())) name = `New line height ${suffix++}`;
  const card: TypographyLineHeight = {
    id: crypto.randomUUID(),
    defaultValue: 1.5,
    isAdaptive: false,
    hasAdaptiveSettings: false,
    adaptive: {
      interpolationId: "interpolation-linear",
      from: 10,
      to: 32,
      outputAtFrom: 1.5,
      outputAtTo: 1.5,
    },
  };
  if (
    !get(interpolationsAtom).some(
      (item) => item.id === card.adaptive.interpolationId,
    )
  )
    throw new Error(
      "Add the Linear interpolation in Logic before adding a line height.",
    );
  const next = withLineHeightName(
    { ...document, lineHeights: [card, ...document.lineHeights] },
    registry,
    card.id,
    name,
  );
  validateTypographyGeneration(
    next.document,
    get(rulesAtom),
    get(scaleTypesAtom),
    get(interpolationsAtom),
  );
  set(taxonomyDocumentAtom, next.taxonomy);
  set(typographyDocumentAtom, next.document);
  return card.id;
});

export const renameLineHeightAtom = atom(
  null,
  (get, set, input: { id: string; name: string }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to rename a line height.");
    const document = get(typographyDocumentAtom);
    if (!document.lineHeights.some((card) => card.id === input.id))
      throw new Error("This line height is no longer available.");
    const next = withLineHeightName(
      document,
      get(taxonomyDocumentAtom),
      input.id,
      input.name,
    );
    set(taxonomyDocumentAtom, next.taxonomy);
    set(typographyDocumentAtom, next.document);
  },
);

export interface RemovedLineHeight {
  card: TypographyLineHeight;
  index: number;
  names: TypographyDocument["metricNames"];
  previewLineHeightId: string;
  iconography: TypographyDocument["iconography"];
  replacementId?: string;
  edits: BrowserTokenEdits;
}

export const removeLineHeightAtom = atom(
  null,
  (
    get,
    set,
    input: { id: string; replacementId?: string },
  ): RemovedLineHeight => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to remove a line height.");
    const document = get(typographyDocumentAtom);
    const index = document.lineHeights.findIndex(
      (card) => card.id === input.id,
    );
    if (index < 0) throw new Error("This line height is no longer available.");
    const consumers = lineHeightConsumers(document, input.id);
    if (
      consumers.length &&
      (!input.replacementId ||
        input.replacementId === input.id ||
        !document.lineHeights.some((card) => card.id === input.replacementId))
    )
      throw new Error("Choose a replacement for this line height's uses.");
    const names = { ...document.metricNames };
    delete names[`${input.id}-lineHeight`];
    delete names[`${input.id}-unitlessLineHeight`];
    const next: TypographyDocument = {
      ...document,
      metricNames: names,
      lineHeights: document.lineHeights.filter((card) => card.id !== input.id),
      previewLineHeightId:
        document.previewLineHeightId === input.id
          ? input.replacementId!
          : document.previewLineHeightId,
      iconography:
        document.iconography.alignment === "line-height" &&
        document.iconography.lineHeightId === input.id
          ? { ...document.iconography, lineHeightId: input.replacementId! }
          : document.iconography,
    };
    if (!isTypographyDocument(next))
      throw new Error(
        "Keep an available line height for the text sample and Iconography.",
      );
    assertStructureReferences(
      get(structuresDocumentAtom),
      new Map(
        [...typographyReferenceCoordinates(next).keys()].map((id) => [
          id,
          "typography" as const,
        ]),
      ),
      "typography",
      next,
    );
    const edits = { ...get(browserTokenEditsAtom) },
      removedEdits: BrowserTokenEdits = {};
    for (const id of Object.keys(edits))
      if (
        id.startsWith(`typography-${input.id}-lineHeight-`) ||
        id.startsWith(`typography-${input.id}-unitlessLineHeight-`)
      ) {
        removedEdits[id] = edits[id];
        delete edits[id];
      }
    set(typographyDocumentAtom, next);
    set(browserTokenEditsAtom, edits);
    return {
      card: document.lineHeights[index],
      index,
      names: document.metricNames,
      previewLineHeightId: document.previewLineHeightId,
      iconography: document.iconography,
      replacementId: input.replacementId,
      edits: removedEdits,
    };
  },
);

export const restoreLineHeightAtom = atom(
  null,
  (get, set, removed: RemovedLineHeight) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to restore a line height.");
    const document = get(typographyDocumentAtom);
    if (document.lineHeights.some((card) => card.id === removed.card.id))
      throw new Error("This line height is already present.");
    const lineHeights = [...document.lineHeights];
    lineHeights.splice(
      Math.min(removed.index, lineHeights.length),
      0,
      removed.card,
    );
    const metricNames = { ...document.metricNames };
    for (const key of [
      `${removed.card.id}-lineHeight`,
      `${removed.card.id}-unitlessLineHeight`,
    ] as const)
      metricNames[key] = removed.names[key];
    const next = {
      ...document,
      lineHeights,
      metricNames,
      previewLineHeightId:
        removed.previewLineHeightId === removed.card.id &&
        document.previewLineHeightId === removed.replacementId
          ? removed.card.id
          : document.previewLineHeightId,
      iconography:
        removed.iconography.alignment === "line-height" &&
        removed.iconography.lineHeightId === removed.card.id &&
        document.iconography.alignment === "line-height" &&
        document.iconography.lineHeightId === removed.replacementId
          ? { ...document.iconography, lineHeightId: removed.card.id }
          : document.iconography,
    };
    assertTypographyNames(next, get(taxonomyDocumentAtom));
    if (!isTypographyDocument(next))
      throw new Error(
        "This line height cannot be restored with the current settings.",
      );
    validateTypographyGeneration(
      next,
      get(rulesAtom),
      get(scaleTypesAtom),
      get(interpolationsAtom),
    );
    set(typographyDocumentAtom, next);
    set(browserTokenEditsAtom, {
      ...removed.edits,
      ...get(browserTokenEditsAtom),
    });
  },
);

export const restoreTypographyDefaultsAtom = atom(null, (get, set) => {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to restore Typography.");
  const document = structuredClone(TYPOGRAPHY_DEFAULTS);
  const registry = get(taxonomyDocumentAtom);
  const restoredTerms = new Map(
    Object.values(document.metricNames).map((reference) => {
      const term = designSystemDefaults.system.taxonomy.terms.find(
        (item) => item.id === reference.termId,
      )!;
      return [reference.termId, term];
    }),
  );
  const knownTerms = new Set(registry.terms.map((term) => term.id));
  const nextRegistry = {
    ...registry,
    terms: [
      ...registry.terms.map((term) => restoredTerms.get(term.id) ?? term),
      ...[...restoredTerms.values()].filter((term) => !knownTerms.has(term.id)),
    ],
  };
  assertTaxonomy(nextRegistry);
  assertTypographyNames(document, nextRegistry);
  validateTypographyGeneration(
    document,
    get(rulesAtom),
    get(scaleTypesAtom),
    get(interpolationsAtom),
  );
  assertStructureReferences(
    get(structuresDocumentAtom),
    new Map(
      [...typographyReferenceCoordinates(document).keys()].map((id) => [
        id,
        "typography" as const,
      ]),
    ),
    "typography",
    document,
  );
  const valid = new Set(
    typographyTokenValues(
      generateTypography(
        document,
        undefined,
        get(rulesAtom),
        get(scaleTypesAtom),
        get(interpolationsAtom),
      ),
    ).map((token) => token.id),
  );
  const edits = Object.fromEntries(
    Object.entries(get(browserTokenEditsAtom)).filter(
      ([id]) => !id.startsWith("typography-") || valid.has(id),
    ),
  );
  set(taxonomyDocumentAtom, nextRegistry);
  set(typographyDocumentAtom, document);
  set(browserTokenEditsAtom, edits);
});

export const resolvedTypographyDocumentAtom = atom((get) =>
  resolveTypographyDocument(
    get(typographyDocumentAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
    { modeSets: get(modeSetsAtom) },
  ),
);

export const generatedTypographyAtom = atom((get) =>
  generateTypography(
    get(resolvedTypographyDocumentAtom),
    undefined,
    get(rulesAtom),
    get(scaleTypesAtom),
    get(interpolationsAtom),
  ),
);

/** Same routing as color parameters: preview outside edit mode, else the owning mode or the base. */
export const updateTextZoomAtom = atom(null, (get, set, value: number) => {
  if (!Number.isFinite(value))
    throw new Error("Enter a finite Text size setting.");
  const textZoom = clampTextZoom(value);
  if (!get(editModeAtom)) {
    set(setPreviewParameterAtom, {
      parameterId: "typography.textZoom",
      value: textZoom,
    });
    return;
  }
  const target = set(setActiveModeParameterAtom, {
    parameterId: "typography.textZoom",
    value: textZoom,
  });
  if (target === "pending") return;
  set(clearPreviewParametersAtom, ["typography.textZoom"]);
  if (target) return;
  set(typographyDocumentAtom, { ...get(typographyDocumentAtom), textZoom });
});
