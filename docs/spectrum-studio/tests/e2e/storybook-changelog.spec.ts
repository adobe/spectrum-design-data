// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

for (const story of [
  "normal",
  "multiple-sources",
  "locked",
  "unavailable",
  "validation-error",
  "cancel",
  "narrow-dark",
  "narrow-light",
]) {
  test(`Reset confirmation: ${story}`, async ({ page }) => {
    await page.setViewportSize({
      width: story.startsWith("narrow") ? 390 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=changes-reset-confirmation--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
    if (
      [
        "locked",
        "unavailable",
        "validation-error",
        "narrow-dark",
        "narrow-light",
      ].includes(story)
    ) {
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect((await dialog.boundingBox())!.x).toBeGreaterThanOrEqual(0);
      expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
    }
  });
}

for (const story of [
  "mixed",
  "read-only",
  "unavailable-address",
  "narrow-dark",
  "narrow-light",
]) {
  test(`Changed fields: ${story}`, async ({ page }) => {
    await page.setViewportSize({
      width: story.startsWith("narrow") ? 390 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=changes-changed-fields--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
    expect(
      await page
        .locator(".changeFields")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  });
}
