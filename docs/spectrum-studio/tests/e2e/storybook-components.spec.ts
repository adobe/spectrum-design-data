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
  "components-token-combobox--literal-and-reference",
  "views-component-data--ordered-parts",
  "components-token-combobox--default",
]) {
  test(`${story} completes its interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
      { timeout: 30_000 },
    );
  });
}
for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Menu data stays usable in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=views-component-data--menu&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(
        page.getByRole("heading", { name: "Menu", exact: true }),
      ).toBeVisible();
      const tab = page.getByRole("tab", { name: "Options", exact: true });
      if (await tab.isVisible()) await tab.click();
      else {
        await page.getByRole("button", { name: /Component sections/ }).click();
        await page
          .getByRole("option", { name: "Options", exact: true })
          .click();
        await expect(page.getByRole("listbox")).toHaveCount(0);
      }
      await expect(
        page.getByRole("grid", { name: "options declarations" }),
      ).toHaveAttribute("aria-rowcount", "13");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const catalog = await page
        .getByRole("complementary", { name: "Component catalog" })
        .boundingBox();
      const selected = await page
        .getByRole("row", { name: "Menu", selected: true, exact: true })
        .boundingBox();
      expect(selected!.y).toBeGreaterThanOrEqual(catalog!.y);
      expect(selected!.y + selected!.height).toBeLessThanOrEqual(
        catalog!.y + catalog!.height,
      );
      const surface = await page
        .locator(".componentStory")
        .evaluate((node) => getComputedStyle(node).backgroundColor);
      expect(surface).not.toBe("rgba(0, 0, 0, 0)");
      if (appearance === "dark") {
        expect(surface).not.toBe("rgb(255, 255, 255)");
        const label = await page
          .getByRole("rowheader")
          .last()
          .evaluate((node) => getComputedStyle(node).color);
        expect(label).not.toBe("rgb(0, 0, 0)");
      }
      await page.locator("#storybook-root").screenshot({
        path: info.outputPath(`components-${appearance}-${width}.png`),
        animations: "disabled",
      });
    });
  }
test("Read-only and unavailable-reference states are explicit", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=views-component-data--read-only&viewMode=story",
  );
  await expect(
    page.getByRole("button", { name: /Add component|^Drag |^Edit property/ }),
  ).toHaveCount(0);
  await page.goto(
    "/iframe.html?id=views-component-data--reference-error&viewMode=story",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Token references are unavailable",
  );
});
