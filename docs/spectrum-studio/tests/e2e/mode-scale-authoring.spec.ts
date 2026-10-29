// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectMode } from "./modeControl";

// Edit mode plus the default mode sets and top bar links need this width before the top bar collapses into the Modes picker.
test.use({ viewport: { width: 2200, height: 900 } });

test("a Custom preview requires a destination before saving a mode-owned scale stop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Edit mode set Color scheme" })
    .dispatchEvent("click");
  const editor = page.getByRole("dialog", { name: "Edit mode set" });
  await editor
    .getByRole("checkbox", { name: "Color scale stops" })
    .dispatchEvent("click");
  await editor
    .getByRole("checkbox", { name: "Background lightness" })
    .last()
    .dispatchEvent("click");
  await editor.getByRole("button", { name: "Save" }).dispatchEvent("click");

  await selectMode(page, "Dark");
  await page
    .getByRole("button", { name: "Adaptive controls" })
    .dispatchEvent("click");
  await page.getByRole("slider", { name: "Background lightness" }).fill("42");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("tabpanel", { name: "Colors" })
    .getByRole("button", { name: "Red", exact: true })
    .dispatchEvent("click");
  await expect(page.getByText("Custom preview", { exact: true })).toBeVisible();

  const handle = page
    .getByRole("button", { name: /Stop 1, lightness/ })
    .first();
  const baseLightness = await handle.getAttribute("aria-label");
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(bounds.x - 30, bounds.y + bounds.height / 2, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Choose mode for color stop edit" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply to mode" })
    .dispatchEvent("click");
  await page.getByRole("option", { name: "Dark" }).dispatchEvent("click");
  await page.getByRole("button", { name: "Apply edit" }).dispatchEvent("click");
  await expect(
    page.getByRole("dialog", { name: "Choose mode for color stop edit" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radiogroup", { name: "Color scheme, custom" }),
  ).toBeVisible();
  await page
    .getByRole("tabpanel", { name: "Colors" })
    .getByRole("button", { name: "Red", exact: true })
    .dispatchEvent("click");
  // Switching modes can dismiss the scale popover, so reopen it before reading the handle.
  const reopenRed = async () => {
    if (!(await handle.isVisible()))
      await page
        .getByRole("tabpanel", { name: "Colors" })
        .getByRole("button", { name: "Red", exact: true })
        .dispatchEvent("click");
  };
  await selectMode(page, "Light");
  await reopenRed();
  await expect(handle).toHaveAttribute("aria-label", baseLightness!);
  await selectMode(page, "Dark");
  await reopenRed();
  await expect(handle).not.toHaveAttribute("aria-label", baseLightness!);
  await expect(
    page.getByRole("button", { name: "Remove stop override" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Code" }).dispatchEvent("click");
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeEnabled({
    timeout: 30_000,
  });
  await expect
    .poll(
      async () =>
        (await page.locator('[data-view="code"]').textContent())?.includes(
          '[data-color-scheme="dark"] .color-scale-red',
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("edit-mode adaptive controls remain unsaved previews and scalar edits require a destination", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Edit mode set Color scheme" })
    .dispatchEvent("click");
  const editor = page.getByRole("dialog", { name: "Edit mode set" });
  await editor
    .getByRole("checkbox", { name: "Background lightness" })
    .last()
    .dispatchEvent("click");
  await editor.getByRole("button", { name: "Save" }).dispatchEvent("click");

  await selectMode(page, "Dark");
  await page
    .getByRole("button", { name: "Adaptive controls" })
    .dispatchEvent("click");
  await page.getByRole("slider", { name: "Background lightness" }).fill("42");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page.getByRole("slider", { name: "Background lightness" }).fill("35");
  await expect(
    page.getByRole("dialog", { name: "Choose mode for parameter edit" }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Choose mode for parameter edit" })
    .getByRole("button", { name: "Dismiss" })
    .dispatchEvent("click");
  await expect(
    page.getByRole("slider", { name: "Background lightness" }),
  ).toHaveValue("42");
  await page
    .getByRole("button", { name: "Save", exact: true })
    .dispatchEvent("click");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await expect(
    page.getByRole("slider", { name: "Background lightness" }),
  ).toHaveValue("0");
  expect(errors).toEqual([]);
});
