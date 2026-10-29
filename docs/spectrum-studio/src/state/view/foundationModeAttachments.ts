// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  FOUNDATIONS,
  type FoundationId,
} from "../../features/modes/parameters";
import type { ModeSet } from "../../features/modes/model";

export type FoundationModeAttachments = Record<string, FoundationId[]>;

export function isFoundationModeAttachments(
  value: unknown,
): value is FoundationModeAttachments {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([id, foundations]) =>
      id.trim() &&
      Array.isArray(foundations) &&
      new Set(foundations).size === foundations.length &&
      foundations.every((foundation) =>
        FOUNDATIONS.some((item) => item.id === foundation),
      ),
  );
}

export const FOUNDATION_MODE_ATTACHMENT_DEFAULTS: FoundationModeAttachments = {
  "mode-set-color-scheme": ["opacity"],
};
export const foundationModeAttachmentsAtom = atom<FoundationModeAttachments>(
  structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
);
export const savedFoundationModeAttachmentsAtom =
  atom<FoundationModeAttachments>(
    structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
  );

export function pruneFoundationModeAttachments(
  attachments: FoundationModeAttachments,
  sets: ModeSet[],
): FoundationModeAttachments {
  const ids = new Set(sets.map((set) => set.id));
  return Object.fromEntries(
    Object.entries(attachments).filter(([id]) => ids.has(id)),
  );
}
