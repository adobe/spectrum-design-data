// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const story of [
  "default",
  "wide-output",
  "mapped-rec-2020",
  "read-only",
  "narrow-dark",
  "rejected-change",
]) {
  test(`color settings ${story} has no runtime or interaction errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `/iframe.html?id=panels-color-output-settings--${story}&viewMode=story`,
    );
    if (story === "narrow-dark")
      await page.setViewportSize({ width: 360, height: 900 });
    await expect(
      page.getByRole("checkbox", { name: "Map outputs to sRGB" }),
    ).toBeVisible();
    if (story === "mapped-rec-2020")
      await expect(page.getByRole("status")).toContainText(
        "Color format changed to RGB",
      );
    if (story === "rejected-change")
      await expect(page.getByRole("alert")).toContainText(
        "source reference is unavailable",
      );
    if (story === "read-only") {
      await expect(page.getByRole("button", { name: /Gamut$/ })).toHaveCount(0);
      await expect(page.getByRole("checkbox")).toBeDisabled();
    }
    await expect(page.locator("#storybook-root")).not.toHaveAttribute(
      "data-story-error",
      /.+/,
    );
    expect(errors).toEqual([]);
  });
}
for (const story of ["shared-rec-2020-defaults", "defaults-on-reopen"]) {
  test(`picker ${story} applies shared defaults without resetting an active picker`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `/iframe.html?id=components-color-picker--${story}&viewMode=story`,
    );
    await expect(page.getByRole("button", { name: /Gamut/ })).toContainText(
      "Rec 2020",
    );
    await expect(
      page.getByRole("radio", { name: "Polar model" }),
    ).toBeChecked();
    expect(errors).toEqual([]);
  });
}
