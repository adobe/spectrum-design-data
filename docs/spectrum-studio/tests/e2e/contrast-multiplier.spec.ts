// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectMode } from "./modeControl";

// Edit mode plus the three default mode sets need this width before the top bar collapses into the Modes picker.
test.use({ viewport: { width: 1600, height: 900 } });

async function sliderValue(page: Page, name: string) {
  return Number(
    await page.getByRole("slider", { name, exact: true }).inputValue(),
  );
}

test("overall contrast multiplies contrasts and follows the contrast mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  const overall = page.getByRole("slider", { name: "Overall contrast" });
  await expect(overall).toHaveValue("1");

  await page.getByRole("tab", { name: "Contrasts" }).click();
  const regular = await sliderValue(page, "400");

  await selectMode(page, "High");
  await expect(overall).toHaveValue("2");
  await expect
    .poll(() => sliderValue(page, "400"))
    .toBeCloseTo((regular - 1) * 2 + 1, 2);

  await selectMode(page, "Regular");
  await expect(overall).toHaveValue("1");
  await expect.poll(() => sliderValue(page, "400")).toBeCloseTo(regular, 2);

  await page.getByRole("radio", { name: "Code" }).dispatchEvent("click");
  await expect(page.getByText(/\[data-contrast="high"\]/)).toBeVisible();
  await expect(page.getByText(/prefers-contrast: more/)).toBeVisible();

  expect(errors).toEqual([]);
});
