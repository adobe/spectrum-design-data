// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { termLabel } from "../../src/features/taxonomy/termPresentation";
import { selectColorPanelSection } from "./colorPanelSection";

for (const width of [1600, 375]) {
  test(`publishing and interpolation settings share a row at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const scale = createDefaultSnapshot().colorSystem.scales[0];
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("/");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("tab", { name: "Colors", exact: true }).click();
    await selectColorPanelSection(page, "Color scales");
    await page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .getByRole("button", { name: termLabel(scale.name), exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: `Edit ${termLabel(scale.name)} scale`,
    });
    const publishingCheckbox = dialog.getByRole("checkbox", {
      name: "Hide from publishing",
      exact: true,
    });
    const publishing = publishingCheckbox.locator("xpath=ancestor::label");
    const interpolation = dialog.getByRole("button", { name: /Interpolation/ });
    await expect(publishing).toBeVisible();
    await expect(publishingCheckbox).toBeEnabled();
    await expect(interpolation).toBeVisible();
    await expect(interpolation).toBeEnabled();
    await expect
      .poll(async () => {
        const left = await publishing.boundingBox();
        const right = await interpolation.boundingBox();
        return (
          left !== null &&
          right !== null &&
          right.x >= left.x + left.width &&
          Math.abs(left.y + left.height - right.y - right.height) <= 2
        );
      })
      .toBe(true);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}
