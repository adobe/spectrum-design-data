// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import {
  liveTshirtRow,
  selectedTshirtRows,
} from "../design-data/tshirtArtifacts";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { primitiveReferencesAtom } from "./primitiveReferenceState";
import { browserModeContextAtom } from "./browserState";
import type { BrowserToken } from "./browserModel";
import { semanticTokenSource } from "./semanticSource";

export const semanticBrowserStateAtom = atom(
  (
    get,
  ):
    | { status: "ready"; tokens: BrowserToken[] }
    | { status: "error"; error: string; tokens: BrowserToken[] } => {
    const state = get(workingTshirtArtifactsAtom);
    if (state.status === "error") return { ...state, tokens: [] };
    try {
      const registry = get(taxonomyDocumentAtom);
      const references = get(primitiveReferencesAtom);
      const selection = Object.fromEntries(
        JSON.parse(get(browserModeContextAtom).key) as [string, string][],
      );
      const owners = new Set(
        state.bundle.semantics.map((row) => row.structureId),
      );
      const tokens: BrowserToken[] = [...owners].flatMap((owner) =>
        (["xs", "s", "m", "l", "xl"] as const).flatMap((size) =>
          selectedTshirtRows(state.bundle, owner, size, selection).map(
            (canonical) => {
              const row = liveTshirtRow(canonical, references);
              const source = semanticTokenSource(row, registry);
              const projection = source.projection!;
              if (projection.issues.length)
                throw new Error(projection.issues.join(" "));
              return {
                ...source,
                description: row.mapping.warning ?? "",
                status: "draft",
                nameOverridden: false,
                valueOverridden: false,
                stale: false,
              };
            },
          ),
        ),
      );
      return { status: "ready", tokens };
    } catch (failure) {
      return {
        status: "error",
        error: failure instanceof Error ? failure.message : String(failure),
        tokens: [],
      };
    }
  },
);
