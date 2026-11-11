// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import Color from "colorjs.io";
import {
  pickerColorsEqual,
  mapColorToGamut,
} from "../../src/components/color-picker/colorUtils";

test("picker exposes two named area axes and meaningful channel values", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--transparent-edits&viewMode=story",
  );
  const area = page.getByRole("group", { name: "Color area", exact: true });
  const red = area.getByRole("slider", { name: "Red", exact: true });
  const green = area.getByRole("slider", { name: "Green", exact: true });
  await expect(red).toHaveAttribute("aria-valuenow", "0.2");
  await expect(red).toHaveAttribute("type", "range");
  await expect(red).toHaveAttribute("aria-valuemin", "0");
  await expect(red).toHaveAttribute("aria-valuemax", "1");
  await expect(red).toHaveAttribute("aria-valuetext", "51");
  await expect(green).toHaveAttribute("aria-orientation", "vertical");
  await red.focus();
  await red.press("Tab");
  await expect(green).toBeFocused();
  const areaBounds = (await area.boundingBox())!;
  await green.press("ArrowUp");
  await expect
    .poll(async () => Number(await green.getAttribute("aria-valuenow")))
    .toBeCloseTo(0.4 + 1 / areaBounds.height, 10);
  await expect(red).toHaveAttribute("aria-valuenow", "0.2");
  await green.press("Tab");
  const blue = page.getByRole("slider", { name: "Blue", exact: true });
  await expect(blue).toBeFocused();
  await expect(blue).toHaveAttribute("aria-valuetext", "153");
  const bounds = await red.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(24);
  expect(bounds!.height).toBeGreaterThanOrEqual(24);
  await red.press("Home");
  await expect(red).toHaveAttribute("aria-valuenow", "0");
  await red.press("End");
  await expect(red).toHaveAttribute("aria-valuenow", "1");
  expect(errors).toEqual([]);
});

test("all color-only edit routes retain alpha and avoid duplicate drag commits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--transparent-edits&viewMode=story",
  );
  const state = page.getByTestId("picker-state");
  const checkAlpha = async () => {
    await expect(state).toHaveAttribute("data-alpha", "0.35");
    const color = await state.getAttribute("data-color");
    expect(Number(new Color(color!).alpha)).toBe(0.35);
  };
  await expect(state).toHaveAttribute("data-changes", "0");
  await page
    .getByRole("slider", { name: "Red", exact: true })
    .press("ArrowRight");
  await checkAlpha();
  const green = page.getByRole("textbox", { name: /^Green/ });
  await green.fill("110");
  await green.press("Tab");
  await checkAlpha();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#123456");
  await checkAlpha();
  await hex.press("Tab");

  const area = page.locator(".colorPickerInteractionCanvas");
  const bounds = (await area.boundingBox())!;
  const previous = Number(await state.getAttribute("data-changes"));
  await page.mouse.move(
    bounds.x + bounds.width * 0.4,
    bounds.y + bounds.height * 0.4,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.6,
    { steps: 4 },
  );
  await expect(state).toHaveAttribute("data-changes", String(previous));
  await page.mouse.up();
  await expect(state).toHaveAttribute("data-changes", String(previous + 1));
  await checkAlpha();

  await page.getByRole("radio", { name: "Channels", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Blue", exact: true });
  await slider.press("ArrowLeft");
  await checkAlpha();
  const track = page.locator(".colorPickerSliderCanvas").nth(2);
  const trackBounds = (await track.boundingBox())!;
  const beforeDrag = Number(await state.getAttribute("data-changes"));
  await page.mouse.move(
    trackBounds.x + trackBounds.width * 0.4,
    trackBounds.y + 12,
  );
  await page.mouse.down();
  await page.mouse.move(
    trackBounds.x + trackBounds.width * 0.6,
    trackBounds.y + 12,
  );
  await expect(state).toHaveAttribute("data-changes", String(beforeDrag));
  await page.mouse.up();
  await expect(state).toHaveAttribute("data-changes", String(beforeDrag + 1));
  await checkAlpha();
  const count = await state.getAttribute("data-changes");
  await page.getByRole("radio", { name: "Polar model" }).click();
  await expect(state).toHaveAttribute("data-changes", count!);
  await page
    .getByRole("slider", { name: "Saturation", exact: true })
    .press("ArrowLeft");
  await checkAlpha();
  expect(errors).toEqual([]);
});

test("sRGB editing notation does not clip a Rec 2020 callback payload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--wide-gamut-edits&viewMode=story",
  );
  const state = page.getByTestId("picker-state");
  await expect(state).toHaveAttribute("data-changes", "0");
  const source = new Color("color(rec2020 0.85 0.1 0.1 / 0.35)").to("srgb");
  const trackBounds = (await page.locator(".colorPickerSlider").boundingBox())!;
  source.coords[2] = Math.min(
    1,
    Math.max(0, source.coords[2]) + 1 / trackBounds.height,
  );
  const reference = mapColorToGamut(source, "Rec2020");
  await page
    .getByRole("slider", { name: "Blue", exact: true })
    .press("ArrowUp");
  await expect(state).toHaveAttribute("data-changes", "1");
  const accepted = new Color((await state.getAttribute("data-color"))!);
  expect(pickerColorsEqual(reference, accepted)).toBe(true);
  expect(accepted.inGamut("srgb")).toBe(false);
  expect(Number(accepted.alpha)).toBe(0.35);
  expect(errors).toEqual([]);
});

test("pointer cancellation commits the last preview once in both picker views", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--transparent-edits&viewMode=story",
  );
  const state = page.getByTestId("picker-state");
  for (const view of ["Color area", "Channels"]) {
    await page.getByRole("radio", { name: view, exact: true }).click();
    const target =
      view === "Color area"
        ? page.locator(".colorPickerInteractionCanvas")
        : page.locator(".colorPickerChannels .colorPickerSliderCanvas").first();
    await target.evaluate((element) => {
      element.parentElement!.addEventListener(
        "pointerdown",
        (event) => {
          element.setAttribute("data-pointer-id", String(event.pointerId));
        },
        { capture: true, once: true },
      );
    });
    const bounds = (await target.boundingBox())!;
    const before = Number(await state.getAttribute("data-changes"));
    await page.mouse.move(
      bounds.x + bounds.width * 0.3,
      bounds.y + bounds.height * 0.3,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.6,
      bounds.y + bounds.height * 0.6,
    );
    await expect(state).toHaveAttribute("data-changes", String(before));
    await expect(target).toHaveAttribute("data-pointer-id", /^\d+$/);
    await target.dispatchEvent("pointercancel", {
      pointerId: Number(await target.getAttribute("data-pointer-id")),
      pointerType: "mouse",
    });
    await expect(state).toHaveAttribute("data-changes", String(before + 1));
    await page.mouse.up();
    await expect(state).toHaveAttribute("data-changes", String(before + 1));
    expect(
      Number(new Color((await state.getAttribute("data-color"))!).alpha),
    ).toBe(0.35);
  }
  expect(errors).toEqual([]);
});

test("malformed input requires a valid deliberate replacement, not a black fallback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--invalid-input-fallback&viewMode=story",
  );
  const state = page.getByTestId("picker-state");
  const replacement = page.getByRole("textbox", { name: "Color", exact: true });
  await expect(replacement).toHaveValue("not-a-color");
  await expect(replacement).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Enter a valid CSS color, such as #336699."),
  ).toBeVisible();
  await expect(page.locator(".colorPickerArea")).toHaveCount(0);
  await replacement.fill("rgb(12, 340, Q)");
  await replacement.press("Enter");
  await expect(state).toHaveAttribute("data-changes", "0");
  await replacement.fill("oklch(0.7 0.4 40)");
  await expect(state).toHaveAttribute("data-changes", "0");
  await replacement.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Hex", exact: true }),
  ).toBeVisible();
  await expect(state).toHaveAttribute("data-changes", "1");
  const accepted = new Color((await state.getAttribute("data-color"))!);
  expect(
    pickerColorsEqual(
      accepted,
      mapColorToGamut(new Color("oklch(0.7 0.4 40)"), "sRGB"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Restore incoming color" }).click();
  await expect(replacement).toHaveValue("not-a-color");
  await expect(replacement).toHaveAttribute("aria-invalid", "true");
  await expect(state).toHaveAttribute("data-changes", "1");
  expect(errors).toEqual([]);
});

test("valid out-of-gamut input opens without an error or automatic write", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--out-of-gamut-input&viewMode=story",
  );
  await expect(
    page.getByRole("group", { name: "Color area", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("picker-state")).toHaveAttribute(
    "data-changes",
    "0",
  );
  await expect(
    page.getByText("Enter a valid CSS color, such as #336699."),
  ).toHaveCount(0);
  await page
    .getByRole("slider", { name: "Lightness", exact: true })
    .press("ArrowDown");
  await expect(page.getByTestId("picker-state")).toHaveAttribute(
    "data-changes",
    "1",
  );
  const payload = (await page
    .getByTestId("picker-state")
    .getAttribute("data-color"))!;
  expect(new Color(payload).inGamut("srgb")).toBe(true);
  expect(errors).toEqual([]);
});

test("medium-sized model and control buttons align with the color pickers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--compact-toolbar&viewMode=story",
  );
  const gamut = page.getByRole("button", { name: /Gamut/ });
  const gamutHeight = await gamut.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  for (const name of [
    "Cartesian model",
    "Polar model",
    "Color area",
    "Channels",
  ]) {
    await expect(page.getByRole("radio", { name, exact: true })).toHaveCSS(
      "height",
      `${gamutHeight}px`,
    );
  }
  expect(gamutHeight).toBeGreaterThanOrEqual(32);
  expect(errors).toEqual([]);
});

test("compact toolbar keeps exactly one selection without changing the color", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-color-picker--compact-toolbar&viewMode=story",
  );
  await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
  expect(errors).toEqual([]);
});

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
  await story.getByRole("option", { name: "Rec 2020", exact: true }).click();
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
