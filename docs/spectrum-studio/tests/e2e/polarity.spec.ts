// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";

test.beforeEach(async ({ page }) => {
  await enableEditMode(page);
});

async function sliderValue(page: Page, name: string | RegExp) {
  return Number(
    await page
      .getByRole("slider", { name, exact: typeof name === "string" })
      .inputValue(),
  );
}

test("polarity compensation adjusts contrasts by background and keeps authored values", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page.getByRole("tab", { name: "Color scales" }).click();
  await page.getByRole("tab", { name: "Contrasts" }).click();

  const authored = await sliderValue(page, "200");
  await page.getByRole("button", { name: "Advanced" }).click();
  const compensation = page.getByRole("slider", {
    name: "Polarity compensation",
  });
  await compensation.focus();
  for (let step = 0; step < 50; step += 1)
    await page.keyboard.press("ArrowRight");
  expect(await compensation.inputValue()).toBe("0.5");
  await page.keyboard.press("Escape");
  await expect(compensation).toHaveCount(0);
  expect(await sliderValue(page, "200")).toBe(authored);

  const background = page.getByRole("slider", { name: /Background lightness/ });
  await background.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => sliderValue(page, "200")).toBeGreaterThan(authored);
  await expect(page.getByText("Editing dark background values.")).toBeVisible();

  await page.getByRole("slider", { name: "200", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Remove overrides" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset dark override for contrast 200" }),
  ).toBeVisible();

  await background.focus();
  await page.keyboard.press("End");
  await expect.poll(() => sliderValue(page, "200")).toBe(authored);

  await page.getByRole("button", { name: "Remove overrides" }).click();
  await expect(
    page.getByRole("button", { name: "Remove overrides" }),
  ).toHaveCount(0);

  await page.getByRole("radio", { name: "Code" }).dispatchEvent("click");
  await expect(page.getByText(/\[data-color-scheme="dark"\]/)).toBeVisible();
  await page.getByRole("radio", { name: "Elements" }).dispatchEvent("click");

  expect(errors).toEqual([]);
});
