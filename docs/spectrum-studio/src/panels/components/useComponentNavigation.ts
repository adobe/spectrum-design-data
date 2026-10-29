// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import type { ComponentCatalogEntry } from "./ComponentsPanel";

type NavigationAction =
  | { kind: "select"; id: string }
  | { kind: "create"; entry?: ComponentCatalogEntry };
export type ComponentCreation = {
  name: string;
  category: string;
  catalogId?: string;
};

export function useComponentNavigation(
  editable: boolean,
  onSelect: (id: string | null) => void,
) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<ComponentCreation>();
  const [definitionDirty, setDefinitionDirty] = useState(false);
  const [pending, setPending] = useState<NavigationAction>();
  const [draftVersion, setDraftVersion] = useState(0);
  function execute(action: NavigationAction) {
    if (action.kind === "select") onSelect(action.id);
    else
      setCreating({
        name: action.entry?.name ?? "",
        category: action.entry?.group ?? "controls",
        catalogId: action.entry?.id,
      });
  }
  function request(action: NavigationAction) {
    if (editable && definitionDirty) setPending(action);
    else execute(action);
  }
  return {
    search,
    setSearch,
    creating,
    setCreating,
    pending,
    setPending,
    draftVersion,
    setDefinitionDirty,
    select: (id: string) => request({ kind: "select", id }),
    create: (entry?: ComponentCatalogEntry) =>
      request({ kind: "create", entry }),
    discard: () => {
      if (!pending) return;
      setDefinitionDirty(false);
      setDraftVersion((version) => version + 1);
      execute(pending);
      setPending(undefined);
    },
  };
}
