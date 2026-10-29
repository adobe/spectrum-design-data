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
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
for (const story of [
  "grouped-insertion",
  "vertical-insertion",
  "independent-naming",
]) {
  test(`${story} completes its reusable Structure interaction`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=views-reusable-structures--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
      { timeout: 30_000 },
    );
  });
}
for (const appearance of ["light", "dark"])
  for (const width of [1280, 480]) {
    test(`Repeated inert modules remain usable in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=views-reusable-structures--repeated-modules&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator(".structureModule")).toHaveCount(2);
      await expect(page.locator(".structureModule button")).toHaveCount(0);
      await page.locator("#storybook-root").screenshot({
        path: info.outputPath(`modules-${appearance}-${width}.png`),
      });
    });
  }
test("Readonly modules and broken sources remain explicit", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=views-reusable-structures--read-only&viewMode=story",
  );
  await expect(page.getByRole("button", { name: /Add element/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("radio", { name: "Vertical", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => document.fonts.ready);
  await page.goto(
    "/iframe.html?id=views-reusable-structures--missing-source&viewMode=story",
  );
  await expect(page.getByRole("alert")).toContainText("unavailable");
});
