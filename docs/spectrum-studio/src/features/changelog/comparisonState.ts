// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  authoringSnapshotAtom,
  authoringSourceSnapshotAtom,
  createDefaultSnapshot,
} from "../edit-session/state";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import { createAuthoringComparator } from "./registry";
import {
  comparePrimitiveTokens,
  compareSemanticTokens,
  type TokenComparison,
} from "./tokenComparison";
import { mergeChangeGroups } from "./mergeGroups";

export const shippedChangeSnapshot = createDefaultSnapshot();
const authoringComparatorAtom = atom(() => createAuthoringComparator());
export const authoredComparisonAtom = atom((get) =>
  get(authoringComparatorAtom)(
    shippedChangeSnapshot,
    get(authoringSnapshotAtom),
    get(foundationModeAttachmentsAtom),
  ),
);
export const immediateAuthoredComparisonAtom = atom((get) => {
  const source = get(authoringSourceSnapshotAtom);
  // Alias pruning changes source Changes and still belongs to the prepared worker path.
  if (source.aliases?.tokens.length) return undefined;
  return get(authoringComparatorAtom)(
    shippedChangeSnapshot,
    source,
    get(foundationModeAttachmentsAtom),
  );
});

export const tokenComparisonResultAtom = atom(
  (
    get,
  ):
    | { status: "ready"; comparison: TokenComparison }
    | { status: "unavailable"; error: string; failure: Error } => {
    const working = get(authoringSnapshotAtom),
      authored = get(authoredComparisonAtom);
    try {
      const primitive = comparePrimitiveTokens(
        shippedChangeSnapshot,
        working,
        authored,
      );
      const semantic = compareSemanticTokens(
        shippedChangeSnapshot,
        working,
        authored,
      );
      return {
        status: "ready",
        comparison: {
          items: [...primitive.items, ...semantic.items],
          records: [...primitive.records, ...semantic.records],
        },
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { status: "unavailable", error: error.message, failure: error };
    }
  },
);

export const parityChangeGroupsAtom = atom((get) => {
  const authored = get(authoredComparisonAtom),
    tokens = get(tokenComparisonResultAtom);
  return mergeChangeGroups(
    authored,
    tokens.status === "ready" ? tokens.comparison : undefined,
  );
});
