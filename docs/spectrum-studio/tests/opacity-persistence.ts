// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../src/features/edit-session/storage";
import { persistenceIssuesAtom } from "../src/state/persist";
import { foundationModeAttachmentsAtom } from "../src/state/view/foundationModeAttachments";
import {
  opacityContexts,
  resolveOpacity,
} from "../src/features/opacity/generation";

const data = new Map<string, string>();
const events = new EventTarget();
const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
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
function legacy(base: number, dark: number) {
  const snapshot = createDefaultSnapshot();
  delete snapshot.opacity;
  snapshot.elevation!.layers = snapshot.elevation!.layers.map((layer) => {
    const { opacityTokenId: _reference, ...rest } = layer;
    void _reference;
    return { ...rest, opacity: base };
  });
  const axis = snapshot.modeSets.find(
    (set) => set.id === "mode-set-color-scheme",
  )!;
  axis.authoringCapabilities!.push("elevation.layerOpacities");
  axis.modes[1].foundations.elevation = {
    layerOpacities: { [snapshot.elevation!.layers[0].id]: dark },
  };
  snapshot.taxonomy!.categories = snapshot.taxonomy!.categories.map(
    (category) => ({
      ...category,
      scopes: category.scopes.filter((scope) => scope !== "opacity"),
    }),
  );
  snapshot.taxonomy!.terms = snapshot.taxonomy!.terms.filter(
    (term) => term.value !== 1700,
  );
  return snapshot;
}
try {
  data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: 14,
      working: legacy(30, 70),
      saved: legacy(20, 50),
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const store = createStore();
  const dispose = initializeAuthoringPersistence(store, {
    validateScheduled: null,
  });
  assert.deepEqual(store.get(persistenceIssuesAtom), []);
  const working = store.get(authoringSnapshotAtom);
  const saved = store.get(editSessionSnapshotAtom)!;
  assert.ok(working.opacity && saved.opacity);
  assert.equal(
    working.elevation!.layers[0].opacityTokenId,
    saved.elevation!.layers[0].opacityTokenId,
  );
  for (const [snapshot, expected] of [
    [working, [0.3, 0.7]],
    [saved, [0.2, 0.5]],
  ] as const) {
    const id = snapshot.elevation!.layers[0].opacityTokenId;
    assert.deepEqual(
      opacityContexts(snapshot).map(
        (context) =>
          resolveOpacity(snapshot, context.modes).levels.find(
            (level) => level.id === id,
          )!.value,
      ),
      expected,
    );
    assert.equal(
      snapshot.modeSets[0].authoringCapabilities?.includes(
        "elevation.layerOpacities",
      ),
      false,
    );
  }
  assert.deepEqual(store.get(foundationModeAttachmentsAtom), {
    "mode-set-color-scheme": ["opacity"],
  });
  assert.equal(
    JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
    AUTHORING_RECORD_VERSION,
  );
  const written = data.get(AUTHORING_STORAGE_KEY);
  dispose();
  const reloaded = createStore();
  const stop = initializeAuthoringPersistence(reloaded, {
    validateScheduled: null,
  });
  assert.deepEqual(
    reloaded.get(authoringSnapshotAtom).opacity,
    working.opacity,
  );
  assert.deepEqual(
    reloaded.get(editSessionSnapshotAtom)!.opacity,
    saved.opacity,
  );
  assert.equal(data.get(AUTHORING_STORAGE_KEY), written);
  stop();
} finally {
  if (previous) Object.defineProperty(globalThis, "window", previous);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Opacity persistence: version-14 upgrade, distinct working/saved values, shared identities and reload pass.",
);
