// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { expectEqualColumns, field, geometry } from "./fieldLayout";

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
  "default-grid",
  "explicit-grid",
  "omitted",
  "quiet-grid",
  "quiet-long",
  "long",
  "small",
  "large",
  "styled",
  "disabled",
  "validation",
  "description",
  "help",
  "adjacent",
  "form-side",
];

for (const theme of ["light", "dark"]) {
  for (const width of [760, 320]) {
    test(`${theme} ${width}px: side labels and values keep equal columns without overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await openFixture(page, theme);
      const editableBounds = new Map<
        string,
        Awaited<ReturnType<typeof geometry>>
      >();
      for (const id of gridFields)
        editableBounds.set(id, await expectEqualColumns(field(page, id)));
      await expect(field(page, "styled")).toHaveClass(/caller-class/);
      expect(
        await field(page, "styled").evaluate((node) => ({
          opacity: getComputedStyle(node).opacity,
          marginTop: getComputedStyle(node).marginTop,
          layoutAttribute: node.getAttribute("layout"),
        })),
      ).toEqual({ opacity: "0.9", marginTop: "8px", layoutAttribute: null });
      const largeLabel = field(page, "large").locator("> div").first();
      expect(
        await largeLabel.evaluate((node) => getComputedStyle(node).textAlign),
      ).toBe("end");
      await page
        .getByRole("button", { name: "Make read-only", exact: true })
        .click();
      for (const id of gridFields) {
        const bounds = await expectEqualColumns(field(page, id));
        expect(
          Math.abs(bounds.valueStart - editableBounds.get(id)!.valueStart),
          id,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(bounds.valueWidth - editableBounds.get(id)!.valueWidth),
          id,
        ).toBeLessThanOrEqual(1);
        expect(bounds.valueOverflow, id).toBeLessThanOrEqual(1);
      }
      await expect(field(page, "default-grid").getByRole("button")).toHaveCount(
        0,
      );
      await expect(field(page, "default-grid")).toContainText("Pixels");
      const longField = field(page, "long");
      await expect(longField).toContainText("AnUnusuallyLongSelectedValue");
      await page
        .getByRole("button", { name: "Make editable", exact: true })
        .click();
      await expectEqualColumns(field(page, "quiet-grid"));
      const action = page.getByRole("button", {
        name: "Edit selected rule",
        exact: true,
      });
      await action.click();
      await expect(
        page.getByRole("status", { name: "Edit action count", exact: true }),
      ).toHaveText("1");
      const actionBox = await action.boundingBox();
      const pickerBox = await field(page, "adjacent").boundingBox();
      expect(
        actionBox!.x - (pickerBox!.x + pickerBox!.width),
      ).toBeGreaterThanOrEqual(7);
    });
  }
}

test("side labels are the default and explicit top labels work inside and outside Forms", async ({
  page,
}) => {
  await openFixture(page);
  for (const readOnly of [false, true]) {
    if (readOnly)
      await page
        .getByRole("button", { name: "Make read-only", exact: true })
        .click();
    for (const id of ["legacy-flex", "quiet-flex"]) {
      const bounds = await geometry(field(page, id));
      expect(
        Math.abs(bounds.labelWidth - bounds.valueWidth),
        id,
      ).toBeGreaterThan(1);
    }
    const topInForm = page
      .getByText("Explicit top in form", { exact: true })
      .locator("../..");
    for (const root of [field(page, "top"), topInForm]) {
      const bounds = await geometry(root);
      expect(bounds.areas).toBe('"label" "input" "helptext"');
      expect(bounds.valueTop).toBeGreaterThan(bounds.labelTop);
    }
    for (const label of ["Default side in form", "Default side in top form"]) {
      const root = page.getByText(label, { exact: true }).locator("../..");
      expect((await expectEqualColumns(root)).areas).toBe(
        '"label input" "label helptext"',
      );
    }
    if (readOnly) {
      const quiet = field(page, "quiet-flex");
      expect(
        await quiet.evaluate(
          (node) =>
            node.getBoundingClientRect().width <
            node.parentElement!.clientWidth,
        ),
      ).toBe(true);
      await expect(quiet.getByRole("button")).toHaveCount(0);
    }
  }
});

test("native labels, keyboard selection, validation and contextual help remain connected", async ({
  page,
}) => {
  await openFixture(page);
  const picker = field(page, "default-grid").getByRole("button");
  await field(page, "default-grid")
    .getByText("Output format", { exact: true })
    .click();
  await expect(picker).toBeFocused();
  await picker.press("ArrowDown");
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  expect((await list.boundingBox())!.width).toBeGreaterThanOrEqual(
    (await picker.boundingBox())!.width - 1,
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(picker).toBeFocused();
  await expect(picker).toContainText("Root em");
  await expect(field(page, "disabled").getByRole("button")).toBeDisabled();
  const required = field(page, "validation").getByRole("button");
  await expect(required).toHaveAccessibleName(/Required field\s+\(required\)$/);
  await expect(field(page, "validation").locator("select")).toHaveAttribute(
    "required",
    "",
  );
  await expect(field(page, "validation")).toHaveAttribute(
    "data-invalid",
    "true",
  );
  await expect(required).toHaveAccessibleDescription(/Check the output format/);
  await expect(
    field(page, "description").getByRole("button"),
  ).toHaveAccessibleDescription(/Choose the format for exported sizes/);
  for (const readOnly of [false, true]) {
    if (readOnly)
      await page
        .getByRole("button", { name: "Make read-only", exact: true })
        .click();
    const help = field(page, "help").getByRole("button", {
      name: /Output format information/,
    });
    await help.click();
    await expect(page.getByRole("dialog")).toContainText(
      "Output units do not change the source sizes.",
    );
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
  }
});

test("Foundation fields and the compact platform picker retain their allocated space", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  const platform = page
    .getByRole("banner")
    .getByText("Foundations", { exact: true })
    .locator("..");
  const platformBounds = await geometry(platform);
  expect(platformBounds.labelWidth).toBeLessThan(platformBounds.valueWidth);
  expect(
    await platform.evaluate(
      (node) =>
        node.getBoundingClientRect().width < node.parentElement!.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  const typography = page.locator(
    '[data-component="FoundationsTypographyPanel"]',
  );
  await typography
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  for (const name of [
    / Output format$/,
    / Text size rounding$/,
    / Line height rounding$/,
  ]) {
    await expectEqualColumns(
      typography.getByRole("button", { name }).locator(".."),
    );
  }
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await expectEqualColumns(
    page.getByRole("button", { name: / Output gamut$/ }).locator(".."),
  );
  for (const name of ["Spacing", "Size"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    const card = page.getByRole("region", {
      name: `Global ${name.toLowerCase()} scale`,
      exact: true,
    });
    await expectEqualColumns(
      card.getByRole("button", { name: / Formula$/ }).locator(".."),
    );
    await expectEqualColumns(
      card.getByRole("button", { name: / Rounding$/ }).locator(".."),
    );
    await expect(card.getByRole("checkbox", { name: /adaptive/ })).toHaveCount(
      0,
    );
  }
});
