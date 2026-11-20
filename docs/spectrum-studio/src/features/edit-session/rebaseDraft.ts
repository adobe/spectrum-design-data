// Copyright 2026 Adobe. All rights reserved.
import { sameValue } from "../changelog/contract";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function identity(value: unknown) {
  if (!record(value)) return undefined;
  return typeof value.id === "string"
    ? `id:${value.id}`
    : typeof value.conceptId === "string"
      ? `conceptId:${value.conceptId}`
      : undefined;
}

/** Applies only edited leaves; concurrent source changes must not be overwritten. */
export function rebaseDraft(
  previous: unknown,
  proposal: unknown,
  current: unknown,
  replaceConflicts = false,
): unknown {
  if (sameValue(previous, proposal)) return current;
  if (sameValue(previous, current) || sameValue(proposal, current))
    return proposal;
  if (
    Array.isArray(previous) &&
    Array.isArray(proposal) &&
    Array.isArray(current)
  ) {
    const identities = previous.map(identity);
    const proposalIds = proposal.map(identity);
    const currentIds = current.map(identity);
    if (
      [identities, proposalIds, currentIds].every(
        (ids) =>
          ids.every((id) => id !== undefined) &&
          new Set(ids).size === ids.length,
      )
    ) {
      const before = new Map(previous.map((item) => [identity(item), item]));
      const after = new Map(proposal.map((item) => [identity(item), item]));
      if (
        !sameValue(
          identities.filter((id) => after.has(id)),
          proposalIds.filter((id) => before.has(id)),
        )
      )
        throw new Error("This list changed while it was being edited.");
      for (const [id, item] of before)
        if (
          after.has(id) &&
          !sameValue(item, after.get(id)) &&
          !currentIds.includes(id)
        )
          throw new Error("The edited item was removed. Reopen its settings.");
      const merged = current.flatMap((item) => {
        const id = identity(item);
        if (!before.has(id)) {
          if (after.has(id) && !sameValue(item, after.get(id)))
            throw new Error("This item was added with different settings.");
          return [item];
        }
        if (!after.has(id)) {
          if (!replaceConflicts && !sameValue(before.get(id), item))
            throw new Error("This setting changed while it was being edited.");
          return [];
        }
        return [
          rebaseDraft(before.get(id), after.get(id), item, replaceConflicts),
        ];
      });
      for (const item of proposal)
        if (!before.has(identity(item)) && !currentIds.includes(identity(item)))
          merged.push(item);
      return merged;
    }
    if (
      previous.length === proposal.length &&
      previous.length === current.length &&
      previous.every((item) => identity(item) === undefined) &&
      current.every((item) => identity(item) === undefined)
    )
      return current.map((item, index) =>
        rebaseDraft(previous[index], proposal[index], item, replaceConflicts),
      );
    throw new Error("This list changed while it was being edited.");
  } else if (record(previous) && record(proposal) && record(current)) {
    const next = { ...current };
    for (const key of new Set([
      ...Object.keys(previous),
      ...Object.keys(proposal),
    ])) {
      if (sameValue(previous[key], proposal[key])) continue;
      if (!(key in proposal)) {
        if (
          !replaceConflicts &&
          !sameValue(previous[key], current[key]) &&
          key in current
        )
          throw new Error("This setting changed while it was being edited.");
        delete next[key];
      } else
        next[key] = rebaseDraft(
          previous[key],
          proposal[key],
          current[key],
          replaceConflicts,
        );
    }
    return next;
  }
  if (replaceConflicts) return proposal;
  throw new Error("This setting changed while it was being edited.");
}
