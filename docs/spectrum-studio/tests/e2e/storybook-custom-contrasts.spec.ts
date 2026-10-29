// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const id of [
  "panels-scale-naming-rule--gray-sequence",
  "panels-custom-contrast-steps--gray-sequence",
]) {
  test(`custom naming interaction and themes: ${id}`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [1280, 390])
      for (const scheme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          `/iframe.html?id=${id}&viewMode=story&globals=colorScheme:${scheme}`,
        );
        await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
        expect(
          await page
            .locator("#storybook-root")
            .evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`${scheme}-${width}.png`),
          animations: "disabled",
        });
      }
    expect(errors).toEqual([]);
  });
}
test("invalid ranges, inherited/overridden ratios and read-only controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=panels-scale-naming-rule--invalid-range&viewMode=story",
  );
  await expect(page.getByText(/positive/)).toBeVisible();
  await page.goto(
    "/iframe.html?id=panels-custom-contrast-steps--mode-override&viewMode=story",
  );
  await expect(
    page.getByRole("textbox", { name: "Contrast 100", exact: true }),
  ).toHaveValue("5");
  await expect(
    page.getByRole("button", { name: "Reset 100", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Reset 25", exact: true }),
  ).toBeDisabled();
  await page.goto(
    "/iframe.html?id=panels-custom-contrast-steps--read-only&viewMode=story",
  );
  await expect(
    page.getByRole("textbox", { name: "Contrast 100", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
