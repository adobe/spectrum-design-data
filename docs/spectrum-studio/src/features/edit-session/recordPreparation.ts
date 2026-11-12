// Copyright 2026 Adobe. All rights reserved.
import {
  isFoundationModeAttachments,
  pruneFoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";
import { prepareAuthoringSnapshot } from "./snapshotPreparation";
import { assertStoredSnapshot, type EditSessionSnapshot } from "./state";
import {
  AUTHORING_RECORD_VERSION,
  serializeAuthoringRecord,
  type AuthoringRecord,
} from "./storage";
import type { ComponentContrastWitness } from "../components/contrastWitness";
import type { ComponentColorWitness } from "../components/colorWitness";
import { upgradeCanonicalTokenIdentities } from "./canonicalIdentityUpgrade";
import { reconcileStyleSource } from "../styles/artifacts";

export interface PreparedAuthoringResult {
  record: AuthoringRecord<EditSessionSnapshot>;
  componentContrastWitness: ComponentContrastWitness | null;
  componentColorWitness: ComponentColorWitness | null;
  serialized?: string;
  stylePublicationsChanged?: boolean;
  browserTokenEditsChanged?: boolean;
  savedChanged?: boolean;
}
export function prepareAuthoringResult(
  input: AuthoringRecord<EditSessionSnapshot>,
): PreparedAuthoringResult {
  const record = prepareAuthoringRecord(input);
  return {
    record,
    serialized: serializeAuthoringRecord(record),
    stylePublicationsChanged: record.working.styles !== input.working.styles,
    browserTokenEditsChanged:
      JSON.stringify(record.working.browserTokenEdits) !==
      JSON.stringify(input.working.browserTokenEdits),
    savedChanged: JSON.stringify(record.saved) !== JSON.stringify(input.saved),
    componentContrastWitness: null,
    componentColorWitness: null,
  };
}

export function prepareAuthoringRecord(
  input: AuthoringRecord<EditSessionSnapshot>,
): AuthoringRecord<EditSessionSnapshot> {
  if (
    input.version !== AUTHORING_RECORD_VERSION ||
    typeof input.isEditing !== "boolean" ||
    !isFoundationModeAttachments(input.attachments) ||
    !isFoundationModeAttachments(input.savedAttachments)
  ) {
    throw new Error("The pending authoring record has an unsupported format.");
  }
  const allocations = new Map<string, string>();
  const working = prepareAuthoringSnapshot(
    upgradeCanonicalTokenIdentities(
      reconcileStyleSource(input.working),
      allocations,
    ),
  );
  const saved = upgradeCanonicalTokenIdentities(input.saved, allocations);
  assertStoredSnapshot(working);
  assertStoredSnapshot(saved);
  return {
    ...input,
    working,
    saved,
    attachments: pruneFoundationModeAttachments(
      input.attachments,
      working.modeSets,
    ),
    savedAttachments: pruneFoundationModeAttachments(
      input.savedAttachments,
      input.saved.modeSets,
    ),
  };
}
