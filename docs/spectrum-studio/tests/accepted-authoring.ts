// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import {
  captureSnapshot,
  isSnapshot,
} from "../src/features/edit-session/state";
import {
  componentContrastWitnessAtom,
  createComponentContrastWitness,
  matchesComponentContrastWitness,
} from "../src/features/components/contrastWitness";
import {
  colorSystemDocumentAtom,
  contrastTokensAtom,
  updateContrastTokenAtom,
} from "../src/features/color-system/state";
import { stylesDocumentAtom } from "../src/features/styles/state";
import { taxonomyContributionsEnabledAtom } from "../src/features/taxonomy/contributions";
import { assertAuthoringUpdates } from "../src/state/authoringGuards";
import { editModeAtom } from "../src/state/view/editMode";

for (const count of [10, 1000]) {
  const store = createStore();
  store.set(editModeAtom, true);
  const styles = store.get(stylesDocumentAtom);
  let publicationReads = 0;
  const rows: Record<string, string> = Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `inactive-mode-${index}`,
      crypto.randomUUID(),
    ]),
  );
  for (const [key, value] of Object.entries(rows))
    Object.defineProperty(rows, key, {
      enumerable: true,
      get() {
        publicationReads++;
        return value;
      },
    });
  const expandedStyles = {
    ...styles,
    publications: [
      ...styles.publications,
      {
        id: crypto.randomUUID(),
        recipeId: styles.recipes[0].id,
        key: "inactive-authoring-growth",
        rows,
      },
    ],
  };
  store.set(taxonomyContributionsEnabledAtom, false);
  try {
    store.set(stylesDocumentAtom, expandedStyles);
  } finally {
    store.set(taxonomyContributionsEnabledAtom, true);
  }
  const witness = createComponentContrastWitness(captureSnapshot(store.get));
  assert.ok(witness);
  store.set(componentContrastWitnessAtom, witness);
  const first = store.get(contrastTokensAtom)[0];
  store.set(updateContrastTokenAtom, {
    id: first.id,
    value: first.value + 0.01,
  });
  publicationReads = 0;
  for (const delta of [0.02, 0.03, 0.04])
    store.set(updateContrastTokenAtom, {
      id: first.id,
      value: first.value + delta,
    });
  assert.equal(
    publicationReads,
    0,
    `Accepted contrast edits do not revisit ${count} unrelated publication rows.`,
  );
  assert.equal(store.get(stylesDocumentAtom), expandedStyles);
  assert.equal(
    matchesComponentContrastWitness(witness, captureSnapshot(store.get)),
    true,
    "Warm acceptance agrees with cold signature matching.",
  );
  assert.ok(publicationReads >= count);

  const current = store.get(colorSystemDocumentAtom);
  const contrastOnly = {
    ...current,
    contrasts: current.contrasts.map((contrast, index) =>
      index ? contrast : { ...contrast, value: first.value + 0.05 },
    ),
  };
  const invalidStyles = {
    ...expandedStyles,
    publications: expandedStyles.publications.map((publication, index) =>
      index
        ? publication
        : {
            ...publication,
            rows: {
              ...publication.rows,
              collision: expandedStyles.recipes[0].id,
            },
          },
    ),
  };
  assert.equal(
    isSnapshot({ ...captureSnapshot(store.get), styles: invalidStyles }),
    false,
    "The public validator still checks cross-category identity collisions.",
  );
  assert.throws(() =>
    assertAuthoringUpdates(
      store.get,
      new Map<string, unknown>([
        ["foundations/color", contrastOnly],
        ["design/styles", invalidStyles],
      ]),
    ),
  );
  assert.throws(() =>
    assertAuthoringUpdates(
      store.get,
      new Map([["foundations/color", { ...current, scales: null }]]),
    ),
  );
  for (const value of [NaN, Infinity, 22]) {
    const invalid = {
      ...contrastOnly,
      contrasts: contrastOnly.contrasts.map((contrast, index) =>
        index ? contrast : { ...contrast, value },
      ),
    };
    assert.throws(() => store.set(colorSystemDocumentAtom, invalid));
  }
  assert.equal(store.get(colorSystemDocumentAtom), current);
  assert.equal(store.get(stylesDocumentAtom), expandedStyles);

  const originalTo = Color.Space.prototype.to;
  let catalogConversions = 0;
  Color.Space.prototype.to = new Proxy(originalTo, {
    apply(target, receiver, args) {
      catalogConversions++;
      return Reflect.apply(target, receiver, args);
    },
  });
  try {
    assertAuthoringUpdates(
      store.get,
      new Map([["foundations/color", contrastOnly]]),
    );
    assert.equal(
      catalogConversions,
      0,
      "A warm eligible proposal does not rebuild the canonical color catalog.",
    );
    assertAuthoringUpdates(
      store.get,
      new Map([
        [
          "foundations/color",
          {
            ...contrastOnly,
            settings: {
              ...contrastOnly.settings,
              backgroundBlend: contrastOnly.settings.backgroundBlend + 0.01,
            },
          },
        ],
      ]),
    );
    assert.ok(
      catalogConversions > 0,
      "A non-contrast change still uses the complete canonical catalog.",
    );

    const cachedSignature = witness.signature;
    witness.signature = "invalidated-proof";
    catalogConversions = 0;
    assertAuthoringUpdates(
      store.get,
      new Map([["foundations/color", contrastOnly]]),
    );
    assert.ok(
      catalogConversions > 0,
      "Mutating a proof cannot retain its cached authorization.",
    );
    witness.signature = cachedSignature;
  } finally {
    Color.Space.prototype.to = originalTo;
  }
  const mutable = captureSnapshot(store.get);
  mutable.styles = invalidStyles;
  assert.equal(matchesComponentContrastWitness(witness, mutable), false);
}
console.log(
  "Accepted authoring: unchanged-row growth, cold parity, changed-owner validation, identity collisions, invalid contrasts and proof invalidation passed.",
);
