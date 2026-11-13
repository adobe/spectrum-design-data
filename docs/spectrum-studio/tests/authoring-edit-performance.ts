// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { createStore } from "jotai";

// The check runner stops heavy checks above 1 GiB; collect garbage between scenarios
// so each one starts from a clean heap and its timing excludes earlier garbage.
setFlagsFromString("--expose-gc");
const collectGarbage = runInNewContext("gc") as () => void;

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    throw new Error("Broad storage clearing is prohibited.");
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const storage = new MemoryStorage();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
Object.defineProperty(globalThis, "Worker", {
  configurable: true,
  value: class IdleWorker {
    onmessage = null;
    onerror = null;
    onmessageerror = null;
    postMessage() {}
    terminate() {}
  },
});

const time = (work: () => void) => {
  const start = performance.now();
  work();
  return performance.now() - start;
};
const ms = (value: number) => `${Math.round(value)} ms`;
const report = (line: string) => {
  const { heapUsed, rss } = process.memoryUsage();
  const mb = (bytes: number) => `${Math.round(bytes / 2 ** 20)} MB`;
  console.log(`${line} [heap ${mb(heapUsed)}, RSS ${mb(rss)}]`);
};

const hubStart = performance.now();
const session = await import("../src/features/edit-session/state");
report(`Load the state hub module graph: ${ms(performance.now() - hubStart)}`);
const { buildTshirtArtifacts, tshirtBuildStats } =
  await import("../src/features/design-data/tshirtArtifacts");
const { focusedTshirtArtifactsAtom, workingTshirtArtifactsAtom } =
  await import("../src/features/design-data/tshirtState");
const { assignStructureAtom } =
  await import("../src/features/structures/state");
const { answerLayoutScaleAtom, pendingLayoutScaleAtom } =
  await import("../src/features/structures/layoutScaleState");
const {
  selectedStructureIdAtom,
  structurePreviewsAtom,
  structuresDocumentAtom,
} = await import("../src/features/structures/documentState");
const { editStructureOptionBindingsAtom } =
  await import("../src/features/structures/configurationState");
const { ownedLayoutAt } =
  await import("../src/features/structures/configuration");
const { EMPTY_STRUCTURE_PREVIEW } =
  await import("../src/features/structures/variants");
const { constraintChoiceAllowed, isConstraintSlot, resolveStructure } =
  await import("../src/features/structures/resolution");
const { STRUCTURE_SLOT_KEYS, structureSelection, structureSlotDefinition } =
  await import("../src/features/structures/model");
const { primitiveReferencesAtom } =
  await import("../src/features/tokens/primitiveReferenceState");
const { generatedColorTokensAtom } =
  await import("../src/features/tokens/state");
const {
  saveStyleAtom,
  selectedStyleIdAtom,
  stylePreviewArtifactsAtom,
  stylesDocumentAtom,
} = await import("../src/features/styles/state");
const { contrastMultiplierAtom, updateContrastMultiplierAtom } =
  await import("../src/features/color-system/state");

// Fresh snapshots bypass any reuse of earlier results, so this times generation itself.
const buildMs = [0, 1].map(() => {
  const source = session.createDefaultSnapshot();
  return time(() => buildTshirtArtifacts(source));
});
report(`Full token-set build: first ${ms(buildMs[0])}, then ${ms(buildMs[1])}`);
assert.ok(buildMs[1] < 10_000, `A full build took ${ms(buildMs[1])}.`);

const { clearComponentTokenCatalogCache, componentTokenCatalog } =
  await import("../src/features/components/references");
// The repeat costs only the content comparison and copies.
const catalogMs = [0, 1].map(() => {
  const source = session.createDefaultSnapshot();
  return time(() => componentTokenCatalog(source));
});
clearComponentTokenCatalogCache();
report(
  `Component catalog: build ${ms(catalogMs[0])}, equal-content repeat ${ms(catalogMs[1])}`,
);

const store = createStore();
store.set(session.enterEditModeAtom);
report("Enter edit mode");

const listItem = store
  .get(structuresDocumentAtom)
  .structures.find((structure) => structure.name === "List-item")!;
assert.ok(listItem, "Shipped defaults include the List-item structure.");
store.set(selectedStructureIdAtom, listItem.conceptId);
const spacing = store
  .get(primitiveReferencesAtom)
  .filter((reference) => reference.family === "spacing" && !reference.error);
const twoChoicesOtherThan = (selection: { $ref?: string } | null) => {
  const chosen = spacing
    .filter((reference) => reference.id !== selection?.$ref)
    .slice(0, 2)
    .map((reference) => reference.id);
  assert.equal(chosen.length, 2, "Two spacing tokens are available to choose.");
  return chosen;
};
const choices = twoChoicesOtherThan(
  structureSelection(listItem, "paddingTop") as { $ref?: string } | null,
);
const layout = {
  availableWidth: 800,
  availableHeight: 400,
  naturalWidth: 98,
  naturalHeight: 34,
};
const readStructureDesign = () => {
  assert.equal(store.get(workingTshirtArtifactsAtom).status, "ready");
  assert.equal(store.get(focusedTshirtArtifactsAtom).status, "ready");
};
readStructureDesign();

// The focused check runner stops heavy checks at 60 seconds; skip repeat runs near that limit.
const repeatDeadline = 40_000;
/** Times an edit (write) and reading the screen's results (display); reports the warm run. */
function measure(
  label: string,
  edit: (index: number) => void,
  display: () => void,
  limitMs = 15_000,
) {
  collectGarbage();
  const runs: {
    writeMs: number;
    displayMs: number;
    full: number;
    focused: number;
  }[] = [];
  for (let index = 0; index < 2; index++) {
    if (index && performance.now() > repeatDeadline) break;
    const before = tshirtBuildStats();
    const writeMs = time(() => edit(index));
    const displayMs = time(display);
    const after = tshirtBuildStats();
    runs.push({
      writeMs,
      displayMs,
      full: after.full - before.full,
      focused: after.focused - before.focused,
    });
  }
  const first = runs[0];
  const warm = runs.at(-1)!;
  report(
    `${label}: write ${ms(warm.writeMs)}, display ${ms(warm.displayMs)} (first run ${ms(first.writeMs + first.displayMs)}); full builds ${warm.full}, focused builds ${warm.focused}`,
  );
  // Loose regression limits for now; they tighten once the shared-build work lands.
  assert.ok(
    warm.writeMs + warm.displayMs < limitMs,
    `${label} took ${ms(warm.writeMs + warm.displayMs)}.`,
  );
}
// A token pick on a sized property first asks whether it follows the size rule; time both steps.
function pickToken(pick: () => void) {
  const askMs = time(pick);
  let answerMs = 0;
  while (store.get(pendingLayoutScaleAtom))
    answerMs += time(() =>
      store.set(answerLayoutScaleAtom, { kind: "static" }),
    );
  report(
    `  pick: show the size question ${ms(askMs)}, apply the answer ${ms(answerMs)}`,
  );
}

measure(
  "Structures picker, default look (assignStructureAtom)",
  (index) => {
    const $ref = choices[index % 2];
    pickToken(() =>
      store.set(assignStructureAtom, {
        id: listItem.conceptId,
        changes: { paddingTop: { $ref } },
        layout,
      }),
    );
    const updated = store
      .get(structuresDocumentAtom)
      .structures.find(
        (structure) => structure.conceptId === listItem.conceptId,
      )!;
    assert.deepEqual(structureSelection(updated, "paddingTop"), { $ref });
  },
  readStructureDesign,
);

const density = listItem.editor!.properties.find(
  (property) => property.name === "Density",
);
if (density?.kind !== "variant")
  throw new Error("List-item has a Density variant.");
const valueId = density.options.find(
  (option) => option.id !== density.defaultOptionId,
)!.id;
const layoutPath = Object.keys(listItem.editor!.layouts!)[0];
const nestedLayout = ownedLayoutAt(
  listItem,
  layoutPath,
  store.get(structuresDocumentAtom).structures,
)!;
const variantChoices = twoChoicesOtherThan(
  structureSelection(nestedLayout, "paddingTop") as { $ref?: string } | null,
);
store.set(structurePreviewsAtom, {
  [listItem.conceptId]: {
    ...EMPTY_STRUCTURE_PREVIEW,
    options: { [density.id]: valueId },
  },
});
measure(
  "Structures picker, variant option (editStructureOptionBindingsAtom)",
  (index) => {
    const $ref = variantChoices[index % 2];
    pickToken(() =>
      store.set(editStructureOptionBindingsAtom, {
        target: {
          structureId: listItem.conceptId,
          path: layoutPath.slice(1).split("/"),
        },
        valueId,
        changes: { paddingTop: { $ref } },
        layout,
      }),
    );
    const owner = store
      .get(structuresDocumentAtom)
      .structures.find(
        (structure) => structure.conceptId === listItem.conceptId,
      )!;
    assert.deepEqual(
      owner.editor!.layouts![layoutPath].overrides![valueId].slots!.paddingTop,
      { $ref },
    );
  },
  readStructureDesign,
);

const references = store.get(primitiveReferencesAtom);
measure(
  "Structures picker options, pure work per render",
  () => {
    const structure = store
      .get(structuresDocumentAtom)
      .structures.find((item) => item.conceptId === listItem.conceptId)!;
    resolveStructure(structure, references, layout);
    for (const slot of STRUCTURE_SLOT_KEYS) {
      if (!isConstraintSlot(slot)) continue;
      const family = structureSlotDefinition(slot).family;
      for (const reference of references)
        if (reference.family === family)
          constraintChoiceAllowed(
            structure,
            slot,
            { $ref: reference.id },
            references,
            layout,
          );
    }
  },
  () => {},
  2_000,
);

const recipe = store
  .get(stylesDocumentAtom)
  .recipes.find((item) =>
    Object.values(item.differences).some((difference) => difference.fontWeight),
  )!;
assert.ok(recipe, "Shipped defaults include a Style with a weight variant.");
const optionId = Object.keys(recipe.differences).find(
  (id) => recipe.differences[id].fontWeight,
)!;
store.set(selectedStyleIdAtom, recipe.id);
const readStyles = () => {
  store.get(stylePreviewArtifactsAtom);
  assert.equal(store.get(workingTshirtArtifactsAtom).status, "ready");
};
readStyles();
measure(
  "Styles edit (saveStyleAtom)",
  (index) => {
    const latest = store
      .get(stylesDocumentAtom)
      .recipes.find((item) => item.id === recipe.id)!;
    const weight = 510 + 10 * (index % 2);
    store.set(saveStyleAtom, {
      ...latest,
      differences: {
        ...latest.differences,
        [optionId]: {
          ...latest.differences[optionId],
          fontWeight: { value: weight },
        },
      },
    });
    assert.deepEqual(
      store
        .get(stylesDocumentAtom)
        .recipes.find((item) => item.id === recipe.id)!.differences[optionId]
        .fontWeight,
      { value: weight },
    );
  },
  readStyles,
);

const contrast = store.get(contrastMultiplierAtom);
const readColor = () => {
  store.get(generatedColorTokensAtom);
  assert.equal(store.get(workingTshirtArtifactsAtom).status, "ready");
};
readColor();
measure(
  "Color slider step (updateContrastMultiplierAtom)",
  (index) => {
    const value = Math.max(0, contrast - 0.05 * (1 + (index % 2)));
    store.set(updateContrastMultiplierAtom, value);
    assert.equal(store.get(contrastMultiplierAtom), value);
  },
  readColor,
);
