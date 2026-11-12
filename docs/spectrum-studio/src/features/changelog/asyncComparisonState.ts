// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { authoringSourceSnapshotAtom } from "../edit-session/state";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import {
  immediateAuthoredComparisonAtom,
  shippedChangeSnapshot,
} from "./comparisonState";
import { mergeChangeGroups } from "./mergeGroups";
import type { DerivedState } from "../derived-work/LatestRequest";
import type {
  ComparisonOutput,
  ComparisonProgress,
  ComparisonRequest,
} from "./comparisonWork";

const comparisonRetryCountAtom = atom(0);
export const retryComparisonAtom = atom(null, (get, set) =>
  set(comparisonRetryCountAtom, get(comparisonRetryCountAtom) + 1),
);
export const comparisonRequestAtom = atom((get): ComparisonRequest => {
  get(comparisonRetryCountAtom);
  return {
    working: get(authoringSourceSnapshotAtom),
    shipped: shippedChangeSnapshot,
    attachments: get(foundationModeAttachmentsAtom),
  };
});
export type ComparisonState = DerivedState<
  ComparisonRequest,
  ComparisonOutput,
  ComparisonProgress
> & { display?: ComparisonProgress };
const publicationAtom = atom<ComparisonState | null>(null);
const lastReadyAtom = atom<ComparisonOutput | undefined>(undefined);
export const comparisonPublicationAtom = atom(
  (get) => get(publicationAtom),
  (get, set, publication: ComparisonState | null) => {
    if (publication && publication.input !== get(comparisonRequestAtom)) return;
    if (
      publication?.status === "ready" &&
      publication.input === get(comparisonRequestAtom)
    )
      set(lastReadyAtom, publication.value);
    set(publicationAtom, publication);
  },
);
export const asyncComparisonAtom = atom((get): ComparisonState => {
  const input = get(comparisonRequestAtom);
  const published = get(comparisonPublicationAtom);
  if (published?.input === input && published.status === "ready")
    return published;
  const current =
    published?.input === input
      ? published
      : { status: "pending" as const, input };
  const authored = get(immediateAuthoredComparisonAtom);
  const lastReady = get(lastReadyAtom);
  const partial =
    current.status === "pending" && current.partial
      ? current.partial
      : authored
        ? {
            working: input.working,
            authored,
            groups: mergeChangeGroups(authored),
          }
        : undefined;
  const display = partial && {
    ...partial,
    groups: mergeChangeGroups(
      partial.authored,
      lastReady?.tokens.status === "ready"
        ? lastReady.tokens.comparison
        : undefined,
    ),
  };
  return current.status === "pending"
    ? { ...current, partial: display }
    : { ...current, display };
});
