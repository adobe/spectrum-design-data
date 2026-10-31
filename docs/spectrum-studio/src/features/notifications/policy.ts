// Copyright 2026 Adobe. All rights reserved.
// Rules for which notification a user action gets and what it says.
// See .agents/rules/notifications.mdc.

/**
 * - `part`: a small piece inside an item being edited. No toast; the change
 *   log is the undo path. Still confirmed when it removes exported names.
 * - `item`: an authored item. Toast with Undo on delete, or a confirmation
 *   dialog first when the delete removes exported names.
 * - `api`: always part of the exported design data. Always confirmed.
 */
export type NotificationTier = "part" | "item" | "api";

export interface NotificationKind {
  noun: string;
  tier: NotificationTier;
  /** Used in the dialog when no exported token names are removed. */
  impact?: string;
}

export const NOTIFICATION_KINDS = {
  structure: { noun: "Structure", tier: "item" },
  structureLayer: { noun: "Layer", tier: "part" },
  structureElement: { noun: "Element", tier: "part" },
  structureProperty: { noun: "Property", tier: "part" },
  booleanBinding: { noun: "Boolean binding", tier: "part" },
  component: {
    noun: "Component",
    tier: "api",
    impact:
      "Deleting this removes the component and its property assignments from the design data output.",
  },
  alias: {
    noun: "Alias",
    tier: "api",
    impact:
      "Deleting this removes the alias token from the design data output.",
  },
  term: {
    noun: "Term",
    tier: "api",
    impact:
      "Deleting this removes the term from names in the design data output.",
  },
  taxonomyCategory: {
    noun: "Category",
    tier: "api",
    impact:
      "Deleting this removes the category and its terms from the design data output.",
  },
  colorScale: { noun: "Color scale", tier: "item" },
  paletteColor: { noun: "Palette color", tier: "item" },
  surface: { noun: "Surface", tier: "item" },
  contrast: { noun: "Contrast", tier: "item" },
  customContrastStep: { noun: "Custom contrast step", tier: "part" },
  dataVisScale: { noun: "Data vis scale", tier: "item" },
  dataVisColorStop: { noun: "Data vis color stop", tier: "part" },
  dimensionScale: { noun: "Scale", tier: "item" },
  opacityLevel: { noun: "Opacity level", tier: "item" },
  lineHeight: { noun: "Line height", tier: "item" },
  shadowLayer: { noun: "Shadow layer", tier: "part" },
  modeSet: { noun: "Mode set", tier: "item" },
  formula: { noun: "Formula", tier: "item" },
  rule: { noun: "Rule", tier: "item" },
  interpolation: { noun: "Interpolation", tier: "item" },
} as const satisfies Record<string, NotificationKind>;

export type NotificationKindId = keyof typeof NOTIFICATION_KINDS;

export type NoticeVariant = "positive" | "neutral" | "info" | "negative";

export interface Notice {
  variant: NoticeVariant;
  message: string;
  undo?: () => void;
}

/** Higher wins when one user action produces several notices. */
const PRIORITY: Record<NoticeVariant, number> = {
  negative: 3,
  neutral: 2,
  positive: 1,
  info: 0,
};

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/** Spectrum content rule: spell out zero to nine, use numerals for 10+. */
export function countWord(count: number) {
  return count < 10 ? NUMBER_WORDS[count] : count.toLocaleString("en-US");
}

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Toasts are sentence case with no trailing period on a single sentence. */
export function toastText(text: string) {
  const trimmed = text.trim();
  const single = !/[.!?]\s+\S/.test(trimmed);
  return sentenceCase(single ? trimmed.replace(/\.$/, "") : trimmed);
}

export function nounFor(kind: NotificationKindId, noun?: string) {
  return sentenceCase(noun ?? NOTIFICATION_KINDS[kind].noun);
}

export function termsAddedText(count: number) {
  return count === 1
    ? "Term added to registry"
    : `${sentenceCase(countWord(count))} terms added to registry`;
}

export function addedText(
  kind: NotificationKindId,
  newTerms = 0,
  noun?: string,
) {
  const base = `${nounFor(kind, noun)} added`;
  if (kind === "term" || !newTerms) return base;
  return `${base} with ${countWord(newTerms)} new registry ${newTerms === 1 ? "term" : "terms"}`;
}

export function deletedText(kind: NotificationKindId, noun?: string) {
  return `${nounFor(kind, noun)} deleted`;
}

/** Alert dialog titles state the outcome; never a question (Spectrum). */
export function deleteDialogTitle(kind: NotificationKindId, noun?: string) {
  return `Delete ${nounFor(kind, noun).toLowerCase()}`;
}

export function deleteImpactText(
  kind: NotificationKindId,
  removedTokenNames: number,
) {
  if (removedTokenNames > 0)
    return `Deleting this removes ${countWord(removedTokenNames)} ${removedTokenNames === 1 ? "token" : "tokens"} from the design data output.`;
  const fallback = (NOTIFICATION_KINDS[kind] as NotificationKind).impact;
  return fallback ?? "Deleting this changes the design data output.";
}

export type DeleteFlow = "silent" | "toast" | "confirm";

export function deleteFlow(
  kind: NotificationKindId,
  removedTokenNames: number,
): DeleteFlow {
  const { tier } = NOTIFICATION_KINDS[kind] as NotificationKind;
  if (tier === "api" || removedTokenNames > 0) return "confirm";
  return tier === "part" ? "silent" : "toast";
}

export function errorText(failure: unknown) {
  const message =
    failure instanceof Error
      ? failure.message
      : typeof failure === "string"
        ? failure
        : String(failure);
  return toastText(message || "Something went wrong");
}

/** Recognizes the `{ ok: false, error }` result shape used by many atoms. */
export function failureOf(result: unknown): string | undefined {
  if (
    result &&
    typeof result === "object" &&
    "ok" in result &&
    (result as { ok: unknown }).ok === false
  ) {
    const error = (result as { error?: unknown }).error;
    return typeof error === "string" && error ? error : "Something went wrong";
  }
  return undefined;
}

/** Picks the one notice to show for a single user action. */
export function pickNotice(notices: readonly Notice[]): Notice | undefined {
  let best: Notice | undefined;
  for (const notice of notices)
    if (!best || PRIORITY[notice.variant] > PRIORITY[best.variant])
      best = notice;
  return best;
}

export function removedNames(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
) {
  let count = 0;
  for (const name of before) if (!after.has(name)) count++;
  return count;
}

export function newIds(
  before: ReadonlySet<string>,
  after: Iterable<string>,
): string[] {
  const result: string[] = [];
  for (const id of after) if (!before.has(id)) result.push(id);
  return result;
}
