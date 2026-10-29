// Copyright 2026 Adobe. All rights reserved.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const EXPECTED: number[] = JSON.parse(
  readFileSync(
    new URL("../fixtures/spacing-global.json", import.meta.url),
    "utf8",
  ),
);

for (const [story, widths] of [
  ["default", [8]],
  ["smallest", [1]],
  ["largest", [144]],
  ["negative-value-renders-empty", [0]],
  ["global-scale", EXPECTED],
  ["narrow", EXPECTED],
] as const) {
  test(`Spacing bar ${story} story renders exact bar lengths`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `/iframe.html?id=views-spacing-bar--${story}&viewMode=story`,
    );
    const bars = page.locator("[data-testid='spacing-bar']");
    await expect(bars).toHaveCount(widths.length);
    expect(
      await bars.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().width),
      ),
    ).toEqual([...widths]);
    expect(
      await bars.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
    ).toEqual(widths.map(() => 40));
    expect(errors).toEqual([]);
  });
}

for (const story of [
  "default",
  "dark",
  "narrow-long-name",
  "single-value",
  "empty",
  "invalid-values",
]) {
  test(`Scale editor ${story} opens without layout or runtime errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({
      width: story === "narrow-long-name" ? 320 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=components-scale-editor--${story}&viewMode=story`,
    );
    const trigger = page.locator(".scaleEditorTrigger");
    if (story === "default")
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
    await expect(trigger).toBeVisible();
    expect(
      await trigger.evaluate(
        (element) => (element as HTMLElement).offsetHeight,
      ),
    ).toBe(44);
    expect(
      await trigger.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const preview = trigger.locator(".scaleEditorPreview");
    expect(
      await preview.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBe(32);
    const bars = trigger.locator(".numericScaleRampBar");
    if (story !== "empty") {
      const color = await bars
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(color).not.toBe("rgba(0, 0, 0, 0)");
      expect(color).not.toBe("transparent");
    }
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return (
          !!box && box.x >= 0 && box.x + box.width <= page.viewportSize()!.width
        );
      })
      .toBe(true);
    await page.getByRole("textbox", { name: "Scale name" }).fill("Updated");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}
