// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const story = (page: Page, id: string) =>
  page.goto(`/iframe.html?id=panels-add-token--${id}&viewMode=story`);

test.describe("Add token walk-through", () => {
  let errors: string[];
  test.beforeEach(({ page }) => {
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
  });
  test.afterEach(() => expect(errors).toEqual([]));

  test("steps through kind, type and a Registry question", async ({ page }) => {
    await story(page, "walk-through");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Step 1 of 3")).toBeVisible();
    await dialog.getByRole("option", { name: /Raw value/ }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("option", { name: /Colors/ }).click();
    await expect(dialog.getByText(/^Step 2 of \d+$/)).toBeVisible();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByRole("button", { name: "Skip" })).toBeVisible();
    await expect(dialog.getByRole("status")).toContainText("Name:");
  });

  test("creates a raw color draft from the review step", async ({ page }) => {
    await story(page, "raw-color-review");
    // The story's play function presses Create; assert the outcome.
    await expect(
      page.getByRole("alert").filter({ hasText: "Token added" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("blocks a duplicate name", async ({ page }) => {
    await story(page, "duplicate-name");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("This token already exists")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
