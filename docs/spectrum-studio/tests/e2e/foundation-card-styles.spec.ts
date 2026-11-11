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

test("System settings shares the top-level foundation accordion design", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  const headingAppearance = (button: Locator) =>
    button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        padding: style.padding,
        minHeight: style.minHeight,
        background: style.backgroundColor,
        radius: style.borderRadius,
      };
    });
  let expected: Awaited<ReturnType<typeof headingAppearance>> | undefined;
  let contentInset: number | undefined;
  for (const tab of ["Colors", "Opacity", "Typography", "Elevation"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const panel = page.getByRole("tabpanel", { name: tab, exact: true });
    const settings = panel.getByRole("button", {
      name: "System settings",
      exact: true,
    });
    const modes = panel.getByRole("button", { name: "Mode sets", exact: true });
    await expect(settings).toHaveCount(1);
    await expect(modes).toHaveCount(1);
    const actual = await headingAppearance(settings);
    expected ??= actual;
    expect(actual).toEqual(expected);
    expect(await headingAppearance(modes)).toEqual(expected);
    expect(
      await settings.evaluate((element) => {
        const buttons = [
          ...element.closest('[role="tabpanel"]')!.querySelectorAll("button"),
        ];
        return (
          buttons.indexOf(element as HTMLButtonElement) <
          buttons.findIndex(
            (button) => button.textContent?.trim() === "Mode sets",
          )
        );
      }),
    ).toBe(true);
    await settings.click();
    if (tab !== "Opacity") {
      const table = panel.getByRole("table", {
        name: /parameter availability$/,
      });
      await expect(table).toBeVisible();
      const settingsBounds = await settings.boundingBox();
      const tableBounds = await table.boundingBox();
      expect(settingsBounds).not.toBeNull();
      expect(tableBounds).not.toBeNull();
      const inset = tableBounds!.x - settingsBounds!.x;
      contentInset ??= inset;
      expect(inset).toBeCloseTo(contentInset, 1);
    }
  }
  expect(errors).toEqual([]);
});

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
    await panel.getByRole("tab", { name: "Line heights", exact: true }).click();
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
