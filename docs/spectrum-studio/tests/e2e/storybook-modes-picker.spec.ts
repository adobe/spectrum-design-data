// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Modes picker story completes pointer and keyboard interactions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    "/iframe.html?id=components-modes-picker--default&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  await page.getByRole("button", { name: /^Modes/ }).click();
  await expect(
    page.getByRole("option", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("option", { name: "High", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Regular", exact: true }),
  ).toHaveAttribute("aria-selected", "false");
  await expect(
    page.getByRole("option", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

for (const variant of ["custom", "dark-theme", "narrow"]) {
  test(`Modes picker ${variant} story renders sections at narrow widths`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      `/iframe.html?id=components-modes-picker--${variant}&viewMode=story`,
    );
    const trigger = page.getByRole("button", { name: /^Modes/ });
    await trigger.click();
    await expect(
      page
        .getByRole("group", { name: "Color scheme" })
        .getByText("Color scheme", { exact: true }),
    ).toBeVisible();
    if (variant === "custom") {
      await expect(
        page.getByRole("option", { name: "Light", exact: true }),
      ).toHaveAttribute("aria-selected", "false");
      await expect(
        page.getByRole("option", { name: "Dark", exact: true }),
      ).toHaveAttribute("aria-selected", "false");
    }
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await expect(
      page.getByRole("option", { name: "Dark", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("Modes picker is disabled without selectable mode sets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-modes-picker--empty&viewMode=story",
  );
  await expect(page.getByRole("button", { name: /^Modes/ })).toBeDisabled();
  expect(errors).toEqual([]);
});
