// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import {
  assignStructure,
  structureSelection,
  type StructureSlot,
} from "../../src/features/structures/model";
import { primitiveReferencesAtom } from "../../src/features/tokens/primitiveReferenceState";
import type { PrimitiveReference } from "../../src/features/tokens/primitiveReferences";
import {
  addSizeScaleAtom,
  sizeDocumentAtom,
} from "../../src/features/size/state";
import {
  addSpacingScaleAtom,
  spacingDocumentAtom,
} from "../../src/features/spacing/state";
import {
  addRadiusScaleAtom,
  radiusDocumentAtom,
} from "../../src/features/radius/state";
import {
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERM_IDS,
} from "../../src/features/structures/vocabulary";
import { createElement } from "../../src/features/structures/elements";
import { createStructureSnapshot as withStructure } from "../fixtures/structures";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

function catalog(snapshot = createDefaultSnapshot()) {
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, snapshot);
  return store.get(primitiveReferencesAtom);
}
async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  editing = true,
  saved = snapshot,
) {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.addInitScript(
    ({ key, preferences, snapshot, saved, editing, version }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved,
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
      snapshot,
      saved,
      editing,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
}
async function openDesign(page: Page, select = true) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await expect(
    page.getByRole("radio", { name: "Design", exact: true }),
  ).toBeChecked();
  if (select) {
    const first = page.locator('[data-component="StructureCard"]').first();
    await expect(first).toBeVisible();
    await first.click({ position: { x: 4, y: 4 } });
    await expect(
      page.getByRole("region", { name: /^Structure settings for/ }),
    ).toBeVisible();
  }
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function choose(
  page: Page,
  field: Locator,
  option: PrimitiveReference | "Hug" | "Fill",
  slots: readonly StructureSlot[],
) {
  await field.scrollIntoViewIfNeeded();
  await field.focus();
  await field.fill(typeof option === "string" ? option : option.name);
  const selected =
    typeof option === "string"
      ? page.getByRole("option", { name: option, exact: true })
      : page
          .getByRole("option")
          .filter({ has: page.getByTitle(option.name, { exact: true }) });
  await expect(selected).toBeVisible();
  await selected.click();
  await field.press("Tab");
  const selection =
    typeof option === "string"
      ? { value: { kind: "sizing", preset: option.toLowerCase() } }
      : { $ref: option.id };
  await expect
    .poll(async () => {
      const structure = (await record(page)).working.structures!.structures[0];
      return slots.map((slot) => structureSelection(structure, slot));
    })
    .toEqual(slots.map(() => selection));
}
const settings = (page: Page) =>
  page.getByRole("region", { name: /^Structure settings for/ });
const field = (page: Page, name: string) =>
  settings(page).getByRole("combobox", { name: new RegExp(`^${name}(?: |$)`) });

for (const { label, family, slot, individual } of [
  {
    label: "Padding",
    family: "spacing",
    slot: "paddingTop",
    individual: "Top padding",
  },
  {
    label: "Corner radius",
    family: "radius",
    slot: "radiusTopLeft",
    individual: "Top left corner radius",
  },
] as const) {
  test(`${label} individual menus show all tokens on their first opening`, async ({
    page,
  }) => {
    const snapshot = withStructure();
    const references = catalog(snapshot).filter(
      (item) => item.family === family,
    );
    const selected = references.find((item) => item.index === 0)!;
    const slots =
      family === "spacing"
        ? ([
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
          ] as const)
        : ([
            "radiusTopLeft",
            "radiusTopRight",
            "radiusBottomRight",
            "radiusBottomLeft",
          ] as const);
    snapshot.structures!.structures[0] = assignStructure(
      snapshot.structures!.structures[0],
      Object.fromEntries(slots.map((key) => [key, { $ref: selected.id }])),
    );
    await seed(page, snapshot);
    await openDesign(page);
    const before = (await record(page)).working.structures;
    const toggle = settings(page).getByRole("button", {
      name: `Use individual ${label.toLowerCase()} values`,
      exact: true,
    });
    await toggle.click();
    const input = field(page, individual);
    const control = input.locator(
      'xpath=ancestor::*[@data-component="TokenComboBox"]',
    );
    await control.locator('button[aria-haspopup="listbox"]').click();
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "aria-setsize",
      String(references.length),
    );
    expect(
      (await page.getByRole("listbox").boundingBox())!.width,
    ).toBeGreaterThanOrEqual((await control.boundingBox())!.width);
    await expect
      .poll(() =>
        page
          .getByRole("listbox")
          .locator(".tokenNameTag")
          .evaluateAll((tags) =>
            tags.every((tag) => tag.scrollWidth <= tag.clientWidth),
          ),
      )
      .toBe(true);
    await input.fill(selected.name);
    await expect(
      page
        .getByRole("option")
        .filter({ has: page.getByTitle(selected.name, { exact: true }) }),
    ).toBeVisible();
    expect(await page.getByRole("option").count()).toBeLessThan(
      references.length,
    );
    await input.press("Escape");
    await input.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await toggle.click();
    await toggle.click();
    await input.focus();
    await input.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute(
      "aria-setsize",
      String(references.length),
    );
    await input.press("Escape");
    await input.press("Tab");
    expect((await record(page)).working.structures).toEqual(before);
    expect(
      structureSelection(
        (await record(page)).working.structures!.structures[0],
        slot,
      ),
    ).toEqual({ $ref: selected.id });
  });
}

test("Structure cards support focused creation, names, native selection, Delete/Undo and read-only inspection", async ({
  page,
}) => {
  const empty = createDefaultSnapshot();
  empty.structures!.structures = [];
  await seed(page, empty, false);
  await openDesign(page, false);
  await expect(
    page.getByRole("button", { name: "Add structure", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add structure", exact: true })
    .click();
  const first = page.locator('[data-component="StructureCard"]').first();
  const name = first.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toBeFocused();
  await name.fill("Card structure");
  await name.press("Enter");
  await expect
    .poll(
      async () => (await record(page)).working.structures!.structures[0]?.name,
    )
    .toBe("Card structure");
  const original = (await record(page)).working.structures!.structures[0];
  expect(original.properties).toHaveLength(4);
  await name.fill("");
  await name.press("Tab");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect((await record(page)).working.structures!.structures[0].name).toBe(
    "Card structure",
  );
  await name.fill("Card structure");
  await name.press("Tab");
  await page
    .getByRole("button", { name: "Add structure", exact: true })
    .click();
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(2);
  await expect
    .poll(
      async () => (await record(page)).working.structures!.structures.length,
    )
    .toBe(2);
  const second = (await record(page)).working.structures!.structures[1];
  await first.click({ position: { x: 4, y: 4 } });
  await expect(settings(page)).toHaveAttribute(
    "aria-label",
    "Structure settings for Card structure",
  );
  const firstRow = first.locator('xpath=ancestor::*[@role="row"]');
  await firstRow.focus();
  await firstRow.press("ArrowDown");
  await expect(settings(page)).toHaveAttribute(
    "aria-label",
    `Structure settings for ${second.name}`,
  );
  await page
    .getByRole("button", {
      name: "Delete structure Card structure",
      exact: true,
    })
    .click();
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(1);
  await expect(settings(page)).toHaveAttribute(
    "aria-label",
    `Structure settings for ${second.name}`,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(2);
  await expect
    .poll(
      async () => (await record(page)).working.structures!.structures.length,
    )
    .toBe(2);
  expect((await record(page)).working.structures!.structures[0]).toEqual(
    original,
  );
  expect((await record(page)).working.structures!.structures[1].conceptId).toBe(
    second.conceptId,
  );
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add structure", exact: true }),
  ).toHaveCount(0);
  await first.click({ position: { x: 4, y: 4 } });
  await expect(name).toHaveAttribute("readonly", "");
  await expect(field(page, "Default size width")).toBeDisabled();
  await settings(page)
    .getByRole("radio", { name: "Values", exact: true })
    .click();
  await settings(page)
    .getByRole("button", { name: "Use individual padding values", exact: true })
    .click();
  await expect(field(page, "Top padding")).toBeDisabled();
});

test("Every layout field binds live tokens, hidden choices, shared/Mixed values and exact preview CSS", async ({
  page,
}, info) => {
  const snapshot = withStructure();
  snapshot.structures!.structures[0].elements = [
    createElement("visual"),
    createElement("visual"),
  ];
  const references = catalog(snapshot);
  const size = references.filter((item) => item.family === "size").at(-1)!;
  const gap = references.find(
    (item) => item.family === "spacing" && item.hidden && item.index === 0,
  )!;
  const padding = references.find(
    (item) => item.family === "spacing" && !item.hidden && item.index === 0,
  )!;
  const otherPadding = references.find(
    (item) =>
      item.family === "spacing" &&
      item.id !== padding.id &&
      item.value !== padding.value,
  )!;
  const radius = references.find(
    (item) => item.family === "radius" && item.index === 0,
  )!;
  const otherRadius = references.find(
    (item) => item.family === "radius" && item.index === 1,
  )!;
  const elevation = references.find(
    (item) => item.family === "elevation" && item.index === 1,
  )!;
  await seed(page, snapshot);
  await openDesign(page);
  const showAs = settings(page).getByRole("radiogroup", {
    name: "Show as",
    exact: true,
  });
  const showAsWidths = await showAs
    .getByRole("radio")
    .evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().width),
    );
  expect(showAsWidths[0]).toBe(showAsWidths[1]);
  expect((await showAs.boundingBox())!.width).toBeGreaterThan(200);
  await expect(page.locator('[data-component="StructurePreview"]')).toHaveCSS(
    "width",
    "130px",
  );
  await expect(page.locator('[data-component="StructurePreview"]')).toHaveCSS(
    "height",
    "66px",
  );
  await choose(page, field(page, "Default size width"), size, ["width"]);
  await choose(page, field(page, "Default size height"), "Fill", ["height"]);
  const preview = page.locator('[data-component="StructurePreview"]');
  const stage = page.locator(".structureDesignStage");
  expect((await preview.boundingBox())!.height).toBe(
    (await stage.boundingBox())!.height,
  );
  await choose(page, field(page, "Default size height"), "Hug", ["height"]);
  await settings(page)
    .getByRole("radio", { name: "Align center", exact: true })
    .click();
  await settings(page)
    .getByRole("radio", { name: "Align bottom", exact: true })
    .click();
  await expect(
    settings(page).getByRole("radio", { name: "Align center", exact: true }),
  ).toBeChecked();
  await settings(page)
    .getByRole("radio", { name: "Align center", exact: true })
    .click();
  await expect(
    settings(page).getByRole("radio", { name: "Align center", exact: true }),
  ).toBeChecked();
  await expect(preview).toHaveCSS("justify-content", "center");
  await expect(preview).toHaveCSS("align-items", "flex-end");
  await choose(page, field(page, "Gap"), gap, ["gap"]);
  await choose(page, field(page, "Padding"), padding, [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ]);
  await expect(preview).toHaveCSS("padding-top", `${padding.value}px`);
  await expect(preview).toHaveCSS("padding-right", `${padding.value}px`);
  await expect(preview).toHaveCSS("padding-bottom", `${padding.value}px`);
  await expect(preview).toHaveCSS("padding-left", `${padding.value}px`);
  await settings(page)
    .getByRole("button", { name: "Use individual padding values", exact: true })
    .click();
  await expect(field(page, "Padding")).toBeDisabled();
  await choose(page, field(page, "Top padding"), otherPadding, ["paddingTop"]);
  await expect(preview).toHaveCSS("padding-top", `${otherPadding.value}px`);
  await expect(preview).toHaveCSS("padding-left", `${padding.value}px`);
  const beforeCollapse = (await record(page)).working.structures;
  await settings(page)
    .getByRole("button", { name: "Use individual padding values", exact: true })
    .click();
  await expect(field(page, "Padding")).toHaveAttribute("placeholder", "Mixed");
  expect((await record(page)).working.structures).toEqual(beforeCollapse);
  await choose(page, field(page, "Padding"), padding, [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ]);
  await choose(page, field(page, "Corner radius"), radius, [
    "radiusTopLeft",
    "radiusTopRight",
    "radiusBottomRight",
    "radiusBottomLeft",
  ]);
  await settings(page)
    .getByRole("button", {
      name: "Use individual corner radius values",
      exact: true,
    })
    .click();
  await choose(page, field(page, "Top left corner radius"), otherRadius, [
    "radiusTopLeft",
  ]);
  await expect(preview).toHaveCSS(
    "border-top-left-radius",
    `${otherRadius.value}px`,
  );
  for (const corner of ["top-right", "bottom-right", "bottom-left"])
    await expect(preview).toHaveCSS(
      `border-${corner}-radius`,
      `${radius.value}px`,
    );
  await choose(page, field(page, "Elevation"), elevation, ["elevation"]);
  await expect(preview).toHaveCSS("width", `${size.value}px`);
  await expect(preview).toHaveCSS(
    "height",
    `${66 + Number(padding.value) * 2}px`,
  );
  await expect(preview).toHaveCSS("gap", `${gap.value}px`);
  await expect(preview).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const shadow = await preview.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  expect(shadow).toContain("8px 8px");
  expect(shadow).toContain("0.2");
  const accepted = (await record(page)).working.structures;
  const widthField = field(page, "Default size width").locator(
    'xpath=ancestor::*[@data-component="TokenComboBox"]',
  );
  await expect(widthField.getByTitle(size.name, { exact: true })).toBeVisible();
  await field(page, "Default size width").focus();
  await field(page, "Default size width").fill("not an existing token");
  await field(page, "Default size width").press("Escape");
  await field(page, "Default size width").press("Tab");
  expect((await record(page)).working.structures).toEqual(accepted);
  await settings(page)
    .getByRole("radio", { name: "Values", exact: true })
    .click();
  await expect(field(page, "Default size width")).toHaveValue(
    size.displayValue,
  );
  expect((await record(page)).working.structures).toEqual(accepted);
  await settings(page)
    .getByRole("button", { name: "Constraints", exact: true })
    .click();
  await choose(page, field(page, "Minimum width"), size, ["minWidth"]);
  await choose(page, field(page, "Maximum width"), size, ["maxWidth"]);
  await choose(page, field(page, "Minimum height"), "Hug", ["minHeight"]);
  await choose(page, field(page, "Maximum height"), "Fill", ["maxHeight"]);
  await expect(preview).toHaveCSS("min-width", `${size.value}px`);
  await expect(preview).toHaveCSS("max-width", `${size.value}px`);
  await expect(preview).toHaveCSS(
    "min-height",
    `${66 + Number(padding.value) * 2}px`,
  );
  await expect(preview).toHaveCSS(
    "max-height",
    `${(await stage.boundingBox())!.height}px`,
  );
  await settings(page)
    .getByRole("button", { name: "Clear Minimum width", exact: true })
    .click();
  await expect
    .poll(async () =>
      structureSelection(
        (await record(page)).working.structures!.structures[0],
        "minWidth",
      ),
    )
    .toBeNull();
  await page
    .locator('[data-component="StructureDesignView"]')
    .screenshot({ path: info.outputPath("structure-settings.png") });
});

test("Constraints filter current values, allow equality and preserve later conflicting references", async ({
  page,
}) => {
  const snapshot = withStructure();
  snapshot.structures!.structures[0].elements = [createElement("visual")];
  snapshot.spacing!.scales.find((scale) => !scale.hideFromPublishing)!.base =
    24;
  snapshot.size!.scales[0].base = 100;
  const references = catalog(snapshot);
  const base = references.find(
    (item) => item.family === "size" && item.index === 0,
  )!;
  const larger = references.find(
    (item) => item.family === "size" && item.index === 1,
  )!;
  const spacing = references.find(
    (item) => item.family === "spacing" && item.index === 0 && !item.hidden,
  )!;
  await seed(page, snapshot);
  await openDesign(page);
  await settings(page)
    .getByRole("button", { name: "Constraints", exact: true })
    .click();
  await choose(page, field(page, "Maximum width"), base, ["maxWidth"]);
  await field(page, "Minimum width").click();
  await field(page, "Minimum width").fill(larger.name);
  await expect(
    page
      .getByRole("option")
      .filter({ has: page.getByTitle(larger.name, { exact: true }) }),
  ).toHaveCount(0);
  await field(page, "Minimum width").press("Escape");
  await choose(page, field(page, "Minimum width"), base, ["minWidth"]);
  await expect(
    page.locator('[data-component="StructurePreview"]'),
  ).toBeVisible();
  await settings(page)
    .getByRole("button", { name: "Clear Minimum width", exact: true })
    .click();
  await choose(page, field(page, "Minimum width"), "Hug", ["minWidth"]);
  const before = (await record(page)).working.structures!.structures[0];
  await choose(page, field(page, "Padding"), spacing, [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ]);
  await expect(
    page.getByRole("alert").filter({ hasText: "Check this structure" }),
  ).toContainText("exceeds maximum");
  await expect(field(page, "Minimum width")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    structureSelection(
      (await record(page)).working.structures!.structures[0],
      "minWidth",
    ),
  ).toEqual(structureSelection(before, "minWidth"));
  expect(
    structureSelection(
      (await record(page)).working.structures!.structures[0],
      "maxWidth",
    ),
  ).toEqual({ $ref: base.id });
  await choose(page, field(page, "Maximum width"), "Fill", ["maxWidth"]);
  await expect(
    page.locator('[data-component="StructurePreview"]'),
  ).toBeVisible();
  await expect(field(page, "Minimum width")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("Mode switching resolves live bounds and complete shadows without saving preview choices", async ({
  page,
}) => {
  const snapshot = withStructure();
  snapshot.structures!.structures[0].elements = [createElement("visual")];
  snapshot.size!.scales[0].bindings = {
    base: {
      modeParameterId: "color.backgroundLightness",
      method: "linear",
      points: [
        { at: 0, value: 120 },
        { at: 1, value: 50 },
      ],
    },
  };
  const reference = catalog(snapshot).find(
    (item) => item.family === "size" && item.index === 0,
  )!;
  const elevation = catalog(snapshot).find(
    (item) => item.family === "elevation" && item.index === 0,
  )!;
  snapshot.structures!.structures[0] = assignStructure(
    snapshot.structures!.structures[0],
    {
      minWidth: { $ref: reference.id },
      maxWidth: { value: { kind: "sizing", preset: "hug" } },
      elevation: { $ref: elevation.id },
    },
  );
  await seed(page, snapshot);
  await openDesign(page);
  await expect(
    page.locator('[data-component="StructurePreview"]'),
  ).toBeVisible();
  const authored = (await record(page)).working;
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  const toolbar = page.locator('[data-component="PreviewToolbar"]');
  const dark = toolbar.getByRole("radio", { name: "Dark", exact: true });
  if (await dark.isVisible()) await dark.click();
  else {
    await toolbar.getByRole("button", { name: /^Modes/ }).click();
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("radio", { name: "Design", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Check this structure" }),
  ).toContainText("exceeds maximum");
  expect((await record(page)).working).toEqual(authored);
  await settings(page)
    .getByRole("button", { name: "Constraints", exact: true })
    .click();
  await settings(page)
    .getByRole("button", { name: "Clear Minimum width", exact: true })
    .click();
  await expect(
    page.locator('[data-component="StructurePreview"]'),
  ).toBeVisible();
  expect(
    await page
      .locator('[data-component="StructurePreview"]')
      .evaluate((element) => getComputedStyle(element).boxShadow),
  ).toContain("0.5");
});

test("Save, reload and Cancel preserve structure IDs and separate authored change counts from token impact", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures = [];
  await seed(page, snapshot);
  await openDesign(page, false);
  await page
    .getByRole("button", { name: "Add structure", exact: true })
    .click();
  const name = page
    .locator('[data-component="StructureCard"]')
    .getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Saved structure");
  await name.press("Enter");
  const log = page.locator('[data-component="ChangelogPanel"]');
  await expect(log.locator('[data-structure-change="new"] dd')).toHaveText("1");
  await expect(
    log.locator('[data-metric="manual-overrides"] dd').first(),
  ).toHaveText("0");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = (await record(page)).saved;
  await name.fill("Temporary name");
  await name.press("Enter");
  await page.reload();
  await openDesign(page);
  await expect(name).toHaveValue("Temporary name");
  expect((await record(page)).saved).toEqual(saved);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(name).toHaveValue("Saved structure");
  expect((await record(page)).working.structures).toEqual(saved.structures);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await log.getByRole("tab", { name: "Log", exact: true }).click();
  await log
    .getByRole("button", { name: "Revert Saved structure", exact: true })
    .click();
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(0);
  await expect(log.locator('[data-structure-change="new"]')).toHaveCount(0);
  expect((await record(page)).saved.structures).toEqual(saved.structures);
});

test("Used foundation sources and steps cannot be deleted or reverted, including Elevation's last shadow", async ({
  page,
}) => {
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, withStructure());
  const customId = store.set(addSizeScaleAtom);
  const custom = store
    .get(sizeDocumentAtom)
    .scales.find((scale) => scale.id === customId)!;
  const snapshot = structuredClone(store.get(authoringSnapshotAtom));
  const references = catalog(snapshot);
  const size = references.find(
    (item) =>
      item.family === "size" &&
      item.sourceId === custom.id &&
      item.index === custom.above,
  )!;
  const elevation = references.find(
    (item) => item.family === "elevation" && item.index === 0,
  )!;
  snapshot.structures!.structures[0] = assignStructure(
    snapshot.structures!.structures[0],
    { width: { $ref: size.id }, elevation: { $ref: elevation.id } },
  );
  await seed(page, snapshot);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Size", exact: true }).click();
  const card = page.locator(`[data-dimension-scale="${custom.id}"]`);
  await card
    .getByRole("button", {
      name: `Delete size scale ${custom.name}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Example structure - Width" }),
  ).toBeVisible();
  await expect(card).toBeVisible();
  const larger = card.getByRole("textbox", {
    name: "Larger values",
    exact: true,
  });
  await larger.fill(String(custom.above - 1));
  await larger.press("Tab");
  expect(
    (await record(page)).working.size!.scales.find(
      (scale) => scale.id === custom.id,
    )!.above,
  ).toBe(custom.above);
  const log = page.locator('[data-component="ChangelogPanel"]');
  await log.getByRole("tab", { name: "Log", exact: true }).click();
  await log
    .getByRole("button", {
      name: "Revert all Foundations changes",
      exact: true,
    })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Revert", exact: true })
    .click();
  expect(
    (await record(page)).working.size!.scales.some(
      (scale) => scale.id === custom.id,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Elevation", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Shadow 1", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Example structure - Elevation" })
      .first(),
  ).toBeVisible();
  expect((await record(page)).working.elevation!.layers).toHaveLength(1);
});

for (const family of ["spacing", "radius"] as const) {
  test(`Referenced ${family} sources and steps remain available after rejected deletion and range edits`, async ({
    page,
  }) => {
    const store = createStore();
    store.set(restoreAuthoringSnapshotAtom, withStructure());
    const customId =
      family === "spacing"
        ? store.set(addSpacingScaleAtom)
        : store.set(addRadiusScaleAtom);
    const document =
      family === "spacing"
        ? store.get(spacingDocumentAtom)
        : store.get(radiusDocumentAtom);
    const custom = document.scales.find((scale) => scale.id === customId)!;
    const reference = store
      .get(primitiveReferencesAtom)
      .find(
        (item) =>
          item.family === family &&
          item.sourceId === customId &&
          item.index === custom.above,
      )!;
    const snapshot = structuredClone(store.get(authoringSnapshotAtom));
    const slot = family === "spacing" ? "gap" : "radiusTopLeft";
    snapshot.structures!.structures[0] = assignStructure(
      snapshot.structures!.structures[0],
      { [slot]: { $ref: reference.id } },
    );
    await seed(page, snapshot);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page
      .getByRole("tab", {
        name: family === "spacing" ? "Spacing" : "Corner radius",
        exact: true,
      })
      .click();
    const card = page.locator(`[data-dimension-scale="${customId}"]`);
    const consumer =
      family === "spacing"
        ? "Example structure - Gap"
        : "Example structure - Top left corner radius";
    await card
      .getByRole("button", {
        name: `Delete ${family} scale ${custom.name}`,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: consumer }).first(),
    ).toBeVisible();
    await expect(card).toBeVisible();
    const larger = card.getByRole("textbox", {
      name: "Larger values",
      exact: true,
    });
    await larger.fill(String(custom.above - 1));
    await larger.press("Tab");
    await expect(larger).toHaveValue(String(custom.above));
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    expect(
      (await record(page)).working[family]!.scales.find(
        (scale) => scale.id === customId,
      ),
    ).toEqual(custom);
    await openDesign(page);
    await expect(page.locator('[data-component="StructurePreview"]')).toHaveCSS(
      family === "spacing" ? "gap" : "border-top-left-radius",
      `${reference.value}px`,
    );
    expect(
      structureSelection(
        (await record(page)).working.structures!.structures[0],
        slot,
      ),
    ).toEqual({ $ref: reference.id });
  });
}

test("Registry counts alignment bindings, preserves renamed IDs and rejects removal of a used term", async ({
  page,
}) => {
  const snapshot = withStructure();
  const position = snapshot.taxonomy!.categories.find(
    (category) => category.id === STRUCTURE_CATEGORY_IDS.position,
  )!;
  const left = snapshot.taxonomy!.terms.find(
    (term) => term.id === STRUCTURE_TERM_IDS.left,
  )!;
  await seed(page, snapshot);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .click();
  await page.getByRole("button", { name: /^Change log/ }).click();
  await page
    .getByRole("radio", { name: position.name, exact: true })
    .press("Space");
  const editor = page.getByRole("region", {
    name: "Category editor",
    exact: true,
  });
  await editor
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill(String(left.value));
  const row = editor.getByRole("row", {
    name: new RegExp(`^${left.value}(?: |$)`),
  });
  await expect(
    row.getByRole("gridcell", { name: "1", exact: true }),
  ).toBeVisible();
  const cell = editor.getByRole("rowheader").filter({
    has: page.getByRole("button", {
      name: `Edit ${left.value} term`,
      exact: true,
      includeHidden: true,
    }),
  });
  await cell.hover();
  await editor
    .getByRole("button", { name: `Edit ${left.value} term`, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Term", exact: true })
    .fill("Leading");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.taxonomy!.terms.find(
          (term) => term.id === left.id,
        )?.value,
    )
    .toBe("Leading");
  expect((await record(page)).working.structures).toEqual(snapshot.structures);
  await editor
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("Leading");
  await editor
    .getByRole("button", { name: "Delete Leading", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm taxonomy change", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "Example structure - Horizontal alignment",
  );
  expect(
    (await record(page)).working.taxonomy!.terms.find(
      (term) => term.id === left.id,
    )?.value,
  ).toBe("Leading");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await openDesign(page);
  await expect(
    settings(page).getByRole("radio", { name: "Align left", exact: true }),
  ).toBeChecked();
  await expect(page.locator('[data-component="StructurePreview"]')).toHaveCSS(
    "justify-content",
    "flex-start",
  );
});

test("The Panel stays pinned, scrolls at narrow widths and leaves native ComboBox menus above it", async ({
  page,
}, info) => {
  const snapshot = withStructure();
  const reference = catalog(snapshot).find(
    (item) => item.family === "size" && item.index === 0,
  )!;
  snapshot.structures!.structures[0] = assignStructure(
    snapshot.structures!.structures[0],
    { width: { $ref: reference.id } },
  );
  await seed(page, snapshot);
  await openDesign(page);
  for (const width of [1800, 1100]) {
    await page.setViewportSize({ width, height: 600 });
    if (width === 1100) {
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
      await page.getByRole("button", { name: /^Change log/ }).click();
    }
    const panel = settings(page);
    const canvas = page.locator('[data-component="StructureDesignView"]');
    await expect
      .poll(async () => {
        const a = (await canvas.boundingBox())!,
          b = (await panel.boundingBox())!;
        return Math.round(a.x + a.width - b.x - b.width);
      })
      .toBe(16);
    const a = (await canvas.boundingBox())!,
      b = (await panel.boundingBox())!;
    expect(b.y - a.y).toBe(16);
    await expect(panel).toHaveCSS("border-radius", "16px");
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await panel.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await choose(
      page,
      field(page, "Elevation"),
      catalog(snapshot).find((item) => item.family === "elevation")!,
      ["elevation"],
    );
    expect(
      await panel.evaluate((element) => element.scrollTop),
    ).toBeGreaterThan(0);
    await field(page, "Default size width").scrollIntoViewIfNeeded();
    await field(page, "Default size width").focus();
    await field(page, "Default size width").fill(reference.name);
    const option = page
      .getByRole("option")
      .filter({ has: page.getByTitle(reference.name, { exact: true }) });
    await expect(option).toBeVisible();
    expect(
      await option.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          ),
        );
      }),
    ).toBe(true);
    await option.click();
    await field(page, "Default size width").press("Tab");
    await page
      .getByRole("radio", { name: "Permutations", exact: true })
      .click();
    await page.getByRole("radio", { name: "Design", exact: true }).click();
    await expect(panel).toBeVisible();
    await canvas.screenshot({
      path: info.outputPath(`structures-panel-${width}.png`),
    });
  }
});
