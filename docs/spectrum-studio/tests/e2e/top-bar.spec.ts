// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const width of [1440, 480]) {
  test(`TopBar reveals and focuses search at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const header = page.locator('[data-component="TopBar"]');
    const searchButton = header.getByRole("button", {
      name: "Search",
      exact: true,
    });
    const searchField = header.getByRole("searchbox", {
      name: "Search design data",
      exact: true,
    });
    await expect(searchField).toHaveCount(0);
    await searchButton.click();
    await expect(searchButton).toHaveCount(0);
    await expect(searchField).toBeVisible();
    await expect(searchField).toBeFocused();
    await page.keyboard.type("color");
    await expect(searchField).toHaveValue("color");
    expect(errors).toEqual([]);
  });
}

for (const isEditMode of [false, true]) {
  test(`TopBar collapses modes without wrapping in ${isEditMode ? "edit" : "browse"} mode`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((editing) => {
      localStorage.setItem(
        "leonardo:v1:view/edit-mode",
        JSON.stringify({ schemaVersion: 1, data: editing }),
      );
      localStorage.setItem(
        "leonardo:v1:modes/adaptive-claims",
        JSON.stringify({
          schemaVersion: 1,
          data: {
            "color.backgroundLightness": "mode-set-color-scheme",
            "color.contrastMultiplier": "mode-set-contrast",
          },
        }),
      );
    }, isEditMode);
    await page.setViewportSize({ width: 2400, height: 900 });
    await page.goto("/");
    const center = page.locator("#modeControls");
    await expect(center).toHaveAttribute("data-layout", "full");
    const widths = await center.evaluate((element) => {
      const header = element.closest("header")!;
      const probe = element.querySelector(".topBarControlMeasure")!;
      const modes = probe.children[0].getBoundingClientRect().width;
      const adaptive = probe.children[1].getBoundingClientRect().width;
      const icon = probe
        .querySelector("button[aria-label='Adaptive controls']")!
        .getBoundingClientRect().height;
      return {
        reserved:
          header.getBoundingClientRect().width -
          element.getBoundingClientRect().width,
        modes,
        adaptive,
        icon,
      };
    });
    expect((await center.boundingBox())!.width).toBeGreaterThan(2400 / 3);

    await page.setViewportSize({
      width: Math.ceil(widths.reserved + widths.modes + widths.icon + 26),
      height: 900,
    });
    await expect(center).toHaveAttribute("data-layout", "icon");
    const adaptive = center.getByRole("button", { name: "Adaptive controls" });
    await expect(adaptive).toHaveText("");
    await expect(
      center.getByRole("radio", { name: "Light", exact: true }),
    ).toBeVisible();

    const compactWidth = Math.ceil(
      widths.reserved + widths.modes + widths.icon - 16,
    );
    await page.setViewportSize({ width: compactWidth, height: 900 });
    await expect(center).toHaveAttribute("data-layout", "combined");
    const picker = center.getByRole("button", { name: /^Modes/ });
    await picker.click();
    await expect(
      page
        .getByRole("group", { name: "Color scheme", exact: true })
        .getByText("Color scheme", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("group", { name: "Contrast", exact: true })
        .getByText("Contrast", { exact: true }),
    ).toBeVisible();
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await page.getByRole("option", { name: "High", exact: true }).click();
    await expect(
      page.getByRole("option", { name: "Dark", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("option", { name: "Light", exact: true }),
    ).toHaveAttribute("aria-selected", "false");
    await expect(
      page.getByRole("option", { name: "High", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await expect(
      page.getByRole("option", { name: "Dark", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");

    await adaptive.click();
    await expect(
      page.getByRole("slider", { name: "Background lightness" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 480, height: 900 });
    await expect(center).toHaveAttribute("data-layout", "combined");
    expect(
      await center.evaluate((element) => {
        const visible = [...element.children].filter(
          (child) =>
            child.getBoundingClientRect().width > 0 &&
            getComputedStyle(child).visibility !== "hidden",
        );
        return visible.every(
          (child) =>
            child.getBoundingClientRect().top >=
              element.getBoundingClientRect().top &&
            child.getBoundingClientRect().bottom <=
              element.getBoundingClientRect().bottom + 1,
        );
      }),
    ).toBe(true);

    await page.setViewportSize({ width: 2400, height: 900 });
    await expect(center).toHaveAttribute("data-layout", "full");
    await expect(
      center.getByRole("radio", { name: "Dark", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      center.getByRole("radio", { name: "High", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(adaptive).toHaveText("Adaptive controls");
    expect(errors).toEqual([]);
  });
}
