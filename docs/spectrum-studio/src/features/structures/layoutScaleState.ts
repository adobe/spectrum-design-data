// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  captureSnapshot,
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
} from "../edit-session/state";
import { deferNumericLayoutEdit } from "../edit-session/numericProposal";
import { componentColorWitnessAtom } from "../components/colorWitness";
import { canonicalJson } from "../design-data/canonicalJson";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { editModeAtom } from "../../state/view/editMode";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { taxonomyContributionsEnabledAtom } from "../taxonomy/contributions";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { structuresDocumentAtom } from "./documentState";
import { synchronizeVariantIdentities } from "./semanticIdentity";
import {
  layoutScaleQuestions,
  resolveLayoutScaleProposal,
  type LayoutEdit,
  type LayoutScaleAnswer,
  type LayoutScaleProposal,
} from "./layoutScales";
import type { StructureRuleApplication } from "./model";

export interface NumericLayoutContinuation {
  isCurrent: () => boolean;
  answer: (proposal: LayoutScaleProposal) => void;
  cancel: () => void;
}
type PendingLayoutScale = LayoutScaleProposal & {
  numeric?: NumericLayoutContinuation;
};
const pendingLayoutScaleStateAtom = atom<PendingLayoutScale | null>(null);
export const pendingLayoutScaleAtom = atom(
  (get) => get(pendingLayoutScaleStateAtom),
  (get, set, next: PendingLayoutScale | null) => {
    const previous = get(pendingLayoutScaleStateAtom);
    set(pendingLayoutScaleStateAtom, next);
    if (previous?.numeric && previous.numeric !== next?.numeric)
      previous.numeric.cancel();
  },
);

export const requestLayoutScaleAtom = atom(
  null,
  (
    get,
    set,
    input: { edit: LayoutEdit; application?: StructureRuleApplication },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change Structures.");
    const current = get(authoringSourceSnapshotAtom);
    if (!layoutScaleQuestions(current, input.edit, input.application).length)
      return false;
    if (deferNumericLayoutEdit(input)) return false;
    const source = captureSnapshot(get);
    const questions = layoutScaleQuestions(
      source,
      input.edit,
      input.application,
    );
    if (!questions.length) return false;
    if (get(pendingLayoutScaleAtom))
      throw new Error("Finish or cancel the pending scale choice first.");
    set(pendingLayoutScaleAtom, { source, ...input, questions, answers: [] });
    return true;
  },
);

export const answerLayoutScaleAtom = atom(
  null,
  (get, set, answer: LayoutScaleAnswer) => {
    const pending = get(pendingLayoutScaleAtom);
    if (!pending) throw new Error("This scale choice is no longer available.");
    if (
      !get(editModeAtom) ||
      (pending.numeric
        ? !pending.numeric.isCurrent()
        : canonicalJson(captureSnapshot(get)) !== canonicalJson(pending.source))
    )
      throw new Error(
        "The design data changed. Cancel and enter the value again.",
      );
    const proposal = { ...pending, answers: [...pending.answers, answer] };
    if (proposal.answers.length < proposal.questions.length) {
      set(pendingLayoutScaleAtom, proposal);
      return;
    }
    if (pending.numeric) {
      pending.numeric.answer(proposal);
      set(pendingLayoutScaleAtom, null);
      return;
    }
    const candidate = resolveLayoutScaleProposal(proposal);
    const snapshot = {
      ...candidate,
      structures: synchronizeVariantIdentities(
        candidate.structures!,
        candidate.modeSets,
      ),
    };
    // The same witness as the component guard below, so both checks share one catalog build.
    assertStoredSnapshot(snapshot, get(componentColorWitnessAtom));
    buildTshirtArtifacts(snapshot);
    const updates = new Map<string, unknown>([
      ["registry/taxonomy", snapshot.taxonomy],
      ["foundations/spacing", snapshot.spacing],
      ["foundations/size", snapshot.size],
      ["foundations/radius", snapshot.radius],
      ["logic/scale-types", snapshot.scaleTypes],
      ["design/structures", snapshot.structures],
    ]);
    withValidatedAuthoringUpdates(get, updates, () => {
      const enabled = get(taxonomyContributionsEnabledAtom);
      set(taxonomyContributionsEnabledAtom, false);
      try {
        set(taxonomyDocumentAtom, snapshot.taxonomy!);
        set(spacingDocumentAtom, snapshot.spacing!);
        set(sizeDocumentAtom, snapshot.size!);
        set(radiusDocumentAtom, snapshot.radius!);
        set(scaleTypesAtom, snapshot.scaleTypes!);
        set(structuresDocumentAtom, snapshot.structures!);
      } finally {
        set(taxonomyContributionsEnabledAtom, enabled);
      }
      set(pendingLayoutScaleAtom, null);
    });
  },
);
