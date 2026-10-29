// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { EditSessionSnapshot } from "../edit-session/state";
import { projectAuthoringDataset } from "./projection";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "./validation";
import type { AnalysisInput } from "./comparison";

export function projectSnapshot(
  snapshot: EditSessionSnapshot,
  kind: "saved" | "working",
): AnalysisInput {
  try {
    const defaults = designSystemDefaults;
    const dataset = composeDesignSystemDefaults(
      canonicalDesignSystemDataset({
        ...defaults,
        system: {
          components: snapshot.components,
          aliases: snapshot.aliases,
          browserTokenEdits: snapshot.browserTokenEdits,
          taxonomy: snapshot.taxonomy ?? defaults.system.taxonomy,
          structures: snapshot.structures ?? defaults.system.structures,
          foundations: {
            ...(snapshot.opacity && { opacity: snapshot.opacity }),
            color: snapshot.colorSystem,
            typography: snapshot.typography,
            spacing: snapshot.spacing ?? defaults.system.foundations.spacing,
            size: snapshot.size ?? defaults.system.foundations.size,
            radius: snapshot.radius ?? defaults.system.foundations.radius,
            elevation:
              snapshot.elevation ?? defaults.system.foundations.elevation,
          },
          modeSets: snapshot.modeSets,
          platforms: snapshot.platforms,
          adaptiveClaims: snapshot.adaptiveClaims,
          tokenOverrides: snapshot.tokenOverrides,
          rules: snapshot.rules ?? defaults.system.rules,
          interpolations:
            snapshot.interpolations ?? defaults.system.interpolations,
          scaleTypes: snapshot.scaleTypes ?? defaults.system.scaleTypes,
        },
      }),
      defaults.system.scaleTypes,
    );
    return projectAuthoringDataset(
      dataset,
      {
        kind,
        root: "authoring selectors",
        hash: "pending-adapter-sha256",
        revision: "authoring snapshot",
        dirty: kind === "working",
        version: "1",
        validator: "app authoring schema + reference checks",
      },
      snapshot.browserTokenEdits,
    );
  } catch (error) {
    return {
      source: {
        kind,
        root: "authoring selectors",
        hash: "pending-adapter-sha256",
        revision: "invalid authoring snapshot",
        dirty: kind === "working",
        version: "1",
        validator: "app authoring schema + reference checks",
      },
      records: [],
      categories: [],
      schemas: ["app-authoring-dataset-v1"],
      errors: [error instanceof Error ? error.message : String(error)],
      limitations: [
        "Invalid authoring state is not replaced with shipped values. Generated values cannot be assessed until references are repaired.",
      ],
    };
  }
}
