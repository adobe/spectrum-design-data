// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { authoringSourceSnapshotAtom } from "../edit-session/state";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import { shippedChangeSnapshot } from "./comparisonState";
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
>;
export const comparisonPublicationAtom = atom<ComparisonState | null>(null);
export const asyncComparisonAtom = atom((get): ComparisonState => {
  const input = get(comparisonRequestAtom);
  const published = get(comparisonPublicationAtom);
  return published?.input === input ? published : { status: "pending", input };
});
