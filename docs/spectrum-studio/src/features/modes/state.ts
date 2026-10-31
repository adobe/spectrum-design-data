// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { persistedAtom } from "../../state/persist";
import { capabilityOwners, parameterOwners } from "./parameters";
import {
  releaseModeSetClaimsAtom,
  restoreModeSetClaimsAtom,
  type AdaptiveClaims,
} from "./adaptive";
import {
  cloneModeSet,
  ensureModeSetKeys,
  isModeSetList,
  migrateModeSets,
  MODE_SET_DEFAULTS,
  MODE_SETS_SCHEMA_VERSION,
  type ModeSet,
} from "./model";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import type { FoundationId } from "./parameters";
import { clearPreviewParametersAtom } from "./previewState";
import { dataVisModeOwnershipIssues } from "../color-system/data-vis/patches";
import { dataVisSourceIssues } from "../color-system/data-vis/references";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { colorSystemDocumentAtom } from "../color-system/state";
import type { ColorSystemDocument } from "../color-system/model";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import {
  removeTokenModeValues,
  restoreTokenModeValues,
  type RemovedTokenModeValues,
} from "./tokenValueCleanup";
import { opacityDocumentAtom } from "../opacity/state";
import { synchronizeOpacityRows } from "../opacity/generation";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { structuresDocumentAtom } from "../structures/documentState";
import { synchronizeVariantIdentities } from "../structures/semanticIdentity";

interface RemovedModeTokenValues {
  values: RemovedTokenModeValues;
  dataVisMemberTokenIds: string[];
}

function dataVisMemberTokenIds(document: ColorSystemDocument) {
  return new Set(
    document.dataVisScales.flatMap((scale) =>
      scale.kind === "categorical"
        ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
        : [],
    ),
  );
}

function assertDataVisModeOwnership(sets: ModeSet[]) {
  const issues = dataVisModeOwnershipIssues(sets);
  if (issues.length) throw new Error(issues.join(" "));
}

export const modeSetsAtom = persistedAtom<ModeSet[]>({
  key: "modes/mode-sets",
  schemaVersion: MODE_SETS_SCHEMA_VERSION,
  initialize: () => MODE_SET_DEFAULTS.map(cloneModeSet),
  validate: isModeSetList,
  migrate: migrateModeSets,
});

function writeModeSources(
  get: Getter,
  set: Setter,
  modeSets: ModeSet[],
  edits: BrowserTokenEdits = get(browserTokenEditsAtom),
) {
  const opacity = synchronizeOpacityRows({
    opacity: get(opacityDocumentAtom),
    colorSystem: get(colorSystemDocumentAtom),
    modeSets,
    browserTokenEdits: edits,
  })!;
  const structures = synchronizeVariantIdentities(
    get(structuresDocumentAtom),
    modeSets,
  );
  withValidatedAuthoringUpdates(
    get,
    new Map<string, unknown>([
      ["modes/mode-sets", modeSets],
      ["tokens/browser/edits", edits],
      ["foundations/opacity", opacity],
      ["design/structures", structures],
    ]),
    () => {
      set(modeSetsAtom, modeSets);
      set(browserTokenEditsAtom, edits);
      set(opacityDocumentAtom, opacity);
      set(structuresDocumentAtom, structures);
    },
  );
}

export const addModeSetAtom = atom(null, (get, set, modeSet: ModeSet) => {
  const owners = capabilityOwners(get(modeSetsAtom));
  if (
    modeSet.authoringCapabilities?.some(
      (capability) => owners[capability] !== undefined,
    )
  )
    throw new Error("Another mode set already manages one of these variables.");
  if (
    get(modeSetsAtom).some(
      (item) => item.id === modeSet.id || item.key === modeSet.key,
    )
  )
    throw new Error("A mode set with this identity already exists.");
  const next = ensureModeSetKeys(cloneModeSet(modeSet));
  assertDataVisModeOwnership([
    ...get(modeSetsAtom),
    { ...modeSet, defaultModeId: next.defaultModeId },
  ]);
  writeModeSources(get, set, [...get(modeSetsAtom), next]);
});

export const replaceModeSetAtom = atom(null, (get, set, modeSet: ModeSet) => {
  const owners = capabilityOwners(
    get(modeSetsAtom).filter((item) => item.id !== modeSet.id),
  );
  if (
    modeSet.authoringCapabilities?.some(
      (capability) => owners[capability] !== undefined,
    )
  )
    throw new Error("Another mode set already manages one of these variables.");
  const next = ensureModeSetKeys(cloneModeSet(modeSet));
  const previous = get(modeSetsAtom).find((item) => item.id === modeSet.id);
  if (!previous) throw new Error("This mode set is no longer available.");
  // Key normalization clears default overrides; validate the authored patches before that happens.
  assertDataVisModeOwnership(
    get(modeSetsAtom).map((item) =>
      item.id === modeSet.id
        ? { ...modeSet, defaultModeId: next.defaultModeId }
        : item,
    ),
  );
  const sets = get(modeSetsAtom).map((item) =>
    item.id === next.id ? next : item,
  );
  const removedModes = new Set(
    previous.modes
      .filter((mode) => !next.modes.some((item) => item.id === mode.id))
      .map((mode) => mode.id),
  );
  const edits = removedModes.size
    ? removeTokenModeValues(get(browserTokenEditsAtom), next.id, removedModes)
        .edits
    : undefined;
  writeModeSources(get, set, sets, edits);
});

export const removeModeSetAtom = atom(null, (get, set, id: string) => {
  const previous = get(modeSetsAtom).find((modeSet) => modeSet.id === id);
  if (!previous) throw new Error("This mode set is no longer available.");
  const owned = previous.authoringCapabilities ?? [];
  const edits = removeTokenModeValues(get(browserTokenEditsAtom), id);
  const memberIds = dataVisMemberTokenIds(get(colorSystemDocumentAtom));
  const removed: RemovedModeTokenValues = {
    values: edits.removed,
    dataVisMemberTokenIds: Object.keys(edits.removed).filter((tokenId) =>
      memberIds.has(tokenId),
    ),
  };
  set(
    clearPreviewParametersAtom,
    owned.filter((capability) => capability.startsWith("elevation.")),
  );
  writeModeSources(
    get,
    set,
    get(modeSetsAtom).filter((item) => item.id !== id),
    edits.edits,
  );
  set(releaseModeSetClaimsAtom, id);
  const attachments = { ...get(foundationModeAttachmentsAtom) };
  delete attachments[id];
  set(foundationModeAttachmentsAtom, attachments);
  return removed;
});

export const restoreModeSetAtom = atom(
  null,
  (
    get,
    set,
    input: {
      modeSet: ModeSet;
      index: number;
      claims?: AdaptiveClaims;
      attachments?: FoundationId[];
      tokenValues?: RemovedModeTokenValues;
    },
  ) => {
    if (get(modeSetsAtom).some((axis) => axis.id === input.modeSet.id))
      throw new Error("This mode set identity is already in use.");
    const owners = capabilityOwners(get(modeSetsAtom));
    if (
      input.modeSet.authoringCapabilities?.some(
        (capability) => owners[capability],
      )
    )
      throw new Error(
        "Mode ownership changed. Undo cannot restore this mode set.",
      );
    const next = [...get(modeSetsAtom)];
    next.splice(
      Math.min(input.index, next.length),
      0,
      cloneModeSet(input.modeSet),
    );
    const document = get(colorSystemDocumentAtom),
      issues = dataVisSourceIssues(document, next);
    if (issues.length)
      throw new Error(`Undo cannot restore this mode set. ${issues.join(" ")}`);
    const memberIds = dataVisMemberTokenIds(document);
    if (
      input.tokenValues?.dataVisMemberTokenIds.some((id) => !memberIds.has(id))
    ) {
      throw new Error(
        "A categorical color was removed after this mode set. Undo cannot restore its token value.",
      );
    }
    const edits = input.tokenValues
      ? restoreTokenModeValues(
          get(browserTokenEditsAtom),
          input.tokenValues.values,
        )
      : undefined;
    writeModeSources(get, set, next, edits);
    if (input.claims) set(restoreModeSetClaimsAtom, input.claims);
    if (input.attachments)
      set(foundationModeAttachmentsAtom, (current) => ({
        ...current,
        [input.modeSet.id]: input.attachments!,
      }));
  },
);

export const parameterOwnersAtom = atom((get) =>
  parameterOwners(get(modeSetsAtom)),
);
