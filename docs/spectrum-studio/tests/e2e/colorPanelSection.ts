// Copyright 2026 Adobe. All rights reserved.
import { expect, type Page } from "@playwright/test";

export async function selectColorPanelSection(page: Page, name: string) {
  const panel = page.getByRole("tabpanel", { name: "Colors", exact: true });
  await expect(panel).toBeVisible();
  const tab = panel.getByRole("tab", { name, exact: true });
  if (await tab.count()) await tab.click();
  else {
    await panel.getByRole("button", { name: /Color system controls$/ }).click();
    await page.getByRole("option", { name, exact: true }).click();
  }
}
