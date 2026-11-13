// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";

const story =
  "/iframe.html?id=components-draft-slider--saves-settled-values&viewMode=story";

const sliders = [
  { name: "Overall contrast", state: "contrast-state", scale: 1 },
  { name: "Background lightness", state: "lightness-state", scale: 100 },
];

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(story);
  return errors;
}

async function shownValue(slider: Locator) {
  return Number(await slider.getAttribute("aria-valuenow"));
}

async function savedValue(state: Locator) {
  return Number(await state.getAttribute("data-value"));
}

function thumbCenter(slider: Locator) {
  return slider.evaluate((input) => {
    // The range input is visually hidden inside the thumb.
    let thumb = input.parentElement;
    while (thumb && thumb.getBoundingClientRect().width < 8)
      thumb = thumb.parentElement;
    const box = thumb!.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
}

for (const { name, state: stateId, scale } of sliders) {
  test(`${name}: a drag shows live values and saves once on release`, async ({
    page,
  }) => {
    const errors = await open(page);
    const state = page.getByTestId(stateId);
    const slider = page.getByRole("slider", { name, exact: true });
    await expect(state).toHaveAttribute("data-saves", "0");
    const start = await shownValue(slider);
    const center = await thumbCenter(slider);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 60, center.y, { steps: 6 });
    await expect.poll(() => shownValue(slider)).toBeGreaterThan(start);
    await expect(state).toHaveAttribute("data-saves", "0");
    await page.mouse.up();
    await expect(state).toHaveAttribute("data-saves", "1");
    expect((await savedValue(state)) * scale).toBeCloseTo(
      await shownValue(slider),
      6,
    );
    expect(errors).toEqual([]);
  });

  test(`${name}: each keyboard step saves`, async ({ page }) => {
    const errors = await open(page);
    const state = page.getByTestId(stateId);
    const slider = page.getByRole("slider", { name, exact: true });
    const start = await shownValue(slider);
    await slider.press("ArrowRight");
    await expect(state).toHaveAttribute("data-saves", "1");
    await slider.press("ArrowRight");
    await expect(state).toHaveAttribute("data-saves", "2");
    expect(await shownValue(slider)).toBeGreaterThan(start);
    expect((await savedValue(state)) * scale).toBeCloseTo(
      await shownValue(slider),
      6,
    );
    expect(errors).toEqual([]);
  });
}

test("an assistive-technology change to the range input saves immediately", async ({
  page,
}) => {
  const errors = await open(page);
  const state = page.getByTestId("contrast-state");
  const slider = page.getByRole("slider", {
    name: "Overall contrast",
    exact: true,
  });
  await slider.evaluate((input: HTMLInputElement) => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setValue.call(input, "0.25");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(state).toHaveAttribute("data-saves", "1");
  await expect(state).toHaveAttribute("data-value", "0.25");
  await expect(slider).toHaveAttribute("aria-valuenow", "0.25");
  expect(errors).toEqual([]);
});
