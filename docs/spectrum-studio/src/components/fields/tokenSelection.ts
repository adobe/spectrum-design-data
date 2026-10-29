// Copyright 2026 Adobe. All rights reserved.
interface SelectedField {
  selectedKey: string | null;
}

export function combinedTokenSelection(
  fields: readonly [SelectedField, SelectedField, SelectedField, SelectedField],
) {
  const isMixed = fields.some(
    (field) => field.selectedKey !== fields[0].selectedKey,
  );
  return { isMixed, selectedKey: isMixed ? null : fields[0].selectedKey };
}
