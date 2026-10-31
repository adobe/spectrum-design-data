// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { modeSelectionAtom, resolveActiveMode } from "../modes/selection";
import { modeSetsAtom } from "../modes/state";
import { previewOverridesAtom } from "../modes/previewState";
import { generatedSpacingAtom } from "../spacing/state";
import { generatedSizeAtom } from "../size/state";
import { generatedRadiusAtom } from "../radius/state";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
} from "../typography/state";
import {
  colorTokenSetAtom,
  generatedColorTokensAtom,
  outputGamutAtom,
  resetTokenAtom,
  resolveToken,
} from "./state";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  updatePaletteColorAtom,
} from "../color-system/state";
import { paletteChannelsFromCss } from "../color-system/palette";
import { tokenOverridesAtom } from "./overrides";
import { browserTokenEditsAtom } from "./browserEdits";
import {
  applyBrowserTokenEdits,
  canonicalTokenModeKey,
  parseBrowserTokenValue,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserTokenPatch,
  type BrowserTokenSource,
} from "./browserModel";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { browserSourcesFromOutputs } from "./browserSources";
import {
  elevationDocumentAtom,
  generatedElevationAtom,
} from "../elevation/state";
import { browserElevationSources } from "../elevation/output";
import { semanticBrowserStateAtom } from "./semanticBrowserState";
import { aliasesAtom } from "./aliasState";
import { aliasBrowserTokens } from "./aliasBrowser";
import { canonicalAliasRows, completeAliasSource } from "./aliasTargets";
import { authoringSnapshotAtom } from "../edit-session/state";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import { rulesAtom } from "../logic/library";
import { generatedCategoricalSourcesAtom } from "../color-system/data-vis/state";
import { editStaticMemberOverrides } from "../color-system/data-vis/frozenColors";
import { normalizeBrowserColorOutputs } from "./colorOutput";
import { opacityDocumentAtom, opacitySourceAtom } from "../opacity/state";
import { browserOpacitySources } from "../opacity/output";
import { synchronizeOpacityRows } from "../opacity/generation";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import {
  commitDialogDraft,
  createDialogDraft,
  dialogRowsForMode,
} from "./dialogModel";
import { activeModesAtom } from "../modes/selection";
export { browserSourcesFromOutputs } from "./browserSources";

export const browserModeContextAtom = atom((get) => {
  const selection = get(modeSelectionAtom);
  const modes = get(modeSetsAtom).flatMap((modeSet) => {
    const mode = resolveActiveMode(modeSet, selection);
    return mode
      ? [
          {
            setId: modeSet.id,
            modeId: mode.id,
            label: `${modeSet.name}: ${mode.name}`,
          },
        ]
      : [];
  });
  return {
    key: canonicalTokenModeKey(
      Object.fromEntries(modes.map((mode) => [mode.setId, mode.modeId])),
    ),
    label: modes.map((mode) => mode.label).join(" / ") || "Default",
  };
});

export const browserTokenSourcesAtom = atom((get): BrowserTokenSource[] => {
  const legacyOverrides = get(tokenOverridesAtom);
  const colors = get(generatedColorTokensAtom).map((token) =>
    resolveToken(token, legacyOverrides[token.uuid]),
  );
  return [
    ...browserSourcesFromOutputs(
      colors,
      get(generatedTypographyAtom),
      get(generatedSpacingAtom),
      get(generatedSizeAtom),
      {
        names: get(typographyDocumentAtom).metricNames,
        outputUnit: get(typographyDocumentAtom).outputUnit,
        registry: get(taxonomyDocumentAtom),
      },
      {
        document: get(colorSystemDocumentAtom),
        registry: get(taxonomyDocumentAtom),
        rules: get(rulesAtom),
      },
      get(generatedRadiusAtom),
    ),
    ...browserElevationSources(
      get(elevationDocumentAtom),
      get(generatedElevationAtom),
      get(taxonomyDocumentAtom),
    ),
    ...get(generatedCategoricalSourcesAtom),
    ...browserOpacitySources(
      get(opacitySourceAtom),
      get(activeModesAtom),
      get(taxonomyDocumentAtom),
      get(previewOverridesAtom),
    ),
  ];
});

export const browserTokensAtom = atom((get) => {
  const colors = new Map(
    get(colorTokenSetAtom).tokens.map((token) => [token.uuid, token.value]),
  );
  const output = get(resolvedColorSystemDocumentAtom).settings.colorOutput;
  const tokens = [
    ...projectBrowserTokens(
      normalizeBrowserColorOutputs(
        resolveBrowserTokens(
          [
            ...get(browserTokenSourcesAtom),
            ...get(semanticBrowserStateAtom).tokens,
          ],
          get(browserTokenEditsAtom),
          get(browserModeContextAtom).key,
          { includeManual: true },
        ),
        output,
        colors,
      ),
      get(taxonomyDocumentAtom),
    ),
  ];
  const aliases = get(aliasesAtom);
  if (!aliases.tokens.length) return tokens;
  const generated = get(workingTshirtArtifactsAtom);
  if (generated.status === "error") throw new Error(generated.error);
  const selection = Object.fromEntries(
    JSON.parse(get(browserModeContextAtom).key) as [string, string][],
  );
  return [
    ...tokens,
    ...aliasBrowserTokens(
      aliases,
      canonicalAliasRows(
        completeAliasSource(get(authoringSnapshotAtom)),
        generated.bundle,
      ),
      selection,
      tokens,
    ),
  ];
});

export const editBrowserTokensAtom = atom(
  null,
  (
    get,
    set,
    input: { ids: string[]; modeKey: string; patch: BrowserTokenPatch },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change tokens.");
    if (input.modeKey !== get(browserModeContextAtom).key)
      throw new Error(
        "The active modes changed. Reopen the dialog before saving.",
      );
    if (Object.keys(get(previewOverridesAtom)).length)
      throw new Error("Select a saved mode before editing tokens.");
    if (get(aliasesAtom).tokens.some((alias) => input.ids.includes(alias.id)))
      throw new Error(
        "Aliases have no independent values or metadata to edit.",
      );
    if (
      input.patch.status !== undefined ||
      input.ids.some((id) => get(browserTokenEditsAtom)[id]?.authoring)
    ) {
      const generated = get(workingTshirtArtifactsAtom);
      if (generated.status !== "ready") throw new Error(generated.error);
      const snapshot = get(authoringSnapshotAtom);
      const rows = canonicalAliasRows(
        completeAliasSource(snapshot),
        generated.bundle,
        "preserve-for-review",
      );
      const available = dialogRowsForMode(rows, input.modeKey);
      let edits = get(browserTokenEditsAtom);
      for (const id of new Set(input.ids)) {
        const row = available.find((row) => row.token.id === id);
        if (!row) throw new Error("The selected token is no longer available.");
        const draft = createDialogDraft(row.token, input.modeKey);
        if (input.patch.status !== undefined)
          draft.deprecated = input.patch.status === "deprecated";
        if (input.patch.description !== undefined)
          draft.description = input.patch.description;
        if (input.patch.classification !== undefined)
          draft.classification = input.patch.classification;
        if (input.patch.value !== undefined)
          draft.assignments[row.context] = {
            kind: "literal",
            value: input.patch.value,
          };
        if (input.patch.name !== undefined)
          throw new Error(
            "Choose registered classification terms to change token names.",
          );
        edits = commitDialogDraft(draft, rows, edits, snapshot.taxonomy!);
      }
      withValidatedAuthoringUpdates(
        get,
        new Map([["tokens/browser/edits", edits]]),
        () => {
          set(browserTokenEditsAtom, edits);
        },
      );
      return;
    }
    if (
      get(semanticBrowserStateAtom).tokens.some((token) =>
        input.ids.includes(token.id),
      )
    )
      throw new Error(
        "Edit generated variants through their Structure, rule or foundation source.",
      );
    const sources = get(browserTokenSourcesAtom);
    let nextTaxonomy: TaxonomyDocument | undefined;
    if (input.patch.name !== undefined)
      throw new Error(
        "Use registered category and term selections to change token names.",
      );
    if (input.patch.classification !== undefined) {
      if (input.ids.length !== 1)
        throw new Error("Classify one token at a time.");
      const source = sources.find((token) => token.id === input.ids[0]);
      if (!source)
        throw new Error("The selected token is no longer available.");
      if (source.taxonomySource?.governed)
        throw new Error(
          "Token types, names and steps are governed by the foundation. Edit its name or shared scale controls instead.",
        );
      const taxonomy = get(taxonomyDocumentAtom);
      const projected = projectClassification(
        taxonomy,
        input.patch.classification,
        source.type as
          | "colors"
          | "typography"
          | "spacing"
          | "size"
          | "radius"
          | "opacity"
          | "elevation",
      );
      if (projected.issues.length) throw new Error(projected.issues.join("\n"));
      const next = {
        ...taxonomy,
        classifications: {
          ...taxonomy.classifications,
          [source.id]: input.patch.classification,
        },
      };
      const tokens = projectBrowserTokens(
        resolveBrowserTokens(
          sources,
          get(browserTokenEditsAtom),
          input.modeKey,
        ),
        next,
      );
      const issues =
        tokens.find((token) => token.id === source.id)?.projection?.issues ??
        [];
      if (issues.length) throw new Error(issues.join("\n"));
      // Validate the other changes before committing either domain.
      applyBrowserTokenEdits(
        sources,
        get(browserTokenEditsAtom),
        input.ids,
        input.modeKey,
        input.patch,
      );
      nextTaxonomy = next;
    }
    const palette = sources.filter(
      (source) => input.ids.includes(source.id) && source.paletteColorId,
    );
    if (
      palette.length &&
      input.patch.value !== undefined &&
      input.ids.length > 1
    ) {
      throw new Error(
        "Palette colors need distinct values, so edit their values one at a time.",
      );
    }
    const staticColors = sources.filter(
      (source) => input.ids.includes(source.id) && source.dataVis?.static,
    );
    if (staticColors.length && input.patch.value !== undefined) {
      applyBrowserTokenEdits(
        sources,
        get(browserTokenEditsAtom),
        input.ids,
        input.modeKey,
        input.patch,
      );
      const { value, ...metadata } = input.patch;
      const values = new Map(
        staticColors.map((source) => {
          const parsed = parseBrowserTokenValue(source, String(value));
          if (typeof parsed !== "string")
            throw new Error("A Static categorical token requires a color.");
          return [source.id, parsed] as const;
        }),
      );
      const document = editStaticMemberOverrides(
        get(colorSystemDocumentAtom),
        values,
      );
      let edits = applyBrowserTokenEdits(
        sources,
        get(browserTokenEditsAtom),
        input.ids,
        input.modeKey,
        metadata,
      );
      const adaptiveIds = input.ids.filter((id) => !values.has(id));
      if (adaptiveIds.length)
        edits = applyBrowserTokenEdits(
          sources,
          edits,
          adaptiveIds,
          input.modeKey,
          { value },
        );
      set(colorSystemDocumentAtom, document);
      if (nextTaxonomy) set(taxonomyDocumentAtom, nextTaxonomy);
      set(browserTokenEditsAtom, edits);
      return;
    }
    if (!palette.length) {
      const edits = applyBrowserTokenEdits(
        sources,
        get(browserTokenEditsAtom),
        input.ids,
        input.modeKey,
        input.patch,
      );
      const opacity = sources.some(
        (source) => source.type === "opacity" && input.ids.includes(source.id),
      )
        ? synchronizeOpacityRows({
            opacity: get(opacityDocumentAtom),
            colorSystem: get(colorSystemDocumentAtom),
            modeSets: get(modeSetsAtom),
            browserTokenEdits: edits,
          })
        : undefined;
      if (opacity && opacity !== get(opacityDocumentAtom)) {
        // Scoped opacity edits may add axes; persist their rows with the edit.
        const updates = new Map<string, unknown>([
          ["tokens/browser/edits", edits],
          ["foundations/opacity", opacity],
        ]);
        if (nextTaxonomy) updates.set("registry/taxonomy", nextTaxonomy);
        withValidatedAuthoringUpdates(get, updates, () => {
          if (nextTaxonomy) set(taxonomyDocumentAtom, nextTaxonomy);
          set(browserTokenEditsAtom, edits);
          set(opacityDocumentAtom, opacity);
        });
        return;
      }
      if (nextTaxonomy) set(taxonomyDocumentAtom, nextTaxonomy);
      set(browserTokenEditsAtom, edits);
      return;
    }
    const { value, ...metadata } = input.patch;
    const nextEdits = applyBrowserTokenEdits(
      sources,
      get(browserTokenEditsAtom),
      input.ids,
      input.modeKey,
      metadata,
    );
    const [source] = palette;
    const channels =
      value === undefined
        ? undefined
        : paletteChannelsFromCss(String(value), get(outputGamutAtom));
    if (value !== undefined && !channels)
      throw new Error("Enter a valid color value.");
    if (channels) {
      const result = set(updatePaletteColorAtom, {
        id: source.paletteColorId!,
        ...channels,
      });
      if (!result.ok) throw new Error(result.error);
    }
    if (nextTaxonomy) set(taxonomyDocumentAtom, nextTaxonomy);
    set(browserTokenEditsAtom, nextEdits);
  },
);

export const resetBrowserTokenAtom = atom(null, (get, set, id: string) => {
  if (
    get(semanticBrowserStateAtom).tokens.some((token) => token.id === id) &&
    !get(browserTokenEditsAtom)[id]
  )
    throw new Error("Generated variants have no direct overrides to reset.");
  if (!get(editModeAtom)) return;
  const next = { ...get(browserTokenEditsAtom) };
  const source = get(browserTokenSourcesAtom).find(
    (source) => source.id === id,
  );
  if (source?.dataVis?.static) {
    const values = next[id]?.values;
    if (values && Object.keys(values).length) next[id] = { values };
    else delete next[id];
    set(
      colorSystemDocumentAtom,
      editStaticMemberOverrides(
        get(colorSystemDocumentAtom),
        new Map([[id, null]]),
      ),
    );
  } else delete next[id];
  set(browserTokenEditsAtom, next);
  const taxonomy = get(taxonomyDocumentAtom);
  const classifications = { ...taxonomy.classifications };
  delete classifications[id];
  set(taxonomyDocumentAtom, { ...taxonomy, classifications });
  if (!source?.dataVis?.static) set(resetTokenAtom, id);
});
