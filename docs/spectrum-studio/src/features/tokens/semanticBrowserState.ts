// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import {
  liveTshirtRow,
  selectedTshirtRows,
} from "../design-data/tshirtArtifacts";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { projectClassification } from "../taxonomy/model";
import { primitiveReferencesAtom } from "./primitiveReferenceState";
import { browserModeContextAtom } from "./browserState";
import type { BrowserToken } from "./browserModel";

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
              const projection = projectClassification(
                registry,
                row.classification,
                "structures",
              );
              if (projection.issues.length)
                throw new Error(projection.issues.join(" "));
              const name = projection.name;
              return {
                id: row.conceptId,
                type:
                  row.target.family === "color" ? "colors" : row.target.family,
                groupId: owner,
                groupLabel: row.structureName,
                name,
                generatedName: name,
                value: row.target.value,
                generatedValue: row.target.value,
                unit:
                  row.target.family === "elevation" ||
                  row.target.family === "color"
                    ? ""
                    : "px",
                shadows: row.target.shadows,
                semantic: row,
                projection,
                taxonomySource: {
                  id: row.conceptId,
                  governed: row.classification,
                },
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
