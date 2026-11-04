// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { encodeStructureSource } from "../../src/features/edit-session/structureSourceCodec";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function openList(page: Page, name = "List-item") {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  await page
    .locator('[data-component="StructureCard"]')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click({ position: { x: 4, y: 4 } });
}
async function choose(page: Page, property: string, value: string) {
  await page
    .getByRole("button", { name: new RegExp(`${property} option$`) })
    .click();
  await page
    .getByRole("listbox", { name: `${property} option`, exact: true })
    .getByRole("option", { name: value, exact: true })
    .click();
}
const settings = (page: Page) =>
  page.getByRole("region", {
    name: "Structure settings for List-item",
    exact: true,
  });
const selected = (page: Page) =>
  page.locator(
    '.structureVariantOption[data-selected="true"] .structurePreview:not([aria-hidden])',
  );
const working = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.working ?? null,
    AUTHORING_STORAGE_KEY,
  );
const fixture = createDefaultSnapshot();
const catalog = fixture.structures!.structures;
const list = catalog.find((item) => item.name === "List-item")!;
const named = (name: string) => catalog.find((item) => item.name === name)!;
const elementIds = Object.fromEntries(
  Object.entries(list.editor!.layouts!).flatMap(([, configuration]) =>
    Object.entries(configuration.visibilityBindings ?? {}).map(
      ([id, binding]) => [
        list.editor!.properties.find(
          (property) => property.id === binding.propertyId,
        )!.name,
        id,
      ],
    ),
  ),
);

test("List-item parent controls drive owned layouts, Base content and matching permutations", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await openList(page);
  const before = await working(page);
  const panel = settings(page);
  const preview = selected(page);
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("alert")).toHaveCount(0);
  for (const name of [
    "Density",
    "Horizontal padding",
    "Vertical padding",
    "Indentation distance",
  ])
    await expect(
      panel.getByRole("button", { name: new RegExp(`${name} option$`) }),
    ).toBeVisible();
  const vertical = preview.locator(
    `[data-structure-id="${named("Vertical padding").conceptId}"]`,
  );
  const content = preview.locator(
    `[data-structure-id="${named("Content layout").conceptId}"]`,
  );
  await choose(page, "Density", "Spacious");
  await expect(vertical).toHaveCSS("padding-top", "8px");
  await choose(page, "Vertical padding", "None");
  await expect(vertical).toHaveCSS("padding-top", "0px");
  await choose(page, "Density", "Regular");
  await expect(vertical).toHaveCSS("padding-bottom", "0px");
  await choose(page, "Horizontal padding", "None");
  await expect(content).toHaveCSS("padding-left", "0px");
  await choose(page, "Vertical padding", "Default");
  await expect(vertical).toHaveCSS("padding-top", "4px");
  for (const [name, id] of Object.entries(elementIds)) {
    const control = panel.getByRole("switch", { name, exact: true });
    await expect(control).toBeChecked();
    await control.press("Space");
    await expect(preview.locator(`[data-element-id="${id}"]`)).toHaveCount(0);
    await control.press("Space");
    await expect(preview.locator(`[data-element-id="${id}"]`)).toBeVisible();
  }
  const tree = page.getByRole("treegrid", { name: "Structure layers" });
  await tree.getByText("Content start", { exact: true }).click();
  await expect(
    panel.getByRole("button", { name: /Density option$/ }),
  ).toBeVisible();
  await expect(
    panel.getByText("Content start properties", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("Layout name", { exact: true })).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Open source Structure" }),
  ).toHaveCount(0);
  await tree.getByText("Base", { exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Open source Structure", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: /Icon position option$/ }),
  ).toHaveCount(0);
  await tree.getByText("Main structure", { exact: true }).click();
  await panel.getByRole("button", { name: /Indentation level$/ }).click();
  await page
    .getByRole("listbox", { name: "Indentation level", exact: true })
    .getByRole("option", { name: "2", exact: true })
    .click();
  await choose(page, "Indentation distance", "Large");
  await expect(preview).toHaveCSS("margin-inline-start", "48px");
  await choose(page, "Density", "Spacious");
  await expect(vertical).toHaveCSS("padding-top", "8px");
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  const permutations = page.locator(
    ".structurePermutation[data-size] .structurePreview:not([aria-hidden])",
  );
  await expect(permutations).toHaveCount(2);
  for (const permutation of await permutations.all()) {
    await expect(permutation).toHaveCSS("margin-inline-start", "48px");
    await expect(
      permutation.locator(
        `[data-structure-id="${named("Vertical padding").conceptId}"]`,
      ),
    ).toHaveCSS("padding-top", "8px");
    await expect(
      permutation.locator(
        `[data-structure-id="${named("Content layout").conceptId}"]`,
      ),
    ).toHaveCSS("padding-left", "0px");
  }
  expect(await working(page)).toEqual(before);
});

test("Parent variants save nested leaf differences without changing the layout or shared Base", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.addInitScript(
    ({ snapshot, key, version }) => {
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
    },
    {
      snapshot: encodeStructureSource(fixture),
      key: AUTHORING_STORAGE_KEY,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
  await openList(page);
  const before = await working(page);
  const panel = settings(page);
  await panel
    .getByRole("button", { name: "Add property", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Variant", exact: true }).click();
  const name = panel.getByRole("textbox", {
    name: "Variant name",
    exact: true,
  });
  await name.fill("Content arrangement");
  await name.press("Enter");
  await choose(page, "Content arrangement", "Option 2");
  const tree = page.getByRole("treegrid", { name: "Structure layers" });
  await tree.getByText("Selection indicator", { exact: true }).click();
  await expect(
    panel.getByRole("button", { name: /Content arrangement option$/ }),
  ).toBeVisible();
  const slot = panel.getByRole("textbox", { name: "Slot name", exact: true });
  await slot.fill("Selection target");
  await slot.press("Tab");
  await expect(
    tree.getByText("Selection target", { exact: true }),
  ).toBeVisible();
  await choose(page, "Content arrangement", "Default");
  await expect(
    tree.getByText("Selection indicator", { exact: true }),
  ).toBeVisible();
  const authored = await working(page);
  expect(
    authored.structures.structures.find(
      (item: { conceptId: string }) =>
        item.conceptId === named("Content start").conceptId,
    ),
  ).toEqual(
    before.structures.structures.find(
      (item: { conceptId: string }) =>
        item.conceptId === named("Content start").conceptId,
    ),
  );
  expect(
    authored.structures.structures.find(
      (item: { conceptId: string }) =>
        item.conceptId === named("Base").conceptId,
    ),
  ).toEqual(
    before.structures.structures.find(
      (item: { conceptId: string }) =>
        item.conceptId === named("Base").conceptId,
    ),
  );
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await openList(page);
  await choose(page, "Content arrangement", "Option 2");
  await expect(
    tree.getByText("Selection target", { exact: true }),
  ).toBeVisible();
});

test("Portable storage keeps local Booleans and Registry-backed metadata through Save and reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.addInitScript(
    ({ snapshot, key, version }) => {
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
    },
    {
      snapshot: encodeStructureSource(fixture),
      key: AUTHORING_STORAGE_KEY,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
  await openList(page);
  const before = await working(page);
  const panel = settings(page);
  await panel
    .getByRole("button", { name: "Add property", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Boolean", exact: true }).click();
  const boolean = panel.getByRole("textbox", {
    name: "Boolean name",
    exact: true,
  });
  await boolean.fill("Show tag");
  await boolean.press("Enter");
  const metadata = page.getByRole("region", {
    name: "Structure metadata and layers",
    exact: true,
  });
  const name = metadata.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Collection item");
  await name.press("Tab");
  await expect
    .poll(async () => {
      const source = await working(page);
      const structure = source.structures.structures.find(
        (item: { conceptId: string }) => item.conceptId === list.conceptId,
      );
      return source.taxonomy.terms
        .find((term: { id: string }) => term.id === structure.name.termId)
        ?.value.toLowerCase();
    })
    .toBe("collection item");
  const authored = await working(page);
  const source = authored.structures.structures.find(
    (item: { conceptId: string }) => item.conceptId === list.conceptId,
  );
  expect(authored.structures.schemaVersion).toBe(1);
  expect(source).not.toHaveProperty("editor");
  expect(source.name.categoryId).toBe("b07988e3-0510-4bf5-a531-86ea718b1003");
  expect(
    source.options.find(
      (option: { name: unknown }) => option.name === "Show tag",
    ),
  ).toMatchObject({ kind: "boolean", defaultValue: true });
  const previousGeneration = before.structures.structures.find(
    (item: { conceptId: string }) => item.conceptId === list.conceptId,
  ).generation;
  expect(previousGeneration.nameRef.termId).toBe(
    "8de84d9d-f5b9-41fb-a714-1a64e970aca1",
  );
  expect(source.generation.nameRef.termId).toBe(source.name.termId);
  expect(source.generation.applications).toEqual(
    previousGeneration.applications,
  );
  expect(source.generation.sizeTermIds).toEqual(previousGeneration.sizeTermIds);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await openList(page, "Collection item");
  await expect(
    metadata.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Collection item");
  await expect(
    page.getByRole("switch", { name: "Show tag", exact: true }),
  ).toBeVisible();
});
