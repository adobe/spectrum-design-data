// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator } from "@playwright/test";

async function selectMode(controls: Locator, name: string) {
  const radio = controls.getByRole("radio", { name, exact: true });
  if (await radio.isVisible()) {
    await radio.click();
  } else {
    await controls.getByRole("button", { name: /^Modes/ }).click();
    const page = controls.page();
    await page.getByRole("option", { name, exact: true }).click();
    await page.keyboard.press("Escape");
  }
}

for (const width of [1280, 390]) {
  test(`Tokens header modes and adaptive controls update values at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Tokens", exact: true })
      .click();
    const header = page.locator(".tokenBrowserHeader");
    const controls = header.getByRole("group", {
      name: "Design-system preview controls",
      exact: true,
    });
    await expect(
      header.getByRole("heading", { name: "Tokens", exact: true }),
    ).toBeVisible();
    await expect(controls).toBeVisible();
    const rightInset = await header.evaluate((element) => {
      const control = element.querySelector(
        '[data-component="PreviewToolbar"]',
      )!;
      return (
        element.getBoundingClientRect().right -
        control.getBoundingClientRect().right
      );
    });
    expect(rightInset).toBeCloseTo(16, 0);
    await page.getByRole("radio", { name: "Colors", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search tokens" }).fill("red");
    const color = page.locator("[data-token-name] .tokenValue").first();
    await expect(color).not.toBeEmpty();
    const light = await color.textContent();
    await selectMode(controls, "Dark");
    await expect(color).not.toHaveText(light!);
    await selectMode(controls, "Light");
    await expect(color).toHaveText(light!);

    const typography = page.getByRole("radio", {
      name: "Typography",
      exact: true,
    });
    await typography.press("Space");
    await expect(typography).toBeChecked();
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill("text-size-100");
    const value = page.locator('[data-token-name="text-size-100"] .tokenValue');
    await expect(value).not.toBeEmpty();
    const baseline = await value.textContent();
    await controls
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Adaptive controls",
      exact: true,
    });
    const slider = dialog.getByRole("slider", {
      name: "Text size",
      exact: true,
    });
    await expect(slider).toBeVisible();
    await slider.fill("2");
    await expect(value).not.toHaveText(baseline!);
    await dialog.getByRole("button", { name: "Reset to mode values" }).click();
    await expect(value).toHaveText(baseline!);
    await slider.press("Escape");
    await expect(
      controls.getByRole("button", { name: "Adaptive controls", exact: true }),
    ).toBeFocused();
    await page.getByRole("radio", { name: "Grid view" }).click();
    await expect(controls).toBeVisible();
    await controls
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .click();
    await slider.fill("2");
    await page.keyboard.press("Escape");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    const preview = page.locator(".previewToolbarAnchor").getByRole("group", {
      name: "Design-system preview controls",
      exact: true,
    });
    await expect(preview).toBeVisible();
    await preview
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .press("Enter");
    await expect(slider).toHaveValue("2");
    await dialog.getByRole("button", { name: "Reset to mode values" }).click();
    await expect(slider).toHaveValue("0");
    await slider.press("Escape");
    expect(errors).toEqual([]);
  });
}
