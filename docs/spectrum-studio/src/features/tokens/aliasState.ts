// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { EMPTY_ALIASES, isAliasDocument, removeAlias } from "./aliases";
import type { AliasDocument } from "./aliases";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";

export const aliasesAtom = persistedAtom<AliasDocument>({
  key: "tokens/aliases",
  schemaVersion: 1,
  initialize: () => structuredClone(EMPTY_ALIASES),
  validate: isAliasDocument,
});

export const deleteAliasAtom = atom(null, (get, set, id: string) => {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to delete an alias.");
  set(aliasesAtom, removeAlias(get(aliasesAtom), id));
});
