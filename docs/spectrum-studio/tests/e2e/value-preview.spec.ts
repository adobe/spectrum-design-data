// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openTokens(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
}
async function hideChanges(page: Page) {
  if (await page.locator('[data-component="ChangelogPanel"]').isVisible())
    await page.getByRole("button", { name: /^Change log/ }).click();
}

for (const { appearance, width } of [
  { appearance: "light", width: 1280 },
  { appearance: "dark", width: 800 },
]) {
  test.describe(`${appearance} at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("Tokens typography meaning is consistent in list and grid", async ({
      page,
    }) => {
      await openTokens(page);
      if (appearance === "dark")
        await page
          .getByRole("button", { name: "Dark app appearance", exact: true })
          .click();
      await hideChanges(page);
      await page
        .getByRole("radio", { name: "Typography", exact: true })
        .click();
      const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
      const font = table.locator('[data-value-preview="font-size"]').first();
      await font.scrollIntoViewIfNeeded();
      await expect(font.locator(".valuePreviewText")).toHaveText("Ag");
      const tokenId = await font
        .locator("xpath=ancestor::*[@role='row'][1]")
        .getAttribute("data-token-id");
      const row = table.locator(`[data-token-id=${JSON.stringify(tokenId)}]`);
      const value = await row.locator(".tokenValue").textContent();
      const size = await font
        .locator(".valuePreviewText")
        .evaluate((element) => getComputedStyle(element).fontSize);
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await row.getByRole("button", { name: /^Open / }).click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Save", exact: true }),
      ).toHaveCount(0);
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("radio", { name: "Grid view", exact: true }).click();
      const cardFont = page.locator('[data-value-preview="font-size"]').first();
      await cardFont.scrollIntoViewIfNeeded();
      await expect(cardFont).toHaveCSS("height", "136px");
      await expect(cardFont.locator(".valuePreviewText")).toHaveCSS(
        "font-size",
        size,
      );
      expect(value?.trim()).not.toBe("");
    });

    test("A token edit updates its preview and Changelog without changing revert behavior", async ({
      page,
    }) => {
      await enableEditMode(page);
      await openTokens(page);
      if (appearance === "dark")
        await page
          .getByRole("button", { name: "Dark app appearance", exact: true })
          .click();
      await hideChanges(page);
      await page.getByRole("radio", { name: "Spacing", exact: true }).click();
      const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
      const candidate = table
        .locator("[data-token-name]")
        .filter({ has: page.locator('[data-value-preview="block"]') })
        .filter({ has: page.getByRole("checkbox") })
        .first();
      await candidate.scrollIntoViewIfNeeded();
      const tokenId = await candidate.getAttribute("data-token-id");
      const row = table.locator(`[data-token-id=${JSON.stringify(tokenId)}]`);
      const name = await row.getAttribute("data-token-name");
      const beforeValue = await row.locator(".tokenValue").textContent();
      const beforeWidth = await row
        .locator(".valuePreviewShape")
        .evaluate((element) => getComputedStyle(element).width);
      const checkbox = row.getByRole("checkbox");
      await checkbox.press("Space");
      await expect(row).toHaveAttribute("aria-selected", "true");
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await row
        .getByRole("button", { name: `Open ${name}`, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("textbox", { name: "Value", exact: true })
        .fill("17");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = 0;
      });
      await expect(row.locator(".valuePreviewShape")).toHaveCSS(
        "width",
        "17px",
      );
      await expect(row.locator(".tokenValue")).toHaveText("17px");
      await expect(row).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: /^Change log/ }).click();
      const panel = page.locator('[data-component="ChangelogPanel"]');
      await panel.getByRole("tab", { name: "Log", exact: true }).click();
      const scope = panel.locator(
        `[data-change-id=${JSON.stringify(tokenId)}]`,
      );
      await expect(scope).toBeVisible();
      await expect(
        scope
          .locator('[data-value-preview="block"] .valuePreviewShape')
          .first(),
      ).toHaveCSS("width", beforeWidth);
      await expect(
        scope.locator('[data-value-preview="block"] .valuePreviewShape').last(),
      ).toHaveCSS("width", "17px");
      await expect(scope).toContainText(beforeValue!);
      await scope
        .getByRole("button", { name: /^Reset Value,/ })
        .first()
        .click();
      await hideChanges(page);
      await expect(row.locator(".tokenValue")).toHaveText(beforeValue!);
      await expect(row.locator(".valuePreviewShape")).toHaveCSS(
        "width",
        beforeWidth,
      );
    });
  });
}
