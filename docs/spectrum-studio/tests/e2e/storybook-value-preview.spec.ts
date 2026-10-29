// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Classified-value gallery renders exact values in ${appearance} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=components-value-preview--gallery&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      const sample = (label: string) =>
        page.getByRole("img", { name: label, exact: true });
      await expect(sample("Color").locator(".valuePreviewShape")).toHaveCSS(
        "width",
        "24px",
      );
      await expect(sample("Color").locator(".valuePreviewShape")).toHaveCSS(
        "height",
        "24px",
      );
      await expect(sample("Wide gamut color")).not.toHaveAttribute(
        "data-preview-unavailable",
      );
      await expect(
        sample("Wide gamut color").locator(".valuePreviewShape"),
      ).toHaveCSS("background-color", "color(display-p3 1 0 0)");
      await expect(sample("OKLCH text color")).not.toHaveAttribute(
        "data-preview-unavailable",
      );
      await expect(
        sample("Border color").locator(".valuePreviewShape"),
      ).toHaveCSS("border-top-width", "2px");
      await expect(
        sample("Border color").locator(".valuePreviewShape"),
      ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(
        sample("Border thickness").locator(".valuePreviewShape"),
      ).toHaveCSS("border-top-width", "3px");
      await expect(
        sample("Unitless line height").locator(".valuePreviewText"),
      ).toHaveCSS("height", "24px");
      await expect(
        sample("Absolute line height").locator(".valuePreviewText"),
      ).toHaveCSS("height", "20px");
      expect(
        await sample("Unitless line height")
          .locator(".valuePreviewText")
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      ).not.toBe("rgba(0, 0, 0, 0)");
      await expect(sample("Icon size").locator("svg")).toHaveCSS(
        "width",
        "22px",
      );
      await expect(sample("Icon size").locator("svg")).toHaveCSS(
        "height",
        "22px",
      );
      await expect(sample("Radius").locator(".valuePreviewShape")).toHaveCSS(
        "border-top-left-radius",
        "8px",
      );
      for (const corner of [
        "border-top-right-radius",
        "border-bottom-right-radius",
        "border-bottom-left-radius",
      ]) {
        await expect(sample("Radius").locator(".valuePreviewShape")).toHaveCSS(
          corner,
          "0px",
        );
      }
      await expect(
        sample("Zero spacing").locator(".valuePreviewShape"),
      ).toHaveCSS("width", "0px");
      await expect(
        sample("Large spacing").locator(".valuePreviewShape"),
      ).toHaveCSS("width", "2048px");
      await expect(sample("Large spacing")).toHaveCSS("width", "80px");
      await expect(sample("Large spacing")).toHaveCSS("height", "32px");
      await expect(sample("Large spacing")).toHaveCSS("overflow", "hidden");
      await expect(sample("Large text").locator(".valuePreviewText")).toHaveCSS(
        "font-size",
        "128px",
      );
      const shadow = sample("Complete shadow").locator(".valuePreviewShape");
      await expect(shadow).toHaveCSS("width", "20px");
      expect(
        await shadow.evaluate((element) => getComputedStyle(element).boxShadow),
      ).toContain("6px 12px");
      await expect(
        page.locator(
          '[data-preview-example="Invalid length"] [data-preview-unavailable]',
        ),
      ).toBeVisible();
      await expect(
        page.locator(
          '[data-preview-example="Invalid color"] [data-preview-unavailable]',
        ),
      ).toBeVisible();
      expect(
        await page
          .locator("#storybook-root")
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
    });
  }
for (const id of [
  "components-value-preview--default",
  "components-text-value-preview--default",
  "components-icon-value-preview--default",
]) {
  test(`${id} exposes the shared defaults`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}

test("Optional text properties apply without changing the sample's fixed square", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-value-preview--custom-text&viewMode=story",
  );
  const text = page.locator(".valuePreviewText");
  await expect(text).toHaveCSS("font-size", "20px");
  await expect(text).toHaveCSS("font-weight", "600");
  await expect(text).toHaveCSS("font-style", "italic");
  await expect(text).toHaveCSS("font-family", "serif");
  await expect(text).toHaveCSS("color", "rgb(196, 0, 0)");
  await expect(text).toHaveCSS("width", "24px");
});
test("The reusable icon accepts a different Spectrum glyph, size and color", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-icon-value-preview--customized&viewMode=story",
  );
  const icon = page.locator(".valuePreviewIcon");
  await expect(icon.locator("svg")).toHaveCSS("width", "24px");
  await expect(icon.locator("svg")).toHaveCSS("height", "24px");
  await expect(icon).toHaveCSS("color", "rgb(196, 0, 0)");
});
