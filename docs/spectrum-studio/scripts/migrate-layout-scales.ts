// Copyright 2026 Adobe. All rights reserved.
import { readFileSync, writeFileSync } from "node:fs";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { captureSnapshot } from "../src/features/edit-session/state";
import { upgradeLayoutScalesSnapshot } from "../src/features/edit-session/layoutScalesUpgrade";
import { canonicalDesignSystemDataset } from "../src/features/design-data/validation";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";

const source = upgradeCanonicalTokenIdentities(
  upgradeLayoutScalesSnapshot(captureSnapshot(createStore().get)),
);
const dataset = canonicalDesignSystemDataset({
  ...designSystemDefaults,
  system: {
    ...designSystemDefaults.system,
    rules: source.rules!,
    scaleTypes: source.scaleTypes!,
    taxonomy: source.taxonomy!,
    structures: source.structures!,
    browserTokenEdits: source.browserTokenEdits,
    components: source.components,
    aliases: source.aliases,
    foundations: {
      ...designSystemDefaults.system.foundations,
      spacing: {
        ...source.spacing!,
        scales: source.spacing!.scales.toSorted(
          (left, right) =>
            Number(!!left.componentSizeScaling) -
            Number(!!right.componentSizeScaling),
        ),
      },
      size: source.size!,
      radius: source.radius!,
    },
  },
});
const path = new URL(
  "../src/data/design-system.defaults.json",
  import.meta.url,
);
const output = `${JSON.stringify(dataset, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error(
      "Legacy layout scales remain in the defaults. Run scripts/migrate-layout-scales.ts.",
    );
  console.log(
    "Default layout scales are explicit and migration is idempotent.",
  );
} else {
  writeFileSync(path, output);
  console.log("Converted default layout progressions to Foundation scales.");
}
