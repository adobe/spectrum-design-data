// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
} from "../state";
import { resolveColorDocument } from "../resolution";
import { colorTokenSetAtom } from "../../tokens/state";
import { taxonomyDocumentAtom } from "../../taxonomy/state";
import { browserTokenEditsAtom } from "../../tokens/browserEdits";
import {
  canonicalTokenModeKey,
  projectBrowserTokens,
  resolveBrowserTokens,
} from "../../tokens/browserModel";
import { browserSourcesFromOutputs } from "../../tokens/browserSources";
import { rulesAtom } from "../../logic/library";
import { publishedPrimitiveColors } from "./primitiveColors";
import {
  activeModesAtom,
  modeSelectionAtom,
  resolveActiveMode,
} from "../../modes/selection";
import { modeSetsAtom } from "../../modes/state";
import { capabilityOwners } from "../../modes/ownership";
import { previewOverridesAtom } from "../../modes/previewState";
import { editModeAtom } from "../../../state/view/editMode";
import { selectedDataVisScaleIdAtom } from "../../../state/view/dataVisView";
import { structuresDocumentAtom } from "../../structures/documentState";
import {
  removeColorTokenRecords,
  restoreColorTokenRecords,
  type RemovedColorTokenRecords,
} from "../colorTokenCleanup";
import {
  applyDataVisPointPatch,
  isDataVisScale,
  type CategoricalDataVisScale,
  type ContinuousDataVisScale,
  type DataVisPoint,
  type DataVisScale,
  type DataVisSourcePatch,
  type PointContrast,
} from "./model";
import {
  finalUiSwatches,
  dataVisBackground,
  resolveDataVisPoints,
} from "./resolution";
import { compileContinuousScale, type ContinuousScale } from "./continuous";
import { categoricalBrowserSources } from "./output";
import { inspectPalette, type PaletteReport } from "./categorical";
import { inspectInWorker } from "./inspectInWorker";
import { categoricalSelection } from "./selection";
import { dataVisMemberId } from "./identity";
import { dataVisConsumers, dataVisSourceIssues } from "./references";
import type { AuthoringCapability, ModeSet } from "../../modes/model";
import {
  createMode,
  ensureModeSetKeys,
  isModeSetList,
} from "../../modes/model";
import { CUSTOM_MODE_KEY, displayedModeIdsAtom } from "../../modes/preview";
import { parameterOwners, setParameterValue } from "../../modes/parameters";
import { clearPreviewParametersAtom } from "../../modes/previewState";
import { aliasesAtom } from "../../tokens/aliasState";
import { pruneDataVisPatches, restoreDataVisPatches } from "./patches";
import { tokenStableKey, tokenUuid } from "../../tokens/model";

export const dataVisInputDocumentAtom = atom((get) =>
  resolveColorDocument(
    get(colorSystemDocumentAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
    {
      modeSets: get(modeSetsAtom),
      applyMultiplier: false,
      applyPolarity: false,
    },
  ),
);
export const dataVisUiSwatchesAtom = atom((get) =>
  finalUiSwatches(
    get(resolvedColorSystemDocumentAtom),
    get(colorTokenSetAtom).tokens,
  ),
);
export const generatedCategoricalSourcesAtom = atom((get) =>
  categoricalBrowserSources(
    get(dataVisInputDocumentAtom),
    get(dataVisUiSwatchesAtom),
    get(taxonomyDocumentAtom),
  ),
);
export const resolvedCategoricalTokensAtom = atom((get) =>
  resolveBrowserTokens(
    categoricalBrowserSources(
      get(dataVisInputDocumentAtom),
      get(dataVisUiSwatchesAtom),
      get(taxonomyDocumentAtom),
      { includeUnpublished: true },
    ),
    get(browserTokenEditsAtom),
    dataVisModeKey(get),
  ),
);
export const dataVisPrimitiveColorsAtom = atom((get) => {
  const document = get(colorSystemDocumentAtom),
    taxonomy = get(taxonomyDocumentAtom),
    colors = get(colorTokenSetAtom).tokens;
  const sources = browserSourcesFromOutputs(colors, [], [], [], undefined, {
    document,
    registry: taxonomy,
    rules: get(rulesAtom),
  });
  const rows = projectBrowserTokens(
    resolveBrowserTokens(
      sources,
      get(browserTokenEditsAtom),
      dataVisModeKey(get),
    ),
    taxonomy,
  );
  const names = new Map(rows.map((row) => [row.id, row.name]));
  return publishedPrimitiveColors(
    document,
    colors,
    get(resolvedCategoricalTokensAtom),
    names,
  );
});
export const dataVisContextFingerprintAtom = atom((get) =>
  JSON.stringify([
    dataVisModeKey(get),
    dataVisBackground(get(dataVisInputDocumentAtom)),
    get(dataVisInputDocumentAtom).settings.colorOutput,
    get(dataVisUiSwatchesAtom).map((swatch) => [swatch.id, swatch.value]),
    get(dataVisPrimitiveColorsAtom).map((color) => [
      color.id,
      color.value,
      color.error,
    ]),
    get(dataVisInputDocumentAtom).dataVisScales,
    get(resolvedCategoricalTokensAtom).map((token) => [
      token.id,
      token.value,
      token.validationError,
    ]),
  ]),
);
export const dataVisInspectorAtom = atom({ inspect: inspectInWorker });

function dataVisModeKey(get: Getter) {
  const modes = get(activeModesAtom);
  return canonicalTokenModeKey(
    Object.fromEntries(
      get(modeSetsAtom).flatMap((axis) => {
        const mode = modes.find((mode) =>
          axis.modes.some((candidate) => candidate.id === mode.id),
        );
        return mode ? [[axis.id, mode.id]] : [];
      }),
    ),
  );
}

export type ContinuousOutput =
  | { status: "ready"; scale: ContinuousScale }
  | { status: "error"; id: string; error: string };
export const dataVisContinuousOutputsAtom = atom((get): ContinuousOutput[] => {
  const document = get(dataVisInputDocumentAtom),
    swatches = get(dataVisUiSwatchesAtom),
    primitives = get(dataVisPrimitiveColorsAtom);
  return document.dataVisScales.flatMap((scale): ContinuousOutput[] => {
    if (scale.kind === "categorical") return [];
    try {
      return [
        {
          status: "ready",
          scale: compileContinuousScale(
            scale,
            resolveDataVisPoints(document, scale, swatches, primitives),
            document.settings.colorOutput,
          ),
        },
      ];
    } catch (error) {
      return [
        {
          status: "error",
          id: scale.id,
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  });
});

function assertEdit(get: Getter, allowPreview = false) {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to change data vis scales.");
  if (
    !allowPreview &&
    Object.keys(get(previewOverridesAtom)).some((key) =>
      key.startsWith("color."),
    )
  )
    throw new Error(
      "Select a saved mode before changing the shared recipe. Adaptive previews are temporary.",
    );
}

export function dataVisEditTarget(
  get: Getter,
  capability: AuthoringCapability,
) {
  const sets = get(modeSetsAtom),
    owner = sets.find((axis) => axis.id === capabilityOwners(sets)[capability]);
  const mode = owner && resolveActiveMode(owner, get(modeSelectionAtom));
  return owner && mode && mode.id !== owner.defaultModeId
    ? { owner, mode }
    : undefined;
}

function assertReferences(
  get: Getter,
  scale: DataVisScale,
  sets = get(modeSetsAtom),
) {
  if (!isDataVisScale(scale))
    throw new Error(
      "The data vis recipe has invalid sources, targets or ordered positions.",
    );
  if (!isModeSetList(sets))
    throw new Error(
      "The data vis mode overrides have invalid sources or contrast targets.",
    );
  const document = get(colorSystemDocumentAtom);
  const next = {
    ...document,
    dataVisScales: [
      ...document.dataVisScales.filter((item) => item.id !== scale.id),
      scale,
    ],
  };
  const issues = dataVisSourceIssues(next, sets);
  if (issues.length) throw new Error(issues.join(" "));
}

function ensureRemovedMembersUnused(
  get: Getter,
  before: DataVisScale | undefined,
  after?: DataVisScale,
) {
  if (before?.kind !== "categorical") return;
  const retained = new Set(
    after?.kind === "categorical"
      ? after.members.map((member) => member.id)
      : [],
  );
  const removed = new Set(
    before.members
      .filter((member) => !retained.has(member.id))
      .map((member) => dataVisMemberId(before.id, member.id)),
  );
  const consumers = get(structuresDocumentAtom).structures.filter((structure) =>
    structure.properties.some(
      (property) => "$ref" in property && removed.has(property.$ref),
    ),
  );
  if (consumers.length)
    throw new Error(
      "Choose replacement Structure references before removing these categorical colors.",
    );
  if (get(aliasesAtom).tokens.some((alias) => removed.has(alias.$ref)))
    throw new Error(
      "Choose replacement alias targets before removing these categorical colors.",
    );
  if (
    dataVisConsumers(get(colorSystemDocumentAtom), get(modeSetsAtom)).some(
      (consumer) =>
        consumer.source.kind === "primitive-token" &&
        removed.has(consumer.source.tokenId) &&
        consumer.scaleId !== before.id,
    )
  ) {
    throw new Error(
      "Choose replacement data vis colors before removing these categorical colors.",
    );
  }
  return removed;
}

export const addContinuousDataVisAtom = atom(
  null,
  (get, set, kind: ContinuousDataVisScale["kind"]) => {
    assertEdit(get);
    const document = get(colorSystemDocumentAtom);
    const sources = document.scales.filter((scale) =>
      scale.stops.some((stop) => stop.chroma > 2),
    );
    const first = sources[0] ?? document.scales[0],
      last = sources.at(-1) ?? first;
    if (!first)
      throw new Error(
        "Add a UI color scale before creating a linked data vis scale.",
      );
    let number = 1;
    const names = new Set(
      get(taxonomyDocumentAtom).terms.map((term) => term.value),
    );
    while (names.has(`${kind} ${number}`)) number++;
    const createPoint = (
      position: number,
      scaleId: string,
      value: number,
    ): DataVisPoint => ({
      id: crypto.randomUUID(),
      position,
      source: { kind: "ui-scale", scaleId },
      contrast: { value },
    });
    const scale: ContinuousDataVisScale = {
      id: crypto.randomUUID(),
      name: `${kind} ${number}`,
      kind,
      points:
        kind === "sequential"
          ? [createPoint(0, first.id, 1.3), createPoint(1, first.id, 8)]
          : [
              createPoint(0, first.id, 8),
              createPoint(0.5, first.id, 1.3),
              createPoint(1, last.id, 8),
            ],
    };
    assertReferences(get, scale);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: [scale, ...document.dataVisScales],
    });
    set(selectedDataVisScaleIdAtom, scale.id);
    return scale.id;
  },
);

export const applyCategoricalDataVisAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scale: CategoricalDataVisScale;
      fingerprint: string;
      acknowledgeFailures: boolean;
      signal?: AbortSignal;
    },
  ) => {
    assertEdit(get);
    if (input.fingerprint !== get(dataVisContextFingerprintAtom))
      throw new Error(
        "The source colors or modes changed. Refresh the selection before applying.",
      );
    const document = get(colorSystemDocumentAtom),
      swatches = get(dataVisUiSwatchesAtom);
    const scale = structuredClone(input.scale),
      previous = document.dataVisScales.find((item) => item.id === scale.id);
    if (previous?.staticColors)
      throw new Error(
        "Switch off Static before changing the adaptive categorical selection.",
      );
    assertReferences(get, scale);
    ensureRemovedMembersUnused(get, previous, scale);
    const members = categoricalSelection(
      scale,
      swatches,
      get(browserTokenEditsAtom),
      dataVisModeKey(get),
    );
    const finish = (report: PaletteReport) => {
      if (input.signal?.aborted)
        throw new Error("Applying the selection was cancelled.");
      assertEdit(get);
      if (input.fingerprint !== get(dataVisContextFingerprintAtom))
        throw new Error(
          "The source colors or modes changed while checking. Refresh the selection.",
        );
      const current = get(colorSystemDocumentAtom),
        before = current.dataVisScales.find((item) => item.id === scale.id);
      if (JSON.stringify(before) !== JSON.stringify(previous))
        throw new Error(
          "This scale changed while checking. Reopen the chooser before applying.",
        );
      if (report.failureCount && !input.acknowledgeFailures)
        throw new Error(
          "Acknowledge the unmet selection targets before applying this manual palette.",
        );
      const removed = ensureRemovedMembersUnused(get, before, scale);
      assertReferences(get, scale);
      set(colorSystemDocumentAtom, {
        ...current,
        dataVisScales: before
          ? current.dataVisScales.map((item) =>
              item.id === scale.id ? scale : item,
            )
          : [scale, ...current.dataVisScales],
      });
      if (removed?.size) removeColorTokenRecords(get, set, removed);
      set(selectedDataVisScaleIdAtom, scale.id);
    };
    const background = dataVisBackground(get(dataVisInputDocumentAtom)),
      gamut = renderGamutForOutput(document.settings.colorOutput);
    if (members.length <= 32)
      return finish(
        inspectPalette(members, scale.preferences, background, gamut),
      );
    return get(dataVisInspectorAtom)
      .inspect(
        {
          id: scale.id,
          members,
          preferences: scale.preferences,
          background,
          gamut,
        },
        input.signal,
      )
      .then(finish);
  },
);

export interface PointEdit {
  scaleId: string;
  pointId: string;
  scope?: "base" | "mode" | "all-modes";
  source?: DataVisPoint["source"];
  contrast?: PointContrast;
  position?: number;
  reset?: "source" | "contrast";
}
export const pendingDataVisPointEditAtom = atom<{
  edit: PointEdit;
  modeSetId: string;
} | null>(null);
function preparePointEdit(
  get: Getter,
  input: PointEdit,
  modeSets: ModeSet[],
  selection: Record<string, string>,
) {
  const document = get(colorSystemDocumentAtom),
    base = document.dataVisScales.find((scale) => scale.id === input.scaleId);
  if (!base || base.kind === "categorical")
    throw new Error("This continuous scale is unavailable.");
  if (base.staticColors)
    throw new Error(
      "Edit the captured Static colors or switch off Static to change adaptive settings.",
    );
  const point = base.points.find((point) => point.id === input.pointId);
  if (!point) throw new Error("This control point is unavailable.");
  const capability =
    input.contrast || input.reset === "contrast"
      ? "color.contrastMultiplier"
      : "color.scales";
  const owner = modeSets.find(
    (axis) => axis.id === capabilityOwners(modeSets)[capability],
  );
  const mode = owner && resolveActiveMode(owner, selection);
  const target =
    input.scope === "base" ||
    input.scope === "all-modes" ||
    !owner ||
    !mode ||
    mode.id === owner.defaultModeId
      ? undefined
      : { owner, mode };
  if (target) {
    const bothExact =
      (point.source.kind === "ui-swatch" ||
        point.source.kind === "primitive-token") &&
      (input.source?.kind === "ui-swatch" ||
        input.source?.kind === "primitive-token");
    if (
      input.position !== undefined ||
      (input.source && input.source.kind !== point.source.kind && !bothExact)
    )
      throw new Error(
        "Change point positions or source types in the shared recipe.",
      );
    if (
      input.contrast?.oppositeValue !== undefined &&
      input.contrast.oppositeValue !== point.contrast?.oppositeValue
    )
      throw new Error("Opposite contrast values belong to the shared recipe.");
    const field =
      capability === "color.scales" ? "dataVisSources" : "dataVisContrasts";
    let patch: DataVisSourcePatch | number | undefined;
    if (!input.reset) {
      if (field === "dataVisSources" && input.source)
        patch =
          input.source.kind === "key-color"
            ? { color: input.source.color }
            : input.source.kind === "ui-scale"
              ? { scaleId: input.source.scaleId }
              : input.source.kind === "primitive-token"
                ? { tokenId: input.source.tokenId }
                : point.source.kind === "primitive-token"
                  ? {
                      tokenId: tokenUuid(
                        tokenStableKey(
                          input.source.scaleId,
                          input.source.contrastId,
                        ),
                      ),
                    }
                  : {
                      scaleId: input.source.scaleId,
                      contrastId: input.source.contrastId,
                    };
      else if (input.contrast) patch = input.contrast.value;
    }
    const sets = modeSets.map((axis) =>
      axis.id !== target.owner.id
        ? axis
        : {
            ...axis,
            modes: axis.modes.map((mode) => {
              if (mode.id !== target.mode.id) return mode;
              const color = { ...mode.foundations.color };
              const scales: Record<
                  string,
                  Record<string, DataVisSourcePatch | number>
                > = { ...color[field] },
                points = { ...scales[base.id] };
              if (input.reset) delete points[point.id];
              else Object.assign(points, { [point.id]: patch });
              if (Object.keys(points).length)
                Object.assign(scales, { [base.id]: points });
              else delete scales[base.id];
              if (Object.keys(scales).length)
                Object.assign(color, { [field]: scales });
              else delete color[field];
              return { ...mode, foundations: { ...mode.foundations, color } };
            }),
          },
    );
    assertReferences(get, base, sets);
    return { document, sets };
  }
  const source = input.source ?? point.source,
    contrast = input.contrast ?? point.contrast;
  const exact =
    source.kind === "ui-swatch" || source.kind === "primitive-token";
  const updated: DataVisPoint = exact
    ? { id: point.id, position: input.position ?? point.position, source }
    : {
        id: point.id,
        position: input.position ?? point.position,
        source,
        contrast: { ...(contrast ?? { value: 3 }) },
      };
  if (input.reset === "contrast" && updated.contrast)
    delete updated.contrast.oppositeValue;
  const next: ContinuousDataVisScale = {
    ...base,
    points: base.points.map((candidate) =>
      candidate.id === point.id ? updated : candidate,
    ),
  };
  let sets = modeSets;
  if (input.scope === "all-modes" || source.kind !== point.source.kind)
    sets = sets.map((axis) => ({
      ...axis,
      modes: axis.modes.map((mode) => {
        const color = { ...mode.foundations.color };
        if (
          input.scope !== "all-modes" &&
          exact &&
          (point.source.kind === "ui-swatch" ||
            point.source.kind === "primitive-token")
        ) {
          const previous = color.dataVisSources?.[base.id]?.[point.id];
          if (previous) {
            const effective = applyDataVisPointPatch(point, previous).source;
            if (
              effective.kind !== "ui-swatch" &&
              effective.kind !== "primitive-token"
            )
              throw new Error("This exact source override is incompatible.");
            const tokenId =
              effective.kind === "primitive-token"
                ? effective.tokenId
                : tokenUuid(
                    tokenStableKey(effective.scaleId, effective.contrastId),
                  );
            color.dataVisSources = {
              ...color.dataVisSources,
              [base.id]: {
                ...color.dataVisSources?.[base.id],
                [point.id]: { tokenId },
              },
            };
          }
          return { ...mode, foundations: { ...mode.foundations, color } };
        }
        for (const field of [
          "dataVisSources",
          ...(exact ? ["dataVisContrasts" as const] : []),
        ] as const) {
          if (!color[field]?.[base.id]?.[point.id]) continue;
          const scales = { ...color[field] },
            points = { ...scales[base.id] };
          delete points[point.id];
          if (Object.keys(points).length)
            Object.assign(scales, { [base.id]: points });
          else delete scales[base.id];
          if (Object.keys(scales).length)
            Object.assign(color, { [field]: scales });
          else delete color[field];
        }
        return { ...mode, foundations: { ...mode.foundations, color } };
      }),
    }));
  assertReferences(get, next, sets);
  return {
    document: {
      ...document,
      dataVisScales: document.dataVisScales.map((scale) =>
        scale.id === next.id ? next : scale,
      ),
    },
    sets,
  };
}
export const editDataVisPointAtom = atom(null, (get, set, input: PointEdit) => {
  assertEdit(get, true);
  const sets = get(modeSetsAtom),
    capability =
      input.contrast || input.reset === "contrast"
        ? "color.contrastMultiplier"
        : "color.scales";
  const owner = sets.find(
    (axis) => axis.id === capabilityOwners(sets)[capability],
  );
  if (
    input.scope !== "base" &&
    input.scope !== "all-modes" &&
    owner &&
    get(displayedModeIdsAtom)[owner.key] === CUSTOM_MODE_KEY
  ) {
    set(pendingDataVisPointEditAtom, { edit: input, modeSetId: owner.id });
    return "pending" as const;
  }
  const prepared = preparePointEdit(get, input, sets, get(modeSelectionAtom));
  if (prepared.document !== get(colorSystemDocumentAtom))
    set(colorSystemDocumentAtom, prepared.document);
  if (prepared.sets !== sets) set(modeSetsAtom, prepared.sets);
});

export const applyPendingDataVisPointEditAtom = atom(
  null,
  (get, set, input: { modeId?: string; name?: string }) => {
    assertEdit(get, true);
    const pending = get(pendingDataVisPointEditAtom);
    if (!pending) throw new Error("This pending edit is no longer available.");
    const sets = get(modeSetsAtom),
      owner = sets.find((axis) => axis.id === pending.modeSetId);
    const capability =
      pending.edit.contrast || pending.edit.reset === "contrast"
        ? "color.contrastMultiplier"
        : "color.scales";
    if (!owner || capabilityOwners(sets)[capability] !== owner.id)
      throw new Error("Mode ownership changed. Reopen the edit.");
    const preview = get(previewOverridesAtom),
      owners = parameterOwners(sets);
    const captured = Object.keys(preview).filter(
      (parameter) => owners[parameter] === owner.id,
    );
    let targetId = input.modeId,
      next = sets;
    if (!targetId) {
      const name = input.name?.trim();
      if (!name) throw new Error("Name the new mode.");
      let mode = { ...createMode(), name };
      for (const parameter of captured)
        mode = setParameterValue(mode, parameter, preview[parameter]);
      targetId = mode.id;
      next = sets.map((axis) =>
        axis.id === owner.id
          ? ensureModeSetKeys({ ...axis, modes: [...axis.modes, mode] })
          : axis,
      );
    } else if (
      !owner.modes.some(
        (mode) => mode.id === targetId && mode.id !== owner.defaultModeId,
      )
    ) {
      throw new Error("Choose an existing non-default mode or create one.");
    }
    const selection = { ...get(modeSelectionAtom), [owner.key]: targetId };
    const prepared = preparePointEdit(
      get,
      { ...pending.edit, scope: "mode" },
      next,
      selection,
    );
    set(modeSetsAtom, prepared.sets);
    set(clearPreviewParametersAtom, captured);
    set(modeSelectionAtom, selection);
    set(pendingDataVisPointEditAtom, null);
  },
);

export interface DataVisPointUndo {
  scaleId: string;
  point: DataVisPoint;
  modes: ModeSet[];
}
export const editDataVisStructureAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scaleId: string;
      kind: "add-point" | "remove-point" | "publishing";
      pointId?: string;
      hideFromPublishing?: boolean;
      scope?: "base";
      position?: number;
    },
  ) => {
    assertEdit(get);
    const document = get(colorSystemDocumentAtom),
      scale = document.dataVisScales.find(
        (scale) => scale.id === input.scaleId,
      );
    if (!scale) throw new Error("This data vis scale is unavailable.");
    if (scale.staticColors && input.kind !== "publishing")
      throw new Error(
        "Use the Static stop controls to change captured colors.",
      );
    let next = scale,
      undo: DataVisPointUndo | undefined;
    if (input.kind === "publishing") {
      if (input.hideFromPublishing && scale.kind === "categorical")
        ensureRemovedMembersUnused(get, scale);
      next = { ...scale, hideFromPublishing: input.hideFromPublishing };
    } else {
      if (input.scope !== "base" && dataVisEditTarget(get, "color.scales"))
        throw new Error(
          "Select the source owner's default mode to change control points.",
        );
      if (scale.kind === "categorical")
        throw new Error("Use the categorical chooser to edit members.");
      if (input.kind === "remove-point") {
        const point = scale.points.find((point) => point.id === input.pointId);
        if (
          !point ||
          point.position === 0 ||
          point.position === 1 ||
          (scale.kind === "diverging" && point.position === 0.5)
        ) {
          throw new Error("Keep the endpoints and the diverging center.");
        }
        undo = { scaleId: scale.id, point, modes: get(modeSetsAtom) };
        next = {
          ...scale,
          points: scale.points.filter((point) => point.id !== input.pointId),
        };
      } else {
        const gaps = scale.points
          .slice(1)
          .map((point, index) => ({ a: scale.points[index], b: point }))
          .sort(
            (a, b) =>
              b.b.position - b.a.position - (a.b.position - a.a.position),
          );
        const gap =
          input.position === undefined
            ? gaps[0]
            : gaps.find(
                (gap) =>
                  input.position! > gap.a.position &&
                  input.position! < gap.b.position,
              );
        if (!gap) throw new Error("Add a stop between the existing stops.");
        next = {
          ...scale,
          points: [
            ...scale.points,
            {
              ...structuredClone(gap.a),
              id: crypto.randomUUID(),
              position: input.position ?? (gap.a.position + gap.b.position) / 2,
            },
          ].sort((a, b) => a.position - b.position),
        };
      }
    }
    assertReferences(
      get,
      next,
      pruneDataVisPatches(
        get(modeSetsAtom),
        document.dataVisScales.map((scale) =>
          scale.id === next.id ? next : scale,
        ),
      ),
    );
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((scale) =>
        scale.id === next.id ? next : scale,
      ),
    });
    return undo;
  },
);

export const restoreDataVisPointAtom = atom(
  null,
  (get, set, undo: DataVisPointUndo) => {
    assertEdit(get);
    const document = get(colorSystemDocumentAtom),
      scale = document.dataVisScales.find((scale) => scale.id === undo.scaleId);
    if (!scale || scale.kind === "categorical")
      throw new Error(
        "Restore the continuous scale before restoring this point.",
      );
    if (
      scale.points.some(
        (point) =>
          point.id === undo.point.id || point.position === undo.point.position,
      )
    ) {
      throw new Error(
        "This point's identity or position is already in use. Undo cannot replace a later edit.",
      );
    }
    const index = scale.points.findIndex(
      (point) => point.position > undo.point.position,
    );
    const next = {
      ...scale,
      points: [
        ...scale.points.slice(0, index),
        undo.point,
        ...scale.points.slice(index),
      ],
    };
    const sets = restoreDataVisPatches(
      get(modeSetsAtom),
      undo.modes,
      scale.id,
      undo.point.id,
    );
    assertReferences(get, next, sets);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.map((scale) =>
        scale.id === next.id ? next : scale,
      ),
    });
    set(modeSetsAtom, sets);
  },
);

export interface DataVisUndo {
  scale: DataVisScale;
  index: number;
  modes: ModeSet[];
  tokenRecords: RemovedColorTokenRecords;
}
export const removeDataVisScaleAtom = atom(
  null,
  (get, set, id: string): DataVisUndo => {
    assertEdit(get);
    const document = get(colorSystemDocumentAtom),
      scale = document.dataVisScales.find((scale) => scale.id === id);
    if (!scale) throw new Error("This data vis scale is unavailable.");
    ensureRemovedMembersUnused(get, scale);
    const modes = get(modeSetsAtom);
    const tokenRecords = removeColorTokenRecords(
      get,
      set,
      new Set(
        scale.kind === "categorical"
          ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
          : [],
      ),
    );
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: document.dataVisScales.filter((scale) => scale.id !== id),
    });
    return {
      scale,
      index: document.dataVisScales.findIndex((scale) => scale.id === id),
      modes,
      tokenRecords,
    };
  },
);
export const restoreDataVisScaleAtom = atom(
  null,
  (get, set, undo: DataVisUndo) => {
    assertEdit(get);
    const document = get(colorSystemDocumentAtom);
    if (document.dataVisScales.some((scale) => scale.id === undo.scale.id))
      throw new Error("This scale identity is already in use.");
    const sets = restoreDataVisPatches(
      get(modeSetsAtom),
      undo.modes,
      undo.scale.id,
    );
    assertReferences(get, undo.scale, sets);
    const index = Math.min(undo.index, document.dataVisScales.length);
    set(colorSystemDocumentAtom, {
      ...document,
      dataVisScales: [
        ...document.dataVisScales.slice(0, index),
        undo.scale,
        ...document.dataVisScales.slice(index),
      ],
    });
    set(modeSetsAtom, sets);
    restoreColorTokenRecords(get, set, undo.tokenRecords);
  },
);
import { renderGamutForOutput } from "../colorMath";
