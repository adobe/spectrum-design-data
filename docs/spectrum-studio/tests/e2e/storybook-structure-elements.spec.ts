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
  "views-add-structure-element--pointer",
  "views-add-structure-element--keyboard",
  "panels-structure-element--text-bindings",
  "panels-structure-element--custom-deletion",
  "views-structure-elements--empty-insertion",
]) {
  test(`${story} completes its focused interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
      { timeout: 30_000 },
    );
  });
}
for (const appearance of ["light", "dark"])
  for (const width of [1280, 480]) {
    test(`Element panels and all renderers remain usable in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=views-structure-elements--all-five&viewMode=story&globals=colorScheme:${appearance}`,
      );
      for (const kind of ["text", "workflowIcon", "uiIcon", "visual", "bar"])
        await expect(
          page.locator(`[data-element-kind="${kind}"]`),
        ).toBeVisible();
      await expect(
        page.locator('[data-element-kind="workflowIcon"] svg'),
      ).toBeVisible();
      await page.locator("#storybook-root").screenshot({
        path: info.outputPath(`elements-${appearance}-${width}.png`),
      });
      await page.goto(
        `/iframe.html?id=panels-structure-element--ui-icon&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const input = page.getByRole("combobox", {
        name: "Sample icon",
        exact: true,
      });
      await input.fill("");
      await input.press("ArrowDown");
      await expect(page.getByRole("option").first()).toHaveAttribute(
        "aria-setsize",
        "6",
      );
      await expect(
        page.getByRole("option", { name: "Chevron Down", exact: true }),
      ).toBeVisible();
      await input.press("Escape");
      await page.goto(
        `/iframe.html?id=panels-structure-element--bar&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(
        page.getByRole("button", { name: /^Show suggestions Length/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Show suggestions Thickness/ }),
      ).toBeVisible();
      await page.getByRole("region").screenshot({
        path: info.outputPath(`bar-${appearance}-${width}.png`),
      });
    });
  }
test("Readonly and missing references remain explicit", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=panels-structure-element--read-only&viewMode=story",
  );
  await expect(
    page.getByRole("combobox", { name: /^Font size/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete element" }),
  ).toHaveCount(0);
  await page.goto(
    "/iframe.html?id=panels-structure-element--missing-reference&viewMode=story",
  );
  await expect(
    page.getByRole("combobox", { name: /^Font size/ }),
  ).toHaveAttribute("aria-invalid", "true");
});
