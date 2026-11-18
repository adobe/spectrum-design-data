// Copyright 2026 Adobe. All rights reserved.
// Deprecation for color scales. The scale owns its lifecycle; the same action
// deprecates each generated step token and maps it to the replacement scale's
// token at the same step. See docs/rfcs/deletion-and-deprecation.md.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import {
  deprecatedLifecycle,
  isDeprecated,
  withLifecycle,
} from "../edit-session/lifecycle";
import { authoringSnapshotAtom } from "../edit-session/state";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import { isFoundationPublished } from "../foundations/types";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdits } from "../tokens/browserEditTypes";
import { browserModeContextAtom } from "../tokens/browserState";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import {
  commitDialogDraft,
  createDialogDraft,
  dialogRowsForMode,
} from "../tokens/dialogModel";
import { tokenStableKey, tokenUuid } from "../tokens/model";
import { termLabel } from "../taxonomy/termPresentation";
import type { ColorScale, ColorSystemDocument } from "./model";
import { scaleContrasts } from "./contrastSteps";
import { colorSystemDocumentAtom } from "./state";

function scaleSteps(document: ColorSystemDocument, scale: ColorScale) {
  return scaleContrasts(document, scale).map((contrast) => contrast.id);
}

export function colorScaleStepTokenIds(
  document: ColorSystemDocument,
  scale: ColorScale,
) {
  return scaleSteps(document, scale).map((contrastId) =>
    tokenUuid(tokenStableKey(scale.id, contrastId)),
  );
}

/**
 * Active published scales whose steps match one to one, so each step token
 * has an exact replacement.
 */
export function colorScaleReplacementCandidates(
  document: ColorSystemDocument,
  scaleId: string,
): { id: string; label: string }[] {
  const scale = document.scales.find((item) => item.id === scaleId);
  if (!scale) return [];
  const steps = scaleSteps(document, scale).join("\n");
  return document.scales
    .filter(
      (item) =>
        item.id !== scale.id &&
        !isDeprecated(item) &&
        isFoundationPublished(item) &&
        scaleSteps(document, item).join("\n") === steps,
    )
    .map((item) => ({ id: item.id, label: termLabel(item.name) }));
}

export interface ColorScaleLifecycleSnapshot {
  document: ColorSystemDocument;
  edits: BrowserTokenEdits;
}

export const deprecateColorScaleAtom = atom(
  null,
  (
    get,
    set,
    input: { scaleId: string; replacedBy?: string },
  ): ColorScaleLifecycleSnapshot => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to deprecate a color scale.");
    const document = get(colorSystemDocumentAtom);
    const scale = document.scales.find((item) => item.id === input.scaleId);
    if (!scale) throw new Error("The color scale no longer exists.");
    if (isDeprecated(scale))
      throw new Error("This color scale is already deprecated.");
    const replacement = input.replacedBy
      ? document.scales.find((item) => item.id === input.replacedBy)
      : undefined;
    if (
      input.replacedBy &&
      (!replacement ||
        !colorScaleReplacementCandidates(document, scale.id).some(
          (item) => item.id === input.replacedBy,
        ))
    )
      throw new Error(
        "Choose an active color scale with the same contrast steps.",
      );
    const previous = { document, edits: get(browserTokenEditsAtom) };
    const nextDocument: ColorSystemDocument = {
      ...document,
      scales: document.scales.map((item) =>
        item.id === scale.id
          ? withLifecycle(item, deprecatedLifecycle(input.replacedBy))
          : item,
      ),
    };
    let edits = previous.edits;
    const updates = new Map<string, unknown>([
      ["foundations/color", nextDocument],
    ]);
    if (isFoundationPublished(scale)) {
      const generated = get(workingTshirtArtifactsAtom);
      if (generated.status !== "ready") throw new Error(generated.error);
      const snapshot = get(authoringSnapshotAtom);
      const rows = canonicalAliasRows(
        completeAliasSource(snapshot),
        generated.bundle,
        "preserve-for-review",
      );
      const modeKey = get(browserModeContextAtom).key;
      const available = dialogRowsForMode(rows, modeKey);
      const replacementIds = replacement
        ? colorScaleStepTokenIds(document, replacement)
        : [];
      colorScaleStepTokenIds(document, scale).forEach((id, index) => {
        const row = available.find((item) => item.token.id === id);
        if (!row) return;
        const draft = createDialogDraft(row.token, modeKey);
        draft.deprecated = true;
        if (replacement) draft.replacementIds = [replacementIds[index]];
        edits = commitDialogDraft(draft, rows, edits, snapshot.taxonomy!);
      });
      updates.set("tokens/browser/edits", edits);
    }
    withValidatedAuthoringUpdates(get, updates, () => {
      set(colorSystemDocumentAtom, nextDocument);
      set(browserTokenEditsAtom, edits);
      return undefined;
    });
    return previous;
  },
);

/** Undoes a deprecation by restoring the scale and its token lifecycle. */
export const restoreColorScaleLifecycleAtom = atom(
  null,
  (get, set, previous: ColorScaleLifecycleSnapshot) => {
    withValidatedAuthoringUpdates(
      get,
      new Map<string, unknown>([
        ["foundations/color", previous.document],
        ["tokens/browser/edits", previous.edits],
      ]),
      () => {
        set(colorSystemDocumentAtom, previous.document);
        set(browserTokenEditsAtom, previous.edits);
        return undefined;
      },
    );
  },
);
