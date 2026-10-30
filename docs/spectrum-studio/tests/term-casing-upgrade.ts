// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { upgradeTermCasingSnapshot } from "../src/features/edit-session/termCasingUpgrade";
import {
  canonicalAliasSourceTargets,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { compareAuthoring } from "../src/features/changelog/registry";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  resolveColorSourceNames,
  resolveDimensionSourceNames,
} from "../src/features/taxonomy/naming";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { updateColorSystemSettingsAtom } from "../src/features/color-system/state";
import {
  foundationModeAttachmentsAtom,
  savedFoundationModeAttachmentsAtom,
} from "../src/state/view/foundationModeAttachments";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../src/features/edit-session/storage";

const legacy = createDefaultSnapshot();
const terms = legacy.taxonomy!.terms;
terms.find((term) => term.value === "gray")!.value = "Gray";
terms.find((term) => term.value === "indesign magenta")!.value =
  "InDesign Magenta";
terms.find((term) => term.value === "global")!.value = "My-MiXeD Foundation";
legacy.colorSystem = resolveColorSourceNames(
  legacy.colorSystem,
  legacy.taxonomy!,
);
legacy.spacing = resolveDimensionSourceNames(
  legacy.spacing!,
  legacy.taxonomy!,
  "spacing",
);
legacy.size = resolveDimensionSourceNames(
  legacy.size!,
  legacy.taxonomy!,
  "size",
);
legacy.radius = resolveDimensionSourceNames(
  legacy.radius!,
  legacy.taxonomy!,
  "radius",
);
legacy.colorSystem.settings.colorOutput.outputFormat = "hex";
legacy.colorSystem.scales = legacy.colorSystem.scales.filter(
  (scale) => scale.name !== "wireframe",
);
legacy.colorSystem.dataVisScales = [];
const original = structuredClone(legacy);
const upgraded = upgradeTermCasingSnapshot(legacy);
assert.deepEqual(legacy, original, "Migration never mutates its saved input.");
assert.equal(upgradeTermCasingSnapshot(upgraded), upgraded);
assert(
  upgraded.taxonomy!.terms.every(
    (term) =>
      typeof term.value !== "string" || term.value === term.value.toLowerCase(),
  ),
);
assert.equal(upgraded.spacing!.scales[0].name, "my-mixed foundation");
assert.equal(upgraded.colorSystem.settings.colorOutput.outputFormat, "hex");
assert(
  !upgraded.colorSystem.scales.some((scale) => scale.name === "wireframe"),
);
for (const key of [
  "modeSets",
  "tokenOverrides",
  "browserTokenEdits",
  "rules",
  "structures",
  "components",
] as const)
  assert.deepEqual(upgraded[key], legacy[key], `${key} remains intact.`);
assert.deepEqual(
  upgraded.taxonomy!.classifications,
  legacy.taxonomy!.classifications,
);
assert.deepEqual(
  upgraded.taxonomy!.terms.map(({ id, categoryId }) => [id, categoryId]),
  legacy.taxonomy!.terms.map(({ id, categoryId }) => [id, categoryId]),
);
const targets = (snapshot: typeof legacy) =>
  canonicalAliasSourceTargets(
    completeAliasSource(snapshot),
    buildTshirtArtifacts(snapshot),
  );
const oldTargets = targets(legacy);
const newTargets = targets(upgraded);
assert.deepEqual(
  newTargets.map(({ id, context }) => [id, context]),
  oldTargets.map(({ id, context }) => [id, context]),
  "Lowercasing changes names, never concept or mode-row identity.",
);
const renamed = oldTargets.filter(
  (target, index) => target.name !== newTargets[index].name,
);
assert(renamed.some((target) => target.name.includes("in-design-magenta")));
for (const previous of renamed)
  assert(
    upgraded.aliases!.tokens.some(
      (alias) =>
        alias.name === previous.name &&
        alias.$ref === previous.id &&
        alias.contexts.includes(previous.context),
    ),
    `Old generated name ${previous.name} remains an alias in ${previous.context}.`,
  );
const withAliases = structuredClone(legacy);
withAliases.aliases = structuredClone(upgraded.aliases);
const aliasInput = structuredClone(withAliases);
assert.deepEqual(upgradeTermCasingSnapshot(withAliases), upgraded);
assert.deepEqual(
  withAliases,
  aliasInput,
  "Existing aliases and contexts are not mutated or duplicated.",
);

const data = new Map<string, string>();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { persistenceIssuesAtom, flushPersistedState } =
  await import("../src/state/persist");
const attachmentId = legacy.modeSets[0].id;
const attachments = { [attachmentId]: ["color" as const] };
for (const independentEdit of [false, true]) {
  const working = structuredClone(legacy);
  if (independentEdit) {
    working.colorSystem.settings.extOffset = 0.37;
    working.taxonomy!.terms.find((term) => term.value === "Gray")!.value =
      "MiXeD-Custom";
    working.colorSystem = resolveColorSourceNames(
      working.colorSystem,
      working.taxonomy!,
    );
  }
  data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: 16,
      saved: legacy,
      working,
      isEditing: true,
      attachments,
      savedAttachments: attachments,
    }),
  );
  const store = createStore();
  let dispose = initializeAuthoringPersistence(store);
  assert.deepEqual(store.get(persistenceIssuesAtom), []);
  assert.deepEqual(
    store.get(authoringSnapshotAtom),
    upgradeTermCasingSnapshot(working),
  );
  assert.deepEqual(store.get(editSessionSnapshotAtom), upgraded);
  assert.deepEqual(store.get(foundationModeAttachmentsAtom), attachments);
  assert.deepEqual(store.get(savedFoundationModeAttachmentsAtom), attachments);
  assert.equal(
    JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
    AUTHORING_RECORD_VERSION,
  );
  assert.equal(
    compareAuthoring(
      store.get(editSessionSnapshotAtom)!,
      store.get(authoringSnapshotAtom),
    ).slots.some((slot) => slot.changed),
    independentEdit,
    "Identical saved/working upgrades create no phantom Changes; real edits stay visible.",
  );
  store.set(cancelEditAtom);
  assert.deepEqual(
    store.get(authoringSnapshotAtom),
    upgraded,
    "Cancel restores the normalized saved baseline.",
  );
  store.set(enterEditModeAtom);
  const source = store.get(authoringSnapshotAtom).colorSystem.scales[0];
  store.set(editFoundationNameAtom, {
    id: `color-scale:${source.id}`,
    value: "SAVED-CUSTOM",
  });
  store.set(saveEditAtom);
  const saved = structuredClone(store.get(authoringSnapshotAtom));
  store.set(updateColorSystemSettingsAtom, { extOffset: 0.41 });
  flushPersistedState();
  dispose();
  const restored = createStore();
  dispose = initializeAuthoringPersistence(restored);
  assert.deepEqual(restored.get(persistenceIssuesAtom), []);
  assert.equal(
    restored.get(authoringSnapshotAtom).colorSystem.settings.extOffset,
    0.41,
  );
  assert.deepEqual(restored.get(editSessionSnapshotAtom), saved);
  restored.set(cancelEditAtom);
  assert.deepEqual(
    restored.get(authoringSnapshotAtom),
    saved,
    "Save, reload and Cancel retain IDs, choices and aliases.",
  );
  dispose();
}
console.log(
  "Saved/working lowercase migration, compatibility aliases, IDs, attachments and lifecycle passed.",
);
