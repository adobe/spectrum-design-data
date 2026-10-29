// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Pending preview preserves content without a visible loading message in ${appearance} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=components-derived-content-boundary--pending-overlay&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      await expect(
        page.getByRole("progressbar", { name: "Calculating preview" }),
      ).toBeVisible();
      await expect(
        page.getByText("Current scale", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Calculating preview", { exact: true }),
      ).toHaveCount(0);
      expect(
        await page
          .locator("#storybook-root")
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
    });
  }
for (const story of ["ready", "controls-remain-available", "error-and-retry"]) {
  test(`${story} completes its loading-boundary interaction`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=components-derived-content-boundary--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}
test("Reduced motion retains the native Spectrum busy presentation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/iframe.html?id=components-derived-content-boundary--reduced-motion&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
});
test("Skeleton marks only its content busy and does not add an overlay or loading caption", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-derived-content-boundary--pending-skeleton&viewMode=story",
  );
  await expect(page.locator("[data-derived-state=pending]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(
    page.getByText("Calculating preview", { exact: true }),
  ).toHaveCount(0);
});
