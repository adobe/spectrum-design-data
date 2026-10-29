// Copyright 2026 Adobe. All rights reserved.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { primitiveReferencesAtom } from "../../src/features/tokens/primitiveReferenceState";
import { assignStructure } from "../../src/features/structures/model";
import { SIZE_TERM_IDS } from "../../src/features/taxonomy/variantVocabulary";
import { buildTshirtArtifacts } from "../../src/features/design-data/tshirtArtifacts";
import { assertGeneratedClassificationCompatibility } from "../../src/features/taxonomy/generatedReviewExport";

test.setTimeout(90_000);
const errors = new WeakMap<Page, string[]>();
const defaults = createDefaultSnapshot();
const [base, text] = defaults.structures!.structures;
const references = createStore().get(primitiveReferencesAtom);
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function start(page: Page, snapshot = createDefaultSnapshot()) {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.addInitScript(
    ({ key, preferences, snapshot, version }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved: snapshot,
            isEditing: true,
            attachments: {},
            savedAttachments: {},
          }),
        );
      if (!localStorage.getItem(preferences))
        localStorage.setItem(
          preferences,
          JSON.stringify({
            version: 1,
            appearance: "light",
            modeSelection: {},
          }),
        );
    },
    {
      key: AUTHORING_STORAGE_KEY,
      preferences: PREFERENCES_STORAGE_KEY,
      snapshot,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
  await openDesign(page);
}
async function openDesign(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
}
const preview = (page: Page, name = "Base") =>
  page.getByRole("group", { name: `${name} structure preview`, exact: true });
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
test("Text modules are inert, use their source geometry, and Direction keeps insertion centered", async ({
  page,
}) => {
  await start(page);
  const module = preview(page).locator(".structureModule");
  await expect(module).toHaveCSS("flex-direction", "column");
  await expect(module).toHaveCSS("gap", "1px");
  await expect(module.locator('[data-element-kind="text"]').nth(0)).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(module.locator('[data-element-kind="text"]').nth(1)).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(module.getByRole("button")).toHaveCount(0);
  await preview(page)
    .getByRole("button", { name: "Text Structure instance 1" })
    .press("Enter");
  const inspector = page.getByRole("region", {
    name: "Structure instance settings",
    exact: true,
  });
  await expect(inspector.getByRole("combobox")).toHaveCount(0);
  await inspector
    .getByRole("button", { name: "Open source Structure", exact: true })
    .click();
  const settings = page.getByRole("region", {
    name: "Structure settings for Text",
    exact: true,
  });
  await expect(
    settings.getByRole("combobox", { name: "Token naming", exact: true }),
  ).toHaveValue("Text");
  await settings
    .getByRole("radio", { name: "Horizontal", exact: true })
    .click();
  await expect(preview(page, "Text")).toHaveAttribute(
    "data-direction",
    "horizontal",
  );
  await settings.getByRole("radio", { name: "Vertical", exact: true }).click();
  const frame = preview(page, "Text");
  await frame
    .getByRole("button", { name: "Add element at position 2" })
    .focus();
  const geometry = await frame
    .locator(".structureInsertion")
    .nth(1)
    .evaluate((marker) => {
      const box = marker.getBoundingClientRect(),
        button = marker.querySelector("button")!.getBoundingClientRect();
      const parent = marker.parentElement!,
        style = getComputedStyle(parent);
      return {
        width: box.width,
        parentWidth:
          parent.getBoundingClientRect().width -
          Number.parseFloat(style.borderLeftWidth) -
          Number.parseFloat(style.borderRightWidth),
        center: box.x + box.width / 2,
        buttonCenter: button.x + button.width / 2,
      };
    });
  expect(geometry.width).toBeCloseTo(geometry.parentWidth, 1);
  expect(geometry.center).toBeCloseTo(geometry.buttonCenter, 1);
  expect(buildTshirtArtifacts((await record(page)).working).tokens).toEqual(
    buildTshirtArtifacts(defaults).tokens,
  );
});
test("Grouped repeated insertion, Undo, protected deletion and label-only edits preserve source-owned exports", async ({
  page,
}) => {
  await start(page);
  const button = preview(page).getByRole("button", {
    name: "Add element at position 2",
    exact: true,
  });
  await button.focus();
  await button.press("Enter");
  const menu = page.getByRole("menu");
  await expect(
    menu
      .getByRole("group", { name: "Elements", exact: true })
      .getByRole("menuitem", { name: "Text", exact: true }),
  ).toBeVisible();
  await menu
    .getByRole("group", { name: "Structures", exact: true })
    .getByRole("menuitem", { name: "Text", exact: true })
    .click();
  await expect(preview(page).locator(".structureModule")).toHaveCount(2);
  const inspector = page.getByRole("region", {
    name: "Structure instance settings",
    exact: true,
  });
  await inspector
    .getByRole("button", { name: "Remove instance", exact: true })
    .click();
  await expect(preview(page).locator(".structureModule")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(preview(page).locator(".structureModule")).toHaveCount(2);
  await inspector
    .getByRole("button", { name: "Open source Structure", exact: true })
    .click();
  const card = page.locator('[data-component="StructureCard"]').nth(1);
  await card
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Readable content");
  await card.getByRole("textbox", { name: "Name", exact: true }).press("Tab");
  await expect(
    page
      .getByRole("region", { name: "Structure settings for Readable content" })
      .getByRole("combobox", { name: "Token naming", exact: true }),
  ).toHaveValue("Text");
  await card
    .getByRole("button", {
      name: "Delete structure Readable content",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "used by Base" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).saved.structures!.structures[0].elements!.length,
    )
    .toBe(2);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await page.reload();
  await openDesign(page);
  await expect(preview(page).locator(".structureModule")).toHaveCount(2);
  await expect(
    preview(page).getByRole("button", { name: /Add element/ }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Tokens(?: |$)/ })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export generated compatibility bundle",
      exact: true,
    })
    .click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error("The compatibility download was not retained.");
  const packet = JSON.parse(await readFile(path, "utf8"));
  await assertGeneratedClassificationCompatibility(packet);
  expect(packet.schemaVersion).toBe(2);
  expect(
    packet.bundle.semantics.filter(
      (row: { structureId: string }) => row.structureId === text.conceptId,
    ),
  ).toHaveLength(5);
  expect(packet.bundle.tokens).toEqual(buildTshirtArtifacts(defaults).tokens);
});
test("A source gap edit propagates once, and missing child sizes visibly fall back to Medium", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures[1].generation!.sizeTermIds = [
    SIZE_TERM_IDS.xs,
    SIZE_TERM_IDS.m,
    SIZE_TERM_IDS.xl,
  ];
  await start(page, snapshot);
  await preview(page)
    .getByRole("button", { name: "Text Structure instance 1" })
    .click();
  await page
    .getByRole("region", { name: "Structure instance settings" })
    .getByRole("button", { name: "Open source Structure" })
    .click();
  const gap = references.find(
    (reference) => reference.family === "spacing" && reference.index === -3,
  )!;
  const input = page
    .getByRole("region", { name: "Structure settings for Text" })
    .getByRole("combobox", { name: /^Gap(?: |$)/ });
  await input.focus();
  await input.fill(gap.name);
  await page
    .getByRole("option")
    .filter({ has: page.getByTitle(gap.name, { exact: true }) })
    .click();
  await input.press("Tab");
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
  await expect(preview(page).locator(".structureModule")).toHaveCSS(
    "gap",
    `${gap.value}px`,
  );
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  const small = page.getByRole("region", { name: "Small", exact: true });
  await expect(small).toContainText("Text: S is unavailable; showing M.");
  await expect(
    small.locator('[data-component="StructurePreview"] .structureModule'),
  ).toHaveCSS("gap", `${gap.value}px`);
  await expect(
    small
      .locator('[data-component="StructurePreview"] [data-element-kind="text"]')
      .first(),
  ).toHaveCSS("font-size", "14px");
  const bundle = buildTshirtArtifacts((await record(page)).working);
  expect(
    bundle.semantics.filter((row) => row.structureId === base.conceptId),
  ).toHaveLength(15);
  expect(
    bundle.semantics.filter((row) => row.structureId === text.conceptId),
  ).toHaveLength(3);
});
test("Nested Hug and Fill constraints use the parent content box in Design and every permutation", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const width = references.find(
    (reference) =>
      reference.family === "size" && Number(reference.value) >= 100,
  )!;
  snapshot.structures!.structures[0] = assignStructure(
    snapshot.structures!.structures[0],
    { width: { $ref: width.id } },
  );
  snapshot.structures!.structures[1] = assignStructure(
    snapshot.structures!.structures[1],
    {
      minWidth: { value: { kind: "sizing", preset: "hug" } },
      maxWidth: { value: { kind: "sizing", preset: "fill" } },
    },
  );
  await start(page, snapshot);
  await expect(preview(page).locator(".structureModule")).toBeVisible();
  const geometry = await preview(page)
    .locator(".structureModule")
    .evaluate((node) => {
      const source = getComputedStyle(node),
        parent = getComputedStyle(node.parentElement!.parentElement!);
      return {
        maximum: Number.parseFloat(source.maxWidth),
        minimum: Number.parseFloat(source.minWidth),
        available:
          node.parentElement!.parentElement!.getBoundingClientRect().width -
          Number.parseFloat(parent.borderLeftWidth) -
          Number.parseFloat(parent.borderRightWidth) -
          Number.parseFloat(parent.paddingLeft) -
          Number.parseFloat(parent.paddingRight),
      };
    });
  expect(geometry.maximum).toBeCloseTo(geometry.available, 1);
  expect(geometry.minimum).toBeGreaterThan(0);
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  await expect(
    page.locator(".structurePermutationStage .structureModule"),
  ).toHaveCount(5);
  await expect(page.getByText(/must be measured/)).toHaveCount(0);
});
test("Explicit token-name creation preserves local labels and adds no occurrence-owned tokens", async ({
  page,
}) => {
  await start(page);
  await preview(page)
    .getByRole("button", { name: "Text Structure instance 1" })
    .press("Enter");
  await page
    .getByRole("region", { name: "Structure instance settings" })
    .getByRole("button", { name: "Open source Structure" })
    .click();
  const settings = page.getByRole("region", {
    name: "Structure settings for Text",
    exact: true,
  });
  await settings
    .getByRole("combobox", { name: "Token naming", exact: true })
    .fill("Text module");
  await settings
    .getByRole("combobox", { name: "Token naming", exact: true })
    .press("Tab");
  await settings
    .getByRole("button", { name: "Create Structure term", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await record(page)).working.taxonomy!.terms.some(
        (term) => term.value === "Text module",
      ),
    )
    .toBe(true);
  const working = (await record(page)).working;
  const term = working.taxonomy!.terms.find(
    (term) => term.value === "Text module",
  )!;
  expect(working.structures!.structures[1].name).toBe("Text");
  expect(working.structures!.structures[1].generation!.nameRef).toEqual({
    categoryId: term.categoryId,
    termId: term.id,
  });
  const bundle = buildTshirtArtifacts(working);
  expect(bundle.semantics).toHaveLength(20);
  expect(
    bundle.semantics
      .filter((row) => row.structureId === text.conceptId)
      .every((row) => row.token.name.structure === "text-module"),
  ).toBe(true);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await openDesign(page);
  await expect(preview(page).locator(".structureModule")).toHaveCount(1);
  expect(
    (await record(page)).saved.structures!.structures[1].generation!.nameRef,
  ).toEqual({ categoryId: term.categoryId, termId: term.id });
});
test("Only confirmed Reset all replaces a saved system with shipped Text and Base composition", async ({
  page,
}) => {
  const older = createDefaultSnapshot();
  older.structures!.structures = [
    { ...older.structures!.structures[0], elements: [] },
  ];
  await start(page, older);
  await expect(preview(page).locator(".structureModule")).toHaveCount(0);
  expect((await record(page)).saved.structures!.structures).toHaveLength(1);
  const log = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (!(await log.isVisible()))
    await page.getByRole("button", { name: /^Change log/ }).click();
  await log.getByRole("button", { name: "Reset all", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.structures)
    .toEqual(defaults.structures);
  expect((await record(page)).saved.structures).toEqual(defaults.structures);
  await page.reload();
  await openDesign(page);
  await expect(preview(page).locator(".structureModule")).toHaveCSS(
    "gap",
    "1px",
  );
  expect(
    buildTshirtArtifacts((await record(page)).saved).semantics,
  ).toHaveLength(20);
});
