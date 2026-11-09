// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  authoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import { editModeAtom } from "../../state/view/editMode";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import { tokenDialogCatalogAtom } from "../tokens/dialogState";
import {
  commitDialogDraft,
  createDialogDraft,
  validateDialogAssignment,
} from "../tokens/dialogModel";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { modePairs, shadowText } from "../tokens/tokenAssignments";
import type { TokenAssignment } from "../tokens/browserEditTypes";
import type { CanonicalAliasRow } from "../tokens/aliasTargets";
import type { ModeSet } from "../modes/model";
import {
  normalizedOpacity,
  type ColorOpacityAssessment,
  type ColorOpacityRow,
} from "./colorOpacityAssessment";
import { comparableScalars, shadowLayers } from "./foundationValues";
import { canonicalJson } from "./canonicalJson";

export interface ReferenceOverride {
  tokenId: string;
  modeKey: string;
  assignment: Extract<TokenAssignment, { kind: "literal" }>;
}
export type ReferenceOverrideEligibility =
  | { targets: ReferenceOverride[]; reason?: never }
  | { targets: []; reason: string };

function referenceAssignment(
  token: CanonicalAliasRow["token"],
  row: ColorOpacityRow,
): ReferenceOverride["assignment"] {
  if (token.type === "elevation") {
    const shadows = shadowLayers(row.referenceValue);
    return { kind: "literal", value: shadowText(shadows), shadows };
  }
  if (token.type === "colors" && typeof row.referenceValue === "string")
    return { kind: "literal", value: row.referenceValue };
  if (token.type === "opacity") {
    const alpha = normalizedOpacity(row.referenceValue);
    if (alpha !== undefined && Number.isFinite(alpha))
      return { kind: "literal", value: alpha };
  }
  const values = comparableScalars(
    1,
    row.referenceValue,
    token.unit,
    row.reference.unit,
  );
  if (!values)
    throw new Error(
      "The reference value cannot be converted to this token's authored unit.",
    );
  return { kind: "literal", value: values.reference / values.app };
}

export function referenceOverrideEligibility(
  row: ColorOpacityRow,
  catalog: readonly CanonicalAliasRow[],
  modeSets: readonly ModeSet[],
): ReferenceOverrideEligibility {
  if (
    !row.app ||
    row.referenceValue === undefined ||
    row.referenceValue === null ||
    row.appValue === undefined ||
    row.appValue === null
  )
    return {
      targets: [],
      reason:
        "A confirmed app token and resolved design-data value are required.",
    };
  if (row.verdict === "unassessable" || row.modeFailures?.length)
    return {
      targets: [],
      reason:
        "Refresh the comparison and confirm the token's mode mapping before applying an override.",
    };
  const selection: Record<string, string> = {};
  for (const [axis, mode] of Object.entries(row.appContext ?? {})) {
    const sets = modeSets.filter((set) => set.key === axis);
    const modes =
      sets.length === 1
        ? sets[0].modes.filter((item) => item.key === mode)
        : [];
    if (modes.length !== 1)
      return {
        targets: [],
        reason: `No unique saved mode matches ${axis}: ${mode}.`,
      };
    selection[sets[0].id] = modes[0].id;
  }
  const axes = new Set(modeSets.map((set) => set.key));
  const classification = (flat: Record<string, unknown> | undefined) =>
    flat &&
    canonicalJson(
      Object.fromEntries(
        Object.entries(flat).filter(
          ([key]) => !axes.has(key) && key !== "legacyKey",
        ),
      ),
    );
  const matches = catalog.filter(
    (candidate) =>
      !candidate.token.alias &&
      (row.app!.browserTokenId
        ? candidate.token.id === row.app!.browserTokenId
        : candidate.rowId === row.app!.identity ||
          candidate.id === row.app!.conceptId ||
          (row.app!.structuredName &&
            classification(candidate.token.projection?.flat) ===
              classification(row.app!.structuredName))) &&
      modePairs(candidate.context).every(
        ([axis, mode]) => selection[axis] === mode,
      ),
  );
  const ids = new Set(matches.map((candidate) => candidate.token.id));
  if (ids.size !== 1 || matches.length !== 1)
    return {
      targets: [],
      reason:
        "The comparison does not identify one editable token instance in the current data.",
    };
  const [target] = matches;
  if (target.token.status === "deprecated")
    return { targets: [], reason: "Deprecated token values cannot be edited." };
  if (target.token.validationError)
    return { targets: [], reason: target.token.validationError };
  try {
    const assignment = referenceAssignment(target.token, row);
    validateDialogAssignment(target.token, assignment);
    return {
      targets: [
        {
          tokenId: target.token.id,
          modeKey: canonicalTokenModeKey(
            Object.fromEntries(modePairs(target.context)),
          ),
          assignment,
        },
      ],
    };
  } catch (error) {
    return {
      targets: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function referenceOverrideIndex(
  assessment: ColorOpacityAssessment,
  catalog: readonly CanonicalAliasRow[],
  modeSets: readonly ModeSet[],
): Map<string, ReferenceOverrideEligibility> {
  return new Map(
    assessment.concepts.flatMap((concept) =>
      concept.rows.map(
        (row) =>
          [
            row.id,
            referenceOverrideEligibility(row, catalog, modeSets),
          ] as const,
      ),
    ),
  );
}

export function applyReferenceOverrides(
  targets: readonly ReferenceOverride[],
  catalog: readonly CanonicalAliasRow[],
  snapshot: EditSessionSnapshot,
) {
  if (!targets.length) throw new Error("Select at least one token instance.");
  if (!snapshot.taxonomy) throw new Error("The Registry is unavailable.");
  const grouped = new Map<
    string,
    Map<string, ReferenceOverride["assignment"]>
  >();
  for (const target of targets) {
    if (
      !catalog.some(
        (row) =>
          row.token.id === target.tokenId && row.context === target.modeKey,
      )
    )
      throw new Error(
        "A selected token's exact mode combination is no longer available.",
      );
    const assignments =
      grouped.get(target.tokenId) ??
      new Map<string, ReferenceOverride["assignment"]>();
    const previous = assignments.get(target.modeKey);
    if (
      previous &&
      canonicalJson(previous) !== canonicalJson(target.assignment)
    )
      throw new Error(
        "Selected reference values conflict for the same token and modes.",
      );
    assignments.set(target.modeKey, target.assignment);
    grouped.set(target.tokenId, assignments);
  }
  let edits = snapshot.browserTokenEdits ?? {};
  for (const [id, assignments] of grouped) {
    const token = catalog.find((row) => row.token.id === id)?.token;
    if (!token) throw new Error("A selected token is no longer available.");
    const draft = createDialogDraft(token, assignments.keys().next().value!);
    draft.assignments = Object.fromEntries(assignments);
    edits = commitDialogDraft(draft, catalog, edits, snapshot.taxonomy);
  }
  return edits;
}

export const applyReferenceOverridesAtom = atom(
  null,
  (
    get,
    set,
    input: { targets: ReferenceOverride[]; expected: EditSessionSnapshot },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change tokens.");
    if (get(authoringSnapshotAtom) !== input.expected)
      throw new Error(
        "Source data changed. Reopen Bulk edit before applying overrides.",
      );
    const catalog = get(tokenDialogCatalogAtom);
    if (catalog.status !== "ready") throw new Error(catalog.error);
    const edits = applyReferenceOverrides(
      input.targets,
      catalog.rows,
      input.expected,
    );
    withValidatedAuthoringUpdates(
      get,
      new Map([["tokens/browser/edits", edits]]),
      () => {
        set(browserTokenEditsAtom, edits);
      },
    );
  },
);
