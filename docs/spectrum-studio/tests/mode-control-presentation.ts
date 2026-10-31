// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  modeSetGroupIconId,
  modeSetUsesOptionIcons,
} from "../src/features/modes/controlPresentation";
import { MODE_SET_DEFAULTS } from "../src/features/modes/model";
import { conditionSources } from "../src/features/logic/conditional";
import { designSystemDefaults } from "../src/data/defaults";

const source = MODE_SET_DEFAULTS[0];
const uniqueIcons = {
  ...source,
  iconId: "none" as const,
  modes: source.modes.slice(0, 2).map((mode, index) => ({
    ...mode,
    iconId: index === 0 ? ("light" as const) : ("dark" as const),
  })),
};
assert.equal(modeSetUsesOptionIcons(uniqueIcons), true);
assert.equal(
  modeSetUsesOptionIcons({
    ...uniqueIcons,
    modes: uniqueIcons.modes.map((mode) => ({ ...mode, iconId: "contrast" })),
  }),
  false,
  "Repeated icons use text so modes remain distinguishable.",
);
assert.equal(
  modeSetUsesOptionIcons({
    ...uniqueIcons,
    modes: uniqueIcons.modes.map((mode, index) =>
      index === 0 ? { ...mode, iconId: "none" } : mode,
    ),
  }),
  false,
  "Partially configured icons use text for the entire set.",
);
assert.equal(
  modeSetUsesOptionIcons({ ...uniqueIcons, iconId: "contrast" }),
  false,
  "A set-level icon accompanies text labels rather than option icons.",
);
assert.equal(
  modeSetGroupIconId({ ...uniqueIcons, iconId: "contrast" }),
  "contrast",
  "An explicit group icon takes precedence over mode icons.",
);
assert.equal(
  modeSetGroupIconId(uniqueIcons),
  "light",
  "Unique mode icons use the default mode, not the current selection.",
);
assert.equal(
  modeSetGroupIconId({
    ...uniqueIcons,
    defaultModeId: uniqueIcons.modes[1].id,
  }),
  "dark",
);
assert.equal(
  modeSetGroupIconId({
    ...uniqueIcons,
    modes: uniqueIcons.modes.map((mode) => ({ ...mode, iconId: "contrast" })),
  }),
  "none",
  "Repeated icons do not represent the group.",
);
assert.equal(
  modeSetGroupIconId({
    ...uniqueIcons,
    modes: uniqueIcons.modes.map((mode, index) =>
      index === 0 ? { ...mode, iconId: "none" } : mode,
    ),
  }),
  "none",
  "Incomplete icons use the generic category icon.",
);
assert.equal(modeSetGroupIconId({ ...uniqueIcons, modes: [] }), "none");
assert.equal(
  modeSetGroupIconId({ ...uniqueIcons, defaultModeId: "missing" }),
  "none",
);

const sources = conditionSources(designSystemDefaults.system.taxonomy, [
  { ...uniqueIcons, id: "unique-icons" },
  { ...uniqueIcons, id: "group-icon", iconId: "textSize" },
  {
    ...uniqueIcons,
    id: "no-icons",
    modes: uniqueIcons.modes.map((mode) => ({ ...mode, iconId: "none" })),
  },
]);
assert.equal(
  sources.find((source) => source.id === "unique-icons")?.modeIconId,
  "light",
);
assert.equal(
  sources.find((source) => source.id === "group-icon")?.modeIconId,
  "textSize",
);
assert.equal(
  sources.find((source) => source.id === "no-icons")?.modeIconId,
  "none",
);
assert.ok(
  sources
    .filter((source) => source.kind === "taxonomy")
    .every((source) => source.modeIconId === undefined),
);
console.log(
  "Shared mode-control and condition-source icon presentation checks passed.",
);
