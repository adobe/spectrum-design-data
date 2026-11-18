// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  addedText,
  countWord,
  deleteDialogTitle,
  deleteFlow,
  deleteImpactText,
  deletedText,
  deprecatedText,
  errorText,
  failureOf,
  NOTIFICATION_KINDS,
  pickNotice,
  termsAddedText,
  toastText,
  type Notice,
} from "../src/features/notifications/policy";
import {
  createNotificationCenter,
  type DeleteDialog,
  type LifecycleChoice,
} from "../src/features/notifications/center";
import { LIFECYCLE_KINDS } from "../src/features/notifications/lifecycleKinds";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import {
  addColorScaleAtom,
  colorSystemDocumentAtom,
  removeColorScaleAtom,
  restoreColorScaleAtom,
} from "../src/features/color-system/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";

// Copy follows Spectrum toast and alert dialog guidance.
assert.equal(countWord(3), "three");
assert.equal(countWord(12), "12");
assert.equal(countWord(1200), "1,200");
assert.equal(toastText("element deleted."), "Element deleted");
assert.equal(
  toastText("Saved. Two aliases were not kept."),
  "Saved. Two aliases were not kept.",
);
assert.equal(addedText("structure"), "Structure added");
assert.equal(
  addedText("colorScale", 2),
  "Color scale added with two new registry terms",
);
assert.equal(
  addedText("dimensionScale", 0, "spacing scale"),
  "Spacing scale added",
);
assert.equal(deletedText("formula"), "Formula deleted");
assert.equal(termsAddedText(1), "Term added to registry");
assert.equal(termsAddedText(4), "Four terms added to registry");
assert.equal(deleteDialogTitle("colorScale"), "Delete color scale");
assert.equal(
  deleteImpactText("colorScale", 16),
  "Deleting this removes 16 tokens from the design data output.",
);
assert.equal(
  deleteImpactText("colorScale", 1),
  "Deleting this removes one token from the design data output.",
);
assert.equal(
  errorText(new Error("Keep at least one color scale.")),
  "Keep at least one color scale",
);
assert.equal(failureOf({ ok: false, error: "No" }), "No");
assert.equal(failureOf({ ok: true }), undefined);
assert.equal(failureOf("scale-1"), undefined);
for (const [id, kind] of Object.entries(NOTIFICATION_KINDS)) {
  const title = deleteDialogTitle(id as keyof typeof NOTIFICATION_KINDS);
  assert(!title.endsWith("?"), `${id}: dialog titles are not questions`);
  assert.equal(
    kind.noun[0],
    kind.noun[0].toUpperCase(),
    `${id}: sentence case`,
  );
}

// Which flow a delete gets.
assert.equal(deleteFlow("structureLayer", 0), "silent");
assert.equal(deleteFlow("structureLayer", 3), "confirm");
assert.equal(deleteFlow("formula", 0), "toast");
assert.equal(deleteFlow("colorScale", 16), "confirm");
assert.equal(deleteFlow("component", 0), "confirm");
assert.equal(NOTIFICATION_KINDS.taxonomyCategory.tier, "api");
assert.equal(deleteFlow("taxonomyCategory", 0), "confirm");

// One notice per action: errors win, then deletes, then adds, then info.
const notice = (variant: Notice["variant"]): Notice => ({
  variant,
  message: variant,
});
assert.equal(
  pickNotice([notice("positive"), notice("negative"), notice("neutral")])
    ?.variant,
  "negative",
);
assert.equal(
  pickNotice([notice("info"), notice("positive")])?.variant,
  "positive",
);
assert.equal(pickNotice([]), undefined);

function harness() {
  const store = createStore();
  store.set(enterEditModeAtom);
  const shown: Notice[] = [];
  const closed: string[] = [];
  const dialogs: DeleteDialog[] = [];
  const choices: LifecycleChoice[] = [];
  const center = createNotificationCenter({
    store,
    show: (next) => {
      shown.push(next);
      return () => closed.push(next.message);
    },
    confirm: (dialog) => dialogs.push(dialog),
    choose: (choice) => choices.push(choice),
  });
  const stop = center.start();
  return { store, center, shown, closed, dialogs, choices, stop };
}

{
  // Nested notices from one action collapse to one toast.
  const { center, shown } = harness();
  center.edit(() => {
    center.info("Saved");
    center.error(new Error("Could not save the rule."));
    center.added("rule", () => undefined);
  });
  assert.deepEqual(
    shown.map((entry) => entry.message),
    ["Could not save the rule"],
  );
}

{
  // Failed results and thrown errors become one negative toast.
  const { center, shown } = harness();
  assert.equal(
    center.edit(() => ({ ok: false, error: "Name is taken." })),
    undefined,
  );
  assert.equal(
    center.added("rule", () => {
      throw new Error("Nope");
    }),
    undefined,
  );
  assert.deepEqual(
    shown.map((entry) => [entry.variant, entry.message]),
    [
      ["negative", "Name is taken"],
      ["negative", "Nope"],
    ],
  );
}

{
  // A repeated message replaces the visible toast instead of stacking.
  const { center, shown, closed } = harness();
  center.copied();
  center.copied();
  assert.equal(shown.length, 2);
  assert.deepEqual(closed, ["Copied to clipboard"]);
}

{
  // Adds announce new registry terms in the same toast, never a second one.
  const { store, center, shown } = harness();
  const before = store.get(taxonomyDocumentAtom).terms.length;
  center.added("colorScale", () => store.set(addColorScaleAtom));
  const created = store.get(taxonomyDocumentAtom).terms.length - before;
  assert.equal(shown.length, 1);
  assert.equal(shown[0].variant, "positive");
  assert.equal(shown[0].message, addedText("colorScale", created));
}

{
  // A delete that removes exported names asks first, then offers Undo.
  const { store, center, shown, dialogs } = harness();
  const document = store.get(colorSystemDocumentAtom);
  const scale = document.scales.find((entry) => {
    const scratch = createStore();
    scratch.set(enterEditModeAtom);
    return scratch.set(removeColorScaleAtom, entry.id).ok;
  })!;
  const count = document.scales.length;
  center.remove({
    kind: "colorScale",
    run: (target) => target.set(removeColorScaleAtom, scale.id),
    undo: (result) =>
      store.set(
        restoreColorScaleAtom,
        result.ok && result.removedScale
          ? result.removedScale
          : { scale, index: 0 },
      ),
  });
  assert.equal(
    store.get(colorSystemDocumentAtom).scales.length,
    count,
    "dry run only",
  );
  assert.equal(shown.length, 0, shown[0]?.message);
  assert.equal(dialogs.length, 1);
  assert.equal(dialogs[0].title, "Delete color scale");
  assert.match(
    dialogs[0].description,
    /^Deleting this removes \d+ tokens from the design data output\.$/,
  );
  dialogs[0].onConfirm();
  assert.equal(store.get(colorSystemDocumentAtom).scales.length, count - 1);
  assert.deepEqual(
    shown.map((entry) => [entry.variant, entry.message]),
    [["neutral", "Color scale deleted"]],
  );
  shown[0].undo!();
  assert.equal(store.get(colorSystemDocumentAtom).scales.length, count);
  assert.equal(shown.length, 1, "undo is quiet");
}

{
  // A failing delete skips the dialog and reports the error once.
  const { center, shown, dialogs } = harness();
  center.remove({
    kind: "colorScale",
    run: (target) => target.set(removeColorScaleAtom, "missing"),
  });
  assert.equal(dialogs.length, 0);
  assert.deepEqual(
    shown.map((entry) => entry.variant),
    ["negative"],
  );
}

{
  // Small parts are silent unless they remove exported names.
  const { center, shown, dialogs } = harness();
  let ran = false;
  center.remove({ kind: "booleanBinding", run: () => (ran = true) });
  assert(ran);
  assert.equal(shown.length + dialogs.length, 0);
}

{
  // Terms created outside an action get their own toast; quiet work does not.
  const { store, center, shown } = harness();
  store.set(addColorScaleAtom);
  const afterAdd = shown.length;
  assert.deepEqual(
    shown.map((entry) => entry.message),
    ["Term added to registry"],
  );
  center.quietly(() => store.set(addColorScaleAtom));
  assert.equal(shown.length, afterAdd);
}

{
  // Local deletes skip the dry run; confirmed deletes skip the dialog.
  const { center, shown, dialogs } = harness();
  let runs = 0;
  center.remove({ kind: "component", local: true, run: () => runs++ });
  assert.equal(runs, 0, "api kinds still ask first");
  assert.equal(dialogs[0].description, deleteImpactText("component", 0));
  dialogs[0].onConfirm();
  assert.equal(runs, 1, "local runs are never dry-run");
  center.remove({
    kind: "term",
    local: true,
    confirmed: true,
    run: () => runs++,
    undo: () => runs--,
  });
  assert.equal(runs, 2);
  assert.equal(dialogs.length, 1);
  assert.deepEqual(
    shown.map((entry) => entry.message),
    ["Component deleted", "Term deleted"],
  );
  shown[1].undo!();
  assert.equal(runs, 1);
}

// Every kind declares how it follows the deletion and deprecation workflow.
assert.deepEqual(
  Object.keys(LIFECYCLE_KINDS).sort(),
  Object.keys(NOTIFICATION_KINDS).sort(),
);
assert.equal(deprecatedText("term", "Accent"), "Accent deprecated");

{
  // Unshipped items delete right away with Undo, even for "api" kinds.
  const { center, shown, dialogs, choices } = harness();
  let runs = 0;
  center.remove({
    kind: "taxonomyCategory",
    noun: "Brand",
    run: () => runs++,
    undo: () => runs--,
    lifecycle: { shipped: false },
  });
  assert.equal(runs, 1);
  assert.equal(dialogs.length + choices.length, 0);
  assert.deepEqual(
    shown.map((entry) => [entry.variant, entry.message]),
    [["neutral", "Brand deleted"]],
  );
  shown[0].undo!();
  assert.equal(runs, 0);
}

{
  // Shipped items never delete: they open the lifecycle dialog.
  const { center, shown, dialogs, choices } = harness();
  let name = "Accent";
  let deprecated: string | undefined | false = false;
  let deleted = false;
  center.remove({
    kind: "term",
    noun: "Accent",
    run: () => (deleted = true),
    lifecycle: {
      shipped: true,
      rename: {
        current: name,
        run: (next) =>
          next === "Taken"
            ? { ok: false, error: "Name is taken." }
            : (name = next),
      },
      candidates: [{ id: "neutral", label: "Neutral" }],
      deprecate: (replacementId) => {
        const previous = deprecated;
        deprecated = replacementId;
        return previous;
      },
      undoDeprecate: (previous) => (deprecated = previous),
    },
  });
  assert.equal(deleted, false);
  assert.equal(dialogs.length, 0);
  assert.equal(choices.length, 1);
  const [choice] = choices;
  assert.equal(choice.title, "Delete term");
  assert.equal(choice.name, "Accent");
  assert.equal(choice.noun, "term");
  assert.equal(choice.deprecated, false);
  assert.throws(() => choice.rename!.apply("Taken"), /Name is taken/);
  choice.rename!.apply("Brand");
  assert.equal(name, "Brand");
  assert.equal(shown.length, 0, "rename is quiet; the dialog closes");
  choice.deprecate!("neutral");
  assert.equal(deprecated, "neutral");
  assert.deepEqual(
    shown.map((entry) => [entry.variant, entry.message]),
    [["neutral", "Accent deprecated"]],
  );
  shown[0].undo!();
  assert.equal(deprecated, false);
  assert.equal(shown.length, 1, "undo is quiet");
}

{
  // Already-deprecated items open the dialog with no actions offered.
  const { center, choices } = harness();
  center.remove({
    kind: "colorScale",
    run: () => undefined,
    lifecycle: { shipped: true, deprecated: true },
  });
  assert.equal(choices[0].deprecated, true);
  assert.equal(choices[0].rename, undefined);
}

console.log("notifications: ok");
