// Copyright 2026 Adobe. All rights reserved.
import type { Getter, Setter } from "jotai";
import { tokenOverridesAtom, type TokenOverrideMap } from "../tokens/overrides";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { aliasesAtom } from "../tokens/aliasState";
import type { AliasDocument } from "../tokens/aliases";

export interface RemovedColorTokenRecords {
  overrides: TokenOverrideMap;
  browserEdits: BrowserTokenEdits;
  aliases: AliasDocument["tokens"];
}

export function removeColorTokenRecords(
  get: Getter,
  set: Setter,
  ids: ReadonlySet<string>,
): RemovedColorTokenRecords {
  const overrides = get(tokenOverridesAtom),
    edits = get(browserTokenEditsAtom),
    aliases = get(aliasesAtom);
  const removed = {
    overrides: Object.fromEntries(
      Object.entries(overrides).filter(([id]) => ids.has(id)),
    ),
    browserEdits: Object.fromEntries(
      Object.entries(edits).filter(([id]) => ids.has(id)),
    ),
    aliases: aliases.tokens.filter((alias) => ids.has(alias.$ref)),
  };
  set(
    tokenOverridesAtom,
    Object.fromEntries(
      Object.entries(overrides).filter(([id]) => !ids.has(id)),
    ),
  );
  set(
    browserTokenEditsAtom,
    Object.fromEntries(Object.entries(edits).filter(([id]) => !ids.has(id))),
  );
  set(aliasesAtom, {
    ...aliases,
    tokens: aliases.tokens.filter((alias) => !ids.has(alias.$ref)),
  });
  return removed;
}

export function restoreColorTokenRecords(
  get: Getter,
  set: Setter,
  removed: RemovedColorTokenRecords,
) {
  set(tokenOverridesAtom, { ...removed.overrides, ...get(tokenOverridesAtom) });
  set(browserTokenEditsAtom, {
    ...removed.browserEdits,
    ...get(browserTokenEditsAtom),
  });
  set(aliasesAtom, (current) => ({
    ...current,
    tokens: [
      ...current.tokens,
      ...removed.aliases.filter(
        (alias) => !current.tokens.some((item) => item.id === alias.id),
      ),
    ],
  }));
}
