// Copyright 2026 Adobe. All rights reserved.
export function normalizeTermValue<T extends string | number>(
  value: T,
): T extends string ? string : number;
export function normalizeTermValue(value: string | number): string | number {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export function termLabel(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = String(value).trim().replace(/-/g, " ").toLowerCase();
  return text.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

export function isUnchangedTermInput(
  input: string,
  value: string | number,
): boolean {
  const normalized = normalizeTermValue(input);
  return (
    normalized === normalizeTermValue(value) ||
    normalized === normalizeTermValue(termLabel(value))
  );
}
