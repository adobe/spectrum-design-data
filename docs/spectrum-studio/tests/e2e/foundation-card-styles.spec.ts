// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator } from "@playwright/test";
import { enableEditMode } from "./editMode";

async function appearance(card: Locator) {
  return card.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      background: style.backgroundColor,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      radius: style.borderRadius,
      color: style.color,
    };
  });
}

for (const dark of [false, true]) {
  test(`foundation cards share their ${dark ? "dark" : "light"} appearance without changing their editors`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await enableEditMode(page);
    await page.goto("/");
    if (dark)
      await page
        .getByRole("button", { name: "Dark app appearance", exact: true })
        .click();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("tab", { name: "Colors", exact: true }).click();
    await page.getByRole("tab", { name: "Color scales", exact: true }).click();
    const colorCard = page
      .getByRole("button", { name: "Silver", exact: true })
      .first();
    const expected = await appearance(colorCard);
    expect(expected).toMatchObject({
      background: "rgba(0, 0, 0, 0)",
      borderStyle: "solid",
      borderWidth: "1px",
      radius: "8px",
    });
    await colorCard.click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("combobox", { name: "Color scale name", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    for (const [tab, label] of [
      ["Spacing", "Global spacing scale"],
      ["Size", "Global size scale"],
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const scaleCard = page.getByRole("region", { name: label, exact: true });
      expect(await appearance(scaleCard)).toEqual(expected);
      await expect(
        scaleCard.getByRole("textbox", { name: "Name", exact: true }),
      ).toBeEditable();
      await expect(
        scaleCard.getByRole("button", {
          name: "Formula variables",
          exact: true,
        }),
      ).toHaveAttribute("aria-expanded", "true");
    }
    await page.getByRole("tab", { name: "Typography", exact: true }).click();
    const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
    await panel
      .getByRole("button", { name: "Line heights", exact: true })
      .click();
    const card = panel.getByRole("region", {
      name: "body line height",
      exact: true,
    });
    expect(await appearance(card)).toEqual(expected);
    await expect(
      card.getByRole("textbox", { name: "Name", exact: true }),
    ).toBeEditable();
    await card
      .getByRole("button", { name: "Adaptive settings", exact: true })
      .press("Enter");
    await expect(
      card.getByRole("textbox", { name: "From line height", exact: true }),
    ).toBeVisible();
    await card.screenshot({
      path: info.outputPath(`line-height-card-${dark ? "dark" : "light"}.png`),
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}
