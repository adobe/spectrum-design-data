// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { readPath } from "../src/features/changelog/contract";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import {
  completeAliasSource,
  canonicalAliasRows,
} from "../src/features/tokens/aliasTargets";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { resolveColorScaleDocument } from "../src/features/color-system/colorScaleResolution";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { modeSetDefaultMode } from "../src/features/modes/model";
import { editModeAtom } from "../src/state/view/editMode";
import {
  colorSystemDocumentAtom,
  updateColorSystemSettingsAtom,
  resolvedColorSystemDocumentAtom,
  collapsedContrastIdsAtom,
} from "../src/features/color-system/state";
import {
  opacityDocumentAtom,
  removeOpacityLevelAtom,
} from "../src/features/opacity/state";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import { persistenceIssuesAtom } from "../src/state/persist";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import { resolveBrowserTokens } from "../src/features/tokens/browserModel";
import {
  normalizeBrowserColorOutputs,
  opacityLinkedScaleIds,
} from "../src/features/tokens/colorOutput";
import { componentTokenCatalog } from "../src/features/components/references";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { createDataVisRuntime } from "../src/features/color-system/data-vis/adapter";
import { componentsDocumentAtom } from "../src/features/components/documentState";

const original = createDefaultSnapshot();
original.colorSystem.dataVisScales = [];
const working = structuredClone(original);
working.colorSystem.settings.colorScaleType = "transparent";
working.colorSystem.settings.syncDefaultStopsWithOpacity = true;
working.platforms[0].name = "Unrelated edit";
assertStoredSnapshot(working);
const authored = compareAuthoring(original, working);
const colorFields = authored.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .filter(
    (field) =>
      field.address?.path[0] === "colorSystem" &&
      ["colorScaleType", "syncDefaultStopsWithOpacity"].includes(
        String(field.address.path.at(-1)),
      ),
  );
assert.equal(colorFields.length, 2);
for (const field of colorFields) {
  const reset = prepareChangeReset(
    { ...working, attachments: {} },
    sourceResetPlan("Color setting", [field.address!]),
  );
  assert.equal(
    readPath(reset, field.address!.path),
    readPath(original, field.address!.path),
  );
  assert.equal(reset.platforms[0].name, "Unrelated edit");
}
const modes = working.modeSets
  .map(modeSetDefaultMode)
  .filter((mode) => mode !== undefined);
const sources = browserSourcesForSnapshot(working, modes);
const scale = working.colorSystem.scales.find((item) => !item.customContrasts)!;
assert.ok(scale);
const colorSources = sources.filter(
  (item) => item.type === "colors" && item.groupId === scale.id,
);
assert.equal(colorSources.length, working.opacity!.levels.length);
const aliases = canonicalAliasRows(completeAliasSource(working));
assert.ok(aliases.some((row) => row.token.id === colorSources[0].id));
const packet = buildCascadeTokenExport({
  base: working.colorSystem,
  opacity: working.opacity,
  modeSets: working.modeSets,
  activeModes: modes,
  activeTokens: [],
  overrides: {},
  browserEdits: working.browserTokenEdits,
  taxonomy: working.taxonomy,
  rules: working.rules,
});
assert.ok(packet.tokens.some((token) => token.value === colorSources[0].value));
const component = working.components!.components.find(
  (item) => item.assignments.length,
)!;
assert.ok(component);
const propertyCategory = working.taxonomy!.categories.find(
  (category) => category.key === "property",
)!;
const colorProperty = working.taxonomy!.terms.find(
  (term) => term.categoryId === propertyCategory.id && term.value === "color",
)!;
const property = { categoryId: propertyCategory.id, termId: colorProperty.id };
const reference = componentTokenCatalog(working).find(
  (token) => token.browserId === colorSources[7].id,
)!.id;
working.components = {
  schemaVersion: 2,
  components: [
    {
      ...component,
      assignments: [
        { id: crypto.randomUUID(), property, $ref: reference },
        { id: crypto.randomUUID(), property, $ref: reference },
        { id: crypto.randomUUID(), property, value: "#000000" },
      ],
    },
  ],
};
const next = structuredClone(working);
next.opacity!.levels[7].value = 0.37;
const changed = browserSourcesForSnapshot(next, modes).filter(
  (item) => item.type === "colors" && item.groupId === scale.id,
);
assert.deepEqual(
  changed.map((item) => item.id),
  colorSources.map((item) => item.id),
);
assert.notEqual(changed[7].value, colorSources[7].value);
assert.equal(changed[0].value, colorSources[0].value);
const tokenImpact = comparePrimitiveTokens(
  working,
  next,
  compareAuthoring(working, next),
);
assert.ok(
  tokenImpact.records.some(
    (record) =>
      record.category === "color" &&
      record.modeValues.some((value) => value.changed),
  ),
);
const impacted = componentImpactForSnapshots(working, next);
assert.equal(
  impacted.status,
  "ready",
  impacted.status === "unavailable" ? impacted.error : undefined,
);
if (impacted.status === "ready")
  assert.deepEqual(
    [impacted.summary.affected.count, impacted.summary.affected.total],
    [2, 3],
  );
const manualColors = resolveBrowserTokens(sources, {}, "")
  .filter((token) => token.type === "colors")
  .map((token) => ({
    ...token,
    value: "rgba(1, 2, 3, 0.37)",
    valueOverridden: true,
  }));
const aliasTarget = manualColors.find((token) => token.groupId === scale.id)!;
const normalized = normalizeBrowserColorOutputs(
  [
    ...manualColors,
    {
      ...aliasTarget,
      id: "linked-alias",
      groupId: "aliases",
      referenceId: aliasTarget.id,
    },
  ],
  { ...working.colorSystem.settings.colorOutput, outputFormat: "hex" },
  new Map(),
  opacityLinkedScaleIds(working.colorSystem),
);
assert.match(
  String(normalized.find((token) => token.paletteColorId)!.value),
  /^#/,
);
assert.match(
  String(normalized.find((token) => token.groupId === scale.id)!.value),
  /^rgba?\(/,
);
assert.match(
  String(normalized.find((token) => token.id === "linked-alias")!.value),
  /^rgba?\(/,
);
assert.match(
  String(
    normalized.find(
      (token) =>
        token.groupId ===
        working.colorSystem.scales.find((item) => item.customContrasts)!.id,
    )!.value,
  ),
  /^#/,
);
const custom = working.colorSystem.scales.find((item) => item.customContrasts)!;
assert.deepEqual(
  browserSourcesForSnapshot(next, modes).filter(
    (item) => item.type === "colors" && item.groupId === custom.id,
  ),
  sources.filter(
    (item) => item.type === "colors" && item.groupId === custom.id,
  ),
);
next.opacity!.levels.reverse();
const reordered = browserSourcesForSnapshot(next, modes).filter(
  (item) => item.type === "colors" && item.groupId === scale.id,
);
assert.deepEqual(
  new Set(reordered.map((item) => item.id)),
  new Set(colorSources.map((item) => item.id)),
);
const resolved = resolveColorScaleDocument(
  working.colorSystem,
  modes,
  undefined,
  {
    modeSets: working.modeSets,
    opacity: working.opacity,
    browserTokenEdits: working.browserTokenEdits,
  },
);
const css = buildColorLibrary(
  resolved,
  [],
  [],
  working.taxonomy,
  working.rules,
  [],
  working,
);
assert.match(css, /--_stop-opacity: var\(--opacity-100\)/);
assert.match(css, /--opacity-100:/);
assert.doesNotMatch(css, /--contrast-100:/);
const store = createStore();
assert.throws(
  () => store.set(updateColorSystemSettingsAtom, { colorScaleType: "opaque" }),
  /Choose Edit/,
);
store.set(editModeAtom, true);
store.set(colorSystemDocumentAtom, {
  ...store.get(colorSystemDocumentAtom),
  dataVisScales: [],
});
store.set(updateColorSystemSettingsAtom, {
  colorScaleType: "transparent",
  syncDefaultStopsWithOpacity: true,
});
assert.equal(
  store.get(resolvedColorSystemDocumentAtom).contrasts.length,
  store.get(opacityDocumentAtom).levels.length,
);
assert.equal(store.get(collapsedContrastIdsAtom).size, 0);
const contrasts = store.get(colorSystemDocumentAtom).contrasts;
store.set(updateColorSystemSettingsAtom, { colorScaleType: "opaque" });
assert.deepEqual(store.get(colorSystemDocumentAtom).contrasts, contrasts);
assert.equal(
  store.get(colorSystemDocumentAtom).settings.syncDefaultStopsWithOpacity,
  true,
);
const componentStore = createStore();
componentStore.set(editModeAtom, true);
componentStore.set(colorSystemDocumentAtom, {
  ...componentStore.get(colorSystemDocumentAtom),
  dataVisScales: [],
});
componentStore.set(updateColorSystemSettingsAtom, {
  colorScaleType: "transparent",
  syncDefaultStopsWithOpacity: true,
});
componentStore.set(componentsDocumentAtom, working.components!);
assert.throws(
  () =>
    componentStore.set(updateColorSystemSettingsAtom, {
      syncDefaultStopsWithOpacity: false,
    }),
  /no longer published or available/,
);
assert.equal(
  componentStore.get(colorSystemDocumentAtom).settings
    .syncDefaultStopsWithOpacity,
  true,
);
const references = createStore();
references.set(editModeAtom, true);
const referenceDocument = references.get(colorSystemDocumentAtom);
const referenceScale = referenceDocument.scales.find(
  (item) => !item.customContrasts,
)!;
const recipe = referenceDocument.dataVisScales.find(
  (item) => item.kind !== "categorical",
)!;
assert(recipe.kind !== "categorical");
references.set(colorSystemDocumentAtom, {
  ...referenceDocument,
  dataVisScales: [
    {
      ...recipe,
      points: recipe.points.map((point) => ({
        id: point.id,
        position: point.position,
        source: {
          kind: "ui-swatch",
          scaleId: referenceScale.id,
          contrastId: referenceDocument.contrasts[0].id,
        },
      })),
    },
  ],
});
assert.throws(
  () =>
    references.set(updateColorSystemSettingsAtom, {
      colorScaleType: "transparent",
      syncDefaultStopsWithOpacity: true,
    }),
  /Choose replacement colors first/,
);
assert.equal(
  references.get(colorSystemDocumentAtom).settings.colorScaleType,
  "dynamic-blend",
);
const linkedStore = createStore();
linkedStore.set(editModeAtom, true);
linkedStore.set(colorSystemDocumentAtom, {
  ...linkedStore.get(colorSystemDocumentAtom),
  dataVisScales: [],
});
linkedStore.set(updateColorSystemSettingsAtom, {
  colorScaleType: "transparent",
  syncDefaultStopsWithOpacity: true,
});
const linkedDocument = linkedStore.get(colorSystemDocumentAtom);
const linkedLevel = linkedStore.get(opacityDocumentAtom).levels[0];
linkedStore.set(colorSystemDocumentAtom, {
  ...linkedDocument,
  dataVisScales: [
    {
      ...recipe,
      points: recipe.points.map((point) => ({
        id: point.id,
        position: point.position,
        source: {
          kind: "ui-swatch",
          scaleId: referenceScale.id,
          contrastId: linkedLevel.id,
        },
      })),
    },
  ],
});
assert.throws(
  () => linkedStore.set(removeOpacityLevelAtom, linkedLevel.id),
  /Choose replacement colors first/,
);
assert.ok(
  linkedStore
    .get(opacityDocumentAtom)
    .levels.some((level) => level.id === linkedLevel.id),
);
const linkedPacketSource = {
  ...working,
  colorSystem: linkedStore.get(colorSystemDocumentAtom),
  opacity: linkedStore.get(opacityDocumentAtom),
};
const linkedPacket = buildDataVisSourcePacket(linkedPacketSource);
assert.deepEqual(linkedPacket.opacity, linkedPacketSource.opacity);
assert.equal(
  createDataVisRuntime(linkedPacket).continuous(recipe.id)(0),
  browserSourcesForSnapshot(linkedPacketSource, modes).find(
    (token) => token.groupId === referenceScale.id,
  )!.value,
);
const noOpacity = { ...linkedPacket, opacity: undefined };
assert.throws(
  () => createDataVisRuntime(noOpacity),
  /Opacity data is unavailable/,
);
const captured = store.get(authoringSourceSnapshotAtom);
assert.equal(captured.colorSystem.settings.colorScaleType, "opaque");
assertStoredSnapshot(captured);
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const storage = new Map<string, string>();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
try {
  const saving = createStore();
  const dispose = initializeAuthoringPersistence(saving, {
    validateScheduled: null,
  });
  saving.set(enterEditModeAtom);
  saving.set(colorSystemDocumentAtom, {
    ...saving.get(colorSystemDocumentAtom),
    dataVisScales: [],
  });
  saving.set(updateColorSystemSettingsAtom, {
    colorScaleType: "transparent",
    syncDefaultStopsWithOpacity: true,
  });
  saving.set(saveEditAtom);
  assert.deepEqual(saving.get(persistenceIssuesAtom), []);
  dispose();
  const reload = createStore();
  const stop = initializeAuthoringPersistence(reload, {
    validateScheduled: null,
  });
  assert.equal(
    reload.get(colorSystemDocumentAtom).settings.colorScaleType,
    "transparent",
  );
  assert.equal(
    reload.get(colorSystemDocumentAtom).settings.syncDefaultStopsWithOpacity,
    true,
  );
  reload.set(updateColorSystemSettingsAtom, { colorScaleType: "opaque" });
  reload.set(cancelEditAtom);
  assert.equal(
    reload.get(colorSystemDocumentAtom).settings.colorScaleType,
    "transparent",
  );
  assert.deepEqual(
    reload.get(colorSystemDocumentAtom).contrasts,
    original.colorSystem.contrasts,
  );
  stop();
} finally {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Color scale lifecycle: settings/reset, source propagation, aliases, cascade/CSS output and source preservation passed.",
);
