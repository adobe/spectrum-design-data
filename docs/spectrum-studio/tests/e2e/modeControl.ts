// Copyright 2026 Adobe. All rights reserved.
import { expect, type Page } from "@playwright/test";

/** Uses foundation selection when available, otherwise the responsive Preview toolbar. */
export async function selectMode(page: Page, name: string) {
  const row = page
    .locator('[data-component="FoundationModeSetCard"]')
    .getByRole("row")
    .filter({ has: page.getByText(name, { exact: true }) })
    .first();
  if (await row.isVisible()) {
    await row.click();
    return;
  }
  let toolbar = page.locator('[data-component="PreviewToolbar"]');
  if (!(await toolbar.isVisible())) {
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    toolbar = page.locator('[data-component="PreviewToolbar"]');
  }
  const radio = toolbar.getByRole("radio", { name, exact: true });
  const picker = toolbar.getByRole("button", { name: /^Modes/ });
  await expect(radio.or(picker).first()).toBeVisible();
  if (await radio.isVisible()) {
    await radio.click();
    return;
  }
  await picker.click();
  await page.getByRole("option", { name, exact: true }).click();
  await page.keyboard.press("Escape");
}
