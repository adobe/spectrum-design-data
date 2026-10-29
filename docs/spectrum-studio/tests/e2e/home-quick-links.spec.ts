// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const [destination, label] of [
  ["tokens", "Tokens"],
  ["foundations", "Foundations"],
  ["components", "Components"],
  ["system-health", "System health"],
]) {
  test(`Home quick link opens ${label} and updates sidebar selection`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const home = page.locator('[data-component="Home"]');
    const link = home.locator(`a[href="#${destination}"]`);
    await expect(link).toBeVisible();
    if (destination === "foundations") {
      await link.focus();
      await page.keyboard.press("Enter");
    } else {
      await link.click();
    }
    await expect(home).toHaveCount(0);
    const navigation = page.getByRole("navigation", {
      name: "Navigation",
      exact: true,
    });
    await expect(
      navigation.locator(`a[href="#${destination}"]`),
    ).toHaveAttribute("aria-current", "page");
    if (destination === "system-health") {
      await expect(
        page.locator('[data-component="SystemHealth"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "System health",
          level: 1,
          exact: true,
        }),
      ).toBeVisible();
    }
    await navigation.getByRole("link", { name: "Home", exact: true }).click();
    await expect(home).toBeVisible();
    expect(errors).toEqual([]);
  });
}
