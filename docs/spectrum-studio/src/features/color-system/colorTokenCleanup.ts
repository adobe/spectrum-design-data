// Copyright 2026 Adobe. All rights reserved.
import type { Getter, Setter } from "jotai";
import { tokenOverridesAtom, type TokenOverrideMap } from "../tokens/overrides";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { aliasesAtom } from "../tokens/aliasState";
import type { AliasDocument } from "../tokens/aliases";
import { resetTokenEdit, tokenIdentity } from "../tokens/canonicalIdentity";

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
  const removedIds = new Set(ids);
  for (const id of ids) {
    const identity = tokenIdentity(edits, id);
    if (identity) {
      removedIds.add(identity.sourceId);
      removedIds.add(identity.conceptId);
    }
  }
  const removed = {
    overrides: Object.fromEntries(
      Object.entries(overrides).filter(([id]) => removedIds.has(id)),
    ),
    browserEdits: Object.fromEntries(
      Object.entries(edits).filter(([id]) => removedIds.has(id)),
    ),
    aliases: aliases.tokens.filter((alias) => removedIds.has(alias.$ref)),
  };
  const remainingEdits = { ...edits };
  for (const [id, edit] of Object.entries(removed.browserEdits)) {
    const retained = resetTokenEdit(edit);
    if (retained) remainingEdits[id] = retained;
    else delete remainingEdits[id];
  }
  set(
    tokenOverridesAtom,
    Object.fromEntries(
      Object.entries(overrides).filter(([id]) => !removedIds.has(id)),
    ),
  );
  set(browserTokenEditsAtom, remainingEdits);
  set(aliasesAtom, {
    ...aliases,
    tokens: aliases.tokens.filter((alias) => !removedIds.has(alias.$ref)),
  });
  return removed;
}

export function restoreColorTokenRecords(
  get: Getter,
  set: Setter,
  removed: RemovedColorTokenRecords,
) {
  set(tokenOverridesAtom, { ...removed.overrides, ...get(tokenOverridesAtom) });
  const currentEdits = get(browserTokenEditsAtom);
  const browserEdits = {
    ...removed.browserEdits,
    ...currentEdits,
  };
  for (const [id, edit] of Object.entries(removed.browserEdits)) {
    const current = currentEdits[id];
    const identity = current?.authoring?.identity;
    if (
      identity &&
      JSON.stringify(current) === JSON.stringify(resetTokenEdit(current))
    )
      browserEdits[id] = {
        ...edit,
        authoring: { assignments: {}, ...edit.authoring, identity },
      };
  }
  set(browserTokenEditsAtom, browserEdits);
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
