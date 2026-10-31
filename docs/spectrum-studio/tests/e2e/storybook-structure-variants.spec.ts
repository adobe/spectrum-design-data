// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      collected.push(message.text());
  });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
for (const id of [
  "panels-structure-properties--preview-only-boolean",
  "panels-structure-properties--inline-option-name",
  "panels-structure-properties--inline-property-name",
  "panels-structure-properties--empty",
  "panels-structure-properties--read-only",
  "panels-structure-layers--select-and-hide",
  "panels-structure-layers--empty",
  "panels-structure-layers--read-only",
  "components-preview-list-item--structure",
  "components-scale-editor--default",
]) {
  test(`${id} completes its interactions`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}
for (const appearance of ["light", "dark"])
  for (const width of [1280, 480]) {
    test(`Properties and Layers fit ${width}px in ${appearance}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 800 });
      for (const id of [
        "panels-structure-properties--dark",
        "panels-structure-layers--dark",
        "components-preview-list-item--sizing-scale",
      ]) {
        await page.goto(
          `/iframe.html?id=${id}&viewMode=story&globals=colorScheme:${appearance}`,
        );
        await expect(page.locator("#storybook-root")).not.toBeEmpty();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.locator("#storybook-root").screenshot({
          path: info.outputPath(`${id}-${appearance}-${width}.png`),
        });
      }
    });
  }
