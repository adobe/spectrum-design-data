// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("renders the default color picker story without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");

  await expect(
    story.getByRole("button", { name: /Color space/ }),
  ).toBeVisible();
  await expect(story.locator(".colorPickerCanvas")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("renders the spacing rounding-rule editor story", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?path=/story/components-rule-editor-dialog--spacing-ladder",
  );
  const story = page.frameLocator("iframe");
  await expect(story.getByRole("dialog")).toBeVisible();
  await expect(
    story.getByText("Spacing › Global: no values change"),
  ).toBeVisible();
  await expect(
    story.getByRole("button", { name: "Add condition" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("runs the condition-list reorder interaction story", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?path=/story/components-rule-condition-list--ordered-conditions",
  );
  const story = page.frameLocator("iframe");
  await expect(
    story.getByRole("textbox", { name: "Condition 1 threshold Threshold" }),
  ).toHaveValue("10");
  await expect(
    story.getByRole("button", { name: "Move condition 1 down" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("renders the polar color picker story with the expected channels", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--polar-model");
  const story = page.frameLocator("iframe");

  await expect(story.getByRole("radio", { name: "Polar model" })).toBeVisible();
  await expect(story.getByText("S × L", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("renders a chromatic OKLCH lightness gradient", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--oklch-cartesian");
  const story = page.frameLocator("iframe");

  await expect(
    story.getByRole("textbox", { name: "Red/green" }),
  ).not.toHaveValue("0");
  await story.getByRole("radio", { name: "Polar model" }).click();
  await expect(story.getByText("C × H", { exact: true })).toBeVisible();

  await expect
    .poll(async () =>
      story.locator(".colorPickerSliderCanvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixel = canvas
          .getContext("2d")!
          .getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        return (
          Math.max(pixel[0], pixel[1], pixel[2]) -
          Math.min(pixel[0], pixel[1], pixel[2])
        );
      }),
    )
    .toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test("renders synchronized independent channel sliders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");
  await story.getByRole("radio", { name: "Channels" }).click();

  const channels = story.locator(".colorPickerChannels");
  await expect(channels).toBeVisible();
  await expect(story.locator(".colorPickerArea")).toHaveCount(0);
  await expect(channels.locator(".colorPickerSlider-horizontal")).toHaveCount(
    3,
  );
  await expect(channels.locator("canvas")).toHaveCount(3);
  await expect(channels.getByText("Red", { exact: true })).toBeVisible();
  await expect(channels.getByText("Green", { exact: true })).toBeVisible();
  await expect(channels.getByText("Blue", { exact: true })).toBeVisible();

  const redInput = story.getByRole("textbox", { name: "Red" });
  const redSlider = story.getByRole("slider", { name: "Red" });
  const greenSlider = story.getByRole("slider", { name: "Green" });
  const greenValue = await greenSlider.getAttribute("aria-valuenow");
  await redSlider.press("ArrowLeft");
  await expect(redInput).not.toHaveValue("112");

  const greenCanvas = channels.locator(".colorPickerSliderCanvas").nth(1);
  const greenBounds = await greenCanvas.boundingBox();
  expect(greenBounds).not.toBeNull();
  await greenCanvas.dispatchEvent("pointermove", {
    clientX: greenBounds!.x + 20,
    clientY: greenBounds!.y + 12,
    pointerId: 71,
    pointerType: "mouse",
    buttons: 0,
  });
  expect(await greenSlider.getAttribute("aria-valuenow")).toBe(greenValue);

  await story.getByRole("radio", { name: "Polar model" }).click();
  await expect(story.getByRole("slider", { name: "Hue" })).toBeVisible();
  await expect(story.getByRole("slider", { name: "Saturation" })).toBeVisible();
  await expect(story.getByRole("slider", { name: "Lightness" })).toBeVisible();
  await story.getByRole("radio", { name: "Color area" }).click();
  await expect(story.getByText("S × L", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("applies valid hex entries immediately and synchronizes channel inputs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");
  const hex = story.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toHaveValue("#707070");

  await hex.fill("336699");
  await expect(hex).toBeFocused();
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("51");
  await expect(story.getByRole("textbox", { name: /^Green/ })).toHaveValue(
    "102",
  );
  await expect(story.getByRole("textbox", { name: /^Blue/ })).toHaveValue(
    "153",
  );
  await hex.press("Tab");
  await expect(hex).toHaveValue("#336699");

  const red = story.getByRole("textbox", { name: /^Red/ });
  await red.fill("255");
  await red.press("Tab");
  await expect(hex).toHaveValue("#ff6699");

  await story.getByRole("radio", { name: "Channels", exact: true }).click();
  await hex.fill("#00ff00");
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("0");
  await expect(story.getByRole("textbox", { name: /^Green/ })).toHaveValue(
    "255",
  );
  await expect(story.getByRole("textbox", { name: /^Blue/ })).toHaveValue("0");
  await story
    .getByRole("slider", { name: "Green", exact: true })
    .press("ArrowLeft");
  await expect(hex).not.toHaveValue("#00ff00");
  expect(errors).toEqual([]);
});

test("preserves hex text while typing from shorthand to a six-digit value", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");
  const hex = story.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#123");
  await expect(hex).toHaveValue("#123");
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("17");
  await hex.press("End");
  await hex.pressSequentially("4");
  await expect(hex).toHaveValue("#1234");
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("17");
  await hex.pressSequentially("56");
  await expect(hex).toHaveValue("#123456");
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("18");
  await expect(story.getByRole("textbox", { name: /^Green/ })).toHaveValue(
    "52",
  );
  await expect(story.getByRole("textbox", { name: /^Blue/ })).toHaveValue("86");
  await hex.fill("  #ABC  ");
  await expect(story.getByRole("textbox", { name: /^Red/ })).toHaveValue("170");
  await hex.press("Enter");
  await expect(hex).toHaveValue("#aabbcc");
  expect(errors).toEqual([]);
});

test("rejects invalid hex without changing the color and recovers on valid input", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");
  const hex = story.getByRole("textbox", { name: "Hex", exact: true });
  const red = story.getByRole("textbox", { name: /^Red/ });
  await hex.fill("#zzzzzz");
  await hex.press("Tab");
  await expect(hex).toHaveValue("#zzzzzz");
  await expect(hex).toHaveAttribute("aria-invalid", "true");
  await expect(
    story.getByText("Enter a 3- or 6-digit hex color, such as #336699."),
  ).toBeVisible();
  await expect(red).toHaveValue("112");
  await hex.fill("#ffffff");
  await expect(red).toHaveValue("255");
  await expect(hex).not.toHaveAttribute("aria-invalid", "true");

  await hex.fill("");
  await hex.press("Tab");
  await expect(hex).toHaveAttribute("aria-invalid", "true");
  await expect(red).toHaveValue("255");
  await red.fill("0");
  await red.press("Tab");
  await expect(hex).toHaveValue("#00ffff");
  await expect(hex).not.toHaveAttribute("aria-invalid", "true");
  expect(errors).toEqual([]);
});

test("shows Hex only for sRGB gamut regardless of color space or model", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?path=/story/components-color-picker--default");
  const story = page.frameLocator("iframe");
  const hex = story.getByRole("textbox", { name: "Hex", exact: true });
  await story.getByRole("button", { name: /Color space/ }).click();
  await story.getByRole("option", { name: "OKLCH", exact: true }).click();
  await expect(hex).toBeVisible();
  await hex.fill("#ff0000");
  await expect(
    story.getByRole("textbox", { name: /^Lightness/ }),
  ).not.toHaveValue("0%");
  await story.getByRole("radio", { name: "Polar model" }).click();
  await expect(hex).toHaveValue("#ff0000");
  await expect(story.getByRole("textbox", { name: /^Chroma/ })).not.toHaveValue(
    "0",
  );

  await story.getByRole("button", { name: /Gamut/ }).click();
  await story.getByRole("option", { name: "Display P3", exact: true }).click();
  await expect(hex).toHaveCount(0);
  await story.getByRole("button", { name: /Gamut/ }).click();
  await story.getByRole("option", { name: "Rec. 2020", exact: true }).click();
  await expect(hex).toHaveCount(0);
  await story.getByRole("button", { name: /Gamut/ }).click();
  await story.getByRole("option", { name: "sRGB", exact: true }).click();
  await expect(hex).toHaveValue("#ff0000");

  await page.goto("/?path=/story/components-color-picker--display-p-3");
  await expect(hex).toHaveCount(0);
  await page.goto(
    "/?path=/story/components-color-picker--without-gamut-picker",
  );
  await expect(story.getByRole("button", { name: /Gamut/ })).toHaveCount(0);
  await expect(hex).toHaveValue("#707070");
  expect(errors).toEqual([]);
});
