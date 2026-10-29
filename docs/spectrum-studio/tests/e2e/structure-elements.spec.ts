// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
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
import {
  ELEMENT_TYPES,
  createElement,
  elementBindingId,
  type ElementKind,
  type ElementSlot,
} from "../../src/features/structures/elements";
import { STRUCTURE_TERM_IDS } from "../../src/features/structures/vocabulary";
import { assignStructure } from "../../src/features/structures/model";
import { buildTshirtArtifacts } from "../../src/features/design-data/tshirtArtifacts";
import { TSHIRT_CACHE_KEY } from "../../src/features/design-data/tshirtCache";
import type { PrimitiveReference } from "../../src/features/tokens/primitiveReferences";

test.setTimeout(90_000);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
const references = createStore().get(primitiveReferencesAtom);
const baseId = createDefaultSnapshot().structures!.structures[0].conceptId;
function leafSnapshot() {
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures = [
    { ...snapshot.structures!.structures[0], elements: [] },
  ];
  return snapshot;
}
async function seed(
  page: Page,
  snapshot = leafSnapshot(),
  editing = true,
  version = AUTHORING_RECORD_VERSION,
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
      version,
    },
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
  await expect(
    page.getByRole("region", { name: "Structure settings for Base" }),
  ).toBeVisible();
}
const preview = (page: Page) =>
  page.getByRole("group", { name: "Base structure preview", exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: /element settings$/ });
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function add(
  page: Page,
  kind: ElementKind,
  index: number,
  keyboard = false,
) {
  const button = preview(page).getByRole("button", {
    name: `Add element at position ${index + 1}`,
    exact: true,
  });
  await button.focus();
  if (keyboard) await button.press("Enter");
  else await button.click();
  const label = createDefaultSnapshot().taxonomy!.terms.find(
    (term) => term.id === ELEMENT_TYPES[kind].termId,
  )!.value;
  await page
    .getByRole("menu", {
      name: `Add element at position ${index + 1}`,
      exact: true,
    })
    .getByRole("menuitem", { name: String(label), exact: true })
    .click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(panel(page)).toBeVisible();
}
async function choose(
  page: Page,
  input: Locator,
  reference: PrimitiveReference,
  slot: ElementSlot,
) {
  const elementId = await preview(page)
    .locator("[data-element-id][data-selected]")
    .getAttribute("data-element-id");
  await input.focus();
  await input.fill(reference.name);
  await page
    .getByRole("option")
    .filter({ has: page.getByTitle(reference.name, { exact: true }) })
    .click();
  await input.press("Tab");
  await expect
    .poll(async () =>
      (await record(page)).working
        .structures!.structures[0].elements!.find(
          (element) => element.id === elementId,
        )
        ?.bindings.some(
          (binding) => binding.slot === slot && binding.$ref === reference.id,
        ),
    )
    .toBe(true);
}

test("Ordered insertion, token binding and five-size previews preserve the complete generated bundle", async ({
  page,
}) => {
  const before = buildTshirtArtifacts(leafSnapshot());
  await seed(page);
  await add(page, "text", 0, true);
  const font = references.find(
    (reference) => reference.metricId === "font-size" && reference.index === 0,
  )!;
  const line = references.find(
    (reference) =>
      reference.metricId?.endsWith("-unitlessLineHeight") &&
      reference.index === 0,
  )!;
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Font size/ }),
    font,
    "fontSize",
  );
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Line height/ }),
    line,
    "lineHeight",
  );
  await expect(preview(page).locator('[data-element-kind="text"]')).toHaveCSS(
    "font-size",
    `${font.value}px`,
  );
  await expect
    .poll(() =>
      preview(page)
        .locator('[data-element-kind="text"]')
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).lineHeight),
        ),
    )
    .toBeCloseTo(Number(font.value) * Number(line.value), 3);
  await add(page, "workflowIcon", 0);
  const icon = references.find(
    (reference) =>
      reference.metricId === "workflow-icon-size" && reference.index === 0,
  )!;
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Size/ }),
    icon,
    "size",
  );
  const glyph = panel(page).getByRole("combobox", {
    name: "Sample icon",
    exact: true,
  });
  await glyph.fill("Bell");
  await page.getByRole("option", { name: "Bell", exact: true }).click();
  await expect(
    preview(page).locator('[data-element-kind="workflowIcon"] svg'),
  ).toBeVisible();
  await expect(
    preview(page).locator('[data-element-kind="workflowIcon"]'),
  ).toHaveCSS("width", `${icon.value}px`);
  await expect(
    preview(page).locator('[data-element-kind="workflowIcon"]'),
  ).toHaveCSS("height", `${icon.value}px`);
  await add(page, "uiIcon", 2);
  await add(page, "visual", 3);
  const size = references.find(
    (reference) => reference.family === "size" && reference.index === 0,
  )!;
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Width/ }),
    size,
    "width",
  );
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Height/ }),
    size,
    "height",
  );
  await add(page, "bar", 4);
  const length = references.find(
    (reference) => reference.family === "size" && reference.index === 2,
  )!;
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Length/ }),
    length,
    "length",
  );
  await choose(
    page,
    panel(page).getByRole("combobox", { name: /^Thickness/ }),
    size,
    "thickness",
  );
  await panel(page)
    .getByRole("button", { name: /Orientation/ })
    .click();
  await page.getByRole("option", { name: "Vertical", exact: true }).click();
  await expect(preview(page).locator('[data-element-kind="bar"]')).toHaveCSS(
    "height",
    `${length.value}px`,
  );
  await expect(preview(page).locator('[data-element-kind="bar"]')).toHaveCSS(
    "width",
    `${size.value}px`,
  );
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].elements!.find(
          (element) => element.kind === "bar",
        )?.orientation,
    )
    .toBe(STRUCTURE_TERM_IDS.vertical);
  const working = (await record(page)).working;
  expect(
    working.structures!.structures[0].elements!.map((element) => element.kind),
  ).toEqual(["workflowIcon", "text", "uiIcon", "visual", "bar"]);
  expect(buildTshirtArtifacts(working)).toEqual(before);
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  for (const sizeName of [
    "Extra small",
    "Small",
    "Medium",
    "Large",
    "Extra large",
  ]) {
    const section = page.getByRole("region", { name: sizeName, exact: true });
    await expect(
      section.locator(
        '[data-component="StructurePreview"] [data-element-kind="text"]',
      ),
    ).toBeVisible();
    await expect(
      section.locator(
        '[data-component="StructurePreview"] [data-element-kind="bar"]',
      ),
    ).toBeVisible();
  }
  const small = page
    .getByRole("region", { name: "Small", exact: true })
    .locator('[data-component="StructurePreview"] [data-element-kind="text"]');
  expect(
    await small.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).not.toBe(font.value);
  expect((await record(page)).working.structures!.structures).toEqual(
    working.structures!.structures,
  );
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key) ?? "null")?.bundle?.semantics
            ?.length,
        TSHIRT_CACHE_KEY,
      ),
    )
    .toBe(15);
});

test("Custom preview deletion confirms cleanup and Undo restores the exact child and target graph", async ({
  page,
}) => {
  const snapshot = leafSnapshot(),
    base = snapshot.structures!.structures[0];
  const font = references.find(
    (reference) => reference.metricId === "font-size" && reference.index === 0,
  )!;
  const text = createElement("text");
  text.bindings = [
    {
      id: elementBindingId(text.id, "fontSize"),
      slot: "fontSize",
      $ref: font.id,
      family: "typography",
    },
  ];
  base.elements = [text];
  base.generation!.applications[0].previewTargets = {
    kind: "custom",
    bindingIds: [text.bindings[0].id],
  };
  await seed(page, snapshot);
  await preview(page)
    .getByRole("button", { name: /^Text element 1$/i })
    .click();
  await panel(page)
    .getByRole("button", { name: "Delete element", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.structures!.structures[0])
    .toEqual(base);
  await panel(page)
    .getByRole("button", { name: "Delete element", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    preview(page).getByRole("button", { name: /^Text element/ }),
  ).toHaveCount(0);
  expect(
    (await record(page)).working.structures!.structures[0].generation!
      .applications[0].targets,
  ).toEqual(base.generation!.applications[0].targets);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    preview(page).getByRole("button", { name: /^Text element 1$/i }),
  ).toBeVisible();
  await expect
    .poll(async () => (await record(page)).working.structures!.structures[0])
    .toEqual(base);
});

test("Save, reload, Cancel and version-nine saved/working upgrades retain template content without aliases", async ({
  page,
}) => {
  const legacy = leafSnapshot();
  legacy.structures!.schemaVersion = 2;
  for (const structure of legacy.structures!.structures)
    delete structure.elements;
  await seed(page, legacy, true, 9);
  expect((await record(page)).version).toBe(AUTHORING_RECORD_VERSION);
  await add(page, "bar", 0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).saved.structures!.structures[0].elements!.length,
    )
    .toBe(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect.poll(async () => (await record(page)).isEditing).toBe(false);
  const saved = (await record(page)).saved;
  expect(saved.structures!.structures[0].elements!.length).toBe(1);
  expect(saved.aliases!.tokens).toHaveLength(0);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await expect(
    page.locator('[data-component="StructureCard"]').first(),
  ).toBeVisible();
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
  await expect(
    preview(page).getByRole("button", { name: /^Bar element 1$/i }),
  ).toBeVisible();
  await preview(page)
    .getByRole("button", { name: /^Bar element 1$/i })
    .click();
  await expect(
    panel(page).getByRole("button", { name: "Delete element" }),
  ).toHaveCount(0);
  await expect(
    preview(page).getByRole("button", { name: /Add element/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await add(page, "text", 1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].elements!.length,
    )
    .toBe(1);
  expect((await record(page)).saved.structures).toEqual(saved.structures);
});

test("A Custom preview-only rule applies without emitted rows and keeps its enabled-size mappings", async ({
  page,
}) => {
  const snapshot = leafSnapshot();
  const base = snapshot.structures!.structures[0];
  base.properties = base.properties.filter((binding) => !("$ref" in binding));
  base.generation!.applications = [];
  delete base.generation!.nameRef;
  const element = createElement("text");
  const font = references.find(
    (reference) => reference.metricId === "font-size" && reference.index === 0,
  )!;
  element.bindings = [
    {
      id: elementBindingId(element.id, "fontSize"),
      slot: "fontSize",
      $ref: font.id,
      family: "typography",
    },
  ];
  base.elements = [element];
  await seed(page, snapshot);
  await page
    .locator('[data-component="StructureCard"]')
    .getByRole("button", { name: /Add.*rule/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("radio", { name: "Custom properties", exact: true })
    .press("Space");
  await expect(
    dialog.getByRole("group", { name: "Element previews", exact: true }),
  ).toContainText("Font size");
  await expect(
    dialog.getByRole("button", { name: "Apply", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  const current = (await record(page)).working;
  expect(current.structures!.structures[0].conceptId).toBe(baseId);
  expect(current.structures!.structures[0].generation!.nameRef).toBeUndefined();
  expect(buildTshirtArtifacts(current).tokens).toHaveLength(0);
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  const small = page
    .getByRole("region", { name: "Small", exact: true })
    .locator('[data-component="StructurePreview"] [data-element-kind="text"]');
  await expect(small).toBeVisible();
  expect(
    await small.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).not.toBe(font.value);
});

test("Pointer insertion freezes its boundary without changing Hug measurement, and Escape returns to the parent", async ({
  page,
}) => {
  const snapshot = leafSnapshot();
  snapshot.structures!.structures[0].elements = [
    createElement("visual"),
    createElement("text"),
  ];
  await seed(page, snapshot);
  const frame = preview(page);
  const first = (await frame
    .locator(":scope > [data-element-id]")
    .nth(0)
    .boundingBox())!;
  const second = (await frame
    .locator(":scope > [data-element-id]")
    .nth(1)
    .boundingBox())!;
  const before = (await frame.boundingBox())!;
  await page.mouse.move(
    (first.x + first.width + second.x) / 2,
    before.y + before.height / 2,
  );
  const marker = frame.locator(".structureInsertion[data-current]");
  await expect(marker.getByRole("button")).toHaveAccessibleName(
    "Add element at position 2",
  );
  await marker.getByRole("button").click();
  await page.mouse.move(before.x + 2, before.y + 2);
  await expect(
    frame.locator(".structureInsertion[data-menu-open]").getByRole("button"),
  ).toHaveAccessibleName("Add element at position 2");
  expect((await frame.boundingBox())!.width).toBe(before.width);
  expect((await frame.boundingBox())!.height).toBe(before.height);
  await page
    .getByRole("menu", { name: "Add element at position 2", exact: true })
    .getByRole("menuitem", { name: "Bar", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await record(page)).working.structures!.structures[0].elements!.map(
        (element) => element.kind,
      ),
    )
    .toEqual(["visual", "bar", "text"]);
  await frame
    .getByRole("button", { name: "Bar element 2", exact: true })
    .press("Escape");
  await expect(
    page.getByRole("region", { name: "Structure settings for Base" }),
  ).toBeVisible();
  await expect(frame).toBeFocused();
});

for (const variant of [
  "empty",
  "populated Hug",
  "populated fixed height",
] as const) {
  test(`The insertion bar fills the ${variant} Structure and its Add button stays vertically centered`, async ({
    page,
  }) => {
    const snapshot = leafSnapshot();
    const padding = references.find(
      (reference) => reference.family === "spacing" && reference.index === 1,
    )!;
    const height = references.find(
      (reference) => reference.family === "size" && reference.index === 12,
    )!;
    snapshot.structures!.structures[0] = assignStructure(
      snapshot.structures!.structures[0],
      {
        paddingTop: { $ref: padding.id },
        ...(variant === "populated fixed height" && {
          height: { $ref: height.id },
        }),
      },
    );
    if (variant !== "empty")
      snapshot.structures!.structures[0].elements = [
        createElement("visual"),
        createElement("text"),
      ];
    await seed(page, snapshot);
    const frame = preview(page);
    const before = (await frame.boundingBox())!;
    await frame.hover();
    const marker = frame.locator(".structureInsertion[data-current]");
    const button = marker.getByRole("button");
    await button.focus();
    await expect(button).toBeVisible();
    const geometry = await marker.evaluate((element) => {
      const frame = element.parentElement!;
      const button = element.querySelector("button")!;
      const frameBox = frame.getBoundingClientRect(),
        markerBox = element.getBoundingClientRect(),
        buttonBox = button.getBoundingClientRect();
      const frameStyle = getComputedStyle(frame),
        barStyle = getComputedStyle(element, "::after");
      return {
        top: markerBox.top,
        innerTop: frameBox.top + Number.parseFloat(frameStyle.borderTopWidth),
        height: markerBox.height,
        innerHeight:
          frameBox.height -
          Number.parseFloat(frameStyle.borderTopWidth) -
          Number.parseFloat(frameStyle.borderBottomWidth),
        buttonCenter: buttonBox.top + buttonBox.height / 2,
        markerCenter: markerBox.top + markerBox.height / 2,
        barHeight: Number.parseFloat(barStyle.height),
        barTop: barStyle.insetBlockStart,
        barBottom: barStyle.insetBlockEnd,
      };
    });
    expect(geometry.top).toBeCloseTo(geometry.innerTop, 1);
    expect(geometry.height).toBeCloseTo(geometry.innerHeight, 1);
    expect(geometry.barHeight).toBeCloseTo(geometry.innerHeight, 1);
    expect(geometry.barTop).toBe("0px");
    expect(geometry.barBottom).toBe("0px");
    expect(geometry.buttonCenter).toBeCloseTo(geometry.markerCenter, 1);
    expect((await frame.boundingBox())!.width).toBe(before.width);
    expect((await frame.boundingBox())!.height).toBe(before.height);
    expect((await record(page)).working.structures).toEqual(
      snapshot.structures,
    );
  });
}

test("An empty editing hit area never overrides explicit sizes or constraints", async ({
  page,
}) => {
  const snapshot = leafSnapshot();
  snapshot.structures!.structures[0].properties =
    snapshot.structures!.structures[0].properties.filter(
      (binding) => !("$ref" in binding),
    );
  snapshot.structures!.structures[0].generation!.applications = [];
  await seed(page, snapshot);
  const frame = preview(page);
  await expect(frame).toHaveCSS("width", "160px");
  await expect(frame).toHaveCSS("height", "96px");
  const size = references.find(
    (reference) => reference.family === "size" && reference.index === 0,
  )!;
  const settings = page.getByRole("region", {
    name: "Structure settings for Base",
  });
  for (const axis of ["width", "height"]) {
    const input = settings.getByRole("combobox", {
      name: new RegExp(`^Default size ${axis}`),
    });
    await input.fill(size.name);
    await page
      .getByRole("option")
      .filter({ has: page.getByTitle(size.name, { exact: true }) })
      .click();
    await input.press("Tab");
    await expect(frame).toHaveCSS(axis, `${size.value}px`);
  }
  await settings
    .getByRole("button", { name: "Constraints", exact: true })
    .click();
  const maximum = settings.getByRole("combobox", { name: /^Maximum width/ });
  await maximum.fill(size.name);
  await page
    .getByRole("option")
    .filter({ has: page.getByTitle(size.name, { exact: true }) })
    .click();
  await maximum.press("Tab");
  const width = settings.getByRole("combobox", { name: /^Default size width/ });
  await width.focus();
  await width.fill("Hug");
  await page.getByRole("option", { name: "Hug", exact: true }).click();
  await width.press("Tab");
  await expect(frame).toHaveCSS("width", "2px");
  await expect(frame).toHaveCSS("max-width", `${size.value}px`);
  await expect(frame).toHaveCSS("height", `${size.value}px`);
});

test("Bound Typography steps and line-height sources cannot be removed from an element template", async ({
  page,
}) => {
  const snapshot = leafSnapshot();
  const font = references.find(
    (reference) => reference.metricId === "font-size" && reference.index === -1,
  )!;
  const line = references.find(
    (reference) =>
      reference.metricId?.endsWith("-unitlessLineHeight") &&
      reference.index === 0,
  )!;
  const text = createElement("text");
  text.bindings = [
    {
      id: elementBindingId(text.id, "fontSize"),
      slot: "fontSize",
      $ref: font.id,
      family: "typography",
    },
    {
      id: elementBindingId(text.id, "lineHeight"),
      slot: "lineHeight",
      $ref: line.id,
      family: "typography",
    },
  ];
  snapshot.structures!.structures[0].elements = [text];
  const cardId = line.metricId!.replace(/-unitlessLineHeight$/, "");
  const cardName = (id: string) =>
    String(
      snapshot.taxonomy!.terms.find(
        (term) =>
          term.id ===
          snapshot.typography.metricNames[`${id}-lineHeight`].termId,
      )!.value,
    );
  const replacement = snapshot.typography.lineHeights.find(
    (card) => card.id !== cardId,
  )!;
  await seed(page, snapshot);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  const typography = page.locator(
    '[data-component="FoundationsTypographyPanel"]',
  );
  const smaller = typography.getByRole("textbox", {
    name: "Smaller sizes",
    exact: true,
  });
  await smaller.fill("0");
  await smaller.press("Enter");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "template token source" })
      .first(),
  ).toBeVisible();
  await typography
    .getByRole("button", { name: "Line heights", exact: true })
    .click();
  await typography
    .getByRole("button", {
      name: `Delete ${cardName(cardId)} line height`,
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Replacement line height/ }).click();
  await page
    .getByRole("option", { name: cardName(replacement.id), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Replace and delete", exact: true })
    .click();
  await expect(
    typography.getByRole("region", {
      name: `${cardName(cardId)} line height`,
      exact: true,
    }),
  ).toBeVisible();
  expect((await record(page)).working.typography).toEqual(snapshot.typography);
  expect((await record(page)).working.structures).toEqual(snapshot.structures);
});
