// Copyright 2026 Adobe. All rights reserved.
import { tokenDisplayName, type ResolvedToken } from "./model";
import type { BrowserTokenEdits } from "./browserEditTypes";
import type { ColorSystemDocument } from "../color-system/model";
import { normalizeManualColorOutput } from "./colorOutput";

export function canonicalTokenModeKey(selection: Record<string, string>) {
  return JSON.stringify(
    Object.entries(selection).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

export function resolveBrowserColorToken(
  token: ResolvedToken,
  edits: BrowserTokenEdits,
  modeKey: string,
  document?: ColorSystemDocument,
): ResolvedToken {
  const edit = edits[token.uuid];
  if (!edit)
    return document ? normalizeManualColorOutput(token, document) : token;
  const name = edit.name,
    value = edit.values[modeKey];
  const resolved = {
    ...token,
    name:
      name === undefined ? token.name : { colorName: name, contrastValue: "" },
    value: value ? String(value.value) : token.value,
    nameOverridden: token.nameOverridden || name !== undefined,
    valueOverridden: token.valueOverridden || value !== undefined,
    stale:
      token.stale ||
      !!(value && value.baseline !== token.generated.value) ||
      !!(
        edit.nameBaseline &&
        edit.nameBaseline !== tokenDisplayName(token.generated.name)
      ),
  };
  return document ? normalizeManualColorOutput(resolved, document) : resolved;
}
