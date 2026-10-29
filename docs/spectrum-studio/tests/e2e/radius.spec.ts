// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { expectChartColumns, expectFixedChartSizing } from "./chartSizing";

const errors = new WeakMap<Page, string[]>();
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
  version = 4,
) {
  await page.addInitScript(
    ({ snapshot, editing, version, key }) => {
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
    { snapshot, editing, version, key: AUTHORING_STORAGE_KEY },
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
}
async function radius(page: Page, view = "Elements") {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Corner radius", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: view, exact: true })
    .dispatchEvent("click");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
function base(snapshot: EditSessionSnapshot) {
  return snapshot.scaleTypes!.find(
    (formula) => formula.id === snapshot.radius!.scales[0].scaleTypeId,
  )!.base.default;
}
async function number(page: Page, label: string, value: string) {
  const field = page
    .locator('[data-component="DimensionScaleCard"]')
    .first()
    .getByRole("textbox", { name: label, exact: true });
  await field.fill(value);
  await field.press("Tab");
}

test("Radius defaults render exact fixed squares and a generated base preview", async ({
  page,
}, info) => {
  await seed(page, createDefaultSnapshot(), false);
  await radius(page);
  const card = page.locator('[data-component="DimensionScaleCard"]');
  await expect(card).toHaveCount(1);
  await expect(
    card.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(
    card.getByRole("textbox", { name: "Base value", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add radius scale", exact: true }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("checkbox", { name: "Hide from publishing" }),
  ).not.toBeChecked();
  await expect(card.locator('[data-component="RadiusSample"]')).toHaveAttribute(
    "data-radius",
    "8",
  );
  const samples = page.locator(
    '[data-component="RadiusElements"] [data-component="RadiusSample"]',
  );
  await expect(samples).toHaveCount(11);
  const geometry = await samples.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element),
        rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        topRight: style.borderTopRightRadius,
        others: [
          style.borderTopLeftRadius,
          style.borderBottomLeftRadius,
          style.borderBottomRightRadius,
        ],
        y: rect.y,
      };
    }),
  );
  for (const [index, sample] of geometry.entries()) {
    expect(sample.width).toBe(56);
    expect(sample.height).toBe(56);
    expect(sample.topRight).toBe(`${4 + index * 2}px`);
    expect(sample.others).toEqual(["0px", "0px", "0px"]);
    if (index) expect(sample.y - geometry[index - 1].y).toBe(68);
  }
  await page
    .locator('[data-component="RadiusElements"]')
    .screenshot({ path: info.outputPath("radius-elements.png") });
});

test("Older local records get Radius without losing edits or merging spacing examples", async ({
  page,
}) => {
  const old = createDefaultSnapshot();
  delete old.radius;
  old.scaleTypes = old.scaleTypes!.filter(
    (formula) => formula.id !== "scale-type-radius",
  );
  old.taxonomy!.categories.forEach((category) => {
    category.scopes = category.scopes.filter((scope) => scope !== "radius");
  });
  old.taxonomy!.terms = old.taxonomy!.terms.filter(
    (term) => term.value !== "radius",
  );
  old.spacing!.scales = old.spacing!.scales.slice(0, 1);
  old.spacing!.scales[0].base = 10;
  await seed(page, old, true, 1);
  await radius(page);
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(1);
  await expect.poll(async () => (await record(page)).version).toBe(4);
  const upgraded = await record(page);
  expect(upgraded.working.spacing).toEqual(old.spacing);
  expect(upgraded.saved.spacing).toEqual(old.spacing);
  expect(upgraded.working.radius).toEqual(upgraded.saved.radius);
  const ids = upgraded.working.radius!.scales.map((scale) => scale.id);
  await page.reload();
  await radius(page);
  expect(
    (await record(page)).working.radius!.scales.map((scale) => scale.id),
  ).toEqual(ids);
});

test("Radius editing preserves identities through publishing, Save, Cancel and reload", async ({
  page,
}) => {
  await seed(page);
  await radius(page);
  const before = await record(page),
    id = before.working.radius!.scales[0].id;
  await number(page, "Base value", "12");
  await expect(
    page.locator(
      '[data-component="DimensionScaleCard"] [data-component="RadiusSample"]',
    ),
  ).toHaveAttribute("data-radius", "12");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => base((await record(page)).saved)).toBe(12);
  await number(page, "Base value", "16");
  await expect.poll(async () => base((await record(page)).working)).toBe(16);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect.poll(async () => base((await record(page)).working)).toBe(12);
  await page.reload();
  await radius(page);
  await expect(
    page.locator(
      '[data-component="DimensionScaleCard"] [data-component="RadiusSample"]',
    ),
  ).toHaveAttribute("data-radius", "12");
  expect((await record(page)).working.radius!.scales[0].id).toBe(id);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const publishing = page
    .locator('[data-component="DimensionScaleCard"]')
    .getByRole("checkbox", { name: "Hide from publishing" });
  await publishing.press("Space");
  await expect
    .poll(
      async () =>
        (await record(page)).working.radius!.scales[0].hideFromPublishing,
    )
    .toBe(true);
  await expect(
    page.locator('[data-component="RadiusElements"] .radiusElement'),
  ).toHaveCount(11);
  await page
    .getByRole("button", { name: "Add radius scale", exact: true })
    .click();
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(2);
  const added = page.locator('[data-component="DimensionScaleCard"]').last();
  await added.getByRole("button", { name: /^Delete radius scale/ }).click();
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(2);
});

test("Zero radii are valid, duplicate radii informative, and negative radii errors", async ({
  page,
}) => {
  await seed(page);
  await radius(page);
  await number(page, "Smaller values", "0");
  await number(page, "Base value", "0");
  const card = page.locator('[data-component="DimensionScaleCard"]');
  await expect(card.getByRole("alert")).toHaveCount(0);
  await expect(card.locator('[data-component="RadiusSample"]')).toHaveAttribute(
    "data-radius",
    "0",
  );
  await number(page, "Step", "0");
  await expect(
    card.getByRole("alert").getByLabel("Information", { exact: true }),
  ).toBeVisible();
  await number(page, "Step", "2");
  await number(page, "Smaller values", "2");
  await expect(
    card.getByRole("alert").getByLabel("Error", { exact: true }),
  ).toBeVisible();
  await expect(card.getByRole("alert")).toContainText("negative");
  await expect(
    page
      .locator('[data-component="RadiusElements"]')
      .getByText("Unavailable radius"),
  ).toHaveCount(2);
  await radius(page, "Analyze");
  await expect(
    page.locator('[data-component="RadiusAnalyze"]').getByRole("alert"),
  ).toContainText("non-negative");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Corner radius", exact: true })
    .dispatchEvent("click");
  await expect(
    page
      .getByText(
        "Unavailable radius: values must be finite and non-negative.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
});

test("Shared Radius renames propagate without changing UUIDs or generated values", async ({
  page,
}) => {
  await seed(page);
  await radius(page);
  const before = (await record(page)).working;
  const samples = page.locator(
    '[data-component="RadiusElements"] [data-component="RadiusSample"]',
  );
  const values = await samples.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-radius")),
  );
  const name = page
    .locator('[data-component="DimensionScaleCard"]')
    .getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Corner layout");
  await name.press("Enter");
  await expect(
    page.getByRole("list", { name: "Corner layout radius values" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await record(page)).working.radius!.scales[0].name)
    .toBe("Corner layout");
  const after = (await record(page)).working;
  expect(after.radius!.scales[0]).toEqual({
    ...before.radius!.scales[0],
    name: "Corner layout",
  });
  expect(after.spacing!.scales[0].name).toBe("Corner layout");
  expect(after.size!.scales[0].name).toBe("Corner layout");
  expect(after.taxonomy!.terms.map((term) => term.id)).toEqual(
    before.taxonomy!.terms.map((term) => term.id),
  );
  expect(
    await samples.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-radius")),
    ),
  ).toEqual(values);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Corner radius", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("corner-layout-100");
  await expect(
    page.getByRole("button", { name: "Open corner-layout-100", exact: true }),
  ).toBeVisible();
});

test("Radius charts preserve physical sizing and container-based columns", async ({
  page,
}, info) => {
  await seed(page);
  await radius(page);
  await page
    .getByRole("button", { name: "Add radius scale", exact: true })
    .click();
  await radius(page, "Analyze");
  const analysis = page.locator('[data-component="RadiusAnalyze"]');
  await expectFixedChartSizing(analysis);
  await expect(
    analysis.getByRole("button", { name: "By token", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 2400, height: 1000 });
  const container = page.locator('section[data-component="Foundations"]');
  for (const width of [999, 1000, 1001]) {
    await container.evaluate((element, width) => {
      element.style.flex = "0 0 auto";
      element.style.width = `${width}px`;
    }, width);
    await expectChartColumns(analysis, width < 1000 ? 1 : 2);
  }
  await analysis.screenshot({ path: info.outputPath("radius-charts.png") });
  await container.evaluate((element) => {
    element.style.removeProperty("flex");
    element.style.removeProperty("width");
  });
  await radius(page);
  await page.setViewportSize({ width: 480, height: 1000 });
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  await page
    .getByRole("button", { name: "Dark app appearance", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Change log(?:, \d+ changes)?$/ })
    .click();
  await page.screenshot({ path: info.outputPath("radius-narrow-dark.png") });
});

test("Radius edits shared formula defaults without overrides or Revert controls", async ({
  page,
}) => {
  await seed(page);
  await radius(page);
  await page
    .getByRole("button", { name: "Add radius scale", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.radius!.scales.length)
    .toBe(2);
  const before = (await record(page)).working.radius!;
  await number(page, "Base value", "12");
  await number(page, "Step", "3");
  const cards = page.locator('[data-component="DimensionScaleCard"]');
  await expect(
    cards.getByRole("button", { name: "Revert", exact: true }),
  ).toHaveCount(0);
  for (const card of await cards.all()) {
    await expect(
      card.getByRole("textbox", { name: "Base value", exact: true }),
    ).toHaveValue("12");
    await expect(
      card.getByRole("textbox", { name: "Step", exact: true }),
    ).toHaveValue("3");
    await expect(
      card.locator('[data-component="RadiusSample"]'),
    ).toHaveAttribute("data-radius", "12");
  }
  await expect
    .poll(
      async () =>
        (await record(page)).working.scaleTypes!.find(
          (formula) => formula.id === "scale-type-radius",
        )!.parameters[0].default,
    )
    .toBe(3);
  const after = (await record(page)).working.radius!;
  expect(after).toEqual(before);
  expect(
    after.scales.every(
      (scale) =>
        scale.base === undefined && Object.keys(scale.parameters).length === 0,
    ),
  ).toBe(true);
});
