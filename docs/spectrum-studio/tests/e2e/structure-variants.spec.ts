// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createStructureSnapshot } from "../fixtures/structures";
import { createElementFixture } from "../fixtures/structureElements";
import { createElement } from "../../src/features/structures/elements";
import {
  createBooleanProperty,
  createVariantProperty,
} from "../../src/features/option-groups/model";
import { emptyStructureEditor } from "../../src/features/structures/variants";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
} from "../../src/features/edit-session/storage";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

function fixture() {
  const snapshot = createStructureSnapshot();
  const structure = snapshot.structures!.structures[0];
  const icon = createElement("workflowIcon"),
    text = createElement("text");
  const propertyCategory = crypto.randomUUID(),
    optionCategory = crypto.randomUUID();
  const propertyTerm = crypto.randomUUID(),
    start = crypto.randomUUID(),
    end = crypto.randomUUID();
  for (const [id, key, name] of [
    [propertyCategory, "structureBehavior", "Structure behavior"],
    [optionCategory, "structurePlacement", "Structure placement"],
  ]) {
    snapshot.taxonomy!.categories.push({
      id,
      key,
      name,
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures"],
      required: false,
      includeInProjections: true,
    });
    snapshot.taxonomy!.order.push(id);
  }
  snapshot.taxonomy!.terms.push(
    {
      id: propertyTerm,
      categoryId: propertyCategory,
      value: "icon-placement",
      description: "",
    },
    {
      id: start,
      categoryId: optionCategory,
      value: "leading-icon",
      description: "",
    },
    {
      id: end,
      categoryId: optionCategory,
      value: "trailing-icon",
      description: "",
    },
  );
  const variant = createVariantProperty(
    "Icon position",
    { [propertyCategory]: propertyTerm },
    [
      { name: "Leading icon", classification: { [optionCategory]: start } },
      { name: "Trailing icon", classification: { [optionCategory]: end } },
    ],
  );
  const boolean = createBooleanProperty("Has icon");
  structure.elements = [icon, text];
  structure.editor = {
    ...emptyStructureEditor(),
    properties: [variant, boolean],
    visibilityBindings: {
      [icon.id]: { propertyId: boolean.id, inverted: false },
    },
    overrides: { [variant.options[1].id]: { order: [text.id, icon.id] } },
  };
  return { snapshot, structure, boolean, variant };
}
async function seed(
  page: Page,
  snapshot = fixture().snapshot,
  appearance = "light",
  editing = true,
) {
  await page.addInitScript(
    ({ snapshot, appearance, editing, version, key, preferences }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved: snapshot,
            isEditing: editing,
            attachments: {},
            savedAttachments: {},
          }),
        );
      if (!localStorage.getItem(preferences))
        localStorage.setItem(
          preferences,
          JSON.stringify({ version: 1, appearance, modeSelection: {} }),
        );
    },
    {
      snapshot,
      appearance,
      editing,
      version: AUTHORING_RECORD_VERSION,
      key: AUTHORING_STORAGE_KEY,
      preferences: PREFERENCES_STORAGE_KEY,
    },
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
}
async function select(page: Page) {
  const label = page
    .locator('[data-component="StructureCard"]')
    .first()
    .getByText("Example structure", { exact: true });
  await expect(label).toBeInViewport();
  expect((await label.boundingBox())!.width).toBeGreaterThan(80);
  await page.locator('[data-component="StructureCard"]').first().click();
  await expect(
    page.getByRole("region", { name: "Structure metadata and layers" }),
  ).toBeVisible();
}
async function working(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
}

for (const appearance of ["light", "dark"]) {
  test(`Structures previews, panels, preview-only switches and inline naming in ${appearance}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1800, height: 1000 });
    const data = fixture();
    await seed(page, data.snapshot, appearance);
    await expect(
      page.getByText("Select a structure to edit", { exact: true }),
    ).toBeVisible();
    await select(page);
    await expect(
      page.getByRole("treegrid", { name: "Structure layers" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "T-shirt sizes", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".structureVariantOption")).toHaveCount(2);
    const before = await working(page);
    const iconId = data.structure.elements![0].id;
    const icons = page.locator(
      `.structureVariantFrames .structurePreview:not([aria-hidden]) [data-element-id="${iconId}"]`,
    );
    await expect(icons).toHaveCount(2);
    await page.getByRole("switch", { name: "Has icon" }).press("Space");
    await expect(icons).toHaveCount(0);
    await expect.poll(() => working(page)).toEqual(before);
    await page
      .getByRole("switch", { name: "Has icon" })
      .locator("xpath=ancestor::label[1]")
      .click();
    await expect(icons).toHaveCount(2);
    await page.getByRole("button", { name: /Icon position option$/ }).click();
    await page
      .getByRole("option", { name: "Trailing icon", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Trailing icon", exact: true })
      .click();
    const optionName = page.getByRole("textbox", { name: "Option name" });
    await expect(optionName).toBeFocused();
    await optionName.press("Escape");
    await page
      .getByRole("button", { name: "Edit property Icon position", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Property name" }),
    ).toBeFocused();
    await page.getByRole("textbox", { name: "Property name" }).press("Escape");
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("An edited structure.");
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .press("Tab");
    await expect
      .poll(
        async () => (await working(page)).structures.structures[0].description,
      )
      .toBe("An edited structure.");
    await page
      .getByRole("button", { name: "Add property", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Boolean", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Add boolean",
      exact: true,
    });
    await dialog
      .getByRole("textbox", { name: "Boolean name", exact: true })
      .fill("Has badge");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "boolean option not used" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("alertdialog", { name: "Discard all edits?" })
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await expect(
      page
        .getByRole("banner")
        .getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).isEditing,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toBe(false);
    await page.reload();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: /^Design(?: |$)/ })
      .click();
    await page.locator('[data-component="StructureCard"]').first().click();
    await expect(page.getByRole("switch", { name: "Has badge" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add property", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("switch", { name: "Has icon" }).press("Space");
    await expect
      .poll(
        async () =>
          (await working(page)).structures.structures[0].editor.properties.find(
            (property: { id: string }) => property.id === data.boolean.id,
          ).defaultValue,
      )
      .toBe(true);
    await page.setViewportSize({ width: 1000, height: 800 });
    await page
      .getByRole("switch", { name: "Has icon" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByRole("switch", { name: "Has icon" })).toBeVisible();
    const propertyName = page.getByText("Icon position", { exact: true });
    const picker = page.getByRole("button", { name: /Icon position option$/ });
    await expect(propertyName).toBeInViewport();
    const labelBounds = await propertyName.boundingBox();
    const pickerBounds = await picker.boundingBox();
    expect(labelBounds!.width).toBeGreaterThan(60);
    expect(labelBounds!.x + labelBounds!.width).toBeLessThanOrEqual(
      pickerBounds!.x,
    );
    await page.screenshot({
      path: info.outputPath(`structures-${appearance}-narrow.png`),
    });
  });
}

test("Canvas Add copies an option using a confirmed new Registry term", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await seed(page);
  await select(page);
  await page.locator(".structureVariantFrames").hover();
  await page
    .getByRole("button", { name: "Add variant option", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add option", exact: true });
  await dialog.getByRole("button", { name: /Option category$/ }).click();
  await page
    .getByRole("option", { name: "Structure placement", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: "New option term", exact: true })
    .fill("middle-icon");
  await dialog
    .getByRole("button", { name: "Create Registry term", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".structureVariantOption")).toHaveCount(3);
  await expect
    .poll(async () =>
      (await working(page)).taxonomy.terms.some(
        (term: { value: string }) => term.value === "middle-icon",
      ),
    )
    .toBe(true);
});

test("No structures uses the requested illustrated empty message", async ({
  page,
}) => {
  const data = fixture().snapshot;
  data.structures!.structures = [];
  data.components!.components = [];
  await seed(page, data);
  await expect(
    page.getByText("Add a structure to begin", { exact: true }),
  ).toBeVisible();
});

test("Appearance reuses one control set for the selected visual and its constraints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  const data = fixture();
  const visual = createElement("visual");
  data.structure.elements!.push(visual);
  data.structure.editor!.overrides[data.variant.options[1].id].order!.push(
    visual.id,
  );
  await seed(page, data.snapshot);
  await select(page);
  const tree = page.getByRole("treegrid", { name: "Structure layers" });
  await tree
    .getByRole("row", { name: "Visual", exact: true })
    .getByText("Visual", { exact: true })
    .click();
  const controls = page.locator(
    '[data-component="StructureAppearanceControls"]',
  );
  await expect(controls).toHaveCount(1);
  const panel = page.getByRole("region", {
    name: "Structure properties and appearance",
  });
  await expect(
    panel.getByRole("button", { name: "Structure settings", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Delete element", exact: true }),
  ).toHaveCount(0);
  await expect(
    controls.getByRole("heading", { name: /^visual$/i }),
  ).toHaveCount(0);
  await expect(controls.getByRole("combobox")).toHaveCount(2);
  await expect(
    controls.getByRole("combobox", { name: "Width", exact: true }),
  ).toBeVisible();
  await expect(
    controls.getByRole("combobox", { name: "Height", exact: true }),
  ).toBeVisible();
  await controls
    .getByRole("button", { name: "Constraints", exact: true })
    .click();
  await expect(controls.getByRole("combobox")).toHaveCount(6);
  const token = createElementFixture().references.find(
    (reference) =>
      reference.family === "size" &&
      typeof reference.value === "number" &&
      reference.value > 64,
  )!;
  const minimum = controls.getByRole("combobox", {
    name: "Minimum width",
    exact: true,
  });
  await minimum.fill(token.name);
  await page.getByRole("option", { name: token.name, exact: true }).click();
  await expect
    .poll(
      async () =>
        (await working(page)).structures.structures[0].elements
          .find((element: { id: string }) => element.id === visual.id)
          .bindings.find(
            (binding: { slot: string }) => binding.slot === "minWidth",
          )?.$ref,
    )
    .toBe(token.id);
  await expect(
    page
      .locator(
        `.structureDesignStage [data-element-id="${visual.id}"] [data-element-kind="visual"]`,
      )
      .first(),
  ).toHaveCSS("min-width", `${token.value}px`);
  await tree
    .getByRole("row", { name: "Main structure", exact: true })
    .getByText("Main structure", { exact: true })
    .click();
  await expect(controls).toHaveCount(1);
  await expect(
    controls.getByRole("radiogroup", { name: "Direction", exact: true }),
  ).toBeVisible();
  await expect(
    controls.getByRole("combobox", { name: "Default size width", exact: true }),
  ).toBeVisible();
  await tree
    .getByRole("row", { name: "Text", exact: true })
    .getByText("Text", { exact: true })
    .click();
  await expect(controls.getByRole("combobox")).toHaveCount(2);
  await expect(
    controls.getByRole("combobox", { name: "Font size", exact: true }),
  ).toBeVisible();
  await expect(
    controls.getByRole("button", { name: "Constraints", exact: true }),
  ).toHaveCount(0);
});

test("Layers keep selection, saved visibility and boolean binding in sync", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  const data = fixture();
  await seed(page, data.snapshot);
  await select(page);
  const tree = page.getByRole("treegrid", { name: "Structure layers" });
  const text = tree.getByRole("row", { name: "Text", exact: true });
  await text.getByText("Text", { exact: true }).click();
  await expect(text).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Structure settings", exact: true }),
  ).toHaveCount(0);
  const appearance = page.locator(
    '[data-component="StructureAppearanceControls"]',
  );
  await expect(appearance).toHaveCount(1);
  await expect(
    appearance.getByRole("combobox", { name: "Font size" }),
  ).toBeVisible();
  await expect(appearance.getByRole("combobox", { name: "Width" })).toHaveCount(
    0,
  );
  await text.hover();
  await text.getByRole("button", { name: "Hide Text", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await working(page)).structures.structures[0].editor.visibility[
          data.structure.elements![1].id
        ],
    )
    .toBe(false);
  await text.getByRole("button", { name: "Show Text", exact: true }).click();
  await text
    .getByRole("button", { name: "Bind to a show/hide option" })
    .click();
  const binding = page.getByRole("dialog", { name: "Bind layer visibility" });
  await binding.getByRole("button", { name: /Boolean property$/ }).click();
  await page.getByRole("option", { name: "Has icon", exact: true }).click();
  await expect(
    binding.getByRole("checkbox", { name: "Invert visibility" }),
  ).toBeEnabled();
  await binding
    .getByRole("checkbox", { name: "Invert visibility" })
    .press("Space");
  await expect
    .poll(
      async () =>
        (await working(page)).structures.structures[0].editor
          .visibilityBindings[data.structure.elements![1].id]?.inverted,
    )
    .toBe(true);
  await binding.getByRole("button", { name: "Unbind", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await working(page)).structures.structures[0].editor
          .visibilityBindings[data.structure.elements![1].id],
    )
    .toBeUndefined();
  await page.keyboard.press("Escape");
  const drag = text.getByRole("button", { name: "Drag Text", exact: true });
  await drag.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () =>
      (await working(page)).structures.structures[0].elements.map(
        (element: { id: string }) => element.id,
      ),
    )
    .toEqual([data.structure.elements![1].id, data.structure.elements![0].id]);
});
