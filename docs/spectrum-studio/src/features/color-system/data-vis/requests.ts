// Copyright 2026 Adobe. All rights reserved.
import type { CategoricalMember } from "./model";
import type { UiSwatch } from "./resolution";
import { uiSwatchKey } from "./resolution";

export function suggestionMembers(
  sourceIds: readonly string[],
  candidates: readonly UiSwatch[],
  previous: readonly CategoricalMember[],
  createId: () => string,
): CategoricalMember[] {
  const retained = new Map(
    previous.map((member) => [uiSwatchKey(member.source), member]),
  );
  const retainedIds = new Set(
    sourceIds.flatMap((id) => (retained.has(id) ? [retained.get(id)!.id] : [])),
  );
  const replacements = previous.filter((member) => !retainedIds.has(member.id));
  return sourceIds.map((id) => {
    const source = candidates.find((candidate) => candidate.id === id);
    if (!source)
      throw new Error(
        "A suggested source is no longer available. Refresh the suggestions.",
      );
    return {
      id: retained.get(id)?.id ?? replacements.shift()?.id ?? createId(),
      source: source.source,
    };
  });
}

export function isCurrentSuggestion(
  message: { requestId: number; fingerprint: string },
  current: { requestId: number; fingerprint: string },
) {
  return (
    message.requestId === current.requestId &&
    message.fingerprint === current.fingerprint
  );
}
