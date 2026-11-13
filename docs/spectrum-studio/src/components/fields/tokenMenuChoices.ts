// Copyright 2026 Adobe. All rights reserved.
import type { TokenComboBoxOption } from "./TokenComboBox";

/** Shorter menus measure every row; longer menus measure their widest rows. */
export const MENU_MEASUREMENT_ROWS = 24;

export interface TokenMenuChoices {
  choices: readonly TokenComboBoxOption[];
  disabled: readonly string[];
  presets: readonly TokenComboBoxOption[];
  tokens: readonly TokenComboBoxOption[];
}

export const tokenOptionDescription = (option: TokenComboBoxOption) =>
  option.error ??
  `${option.displayValue}${option.hidden ? " - Not published" : ""}`;

/**
 * Menu rows: the allowed options, plus the current selection, which stays
 * visible but disabled when it is no longer allowed. Options with errors are
 * disabled too.
 */
export function tokenMenuChoices(
  options: readonly TokenComboBoxOption[],
  selectedKey: string | null,
  isOptionAllowed?: (option: TokenComboBoxOption) => boolean,
): TokenMenuChoices {
  const offered = isOptionAllowed
    ? options.filter((option) => isOptionAllowed(option))
    : options;
  const offeredIds = new Set(offered.map((option) => option.id));
  const selected = options.find((option) => option.id === selectedKey);
  const choices =
    selected && !offeredIds.has(selected.id) ? [...offered, selected] : offered;
  return {
    choices,
    disabled: choices
      .filter((option) => option.error || !offeredIds.has(option.id))
      .map((option) => option.id),
    presets: choices.filter((option) => option.kind === "preset"),
    tokens: choices.filter((option) => option.kind === "token"),
  };
}

const NARROW = new Set("fijlrt.,:;'|!()[]- ");
const WIDE = new Set("mwMW@%");
// Approximate glyph widths (in ems) for the proportional UI font; used only to rank rows.
const estimatedWidth = (text: string) =>
  [...text].reduce(
    (width, character) =>
      width +
      (NARROW.has(character)
        ? 0.3
        : WIDE.has(character)
          ? 0.85
          : character >= "A" && character <= "Z"
            ? 0.65
            : 0.55),
    0,
  );

/**
 * A menu is as wide as its widest label or description, so the hidden width
 * probe only needs the widest candidates from each differently styled column.
 */
export function menuMeasurementChoices(
  choices: readonly TokenComboBoxOption[],
  limit = MENU_MEASUREMENT_ROWS,
): readonly TokenComboBoxOption[] {
  if (choices.length <= limit) return choices;
  const perColumn = Math.max(1, Math.floor(limit / 3));
  const widest = (
    rows: readonly TokenComboBoxOption[],
    text: (option: TokenComboBoxOption) => string,
  ) =>
    rows
      .map((option) => ({ option, width: estimatedWidth(text(option)) }))
      .sort((a, b) => b.width - a.width)
      .slice(0, perColumn)
      .map(({ option }) => option);
  const tokens = choices.filter((option) => option.kind === "token");
  const kept = new Set([
    ...widest(
      choices.filter((option) => option.kind === "preset"),
      (option) => option.name,
    ),
    ...widest(tokens, (option) => option.name),
    ...widest(tokens, tokenOptionDescription),
  ]);
  return choices.filter((option) => kept.has(option));
}
