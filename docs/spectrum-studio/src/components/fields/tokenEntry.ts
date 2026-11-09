// Copyright 2026 Adobe. All rights reserved.
import type { TokenComboBoxOption } from "./TokenComboBox";

export type ValueNormalizer = (text: string) => string | undefined;

export function exactTokenEntryMatch(
  options: readonly TokenComboBoxOption[],
  text: string,
  isOptionAllowed?: (option: TokenComboBoxOption) => boolean,
  normalizeValue?: ValueNormalizer,
) {
  const query = text.trim();
  if (!query) return undefined;
  const eligible = options.filter(
    (option) => !option.error && (!isOptionAllowed || isOptionAllowed(option)),
  );
  const names = eligible.filter(
    (option) => option.name.toLowerCase() === query.toLowerCase(),
  );
  if (names.length) return names.length === 1 ? names[0] : undefined;
  const normalized = normalizeValue ? normalizeValue(query) : query;
  if (normalized === undefined) return undefined;
  const values = eligible.filter(
    (option) =>
      (normalizeValue
        ? normalizeValue(option.matchValue ?? option.displayValue)
        : (option.matchValue ?? option.displayValue).trim()) === normalized,
  );
  return values.length === 1 ? values[0] : undefined;
}

export function numericEntryValue(text: string, unit = "") {
  const value = text.trim();
  const number =
    unit && value.endsWith(unit) ? value.slice(0, -unit.length).trim() : value;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(number))
    return undefined;
  const parsed = Number(number);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeNumericEntry(text: string, unit = "") {
  const value = numericEntryValue(text, unit);
  return value === undefined ? undefined : String(value);
}
