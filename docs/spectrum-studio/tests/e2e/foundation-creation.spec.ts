// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { ELEVATION_LAYER_MAX } from "../../src/features/elevation/model";
import { selectColorPanelSection } from "./colorPanelSection";

const errors = new WeakMap<Page, string[]>();
test.use({ viewport: { width: 1600, height: 1000 } });
test.setTimeout(90_000);
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  editing = true,
) {
  assertStoredSnapshot(snapshot);
  await page.addInitScript(
    ({ key, version, snapshot, editing }) => {
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
    },
    {
      key: AUTHORING_STORAGE_KEY,
      version: AUTHORING_RECORD_VERSION,
      snapshot,
      editing,
    },
  );
  await page.goto("/");
}
async function foundation(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name, exact: true }).click();
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function discard(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
}

for (const [tab, scope] of [
  ["Spacing", "spacing"],
  ["Size", "size"],
  ["Corner radius", "radius"],
] as const) {
  test(`${tab}: new cards go first, focus once, and preserve order through Save, Cancel and Undo`, async ({
    page,
  }) => {
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot);
    await foundation(page, tab);
    const add = page.getByRole("button", {
      name: `Add ${scope} scale`,
      exact: true,
    });
    await add.click();
    const cards = page.locator('[data-component="DimensionScaleCard"]');
    const name = cards
      .first()
      .getByRole("textbox", { name: "Name", exact: true });
    await expect(name).toBeFocused();
    await expect(name).toBeInViewport();
    await expect
      .poll(async () => (await record(page)).working[scope]!.scales.length)
      .toBe(snapshot[scope]!.scales.length + 1);
    const firstId = (await record(page)).working[scope]!.scales[0].id;
    await expect(cards.first()).toHaveAttribute(
      "data-dimension-scale",
      firstId,
    );
    await name.fill(`New ${scope}`);
    await name.press("Enter");
    const publishing = cards
      .first()
      .getByRole("checkbox", { name: "Hide from publishing", exact: true });
    await publishing.press("Space");
    await expect(publishing).toBeFocused();
    await expect(name).not.toBeFocused();
    await add.focus();
    if (scope === "spacing") {
      await cards
        .last()
        .getByRole("textbox", { name: "Name", exact: true })
        .scrollIntoViewIfNeeded();
      await expect(add).toBeFocused();
    }
    await page.keyboard.press("Enter");
    await expect(name).toBeFocused();
    await expect(name).toBeInViewport();
    await expect
      .poll(async () => (await record(page)).working[scope]!.scales.length)
      .toBe(snapshot[scope]!.scales.length + 2);
    const ordered = (await record(page)).working[scope]!.scales.map(
      (scale) => scale.id,
    );
    expect(ordered.slice(1)).toEqual([
      firstId,
      ...snapshot[scope]!.scales.map((scale) => scale.id),
    ]);
    const second = page.locator(`[data-dimension-scale="${firstId}"]`);
    await second
      .getByRole("button", {
        name: `Delete ${scope} scale New ${scope}`,
        exact: true,
      })
      .click();
    await expect(second).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect
      .poll(async () =>
        (await record(page)).working[scope]!.scales.map((scale) => scale.id),
      )
      .toEqual(ordered);
    await expect(
      second.getByRole("textbox", { name: "Name", exact: true }),
    ).not.toBeFocused();
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await page.reload();
    await foundation(page, tab);
    await expect(name).not.toBeFocused();
    expect(
      (await record(page)).saved[scope]!.scales.map((scale) => scale.id),
    ).toEqual(ordered);
    await add.click();
    await expect(name).toBeFocused();
    await discard(page);
    await expect
      .poll(async () =>
        (await record(page)).working[scope]!.scales.map((scale) => scale.id),
      )
      .toEqual(ordered);
  });
}

test("Color: creation opens the selected scale editor, focuses its name, and restores trigger focus on Escape", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  await seed(page, snapshot);
  await foundation(page, "Colors");
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("button", { name: "Add color scale", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: /^Edit color\d+ scale$/ });
  const name = dialog.getByRole("combobox", {
    name: "Color scale name",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(name).toBeFocused();
  await expect(name).toBeInViewport();
  await expect
    .poll(async () => (await record(page)).working.colorSystem.scales.length)
    .toBe(snapshot.colorSystem.scales.length + 1);
  const added = (await record(page)).working.colorSystem.scales[0];
  expect((await record(page)).working.colorSystem.scales.slice(1)).toEqual(
    snapshot.colorSystem.scales,
  );
  const trigger = page.getByRole("button", { name: added.name, exact: true });
  await expect(trigger).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Add color scale", exact: true })
    .press("Enter");
  await expect(name).toBeFocused();
  await expect
    .poll(async () => (await record(page)).working.colorSystem.scales.length)
    .toBe(snapshot.colorSystem.scales.length + 2);
  expect((await record(page)).working.colorSystem.scales[1].id).toBe(added.id);
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  await expect(page.locator('[data-view="analyze"]')).toBeVisible();
});

for (const kind of ["Sequential", "Diverging"]) {
  test(`Data vis ${kind}: creation inserts first and opens a name-focused editor`, async ({
    page,
  }) => {
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot);
    await foundation(page, "Colors");
    await selectColorPanelSection(page, "Data vis");
    await page
      .getByRole("button", { name: "Add data vis scale", exact: true })
      .click();
    await page.getByRole("menuitem", { name: kind, exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: new RegExp(`^Edit ${kind} \\d+ data vis scale$`),
    });
    const name = dialog.getByRole("combobox", {
      name: "Scale name",
      exact: true,
    });
    await expect(name).toBeFocused();
    await expect(name).toBeInViewport();
    await expect
      .poll(
        async () =>
          (await record(page)).working.colorSystem.dataVisScales.length,
      )
      .toBe(snapshot.colorSystem.dataVisScales.length + 1);
    const added = (await record(page)).working.colorSystem.dataVisScales[0];
    expect(added.kind).toBe(kind.toLowerCase());
    expect(
      (await record(page)).working.colorSystem.dataVisScales.slice(1),
    ).toEqual(snapshot.colorSystem.dataVisScales);
    const cards = page
      .locator('[data-component="DataVisPanel"]')
      .getByRole("region", { name: kind, exact: true })
      .getByRole("button", { name: /^Open .* data vis scale$/ });
    await expect(cards.first()).toHaveAccessibleName(
      `Open ${added.name} data vis scale`,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add data vis scale", exact: true }),
    ).toBeFocused();
  });
}

test("Categorical: draft appears first with name focus; Cancel discards it and Apply inserts first", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  await seed(page, snapshot);
  await foundation(page, "Colors");
  await selectColorPanelSection(page, "Data vis");
  const add = page.getByRole("button", {
    name: "Add data vis scale",
    exact: true,
  });
  await add.click();
  await page
    .getByRole("menuitem", { name: "Categorical", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "New categorical scale",
    exact: true,
  });
  const name = dialog.getByRole("textbox", { name: "Scale name", exact: true });
  await expect(name).toBeFocused();
  const panel = page.locator('[data-component="DataVisPanel"]');
  expect(
    await panel.evaluate((element) => {
      const draft = element
        .querySelector('[aria-label="New categorical scale"]')
        ?.closest("button");
      const existing = element.querySelector('button[aria-label^="Open "]');
      return (
        !!draft &&
        !!existing &&
        !!(
          draft.compareDocumentPosition(existing) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      );
    }),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await record(page)).working.colorSystem.dataVisScales).toEqual(
    snapshot.colorSystem.dataVisScales,
  );
  await add.click();
  await page
    .getByRole("menuitem", { name: "Categorical", exact: true })
    .click();
  await expect(name).toBeFocused();
  await name.fill("New category");
  const contrast = dialog.getByRole("textbox", {
    name: "Minimum background contrast",
    exact: true,
  });
  await contrast.fill("1");
  await contrast.press("Tab");
  const sources = dialog.getByRole("group", {
    name: "Available categorical source colors",
    exact: true,
  });
  await sources.getByRole("checkbox").first().press("Space");
  await expect(sources.getByRole("checkbox").first()).toBeChecked();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await record(page)).working.colorSystem.dataVisScales[0].name,
    )
    .toBe("New category");
  await expect(
    panel
      .getByRole("region", { name: "Categorical", exact: true })
      .getByRole("button", { name: /^Open .* data vis scale$/ })
      .first(),
  ).toHaveAccessibleName("Open New category data vis scale");
});

test("Typography: creation expands collapsed Line heights and focuses only the new first card", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  await seed(page, snapshot);
  await foundation(page, "Typography");
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  const section = panel.getByRole("button", {
    name: "Line heights",
    exact: true,
  });
  await expect(section).toHaveAttribute("aria-expanded", "false");
  await panel
    .getByRole("button", { name: "Add line height", exact: true })
    .click();
  await expect(section).toHaveAttribute("aria-expanded", "true");
  const cards = panel.locator('[data-component="LineHeightCard"]');
  const name = cards
    .first()
    .getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toBeFocused();
  await expect(name).toBeInViewport();
  await expect
    .poll(
      async () => (await record(page)).working.typography.lineHeights.length,
    )
    .toBe(snapshot.typography.lineHeights.length + 1);
  expect((await record(page)).working.typography.lineHeights.slice(1)).toEqual(
    snapshot.typography.lineHeights,
  );
  await section.click();
  await section.click();
  await expect(name).not.toBeFocused();
  await panel
    .getByRole("button", { name: "Add line height", exact: true })
    .press("Enter");
  await expect(name).toBeFocused();
  await expect
    .poll(
      async () => (await record(page)).working.typography.lineHeights.length,
    )
    .toBe(snapshot.typography.lineHeights.length + 2);
});

test("Elevation: new shadows focus their names without changing stacking or stealing focus on edits", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  await seed(page, snapshot);
  await foundation(page, "Elevation");
  const editor = page.locator('[data-component="ElevationEditor"]');
  await editor.getByRole("button", { name: "Add shadow", exact: true }).click();
  const names = editor.getByRole("textbox", {
    name: "Shadow name",
    exact: true,
  });
  await expect(names.last()).toBeFocused();
  await expect(names.last()).toBeInViewport();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers.length)
    .toBe(snapshot.elevation!.layers.length + 1);
  expect((await record(page)).working.elevation!.layers.slice(0, -1)).toEqual(
    snapshot.elevation!.layers,
  );
  const blur = editor
    .getByRole("textbox", { name: "Base blur (px)", exact: true })
    .last();
  await blur.fill("7");
  await blur.press("Enter");
  await expect(blur).toBeFocused();
  await expect(names.last()).not.toBeFocused();
});

test("Read-only foundations cannot create or auto-open new items", async ({
  page,
}) => {
  await seed(page, createDefaultSnapshot(), false);
  for (const tab of [
    "Spacing",
    "Size",
    "Corner radius",
    "Typography",
    "Elevation",
    "Colors",
  ]) {
    await foundation(page, tab);
    if (tab === "Colors") await selectColorPanelSection(page, "Color scales");
    await expect(
      page.getByRole("button", {
        name: /^Add (spacing scale|size scale|radius scale|line height|shadow|color scale)$/,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("The shadow limit prevents creation without changing focus or the existing stack", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  snapshot.elevation!.layers = Array.from(
    { length: ELEVATION_LAYER_MAX },
    (_, index) => ({
      ...snapshot.elevation!.layers[0],
      id: index === 0 ? snapshot.elevation!.layers[0].id : crypto.randomUUID(),
      label: `Shadow ${index + 1}`,
    }),
  );
  await seed(page, snapshot);
  await foundation(page, "Elevation");
  const editor = page.locator('[data-component="ElevationEditor"]');
  const name = editor
    .getByRole("textbox", { name: "Shadow name", exact: true })
    .first();
  await name.focus();
  await expect(
    editor.getByRole("button", { name: "Add shadow", exact: true }),
  ).toBeDisabled();
  await expect(name).toBeFocused();
  expect((await record(page)).working.elevation!.layers).toEqual(
    snapshot.elevation!.layers,
  );
});
