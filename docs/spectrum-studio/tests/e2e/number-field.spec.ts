// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { expectEqualColumns, field, geometry } from "./fieldLayout";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openFixture(page: Page, theme = "light") {
  await page.goto(`/tests/e2e/fixtures/editable-picker.html?theme=${theme}`);
  await expect(
    page.getByRole("button", { name: "Make read-only", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

const gridFields = [
  "number-default",
  "number-grid",
  "number-long",
  "number-disabled",
  "number-readonly",
  "number-stepper-hidden",
  "number-styled",
  "number-required",
  "number-help",
  "number-ref",
  "number-uncontrolled",
  "editable-number",
  "editable-number-default",
  "layout-picker",
];

for (const theme of ["light", "dark"]) {
  for (const width of [760, 320]) {
    test(`${theme} ${width}px: NumberFields default to equal side columns and read-only values match`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await openFixture(page, theme);
      for (const id of gridFields) await expectEqualColumns(field(page, id));
      expect(
        await page
          .getByRole("main")
          .evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(1);
      const editable = await geometry(field(page, "editable-number"));
      await page
        .getByRole("button", { name: "Make read-only", exact: true })
        .click();
      const readOnly = await expectEqualColumns(field(page, "editable-number"));
      expect(
        Math.abs(readOnly.valueStart - editable.valueStart),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(readOnly.valueWidth - editable.valueWidth),
      ).toBeLessThanOrEqual(1);
      await expect(
        field(page, "editable-number").getByRole("textbox"),
      ).toHaveCount(0);
      await expect(field(page, "editable-number")).toContainText("14.00");
      await expect(field(page, "editable-number-default")).toContainText(
        "27.125",
      );
      await expectEqualColumns(field(page, "editable-number-default"));
      await expect(
        field(page, "layout-picker").getByRole("button"),
      ).toBeEnabled();
      await expect(
        field(page, "number-default").getByRole("textbox"),
      ).toBeEditable();
    });
  }
}

test("NumberField preserves flex/top options, native stepping, constraints, formatting and refs", async ({
  page,
}) => {
  await openFixture(page);
  for (const id of ["number-flex", "editable-number-flex"]) {
    const bounds = await geometry(field(page, id));
    expect(Math.abs(bounds.labelWidth - bounds.valueWidth)).toBeGreaterThan(1);
  }
  for (const id of ["number-top", "editable-number-top"]) {
    const bounds = await geometry(field(page, id));
    expect(bounds.valueTop).toBeGreaterThan(bounds.labelTop);
  }
  const root = field(page, "number-default");
  const input = root.getByRole("textbox");
  await root.getByText("Native number", { exact: true }).click();
  await expect(input).toBeFocused();
  await input.press("ArrowUp");
  await expect(input).toHaveValue("14.25");
  await input.fill("20");
  await input.press("Tab");
  await expect(root.getByRole("button", { name: /Increase/ })).toBeDisabled();
  await root.getByRole("button", { name: /Decrease/ }).click();
  await expect(input).toHaveValue("19.75");
  await expect(
    field(page, "number-disabled").getByRole("textbox"),
  ).toBeDisabled();
  await expect(
    field(page, "number-readonly").getByRole("textbox"),
  ).not.toBeEditable();
  await expect(
    field(page, "number-stepper-hidden").getByRole("button"),
  ).toHaveCount(0);
  await expect(
    field(page, "number-uncontrolled").getByRole("textbox"),
  ).toHaveValue("3.5");
  const unlabeled = field(page, "number-unlabeled");
  expect(
    await unlabeled.evaluate((node) => {
      const group = node.querySelector('[role="group"]');
      if (!group) throw new Error("Missing NumberField input group.");
      return Math.abs(group.getBoundingClientRect().width - node.clientWidth);
    }),
  ).toBeLessThanOrEqual(1);
  await expect(unlabeled.getByRole("textbox")).toHaveAccessibleName(
    "Unlabeled number",
  );
  await page.getByRole("button", { name: "Focus number", exact: true }).click();
  const refInput = field(page, "number-ref").getByRole("textbox");
  await expect(refInput).toBeFocused();
  expect(
    await refInput.evaluate((node) => {
      const input = node as HTMLInputElement;
      return input.value.substring(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      );
    }),
  ).toBe("19.75");
  await expect(field(page, "number-styled")).toHaveClass(/number-caller-class/);
  expect(
    await field(page, "number-styled").evaluate((node) => ({
      opacity: getComputedStyle(node).opacity,
      margin: getComputedStyle(node).marginTop,
      layout: node.getAttribute("layout"),
    })),
  ).toEqual({ opacity: "0.9", margin: "8px", layout: null });
  await expect(
    field(page, "number-required").getByRole("textbox"),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    field(page, "number-required").getByRole("textbox"),
  ).toHaveAccessibleDescription(/Check this number/);
  await field(page, "number-help")
    .getByRole("button", { name: /Number field information/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Number formatting does not change the source value.",
  );
  await page.keyboard.press("Escape");
});

test("Typography panel NumberFields and Pickers use equal columns and paired fields fit narrow panels", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  const base = panel.getByRole("textbox", { name: /^Base size/ });
  const rootForInput = (input: ReturnType<typeof panel.getByRole>) =>
    input.locator("../..");
  await expectEqualColumns(rootForInput(base));
  const ratioRoot = rootForInput(
    panel.getByRole("textbox", { name: "Ratio", exact: true }),
  );
  expect(
    await ratioRoot.evaluate((node) => {
      const group = node.querySelector('[role="group"]');
      if (!group) throw new Error("Missing ratio input group.");
      return Math.abs(group.getBoundingClientRect().width - node.clientWidth);
    }),
  ).toBeLessThanOrEqual(1);
  const scaleRoot = panel
    .getByRole("button", { name: / Scale$/ })
    .locator("..");
  await expectEqualColumns(scaleRoot);
  expect(
    Math.abs(
      (await scaleRoot.boundingBox())!.y - (await ratioRoot.boundingBox())!.y,
    ),
  ).toBeLessThanOrEqual(1);
  await panel
    .getByRole("button", { name: "Line heights", exact: true })
    .click();
  const card = panel.getByRole("region", {
    name: "body line height",
    exact: true,
  });
  await expectEqualColumns(
    rootForInput(
      card.getByRole("textbox", { name: "Default line height", exact: true }),
    ),
  );
  await card
    .getByRole("button", { name: "Adaptive settings", exact: true })
    .click();
  for (const name of [
    /^From text size/,
    /^To text size/,
    /^From line height$/,
    /^To line height$/,
  ]) {
    await expectEqualColumns(rootForInput(card.getByRole("textbox", { name })));
  }
  await panel.evaluate((node) => {
    (node as HTMLElement).style.width = "260px";
  });
  for (const name of [/^From text size/, /^To text size/]) {
    await expectEqualColumns(rootForInput(card.getByRole("textbox", { name })));
  }
  const from = await card
    .getByRole("textbox", { name: /^From text size/ })
    .boundingBox();
  const to = await card
    .getByRole("textbox", { name: /^To text size/ })
    .boundingBox();
  expect(to!.y).toBeGreaterThan(from!.y);
});

test("Registry and token detail Pickers use equal columns without changing editing gates or saved sources", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.goto("/");
  const changes = page
    .getByRole("complementary", { name: "Change log", exact: true })
    .getByRole("heading", { name: "Changes", exact: true });
  if (await changes.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log/ })
      .click();
  await expect(changes).toHaveCount(0);
  const source = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .click();
  const valueType = page.getByRole("button", { name: / Value type$/ });
  const cardinality = page.getByRole("button", { name: / Cardinality$/ });
  await expectEqualColumns(valueType.locator(".."));
  await expectEqualColumns(cardinality.locator(".."));
  await valueType.click();
  await page.getByRole("option", { name: "Number", exact: true }).click();
  await expect(valueType).toBeFocused();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("red-500");
  await page.getByRole("button", { name: "Open red-500", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const status = dialog.getByRole("button", { name: / Status$/ });
  await expectEqualColumns(status.locator(".."));
  await expect(status).toBeEnabled();
  await status.click();
  await page.getByRole("option", { name: "Draft", exact: true }).click();
  await expect(status).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(source);
});
