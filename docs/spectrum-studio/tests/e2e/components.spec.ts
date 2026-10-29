// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
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
import { componentTokenCatalog } from "../../src/features/components/references";

test.setTimeout(90_000);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(10_000);
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function start(page: Page, editing = true, width = 1600) {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(
    ({ key, preferences, snapshot, version, editing }) => {
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
      snapshot: createDefaultSnapshot(),
      version: AUTHORING_RECORD_VERSION,
      editing,
    },
  );
  await page.goto("/");
  await openComponents(page);
  if (width < 800) {
    await page.getByRole("button", { name: /^Change log/ }).click();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Collapse", exact: true })
      .click();
  }
}
async function openComponents(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Components(?: |$)/ })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Component catalog" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-component="ComponentDataView"]'),
  ).toBeVisible();
}
async function section(page: Page, name: string) {
  const tab = page.getByRole("tab", { name, exact: true });
  if (await tab.isVisible()) await tab.click();
  else {
    await page.getByRole("button", { name: /Component sections/ }).click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
}
async function menu(page: Page) {
  await page
    .getByRole("complementary", { name: "Component catalog" })
    .getByRole("row", { name: /^Menu(?: |$)/ })
    .click();
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
async function addHeight(page: Page) {
  await page.getByRole("button", { name: "Add property", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add property assignment" });
  await dialog.getByRole("button", { name: / Property$/ }).click();
  await page.getByRole("option", { name: /^height$/i }).click();
  const value = dialog.getByRole("combobox", { name: /^Value(?: |$)/ });
  await value.fill("32px");
  await page
    .getByRole("option", { name: "Use this value", exact: true })
    .click();
  await value.press("Tab");
  return dialog;
}
test("Shipped Action Button and Menu show complete declarations without read-only editing", async ({
  page,
}, info) => {
  await start(page, false);
  await expect(
    page.getByRole("button", { name: "Add component", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Display name", exact: true }),
  ).toHaveCount(0);
  await menu(page);
  await section(page, "Parts");
  await expect(
    page.getByRole("grid", { name: "parts declarations" }),
  ).toHaveAttribute("aria-rowcount", "12");
  await expect(
    page.getByRole("button", { name: /Add part|Delete part/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Drag / })).toHaveCount(0);
  await section(page, "Options");
  await expect(
    page.getByRole("grid", { name: "options declarations" }),
  ).toHaveAttribute("aria-rowcount", "13");
  await section(page, "States");
  await expect(
    page.getByRole("grid", { name: "states declarations" }),
  ).toHaveAttribute("aria-rowcount", "6");
  await section(page, "Properties");
  await expect(
    page.getByRole("button", { name: /^Edit property|^Drag / }),
  ).toHaveCount(0);
  await page.locator('[data-component="Components"]').screenshot({
    path: info.outputPath("component-readonly-desktop.png"),
    animations: "disabled",
  });
});
test("Property literals require explicit acceptance, retain UUIDs and survive Save/reload/Cancel", async ({
  page,
}) => {
  await start(page);
  const before = (await record(page)).working.components!;
  await section(page, "Properties");
  await page
    .getByRole("button", {
      name: "Edit property height whole component",
      exact: true,
    })
    .first()
    .click();
  const form = page.getByRole("form", { name: "Edit property assignment" });
  const dialog = page.getByRole("dialog", { name: "Edit property assignment" });
  const input = form.getByRole("combobox", { name: /^Value(?: |$)/ });
  await input.focus();
  await expect(input).toBeFocused();
  await input.fill("invalid");
  await page.getByRole("option", { name: /Use this value/ }).click();
  await expect(form).toContainText("Enter a non-negative length");
  await input.fill("32px");
  await input.press("Tab");
  await form.getByRole("textbox", { name: "Description", exact: true }).click();
  expect((await record(page)).working.components).toEqual(before);
  await input.focus();
  await input.fill("");
  await input.fill("32px");
  await expect(
    page.getByRole("option", { name: "Use this value", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("option", { name: "Use this value", exact: true })
    .click();
  await input.press("Tab");
  await form
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Authored component height");
  await dialog
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[0].assignments[0]
          .value,
    )
    .toBe("32px");
  const applied = (await record(page)).working.components!.components[0]
    .assignments[0];
  expect(applied.id).toBe(before.components[0].assignments[0].id);
  expect("$ref" in applied).toBe(false);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).saved.components!.components[0].assignments[0]
          .description,
    )
    .toBe("Authored component height");
  await page.reload();
  await openComponents(page);
  await section(page, "Properties");
  await page
    .getByRole("button", {
      name: "Edit property height whole component",
      exact: true,
    })
    .first()
    .click();
  await dialog
    .getByRole("button", { name: "Cancel changes", exact: true })
    .click();
  expect(
    (await record(page)).working.components!.components[0].assignments[0],
  ).toEqual(applied);
  await section(page, "Definitions");
  await page
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Temporary name");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await discard(page);
  await expect(
    page.getByRole("heading", {
      name: before.components[0].declaration.displayName,
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (await record(page)).saved.components!.components[0].assignments[0],
  ).toEqual(applied);
});
test("Menu part/state edits preserve owned identities and block removing used parts", async ({
  page,
}) => {
  await start(page);
  const before = (await record(page)).working.components!.components[1];
  await menu(page);
  await section(page, "Parts");
  await page
    .getByRole("button", { name: "Edit part label", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Part name", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Part name", exact: true })
    .fill("caption");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].identities.parts
          .caption,
    )
    .toBe(before.identities.parts.label);
  await page
    .getByRole("button", { name: "Delete part caption", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    /unavailable|used by|Contains/i,
  );
  await section(page, "States");
  await page
    .getByRole("button", { name: "Edit state hover", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "State name", exact: true })
    .fill("pointer-hover");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].identities
          .states["pointer-hover"],
    )
    .toBe(before.identities.states.hover);
  const after = (await record(page)).working.components!.components[1];
  expect(after.assignments.map((row) => row.id)).toEqual(
    before.assignments.map((row) => row.id),
  );
  expect(
    after.assignments.some((row) =>
      row.options?.state?.includes("pointer-hover"),
    ),
  ).toBe(true);
  await discard(page);
  expect((await record(page)).working.components!.components[1]).toEqual(
    before,
  );
});
test("Published references retain required contexts and switch explicitly to literals", async ({
  page,
}, info) => {
  await start(page);
  const before = (await record(page)).working.components!;
  const target = componentTokenCatalog(createDefaultSnapshot()).find(
    (token) => token.property === "color" && Object.keys(token.context).length,
  )!;
  await section(page, "Properties");
  await page.getByRole("button", { name: "Add property", exact: true }).click();
  const form = page.getByRole("form", { name: "Add property assignment" });
  const dialog = page.getByRole("dialog", { name: "Add property assignment" });
  await form.getByRole("button", { name: / Property$/ }).click();
  await page.getByRole("option", { name: /^color$/i }).click();
  await dialog
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("Accept a value");
  expect((await record(page)).working.components).toEqual(before);
  const input = form.getByRole("combobox", { name: /^Value(?: |$)/ });
  await input.fill(target.name);
  const description = `${target.displayValue} (${Object.entries(target.context)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")})`;
  await page
    .getByRole("option", { name: target.name, exact: true })
    .filter({
      has: page.getByText(description, { exact: true }),
    })
    .click();
  await input.press("Tab");
  const condition = form
    .getByRole("textbox", { name: "Condition value", exact: true })
    .first();
  const required = String(Object.values(target.context)[0]);
  await expect(condition).toHaveValue(required);
  await condition.fill("other-context");
  await dialog
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("this token requires");
  expect((await record(page)).working.components).toEqual(before);
  await condition.fill(required);
  await form
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Authored context-aware reference");
  const conditionBounds = await form
    .getByRole("textbox", { name: "Condition name", exact: true })
    .first()
    .boundingBox();
  expect(conditionBounds!.width).toBeGreaterThan(200);
  await dialog.screenshot({
    path: info.outputPath("component-reference-form.png"),
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[0].assignments.at(
          -1,
        )!.$ref,
    )
    .toBe(target.id);
  const linked = (
    await record(page)
  ).working.components!.components[0].assignments.at(-1)!;
  expect(linked.options).toMatchObject(
    Object.fromEntries(
      Object.entries(target.context).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  );
  expect("value" in linked).toBe(false);
  await page
    .getByRole("row")
    .filter({ hasText: "Authored context-aware reference" })
    .getByRole("button", {
      name: "Edit property color whole component",
      exact: true,
    })
    .click();
  const edit = page.getByRole("form", { name: "Edit property assignment" });
  const value = edit.getByRole("combobox", { name: /^Value(?: |$)/ });
  await value.focus();
  await value.fill("rgb(5, 10, 15)");
  await page
    .getByRole("option", { name: "Use this value", exact: true })
    .click();
  await value.press("Tab");
  await page
    .getByRole("dialog", { name: "Edit property assignment" })
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[0].assignments.at(
          -1,
        )!.value,
    )
    .toBe("rgb(5, 10, 15)");
  const literal = (
    await record(page)
  ).working.components!.components[0].assignments.at(-1)!;
  expect(literal.id).toBe(linked.id);
  expect("$ref" in literal).toBe(false);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .click();
  const count =
    before.components.reduce(
      (total, component) => total + component.assignments.length,
      0,
    ) + 1;
  await expect(
    page.getByText(
      `${count} component property references protect their Registry terms. These authoring dependencies do not add generated tokens.`,
      { exact: true },
    ),
  ).toBeVisible();
  await discard(page);
  expect((await record(page)).working.components).toEqual(before);
});
test("New component forms remain drafts until valid and narrow fields remain usable", async ({
  page,
}, info) => {
  await start(page, true, 390);
  const before = (await record(page)).working.components!;
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add component",
    exact: true,
  });
  const form = dialog.getByRole("form", {
    name: "Component definition",
    exact: true,
  });
  await expect(
    form.getByRole("textbox", { name: "Display name", exact: true }),
  ).toBeFocused();
  await form
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Example control");
  expect((await record(page)).working.components).toEqual(before);
  await dialog
    .getByRole("button", { name: "Cancel changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await form
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Example control");
  await form
    .getByRole("textbox", { name: "Documentation URI", exact: true })
    .fill("https://example.com/control");
  const inputBounds = await form
    .getByRole("textbox", { name: "Display name", exact: true })
    .boundingBox();
  expect(inputBounds!.width).toBeGreaterThan(150);
  expect((await form.boundingBox())!.width).toBeLessThanOrEqual(390);
  await dialog.screenshot({
    path: info.outputPath("component-narrow-form.png"),
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await expect
    .poll(
      async () => (await record(page)).working.components!.components.length,
    )
    .toBe(3);
  const bounds = await page
    .locator('[data-component="Components"]')
    .boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.locator('[data-component="Components"]').screenshot({
    path: info.outputPath("component-narrow.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await openComponents(page);
  expect(
    (await record(page)).saved.components!.components[0].declaration.name,
  ).toBe("example-control");
});
test("Grouped selection, draft navigation and generated machine names preserve identities", async ({
  page,
}) => {
  await start(page);
  const before = (await record(page)).working.components!;
  const catalog = page.getByRole("complementary", {
    name: "Component catalog",
  });
  const tabs = page
    .getByRole("tablist", { name: "Component sections" })
    .getByRole("tab");
  await expect(tabs).toHaveText([
    "Definitions",
    "Parts",
    "Properties",
    "Options",
    "States",
  ]);
  for (const tab of await tabs.all())
    await expect(tab.locator("svg")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Edit definition", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Machine name", exact: true }),
  ).toHaveCount(0);
  const search = catalog.getByRole("searchbox", { name: "Find components" });
  await search.fill("Body");
  await catalog.getByRole("row").filter({ hasText: "Body" }).click();
  await expect(
    page.getByRole("heading", { name: "Body", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add component data", exact: true }),
  ).toBeVisible();
  await expect(catalog.getByRole("row", { selected: true })).toHaveCount(1);
  await search.fill("");
  await catalog
    .getByRole("row", { name: "Action button", exact: true })
    .click();
  const form = page.getByRole("form", {
    name: "Component definition",
    exact: true,
  });
  const name = form.getByRole("textbox", { name: "Display name", exact: true });
  await name.fill("Unapplied name");
  await section(page, "Parts");
  await section(page, "Definitions");
  await expect(name).toHaveValue("Unapplied name");
  await menu(page);
  const discard = page.getByRole("alertdialog", {
    name: "Discard unapplied changes?",
  });
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(name).toHaveValue("Unapplied name");
  await menu(page);
  await discard.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page
      .locator('[data-component="ComponentDataView"]')
      .getByRole("heading", { name: "Menu", exact: true }),
  ).toBeVisible();
  await catalog
    .getByRole("row", { name: "Action button", exact: true })
    .click();
  await name.fill("Menu");
  await form.getByRole("button", { name: "Apply changes" }).click();
  await expect(form.getByRole("alert")).toContainText(/Duplicate/);
  expect((await record(page)).working.components).toEqual(before);
  await name.fill("ActionButton / quiet");
  await expect(
    form.getByText("action-button-quiet", { exact: true }),
  ).toBeVisible();
  await form.getByRole("button", { name: "Apply changes" }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[0].declaration.name,
    )
    .toBe("action-button-quiet");
  const after = (await record(page)).working.components!.components[0];
  expect(after.id).toBe(before.components[0].id);
  expect(after.declaration.$id).toBe(before.components[0].declaration.$id);
  expect(after.identities).toEqual(before.components[0].identities);
  expect(after.assignments).toEqual(before.components[0].assignments);
});
test("Public keyboard drag reorders all collections and selected states without changing identities", async ({
  page,
}) => {
  await start(page);
  await menu(page);
  const before = (await record(page)).working.components!.components[1];
  for (const kind of ["parts", "options", "states", "properties"] as const) {
    await section(page, kind[0].toUpperCase() + kind.slice(1));
    const grid = page.getByRole("grid", {
      name:
        kind === "properties" ? "Property assignments" : `${kind} declarations`,
    });
    const original =
      kind === "properties"
        ? before.assignments.map((row) => row.id)
        : kind === "options"
          ? before.optionOrder
          : (kind === "parts"
              ? before.declaration.anatomy!
              : before.declaration.states!
            ).map((entry) => before.identities[kind][entry.name]);
    const order = async () => {
      const current = (await record(page)).working.components!.components[1];
      return kind === "properties"
        ? current.assignments.map((row) => row.id)
        : kind === "options"
          ? current.optionOrder
          : (kind === "parts"
              ? current.declaration.anatomy!
              : current.declaration.states!
            ).map((entry) => current.identities[kind][entry.name]);
    };
    const handle = grid.getByRole("button", { name: /^Drag / }).nth(1);
    await handle.focus();
    await page.keyboard.press("Enter");
    await expect(grid.locator('[data-dragging="true"]')).toHaveCount(1);
    await expect(
      grid.locator('[aria-roledescription="drop indicator"]:focus'),
    ).toHaveCount(1);
    await page.keyboard.press("ArrowUp");
    await expect(
      grid.getByRole("button", { name: /^Insert before / }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(grid.locator('[data-dragging="true"]')).toHaveCount(0);
    expect(await order()).toEqual(original);
    await handle.focus();
    await page.keyboard.press("Enter");
    await expect(grid.locator('[data-dragging="true"]')).toHaveCount(1);
    await expect(
      grid.locator('[aria-roledescription="drop indicator"]:focus'),
    ).toHaveCount(1);
    await page.keyboard.press("ArrowUp");
    await expect(
      grid.getByRole("button", { name: /^Insert before / }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(grid.locator('[data-dragging="true"]')).toHaveCount(0);
    await expect
      .poll(order)
      .toEqual([original[1], original[0], ...original.slice(2)]);
  }
  const dialog = await addHeight(page);
  const states = before.declaration
    .states!.slice(0, 2)
    .map((state) => state.name);
  for (const name of states) {
    const checkbox = dialog.getByRole("checkbox", { name, exact: true });
    await dialog
      .locator("label")
      .filter({ has: page.getByRole("checkbox", { name, exact: true }) })
      .click();
    await expect(checkbox).toBeChecked();
  }
  const stateOrder = dialog.getByRole("grid", { name: "Selected state order" });
  await stateOrder
    .getByRole("button", { name: `Drag ${states[1]}`, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(stateOrder.locator('[data-dragging="true"]')).toHaveCount(1);
  await expect(
    stateOrder.locator('[aria-roledescription="drop indicator"]:focus'),
  ).toHaveCount(1);
  await page.keyboard.press("ArrowUp");
  await expect(
    stateOrder.getByRole("button", { name: /^Insert before / }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(stateOrder.locator('[data-dragging="true"]')).toHaveCount(0);
  await expect(stateOrder.getByRole("rowheader")).toHaveText([
    states[1],
    states[0],
  ]);
  expect(
    (await record(page)).working.components!.components[1].assignments,
  ).toHaveLength(before.assignments.length);
  await dialog
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].assignments
          .length,
    )
    .toBe(before.assignments.length + 1);
  expect(
    (await record(page)).working.components!.components[1].assignments.at(-1)!
      .options!.state,
  ).toEqual([states[1], states[0]]);
  expect(
    (await record(page)).working.components!.components[1].identities,
  ).toEqual(before.identities);
  const reordered = (await record(page)).working.components;
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await openComponents(page);
  expect((await record(page)).saved.components).toEqual(reordered);
});
test("Pointer drag reorders all collections and dialog Escape returns focus without saving", async ({
  page,
}) => {
  await start(page);
  await menu(page);
  await section(page, "Parts");
  const before = (await record(page)).working.components!.components[1];
  const names = before.declaration.anatomy!.map((part) => part.name);
  const grid = page.getByRole("grid", { name: "parts declarations" });
  const source = grid.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: names[1], exact: true }),
  });
  const target = grid.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: names[2], exact: true }),
  });
  await source.dragTo(target, {
    sourcePosition: { x: 110, y: 18 },
    targetPosition: { x: 110, y: 30 },
  });
  await expect
    .poll(async () =>
      (
        await record(page)
      ).working.components!.components[1].declaration.anatomy!.map(
        (part) => part.name,
      ),
    )
    .toEqual([names[0], names[2], names[1], ...names.slice(3)]);
  const edit = page.getByRole("button", {
    name: `Edit part ${names[1]}`,
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog", { name: "Edit part", exact: true });
  await dialog
    .getByRole("textbox", { name: "Part name" })
    .fill("Canceled part name");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect(
    (await record(page)).working.components!.components[1].identities,
  ).toEqual(before.identities);
  for (const kind of ["options", "states", "properties"] as const) {
    await section(page, kind[0].toUpperCase() + kind.slice(1));
    const grid = page.getByRole("grid", {
      name:
        kind === "properties" ? "Property assignments" : `${kind} declarations`,
    });
    const order = async () => {
      const current = (await record(page)).working.components!.components[1];
      return kind === "properties"
        ? current.assignments.map((row) => row.id)
        : kind === "options"
          ? current.optionOrder
          : current.declaration.states!.map(
              (state) => current.identities.states[state.name],
            );
    };
    const original = await order();
    await grid
      .getByRole("row")
      .nth(2)
      .dragTo(grid.getByRole("row").nth(3), {
        sourcePosition: { x: 110, y: 18 },
        targetPosition: { x: 110, y: 30 },
      });
    await expect
      .poll(order)
      .toEqual([original[0], original[2], original[1], ...original.slice(3)]);
  }
  const property = await addHeight(page);
  const states = before.declaration
    .states!.slice(0, 3)
    .map((state) => state.name);
  for (const name of states) {
    await property
      .locator("label")
      .filter({ has: page.getByRole("checkbox", { name, exact: true }) })
      .click();
    await expect(
      property.getByRole("checkbox", { name, exact: true }),
    ).toBeChecked();
  }
  const selected = property.getByRole("grid", { name: "Selected state order" });
  await selected
    .getByRole("row")
    .nth(2)
    .dragTo(selected.getByRole("row").nth(3), {
      sourcePosition: { x: 110, y: 18 },
      targetPosition: { x: 110, y: 30 },
    });
  const expected = [states[0], states[2], states[1]];
  await expect(selected.getByRole("rowheader")).toHaveText(expected);
  await property
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].assignments
          .length,
    )
    .toBe(before.assignments.length + 1);
  expect(
    (await record(page)).working.components!.components[1].assignments.at(-1)!
      .options!.state,
  ).toEqual(expected);
  expect(
    (await record(page)).working.components!.components[1].identities,
  ).toEqual(before.identities);
});
test("Changes resets option order precisely and invalidates an unapplied definition draft", async ({
  page,
}) => {
  await start(page);
  await menu(page);
  await section(page, "Options");
  const before = (await record(page)).working.components!.components[1];
  await page
    .getByRole("grid", { name: "options declarations" })
    .getByRole("button", { name: /^Drag / })
    .nth(1)
    .focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].optionOrder,
    )
    .toEqual([
      before.optionOrder[1],
      before.optionOrder[0],
      ...before.optionOrder.slice(2),
    ]);
  await section(page, "Definitions");
  const form = page.getByRole("form", {
    name: "Component definition",
    exact: true,
  });
  await form
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Keep this applied definition edit.");
  await form
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].declaration
          .description,
    )
    .toBe("Keep this applied definition edit.");
  await form
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Discard this unapplied draft");
  const changes = page.locator('[data-component="ChangelogPanel"]');
  await changes.getByRole("tab", { name: "Log", exact: true }).click();
  await changes
    .getByRole("button", { name: "Reset Option order", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.components!.components[1].optionOrder,
    )
    .toEqual(before.optionOrder);
  await expect(
    form.getByRole("textbox", { name: "Display name", exact: true }),
  ).toHaveValue(before.declaration.displayName);
  await expect(
    form.getByRole("textbox", { name: "Description", exact: true }),
  ).toHaveValue("Keep this applied definition edit.");
  expect(
    (await record(page)).working.components!.components[1].identities,
  ).toEqual(before.identities);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await openComponents(page);
  expect(
    (await record(page)).saved.components!.components[1].optionOrder,
  ).toEqual(before.optionOrder);
  expect(
    (await record(page)).saved.components!.components[1].declaration
      .description,
  ).toBe("Keep this applied definition edit.");
});
