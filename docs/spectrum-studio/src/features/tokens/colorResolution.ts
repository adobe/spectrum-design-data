// Copyright 2026 Adobe. All rights reserved.
import { tokenDisplayName, type ResolvedToken } from "./model";
import type { BrowserTokenEdits } from "./browserEditTypes";
import type { ColorSystemDocument } from "../color-system/model";
import { normalizeManualColorOutput } from "./colorOutput";
import { tokenEdit } from "./canonicalIdentity";

export function canonicalTokenModeKey(selection: Record<string, string>) {
  return JSON.stringify(
    Object.entries(selection).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

export function tokenModePairs(modeKey: string): [string, string][] {
  const selection: unknown = JSON.parse(modeKey);
  if (!Array.isArray(selection))
    throw new Error("This token has an invalid mode assignment.");
  const pairs: [string, string][] = [];
  for (const pair of selection) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== "string" ||
      typeof pair[1] !== "string"
    )
      throw new Error("This token has an invalid mode assignment.");
    pairs.push([pair[0], pair[1]]);
  }
  return pairs;
}

export function resolveBrowserColorToken(
  token: ResolvedToken,
  edits: BrowserTokenEdits,
  modeKey: string,
  document?: ColorSystemDocument,
): ResolvedToken {
  const edit = tokenEdit(edits, token.uuid);
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
